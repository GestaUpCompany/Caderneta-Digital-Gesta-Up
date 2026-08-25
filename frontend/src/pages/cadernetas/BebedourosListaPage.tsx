import { useState, useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import ListaRegistros from '../../components/cadernetas/ListaRegistros'
import { Button } from '../../components/ui'
import DatePickerIcon from '../../components/ui/DatePickerIcon'
import { listarRegistros } from '../../services/api'
import { compartilharWhatsApp, Registro, formatarTempoDesdeLimpeza } from '../../utils/shareUtils'
import { gerarPdfResumoBebedouros, compartilharPdf } from '../../utils/pdfUtils'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import { getBebedouroByNomeCached, getUltimaDataLimpezaBebedouroCached } from '../../services/cadastroCache'

const CHECKLIST_LABELS: Record<string, string> = {
  agua_suficiente: 'Quantidade de água inadequada',
  vazao_bebedouro_ideal: 'Vazão da bóia não ideal',
  aterro_acesso_bebedouro_ideal: 'Aterro/acesso inadequado',
  espacamento_bebedouro_ideal: 'Espaçamento do bebedouro não ideal',
  boia_protecao_boas_condicoes: 'Bóia e proteção em más condições',
}

const LEITURA_EMOJI: Record<number, string> = { 1: '🟢', 2: '🟡', 3: '🔴' }

export default function BebedourosListaPage() {
  const [mostrarModalResumo, setMostrarModalResumo] = useState(false)
  const [dataResumo, setDataResumo] = useState(todayBR())
  const [gerando, setGerando] = useState(false)
  const [todosRegistros, setTodosRegistros] = useState<Registro[]>([])
  const { fazenda, fazendaId } = useSelector((state: RootState) => state.config)

  const carregarRegistros = useCallback(async () => {
    const lista = await listarRegistros('bebedouros')
    setTodosRegistros(lista)
  }, [])

  useEffect(() => {
    carregarRegistros()
  }, [carregarRegistros])

  const filtrarRegistrosDoDia = () => {
    const dataBase = dataResumo.split(' ')[0]
    return todosRegistros.filter((r) => {
      const dataRegistro = String(r.data).split(' ')[0]
      return dataRegistro === dataBase
    })
  }

  const handleAbrirResumo = () => {
    setDataResumo(todayBR())
    setMostrarModalResumo(true)
  }

  const handleGerarResumoTexto = async () => {
    setGerando(true)
    try {
      const registrosDoDia = filtrarRegistrosDoDia()

      if (registrosDoDia.length === 0) {
        const dataBase = dataResumo.split(' ')[0]
        alert(`Nenhum registro encontrado para ${dataBase}`)
        setGerando(false)
        return
      }

      const bebedourosInspecionados = new Set<string>()
      let leiturasBoas = 0
      let leiturasAtencao = 0
      let leiturasCriticas = 0

      // Agrupar por bebedouro
      const porBebedouro: { nome: string; leitura: number; responsavel: string; problemas: { label: string; observacao: string }[] }[] = []

      for (const r of registrosDoDia) {
        const nome = String(r.numeroBebedouro || '—')
        bebedourosInspecionados.add(nome)

        const leitura = Number(r.leituraBebedouro)
        if (leitura === 1) leiturasBoas++
        else if (leitura === 2) leiturasAtencao++
        else if (leitura === 3) leiturasCriticas++

        const problemas: { label: string; observacao: string }[] = []
        if (r.checklist && typeof r.checklist === 'object') {
          for (const [campo, label] of Object.entries(CHECKLIST_LABELS)) {
            const item = (r.checklist as any)[campo]
            if (item && item.valor === false) {
              problemas.push({ label, observacao: String(item.observacao || '') })
            }
          }
        }

        porBebedouro.push({
          nome,
          leitura,
          responsavel: String(r.nomeUsuario || r.responsavel || '—'),
          problemas,
        })
      }

      // Buscar histórico de limpeza para cada bebedouro
      const detalhesLimpeza: { nome: string; tempoDesdeLimpeza: string; metaDias: number | null }[] = []
      if (fazendaId) {
        for (const b of porBebedouro) {
          try {
            const bebedouro = await getBebedouroByNomeCached(fazendaId, b.nome)
            if (bebedouro) {
              const ultimaDataLimpeza = await getUltimaDataLimpezaBebedouroCached(fazendaId, bebedouro.id)
              detalhesLimpeza.push({
                nome: b.nome,
                tempoDesdeLimpeza: formatarTempoDesdeLimpeza(ultimaDataLimpeza),
                metaDias: bebedouro.meta_intervalo_limpeza || null,
              })
            } else {
              detalhesLimpeza.push({ nome: b.nome, tempoDesdeLimpeza: 'Sem histórico', metaDias: null })
            }
          } catch {
            detalhesLimpeza.push({ nome: b.nome, tempoDesdeLimpeza: 'Sem histórico', metaDias: null })
          }
        }
      }

      // Montar resumo
      const partes: string[] = []
      partes.push(`📋 RESUMO DIÁRIO — BEBEDOUROS`)
      partes.push(`📅 Data: ${dataResumo.split(' ')[0]}`)
      partes.push('')
      partes.push(`Bebedouros: ${bebedourosInspecionados.size}`)
      partes.push('')
      partes.push(`Leituras:`)
      partes.push(`🟢 ${leiturasBoas} | 🟡 ${leiturasAtencao} | 🔴 ${leiturasCriticas}`)
      partes.push('')

      // Linha por bebedouro
      for (const b of porBebedouro) {
        const emoji = LEITURA_EMOJI[b.leitura] || '⚪'
        const limpeza = detalhesLimpeza.find((d) => d.nome === b.nome)
        const metaStr = limpeza?.metaDias ? `meta: ${limpeza.metaDias}` : ''
        const tempoStr = limpeza?.tempoDesdeLimpeza || ''
        const dentroMeta = limpeza?.metaDias && limpeza.tempoDesdeLimpeza !== 'Sem histórico'
          ? (() => {
              const dias = limpeza.tempoDesdeLimpeza === 'limpo hoje'
                ? 0
                : parseInt(limpeza.tempoDesdeLimpeza.replace(/\D/g, ''))
              return dias <= (limpeza.metaDias || 0)
            })()
          : false

        let linha = `${emoji} ${b.nome} — ${tempoStr}`
        if (metaStr) linha += ` (${metaStr}${dentroMeta ? ' ✓' : ''})`
        const probLabels = b.problemas.map((p) => p.label).join('; ')
        if (probLabels) linha += ` ⚠️ ${probLabels}`

        partes.push(linha)
        // Observações de problemas (uma por linha)
        for (const p of b.problemas) {
          if (p.observacao) partes.push(`Obs: ${p.observacao}`)
        }
        partes.push('')
      }

      const textoCompleto = partes.join('\n')

      setMostrarModalResumo(false)
      await compartilharWhatsApp(textoCompleto)
    } catch (err) {
      console.error('Erro ao gerar resumo:', err)
      alert('Erro ao gerar resumo. Tente novamente.')
    } finally {
      setGerando(false)
    }
  }

  const handleGerarResumoPdf = async () => {
    setGerando(true)
    try {
      const registrosDoDia = filtrarRegistrosDoDia()

      if (registrosDoDia.length === 0) {
        const dataBase = dataResumo.split(' ')[0]
        alert(`Nenhum registro encontrado para ${dataBase}`)
        setGerando(false)
        return
      }

      const dataBase = dataResumo.split(' ')[0]
      const pdfFile = await gerarPdfResumoBebedouros(registrosDoDia, dataBase, fazenda)

      setMostrarModalResumo(false)
      await compartilharPdf(
        pdfFile,
        `Resumo Bebedouros — ${dataBase}`,
        `Resumo diário de bebedouros — ${dataBase} (${registrosDoDia.length} inspeções)`
      )
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      alert('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setGerando(false)
    }
  }

  const extraActions = (
    <Button onClick={handleAbrirResumo} variant="secondary" icon="📊">
      RESUMO DIÁRIO
    </Button>
  )

  return (
    <>
      <ListaRegistros
        caderneta="bebedouros"
        titulo="BEBEDOUROS"
        rotaForm="/caderneta/bebedouros"
        extraActions={extraActions}
      />

      {/* Modal de resumo diário */}
      {mostrarModalResumo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Resumo Diário</h3>
            <p className="text-base text-gray-700 mb-4">
              Escolha a data para gerar o resumo de inspeções de bebedouros do dia.
            </p>
            <div className="mb-6">
              <DatePickerIcon
                label="Data do resumo"
                value={dataResumo}
                onChange={setDataResumo}
              />
            </div>
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleGerarResumoTexto}
                variant="primary"
                fullWidth
                loading={gerando}
                icon="📤"
              >
                ENVIAR COMO TEXTO
              </Button>
              <Button
                onClick={handleGerarResumoPdf}
                variant="secondary"
                fullWidth
                loading={gerando}
                icon=""
              >
                EXPORTAR PDF
              </Button>
              <Button
                onClick={() => setMostrarModalResumo(false)}
                variant="ghost"
                fullWidth
                disabled={gerando}
              >
                CANCELAR
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

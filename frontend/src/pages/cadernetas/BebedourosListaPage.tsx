import { useState, useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import ListaRegistros from '../../components/cadernetas/ListaRegistros'
import ResumoDiario from '../../components/cadernetas/ResumoDiario'
import { listarRegistros } from '../../services/api'
import { compartilharWhatsApp, Registro, formatarTempoDesdeLimpeza } from '../../utils/shareUtils'
import { gerarPdfResumoBebedouros, compartilharPdf } from '../../utils/pdfUtils'
import { RootState } from '../../store/store'
import { getBebedouroByNomeCached, getUltimaDataLimpezaBebedouroCached, getFazendasDoMesmoGrupoCached } from '../../services/cadastroCache'

const CHECKLIST_LABELS: Record<string, string> = {
  agua_suficiente: 'Quantidade de água inadequada',
  vazao_bebedouro_ideal: 'Vazão da bóia não ideal',
  aterro_acesso_bebedouro_ideal: 'Aterro/acesso inadequado',
  espacamento_bebedouro_ideal: 'Espaçamento do bebedouro não ideal',
  boia_protecao_boas_condicoes: 'Bóia e proteção em más condições',
}

const LEITURA_EMOJI: Record<number, string> = { 1: '🟢', 2: '🟡', 3: '🔴' }

export default function BebedourosListaPage() {
  const [todosRegistros, setTodosRegistros] = useState<Registro[]>([])
  const { fazenda, fazendaId } = useSelector((state: RootState) => state.config)

  const carregarRegistros = useCallback(async () => {
    const lista = await listarRegistros('bebedouros')
    setTodosRegistros(lista)
  }, [])

  useEffect(() => {
    carregarRegistros()
  }, [carregarRegistros])

  const filtrarRegistrosDoDia = (data: string) => {
    const dataBase = data.split(' ')[0]
    return todosRegistros.filter((r) => String(r.data).split(' ')[0] === dataBase)
  }

  const handleGerarResumoTexto = async (data: string) => {
    const registrosDoDia = filtrarRegistrosDoDia(data)
    const dataBase = data.split(' ')[0]

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
    // Incluir nome da fazenda quando pertence a um grupo
    const fazendasDoGrupo = await getFazendasDoMesmoGrupoCached(fazendaId)
    if (fazendasDoGrupo && fazendasDoGrupo.length > 0) {
      partes.push(`Fazenda: *${fazenda}*`)
    }
    partes.push(`📅 Data: ${dataBase}`)
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

    await compartilharWhatsApp(partes.join('\n'))
  }

  const handleGerarResumoPdf = async (data: string) => {
    const registrosDoDia = filtrarRegistrosDoDia(data)
    const dataBase = data.split(' ')[0]
    const pdfFile = await gerarPdfResumoBebedouros(registrosDoDia, dataBase, fazenda)
    await compartilharPdf(
      pdfFile,
      `Resumo Bebedouros — ${dataBase}`,
      `Resumo diário de bebedouros — ${dataBase} (${registrosDoDia.length} inspeções)`
    )
  }

  return (
    <ListaRegistros
      caderneta="bebedouros"
      titulo="BEBEDOUROS"
      rotaForm="/caderneta/bebedouros"
      extraActions={
        <ResumoDiario
          descricao="inspeções de bebedouros"
          contarRegistros={(d) => filtrarRegistrosDoDia(d).length}
          onEnviarTexto={handleGerarResumoTexto}
          onExportarPdf={handleGerarResumoPdf}
        />
      }
    />
  )
}

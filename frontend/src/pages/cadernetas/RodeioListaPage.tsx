import { useState, useCallback, useEffect } from 'react'
import { useSelector } from 'react-redux'
import ListaRegistros from '../../components/cadernetas/ListaRegistros'
import { Button } from '../../components/ui'
import DatePickerIcon from '../../components/ui/DatePickerIcon'
import { listarRegistros } from '../../services/api'
import { compartilharWhatsApp, Registro } from '../../utils/shareUtils'
import { gerarPdfResumoRodeio, compartilharPdf } from '../../utils/pdfUtils'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'

const CATEGORIAS_CAMPOS: { key: string; label: string }[] = [
  { key: 'vaca', label: 'VACAS' },
  { key: 'touro', label: 'TOUROS' },
  { key: 'boiGordo', label: 'BOIS GORDOS' },
  { key: 'boiMagro', label: 'BOIS MAGROS' },
  { key: 'garrote', label: 'GARROTES' },
  { key: 'bezerro', label: 'BEZERROS' },
  { key: 'novilha', label: 'NOVILHAS' },
  { key: 'tropa', label: 'TROPAS' },
  { key: 'outros', label: 'OUTROS' },
]

const DIAGNOSTICOS_ORDEM = [
  'bebedourosCochos',
  'pastagensTaxaLotacao',
  'animaisMachucadosDoentesBichados',
  'cercasCochosPorteiras',
  'carrapatosMoscas',
  'animaisEntreverados',
  'animalMorto',
]

const DIAGNOSTICOS_INVERTIDOS = [
  'animaisMachucadosDoentesBichados',
  'carrapatosMoscas',
  'animaisEntreverados',
  'animalMorto',
]

const DIAGNOSTICO_LABELS: Record<string, string> = {
  bebedourosCochos: 'BEBEDOUROS/COCHOS OK?',
  pastagensTaxaLotacao: 'PASTAGENS/TAXA DE LOTAÇÃO OK?',
  animaisMachucadosDoentesBichados: 'ANIMAIS MACHUCADOS, DOENTES, BICHADOS',
  cercasCochosPorteiras: 'CERCAS/COCHOS/PORTEIRAS OK?',
  carrapatosMoscas: 'CARRAPATOS/MOSCAS?',
  animaisEntreverados: 'ANIMAIS ENTREVERADOS',
  animalMorto: 'ANIMAL MORTO',
}

/**
 * Extrai o horário do campo data do registro (formato "DD/MM/YYYY HH:MM").
 * Retorna "HH" para horas cheias ou "HH:MM" para horas com minutos.
 */
function formatarHorarioRegistro(dataRegistro: unknown): string {
  const str = String(dataRegistro ?? '')
  const timePart = str.split(' ')[1]
  if (!timePart) return ''
  const [h, m] = timePart.split(':')
  if (!h) return ''
  const hh = h.padStart(2, '0')
  const mm = (m || '00').padStart(2, '0')
  return mm === '00' ? hh : `${hh}:${mm}`
}

/**
 * Retorna a lista de diagnósticos problemáticos de um registro.
 * Diagnóstico é problemático quando: "N" para campos normais, "S" para invertidos.
 */
function diagnosticosProblematicos(registro: Registro): { key: string; label: string; observacao: string }[] {
  const result: { key: string; label: string; observacao: string }[] = []
  for (const key of DIAGNOSTICOS_ORDEM) {
    const data = (registro.diagnosticos as any)?.[key]
    if (!data || data.valor === null || data.valor === undefined || data.valor === '') continue
    const isInverted = DIAGNOSTICOS_INVERTIDOS.includes(key)
    const isSim = data.valor === 'S' || data.valor === true
    const isProblem = isInverted ? isSim : !isSim
    if (isProblem) {
      result.push({
        key,
        label: DIAGNOSTICO_LABELS[key] || key,
        observacao: data.observacao || '',
      })
    }
  }
  return result
}

export default function RodeioListaPage() {
  const [mostrarModalResumo, setMostrarModalResumo] = useState(false)
  const [dataResumo, setDataResumo] = useState(todayBR())
  const [gerando, setGerando] = useState(false)
  const [todosRegistros, setTodosRegistros] = useState<Registro[]>([])
  const { fazenda } = useSelector((state: RootState) => state.config)

  const carregarRegistros = useCallback(async () => {
    const lista = await listarRegistros('rodeio')
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

      const dataBase = dataResumo.split(' ')[0]
      const partes: string[] = []

      // Cabeçalho
      partes.push(`📋 *RESUMO DIÁRIO — RODEIO*`)
      partes.push(`📅 Data: *${dataBase}*`)
      partes.push('')

      // Consolidado
      const lotesVistoriados = registrosDoDia.length
      let totalAnimais = 0
      let lotesContados = 0

      registrosDoDia.forEach((r) => {
        if (r.gadoContado === 'Sim') {
          lotesContados++
          const total = Number(r.totalCabecas) || 0
          totalAnimais += total
        } else {
          const totalLote = (Number((r as any).n_cabecas) || 0) + (Number((r as any).qtd_bezerros) || 0)
          totalAnimais += totalLote
        }
      })

      partes.push(`Lotes vistoriados: *${lotesVistoriados}*`)
      partes.push(`Total de animais: *${totalAnimais}*`)
      if (lotesContados > 0) {
        partes.push(`Gado contado em ${lotesContados} lote(s)`)
      }

      // Equipe: junção de todos os registros (nomes únicos)
      const todosNomes = new Set<string>()
      registrosDoDia.forEach((r) => {
        if (Array.isArray(r.equipeNomes)) {
          (r.equipeNomes as string[]).forEach((n) => {
            if (n && n.trim() !== '') todosNomes.add(n.trim())
          })
        }
      })
      const nomesUnicos = Array.from(todosNomes)
      const totalPessoas = nomesUnicos.length
      if (totalPessoas > 0) {
        partes.push(`EQUIPE: *${nomesUnicos.join(', ')}* (${totalPessoas} pessoa${totalPessoas > 1 ? 's' : ''})`)
      }

      // Detalhamento por registro
      for (let i = 0; i < registrosDoDia.length; i++) {
        const r = registrosDoDia[i]

        partes.push('')
        partes.push('━━━━━━━━━━━━━━━━━━━━━━━━')
        partes.push('')

        partes.push(`PASTO: *${r.pasto || '—'}*`)
        partes.push(`LOTE: *${r.numeroLote || '—'}*`)

        const horario = formatarHorarioRegistro(r.data)
        if (horario) {
          partes.push(`HORÁRIO: ${horario}`)
        }

        // Gado contado
        if (r.gadoContado) {
          partes.push(`GADO CONTADO: *${r.gadoContado === 'Sim' ? 'Sim' : 'Não'}*`)
        }

        // Categorias (uma por linha, apenas > 0, apenas se gadoContado === 'Sim')
        if (r.gadoContado === 'Sim') {
          let temCategoria = false
          for (const cat of CATEGORIAS_CAMPOS) {
            const v = Number((r as any)[cat.key])
            if (!isNaN(v) && v > 0) {
              partes.push(`${cat.label}: *${v}*`)
              temCategoria = true
            }
          }
          if (temCategoria) partes.push('')

          const total = Number(r.totalCabecas)
          if (!isNaN(total) && total > 0) {
            partes.push(`TOTAL: *${total} animais*`)
          }
        } else {
          // Quando gado não foi contado, mostrar total do lote
          const totalLote = (Number((r as any).n_cabecas) || 0) + (Number((r as any).qtd_bezerros) || 0)
          if (totalLote > 0) {
            partes.push(`TOTAL: *${totalLote} animais*`)
          }
        }

        // Escores
        if (r.escoreFezes != null && r.escoreFezes !== '') {
          partes.push(`ESCORE FEZES: *${r.escoreFezes}*`)
        }
        if (r.escoreGado != null && r.escoreGado !== '') {
          partes.push(`ESCORE GADO: *${r.escoreGado}*`)
        }

        // Diagnósticos problemáticos
        const problemas = diagnosticosProblematicos(r)
        if (problemas.length > 0) {
          partes.push('')
          for (const p of problemas) {
            partes.push(`⚠️ ${p.label}: *Sim*`)
            if (p.observacao) {
              partes.push(`OBSERVAÇÃO: *${p.observacao}*`)
            }
          }
        }
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
      const pdfFile = await gerarPdfResumoRodeio(registrosDoDia, dataBase, fazenda)

      setMostrarModalResumo(false)
      await compartilharPdf(
        pdfFile,
        `Resumo Rodeio — ${dataBase}`,
        `Resumo diário de rodeio — ${dataBase} (${registrosDoDia.length} lote(s))`
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
        caderneta="rodeio"
        titulo="RODEIO GADO"
        rotaForm="/caderneta/rodeio"
        extraActions={extraActions}
      />

      {mostrarModalResumo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Resumo Diário</h3>
            <p className="text-base text-gray-700 mb-4">
              Escolha a data para gerar o resumo de rodeio do dia.
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

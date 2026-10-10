import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { DatePicker } from '../../components/ui'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import InfoCard from '../../components/cadernetas/InfoCard'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import EscalaRotulada from '../../components/cadernetas/EscalaRotulada'
import PdfModal from '../../components/PdfModal'
import { usePhotoGps } from '../../hooks/usePhotoGps'
import { base64ToDataUrl } from '../../utils/photoCompress'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import {
  getLoteDetalhesComCategoriasCached,
  getRegistrosOfertaTratoByLoteCached,
  getRegistrosLeituraCochoByLoteCached,
  getLoteCategoriasBatchCached,
  getRegistrosOfertaTratoBatchCached,
  getRegistrosLeituraCochoBatchCached,
  getFormulacoesBatchCached,
  getCurraisCached,
  getLinhasConfinamentoCached,
  getFormulacaoByNomeCached,
  getCachedCadastroData,
  getNotasLeituraCochoConfigCached,
  getLoteByNomeCached,
  getOcupacoesCurralNaDataCached,
} from '../../services/cadastroCache'
import { getLotes, getNotasLeituraCochoConfig, buildLoteDetalhesFromCategorias } from '../../services/supabaseService'
import { salvarRascunho, lerRascunho, limparRascunho, getAllRegistros } from '../../services/indexedDB'
import { calcularCmsPorJanelas, CmsJanelas } from '../../utils/leituraCochoMetrics'
import { ocupacaoVigentePorCurral } from '../../utils/ocupacaoCurral'
import { Brush, FileText, LayoutGrid, Save } from 'lucide-react'

const BASE = import.meta.env.BASE_URL
interface NotaConfig {
  id: string
  nota: number
  descricao: string | null
  percentual_ajuste: number
}
interface LoteItem {
  id: string
  nome: string
  curral: string
  curralId: string | null
  linhaId: string | null
  dieta: string | null
  teorMsDieta: number | null
  leituraAnterior: number | null
  leituraAnteriorId: string | null
  leituraAnteriorN2: number | null
  leituraAnteriorN3: number | null
  tratoAnterior: number | null
  nota: string
  notaData?: string
  notaSalva: boolean
  bloqueado: boolean
  rascunhoSalvo: boolean
  salvando: boolean
  erroSalvar: boolean
  quantidade: number | null
  pesoVivoKg: number | null
  periodoDias: number | null
  categorias: string
  cms: CmsJanelas
}

interface LinhaItem {
  id: string
  nome: string
  curralNomes: string[]
}

function formatarPercentual(valor: number | null): string {
  if (valor === null || valor === undefined) return '—'
  return `${valor.toFixed(2).replace('.', ',')}%`
}

function formatarNumero(valor: number | null, casas = 2): string {
  if (valor === null || valor === undefined) return '—'
  return valor.toFixed(casas).replace('.', ',')
}

function formatarNumeroMilhar(valor: number | null, casas = 2): string {
  if (valor === null || valor === undefined) return '—'
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

function capitalizarIniciais(texto: string): string {
  return texto
    .toLowerCase()
    .split(' ')
    .map((palavra) => (palavra.length > 0 ? palavra[0].toUpperCase() + palavra.slice(1) : palavra))
    .join(' ')
}

// Rótulos curtos da escala padrão de leitura de cocho (a descrição completa vem do cadastro)
const ROTULO_NOTA: Record<number, string> = {
  [-1]: 'Lambido',
  0: 'Limpo',
  1: 'Ideal',
  2: 'Sobra',
  3: 'Muita sobra',
}

function getNotaColor(nota: number): { dot: string; border: string; bg: string; text: string } {
  switch (nota) {
    case -1:
      return { dot: 'bg-red-500', border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-700' }
    case 0:
      return { dot: 'bg-yellow-500', border: 'border-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700' }
    case 1:
      return { dot: 'bg-green-500', border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-700' }
    case 2:
      return { dot: 'bg-yellow-500', border: 'border-yellow-500', bg: 'bg-yellow-50', text: 'text-yellow-700' }
    case 3:
      return { dot: 'bg-red-500', border: 'border-red-500', bg: 'bg-red-50', text: 'text-red-700' }
    default:
      return { dot: 'bg-gray-300', border: 'border-gray-300', bg: 'bg-gray-50', text: 'text-gray-700' }
  }
}

function parseDataBR(data: string): Date | null {
  const [day, month, year] = data.split('/').map(Number)
  if (!day || !month || !year) return null
  return new Date(Date.UTC(year, month - 1, day))
}

function brToDateISO(dataBR: string): string {
  const [day, month, year] = dataBR.split(' ')[0].split('/').map(Number)
  if (!day || !month || !year) return ''
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function somarDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split('-').map(Number)
  const d = new Date(Date.UTC(ano, mes - 1, dia + dias))
  return d.toISOString().slice(0, 10)
}

function diferencaDias(inicio: Date, fim: Date): number {
  const diff = Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 1
}

export default function LeituraCochoPage() {
  const navigate = useNavigate()
  const { fazendaId, usuario } = useSelector((state: RootState) => state.config)
  const [data, setData] = useState<string>(todayBR())
  const [lotes, setLotes] = useState<LoteItem[]>([])
  const [linhas, setLinhas] = useState<LinhaItem[]>([])
  const [linhaSelecionadaId, setLinhaSelecionadaId] = useState<string | null>(null)
  const [loteSelecionadoId, setLoteSelecionadoId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [notasConfig, setNotasConfig] = useState<NotaConfig[]>([])
  const [leiturasPorLote, setLeiturasPorLote] = useState<Record<string, any[]>>({})
  const inputRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [pdfAberto, setPdfAberto] = useState(false)
  // Foto opcional do cocho por curral (fica em memória até salvar a leitura)
  const [fotoPorLote, setFotoPorLote] = useState<Record<string, string>>({})
  // Dias de cocho por curral: dias desde o início da ocupação na data selecionada
  const [diasCocho, setDiasCocho] = useState<Record<string, number>>({})
  const { capturandoFoto, fotoErro, capturarFoto, fotoInputRef, handleFileInputChange } = usePhotoGps({ comGps: false })

  useEffect(() => {
    async function carregarDadosIniciais() {
      if (!fazendaId) return
      setCarregando(true)
      setErro(null)

      try {
        // Buscar lotes: online usa supabaseService, offline usa cache lazy por nome
        let lotesData: any[] | null = null
        if (navigator.onLine) {
          try {
            lotesData = await getLotes(fazendaId)
          } catch {
            lotesData = null
          }
        }
        if (!lotesData || lotesData.length === 0) {
          // Fallback offline: buscar cada lote pelo nome no cache lazy
          const cache = await getCachedCadastroData()
          if (cache && cache.lotes && cache.lotes.length > 0) {
            const lotesFromCache = await Promise.all(
              cache.lotes.map((nome: string) => getLoteByNomeCached(fazendaId, nome))
            )
            lotesData = lotesFromCache.filter((l: any) => l !== null)
          }
        }

        // Notas de leitura de cocho: usar versão cached
        let notasConfigData: any[] | null = null
        try {
          notasConfigData = await getNotasLeituraCochoConfigCached(fazendaId)
        } catch {
          if (navigator.onLine) {
            try { notasConfigData = await getNotasLeituraCochoConfig(fazendaId) } catch { notasConfigData = null }
          }
        }

        const [curraisData, linhasData] = await Promise.all([
          getCurraisCached(fazendaId),
          getLinhasConfinamentoCached(fazendaId),
        ])

        const notasConfigOrdenadas = (notasConfigData || [])
          .map((n: any) => ({
            id: n.id,
            nota: n.nota,
            descricao: n.descricao,
            percentual_ajuste: Number(n.percentual_ajuste),
          }))
          .sort((a: NotaConfig, b: NotaConfig) => a.nota - b.nota)
        setNotasConfig(notasConfigOrdenadas)

        // Mapa de currais por lote_id (apenas currais com lote_id e linha_id)
        const curraisPorLote = new Map<string, { id: string; nome: string; linhaId: string | null; formulacao_id: string | null }>()
        // Mapa de currais por linha_id (para montar resumo de nomes)
        const curraisPorLinha = new Map<string, string[]>()
        curraisData?.forEach((c: any) => {
          if (!c.id || !c.nome || !c.lote_id) return
          curraisPorLote.set(c.lote_id, {
            id: c.id,
            nome: c.nome,
            linhaId: c.linha_id || null,
            formulacao_id: c.formulacao_id || null,
          })
          if (c.linha_id) {
            const arr = curraisPorLinha.get(c.linha_id) || []
            arr.push(c.nome)
            curraisPorLinha.set(c.linha_id, arr)
          }
        })

        // Monta lista de linhas com resumo dos currais
        const linhasMapeadas: LinhaItem[] = (linhasData || [])
          .map((l: any) => ({
            id: l.id,
            nome: l.nome,
            curralNomes: curraisPorLinha.get(l.id) || [],
          }))
          .filter((l) => l.curralNomes.length > 0)
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        setLinhas(linhasMapeadas)

        if (!lotesData || lotesData.length === 0) {
          setLotes([])
          setCarregando(false)
          return
        }

        // Carregamento em batch: 4 queries para a fazenda inteira em vez de
        // ~3 queries por lote. Se o batch não estiver disponível (offline sem
        // cache), cai no caminho por lote via cache lazy.
        const [categoriasBatch, tratosBatch, leiturasBatch, formulacoesBatch] = await Promise.all([
          getLoteCategoriasBatchCached(fazendaId),
          getRegistrosOfertaTratoBatchCached(fazendaId),
          getRegistrosLeituraCochoBatchCached(fazendaId),
          getFormulacoesBatchCached(fazendaId),
        ])

        const formById = new Map<string, any>()
        const formByNome = new Map<string, any>()
        ;(formulacoesBatch || []).forEach((f: any) => {
          if (f?.id) formById.set(f.id, f)
          if (f?.nome) formByNome.set(f.nome, f)
        })

        const leiturasMap: Record<string, any[]> = {}
        const lotesEnriquecidos = await Promise.all(
          lotesData.map(async (lote: any) => {
            const detalhes = categoriasBatch
              ? buildLoteDetalhesFromCategorias(categoriasBatch[lote.id])
              : await getLoteDetalhesComCategoriasCached(lote.id)
            const [registrosOfertaTrato, registrosLeitura] = await Promise.all([
              tratosBatch
                ? Promise.resolve(tratosBatch[lote.id] || [])
                : getRegistrosOfertaTratoByLoteCached(fazendaId, lote.id),
              leiturasBatch
                ? Promise.resolve(leiturasBatch[lote.id] || [])
                : getRegistrosLeituraCochoByLoteCached(fazendaId, lote.id),
            ])

            const curralInfo = lote.id ? curraisPorLote.get(lote.id) : null
            if (!curralInfo) {
              return null
            }
            const curral = curralInfo.nome || ''

            // Mapear registros_oferta_trato para o formato esperado por calcularCmsPorJanelas
            // (kg_ofertado_real -> kg_cocho, sem formulacao neste registro)
            const supOrdenados = [...(registrosOfertaTrato || [])]
              .map((r: any) => ({ ...r, kg_cocho: r.kg_ofertado_real ?? r.kg_cocho ?? null }))
              .sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime())
            let dieta = supOrdenados[0]?.formulacao || null

            // Se não há formulação no registro de oferta, busca a formulação do curral
            if (!dieta && curralInfo?.formulacao_id) {
              dieta = formById.get(curralInfo.formulacao_id)?.nome || null
              if (!dieta) {
                try {
                  const { getFormulacaoById } = await import('../../services/supabaseService')
                  const form = await getFormulacaoById(curralInfo.formulacao_id)
                  dieta = form?.nome || null
                } catch {
                  // ignorar erro
                }
              }
            }

            // Buscar teor_ms_dieta da formulação
            let teorMsDieta: number | null = null
            if (dieta && fazendaId) {
              const formBatch = formByNome.get(dieta)
              if (formBatch) {
                teorMsDieta = formBatch.teor_ms_dieta ? Number(formBatch.teor_ms_dieta) : null
              } else {
                try {
                  const formulacao = await getFormulacaoByNomeCached(fazendaId, dieta)
                  teorMsDieta = formulacao?.teor_ms_dieta ? Number(formulacao.teor_ms_dieta) : null
                } catch {
                  // ignorar erro, usa fallback
                }
              }
            }

            const leitOrdenados = [...(registrosLeitura || [])].sort(
              (a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()
            )
            leiturasMap[lote.id] = leitOrdenados
            const leituraAnterior = leitOrdenados[0]?.leitura_cocho ?? null
            const leituraAnteriorId = leitOrdenados[0]?.nota_config_id ?? null
            const leituraAnteriorN2 = leitOrdenados[1]?.leitura_cocho ?? null
            const leituraAnteriorN3 = leitOrdenados[2]?.leitura_cocho ?? null

            // Kg Cocho: soma de todos os registros de oferta de trato do dia mais recente
            let tratoAnterior: number | null = null
            if (supOrdenados.length > 0) {
              const diaMaisRecente = String(supOrdenados[0].data).slice(0, 10)
              const tratosDoDia = supOrdenados.filter((r: any) => String(r.data).slice(0, 10) === diaMaisRecente)
              const soma = tratosDoDia.reduce((sum: number, r: any) => sum + (Number(r.kg_cocho) || 0), 0)
              tratoAnterior = soma > 0 ? soma : null
            }

            let periodoDias: number | null = null
            if (supOrdenados.length >= 2) {
              const maisRecente = supOrdenados[0]
              const anterior = supOrdenados[1]
              const dataMaisRecente = parseDataBR(maisRecente.data) || new Date(maisRecente.data)
              const dataAnterior = parseDataBR(anterior.data) || new Date(anterior.data)
              periodoDias = diferencaDias(dataAnterior, dataMaisRecente)
            }

            const categorias =
              typeof detalhes?.categorias === 'string' && detalhes.categorias !== '-'
                ? detalhes.categorias
                : Array.isArray(detalhes?.categorias)
                  ? detalhes.categorias
                      .map((c: any) => (typeof c === 'string' ? c : c.categoria))
                      .filter(Boolean)
                      .join(', ')
                  : ''

            const teorEfetivo = teorMsDieta ?? 70
            const cms = calcularCmsPorJanelas(detalhes || lote, supOrdenados, teorEfetivo)

            return {
              id: lote.id,
              nome: lote.nome,
              curral,
              curralId: curralInfo.id,
              linhaId: curralInfo.linhaId,
              dieta,
              teorMsDieta,
              leituraAnterior,
              leituraAnteriorId,
              leituraAnteriorN2,
              leituraAnteriorN3,
              tratoAnterior,
              nota: '',
              notaSalva: false,
              bloqueado: false,
              rascunhoSalvo: false,
              salvando: false,
              erroSalvar: false,
              quantidade: detalhes?.quant_atual ?? lote.n_cabecas ?? null,
              pesoVivoKg: detalhes?.peso_vivo_kg ?? lote.peso_vivo_kg ?? null,
              periodoDias,
              categorias,
              cms,
            } as LoteItem
          })
        )

        const lotesValidos = lotesEnriquecidos.filter((l): l is LoteItem => l !== null)
        const lotesFiltrados = lotesValidos
          .filter((l) => l.linhaId !== null)
          .sort((a, b) => a.curral.localeCompare(b.curral, 'pt-BR'))

        setLeiturasPorLote(leiturasMap)
        setLotes(lotesFiltrados)
        const primeiraLinha = linhasMapeadas.find((linha) => lotesFiltrados.some((lote) => lote.linhaId === linha.id))
        const primeiroLote = primeiraLinha
          ? lotesFiltrados.find((lote) => lote.linhaId === primeiraLinha.id)
          : lotesFiltrados[0]
        setLinhaSelecionadaId(primeiraLinha?.id || primeiroLote?.linhaId || null)
        setLoteSelecionadoId(primeiroLote?.id || null)
      } catch (error) {
        console.error('Erro ao carregar dados da leitura de cocho:', error)
        setErro('Erro ao carregar dados. Tente novamente.')
      } finally {
        setCarregando(false)
      }
    }

    carregarDadosIniciais()
  }, [fazendaId])

  useEffect(() => {
    if (!fazendaId) return
    const dataISO = brToDateISO(data)
    if (!dataISO) return
    let cancelado = false
    getOcupacoesCurralNaDataCached(fazendaId, dataISO)
      .then((lista) => {
        if (cancelado) return
        const mapa: Record<string, number> = {}
        ocupacaoVigentePorCurral<any>((lista || []).filter((o: any) => o?.curral_id && o?.data_inicial)).forEach((o: any) => {
          const inicio = String(o.data_inicial).slice(0, 10)
          const dias = Math.floor((Date.parse(dataISO) - Date.parse(inicio)) / 86400000) + 1
          if (dias >= 1) mapa[o.curral_id] = dias
        })
        setDiasCocho(mapa)
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [fazendaId, data])

  // Recomputa nota, bloqueio e rascunho conforme a data selecionada no header.
  // Considera leituras vindas do Supabase (cache) e registros locais no IndexedDB
  // (criados offline ou ainda não sincronizados).
  useEffect(() => {
    if (!fazendaId) return
    const dataISO = brToDateISO(data)
    if (!dataISO) return
    const dataBR = data.split(' ')[0]

    let cancelado = false
    async function aplicarEstadoDaData() {
      const [registrosLocais, rascunhoData] = await Promise.all([
        getAllRegistros('leitura-cocho'),
        lerRascunho<Record<string, string>>(`leitura-cocho-rascunho-${fazendaId}-${dataISO}`),
      ])
      if (cancelado) return

      // Lista plana permite casar por curral_id mesmo quando a leitura está
      // associada a um lote_id diferente do lote atual do curral.
      const todasLeituras = Object.values(leiturasPorLote).flat()

      setLotes((prev) =>
        prev.map((lote) => {
          const leituraRemota = todasLeituras.find(
            (r: any) =>
              String(r.data || '').slice(0, 10) === dataISO &&
              (r.lote_id === lote.id || (lote.curralId && r.curral_id === lote.curralId))
          )
          const leituraLocal = (registrosLocais || []).find((r: any) => {
            const rData = String(r.data || '').split(' ')[0]
            return rData === dataBR && (r.loteId === lote.id || r.pastoCurral === lote.curral || (lote.curralId && r.curralId === lote.curralId))
          })
          const existente = leituraRemota || leituraLocal
          const notaExistente = leituraRemota?.nota_config_id ?? leituraLocal?.notaConfigId ?? ''
          const notaRascunho = rascunhoData?.[lote.id]
          // Se o rascunho ainda não commitou (clique muito recente), preserva a
          // nota em memória apenas quando ela pertence à data atual.
          const notaFinal = existente
            ? notaExistente
            : notaRascunho !== undefined
              ? notaRascunho
              : lote.notaData === dataBR
                ? lote.nota
                : ''
          return {
            ...lote,
            nota: notaFinal,
            notaData: existente ? dataBR : notaFinal !== '' ? dataBR : undefined,
            notaSalva: !!existente,
            bloqueado: !!existente,
            rascunhoSalvo: !existente && notaFinal !== '',
            salvando: false,
            erroSalvar: false,
          }
        })
      )
    }
    aplicarEstadoDaData()
    return () => {
      cancelado = true
    }
  }, [data, fazendaId, leiturasPorLote])

  const lotesDaLinha = useMemo(
    () => lotes.filter((l) => l.linhaId === linhaSelecionadaId),
    [lotes, linhaSelecionadaId]
  )

  const selecionarLinha = useCallback((id: string) => {
    setLinhaSelecionadaId(id)
    const primeiroLote = lotes.find((l) => l.linhaId === id)
    setLoteSelecionadoId(primeiroLote?.id || null)
  }, [lotes])

  const selecionarLote = useCallback((id: string) => {
    setLoteSelecionadoId(id)
  }, [])

  const navegarLote = useCallback(
    (direcao: 'anterior' | 'proximo') => {
      if (!loteSelecionadoId) return
      const index = lotesDaLinha.findIndex((l) => l.id === loteSelecionadoId)
      if (index === -1) return
      const novoIndex = direcao === 'anterior' ? index - 1 : index + 1
      if (novoIndex >= 0 && novoIndex < lotesDaLinha.length) {
        selecionarLote(lotesDaLinha[novoIndex].id)
        setTimeout(() => {
          inputRefs.current[lotesDaLinha[novoIndex].id]?.focus()
        }, 150)
      }
    },
    [lotesDaLinha, loteSelecionadoId, selecionarLote]
  )

  const atualizarNota = useCallback((id: string, valor: string) => {
    const dataBR = data.split(' ')[0]
    setLotes((prev) =>
      prev.map((l) => (l.id === id ? { ...l, nota: valor, notaData: dataBR, notaSalva: false, rascunhoSalvo: false, erroSalvar: false } : l))
    )
  }, [data])

  const salvarNota = useCallback(
    async (id: string, notaConfigIdParam?: string): Promise<boolean> => {
      const lote = lotes.find((l) => l.id === id)
      if (!lote || !fazendaId) return false

      const configId = notaConfigIdParam ?? lote.nota
      const configSelecionada = notasConfig.find((c) => c.id === configId) || null
      const notaNumero = configSelecionada ? configSelecionada.nota : null
      const notaConfigId = configSelecionada ? configSelecionada.id : null

      // Verificar duplicidade: não permitir re-salvar o mesmo curral na mesma data
      if (lote.bloqueado) {
        setLotes((prev) =>
          prev.map((l) => (l.id === id ? { ...l, salvando: false, erroSalvar: false } : l))
        )
        return true
      }

      // Verificação adicional no IndexedDB (caso o registro tenha sido criado em outra sessão)
      const dataBR = data.split(' ')[0]
      const registrosExistentes = await getAllRegistros('leitura-cocho')
      const duplicado = registrosExistentes.find((r: any) => {
        const rData = String(r.data || '').split(' ')[0]
        return (r.loteId === lote.id || r.pastoCurral === lote.curral || (lote.curralId && r.curralId === lote.curralId)) && rData === dataBR
      })
      if (duplicado) {
        setLotes((prev) =>
          prev.map((l) => (l.id === id ? { ...l, salvando: false, bloqueado: true, notaSalva: true, erroSalvar: false } : l))
        )
        return true
      }

      setLotes((prev) => prev.map((l) => (l.id === id ? { ...l, salvando: true, erroSalvar: false } : l)))

      try {
        const result = await salvarRegistro('leitura-cocho', {
          data: data,
          responsavel: usuario,
          usuario: usuario,
          pastoCurral: lote.curral,
          pastoId: null,
          curralId: lote.curralId,
          numeroLote: lote.nome,
          loteId: lote.id,
          leituraCocho: notaNumero !== null ? String(notaNumero) : '',
          notaConfigId: notaConfigId,
          fotoBase64: fotoPorLote[id] || null,
        })

        if (!result.success) {
          setLotes((prev) =>
            prev.map((l) => (l.id === id ? { ...l, salvando: false, notaSalva: false, erroSalvar: true } : l))
          )
          return false
        }
        setFotoPorLote((prev) => {
          const { [id]: _removida, ...resto } = prev
          return resto
        })

        // Inclui o registro no mapa local para o estado por data ficar consistente
        // sem depender de reload nem da fila de sync.
        const dataISOSelecionada = brToDateISO(data)
        const leiturasDoLote = leiturasPorLote[id] || []
        const maisRecenteISO = leiturasDoLote[0] ? String(leiturasDoLote[0].data || '').slice(0, 10) : null
        const ehMaisRecente = !maisRecenteISO || (dataISOSelecionada !== '' && dataISOSelecionada >= maisRecenteISO)
        setLeiturasPorLote((prev) => {
          const arr = [
            ...(prev[id] || []),
            { data: dataISOSelecionada, leitura_cocho: notaNumero, nota_config_id: notaConfigId, lote_id: id, curral_id: lote.curralId },
          ]
          arr.sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime())
          return { ...prev, [id]: arr }
        })

        setLotes((prev) =>
          prev.map((l) =>
            l.id === id
              ? {
                  ...l,
                  notaSalva: true,
                  bloqueado: true,
                  rascunhoSalvo: false,
                  salvando: false,
                  erroSalvar: false,
                  ...(ehMaisRecente ? { leituraAnterior: notaNumero, leituraAnteriorId: notaConfigId } : {}),
                }
              : l
          )
        )
        return true
      } catch (error) {
        console.error('Erro ao salvar nota:', error)
        setLotes((prev) =>
          prev.map((l) => (l.id === id ? { ...l, salvando: false, notaSalva: false, erroSalvar: true } : l))
        )
        return false
      }
    },
    [lotes, fazendaId, data, usuario, notasConfig, leiturasPorLote, fotoPorLote]
  )

  // Autosave de rascunho: a cada clique numa nota, persiste no IndexedDB.
  // Como o clique é um evento discreto (nao é digitação contínua), nao precisa debounce.
  const handleNotaChange = useCallback(
    (id: string, valor: string) => {
      atualizarNota(id, valor)
      if (!fazendaId) return
      const dataISO = brToDateISO(data)
      if (!dataISO) return
      const rascunhoKey = `leitura-cocho-rascunho-${fazendaId}-${dataISO}`
      lerRascunho<Record<string, string>>(rascunhoKey).then((atual) => {
        const rascunhoAtual = atual || {}
        if (valor === '') {
          delete rascunhoAtual[id]
        } else {
          rascunhoAtual[id] = valor
        }
        salvarRascunho(rascunhoKey, rascunhoAtual)
        // Marcar como rascunho salvo (verde + check)
        setLotes((prev) =>
          prev.map((l) => (l.id === id ? { ...l, rascunhoSalvo: valor !== '' } : l))
        )
      })
    },
    [atualizarNota, fazendaId, data]
  )

  const [salvandoLinha, setSalvandoLinha] = useState(false)

  const salvarNotasLinha = useCallback(async () => {
    const pendentes = lotesDaLinha.filter((l) => l.nota !== '' && !l.notaSalva && !l.salvando)
    if (pendentes.length === 0) return

    setSalvandoLinha(true)
    setLotes((prev) =>
      prev.map((l) =>
        lotesDaLinha.some((pl) => pl.id === l.id) && l.nota !== '' && !l.notaSalva && !l.salvando
          ? { ...l, salvando: true, erroSalvar: false }
          : l
      )
    )

    await Promise.all(pendentes.map((l) => salvarNota(l.id, l.nota)))

    // Limpar rascunho dos lotes que salvaram com sucesso
    if (fazendaId) {
      const dataISO = brToDateISO(data)
      if (dataISO) {
        const rascunhoKey = `leitura-cocho-rascunho-${fazendaId}-${dataISO}`
        const rascunhoAtual = await lerRascunho<Record<string, string>>(rascunhoKey)
        if (rascunhoAtual) {
          const lotesSalvos = lotesDaLinha.filter((l) => l.notaSalva)
          const novoRascunho = { ...rascunhoAtual }
          for (const l of lotesSalvos) {
            delete novoRascunho[l.id]
          }
          if (Object.keys(novoRascunho).length === 0) {
            await limparRascunho(rascunhoKey)
          } else {
            await salvarRascunho(rascunhoKey, novoRascunho)
          }
        }
      }
    }

    setSalvandoLinha(false)
  }, [lotesDaLinha, salvarNota, fazendaId, data])

  const limparNotas = useCallback(() => {
    setLotes((prev) =>
      prev.map((l) => (l.bloqueado ? l : { ...l, nota: '', notaData: undefined, notaSalva: false, rascunhoSalvo: false, erroSalvar: false }))
    )
    if (fazendaId) {
      const dataISO = brToDateISO(data)
      if (dataISO) {
        const rascunhoKey = `leitura-cocho-rascunho-${fazendaId}-${dataISO}`
        limparRascunho(rascunhoKey)
      }
    }
  }, [fazendaId, data])

  const handleNotaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, _id: string) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        navegarLote('proximo')
      }
    },
    [navegarLote]
  )

  const notasPendentes = useMemo(
    () => lotesDaLinha.filter((l) => l.nota !== '' && !l.notaSalva && !l.salvando).length,
    [lotesDaLinha]
  )

  const loteAtual = lotesDaLinha.find((l) => l.id === loteSelecionadoId) || null
  const linhaAtual = linhas.find((l) => l.id === linhaSelecionadaId) || null
  const lidosLinha = lotesDaLinha.filter((l) => l.notaSalva).length
  const progressoLinha = lotesDaLinha.length > 0 ? lidosLinha / lotesDaLinha.length : 0

  // Próximo curral da linha ainda sem leitura salva (prefere os sem nota escolhida)
  const proximoCurral = (aPartirDeId: string | null): LoteItem | null => {
    const idx = lotesDaLinha.findIndex((l) => l.id === aPartirDeId)
    const ordem = idx === -1 ? lotesDaLinha : [...lotesDaLinha.slice(idx + 1), ...lotesDaLinha.slice(0, idx)]
    const naoLidos = ordem.filter((l) => !l.notaSalva && l.id !== aPartirDeId)
    return naoLidos.find((l) => l.nota === '') || naoLidos[0] || null
  }

  const limparRascunhoDoLote = useCallback(
    async (id: string) => {
      if (!fazendaId) return
      const dataISO = brToDateISO(data)
      if (!dataISO) return
      const rascunhoKey = `leitura-cocho-rascunho-${fazendaId}-${dataISO}`
      const atual = await lerRascunho<Record<string, string>>(rascunhoKey)
      if (!atual || atual[id] === undefined) return
      const novo = { ...atual }
      delete novo[id]
      if (Object.keys(novo).length === 0) await limparRascunho(rascunhoKey)
      else await salvarRascunho(rascunhoKey, novo)
    },
    [fazendaId, data]
  )

  // Salva o curral aberto e abre o próximo curral não lido da linha
  const salvarEIrParaProximo = useCallback(async () => {
    if (!loteAtual) return
    if (loteAtual.nota !== '' && !loteAtual.notaSalva && !loteAtual.bloqueado) {
      const ok = await salvarNota(loteAtual.id, loteAtual.nota)
      if (!ok) return
      await limparRascunhoDoLote(loteAtual.id)
    }
    const proximo = proximoCurral(loteAtual.id)
    if (proximo) {
      selecionarLote(proximo.id)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loteAtual, salvarNota, limparRascunhoDoLote, selecionarLote, lotesDaLinha])

  const handleTirarFoto = async () => {
    if (!loteAtual) return
    const base64 = await capturarFoto()
    // Nativo retorna a foto aqui; no web o retorno vem pelo input file oculto
    if (base64) setFotoPorLote((prev) => ({ ...prev, [loteAtual.id]: base64 }))
  }

  const handleFotoInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const result = await handleFileInputChange(e)
    if (result?.fotoBase64 && loteAtual) {
      setFotoPorLote((prev) => ({ ...prev, [loteAtual.id]: result.fotoBase64 as string }))
    }
  }

  const proximoDoAtual = loteAtual ? proximoCurral(loteAtual.id) : null
  const atualPendente = !!loteAtual && loteAtual.nota !== '' && !loteAtual.notaSalva && !loteAtual.bloqueado
  const rotuloBotaoPrincipal = (() => {
    if (!loteAtual) return 'SALVAR'
    if (atualPendente) return proximoDoAtual ? `SALVAR E IR PARA ${proximoDoAtual.curral.toUpperCase()} →` : 'SALVAR E CONCLUIR A LINHA'
    if (loteAtual.notaSalva || loteAtual.bloqueado) return proximoDoAtual ? `IR PARA ${proximoDoAtual.curral.toUpperCase()} →` : 'LINHA CONCLUÍDA ✓'
    return 'ESCOLHA A NOTA DO COCHO'
  })()
  const botaoPrincipalDesabilitado =
    !loteAtual ||
    salvandoLinha ||
    loteAtual.salvando ||
    (!atualPendente && (!(loteAtual.notaSalva || loteAtual.bloqueado) || !proximoDoAtual))

  const bottomContent = linhas.length > 0 && lotes.length > 0 ? (
    <div className="flex flex-col gap-3 pb-3">
      <div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-bold uppercase tracking-wide text-gray-600">
            {linhaAtual?.nome || 'Linha'} · {lidosLinha} de {lotesDaLinha.length} currais lidos
          </span>
          <span className="text-sm font-extrabold text-green-700">{Math.round(progressoLinha * 100)}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-200">
          <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${progressoLinha * 100}%` }} />
        </div>
      </div>

      {linhas.length > 1 && (
      <div className="relative">
        <span className="mb-1 block text-sm font-black uppercase tracking-wider text-gray-500">
          Linha
        </span>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 pr-8 scrollbar-none">
          {linhas.map((linha) => (
            <button
              key={linha.id}
              type="button"
              onClick={() => selecionarLinha(linha.id)}
              className={`!min-h-[52px] shrink-0 rounded-xl border px-5 py-3 text-sm font-bold whitespace-nowrap transition-colors ${
                linhaSelecionadaId === linha.id
                  ? 'border-[#1a3a2a] bg-[#1a3a2a] text-white'
                  : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {linha.nome}
            </button>
          ))}
        </div>
      </div>
      )}

      <div className="relative">
        <span className="mb-1 block text-sm font-black uppercase tracking-wider text-gray-500">
          Curral
        </span>
        <div className="flex gap-2 overflow-x-auto pb-1 pr-8 scrollbar-none">
          {lotesDaLinha.map((lote) => (
            <button
              key={lote.id}
              type="button"
              onClick={() => selecionarLote(lote.id)}
              className={`!min-h-[52px] shrink-0 rounded-xl border-2 px-4 py-3 text-center transition-all ${
                loteSelecionadoId === lote.id
                  ? lote.erroSalvar
                    ? 'border-red-500 bg-red-50'
                    : (lote.notaSalva || lote.rascunhoSalvo)
                      ? 'border-green-500 bg-green-50'
                      : 'border-[#1a3a2a] bg-[#e8f1ec]'
                  : lote.erroSalvar
                    ? 'border-red-200 bg-white'
                    : (lote.notaSalva || lote.rascunhoSalvo)
                      ? 'border-green-200 bg-white'
                      : 'border-gray-200 bg-white'
              }`}
            >
              <span className="flex items-center justify-center gap-1.5 text-sm font-bold leading-tight text-gray-900">
                {lote.erroSalvar ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                ) : lote.salvando ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-yellow-500 border-t-transparent" />
                ) : (lote.notaSalva || lote.rascunhoSalvo) ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                ) : null}
                {lote.curral || '—'}
                {lote.notaSalva ? ' ✓' : ''}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-1 border-t border-gray-200 pt-3">
        {notasPendentes > 1 && (
          <button
            type="button"
            onClick={salvarNotasLinha}
            disabled={salvandoLinha}
            className="mb-2 !min-h-0 w-full text-center text-sm font-bold text-green-800 underline disabled:opacity-60"
          >
            {salvandoLinha ? 'Salvando...' : `Salvar os ${notasPendentes} currais pendentes da linha`}
          </button>
        )}
        <div className="flex gap-2">
          <button
            onClick={salvarEIrParaProximo}
            disabled={botaoPrincipalDesabilitado}
            className={`flex-1 !min-h-0 rounded-2xl border-2 px-3 py-4 text-sm font-extrabold transition-colors active:scale-[0.99] ${
              botaoPrincipalDesabilitado
                ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                : 'border-green-600 bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Save className="h-4 w-4" strokeWidth={2.5} />
              {loteAtual?.salvando ? 'SALVANDO...' : rotuloBotaoPrincipal}
            </span>
          </button>
          <button
            onClick={limparNotas}
            className="!min-h-0 rounded-2xl border-2 border-gray-300 bg-gray-200 px-4 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-300 active:scale-95"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Brush className="h-4 w-4" strokeWidth={2.5} />
              LIMPAR
            </span>
          </button>
        </div>
      </div>
    </div>
  ) : null

  const renderCurral = (lote: LoteItem) => {
    const configSel = notasConfig.find((c) => c.id === lote.nota) || null
    // Leituras dos 3 dias anteriores à data selecionada (dia exato; sem leitura = null)
    const dataISOSel = brToDateISO(data)
    const todasLeituras = Object.values(leiturasPorLote).flat()
    const leituraNoDia = (n: number): number | null => {
      if (!dataISOSel) return null
      const alvo = somarDias(dataISOSel, -n)
      const r = todasLeituras.find(
        (x: any) =>
          String(x.data || '').slice(0, 10) === alvo &&
          (x.lote_id === lote.id || (lote.curralId && x.curral_id === lote.curralId))
      )
      return r && r.leitura_cocho !== undefined ? r.leitura_cocho : null
    }
    const antes = { d3: leituraNoDia(3), d2: leituraNoDia(2), d1: leituraNoDia(1) }
    // Dias seguidos com a mesma nota (a atual + dias imediatamente anteriores iguais)
    let seguidos = 0
    if (configSel) {
      seguidos = 1
      for (const anterior of [antes.d1, antes.d2, antes.d3]) {
        if (anterior === configSel.nota) seguidos++
        else break
      }
    }
    const rotuloSel = configSel ? (ROTULO_NOTA[configSel.nota] || String(configSel.nota)).toLowerCase() : ''
    const pct = configSel ? configSel.percentual_ajuste : 0
    const sugestaoKg = lote.tratoAnterior != null && configSel ? lote.tratoAnterior * (1 + pct / 100) : null
    const porCabeca =
      lote.tratoAnterior != null && lote.quantidade ? lote.tratoAnterior / lote.quantidade : null
    const [nomeCurtoLote, ...restoLote] = lote.nome.split(' - ')
    const categoriasFmt = lote.categorias
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)
      .map(capitalizarIniciais)
      .join(', ')
    const foto = fotoPorLote[lote.id]
    const chipAnterior = (rotulo: string, valor: number | null) => (
      <span key={rotulo} className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-bold text-gray-800">
        {valor !== null && <span className={`h-2.5 w-2.5 rounded-full ${getNotaColor(valor).dot}`} />}
        {rotulo} · {valor !== null ? valor : '—'}
      </span>
    )

    return (
      <>
        <InfoCard
          icon={LayoutGrid}
          title={lote.curral || '—'}
          subtitle={`${linhaAtual?.nome || 'Linha'} · ${nomeCurtoLote}${restoLote.length ? ` · ${restoLote.join(' - ')}` : ''}`}
          stats={[
            { label: 'Cabeças', value: lote.quantidade != null ? String(lote.quantidade) : '—' },
            { label: 'Peso médio', value: lote.pesoVivoKg != null ? `${formatarNumero(lote.pesoVivoKg, 0)} kg` : '—' },
            { label: 'Dias de cocho', value: diasCocho[lote.curralId || ''] != null ? String(diasCocho[lote.curralId || '']) : '—' },
            { label: 'Categoria', value: categoriasFmt || '—', span: 1 },
            { label: 'Trato ontem', value: lote.tratoAnterior != null ? `${formatarNumeroMilhar(lote.tratoAnterior, 0)} kg` : '—', span: 1 },
            { label: 'Por cabeça', value: porCabeca != null ? `${formatarNumero(porCabeca, 1)} kg` : '—', span: 1 },
          ]}
        >
          {lote.dieta && <p className="mt-2 text-sm font-semibold text-gray-500">Dieta: {lote.dieta}</p>}
        </InfoCard>

        <CadernetaSection numero={1} titulo="Nota do cocho" required>
          <div
            ref={(el) => (inputRefs.current[lote.id] = el)}
            tabIndex={-1}
            onKeyDown={(e) => handleNotaKeyDown(e, lote.id)}
            className="flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-2">
              <label className="text-[15px] font-bold uppercase text-gray-900">
                Como está o cocho agora? <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setPdfAberto(true)}
                className="flex !min-h-0 shrink-0 items-center gap-1.5 rounded-lg bg-yellow-400 px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-black transition-colors hover:bg-yellow-300 active:scale-[0.98]"
              >
                <FileText className="h-3.5 w-3.5" strokeWidth={2.5} />
                POP Cocho
              </button>
            </div>

            <EscalaRotulada
              dataField="notaCocho"
              disabled={lote.bloqueado}
              options={notasConfig.map((c) => ({
                value: c.id,
                numero: String(c.nota),
                label: ROTULO_NOTA[c.nota] || '',
                dot: getNotaColor(c.nota).dot,
              }))}
              value={lote.nota}
              onChange={(v) => handleNotaChange(lote.id, v === lote.nota ? '' : v)}
            />

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-gray-500">Antes:</span>
              {chipAnterior('3d', antes.d3)}
              {chipAnterior('2d', antes.d2)}
              {chipAnterior('ontem', antes.d1)}
            </div>

            {lote.bloqueado && (
              <InfoStrip tone="warning" icon="🔒">
                Leitura já registrada para este curral nesta data. Nova leitura bloqueada.
              </InfoStrip>
            )}
            {lote.erroSalvar && !lote.salvando && (
              <InfoStrip tone="danger" icon="⚠️">Não foi possível salvar a leitura. Tente de novo.</InfoStrip>
            )}
            {lote.rascunhoSalvo && !lote.notaSalva && (
              <InfoStrip tone="neutral" icon="📝">Rascunho salvo neste aparelho</InfoStrip>
            )}

            {configSel?.descricao && (
              <div className="rounded-xl bg-gray-50 px-3 py-2 text-sm font-medium leading-snug text-gray-600">
                {configSel.descricao}
              </div>
            )}

            {configSel && (
              <InfoStrip tone={pct === 0 ? 'success' : 'warning'} icon={pct > 0 ? '⬆️' : pct < 0 ? '⬇️' : '✅'}>
                {seguidos >= 2 ? `${seguidos}º dia seguido com cocho ${rotuloSel}. ` : `Cocho ${rotuloSel}. `}
                {pct > 0 ? `Aumentar ${formatarNumero(Math.abs(pct), 0)}% no próximo trato` : pct < 0 ? `Diminuir ${formatarNumero(Math.abs(pct), 0)}% no próximo trato` : 'Manter a oferta no próximo trato'}
                {sugestaoKg != null ? `: ${formatarNumeroMilhar(sugestaoKg, 0)} kg` : ''} (regra do nutricionista)
              </InfoStrip>
            )}

            {!lote.bloqueado && (
              foto ? (
                <div className="flex items-start gap-3">
                  <img
                    src={base64ToDataUrl(foto)}
                    alt="Foto do cocho"
                    className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setFotoPorLote((prev) => { const { [lote.id]: _r, ...resto } = prev; return resto })}
                    className="flex-1 rounded-xl bg-gray-200 px-3 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-300 active:scale-[0.99]"
                  >
                    🗑️ REMOVER FOTO
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleTirarFoto}
                  disabled={capturandoFoto}
                  className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-sm font-extrabold uppercase tracking-wide text-gray-800 transition-colors hover:bg-gray-100 active:scale-[0.99] disabled:opacity-60"
                >
                  <span className="text-lg leading-none">📷</span>
                  {capturandoFoto ? 'Capturando...' : 'Foto do cocho (opcional)'}
                </button>
              )
            )}
            {fotoErro && <InfoStrip tone="danger">{fotoErro}</InfoStrip>}
          </div>
        </CadernetaSection>

        <CadernetaSection numero={2} titulo="Consumo do curral">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Ontem</p>
              <p className="mt-0.5 text-2xl font-extrabold text-gray-900">{formatarPercentual(lote.cms.ontem)} <span className="text-base">PV</span></p>
            </div>
            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Média 10 dias</p>
              <p className="mt-0.5 text-2xl font-extrabold text-gray-900">{formatarPercentual(lote.cms.dezDias)} <span className="text-base">PV</span></p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { rotulo: '2 dias', valor: lote.cms.anteontem },
              { rotulo: '3 dias', valor: lote.cms.tresDiasAtras },
              { rotulo: 'Geral', valor: lote.cms.geral },
            ].map((item) => (
              <div key={item.rotulo} className="rounded-xl bg-gray-50 px-2 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{item.rotulo}</p>
                <p className="text-sm font-extrabold text-gray-900">{formatarPercentual(item.valor)}</p>
              </div>
            ))}
          </div>
          <InfoStrip tone="neutral">Consumo de matéria seca por peso vivo</InfoStrip>
        </CadernetaSection>
      </>
    )
  }

  return (
    <>
      <CadernetaLayout
        title="Leitura de Cocho"
        cadernetaId="leitura-cocho"
        onBack={() => navigate('/modulos/cadernetas')}
        dateContent={
          <DatePicker value={data} onChange={setData} compact inline variant="header" />
        }
        bottomContent={bottomContent}
      >
        {carregando ? (
          <InfoStrip tone="neutral">Carregando currais...</InfoStrip>
        ) : erro ? (
          <InfoStrip tone="danger">{erro}</InfoStrip>
        ) : lotes.length === 0 ? (
          <InfoStrip tone="warning">Nenhum curral com lote associado foi encontrado.</InfoStrip>
        ) : loteAtual ? (
          renderCurral(loteAtual)
        ) : null}

        <input
          ref={fotoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFotoInput}
          className="hidden"
        />
      </CadernetaLayout>

      <PdfModal
        isOpen={pdfAberto}
        onClose={() => setPdfAberto(false)}
        images={[`${BASE}docs/cocho/POP_Cocho_01.jpg`, `${BASE}docs/cocho/POP_Cocho_02.jpg`]}
      />
    </>
  )
}

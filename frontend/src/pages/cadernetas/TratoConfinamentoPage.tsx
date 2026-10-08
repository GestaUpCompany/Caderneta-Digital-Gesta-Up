import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { DatePicker } from '../../components/ui'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import { salvarRascunho, lerRascunho, getAllRegistros } from '../../services/indexedDB'
import {
  getLoteDetalhesComCategoriasCached,
  getCurraisCached,
  getRegistrosLeituraCochoByLoteCached,
  getProgramacaoTratosCompletaCached,
  getTiposProgramacaoTratosCached,
  getRegistrosOfertaTratoByFazendaDataCached,
  getRegistrosOfertaTratoAnterioresCached,
  getRegistrosFabricaByDataCached,
  getCachedCadastroData,
  getNotasLeituraCochoConfigCached,
  getLoteByNomeCached,
  getLinhasConfinamentoCached,
  getOcupacoesCurralNaDataCached,
} from '../../services/cadastroCache'
import {
  getLotes,
  getNotasLeituraCochoConfig,
} from '../../services/supabaseService'
import { usePhotoGps } from '../../hooks/usePhotoGps'
import { base64ToDataUrl } from '../../utils/photoCompress'
import { Brush, Camera, Check, ChevronRight, Save } from 'lucide-react'
import { LOGO_URL } from '../../utils/constants'

interface NotaConfig {
  id: string
  nota: number
  descricao: string | null
  percentual_ajuste: number
}

interface CurralTrato {
  curralId: string
  curralNome: string
  linhaId: string | null
  linhaNome: string | null
  loteId: string | null
  loteNome: string | null
  formulacaoId: string | null
  formulacaoNome: string | null
  quantidadeTratos: number
  ordemTrato: number // próximo trato a ser feito (count + 1)
  percentualTrato: number // percentual do trato atual
  horarioSugerido: string | null // horário sugerido do trato atual (HH:mm)
  kgPlanejado: number | null
  compensacaoUltimoTrato: number
  kgReal: string
  leituraCochoNota: number | null
  leituraPercentualAjuste: number | null
  totalRealDiaAnterior: number | null
  kgBaseDia: number | null
  isDia1: boolean
  tratosConcluidos: boolean
  // trato exibido no seletor (permite revisitar trato já lançado, somente leitura)
  tratoExibido: number
  // vagão selecionado para o trato em edição (vagao_id ou chave da produção)
  vagaoSelecionadoKey: string
  fotoBalanca: string | null
  // estado de UI
  salvo: boolean
  rascunhoSalvo: boolean
  salvando: boolean
  erroSalvar: boolean
  // dados de exibição do lote
  nCabecas: number | null
  pesoVivoKg: number | null
  categorias: string
}

interface ProgramacaoData {
  programacaoId: string | null
  quantidadeTratos: number
  percentuais: { ordem_trato: number; percentual: number; horario_sugerido: string | null }[]
}

// Produção do vagão normalizada (sync do servidor ou registro local ainda não
// sincronizado lançado neste aparelho pela Fábrica Confinamento).
interface ProducaoDia {
  id: string
  supabaseId: string | null
  ordemTrato: number
  vagaoId: string | null
  vagaoNome: string
  formulacaoId: string | null
  formulacaoNome: string | null
  totalProduzido: number
}

// Agregado por vagão para o trato exibido: carregado, consumido e saldo.
interface OpcaoVagao {
  key: string
  vagaoId: string | null
  vagaoNome: string
  producao: ProducaoDia | null // produção mais recente (para o vínculo no save)
  carregado: number
  consumido: number
  saldo: number
}

const TOLERANCIA_DESVIO_PERCENT = 5

function formatarKg(valor: number | null, casas = 1): string {
  if (valor === null || valor === undefined || !isFinite(valor)) return '—'
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

/** Converte data BR (DD/MM/AAAA) para YYYY-MM-DD (formato date do Supabase). */
function brToDateISO(dataBR: string): string {
  const [day, month, year] = dataBR.split(' ')[0].split('/').map(Number)
  if (!day || !month || !year) return ''
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseKgReal(valor: string): number {
  if (!valor || !valor.trim()) return NaN
  const numero = Number(valor.replace(',', '.'))
  return Number.isFinite(numero) ? numero : NaN
}

const TIPOS_PROGRAMACAO = [
  { value: 'confinamento', label: 'Confinamento' },
  { value: 'sequestro', label: 'Sequestro' },
  { value: 'tip', label: 'TIP' },
]

// Sistema de produção do lote correspondente a cada tipo de programação.
const SISTEMA_POR_TIPO: Record<string, string> = {
  confinamento: 'Confinamento',
  sequestro: 'Sequestro',
  tip: 'TIP',
}

export default function TratoConfinamentoPage() {
  const navigate = useNavigate()
  const { fazendaId, usuario } = useSelector((state: RootState) => state.config)
  const [data, setData] = useState<string>(todayBR())
  const [currais, setCurrais] = useState<CurralTrato[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [notasConfig, setNotasConfig] = useState<NotaConfig[]>([])
  const [tiposDisponiveis, setTiposDisponiveis] = useState<string[]>([])
  const [tipoSelecionado, setTipoSelecionado] = useState<string>('confinamento')
  const [programacao, setProgramacao] = useState<ProgramacaoData | null>(null)
  const [linhas, setLinhas] = useState<{ id: string; nome: string }[]>([])
  const [linhaSelecionada, setLinhaSelecionada] = useState<string | null>(null)
  const [curralSelecionado, setCurralSelecionado] = useState<string | null>(null)
  const [salvandoFim, setSalvandoFim] = useState(false)
  const [linhaTemMais, setLinhaTemMais] = useState(false)
  const [curralTemMais, setCurralTemMais] = useState(false)
  const [producoesDia, setProducoesDia] = useState<ProducaoDia[]>([])
  // Lançamentos desta tela ainda não re-carregados do cache (contam no saldo do vagão)
  const [lancadosLocal, setLancadosLocal] = useState<
    { curralId: string; ordemTrato: number; kg: number; vagaoId: string | null; vagaoNome: string }[]
  >([])
  const [registrosDoDia, setRegistrosDoDia] = useState<any[]>([])
  const [ofertasLocais, setOfertasLocais] = useState<any[]>([])
  const [vagosPorCurral, setVagosPorCurral] = useState<Map<string, number>>(new Map())
  const linhaScrollRef = useRef<HTMLDivElement>(null)
  const curralScrollRef = useRef<HTMLDivElement>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const curraisRef = useRef<CurralTrato[]>([])
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const { capturarFoto, capturandoFoto, fotoInputRef, handleFileInputChange } = usePhotoGps({ comGps: false })
  const fotoCurralIdRef = useRef<string | null>(null)

  // Carregamento inicial: notas config e tipos disponíveis
  useEffect(() => {
    async function carregarInicial() {
      if (!fazendaId) return
      try {
        let notasData: any[] | null = null
        try {
          notasData = await getNotasLeituraCochoConfigCached(fazendaId)
        } catch {
          if (navigator.onLine) {
            try { notasData = await getNotasLeituraCochoConfig(fazendaId) } catch { notasData = null }
          }
        }

        const tiposData = await getTiposProgramacaoTratosCached(fazendaId)
        const notasOrdenadas = (notasData || [])
          .map((n: any) => ({
            id: n.id,
            nota: n.nota,
            descricao: n.descricao,
            percentual_ajuste: Number(n.percentual_ajuste),
          }))
          .sort((a: NotaConfig, b: NotaConfig) => a.nota - b.nota)
        setNotasConfig(notasOrdenadas)

        const tipos = (tiposData || []).filter((t: string) =>
          TIPOS_PROGRAMACAO.some((tp) => tp.value === t)
        )
        setTiposDisponiveis(tipos.length > 0 ? tipos : ['confinamento'])
        if (tipos.length > 0 && !tipos.includes('confinamento')) {
          setTipoSelecionado(tipos[0])
        }
      } catch (error) {
        console.error('Erro ao carregar dados iniciais do trato:', error)
        setErro('Erro ao carregar configuração. Tente novamente.')
      }
    }
    carregarInicial()
  }, [fazendaId])

  // Carregamento principal: currais + programação + registros do dia + produções do vagão
  const carregarDados = useCallback(async () => {
    if (!fazendaId || !tipoSelecionado) return
    setCarregando(true)
    setErro(null)

    try {
      const dataISO = brToDateISO(data)
      if (!dataISO) {
        setErro('Data inválida.')
        setCarregando(false)
        return
      }

      let lotesData: any[] | null = null
      if (navigator.onLine) {
        try { lotesData = await getLotes(fazendaId) } catch { lotesData = null }
      }
      if (!lotesData || lotesData.length === 0) {
        const cache = await getCachedCadastroData()
        if (cache && cache.lotes && cache.lotes.length > 0) {
          const lotesFromCache = await Promise.all(
            cache.lotes.map((nome: string) => getLoteByNomeCached(fazendaId, nome))
          )
          lotesData = lotesFromCache.filter((l: any) => l !== null)
        }
      }

      const [progCompleta, curraisData, registrosData, linhasData, ocupacoesData, fabricaData, fabricaLocal, ofertasLocalData] =
        await Promise.all([
          getProgramacaoTratosCompletaCached(fazendaId, tipoSelecionado),
          getCurraisCached(fazendaId),
          getRegistrosOfertaTratoByFazendaDataCached(fazendaId, dataISO),
          getLinhasConfinamentoCached(fazendaId),
          getOcupacoesCurralNaDataCached(fazendaId, dataISO),
          getRegistrosFabricaByDataCached(fazendaId, dataISO),
          getAllRegistros('fabrica-confinamento').catch(() => []),
          getAllRegistros('trato-confinamento').catch(() => []),
        ])

      setRegistrosDoDia(registrosData || [])
      setLancadosLocal([])
      // Ofertas locais do dia (sincronizadas ou não): o registro local guarda
      // vagaoId mesmo quando a linha do servidor ainda não tem a coluna, então
      // o consumo por vagão usa o local e deduplica o servidor por local_id.
      setOfertasLocais(
        (ofertasLocalData || []).filter((r: any) => {
          const d = String(r.data || '')
          return d.startsWith(data.split(' ')[0]) && r.deletedAt !== true
        })
      )

      // Produções do vagão normalizadas: registros do servidor + locais não
      // sincronizados (o peão pode ter lançado a produção neste mesmo aparelho).
      const producoes: ProducaoDia[] = (fabricaData || []).map((r: any) => ({
        id: r.id,
        supabaseId: r.id,
        ordemTrato: Number(r.ordem_trato),
        vagaoId: r.vagao_id || null,
        vagaoNome: r.vagoes?.nome || 'Sem vagão',
        formulacaoId: r.formulacao_id || null,
        formulacaoNome: r.formulacoes?.nome || null,
        totalProduzido: Number(r.total_produzido) || 0,
      }))
      for (const r of fabricaLocal || []) {
        const d = String(r.data || '')
        if (!d.startsWith(data.split(' ')[0])) continue
        if (r.deletedAt === true) continue
        // Já sincronizado: está na lista do servidor (por supabaseId)
        if (r.supabaseId && producoes.some((p) => p.id === r.supabaseId)) continue
        producoes.push({
          id: r.id,
          supabaseId: (r.supabaseId as string) || null,
          ordemTrato: Number(r.ordemTrato) || 0,
          vagaoId: (r.vagaoId as string) || null,
          vagaoNome: (r.vagaoNome as string) || 'Sem vagão',
          formulacaoId: (r.formulacaoId as string) || null,
          formulacaoNome: (r.formulacaoNome as string) || null,
          totalProduzido: Number(r.totalProduzido) || 0,
        })
      }
      setProducoesDia(producoes)

      const linhasList = (linhasData || [])
        .filter((l: any) => l.ativo !== false)
        .map((l: any) => ({ id: l.id, nome: l.nome }))
        .sort((a: any, b: any) => a.nome.localeCompare(b.nome, 'pt-BR'))
      setLinhas(linhasList)

      // Currais vazios por linha (ativos sem ocupação na data)
      const vagos = new Map<string, number>()
      for (const c of curraisData || []) {
        if (!c.linha_id) continue
        vagos.set(c.linha_id, (vagos.get(c.linha_id) || 0) + 1)
      }
      setVagosPorCurral(vagos)

      if (!progCompleta.programacao) {
        setProgramacao(null)
        setCurrais([])
        setCarregando(false)
        return
      }

      const progData: ProgramacaoData = {
        programacaoId: progCompleta.programacao.id,
        quantidadeTratos: progCompleta.programacao.quantidade_tratos,
        percentuais: progCompleta.percentuais.map((p: any) => ({
          ordem_trato: p.ordem_trato,
          percentual: Number(p.percentual),
          horario_sugerido: p.horario_sugerido,
        })),
      }
      setProgramacao(progData)

      const lotesPorId = new Map<string, any>()
      for (const l of lotesData || []) {
        lotesPorId.set(l.id, l)
      }

      const curraisPorId = new Map<string, any>()
      for (const c of curraisData || []) {
        if (c.id) {
          curraisPorId.set(c.id, c)
        }
      }

      const sistemaEsperado = SISTEMA_POR_TIPO[tipoSelecionado]
      const ocupacaoPorCurral = new Map<string, any>()
      for (const o of ocupacoesData || []) {
        const atual = ocupacaoPorCurral.get(o.curral_id)
        if (!atual || o.data_inicial > atual.data_inicial) {
          ocupacaoPorCurral.set(o.curral_id, o)
        }
      }
      const ocupacoesDoTipo = [...ocupacaoPorCurral.values()].filter((o) => {
        const sistema = o.lotes?.sistema_producao ?? lotesPorId.get(o.lote_id)?.sistema_producao
        return sistema === sistemaEsperado
      })

      const linhaNomePorId = new Map<string, string>()
      for (const l of linhasList) {
        linhaNomePorId.set(l.id, l.nome)
      }

      const registrosPorCurral = new Map<string, any[]>()
      for (const r of registrosData || []) {
        const arr = registrosPorCurral.get(r.curral_id) || []
        arr.push(r)
        registrosPorCurral.set(r.curral_id, arr)
      }

      const curraisTratoList: (CurralTrato | null)[] = await Promise.all(
        ocupacoesDoTipo.map(async (ocupacao) => {
          const curralId = ocupacao.curral_id as string
          const curralInfo = curraisPorId.get(curralId)
          if (!curralInfo) return null
          const curralNome = curralInfo.nome || curralId
          const linhaId = curralInfo?.linha_id || null
          const linhaNome = linhaId ? (linhaNomePorId.get(linhaId) || null) : null
          const loteId = ocupacao.lote_id || null
          const lote = loteId ? lotesPorId.get(loteId) : null
          const loteNome = ocupacao.lotes?.nome || lote?.nome || null

          let nCabecas: number | null = null
          let pesoVivoKg: number | null = null
          let categorias = ''
          let formulacaoNome: string | null = null
          const formulacaoId: string | null = curralInfo?.formulacao_id || null
          if (loteId) {
            try {
              const detalhes = await getLoteDetalhesComCategoriasCached(loteId)
              nCabecas = detalhes?.quant_atual ?? lote?.n_cabecas ?? null
              pesoVivoKg = detalhes?.peso_vivo_kg ?? lote?.peso_vivo_kg ?? null
              categorias =
                typeof detalhes?.categorias === 'string' && detalhes.categorias !== '-'
                  ? detalhes.categorias
                  : Array.isArray(detalhes?.categorias)
                    ? detalhes.categorias
                        .map((c: any) => (typeof c === 'string' ? c : c.categoria))
                        .filter(Boolean)
                        .join(', ')
                    : ''
            } catch {
              // ignorar erro, usa defaults
            }
          }

          if (loteId) {
            try {
              if (formulacaoId) {
                const { getFormulacaoById } = await import('../../services/supabaseService')
                const form = await getFormulacaoById(formulacaoId)
                formulacaoNome = form?.nome || null
              }
            } catch {
              // ignorar erro
            }
          }

          if (!formulacaoNome && loteId) {
            try {
              const { getRegistrosSuplementacaoByLoteCached } = await import(
                '../../services/cadastroCache'
              )
              const supRegs = await getRegistrosSuplementacaoByLoteCached(fazendaId, loteId)
              const supOrdenados = [...(supRegs || [])].sort(
                (a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()
              )
              formulacaoNome = supOrdenados[0]?.formulacao || null
            } catch {
              // ignorar erro
            }
          }

          const tratosDoDia = registrosPorCurral.get(curralId) || []
          const tratosFeitos = tratosDoDia.filter((t) => t.kg_ofertado_real !== null).length
          const ordemTrato = tratosFeitos + 1
          const quantidadeTratos = progData.quantidadeTratos
          const tratosConcluidos = ordemTrato > quantidadeTratos

          const tratoAtual = progData.percentuais.find(
            (p) => p.ordem_trato === ordemTrato
          )
          const percentualTrato = tratoAtual?.percentual ?? 0
          const horarioSugerido = tratoAtual?.horario_sugerido ?? null

          const registrosAnterioresRaw = await getRegistrosOfertaTratoAnterioresCached(
            fazendaId,
            curralId,
            dataISO
          )
          const dataInicialOcupacao = String(ocupacao.data_inicial || '').slice(0, 10)
          const registrosAnteriores = (registrosAnterioresRaw || []).filter((r: any) => {
            const dataRegistro = String(r.data || '')
            const diaRegistro = dataRegistro.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
              || dataRegistro.split(' ')[0]
            return !dataInicialOcupacao || diaRegistro >= dataInicialOcupacao
          })
          const isDia1 = registrosAnteriores.length === 0

          let leituraCochoNota: number | null = null
          let leituraPercentualAjuste: number | null = null
          if (loteId) {
            try {
              const leituras = await getRegistrosLeituraCochoByLoteCached(fazendaId, loteId)
              const leitOrdenadas = [...(leituras || [])].sort(
                (a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()
              )
              const ultimaLeitura = leitOrdenadas[0]
              if (ultimaLeitura) {
                leituraCochoNota = ultimaLeitura.leitura_cocho ?? null
                if (ultimaLeitura.nota_config_id) {
                  const config = notasConfig.find((n) => n.id === ultimaLeitura.nota_config_id)
                  if (config) {
                    leituraPercentualAjuste = config.percentual_ajuste
                  }
                }
                if (leituraPercentualAjuste === null && leituraCochoNota !== null) {
                  const config = notasConfig.find((n) => n.nota === leituraCochoNota)
                  if (config) {
                    leituraPercentualAjuste = config.percentual_ajuste
                  }
                }
              }
            } catch {
              // ignorar erro
            }
          }

          let totalRealDiaAnterior: number | null = null
          if (!isDia1 && registrosAnteriores.length > 0) {
            const dataAnteriorMaisRecente = String(registrosAnteriores[0].data || '')
            const diaAnterior = dataAnteriorMaisRecente.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
              || dataAnteriorMaisRecente.split(' ')[0]
            const tratosDiaAnterior = registrosAnteriores.filter((r: any) => {
              const dataRegistro = String(r.data || '')
              const diaRegistro = dataRegistro.match(/^\d{4}-\d{2}-\d{2}/)?.[0]
                || dataRegistro.split(' ')[0]
              return diaRegistro === diaAnterior
            })
            totalRealDiaAnterior = tratosDiaAnterior.reduce(
              (sum: number, r: any) => sum + (Number(r.kg_ofertado_real) || 0),
              0
            )
          }

          let kgBaseDia: number | null = null
          let kgPlanejado: number | null = null
          let compensacaoUltimoTrato = 0
          const kgMnDia = ocupacao.kg_mn_dia_dia1 != null ? Number(ocupacao.kg_mn_dia_dia1) : null

          if (isDia1) {
            kgBaseDia = kgMnDia
            kgPlanejado = kgMnDia != null ? kgMnDia * (percentualTrato / 100) : null
          } else if (totalRealDiaAnterior !== null && totalRealDiaAnterior > 0) {
            const fatorAjuste = leituraPercentualAjuste !== null ? 1 + leituraPercentualAjuste / 100 : 1
            kgBaseDia = totalRealDiaAnterior * fatorAjuste
            kgPlanejado = kgBaseDia * (percentualTrato / 100)
          }

          if (ordemTrato === quantidadeTratos && !isDia1 && kgBaseDia !== null) {
            const jaDistribuido = tratosDoDia
              .filter((t) => t.kg_ofertado_real !== null && Number(t.ordem_trato) < ordemTrato)
              .reduce((sum: number, t: any) => sum + (Number(t.kg_ofertado_real) || 0), 0)
            const previstoPercentual = kgBaseDia * (percentualTrato / 100)
            kgPlanejado = Math.max(0, kgBaseDia - jaDistribuido)
            compensacaoUltimoTrato = Math.max(0, kgPlanejado - previstoPercentual)
          }

          const registroExistente = tratosDoDia.find((t) => t.ordem_trato === ordemTrato)
          const kgRealInicial = registroExistente?.kg_ofertado_real != null
            ? String(registroExistente.kg_ofertado_real)
            : ''

          return {
            curralId,
            curralNome,
            linhaId,
            linhaNome,
            loteId,
            loteNome,
            formulacaoId,
            formulacaoNome,
            quantidadeTratos,
            ordemTrato,
            percentualTrato,
            horarioSugerido,
            kgPlanejado,
            compensacaoUltimoTrato,
            kgReal: kgRealInicial,
            leituraCochoNota,
            leituraPercentualAjuste,
            totalRealDiaAnterior,
            kgBaseDia,
            isDia1,
            tratosConcluidos,
            tratoExibido: Math.min(ordemTrato, quantidadeTratos),
            vagaoSelecionadoKey: '',
            fotoBalanca: null,
            salvo: registroExistente?.kg_ofertado_real != null,
            rascunhoSalvo: false,
            salvando: false,
            erroSalvar: false,
            nCabecas,
            pesoVivoKg,
            categorias,
          } as CurralTrato
        })
      )
      const curraisTratoValidos = curraisTratoList.filter((c): c is CurralTrato => c !== null)

      // Ordem manual definida no painel (currais.ordem_folha_trato) primeiro;
      // currais sem ordem caem no fim, por nome.
      curraisTratoValidos.sort((a, b) => {
        const ordemA = curraisPorId.get(a.curralId)?.ordem_folha_trato
        const ordemB = curraisPorId.get(b.curralId)?.ordem_folha_trato
        return (
          (ordemA != null ? Number(ordemA) : Number.MAX_SAFE_INTEGER) -
            (ordemB != null ? Number(ordemB) : Number.MAX_SAFE_INTEGER) ||
          a.curralNome.localeCompare(b.curralNome, 'pt-BR', { numeric: true, sensitivity: 'base' })
        )
      })

      // Rascunho de kg por curral
      const rascunhoKey = `trato-rascunho-${fazendaId}-${dataISO}-${tipoSelecionado}`
      const rascunhoData = await lerRascunho<Record<string, string>>(rascunhoKey)
      if (rascunhoData) {
        for (const curral of curraisTratoValidos) {
          const valorRascunho = rascunhoData[curral.curralId]
          if (valorRascunho !== undefined && valorRascunho !== '' && !curral.salvo) {
            curral.kgReal = valorRascunho
            curral.rascunhoSalvo = true
          }
        }
      }

      setCurrais(curraisTratoValidos)

      if (linhasList.length > 0) {
        const primeiraLinhaId = linhasList[0].id
        setLinhaSelecionada(primeiraLinhaId)
        const primeiroCurralDaLinha = curraisTratoValidos.find(
          (c) => c.linhaId === primeiraLinhaId
        )
        setCurralSelecionado(primeiroCurralDaLinha?.curralId || curraisTratoValidos[0]?.curralId || null)
      } else {
        setLinhaSelecionada(null)
        setCurralSelecionado(curraisTratoValidos[0]?.curralId || null)
      }
    } catch (error) {
      console.error('Erro ao carregar dados do trato:', error)
      setErro('Erro ao carregar dados. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }, [fazendaId, data, tipoSelecionado, notasConfig])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Salvar rascunho do trato (não envia ao Supabase)
  const salvarTratoRascunho = useCallback(
    async (curralId: string, valorKg: string): Promise<boolean> => {
      if (!fazendaId) return false
      if (valorKg === '') return false
      const curral = curraisRef.current.find((c) => c.curralId === curralId)
      if (!curral || curral.tratosConcluidos) return false

      setCurrais((prev) =>
        prev.map((c) =>
          c.curralId === curralId ? { ...c, rascunhoSalvo: true, erroSalvar: false } : c
        )
      )

      try {
        const dataISO = brToDateISO(data)
        const rascunhoKey = `trato-rascunho-${fazendaId}-${dataISO}-${tipoSelecionado}`
        const rascunhoAtual = await lerRascunho<Record<string, string>>(rascunhoKey) || {}
        rascunhoAtual[curralId] = valorKg
        await salvarRascunho(rascunhoKey, rascunhoAtual)
      } catch (error) {
        console.error('Erro ao salvar rascunho do trato:', error)
      }
      return true
    },
    [fazendaId, data, tipoSelecionado]
  )

  useEffect(() => {
    curraisRef.current = currais
  }, [currais])

  // Flush do autosave de rascunho antes de recarregar ou desmontar
  useEffect(() => {
    return () => {
      const timers = debounceTimers.current
      const curraisAtuais = curraisRef.current
      for (const curralId of Object.keys(timers)) {
        clearTimeout(timers[curralId])
        delete timers[curralId]
        const curral = curraisAtuais.find((c) => c.curralId === curralId)
        if (curral && curral.kgReal !== '' && !curral.tratosConcluidos) {
          void salvarTratoRascunho(curralId, curral.kgReal)
        }
      }
    }
  }, [data, tipoSelecionado, fazendaId, salvarTratoRascunho])

  const atualizarCurral = useCallback((curralId: string, patch: Partial<CurralTrato>) => {
    setCurrais((prev) => prev.map((c) => (c.curralId === curralId ? { ...c, ...patch } : c)))
  }, [])

  const atualizarKgReal = useCallback((curralId: string, valor: string) => {
    const valorSanitizado = valor.replace(/[^\d,]/g, '').replace(/(,.*),/g, '$1')
    setCurrais((prev) =>
      prev.map((c) =>
        c.curralId === curralId ? { ...c, kgReal: valorSanitizado, salvo: false, rascunhoSalvo: false, erroSalvar: false } : c
      )
    )
    const prevTimer = debounceTimers.current[curralId]
    if (prevTimer) clearTimeout(prevTimer)
    if (valorSanitizado === '') return
    debounceTimers.current[curralId] = setTimeout(() => {
      delete debounceTimers.current[curralId]
      void salvarTratoRascunho(curralId, valorSanitizado)
    }, 500)
  }, [salvarTratoRascunho])

  const tirarFotoBalanca = useCallback(
    async (curralId: string) => {
      fotoCurralIdRef.current = curralId
      const foto = await capturarFoto()
      // Nativo retorna a foto aqui; no web o retorno vem pelo input file hidden
      if (foto) atualizarCurral(curralId, { fotoBalanca: foto })
    },
    [capturarFoto, atualizarCurral]
  )

  const handleFotoBalancaInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const result = await handleFileInputChange(e)
      const curralId = fotoCurralIdRef.current
      if (result?.fotoBase64 && curralId) {
        atualizarCurral(curralId, { fotoBalanca: result.fotoBase64 })
      }
    },
    [handleFileInputChange, atualizarCurral]
  )

  const limparCurralAtual = useCallback(
    (curralId: string) => {
      atualizarCurral(curralId, { kgReal: '', fotoBalanca: null, salvo: false, rascunhoSalvo: false, erroSalvar: false })
      if (fazendaId) {
        const dataISO = brToDateISO(data)
        const rascunhoKey = `trato-rascunho-${fazendaId}-${dataISO}-${tipoSelecionado}`
        lerRascunho<Record<string, string>>(rascunhoKey).then((r) => {
          if (r) {
            delete r[curralId]
            salvarRascunho(rascunhoKey, r)
          }
        })
      }
    },
    [atualizarCurral, fazendaId, data, tipoSelecionado]
  )

  // Produções do vagão disponíveis para um trato específico, agregadas por vagão.
  const opcoesVagaoPorTrato = useCallback(
    (ordemTrato: number): OpcaoVagao[] => {
      const doTrato = producoesDia.filter((p) => p.ordemTrato === ordemTrato)
      const grupos = new Map<string, OpcaoVagao>()
      for (const p of doTrato) {
        const key = p.vagaoId || `prod-${p.id}`
        const atual = grupos.get(key) || {
          key,
          vagaoId: p.vagaoId,
          vagaoNome: p.vagaoNome,
          producao: null,
          carregado: 0,
          consumido: 0,
          saldo: 0,
        }
        atual.carregado += p.totalProduzido
        if (!atual.producao || p.id > (atual.producao.id || '')) atual.producao = p
        grupos.set(key, atual)
      }

      // Deduplicação: linhas do servidor cujo local_id existe no IndexedDB já
      // são contadas pelo registro local (que conhece o vagaoId mesmo quando o
      // servidor ainda não tem a coluna). As demais são de outros aparelhos.
      const localIds = new Set(ofertasLocais.map((r: any) => r.id))

      // Consumido sem vagão identificado (registros antigos/pré-migration ou
      // locais sem vínculo). Só é atribuído quando há um único vagão no trato;
      // com dois ou mais, o dono é ambíguo e o consumo fica de fora do saldo.
      let consumidoSemVagao = 0
      for (const r of registrosDoDia) {
        if (Number(r.ordem_trato) !== ordemTrato) continue
        if (r.local_id && localIds.has(r.local_id)) continue
        if (r.vagao_id) continue
        consumidoSemVagao += Number(r.kg_ofertado_real) || 0
      }
      for (const r of ofertasLocais) {
        if (Number(r.ordemTrato) !== ordemTrato) continue
        if (r.vagaoId) continue
        consumidoSemVagao += parseKgReal(String(r.kgReal ?? '')) || 0
      }

      for (const [key, op] of grupos) {
        let consumido = 0
        for (const r of registrosDoDia) {
          if (Number(r.ordem_trato) !== ordemTrato) continue
          if (r.local_id && localIds.has(r.local_id)) continue
          if ((r.vagao_id || null) !== op.vagaoId) continue
          consumido += Number(r.kg_ofertado_real) || 0
        }
        for (const r of ofertasLocais) {
          if (Number(r.ordemTrato) !== ordemTrato) continue
          if ((r.vagaoId || null) !== op.vagaoId) continue
          consumido += parseKgReal(String(r.kgReal ?? '')) || 0
        }
        for (const l of lancadosLocal) {
          if (l.ordemTrato !== ordemTrato) continue
          if (l.vagaoId !== op.vagaoId) continue
          consumido += l.kg
        }
        if (grupos.size === 1) consumido += consumidoSemVagao
        op.consumido = consumido
        op.saldo = op.carregado - consumido
        grupos.set(key, op)
      }
      return [...grupos.values()]
    },
    [producoesDia, registrosDoDia, ofertasLocais, lancadosLocal]
  )

  // Sugere o vagão certo quando o card abre: produção cuja formulação bate com
  // a dieta do curral; sem match, primeira opção com saldo > 0.
  const vagaoSugerido = useCallback(
    (curral: CurralTrato, opcoes: OpcaoVagao[]): string => {
      if (opcoes.length === 0) return ''
      const porDieta = opcoes.find((o) =>
        o.producao?.formulacaoId && curral.formulacaoId && o.producao.formulacaoId === curral.formulacaoId
      )
      if (porDieta) return porDieta.key
      const comSaldo = opcoes.find((o) => o.saldo > 0)
      return (comSaldo || opcoes[0]).key
    },
    []
  )

  const curraisDaLinha = currais.filter((curral) => !linhaSelecionada || curral.linhaId === linhaSelecionada)
  const linhasComCurrais = useMemo(
    () => linhas.filter((linha) => currais.some((curral) => curral.linhaId === linha.id)),
    [linhas, currais]
  )
  const curralAtual = currais.find((c) => c.curralId === curralSelecionado) || null
  const opcoesVagaoAtual = curralAtual ? opcoesVagaoPorTrato(curralAtual.tratoExibido) : []
  const vagaoAtual = opcoesVagaoAtual.find((o) => o.key === curralAtual?.vagaoSelecionadoKey) || null
  const tratoEditavel = curralAtual ? curralAtual.tratoExibido === curralAtual.ordemTrato && !curralAtual.tratosConcluidos : false
  const registroTratoExibido = curralAtual
    ? registrosDoDia.find(
        (r) => r.curral_id === curralAtual.curralId && Number(r.ordem_trato) === curralAtual.tratoExibido
      ) ||
      lancadosLocal.find(
        (l) => l.curralId === curralAtual.curralId && l.ordemTrato === curralAtual.tratoExibido
      ) ||
      null
    : null

  // Autoselecionar vagão quando o card abre e ainda não há escolha válida
  useEffect(() => {
    if (!curralAtual || !tratoEditavel) return
    if (opcoesVagaoAtual.length === 0) return
    const valido = opcoesVagaoAtual.some((o) => o.key === curralAtual.vagaoSelecionadoKey)
    if (!valido) {
      atualizarCurral(curralAtual.curralId, { vagaoSelecionadoKey: vagaoSugerido(curralAtual, opcoesVagaoAtual) })
    }
  }, [curralAtual, tratoEditavel, opcoesVagaoAtual, atualizarCurral, vagaoSugerido])

  // "Dá para os próximos N currais": saldo do vagão contra o previsto dos
  // currais que ainda precisam deste trato (linha atual primeiro).
  const coberturaVagao = useMemo(() => {
    if (!vagaoAtual || !curralAtual) return null
    const pendentes = [...curraisDaLinha, ...currais.filter((c) => !curraisDaLinha.includes(c))]
      .filter((c) => !c.tratosConcluidos && c.ordemTrato === curralAtual.tratoExibido)
      .filter((c) => c.curralId !== curralAtual.curralId)
    let saldoRestante = vagaoAtual.saldo - (parseKgReal(curralAtual.kgReal) || 0)
    const cobertos: string[] = []
    for (const c of pendentes) {
      const necessario = c.kgPlanejado ?? 0
      if (necessario <= 0 || saldoRestante >= necessario) {
        cobertos.push(c.curralNome)
        saldoRestante -= Math.max(0, necessario)
      } else {
        break
      }
    }
    return { cobertos, saldoRestante }
  }, [vagaoAtual, curralAtual, curraisDaLinha, currais])

  // Próximo curral pendente da linha para o botão "SALVAR E IR PARA X"
  const proximoCurralPendente = useMemo(() => {
    if (!curralAtual) return null
    const idx = curraisDaLinha.findIndex((c) => c.curralId === curralAtual.curralId)
    for (let i = idx + 1; i < curraisDaLinha.length; i++) {
      if (!curraisDaLinha[i].tratosConcluidos) return curraisDaLinha[i]
    }
    for (let i = 0; i < idx; i++) {
      if (!curraisDaLinha[i].tratosConcluidos) return curraisDaLinha[i]
    }
    return null
  }, [curralAtual, curraisDaLinha])

  // Validade do lançamento atual
  const kgRealNum = curralAtual ? parseKgReal(curralAtual.kgReal) : NaN
  // Regra herdada da versão em produção: o último trato não pode ser 0
  const ultimoTratoZerado = Boolean(
    curralAtual &&
    tratoEditavel &&
    curralAtual.tratoExibido === curralAtual.quantidadeTratos &&
    isFinite(kgRealNum) &&
    kgRealNum === 0
  )
  const podeSalvar = Boolean(
    curralAtual &&
    tratoEditavel &&
    curralAtual.kgReal !== '' &&
    isFinite(kgRealNum) &&
    !ultimoTratoZerado &&
    !curralAtual.salvando &&
    !salvandoFim
  )

  const salvarCurralAtual = useCallback(async () => {
    if (!curralAtual || !fazendaId || !podeSalvar) return
    const curral = curralAtual
    setSalvandoFim(true)
    atualizarCurral(curral.curralId, { salvando: true, erroSalvar: false })

    try {
      const result = await salvarRegistro('trato-confinamento', {
        data: data,
        responsavel: usuario,
        usuario: usuario,
        curral: curral.curralNome,
        curralId: curral.curralId,
        numeroLote: curral.loteNome || '',
        loteId: curral.loteId || '',
        ordemTrato: String(curral.tratoExibido),
        kgPlanejado: curral.kgPlanejado !== null ? String(curral.kgPlanejado) : '',
        kgReal: curral.kgReal,
        leituraCochoNota: curral.leituraCochoNota !== null ? String(curral.leituraCochoNota) : '',
        programacaoId: programacao?.programacaoId || '',
        vagaoId: vagaoAtual?.vagaoId || '',
        vagaoNome: vagaoAtual?.vagaoNome || '',
        // Só vincula a produção quando ela já está sincronizada (id real);
        // produção só local quebraria a FK no insert.
        fabricaConfinamentoId: vagaoAtual?.producao?.supabaseId || '',
        fotoBase64: curral.fotoBalanca || undefined,
      })

      if (!result.success) {
        atualizarCurral(curral.curralId, { salvando: false, salvo: false, erroSalvar: true })
        setErro('Erro ao salvar trato. Tente novamente.')
        return
      }

      const kgLancado = parseKgReal(curral.kgReal) || 0
      setLancadosLocal((prev) => [
        ...prev,
        {
          curralId: curral.curralId,
          ordemTrato: curral.tratoExibido,
          kg: kgLancado,
          vagaoId: vagaoAtual?.vagaoId || null,
          vagaoNome: vagaoAtual?.vagaoNome || '',
        },
      ])

      // Avança o trato do curral (mesma regra do fluxo em lote anterior)
      const novoOrdem = curral.ordemTrato + 1
      const novoTratoConcluidos = novoOrdem > curral.quantidadeTratos
      const novoTrato = programacao?.percentuais.find((p) => p.ordem_trato === novoOrdem)
      const novoPercentual = novoTrato?.percentual ?? 0
      const novoHorario = novoTrato?.horario_sugerido ?? null
      const novoKgPlanejado =
        curral.kgBaseDia !== null ? curral.kgBaseDia * (novoPercentual / 100) : null
      atualizarCurral(curral.curralId, {
        salvando: false,
        salvo: true,
        rascunhoSalvo: false,
        erroSalvar: false,
        ordemTrato: novoOrdem,
        tratosConcluidos: novoTratoConcluidos,
        tratoExibido: Math.min(novoOrdem, curral.quantidadeTratos),
        percentualTrato: novoPercentual,
        horarioSugerido: novoHorario,
        kgPlanejado: novoKgPlanejado,
        kgReal: '',
        fotoBalanca: null,
        vagaoSelecionadoKey: '',
      })

      // Remove o kg deste curral do rascunho
      const dataISO = brToDateISO(data)
      const rascunhoKey = `trato-rascunho-${fazendaId}-${dataISO}-${tipoSelecionado}`
      const rascunhoAtual = await lerRascunho<Record<string, string>>(rascunhoKey)
      if (rascunhoAtual) {
        delete rascunhoAtual[curral.curralId]
        await salvarRascunho(rascunhoKey, rascunhoAtual)
      }

      // Avança para o próximo curral pendente da linha
      if (proximoCurralPendente) {
        setCurralSelecionado(proximoCurralPendente.curralId)
      }
    } catch (error) {
      console.error('Erro ao salvar trato:', error)
      atualizarCurral(curral.curralId, { salvando: false, salvo: false, erroSalvar: true })
      setErro('Erro ao salvar trato. Tente novamente.')
    } finally {
      setSalvandoFim(false)
    }
  }, [curralAtual, fazendaId, podeSalvar, data, usuario, programacao, vagaoAtual, proximoCurralPendente, tipoSelecionado, atualizarCurral])

  const tiposVisiveis = TIPOS_PROGRAMACAO.filter((t) => tiposDisponiveis.includes(t.value))

  useEffect(() => {
    const containers = [linhaScrollRef.current, curralScrollRef.current].filter(Boolean) as HTMLDivElement[]

    const atualizarIndicadores = () => {
      const linha = linhaScrollRef.current
      const curral = curralScrollRef.current
      setLinhaTemMais(linha ? linha.scrollWidth > linha.clientWidth + 1 : false)
      setCurralTemMais(curral ? curral.scrollWidth > curral.clientWidth + 1 : false)
    }

    atualizarIndicadores()
    const observer = new ResizeObserver(atualizarIndicadores)
    containers.forEach((container) => {
      observer.observe(container)
      container.addEventListener('scroll', atualizarIndicadores, { passive: true })
    })
    window.addEventListener('resize', atualizarIndicadores)

    return () => {
      observer.disconnect()
      containers.forEach((container) => container.removeEventListener('scroll', atualizarIndicadores))
      window.removeEventListener('resize', atualizarIndicadores)
    }
  }, [linhas, currais, linhaSelecionada])

  const exibirBarraInferior = Boolean(programacao && currais.length > 0 && !carregando && !erro)

  // Progresso: posição do curral na linha + % de currais com trato salvo
  const posicaoLinha = curralAtual ? curraisDaLinha.findIndex((c) => c.curralId === curralAtual.curralId) + 1 : 0
  const totalLinha = curraisDaLinha.length
  // Progresso do trato exibido: currais da linha que já passaram por ele
  const tratoExibidoAtual = curralAtual?.tratoExibido ?? 0
  const concluidosLinha = curraisDaLinha.filter(
    (c) => c.tratosConcluidos || c.ordemTrato > tratoExibidoAtual
  ).length
  const progressoPercent = totalLinha > 0 ? Math.round((concluidosLinha / totalLinha) * 100) : 0
  const vagosDaLinha = linhaSelecionada ? Math.max(0, (vagosPorCurral.get(linhaSelecionada) || 0) - totalLinha) : 0

  const bottomContent = exibirBarraInferior ? (
    <div className="flex flex-col gap-3 pb-3">
      <div className="flex items-center justify-between text-[13px] font-bold text-gray-500">
        <span className="uppercase tracking-wide">
          {curralAtual ? `${curralAtual.tratoExibido}º trato` : 'Trato'} · {posicaoLinha} de {totalLinha} currais
        </span>
        <span>{progressoPercent}%</span>
      </div>
      {linhasComCurrais.length > 0 && (
        <div className="relative">
          <span className="mb-1 block text-sm font-black uppercase tracking-wider text-gray-500">
            Linha
          </span>
          <div ref={linhaScrollRef} className="flex gap-1.5 overflow-x-auto pb-0.5 pr-8 scrollbar-none">
            {linhasComCurrais.map((linha) => (
              <button
                key={linha.id}
                type="button"
                onClick={() => {
                  setLinhaSelecionada(linha.id)
                  const primeiro = currais.find((curral) => curral.linhaId === linha.id)
                  setCurralSelecionado(primeiro?.curralId || null)
                }}
                className={`!min-h-[52px] shrink-0 rounded-xl border px-5 py-3 text-sm font-bold whitespace-nowrap transition-colors ${
                  linhaSelecionada === linha.id
                    ? 'border-[#1a3a2a] bg-[#1a3a2a] text-white'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {linha.nome}
              </button>
            ))}
          </div>
          {linhaTemMais && (
            <div className="pointer-events-none absolute right-0 bottom-0 flex h-12 w-10 items-center justify-end bg-gradient-to-r from-transparent via-white/90 to-white">
              <ChevronRight className="h-5 w-5 text-[#1a3a2a]" strokeWidth={3} />
            </div>
          )}
        </div>
      )}

      <div className="relative">
        <span className="mb-1 block text-sm font-black uppercase tracking-wider text-gray-500">
          Curral
        </span>
        <div ref={curralScrollRef} className="flex gap-2 overflow-x-auto pb-1 pr-8 scrollbar-none">
          {curraisDaLinha.map((curral) => {
            const concluido = curral.salvo || curral.tratosConcluidos
            return (
              <button
                key={curral.curralId}
                type="button"
                onClick={() => setCurralSelecionado(curral.curralId)}
                className={`!min-h-[52px] shrink-0 rounded-xl border-2 px-4 py-3 text-center transition-all ${
                  curralSelecionado === curral.curralId
                    ? curral.erroSalvar
                      ? 'border-red-500 bg-red-50'
                      : concluido
                        ? 'border-green-500 bg-green-50'
                        : 'border-[#1a3a2a] bg-[#e8f1ec]'
                    : curral.erroSalvar
                      ? 'border-red-200 bg-white'
                      : concluido
                        ? 'border-green-200 bg-white'
                        : 'border-gray-200 bg-white'
                }`}
              >
                <span className="flex items-center justify-center gap-1 text-sm font-bold leading-tight text-gray-900">
                  {concluido && <Check className="h-4 w-4 text-green-600" strokeWidth={3} />}
                  {curral.curralNome}
                </span>
              </button>
            )
          })}
          {vagosDaLinha > 0 && (
            <div className="!min-h-[52px] shrink-0 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-center">
              <span className="block text-sm font-bold leading-tight text-gray-400">
                {vagosDaLinha} {vagosDaLinha === 1 ? 'vazio' : 'vazios'}
              </span>
            </div>
          )}
        </div>
        {curralTemMais && (
          <div className="pointer-events-none absolute right-0 bottom-0 flex h-12 w-10 items-center justify-end bg-gradient-to-r from-transparent via-white/90 to-white">
            <ChevronRight className="h-5 w-5 text-[#1a3a2a]" strokeWidth={3} />
          </div>
        )}
      </div>

      <div className="mt-2 border-t border-gray-200 pt-3">
        <div className="flex gap-2">
          <button
            onClick={salvarCurralAtual}
            disabled={!podeSalvar}
            className={`flex-1 !min-h-0 rounded-2xl border-2 px-3 py-3 text-sm font-bold transition-colors active:scale-[0.99] ${
              !podeSalvar
                ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                : 'border-[#1a3a2a] bg-[#1a3a2a] text-white hover:bg-[#245038]'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Save className="h-4 w-4" strokeWidth={2.5} />
              {curralAtual?.salvando || salvandoFim
                ? 'SALVANDO...'
                : proximoCurralPendente
                  ? `SALVAR E IR PARA ${proximoCurralPendente.curralNome.toUpperCase()} →`
                  : 'SALVAR'}
            </span>
          </button>
          {curralAtual && tratoEditavel && (
            <button
              onClick={() => limparCurralAtual(curralAtual.curralId)}
              className="!min-h-0 rounded-2xl border-2 border-gray-300 bg-gray-200 px-3 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-300 active:scale-95"
            >
              <span className="inline-flex items-center justify-center gap-2">
                <Brush className="h-4 w-4" strokeWidth={2.5} />
                LIMPAR
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  ) : null

  // Desvio realizado vs previsto (faixa de tolerância do mockup)
  const desvioKg = curralAtual && isFinite(kgRealNum) && curralAtual.kgPlanejado !== null
    ? kgRealNum - curralAtual.kgPlanejado
    : null
  const desvioPercent = desvioKg !== null && curralAtual!.kgPlanejado! > 0
    ? (desvioKg / curralAtual!.kgPlanejado!) * 100
    : null

  return (
    <CadernetaLayout
      title="Trato Confinamento"
      cadernetaId="trato-confinamento"
      onBack={() => navigate('/modulos/cadernetas')}
      showLogos={false}
      leftContent={
        <img
          src={LOGO_URL}
          alt="GestaUp"
          className="h-11 w-11 shrink-0 rounded-xl object-contain shadow-lg shadow-black/10"
        />
      }
      dateContent={
        <DatePicker
          value={data}
          onChange={setData}
          compact
          inline
          variant="header"
        />
      }
      bottomContent={bottomContent}
    >
      <div className="-mt-1 flex flex-col gap-4">
        {tiposVisiveis.length > 1 && (
          <div className="app-card flex items-center justify-end gap-1.5 p-3">
            {tiposVisiveis.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTipoSelecionado(t.value)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                  tipoSelecionado === t.value
                    ? 'bg-[#1a3a2a] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {!programacao ? (
          <div className="app-card p-8 text-center text-gray-500">
            {carregando ? (
              'Carregando programação...'
            ) : (
              <>
                <p className="font-bold mb-2">Nenhuma programação de tratos ativa</p>
                <p className="text-sm">
                  Configure a programação de tratos no painel web antes de usar esta tela.
                </p>
              </>
            )}
          </div>
        ) : carregando ? (
          <div className="app-card p-8 text-center text-gray-500">Carregando currais...</div>
        ) : erro ? (
          <div className="app-card p-8 text-center text-red-600">{erro}</div>
        ) : currais.length === 0 ? (
          <div className="app-card p-8 text-center text-gray-500">
            Nenhum curral ocupado por lote deste sistema nesta data.
          </div>
        ) : curralAtual ? (
          <>
            {/* Card do curral: identidade + stats do lote */}
            <div className="app-card flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-base font-black text-gray-900">
                    {curralAtual.curralNome}
                  </h2>
                  {curralAtual.linhaNome && (
                    <p className="text-sm font-semibold text-gray-500">{curralAtual.linhaNome}</p>
                  )}
                </div>
                <div className="min-w-0 text-right">
                  <h2 className="text-base font-black text-[#1a3a2a]">{curralAtual.loteNome || '—'}</h2>
                  {curralAtual.categorias && (
                    <p className="text-sm font-semibold text-gray-500">
                      {curralAtual.categorias
                        .split(',')
                        .map((c) => c.trim())
                        .filter(Boolean)
                        .map((c) => capitalizarIniciais(c))
                        .join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Dieta</p>
                  <p className="mt-0.5 truncate text-sm font-extrabold text-gray-900">
                    {curralAtual.formulacaoNome || '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Cabeças</p>
                  <p className="mt-0.5 truncate text-sm font-extrabold text-gray-900">
                    {curralAtual.nCabecas ?? '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-gray-50 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Peso médio</p>
                  <p className="mt-0.5 truncate text-sm font-extrabold text-gray-900">
                    {curralAtual.pesoVivoKg != null ? `${formatarKg(curralAtual.pesoVivoKg, 0)} kg` : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Tratos de hoje: seletor com horário sugerido */}
            <div className="app-card flex flex-col gap-3 p-5">
              <h3 className="text-[13px] font-extrabold uppercase tracking-wide text-gray-500">
                Tratos de hoje
              </h3>
              <div className={`grid gap-2 ${curralAtual.quantidadeTratos <= 2 ? 'grid-cols-2' : curralAtual.quantidadeTratos === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                {Array.from({ length: curralAtual.quantidadeTratos }, (_, i) => i + 1).map((ordem) => {
                  const cfg = programacao?.percentuais.find((p) => p.ordem_trato === ordem)
                  const feito = ordem < curralAtual.ordemTrato || curralAtual.tratosConcluidos
                  const exibido = curralAtual.tratoExibido === ordem
                  const futuro = ordem > curralAtual.ordemTrato && !curralAtual.tratosConcluidos
                  return (
                    <button
                      key={ordem}
                      type="button"
                      disabled={futuro}
                      onClick={() => atualizarCurral(curralAtual.curralId, { tratoExibido: ordem })}
                      className={`rounded-xl border-2 px-2 py-2.5 text-center transition-all ${
                        exibido
                          ? 'border-[#1a3a2a] bg-[#1a3a2a] text-white'
                          : feito
                            ? 'border-green-300 bg-green-50 text-green-800'
                            : futuro
                              ? 'border-gray-200 bg-gray-50 text-gray-400'
                              : 'border-gray-200 bg-white text-gray-900'
                      }`}
                    >
                      <span className="flex items-center justify-center gap-1 text-[13px] font-bold">
                        {feito && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        {ordem}º trato
                      </span>
                      <span className={`block text-[11px] font-semibold ${exibido ? 'text-white/80' : 'text-gray-500'}`}>
                        {cfg?.horario_sugerido ? cfg.horario_sugerido.slice(0, 5) : '—'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Seção 1: trato atual - previsto vs realizado */}
            <CadernetaSection numero={1} titulo={`${curralAtual.tratoExibido}º Trato`} required>
              {curralAtual.tratosConcluidos ? (
                <InfoStrip tone="success" icon={<Check className="h-4 w-4" strokeWidth={3} />}>
                  Tratos do dia concluídos para este curral ({curralAtual.quantidadeTratos}/{curralAtual.quantidadeTratos}).
                </InfoStrip>
              ) : !tratoEditavel ? (
                <div className="flex flex-col gap-3">
                  <InfoStrip tone="neutral">
                    Trato já lançado
                    {registroTratoExibido && 'kg_ofertado_real' in (registroTratoExibido as any)
                      ? `: ${formatarKg(Number((registroTratoExibido as any).kg_ofertado_real), 0)} kg`
                      : (registroTratoExibido as any)?.kg != null
                        ? `: ${formatarKg(Number((registroTratoExibido as any).kg), 0)} kg`
                        : '.'}
                  </InfoStrip>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-gray-100 px-3 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                        {curralAtual.compensacaoUltimoTrato > 0 ? 'Previsto ajustado' : 'Previsto'}
                      </p>
                      <p className="mt-0.5 text-2xl font-black text-gray-700">
                        {curralAtual.kgPlanejado != null ? (
                          <>
                            {formatarKg(curralAtual.kgPlanejado, 0)}
                            <span className="ml-1 text-sm font-bold text-gray-500">kg</span>
                          </>
                        ) : (
                          <span className="text-base">a definir</span>
                        )}
                      </p>
                    </div>
                    <div
                      className={`rounded-xl border-2 px-3 py-2.5 ${
                        curralAtual.erroSalvar
                          ? 'border-red-400 bg-red-50'
                          : curralAtual.salvo || curralAtual.rascunhoSalvo
                            ? 'border-green-400 bg-green-50'
                            : 'border-green-500 bg-white'
                      }`}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                        Realizado <span className="text-red-500">*</span>
                      </p>
                      <div className="flex items-baseline gap-1">
                        <input
                          ref={(el) => (inputRefs.current[curralAtual.curralId] = el)}
                          type="text"
                          inputMode="decimal"
                          value={curralAtual.kgReal}
                          onChange={(e) => atualizarKgReal(curralAtual.curralId, e.target.value)}
                          className="w-full bg-transparent text-2xl font-black text-gray-900 focus:outline-none"
                          placeholder="0"
                        />
                        <span className="text-sm font-bold text-gray-500">kg</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={curralAtual.kgPlanejado == null}
                      onClick={() =>
                        curralAtual.kgPlanejado != null &&
                        atualizarKgReal(curralAtual.curralId, String(Math.round(curralAtual.kgPlanejado)))
                      }
                      className="rounded-xl border-2 border-gray-200 bg-white px-3 py-3 text-sm font-bold text-gray-700 transition-colors hover:border-gray-300 active:scale-[0.99] disabled:opacity-50"
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                        USAR PREVISTO
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => tirarFotoBalanca(curralAtual.curralId)}
                      disabled={capturandoFoto}
                      className="rounded-xl border-2 border-gray-200 bg-white px-3 py-3 text-sm font-bold text-gray-700 transition-colors hover:border-gray-300 active:scale-[0.99] disabled:opacity-60"
                    >
                      <span className="inline-flex items-center justify-center gap-2">
                        <Camera className="h-4 w-4" strokeWidth={2.5} />
                        {capturandoFoto ? 'ABRINDO...' : 'BALANÇA'}
                      </span>
                    </button>
                  </div>

                  {curralAtual.fotoBalanca && (
                    <div className="flex items-center gap-3">
                      <img
                        src={base64ToDataUrl(curralAtual.fotoBalanca)}
                        alt="Foto da balança"
                        className="h-16 w-16 rounded-xl border border-gray-200 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => atualizarCurral(curralAtual.curralId, { fotoBalanca: null })}
                        className="text-xs font-bold text-red-600 underline"
                      >
                        Remover foto
                      </button>
                    </div>
                  )}

                  {desvioPercent !== null && (
                    <InfoStrip
                      tone={Math.abs(desvioPercent) <= TOLERANCIA_DESVIO_PERCENT ? 'success' : 'warning'}
                      icon={<Check className="h-4 w-4" strokeWidth={3} />}
                    >
                      {desvioKg! >= 0 ? '+' : ''}
                      {formatarKg(desvioKg!, 0)} kg ({desvioPercent >= 0 ? '+' : ''}
                      {desvioPercent.toFixed(1).replace('.', ',')}%) ·{' '}
                      {Math.abs(desvioPercent) <= TOLERANCIA_DESVIO_PERCENT
                        ? `dentro da tolerância de ${TOLERANCIA_DESVIO_PERCENT}%`
                        : `acima da tolerância de ${TOLERANCIA_DESVIO_PERCENT}%`}
                    </InfoStrip>
                  )}

                  {ultimoTratoZerado && (
                    <InfoStrip tone="danger">
                      O último trato precisa ser fornecido com quantidade maior que zero.
                    </InfoStrip>
                  )}

                  {curralAtual.compensacaoUltimoTrato > 0 && (
                    <InfoStrip tone="warning">
                      Inclui {formatarKg(curralAtual.compensacaoUltimoTrato, 0)} kg de compensação pela leitura tardia.
                    </InfoStrip>
                  )}

                  {!curralAtual.isDia1 && curralAtual.leituraCochoNota !== null && (
                    <InfoStrip tone="warning">
                      Leitura de cocho de hoje: {curralAtual.leituraCochoNota}
                      {(() => {
                        const desc = notasConfig.find((n) => n.nota === curralAtual.leituraCochoNota)?.descricao
                        return desc ? ` (${desc})` : ''
                      })()}{' '}
                      → previsto já inclui{' '}
                      {curralAtual.leituraPercentualAjuste !== null
                        ? `${curralAtual.leituraPercentualAjuste > 0 ? '+' : ''}${curralAtual.leituraPercentualAjuste}%`
                        : 'sem ajuste'}
                    </InfoStrip>
                  )}
                </div>
              )}
            </CadernetaSection>

            {/* Seção 2: vagão (só aparece quando há produção para o trato) */}
            {opcoesVagaoAtual.length > 0 && (
              <CadernetaSection numero={2} titulo="Vagão">
                <div className="flex flex-col gap-3">
                  {opcoesVagaoAtual.length > 1 && (
                    <div className={`grid gap-2 ${opcoesVagaoAtual.length === 2 ? 'grid-cols-2' : opcoesVagaoAtual.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                      {opcoesVagaoAtual.map((op) => {
                        const selecionado = curralAtual.vagaoSelecionadoKey === op.key
                        return (
                          <button
                            key={op.key}
                            type="button"
                            disabled={!tratoEditavel}
                            onClick={() => atualizarCurral(curralAtual.curralId, { vagaoSelecionadoKey: op.key })}
                            className={`rounded-xl border-2 px-3 py-2.5 text-left transition-all ${
                              selecionado
                                ? 'border-[#1a3a2a] bg-[#1a3a2a] text-white'
                                : 'border-gray-200 bg-white text-gray-900'
                            }`}
                          >
                            <span className="block text-sm font-bold">{op.vagaoNome}</span>
                            {op.producao?.formulacaoNome && (
                              <span className={`block text-[11px] font-semibold ${selecionado ? 'text-white/75' : 'text-gray-500'}`}>
                                {op.producao.formulacaoNome}
                              </span>
                            )}
                            <span className={`block text-[11px] font-semibold ${selecionado ? 'text-white/75' : 'text-gray-500'}`}>
                              saldo {formatarKg(op.saldo, 0)} kg
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {vagaoAtual && (
                    <>
                      {opcoesVagaoAtual.length === 1 && (
                        <p className="text-sm font-bold text-gray-900">
                          {vagaoAtual.vagaoNome}
                          {vagaoAtual.producao?.formulacaoNome && (
                            <span className="ml-2 text-xs font-semibold text-gray-500">
                              {vagaoAtual.producao.formulacaoNome}
                            </span>
                          )}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-gray-50 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Carregado</p>
                          <p className="mt-0.5 text-sm font-extrabold text-gray-900">
                            {formatarKg(vagaoAtual.carregado, 0)} kg
                          </p>
                        </div>
                        <div className="rounded-xl bg-gray-50 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Ainda no vagão</p>
                          <p className={`mt-0.5 text-sm font-extrabold text-gray-900`}>
                            {formatarKg(vagaoAtual.saldo, 0)} kg
                          </p>
                        </div>
                      </div>

                      {coberturaVagao && vagaoAtual.saldo > 0 && (
                        <InfoStrip tone="neutral">
                          {coberturaVagao.cobertos.length > 0
                            ? `Dá para os próximos ${coberturaVagao.cobertos.length} ${coberturaVagao.cobertos.length === 1 ? 'curral' : 'currais'} (${coberturaVagao.cobertos.slice(0, 4).join(', ')}${coberturaVagao.cobertos.length > 4 ? '…' : ''})`
                            : 'Não cobre o próximo curral previsto.'}
                        </InfoStrip>
                      )}
                    </>
                  )}
                </div>
              </CadernetaSection>
            )}
          </>
        ) : null}

        <input
          ref={fotoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFotoBalancaInput}
          className="hidden"
        />
      </div>
    </CadernetaLayout>
  )
}

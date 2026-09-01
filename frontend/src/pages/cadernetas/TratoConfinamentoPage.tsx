import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { DatePicker } from '../../components/ui'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import { salvarRascunho, lerRascunho, limparRascunho } from '../../services/indexedDB'
import {
  getLoteDetalhesComCategoriasCached,
  getCurraisCached,
  getRegistrosLeituraCochoByLoteCached,
  getProgramacaoTratosCompletaCached,
  getTiposProgramacaoTratosCached,
  getRegistrosOfertaTratoByFazendaDataCached,
  getRegistrosOfertaTratoAnterioresCached,
  getCachedCadastroData,
  getNotasLeituraCochoConfigCached,
  getLoteByNomeCached,
  getLinhasConfinamentoCached,
} from '../../services/cadastroCache'
import {
  getLotes,
  getNotasLeituraCochoConfig,
} from '../../services/supabaseService'
import { Check } from 'lucide-react'

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
  formulacaoNome: string | null
  quantidadeTratos: number
  ordemTrato: number // próximo trato a ser feito (count + 1)
  percentualTrato: number // percentual do trato atual
  horarioSugerido: string | null // horário sugerido do trato atual (HH:mm)
  kgPlanejado: number | null
  kgReal: string
  leituraCochoNota: number | null
  leituraPercentualAjuste: number | null
  totalRealDiaAnterior: number | null
  kgBaseDia: number | null
  isDia1: boolean
  tratosConcluidos: boolean
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
  kgMnDiaPorCurral: Map<string, number>
  curraisIdsDaProgramacao: Set<string>
}

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

/**
 * Converte data BR (DD/MM/AAAA) para YYYY-MM-DD (formato date do Supabase).
 */
function brToDateISO(dataBR: string): string {
  const [day, month, year] = dataBR.split(' ')[0].split('/').map(Number)
  if (!day || !month || !year) return ''
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const TIPOS_PROGRAMACAO = [
  { value: 'engorda', label: 'Engorda' },
  { value: 'sequestro', label: 'Sequestro' },
]

export default function TratoConfinamentoPage() {
  const navigate = useNavigate()
  const { fazendaId, usuario } = useSelector((state: RootState) => state.config)
  const [data, setData] = useState<string>(todayBR())
  const [currais, setCurrais] = useState<CurralTrato[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [notasConfig, setNotasConfig] = useState<NotaConfig[]>([])
  const [tiposDisponiveis, setTiposDisponiveis] = useState<string[]>([])
  const [tipoSelecionado, setTipoSelecionado] = useState<string>('engorda')
  const [programacao, setProgramacao] = useState<ProgramacaoData | null>(null)
  const [linhas, setLinhas] = useState<{ id: string; nome: string }[]>([])
  const [linhaSelecionada, setLinhaSelecionada] = useState<string | null>(null)
  const [curralSelecionado, setCurralSelecionado] = useState<string | null>(null)
  const [showRevisarModal, setShowRevisarModal] = useState(false)
  const [salvandoFim, setSalvandoFim] = useState(false)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  // Espelho de currais para leitura síncrona em flush/cleanup (sem depender de re-render)
  const curraisRef = useRef<CurralTrato[]>([])
  // Timers de debounce de autosave por curralId
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Carregamento inicial: notas config e tipos disponíveis
  useEffect(() => {
    async function carregarInicial() {
      if (!fazendaId) return
      try {
        // Notas de leitura de cocho: usar versão cached para funcionamento offline
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
        setTiposDisponiveis(tipos.length > 0 ? tipos : ['engorda'])
        if (tipos.length > 0 && !tipos.includes('engorda')) {
          setTipoSelecionado(tipos[0])
        }
      } catch (error) {
        console.error('Erro ao carregar dados iniciais do trato:', error)
        setErro('Erro ao carregar configuração. Tente novamente.')
      }
    }
    carregarInicial()
  }, [fazendaId])

  // Carregamento principal: currais + programação + registros do dia
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

      // Buscar lotes: online usa supabaseService, offline usa cache lazy por nome
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

      const [progCompleta, curraisData, registrosDoDia, linhasData] = await Promise.all([
        getProgramacaoTratosCompletaCached(fazendaId, tipoSelecionado),
        getCurraisCached(fazendaId),
        getRegistrosOfertaTratoByFazendaDataCached(fazendaId, dataISO),
        getLinhasConfinamentoCached(fazendaId),
      ])

      // Carregar linhas de confinamento
      const linhasList = (linhasData || [])
        .filter((l: any) => l.ativo !== false)
        .map((l: any) => ({ id: l.id, nome: l.nome }))
        .sort((a: any, b: any) => a.nome.localeCompare(b.nome, 'pt-BR'))
      setLinhas(linhasList)

      // Se não há programação ativa para o tipo, mostra mensagem
      if (!progCompleta.programacao) {
        setProgramacao(null)
        setCurrais([])
        setCarregando(false)
        return
      }

      // Monta estrutura da programação
      const kgMnDiaPorCurral = new Map<string, number>()
      const curraisIdsDaProgramacao = new Set<string>()
      for (const c of progCompleta.currais) {
        kgMnDiaPorCurral.set(c.curral_id, Number(c.kg_mn_dia) || 0)
        curraisIdsDaProgramacao.add(c.curral_id)
      }

      const progData: ProgramacaoData = {
        programacaoId: progCompleta.programacao.id,
        quantidadeTratos: progCompleta.programacao.quantidade_tratos,
        percentuais: progCompleta.percentuais.map((p: any) => ({
          ordem_trato: p.ordem_trato,
          percentual: Number(p.percentual),
          horario_sugerido: p.horario_sugerido,
        })),
        kgMnDiaPorCurral,
        curraisIdsDaProgramacao,
      }
      setProgramacao(progData)

      // Mapa de lotes por id
      const lotesPorId = new Map<string, any>()
      for (const l of lotesData || []) {
        lotesPorId.set(l.id, l)
      }

      // Mapa de currais por id (apenas currais ativos com lote)
      const curraisPorId = new Map<string, any>()
      for (const c of curraisData || []) {
        if (c.id && c.lote_id) {
          curraisPorId.set(c.id, c)
        }
      }

      // Mapa de linha_id -> nome
      const linhaNomePorId = new Map<string, string>()
      for (const l of linhasList) {
        linhaNomePorId.set(l.id, l.nome)
      }

      // Agrupa registros do dia por curral_id
      const registrosPorCurral = new Map<string, any[]>()
      for (const r of registrosDoDia) {
        const arr = registrosPorCurral.get(r.curral_id) || []
        arr.push(r)
        registrosPorCurral.set(r.curral_id, arr)
      }

      // Para cada curral da programação, monta o CurralTrato
      const curraisTratoList: CurralTrato[] = await Promise.all(
        Array.from(curraisIdsDaProgramacao).map(async (curralId) => {
          const curralInfo = curraisPorId.get(curralId)
          const curralNome = curralInfo?.nome || curralId
          const linhaId = curralInfo?.linha_id || null
          const linhaNome = linhaId ? (linhaNomePorId.get(linhaId) || null) : null
          const loteId = curralInfo?.lote_id || null
          const lote = loteId ? lotesPorId.get(loteId) : null
          const loteNome = lote?.nome || null

          // Busca detalhes do lote (categorias, cabecas, peso)
          let nCabecas: number | null = null
          let pesoVivoKg: number | null = null
          let categorias = ''
          let formulacaoNome: string | null = null
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

          // Busca a formulação vigente do lote (última suplementação ou formulação do curral)
          if (loteId) {
            try {
              if (curralInfo?.formulacao_id) {
                // Buscar nome da formulação por id
                const { getFormulacaoById } = await import('../../services/supabaseService')
                const form = await getFormulacaoById(curralInfo.formulacao_id)
                formulacaoNome = form?.nome || null
              }
            } catch {
              // ignorar erro
            }
          }

          // Fallback: se não achou formulação por id, tenta por nome via última suplementação
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

          // Conta tratos já registrados no dia para este curral
          const tratosDoDia = registrosPorCurral.get(curralId) || []
          const tratosFeitos = tratosDoDia.filter((t) => t.kg_ofertado_real !== null).length
          const ordemTrato = tratosFeitos + 1
          const quantidadeTratos = progData.quantidadeTratos
          const tratosConcluidos = ordemTrato > quantidadeTratos

          // Percentual e horário sugerido do trato atual
          const tratoAtual = progData.percentuais.find(
            (p) => p.ordem_trato === ordemTrato
          )
          const percentualTrato = tratoAtual?.percentual ?? 0
          const horarioSugerido = tratoAtual?.horario_sugerido ?? null

          // Verifica se é dia 1 (não há tratos em datas anteriores)
          const registrosAnteriores = await getRegistrosOfertaTratoAnterioresCached(
            fazendaId,
            curralId,
            dataISO
          )
          const isDia1 = registrosAnteriores.length === 0

          // Busca a última leitura de cocho do lote para pegar nota e percentual_ajuste
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
                // Busca o percentual_ajuste da nota config
                if (ultimaLeitura.nota_config_id) {
                  const config = notasConfig.find((n) => n.id === ultimaLeitura.nota_config_id)
                  if (config) {
                    leituraPercentualAjuste = config.percentual_ajuste
                  }
                }
                // Fallback: se não tem nota_config_id, busca por nota número
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

          // Calcula total real do dia anterior
          let totalRealDiaAnterior: number | null = null
          if (!isDia1 && registrosAnteriores.length > 0) {
            // O dia anterior é a data mais recente entre os registros anteriores
            const dataAnteriorMaisRecente = registrosAnteriores[0].data
            const tratosDiaAnterior = registrosAnteriores.filter(
              (r: any) => r.data === dataAnteriorMaisRecente
            )
            totalRealDiaAnterior = tratosDiaAnterior.reduce(
              (sum: number, r: any) => sum + (Number(r.kg_ofertado_real) || 0),
              0
            )
          }

          // Calcula kg_planejado e kg_base_dia
          let kgBaseDia: number | null = null
          let kgPlanejado: number | null = null
          const kgMnDia = kgMnDiaPorCurral.get(curralId) || 0

          if (isDia1) {
            // Dia 1: usa kg_mn_dia da programação
            kgBaseDia = kgMnDia
            kgPlanejado = kgMnDia * (percentualTrato / 100)
          } else if (totalRealDiaAnterior !== null && totalRealDiaAnterior > 0) {
            // Dia 2+: total real dia anterior * (1 + percentual_ajuste / 100)
            const fatorAjuste = leituraPercentualAjuste !== null ? 1 + leituraPercentualAjuste / 100 : 1
            kgBaseDia = totalRealDiaAnterior * fatorAjuste
            kgPlanejado = kgBaseDia * (percentualTrato / 100)
          }

          // Verifica se já existe um registro para este trato do dia (permite editar)
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
            formulacaoNome,
            quantidadeTratos,
            ordemTrato,
            percentualTrato,
            horarioSugerido,
            kgPlanejado,
            kgReal: kgRealInicial,
            leituraCochoNota,
            leituraPercentualAjuste,
            totalRealDiaAnterior,
            kgBaseDia,
            isDia1,
            tratosConcluidos,
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

      // Ordena por nome do curral
      curraisTratoList.sort((a, b) => a.curralNome.localeCompare(b.curralNome, 'pt-BR'))

      // Carregar rascunho salvo
      const rascunhoKey = `trato-rascunho-${fazendaId}-${dataISO}-${tipoSelecionado}`
      const rascunhoData = await lerRascunho<Record<string, string>>(rascunhoKey)
      if (rascunhoData) {
        for (const curral of curraisTratoList) {
          const valorRascunho = rascunhoData[curral.curralId]
          if (valorRascunho !== undefined && valorRascunho !== '' && !curral.salvo) {
            curral.kgReal = valorRascunho
            curral.rascunhoSalvo = true
          }
        }
      }

      setCurrais(curraisTratoList)

      // Auto-selecionar primeira linha e primeiro curral
      if (linhasList.length > 0) {
        const primeiraLinhaId = linhasList[0].id
        setLinhaSelecionada(primeiraLinhaId)
        const primeiroCurralDaLinha = curraisTratoList.find(
          (c) => c.linhaId === primeiraLinhaId
        )
        setCurralSelecionado(primeiroCurralDaLinha?.curralId || curraisTratoList[0]?.curralId || null)
      } else {
        setLinhaSelecionada(null)
        setCurralSelecionado(curraisTratoList[0]?.curralId || null)
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

  // Focar no primeiro input após carregar (apenas na transição de carregando -> pronto)
  const carregandoRef = useRef(true)
  useEffect(() => {
    // Foca no input do curral selecionado quando termina o carregamento
    if (carregandoRef.current && !carregando && curralSelecionado) {
      const curral = currais.find((c) => c.curralId === curralSelecionado)
      if (curral && !curral.tratosConcluidos) {
        setTimeout(() => {
          inputRefs.current[curral.curralId]?.focus()
        }, 200)
      }
    }
    carregandoRef.current = carregando
  }, [carregando, currais, curralSelecionado])

  // Focar no input quando troca de curral selecionado
  useEffect(() => {
    if (!carregando && curralSelecionado) {
      const curral = currais.find((c) => c.curralId === curralSelecionado)
      if (curral && !curral.tratosConcluidos) {
        setTimeout(() => {
          inputRefs.current[curral.curralId]?.focus()
        }, 100)
      }
    }
  }, [curralSelecionado])

  // Salvar rascunho do trato (não envia ao Supabase).
  // Recebe o valor explicitamente para funcionar imediatamente após setCurrais,
  // sem depender do estado ainda não commitado pelo React.
  const salvarTratoRascunho = useCallback(
    async (curralId: string, valorKg: string): Promise<boolean> => {
      if (!fazendaId) return false
      if (valorKg === '' ) return false
      const curral = curraisRef.current.find((c) => c.curralId === curralId)
      if (!curral || curral.tratosConcluidos) return false

      // Marcar como rascunho salvo (verde + check)
      setCurrais((prev) =>
        prev.map((c) =>
          c.curralId === curralId ? { ...c, rascunhoSalvo: true, erroSalvar: false } : c
        )
      )

      // Persistir no IndexedDB
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

  // Sincroniza espelho de currais para leitura síncrona em flush/cleanup
  useEffect(() => {
    curraisRef.current = currais
  }, [currais])

  // Flush do autosave: dispara salvamentos pendentes antes de recarregar (troca de
  // data/tipo/fazenda) ou desmontar o componente. Roda o cleanup antes da reexecução
  // de carregarDados, garantindo que valores digitados nos últimos 500ms não se percam.
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

  const atualizarKgReal = useCallback((curralId: string, valor: string) => {
    setCurrais((prev) =>
      prev.map((c) =>
        c.curralId === curralId ? { ...c, kgReal: valor, salvo: false, rascunhoSalvo: false, erroSalvar: false } : c
      )
    )
    // Autosave debounced: cancela timer anterior e agenda novo
    const prevTimer = debounceTimers.current[curralId]
    if (prevTimer) clearTimeout(prevTimer)
    if (valor === '') return
    debounceTimers.current[curralId] = setTimeout(() => {
      delete debounceTimers.current[curralId]
      void salvarTratoRascunho(curralId, valor)
    }, 500)
  }, [salvarTratoRascunho])

  // Salvar todos os rascunhos de uma vez (envia ao Supabase)
  const salvarTodosDoRascunho = useCallback(
    async (): Promise<boolean> => {
      const curraisComRascunho = currais.filter((c) => c.rascunhoSalvo && !c.salvo && c.kgReal !== '')
      if (curraisComRascunho.length === 0) return false

      setSalvandoFim(true)
      let todosOk = true

      for (const curral of curraisComRascunho) {
        setCurrais((prev) =>
          prev.map((c) => (c.curralId === curral.curralId ? { ...c, salvando: true, erroSalvar: false } : c))
        )

        try {
          const result = await salvarRegistro('trato-confinamento', {
            data: data,
            responsavel: usuario,
            usuario: usuario,
            curral: curral.curralNome,
            curralId: curral.curralId,
            numeroLote: curral.loteNome || '',
            loteId: curral.loteId || '',
            ordemTrato: String(curral.ordemTrato),
            kgPlanejado: curral.kgPlanejado !== null ? String(curral.kgPlanejado) : '',
            kgReal: curral.kgReal,
            leituraCochoNota: curral.leituraCochoNota !== null ? String(curral.leituraCochoNota) : '',
            programacaoId: programacao?.programacaoId || '',
          })

          if (!result.success) {
            todosOk = false
            setCurrais((prev) =>
              prev.map((c) =>
                c.curralId === curral.curralId ? { ...c, salvando: false, salvo: false, erroSalvar: true } : c
              )
            )
          } else {
            // Após salvar com sucesso: avança para o próximo trato do curral,
            // limpa kgReal e recalcula planejado/percentual/horário. O rascunho
            // do IndexedDB é removido em lote abaixo (limparRascunho) se todos ok.
            setCurrais((prev) =>
              prev.map((c) => {
                if (c.curralId !== curral.curralId) return c
                const novoOrdem = c.ordemTrato + 1
                const novoTratoConcluidos = novoOrdem > c.quantidadeTratos
                const novoTrato = programacao?.percentuais.find(
                  (p) => p.ordem_trato === novoOrdem
                )
                const novoPercentual = novoTrato?.percentual ?? 0
                const novoHorario = novoTrato?.horario_sugerido ?? null
                const novoKgPlanejado =
                  c.kgBaseDia !== null ? c.kgBaseDia * (novoPercentual / 100) : null
                return {
                  ...c,
                  salvando: false,
                  salvo: false,
                  rascunhoSalvo: false,
                  erroSalvar: false,
                  ordemTrato: novoOrdem,
                  tratosConcluidos: novoTratoConcluidos,
                  percentualTrato: novoPercentual,
                  horarioSugerido: novoHorario,
                  kgPlanejado: novoKgPlanejado,
                  kgReal: '',
                }
              })
            )
          }
        } catch (error) {
          console.error('Erro ao salvar trato:', error)
          todosOk = false
          setCurrais((prev) =>
            prev.map((c) =>
              c.curralId === curral.curralId ? { ...c, salvando: false, salvo: false, erroSalvar: true } : c
            )
          )
        }
      }

      // Limpar rascunho se todos salvaram
      if (todosOk && fazendaId) {
        const dataISO = brToDateISO(data)
        const rascunhoKey = `trato-rascunho-${fazendaId}-${dataISO}-${tipoSelecionado}`
        await limparRascunho(rascunhoKey)
      }

      setSalvandoFim(false)
      return todosOk
    },
    [currais, fazendaId, data, usuario, programacao, tipoSelecionado]
  )

  const handleKgRealKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, curralId: string) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        // Flush imediato do autosave do curral atual antes de avançar
        const timer = debounceTimers.current[curralId]
        if (timer) {
          clearTimeout(timer)
          delete debounceTimers.current[curralId]
        }
        const curral = currais.find((c) => c.curralId === curralId)
        if (curral && curral.kgReal !== '' && !curral.tratosConcluidos) {
          void salvarTratoRascunho(curralId, curral.kgReal)
        }
        const curraisDaLinha = currais.filter(
          (c) => !linhaSelecionada || c.linhaId === linhaSelecionada
        )
        const index = curraisDaLinha.findIndex((c) => c.curralId === curralId)
        if (index >= 0 && index < curraisDaLinha.length - 1) {
          const proximo = curraisDaLinha[index + 1]
          setCurralSelecionado(proximo.curralId)
          setTimeout(() => {
            inputRefs.current[proximo.curralId]?.focus()
          }, 150)
        }
      }
    },
    [salvarTratoRascunho, currais, linhaSelecionada]
  )

  const limparKgReais = useCallback(() => {
    setCurrais((prev) =>
      prev.map((c) => ({ ...c, kgReal: '', salvo: false, rascunhoSalvo: false, erroSalvar: false }))
    )
    if (fazendaId) {
      const dataISO = brToDateISO(data)
      const rascunhoKey = `trato-rascunho-${fazendaId}-${dataISO}-${tipoSelecionado}`
      limparRascunho(rascunhoKey)
    }
  }, [fazendaId, data, tipoSelecionado])

  // Rascunhos prontos para revisar e salvar
  const rascunhosPendentes = useMemo(
    () => currais.filter((c) => c.rascunhoSalvo && !c.salvo && !c.tratosConcluidos).length,
    [currais]
  )

  const tiposVisiveis = TIPOS_PROGRAMACAO.filter((t) => tiposDisponiveis.includes(t.value))

  return (
    <CadernetaLayout
      title="Trato Confinamento"
      cadernetaId="trato-confinamento"
      onBack={() => navigate('/modulos/cadernetas')}
    >
      {/* Seção 1: Dados Principais */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-gray-900 whitespace-nowrap">1. Dados principais</h2>
          {usuario && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-600 font-semibold bg-gray-100 rounded-full px-2.5 py-0.5 whitespace-nowrap">
              <span>👤</span>
              <span>{usuario}</span>
            </span>
          )}
        </div>
        <div className="flex justify-center">
          <DatePicker value={data} onChange={setData} compact inline />
        </div>
      </div>

      {/* Seção 2: Tratos */}
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Cabeçalho fixo da seção */}
        <div className="px-4 py-2.5 bg-[#1a3a2a] text-white">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-black tracking-tight">2. TRATOS</h2>
            {/* Seletor de tipo */}
            {tiposVisiveis.length > 1 && (
              <div className="flex items-center gap-1.5">
                {tiposVisiveis.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTipoSelecionado(t.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                      tipoSelecionado === t.value
                        ? 'bg-yellow-400 text-[#1a3a2a]'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Seletor de linha */}
          {programacao && linhas.length > 0 && !carregando && (
            <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-0.5">
              {linhas.map((linha) => (
                <button
                  key={linha.id}
                  type="button"
                  onClick={() => {
                    setLinhaSelecionada(linha.id)
                    const primeiro = currais.find((c) => c.linhaId === linha.id)
                    setCurralSelecionado(primeiro?.curralId || null)
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                    linhaSelecionada === linha.id
                      ? 'bg-white text-[#1a3a2a]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {linha.nome}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 flex flex-col gap-3">
          {!programacao ? (
            <div className="p-8 text-center text-gray-500">
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
            <div className="p-8 text-center text-gray-500">Carregando currais...</div>
          ) : erro ? (
            <div className="p-8 text-center text-red-600">{erro}</div>
          ) : currais.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum curral na programação deste tipo.
            </div>
          ) : (
            <>
              {/* Cards horizontais de currais da linha selecionada */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {currais
                  .filter((c) => !linhaSelecionada || c.linhaId === linhaSelecionada)
                  .map((curral) => (
                    <button
                      key={curral.curralId}
                      type="button"
                      onClick={() => setCurralSelecionado(curral.curralId)}
                      className={`shrink-0 rounded-xl border-2 px-3 py-1.5 transition-all text-center min-w-[3rem] ${
                        curralSelecionado === curral.curralId
                          ? curral.erroSalvar
                            ? 'border-red-500 bg-red-50'
                            : (curral.salvo || curral.rascunhoSalvo)
                              ? 'border-green-500 bg-green-50'
                              : 'border-yellow-500 bg-yellow-50'
                          : curral.erroSalvar
                            ? 'border-red-200 bg-white'
                            : (curral.salvo || curral.rascunhoSalvo)
                              ? 'border-green-200 bg-white'
                              : 'border-gray-200 bg-white'
                      }`}
                    >
                      <span className="text-sm font-bold text-gray-900 block leading-tight">
                        {curral.curralNome}
                      </span>
                    </button>
                  ))}
              </div>

              {/* Card detalhado do curral selecionado */}
              {(() => {
                const curral = currais.find((c) => c.curralId === curralSelecionado)
                if (!curral) return null
                return (
                  <div
                    id={`curral-card-${curral.curralId}`}
                    className={`rounded-2xl border-2 p-3 transition-all ${
                      curral.erroSalvar
                        ? 'border-red-300 bg-red-50'
                        : (curral.salvo || curral.rascunhoSalvo)
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-200 bg-white'
                    }`}
                  >
                    {/* Linha 1: Curral | Lote + Formulação */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="min-w-0 flex-1">
                        <span className="text-base font-bold text-gray-900 truncate block">
                          {curral.curralNome}
                        </span>
                        <span className="text-xs text-gray-500 truncate block">
                          {curral.formulacaoNome || '—'}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-base font-bold text-[#1a3a2a]">
                          {curral.loteNome || '—'}
                        </span>
                      </div>
                    </div>

                    {/* Linha 2: Cab | PV */}
                    <div className="text-sm text-gray-700 mb-1 truncate">
                      <span className="font-bold text-gray-500">Cab: </span>
                      <span className="font-bold text-gray-900 mr-2">
                        {curral.nCabecas ?? '—'}
                      </span>
                      <span className="font-bold text-gray-500">Peso: </span>
                      <span className="font-bold text-gray-900 mr-2">
                        {curral.pesoVivoKg != null
                          ? `${formatarKg(curral.pesoVivoKg, 0)} kg`
                          : '—'}
                      </span>
                    </div>
                    {curral.categorias && (
                      <div className="text-sm text-gray-700 mb-2 truncate">
                        <span className="font-bold text-gray-500">Cat: </span>
                        <span className="font-bold text-gray-900">
                          {curral.categorias
                            .split(',')
                            .map((c) => c.trim())
                            .filter(Boolean)
                            .map((c) => capitalizarIniciais(c))
                            .join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Linha 3: Trato Nº | Previsto | Real */}
                    {curral.tratosConcluidos ? (
                      <div className="border-t border-gray-100 pt-2 mt-2">
                        <div className="flex items-center justify-center gap-2 py-2 text-green-700 font-bold">
                          <Check className="w-5 h-5" />
                          <span>
                            Tratos do dia concluídos ({curral.quantidadeTratos}/{curral.quantidadeTratos})
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2 border-t border-gray-100 pt-2">
                        <div className="flex items-start gap-3 sm:gap-6 min-w-0 flex-1">
                          <div className="min-w-[3rem] sm:min-w-[4rem] flex flex-col">
                            <span className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider block leading-none mb-1">
                              Trato
                            </span>
                            <span className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                              {curral.ordemTrato}º de {curral.quantidadeTratos}
                            </span>
                            {curral.horarioSugerido && (
                              <span className="text-[0.65rem] sm:text-xs font-semibold text-blue-600 leading-tight mt-0.5">
                                {curral.horarioSugerido.slice(0, 5)}h
                              </span>
                            )}
                          </div>
                          <div className="min-w-[4rem] sm:min-w-[5rem] flex flex-col">
                            <span className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider block leading-none mb-1">
                              Previsto
                            </span>
                            <span className="text-sm sm:text-base font-bold text-[#1a3a2a] leading-tight">
                              {formatarKg(curral.kgPlanejado)} kg
                            </span>
                          </div>
                          {curral.leituraCochoNota !== null && (
                            <div className="min-w-[4rem] sm:min-w-[5rem] flex flex-col">
                              <span className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider block leading-none mb-1">
                                Leitura
                              </span>
                              <span className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                                {curral.leituraCochoNota}
                                {curral.leituraPercentualAjuste !== null && (
                                  <span
                                    className={`text-[0.65rem] sm:text-xs ml-1 ${
                                      curral.leituraPercentualAjuste > 0
                                        ? 'text-green-600'
                                        : curral.leituraPercentualAjuste < 0
                                          ? 'text-red-600'
                                          : 'text-gray-500'
                                    }`}
                                  >
                                    ({curral.leituraPercentualAjuste > 0 ? '+' : ''}
                                    {curral.leituraPercentualAjuste}%)
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 flex flex-col items-center">
                          <span className="text-[0.65rem] font-bold text-yellow-600 uppercase tracking-wider block mb-1">
                            Real (kg)
                          </span>
                          <div className="relative">
                            <input
                              ref={(el) => (inputRefs.current[curral.curralId] = el)}
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              min="0"
                              value={curral.kgReal}
                              onChange={(e) => atualizarKgReal(curral.curralId, e.target.value)}
                              onKeyDown={(e) => handleKgRealKeyDown(e, curral.curralId)}
                              placeholder="—"
                              className={`w-20 h-11 sm:w-24 sm:h-12 text-center text-lg sm:text-xl font-bold border-2 rounded-xl focus:outline-none transition-colors appearance-none cursor-text ${
                                curral.erroSalvar
                                  ? 'border-red-500 bg-red-50 text-red-700'
                                  : (curral.salvo || curral.rascunhoSalvo)
                                    ? 'border-green-500 bg-green-50 text-green-700'
                                    : 'border-yellow-500 bg-white text-gray-900 focus:border-yellow-600'
                              }`}
                            />
                            {curral.salvando && (
                              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                            )}
                            {(curral.salvo || curral.rascunhoSalvo) && !curral.salvando && (
                              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </span>
                            )}
                            {curral.erroSalvar && !curral.salvando && (
                              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                !
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}
            </>
          )}
        </div>
      </div>

      {programacao && currais.length > 0 && (
        <div className="flex flex-col gap-3 desktop-form-container">
          <button
            onClick={() => setShowRevisarModal(true)}
            disabled={rascunhosPendentes === 0}
            className={`font-bold text-base px-6 py-3 rounded-2xl border-2 transition-colors active:scale-95 ${
              rascunhosPendentes === 0
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-[#1a3a2a] text-white border-[#1a3a2a] hover:bg-[#245038]'
            }`}
          >
            {rascunhosPendentes > 0
              ? `REVISAR E SALVAR (${rascunhosPendentes})`
              : 'REVISAR E SALVAR'}
          </button>
          <button
            onClick={limparKgReais}
            className="bg-gray-200 text-gray-700 font-bold text-base px-6 py-3 rounded-2xl border-2 border-gray-300 hover:bg-gray-300 transition-colors active:scale-95"
          >
            🧹 LIMPAR TRATOS
          </button>
        </div>
      )}

      {/* Modal de Revisão */}
      {showRevisarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-[#1a3a2a] text-white">
              <h2 className="text-lg font-black">Revisar Tratos</h2>
              <p className="text-sm text-white/70 mt-0.5">
                Confira os valores antes de salvar definitivamente.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {currais.filter((c) => c.kgReal !== '' && !c.tratosConcluidos).length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Nenhum valor digitado para revisar.
                </div>
              ) : (
                currais
                  .filter((c) => c.kgReal !== '' && !c.tratosConcluidos)
                  .map((curral) => (
                    <div
                      key={curral.curralId}
                      className={`rounded-xl border-2 px-3 py-2.5 flex items-center justify-between gap-3 ${
                        curral.salvo
                          ? 'border-green-300 bg-green-50'
                          : curral.rascunhoSalvo
                            ? 'border-yellow-300 bg-yellow-50'
                            : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-sm font-bold text-gray-900 block truncate">
                          Curral {curral.curralNome}
                        </span>
                        <span className="text-xs text-gray-500 block truncate">
                          {curral.loteNome || '—'} · Trato {curral.ordemTrato}º
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-lg font-bold text-[#1a3a2a]">
                          {curral.kgReal} kg
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="p-4 flex gap-3 border-t border-gray-100">
              <button
                onClick={() => setShowRevisarModal(false)}
                disabled={salvandoFim}
                className="flex-1 font-bold text-base px-4 py-3 rounded-2xl border-2 border-gray-300 text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors active:scale-95 disabled:opacity-50"
              >
                CANCELAR
              </button>
              <button
                onClick={async () => {
                  const ok = await salvarTodosDoRascunho()
                  if (ok) {
                    setShowRevisarModal(false)
                  }
                }}
                disabled={salvandoFim || rascunhosPendentes === 0}
                className={`flex-1 font-bold text-base px-4 py-3 rounded-2xl border-2 transition-colors active:scale-95 ${
                  salvandoFim
                    ? 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed'
                    : 'bg-[#1a3a2a] text-white border-[#1a3a2a] hover:bg-[#245038]'
                }`}
              >
                {salvandoFim ? 'SALVANDO...' : 'SALVAR'}
              </button>
            </div>
          </div>
        </div>
      )}
    </CadernetaLayout>
  )
}

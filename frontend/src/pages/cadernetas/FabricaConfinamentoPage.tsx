import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import { generateId } from '../../utils/generateId'
import { saveRegistro as saveRegistroIDB, getRegistro, updateRegistro, getAllRegistros } from '../../services/indexedDB'
import { enqueueRegistro } from '../../services/syncService'
import { registerBackgroundSync } from '../../serviceWorkerRegistration'
import { getCurrentTimeInTimezone, DEFAULT_FARM_TIMEZONE } from '../../utils/formatDate'
import { normalizarNumero } from '../../utils/formatNumber'
import {
  getProgramacaoTratosCompletaCached,
  getTiposProgramacaoTratosCached,
  getRegistrosOfertaTratoByFazendaDataCached,
  getRegistrosOfertaTratoAnterioresCached,
  getCurraisCached,
  getVagoesCached,
  getLoteDetalhesComCategoriasCached,
  getRegistrosLeituraCochoByLoteCached,
  getNotasLeituraCochoConfigCached,
  getCachedCadastroData,
  loadQueryCacheFromIndexedDB,
  getFormulacaoByIdCached,
  getLoteByNomeFromCacheOnly,
  getLoteDetalhesFromCacheOnly,
  getFormulacaoByIdFromCacheOnly,
  getInsumosByFormulacaoCached,
} from '../../services/cadastroCache'
import { getLotes } from '../../services/supabaseService'
import { getSupabaseClientWithRefresh } from '../../services/supabaseClient'
import { Brush, Save, AlertCircle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react'
import { LOGO_URL } from '../../utils/constants'

interface Vagao {
  id: string
  nome: string
  marca: string
  modelo: string
  capacidade_kg: number | null
}

interface InsumoFormulacao {
  insumo_id: string
  nome: string
  teor_ms: number
  formula_teor_ms: number
  formula_mn_percent: number
  ordem: number
}

interface CurralFiltrado {
  curralId: string
  curralNome: string
  loteId: string | null
  loteNome: string | null
  formulacaoId: string | null
  formulacaoNome: string | null
  kgMnDia: number
  kgPlanejado: number | null
  kgBaseDia: number | null
  isDia1: boolean
  leituraPercentualAjuste: number | null
  totalRealDiaAnterior: number | null
}

interface RegistroFabricaExistente {
  id: string
  ordem_trato: number
  total_previsto: number
  total_produzido: number
  concluido: boolean
}

const TIPOS_PROGRAMACAO = [
  { value: 'engorda', label: 'Engorda' },
  { value: 'tip', label: 'TIP' },
  { value: 'sequestro', label: 'Sequestro' },
]

function brToDateISO(dataBR: string): string {
  const [day, month, year] = dataBR.split(' ')[0].split('/').map(Number)
  if (!day || !month || !year) return ''
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
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
 * Busca registros de fábrica já salvos no Supabase para o dia/tipo/dieta.
 */
async function getRegistrosFabricaDoDia(
  fazendaId: string,
  dataISO: string,
  tipo: string,
  formulacaoId: string
): Promise<RegistroFabricaExistente[]> {
  const client = await getSupabaseClientWithRefresh() as any
  const dataFim = new Date(dataISO + 'T00:00:00')
  dataFim.setDate(dataFim.getDate() + 1)
  const dataFimISO = dataFim.toISOString().slice(0, 10)

  const { data, error } = await client
    .from('registros_fabrica_confinamento')
    .select('id, ordem_trato, total_previsto, total_produzido, concluido')
    .eq('fazenda_id', fazendaId)
    .eq('tipo', tipo)
    .eq('formulacao_id', formulacaoId)
    .gte('data', dataISO)
    .lt('data', dataFimISO)
    .is('deleted_at', null)
    .order('ordem_trato', { ascending: true })
  if (error) throw error
  return (data || []).map((r: any) => ({
    id: r.id,
    ordem_trato: r.ordem_trato,
    total_previsto: Number(r.total_previsto) || 0,
    total_produzido: Number(r.total_produzido) || 0,
    concluido: Boolean(r.concluido),
  }))
}

export default function FabricaConfinamentoPage() {
  const navigate = useNavigate()
  const { fazendaId, usuario } = useSelector((state: RootState) => state.config)
  const [data] = useState<string>(todayBR())
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Filtros
  const [tiposDisponiveis, setTiposDisponiveis] = useState<string[]>([])
  const [tipoSelecionado, setTipoSelecionado] = useState<string>('engorda')
  const [vagoes, setVagoes] = useState<Vagao[]>([])
  const [vagaoSelecionadoId, setVagaoSelecionadoId] = useState<string>('')
  const [dietasDisponiveis, setDietasDisponiveis] = useState<{ id: string; nome: string }[]>([])
  const [dietaSelecionadaId, setDietaSelecionadaId] = useState<string>('')

  // Dados calculados
  const [curraisFiltrados, setCurraisFiltrados] = useState<CurralFiltrado[]>([])
  const [quantidadeTratos, setQuantidadeTratos] = useState<number>(0)
  const [ordemTratoAtual, setOrdemTratoAtual] = useState<number>(1)
  const [totalPrevisto, setTotalPrevisto] = useState<number>(0)
  const [jaProduzidoNoTrato, setJaProduzidoNoTrato] = useState<number>(0)
  const [registroFabricaNaoConcluidoId, setRegistroFabricaNaoConcluidoId] = useState<string | null>(null)
  const [todosCurraisTratadosNoTratoAnterior, setTodosCurraisTratadosNoTratoAnterior] = useState<boolean>(true)
  const [todosTratosConcluidos, setTodosTratosConcluidos] = useState<boolean>(false)
  const [insumos, setInsumos] = useState<InsumoFormulacao[]>([])
  const [totalProduzido, setTotalProduzido] = useState<string>('')
  const [kgProduzidoPorInsumo, setKgProduzidoPorInsumo] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  // Carregamento inicial: tipos, vagoes
  useEffect(() => {
    async function carregarInicial() {
      if (!fazendaId) return
      try {
        await loadQueryCacheFromIndexedDB()
        const [tiposData, vagoesData] = await Promise.all([
          getTiposProgramacaoTratosCached(fazendaId),
          getVagoesCached(fazendaId),
        ])
        const tipos = (tiposData || []).filter((t: string) =>
          TIPOS_PROGRAMACAO.some((tp) => tp.value === t)
        )
        setTiposDisponiveis(tipos.length > 0 ? tipos : ['engorda'])
        if (tipos.length > 0 && !tipos.includes('engorda')) {
          setTipoSelecionado(tipos[0])
        }
        setVagoes(vagoesData)
        if (vagoesData.length > 0) {
          setVagaoSelecionadoId(vagoesData[0].id)
        }
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error)
        setErro('Erro ao carregar configuração. Tente novamente.')
      }
    }
    carregarInicial()
  }, [fazendaId])

  // Carregar dietas disponíveis (formulações usadas por lotes de confinamento)
  const carregarDietas = useCallback(async () => {
    if (!fazendaId) return
    try {
      await loadQueryCacheFromIndexedDB()
      // Buscar lotes com sistema_producao = 'Confinamento'
      let lotesData: any[] | null = null
      let usedFallback = false
      if (navigator.onLine) {
        try {
          // Timeout rápido: se a rede não responder em 3s, usa cache
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 3000)
          )
          const allLotes = await Promise.race([
            getLotes(fazendaId),
            timeoutPromise,
          ])
          lotesData = (allLotes || []).filter((l: any) => l.sistema_producao === 'Confinamento')
        } catch {
          lotesData = null
        }
      }
      if (!lotesData || lotesData.length === 0) {
        // Fallback offline: buscar lotes no cache e filtrar (sem tentar online)
        usedFallback = true
        const cache = await getCachedCadastroData()
        if (cache && cache.lotes && cache.lotes.length > 0) {
          const lotesFromCache = await Promise.all(
            cache.lotes.map((nome: string) => getLoteByNomeFromCacheOnly(fazendaId, nome))
          )
          lotesData = lotesFromCache.filter((l: any) => l !== null && l.sistema_producao === 'Confinamento')
        }
      }

      if (!lotesData || lotesData.length === 0) {
        setDietasDisponiveis([])
        return
      }

      // Para cada lote, buscar formulação ativa em lote_categorias
      const formulacoesMap = new Map<string, string>() // id -> nome
      for (const lote of lotesData) {
        try {
          // Se getLotes falhou (fallback), usar cache-only para detalhes também
          const detalhes = usedFallback
            ? await getLoteDetalhesFromCacheOnly(lote.id)
            : await getLoteDetalhesComCategoriasCached(lote.id)
          if (detalhes && Array.isArray(detalhes.categorias_raw)) {
            for (const cat of detalhes.categorias_raw) {
              const formId = (cat as any).formulacao_id
              const formNome = (cat as any).formulacao_nome
              if (formId && !formulacoesMap.has(formId)) {
                if (formNome) {
                  formulacoesMap.set(formId, formNome)
                } else {
                  try {
                    const form = usedFallback
                      ? await getFormulacaoByIdFromCacheOnly(fazendaId, formId)
                      : await getFormulacaoByIdCached(fazendaId, formId)
                    if (form?.nome) formulacoesMap.set(formId, form.nome)
                  } catch {
                    // ignorar
                  }
                }
              }
            }
          }
        } catch {
          // ignorar
        }
      }

      const dietas = Array.from(formulacoesMap.entries())
        .map(([id, nome]) => ({ id, nome }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      setDietasDisponiveis(dietas)
      if (dietas.length > 0 && !dietas.find((d) => d.id === dietaSelecionadaId)) {
        setDietaSelecionadaId(dietas[0].id)
      }
    } catch (error) {
      console.error('Erro ao carregar dietas:', error)
      setDietasDisponiveis([])
    }
  }, [fazendaId, dietaSelecionadaId])

  useEffect(() => {
    carregarDietas()
  }, [carregarDietas])

  // Carregamento principal: currais filtrados, trato atual, total previsto, insumos
  const carregarDados = useCallback(async () => {
    if (!fazendaId || !tipoSelecionado || !dietaSelecionadaId) {
      setCurraisFiltrados([])
      setTotalPrevisto(0)
      setInsumos([])
      setCarregando(false)
      return
    }
    setCarregando(true)
    setErro(null)
    try {
      const dataISO = brToDateISO(data)
      if (!dataISO) {
        setErro('Data inválida.')
        setCarregando(false)
        return
      }

      // Buscar programação completa, currais, registros do dia, notas config
      const [progCompleta, curraisData, registrosDoDia, notasConfigData] = await Promise.all([
        getProgramacaoTratosCompletaCached(fazendaId, tipoSelecionado),
        getCurraisCached(fazendaId),
        getRegistrosOfertaTratoByFazendaDataCached(fazendaId, dataISO),
        getNotasLeituraCochoConfigCached(fazendaId),
      ])

      if (!progCompleta || !progCompleta.programacao) {
        setCurraisFiltrados([])
        setTotalPrevisto(0)
        setQuantidadeTratos(0)
        setCarregando(false)
        return
      }

      const qtdTratos = progCompleta.programacao.quantidade_tratos
      setQuantidadeTratos(qtdTratos)

      // Mapa de kg_mn_dia por curral
      const kgMnDiaPorCurral = new Map<string, number>()
      const curraisIdsDaProgramacao = new Set<string>()
      for (const c of progCompleta.currais) {
        kgMnDiaPorCurral.set(c.curral_id, Number(c.kg_mn_dia) || 0)
        curraisIdsDaProgramacao.add(c.curral_id)
      }

      // Mapa de currais por id
      const curraisPorId = new Map<string, any>()
      for (const c of curraisData || []) {
        if (c.id && c.lote_id) {
          curraisPorId.set(c.id, c)
        }
      }

      // Notas config map
      const notasConfigMap = new Map<string, number>()
      for (const n of notasConfigData || []) {
        notasConfigMap.set(n.id, Number(n.percentual_ajuste) || 0)
      }

      // Agrupa registros do dia por curral_id
      const registrosPorCurral = new Map<string, any[]>()
      for (const r of registrosDoDia) {
        const arr = registrosPorCurral.get(r.curral_id) || []
        arr.push(r)
        registrosPorCurral.set(r.curral_id, arr)
      }

      // Para cada curral da programação, verificar se o lote usa a dieta selecionada
      const curraisDaDieta: CurralFiltrado[] = []
      for (const curralId of curraisIdsDaProgramacao) {
        const curralInfo = curraisPorId.get(curralId)
        if (!curralInfo) continue
        const loteId = curralInfo.lote_id

        // Buscar formulação do lote
        let formulacaoId: string | null = null
        let formulacaoNome: string | null = null
        try {
          const detalhes = await getLoteDetalhesComCategoriasCached(loteId)
          if (detalhes && Array.isArray(detalhes.categorias_raw)) {
            for (const cat of detalhes.categorias_raw) {
              const fid = (cat as any).formulacao_id
              if (fid) {
                formulacaoId = fid
                formulacaoNome = (cat as any).formulacao_nome || null
                break
              }
            }
          }
        } catch {
          // ignorar
        }

        // Só incluir currais cujo lote usa a dieta selecionada
        if (formulacaoId !== dietaSelecionadaId) continue

        // Buscar nome da formulação se não veio
        if (!formulacaoNome && formulacaoId) {
          try {
            const form = await getFormulacaoByIdCached(fazendaId, formulacaoId)
            formulacaoNome = form?.nome || null
          } catch {
            // ignorar
          }
        }

        // Buscar leitura de cocho do lote para pegar percentual_ajuste
        let leituraPercentualAjuste: number | null = null
        try {
          const leituras = await getRegistrosLeituraCochoByLoteCached(fazendaId, loteId)
          const leitOrdenadas = [...(leituras || [])].sort(
            (a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()
          )
          const ultimaLeitura = leitOrdenadas[0]
          if (ultimaLeitura?.nota_config_id) {
            leituraPercentualAjuste = notasConfigMap.get(ultimaLeitura.nota_config_id) ?? null
          }
        } catch {
          // ignorar
        }

        // Verificar se é dia 1
        const registrosAnteriores = await getRegistrosOfertaTratoAnterioresCached(
          fazendaId,
          curralId,
          dataISO
        )
        const isDia1 = registrosAnteriores.length === 0

        // Calcular total real do dia anterior (soma de todos os tratos do dia mais recente)
        let totalRealDiaAnterior: number | null = null
        if (!isDia1 && registrosAnteriores.length > 0) {
          // Agrupar por data (dia), pegar o dia mais recente
          const dataAnteriorMaisRecente = (registrosAnteriores[0].data || '').slice(0, 10)
          const tratosDiaAnterior = registrosAnteriores.filter(
            (r: any) => (r.data || '').slice(0, 10) === dataAnteriorMaisRecente
          )
          totalRealDiaAnterior = tratosDiaAnterior.reduce(
            (sum: number, r: any) => sum + (Number(r.kg_ofertado_real) || 0),
            0
          )
        }

        // Calcular kgBaseDia
        const kgMnDia = kgMnDiaPorCurral.get(curralId) || 0
        let kgBaseDia: number | null = null
        if (isDia1) {
          kgBaseDia = kgMnDia
        } else if (totalRealDiaAnterior !== null && totalRealDiaAnterior > 0) {
          const fatorAjuste = leituraPercentualAjuste !== null ? 1 + leituraPercentualAjuste / 100 : 1
          kgBaseDia = totalRealDiaAnterior * fatorAjuste
        }

        curraisDaDieta.push({
          curralId,
          curralNome: curralInfo.nome || curralId,
          loteId,
          loteNome: curralInfo.lote_nome || null,
          formulacaoId,
          formulacaoNome,
          kgMnDia,
          kgPlanejado: null, // calculado depois por trato
          kgBaseDia,
          isDia1,
          leituraPercentualAjuste,
          totalRealDiaAnterior,
        })
      }

      setCurraisFiltrados(curraisDaDieta)

      // Determinar trato atual: maior ordem_trato com registro + 1, limitado a qtdTratos
      let maxOrdemFeita = 0
      for (const curral of curraisDaDieta) {
        const tratosDoDia = registrosPorCurral.get(curral.curralId) || []
        const tratosFeitos = tratosDoDia.filter((t) => t.kg_ofertado_real !== null).length
        if (tratosFeitos > maxOrdemFeita) maxOrdemFeita = tratosFeitos
      }
      let ordemAtual = Math.min(maxOrdemFeita + 1, qtdTratos)

      // Buscar registros de fábrica do dia (pular se offline, usa Supabase direto)
      let registrosFabrica: RegistroFabricaExistente[] = []
      if (navigator.onLine) {
        try {
          registrosFabrica = await getRegistrosFabricaDoDia(fazendaId, dataISO, tipoSelecionado, dietaSelecionadaId)
        } catch {
          // offline ou erro, seguir sem registros de fábrica
        }
      } else {
        // Offline: buscar registros locais no IndexedDB
        try {
          const registrosLocais = await getAllRegistros('fabrica-confinamento')
          const dataISOComp = dataISO
          registrosFabrica = (registrosLocais as any[])
            .filter((r) => {
              const rData = (r.data || '').slice(0, 10)
              return rData === dataISOComp && r.tipo === tipoSelecionado && r.formulacaoId === dietaSelecionadaId
            })
            .map((r) => ({
              id: r.supabaseId || r.id,
              ordem_trato: r.ordemTrato,
              total_previsto: Number(r.totalPrevisto) || 0,
              total_produzido: Number(r.totalProduzido) || 0,
              concluido: r.concluido === true || r.concluido === 'true',
            }))
            .sort((a, b) => a.ordem_trato - b.ordem_trato)
        } catch {
          // ignorar
        }
      }

      // Se há registros de fábrica com total_produzido < total_previsto, o trato atual é esse
      const tratoNaoConcluido = registrosFabrica.find((r) => !r.concluido)
      if (tratoNaoConcluido) {
        ordemAtual = tratoNaoConcluido.ordem_trato
        // Buscar o registro local no IndexedDB pelo supabaseId para obter o ID local
        const registrosLocais = await getAllRegistros('fabrica-confinamento')
        const registroLocal = registrosLocais.find((r: any) => r.supabaseId === tratoNaoConcluido.id)
        setRegistroFabricaNaoConcluidoId(registroLocal ? registroLocal.id : null)
      } else {
        setRegistroFabricaNaoConcluidoId(null)
      }

      // Verificar se todos os tratos do dia foram concluídos
      const todosConcluidos = maxOrdemFeita >= qtdTratos && !tratoNaoConcluido
      setTodosTratosConcluidos(todosConcluidos)

      setOrdemTratoAtual(ordemAtual)

      // Verificar se todos os currais foram tratados no trato anterior (para liberar o atual)
      if (ordemAtual > 1) {
        const todosTratados = curraisDaDieta.every((curral) => {
          const tratosDoDia = registrosPorCurral.get(curral.curralId) || []
          const tratosFeitos = tratosDoDia.filter((t) => t.kg_ofertado_real !== null).length
          return tratosFeitos >= ordemAtual - 1
        })
        setTodosCurraisTratadosNoTratoAnterior(todosTratados)
      } else {
        setTodosCurraisTratadosNoTratoAnterior(true)
      }

      // Calcular kgPlanejado de cada curral para o trato atual
      const percentuais = progCompleta.percentuais
      const tratoAtual = percentuais.find((p: any) => p.ordem_trato === ordemAtual)
      const percentualTrato = tratoAtual ? Number(tratoAtual.percentual) : 0

      let somaPrevisto = 0
      for (const curral of curraisDaDieta) {
        if (curral.kgBaseDia !== null) {
          curral.kgPlanejado = curral.kgBaseDia * (percentualTrato / 100)
        }
      }

      // Se for o último trato, compensar: previsto = total_do_dia - soma_dos_tratos_anteriores
      const isUltimoTrato = ordemAtual === qtdTratos
      if (isUltimoTrato && !isDia1ParaTodos(curraisDaDieta)) {
        // Calcular total do dia para cada curral e subtrair o já distribuído nos tratos anteriores
        for (const curral of curraisDaDieta) {
          if (curral.kgBaseDia !== null) {
            const totalDiaCurral = curral.kgBaseDia
            const tratosDoDia = registrosPorCurral.get(curral.curralId) || []
            const jaDistribuido = tratosDoDia
              .filter((t) => t.kg_ofertado_real !== null && Number(t.ordem_trato) < ordemAtual)
              .reduce((sum: number, t: any) => sum + (Number(t.kg_ofertado_real) || 0), 0)
            curral.kgPlanejado = Math.max(0, totalDiaCurral - jaDistribuido)
          }
        }
      }

      // Somar previsto de todos os currais
      somaPrevisto = curraisDaDieta.reduce((sum, c) => sum + (c.kgPlanejado || 0), 0)

      // Se há registro de fábrica não concluído, subtrair o já produzido
      if (tratoNaoConcluido) {
        setJaProduzidoNoTrato(Number(tratoNaoConcluido.total_produzido) || 0)
        // O total previsto já é o do trato, mas o que falta é previsto - já produzido
        // Mostrar o previsto original e o já produzido separadamente
      } else {
        setJaProduzidoNoTrato(0)
      }

      setTotalPrevisto(somaPrevisto)

      // Carregar insumos da formulação (com fallback para cache offline)
      let insumosData: InsumoFormulacao[] = []
      try {
        insumosData = await getInsumosByFormulacaoCached(dietaSelecionadaId)
      } catch {
        // erro de rede, seguir com insumos vazios
      }
      setInsumos(insumosData)

      // Resetar campos de produção
      setTotalProduzido('')
      setKgProduzidoPorInsumo({})
      setSucesso(false)
    } catch (error) {
      console.error('Erro ao carregar dados da fábrica:', error)
      setErro('Erro ao carregar dados. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }, [fazendaId, data, tipoSelecionado, dietaSelecionadaId])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Auto-recarregar quando voltar online (leitura de cocho pode ter chegado)
  useEffect(() => {
    const handleOnline = () => {
      carregarDados()
    }
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [carregarDados])

  // Capacidade do vagão selecionado
  const vagaoSelecionado = useMemo(
    () => vagoes.find((v) => v.id === vagaoSelecionadoId),
    [vagoes, vagaoSelecionadoId]
  )

  // Total produzido numérico
  const totalProduzidoNum = useMemo(() => {
    return normalizarNumero(totalProduzido) ?? 0
  }, [totalProduzido])

  const tratoNaoConcluidoJaIniciado = jaProduzidoNoTrato > 0

  // Faltam kg para completar o trato
  const faltamKg = useMemo(() => {
    const previsto = tratoNaoConcluidoJaIniciado
      ? totalPrevisto - jaProduzidoNoTrato
      : totalPrevisto
    return Math.max(0, previsto - totalProduzidoNum)
  }, [totalPrevisto, totalProduzidoNum, jaProduzidoNoTrato, tratoNaoConcluidoJaIniciado])

  // kg previsto por insumo (read-only, calculado sobre o total produzido)
  const kgPrevistoPorInsumo = useMemo(() => {
    const result: Record<string, number> = {}
    for (const insumo of insumos) {
      result[insumo.insumo_id] = (insumo.formula_mn_percent / 100) * totalProduzidoNum
    }
    return result
  }, [insumos, totalProduzidoNum])

  // Excede capacidade do vagão?
  const excedeCapacidade = useMemo(() => {
    if (!vagaoSelecionado?.capacidade_kg) return false
    return totalProduzidoNum > vagaoSelecionado.capacidade_kg
  }, [vagaoSelecionado, totalProduzidoNum])

  // Pode salvar?
  const podeSalvar = useMemo(() => {
    if (carregando || salvando) return false
    if (!dietaSelecionadaId || !vagaoSelecionadoId) return false
    if (totalProduzidoNum <= 0) return false
    if (excedeCapacidade) return false
    if (!todosCurraisTratadosNoTratoAnterior) return false
    if (todosTratosConcluidos) return false
    return true
  }, [carregando, salvando, dietaSelecionadaId, vagaoSelecionadoId, totalProduzidoNum, excedeCapacidade, todosCurraisTratadosNoTratoAnterior, todosTratosConcluidos])

  const handleTotalProduzidoChange = useCallback((valor: string) => {
    const sanitizado = valor.replace(/[^0-9.,]/g, '')
    setTotalProduzido(sanitizado)
  }, [])

  const handleKgInsumoChange = useCallback((insumoId: string, valor: string) => {
    const sanitizado = valor.replace(/[^0-9.,]/g, '')
    setKgProduzidoPorInsumo((prev) => ({ ...prev, [insumoId]: sanitizado }))
  }, [])

  const handleSalvar = useCallback(async () => {
    if (!fazendaId || !podeSalvar) return
    setSalvando(true)
    setSucesso(false)
    try {
      const novoTotalProduzido = jaProduzidoNoTrato + totalProduzidoNum
      const concluido = novoTotalProduzido >= (totalPrevisto - 0.5)

      let registroId: string

      if (registroFabricaNaoConcluidoId) {
        // Atualizar registro existente (produção parcial complementar)
        const registroExistente = await getRegistro('fabrica-confinamento', registroFabricaNaoConcluidoId)
        if (!registroExistente) {
          setErro('Registro de produção parcial não encontrado. Tente novamente.')
          setSalvando(false)
          return
        }
        await updateRegistro('fabrica-confinamento', registroFabricaNaoConcluidoId, {
          totalProduzido: String(novoTotalProduzido),
          concluido: String(concluido),
          syncStatus: 'pending',
        })
        await enqueueRegistro('fabrica-confinamento', registroFabricaNaoConcluidoId, 'update')
        registroId = registroFabricaNaoConcluidoId
      } else {
        // Criar novo registro master
        const dietaNome = dietasDisponiveis.find((d) => d.id === dietaSelecionadaId)?.nome || ''
        const result = await salvarRegistro('fabrica-confinamento', {
          data: data,
          responsavel: usuario,
          usuario: usuario,
          tipo: tipoSelecionado,
          formulacaoId: dietaSelecionadaId,
          formulacaoNome: dietaNome,
          vagaoId: vagaoSelecionadoId,
          vagaoNome: vagaoSelecionado?.nome || '',
          ordemTrato: String(ordemTratoAtual),
          totalPrevisto: String(totalPrevisto),
          totalProduzido: String(totalProduzidoNum),
          concluido: String(concluido),
        })

        if (!result.success || !result.registro) {
          setErro('Erro ao salvar produção. Tente novamente.')
          setSalvando(false)
          return
        }
        registroId = result.registro.id
      }

      // Data com hora para os insumos (salvos direto no IndexedDB, sem passar por salvarRegistro)
      const timezone = DEFAULT_FARM_TIMEZONE
      const horaAtual = getCurrentTimeInTimezone(timezone)
      const dataComHoraInsumos = `${data} ${horaAtual.slice(0, 5)}`

      // Buscar o supabaseId do registro master para usar nos insumos
      const registroMaster = await getRegistro('fabrica-confinamento', registroId)
      const insumoRegistroId = registroMaster?.supabaseId || registroId

      // Salvar insumos como registros separados no IndexedDB + enfileirar sync
      for (const insumo of insumos) {
        const kgPrev = kgPrevistoPorInsumo[insumo.insumo_id] || 0
        const kgProdStr = kgProduzidoPorInsumo[insumo.insumo_id] || ''
        const kgProd = kgProdStr ? (normalizarNumero(kgProdStr) ?? 0) : 0

        const insumoRegistro = {
          id: generateId(),
          data: dataComHoraInsumos,
          usuario,
          registroId: insumoRegistroId,
          insumoId: insumo.insumo_id,
          kgPrevisto: kgPrev,
          kgProduzido: kgProd,
          ordem: insumo.ordem,
          version: 1,
          lastModified: new Date().toISOString(),
          syncStatus: 'pending' as const,
        }
        await saveRegistroIDB('fabrica-confinamento-insumos', insumoRegistro)
        await enqueueRegistro('fabrica-confinamento-insumos', insumoRegistro.id, 'create')
      }

      registerBackgroundSync('sync-registros').catch(() => {})

      setSucesso(true)
      setTotalProduzido('')
      setKgProduzidoPorInsumo({})

      // Recarregar dados para refletir o novo estado
      setTimeout(() => {
        carregarDados()
      }, 500)
    } catch (error) {
      console.error('Erro ao salvar produção:', error)
      setErro('Erro ao salvar produção. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }, [fazendaId, podeSalvar, data, usuario, tipoSelecionado, dietaSelecionadaId, vagaoSelecionadoId, ordemTratoAtual, totalPrevisto, totalProduzidoNum, jaProduzidoNoTrato, registroFabricaNaoConcluidoId, insumos, kgPrevistoPorInsumo, kgProduzidoPorInsumo, carregarDados])

  const handleLimpar = useCallback(() => {
    setTotalProduzido('')
    setKgProduzidoPorInsumo({})
    setSucesso(false)
    setErro(null)
  }, [])

  const tiposVisiveis = TIPOS_PROGRAMACAO.filter((t) => tiposDisponiveis.includes(t.value))

  const bottomContent = (
    <div className="flex gap-2 pb-3">
      <button
        onClick={handleSalvar}
        disabled={!podeSalvar}
        className={`flex-1 !min-h-0 rounded-2xl border-2 px-3 py-3 text-sm font-bold transition-colors active:scale-[0.99] ${
          !podeSalvar
            ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
            : 'border-[#1a3a2a] bg-[#1a3a2a] text-white hover:bg-[#245038]'
        }`}
      >
        <span className="inline-flex items-center justify-center gap-2">
          {salvando ? (
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.5} />
          ) : (
            <Save className="h-4 w-4" strokeWidth={2.5} />
          )}
          SALVAR
        </span>
      </button>
      <button
        onClick={handleLimpar}
        className="!min-h-0 rounded-2xl border-2 border-gray-300 bg-gray-200 px-3 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-300 active:scale-95"
      >
        <span className="inline-flex items-center justify-center gap-2">
          <Brush className="h-4 w-4" strokeWidth={2.5} />
          LIMPAR
        </span>
      </button>
    </div>
  )

  return (
    <CadernetaLayout
      title="Fábrica Confinamento"
      cadernetaId="fabrica-confinamento"
      onBack={() => navigate('/modulos/cadernetas')}
      showLogos={false}
      leftContent={
        <img
          src={LOGO_URL}
          alt="GestaUp"
          className="h-11 w-11 shrink-0 rounded-xl object-contain shadow-lg shadow-black/10"
        />
      }
      titleRowRightContent={
        <button
          onClick={() => carregarDados()}
          disabled={carregando}
          className="flex h-10 !min-h-0 !min-w-0 items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-semibold transition-colors hover:bg-white/20 active:bg-white/25 disabled:opacity-50"
          aria-label="Atualizar"
        >
          <RefreshCw className={`h-5 w-5 ${carregando ? 'animate-spin' : ''}`} strokeWidth={2.3} />
        </button>
      }
      bottomContent={bottomContent}
    >
      <div className="translate-y-10 bg-white rounded-3xl shadow-lg border border-gray-100 overflow-visible">
        <div className="p-3 flex flex-col gap-4">
          {/* Filtros */}
          {tiposVisiveis.length > 1 && (
            <div>
              <span className="mb-1 block text-sm font-black uppercase tracking-wider text-gray-500">
                Sistema de Produção
              </span>
              <div className="flex items-center gap-1.5">
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
            </div>
          )}

          {/* Dieta */}
          <div>
            <span className="mb-1 block text-sm font-black uppercase tracking-wider text-gray-500">
              Dieta
            </span>
            {dietasDisponiveis.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhuma dieta encontrada para lotes de confinamento.
              </p>
            ) : (
              <select
                value={dietaSelecionadaId}
                onChange={(e) => setDietaSelecionadaId(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-3 text-sm font-bold text-gray-900 focus:border-[#1a3a2a] focus:outline-none"
              >
                {dietasDisponiveis.map((d) => (
                  <option key={d.id} value={d.id}>
                    {capitalizarIniciais(d.nome)}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Vagão */}
          <div>
            <span className="mb-1 block text-sm font-black uppercase tracking-wider text-gray-500">
              Vagão TMR
            </span>
            {vagoes.length === 0 ? (
              <p className="text-sm text-gray-500">
                Nenhum vagão cadastrado. Cadastre no painel web.
              </p>
            ) : (
              <select
                value={vagaoSelecionadoId}
                onChange={(e) => setVagaoSelecionadoId(e.target.value)}
                className="w-full rounded-xl border-2 border-gray-200 bg-white px-3 py-3 text-sm font-bold text-gray-900 focus:border-[#1a3a2a] focus:outline-none"
              >
                {vagoes.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome} {v.capacidade_kg ? `(${formatarKg(v.capacidade_kg, 0)} kg)` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Conteúdo principal */}
          {carregando ? (
            <div className="p-8 text-center text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Carregando...
            </div>
          ) : erro ? (
            <div className="p-6 text-center text-red-600">
              <AlertCircle className="h-6 w-6 mx-auto mb-2" />
              {erro}
            </div>
          ) : !dietaSelecionadaId ? (
            <div className="p-8 text-center text-gray-500">
              Selecione uma dieta para continuar.
            </div>
          ) : curraisFiltrados.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum curral encontrado para esta dieta e sistema de produção.
            </div>
          ) : (
            <>
              {/* Informativo do trato atual */}
              <div className="rounded-2xl bg-[#e8f1ec] border border-[#1a3a2a]/20 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-black uppercase tracking-wider text-[#1a3a2a]/60">
                      Trato Atual
                    </span>
                    <span className="text-2xl font-black text-[#1a3a2a]">
                      {ordemTratoAtual} <span className="text-base font-bold text-[#1a3a2a]/60">de {quantidadeTratos}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-xs font-black uppercase tracking-wider text-[#1a3a2a]/60">
                      Currais
                    </span>
                    <span className="text-2xl font-black text-[#1a3a2a]">
                      {curraisFiltrados.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Aviso: todos os tratos do dia foram concluídos */}
              {todosTratosConcluidos && (
                <div className="rounded-xl bg-green-50 border border-green-200 p-3 flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-sm font-bold text-green-800">
                    Todos os {quantidadeTratos} tratos do dia foram concluídos. Nenhuma produção pendente.
                  </p>
                </div>
              )}

              {/* Aviso: trato anterior não concluído em todos os currais */}
              {!todosCurraisTratadosNoTratoAnterior && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm font-bold text-amber-800">
                    Trato {ordemTratoAtual - 1} ainda não foi registrado em todos os currais.
                    Conclua a distribuição no Trato Confinamento antes de fabricar o próximo.
                  </p>
                </div>
              )}

              {/* Aviso: trato atual com produção parcial não concluída */}
              {tratoNaoConcluidoJaIniciado && faltamKg > 0 && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-sm font-bold text-blue-800">
                    Trato {ordemTratoAtual} em aberto. Faltam produzir {formatarKg(faltamKg, 1)} kg para avançar ao próximo trato.
                  </p>
                </div>
              )}

              {/* Sucesso */}
              {sucesso && (
                <div className="rounded-xl bg-green-50 border border-green-200 p-3 flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-sm font-bold text-green-800">
                    Produção salva com sucesso!
                  </p>
                </div>
              )}

              {/* Total Previsto */}
              <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black uppercase tracking-wider text-gray-500">
                    Total Previsto
                  </span>
                  <span className="text-xl font-black text-gray-900">
                    {formatarKg(totalPrevisto, 1)} kg
                  </span>
                </div>
                {tratoNaoConcluidoJaIniciado && (
                  <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2">
                    <span className="text-xs font-bold text-gray-500">
                      Já produzido neste trato
                    </span>
                    <span className="text-sm font-bold text-green-700">
                      {formatarKg(jaProduzidoNoTrato, 1)} kg
                    </span>
                  </div>
                )}
                {tratoNaoConcluidoJaIniciado && faltamKg > 0 && (
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-700">
                      Faltam produzir
                    </span>
                    <span className="text-sm font-black text-amber-700">
                      {formatarKg(faltamKg, 1)} kg
                    </span>
                  </div>
                )}
              </div>

              {/* Total Produzido */}
              <div>
                <span className="mb-1 block text-sm font-black uppercase tracking-wider text-gray-500">
                  Total Produzido (kg)
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={totalProduzido}
                  onChange={(e) => handleTotalProduzidoChange(e.target.value)}
                  placeholder="0"
                  className={`w-full rounded-xl border-2 px-4 py-3 text-lg font-black text-gray-900 focus:outline-none ${
                    excedeCapacidade
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 bg-white focus:border-[#1a3a2a]'
                  }`}
                />
                {excedeCapacidade && (
                  <p className="mt-1 text-xs font-bold text-red-600">
                    Excede a capacidade do vagão ({formatarKg(vagaoSelecionado?.capacidade_kg || 0, 0)} kg)
                  </p>
                )}
                {vagaoSelecionado?.capacidade_kg && !excedeCapacidade && (
                  <p className="mt-1 text-xs font-bold text-gray-400">
                    Capacidade do vagão: {formatarKg(vagaoSelecionado.capacidade_kg, 0)} kg
                  </p>
                )}
              </div>

              {/* Tabela de insumos */}
              {insumos.length > 0 && (
                <div>
                  <span className="mb-2 block text-sm font-black uppercase tracking-wider text-gray-500">
                    Insumos da Dieta
                  </span>
                  <div className="overflow-hidden rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left p-2 font-bold text-gray-700">Insumo</th>
                          <th className="text-center p-2 font-bold text-gray-700">% MN</th>
                          <th className="text-center p-2 font-bold text-gray-700">Previsto</th>
                          <th className="text-center p-2 font-bold text-gray-700">Produzido</th>
                        </tr>
                      </thead>
                      <tbody>
                        {insumos.map((insumo) => {
                          const kgPrev = kgPrevistoPorInsumo[insumo.insumo_id] || 0
                          return (
                            <tr key={insumo.insumo_id} className="border-b border-gray-100 last:border-0">
                              <td className="p-2 font-bold text-gray-900">
                                {capitalizarIniciais(insumo.nome)}
                              </td>
                              <td className="p-2 text-center text-gray-600">
                                {insumo.formula_mn_percent.toFixed(2).replace('.', ',')}%
                              </td>
                              <td className="p-2 text-center font-bold text-gray-700">
                                {formatarKg(kgPrev, 1)}
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={kgProduzidoPorInsumo[insumo.insumo_id] || ''}
                                  onChange={(e) => handleKgInsumoChange(insumo.insumo_id, e.target.value)}
                                  placeholder="0"
                                  className="w-20 rounded-lg border border-gray-200 px-2 py-1 text-center font-bold text-gray-900 focus:border-[#1a3a2a] focus:outline-none"
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </CadernetaLayout>
  )
}

/**
 * Verifica se todos os currais estão no dia 1.
 */
function isDia1ParaTodos(currais: CurralFiltrado[]): boolean {
  return currais.every((c) => c.isDia1)
}

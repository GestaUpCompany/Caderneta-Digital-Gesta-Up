import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import ChoiceGrid from '../../components/cadernetas/ChoiceGrid'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import { usePhotoGps } from '../../hooks/usePhotoGps'
import { base64ToDataUrl } from '../../utils/photoCompress'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import { generateId } from '../../utils/generateId'
import { saveRegistro as saveRegistroIDB, getRegistro, updateRegistro, getAllRegistros, salvarRascunho, lerRascunho, limparRascunho } from '../../services/indexedDB'
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
  getOcupacoesCurralNaDataCached,
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
  tipo: string | null
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
  kgMnDia: number | null
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
  { value: 'confinamento', label: 'Confinamento' },
  { value: 'tip', label: 'TIP' },
  { value: 'sequestro', label: 'Sequestro' },
]

// Sistema de produção do lote correspondente a cada tipo de programação.
const SISTEMA_POR_TIPO: Record<string, string> = {
  confinamento: 'Confinamento',
  sequestro: 'Sequestro',
  tip: 'TIP',
}

function brToDateISO(dataBR: string): string {
  const [day, month, year] = dataBR.split(' ')[0].split('/').map(Number)
  if (!day || !month || !year) return ''
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function sanitizarDecimalComVirgula(valor: string): string {
  const semCaracteresInvalidos = valor.replace(/[^0-9,]/g, '')
  const [inteiro, ...decimais] = semCaracteresInvalidos.split(',')
  return decimais.length > 0 ? `${inteiro},${decimais.join('')}` : inteiro
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
  const [tipoSelecionado, setTipoSelecionado] = useState<string>('confinamento')
  const [vagoes, setVagoes] = useState<Vagao[]>([])
  const [vagaoSelecionadoId, setVagaoSelecionadoId] = useState<string>('')
  const [dietasDisponiveis, setDietasDisponiveis] = useState<{ id: string; nome: string }[]>([])
  const [dietaSelecionadaId, setDietaSelecionadaId] = useState<string>('')

  // Dados calculados
  const [curraisFiltrados, setCurraisFiltrados] = useState<CurralFiltrado[]>([])
  const [quantidadeTratos, setQuantidadeTratos] = useState<number>(0)
  const [percentuaisTratos, setPercentuaisTratos] = useState<{ ordem_trato: number; percentual: number }[]>([])
  const [ordemTratoAtual, setOrdemTratoAtual] = useState<number>(1)
  const [totalPrevisto, setTotalPrevisto] = useState<number>(0)
  const [jaProduzidoNoTrato, setJaProduzidoNoTrato] = useState<number>(0)
  const [registroFabricaNaoConcluidoId, setRegistroFabricaNaoConcluidoId] = useState<string | null>(null)
  const [todosTratosConcluidos, setTodosTratosConcluidos] = useState<boolean>(false)
  const [insumos, setInsumos] = useState<InsumoFormulacao[]>([])
  // Leitura acumulada da balança do vagão depois de cada insumo (valor digitado, vírgula decimal)
  const [leituraPorInsumo, setLeituraPorInsumo] = useState<Record<string, string>>({})
  const [leituraDigitada, setLeituraDigitada] = useState('')
  const [ativoId, setAtivoId] = useState<string | null>(null)
  const [erroLeitura, setErroLeitura] = useState<string | null>(null)
  const {
    fotoBase64: fotoBalanca,
    capturandoFoto,
    fotoErro,
    capturarFoto,
    limpar: limparFoto,
    fotoInputRef,
    handleFileInputChange,
  } = usePhotoGps({ comGps: false })
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [sucessoMsg, setSucessoMsg] = useState('Produção salva com sucesso!')
  const [rascunhoSalvo, setRascunhoSalvo] = useState(false)
  const [confirmarEncerrar, setConfirmarEncerrar] = useState(false)
  const [registrosFabricaDia, setRegistrosFabricaDia] = useState<RegistroFabricaExistente[]>([])

  // Espelho para flush síncrono no cleanup
  const leituraRef = useRef<Record<string, string>>({})
  const debounceRascunhoRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
        setTiposDisponiveis(tipos.length > 0 ? tipos : ['confinamento'])
        if (tipos.length > 0 && !tipos.includes('confinamento')) {
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

  // Carregar dietas disponíveis (formulações usadas por lotes do sistema selecionado)
  const carregarDietas = useCallback(async () => {
    if (!fazendaId) return
    const sistemaEsperado = SISTEMA_POR_TIPO[tipoSelecionado] || 'Confinamento'
    try {
      await loadQueryCacheFromIndexedDB()
      // Buscar lotes do sistema de produção do tipo selecionado
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
          lotesData = (allLotes || []).filter((l: any) => l.sistema_producao === sistemaEsperado)
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
          lotesData = lotesFromCache.filter((l: any) => l !== null && l.sistema_producao === sistemaEsperado)
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
  }, [fazendaId, dietaSelecionadaId, tipoSelecionado])

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

      // Buscar programação (cronograma), currais, ocupações, registros do dia, notas config
      const [progCompleta, curraisData, registrosDoDia, notasConfigData, ocupacoesData] = await Promise.all([
        getProgramacaoTratosCompletaCached(fazendaId, tipoSelecionado),
        getCurraisCached(fazendaId),
        getRegistrosOfertaTratoByFazendaDataCached(fazendaId, dataISO),
        getNotasLeituraCochoConfigCached(fazendaId),
        getOcupacoesCurralNaDataCached(fazendaId, dataISO),
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
      setPercentuaisTratos(
        progCompleta.percentuais.map((p: any) => ({
          ordem_trato: p.ordem_trato,
          percentual: Number(p.percentual) || 0,
        }))
      )

      // Ocupação vigente de cada curral na data (maior data_inicial <= data).
      // A participação na fábrica vem da ocupação, não do snapshot da programação.
      const sistemaEsperado = SISTEMA_POR_TIPO[tipoSelecionado]
      const ocupacaoPorCurral = new Map<string, any>()
      for (const o of ocupacoesData || []) {
        const atual = ocupacaoPorCurral.get(o.curral_id)
        if (!atual || o.data_inicial > atual.data_inicial) {
          ocupacaoPorCurral.set(o.curral_id, o)
        }
      }
      const ocupacoesDoTipo = [...ocupacaoPorCurral.values()].filter(
        (o) => (o.lotes?.sistema_producao ?? null) === sistemaEsperado
      )

      // Mapa de currais por id
      const curraisPorId = new Map<string, any>()
      for (const c of curraisData || []) {
        if (c.id) {
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

      // Para cada curral ocupado, verificar se o lote usa a dieta selecionada
      const curraisDaDieta: CurralFiltrado[] = []
      for (const ocupacao of ocupacoesDoTipo) {
        const curralId = ocupacao.curral_id as string
        const curralInfo = curraisPorId.get(curralId)
        if (!curralInfo) continue
        const loteId = ocupacao.lote_id

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

        // Dia 1 é por ocupação: só contam registros desde a entrada do lote atual
        const registrosAnterioresRaw = await getRegistrosOfertaTratoAnterioresCached(
          fazendaId,
          curralId,
          dataISO
        )
        const dataInicialOcupacao = String(ocupacao.data_inicial || '').slice(0, 10)
        const registrosAnteriores = (registrosAnterioresRaw || []).filter(
          (r: any) => !dataInicialOcupacao || (r.data || '').slice(0, 10) >= dataInicialOcupacao
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

        // Calcular kgBaseDia (feed target do dia 1 é opcional)
        const kgMnDia = ocupacao.kg_mn_dia_dia1 != null ? Number(ocupacao.kg_mn_dia_dia1) : null
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
          loteNome: ocupacao.lotes?.nome || curralInfo.lote_nome || null,
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

      // Buscar registros de fábrica do dia. A produção avança independentemente da distribuição.
      // Offline-first: sempre mesclar os registros locais do IndexedDB — um registro
      // pendente de sync ainda não existe no Supabase e ignorá-lo aqui reabriria o
      // trato (e geraria um master duplicado no próximo salvamento).
      let registrosFabrica: RegistroFabricaExistente[] = []
      if (navigator.onLine) {
        try {
          registrosFabrica = await getRegistrosFabricaDoDia(fazendaId, dataISO, tipoSelecionado, dietaSelecionadaId)
        } catch {
          // offline ou erro, seguir só com os registros locais
        }
      }

      try {
        const registrosLocais = await getAllRegistros('fabrica-confinamento')
        const locaisDoDia = (registrosLocais as any[]).filter((r) => {
          const raw = String(r.data || '')
          // Registros locais gravam data em formato BR ("dd/mm/aaaa hh:mm")
          const rDataISO = raw.includes('/') ? brToDateISO(raw) : raw.slice(0, 10)
          return (
            rDataISO === dataISO &&
            r.tipo === tipoSelecionado &&
            r.formulacaoId === dietaSelecionadaId &&
            (!r.fazendaId || r.fazendaId === fazendaId)
          )
        })
        for (const local of locaisDoDia) {
          const concluidoLocal = local.concluido === true || local.concluido === 'true'
          if (local.supabaseId) {
            const remoto = registrosFabrica.find((r) => r.id === local.supabaseId)
            if (remoto) {
              // Update local pendente: os valores locais são mais novos que os do remoto
              if (local.syncStatus === 'pending') {
                remoto.total_previsto = Number(local.totalPrevisto) || remoto.total_previsto
                remoto.total_produzido = Number(local.totalProduzido) || remoto.total_produzido
                remoto.concluido = concluidoLocal
              }
            } else {
              // O remoto não voltou na query (registro novo demais ou deletado);
              // tratar pelo valor local para não reabrir o trato
              registrosFabrica.push({
                id: local.supabaseId,
                ordem_trato: Number(local.ordemTrato) || 0,
                total_previsto: Number(local.totalPrevisto) || 0,
                total_produzido: Number(local.totalProduzido) || 0,
                concluido: concluidoLocal,
              })
            }
          } else {
            // Create ainda não sincronizado: não existe no Supabase
            registrosFabrica.push({
              id: local.id,
              ordem_trato: Number(local.ordemTrato) || 0,
              total_previsto: Number(local.totalPrevisto) || 0,
              total_produzido: Number(local.totalProduzido) || 0,
              concluido: concluidoLocal,
            })
          }
        }
        registrosFabrica.sort((a, b) => a.ordem_trato - b.ordem_trato)
      } catch {
        // ignorar
      }

      // A ordem da Fábrica depende somente da produção desta dieta.
      // A distribuição pode ocorrer depois, inclusive em outro dispositivo.
      const tratoNaoConcluido = registrosFabrica.find((r) => !r.concluido)
      const maxOrdemProduzida = registrosFabrica
        .filter((r) => r.concluido)
        .reduce((max, r) => Math.max(max, Number(r.ordem_trato) || 0), 0)
      const ordemAtual = tratoNaoConcluido
        ? tratoNaoConcluido.ordem_trato
        : Math.min(maxOrdemProduzida + 1, qtdTratos)

      setRegistrosFabricaDia(registrosFabrica)

      if (tratoNaoConcluido) {
        // Buscar o registro local no IndexedDB pelo supabaseId (ou pelo id local,
        // quando o registro ainda não sincronizou) para obter o ID local
        const registrosLocais = await getAllRegistros('fabrica-confinamento')
        let registroLocal: any = registrosLocais.find(
          (r: any) => r.supabaseId === tratoNaoConcluido.id || r.id === tratoNaoConcluido.id
        )
        if (!registroLocal) {
          // Trato aberto criado em outro dispositivo: criar espelho local para
          // que o complemento/encerramento atualize o mesmo master no Supabase
          registroLocal = {
            id: generateId(),
            supabaseId: tratoNaoConcluido.id,
            fazendaId,
            data,
            usuario,
            tipo: tipoSelecionado,
            formulacaoId: dietaSelecionadaId,
            ordemTrato: String(tratoNaoConcluido.ordem_trato),
            totalPrevisto: tratoNaoConcluido.total_previsto,
            totalProduzido: tratoNaoConcluido.total_produzido,
            concluido: 'false',
            syncStatus: 'synced',
            version: 1,
            lastModified: new Date().toISOString(),
          } as any
          await saveRegistroIDB('fabrica-confinamento', registroLocal)
        } else if (
          registroLocal.supabaseId === tratoNaoConcluido.id &&
          registroLocal.syncStatus !== 'pending' &&
          (Number(registroLocal.totalProduzido) !== tratoNaoConcluido.total_produzido ||
            String(registroLocal.totalPrevisto) !== String(tratoNaoConcluido.total_previsto))
        ) {
          // Espelho desatualizado (produção continuou em outro aparelho):
          // refrescar os totais locais sem marcar como pendente
          await updateRegistro('fabrica-confinamento', registroLocal.id, {
            totalPrevisto: tratoNaoConcluido.total_previsto,
            totalProduzido: tratoNaoConcluido.total_produzido,
          })
        }
        setRegistroFabricaNaoConcluidoId(registroLocal.id)
      } else {
        setRegistroFabricaNaoConcluidoId(null)
      }

      const todosConcluidos = maxOrdemProduzida >= qtdTratos && !tratoNaoConcluido
      setTodosTratosConcluidos(todosConcluidos)
      setOrdemTratoAtual(ordemAtual)
      setConfirmarEncerrar(false)

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
      if (isUltimoTrato) {
        // Calcular o saldo de cada curral e subtrair o já distribuído nos tratos anteriores
        for (const curral of curraisDaDieta) {
          if (!curral.isDia1 && curral.kgBaseDia !== null) {
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

      // Restaurar rascunho salvo (se houver)
      const rascunhoKey = `fabrica-rascunho-${fazendaId}-${dataISO}-${tipoSelecionado}-${dietaSelecionadaId}`
      const rascunho = await lerRascunho<{ leituraPorInsumo?: Record<string, string> }>(rascunhoKey)
      if (rascunho?.leituraPorInsumo && Object.values(rascunho.leituraPorInsumo).some((v) => v !== '')) {
        setLeituraPorInsumo(rascunho.leituraPorInsumo)
        setRascunhoSalvo(true)
      } else {
        setLeituraPorInsumo({})
        setRascunhoSalvo(false)
      }
      setLeituraDigitada('')
      setAtivoId(null)
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

  const tratoNaoConcluidoJaIniciado = jaProduzidoNoTrato > 0

  // Quanto ainda precisa ser carregado neste trato (descontando o que já foi produzido)
  const totalAlvo = useMemo(
    () => Math.max(0, tratoNaoConcluidoJaIniciado ? totalPrevisto - jaProduzidoNoTrato : totalPrevisto),
    [totalPrevisto, jaProduzidoNoTrato, tratoNaoConcluidoJaIniciado]
  )

  // kg previsto por insumo (percentual MN da dieta sobre o total a carregar)
  const kgPrevistoPorInsumo = useMemo(() => {
    const result: Record<string, number> = {}
    for (const insumo of insumos) {
      result[insumo.insumo_id] = (insumo.formula_mn_percent / 100) * totalAlvo
    }
    return result
  }, [insumos, totalAlvo])

  // Leitura acumulada que a balança deve marcar após cada insumo
  const alvoAcumulado = useMemo(() => {
    let acc = 0
    const result: Record<string, number> = {}
    for (const insumo of insumos) {
      acc += kgPrevistoPorInsumo[insumo.insumo_id] || 0
      result[insumo.insumo_id] = acc
    }
    return result
  }, [insumos, kgPrevistoPorInsumo])

  // kg que entrou de cada insumo = leitura atual da balança − leitura anterior.
  // A pesagem é sequencial: para na primeira lacuna.
  const { kgRealPorInsumo, totalProduzidoNum } = useMemo(() => {
    let anterior = 0
    const real: Record<string, number> = {}
    for (const insumo of insumos) {
      const leitura = normalizarNumero(leituraPorInsumo[insumo.insumo_id])
      if (leitura === null) break
      real[insumo.insumo_id] = leitura - anterior
      anterior = leitura
    }
    return { kgRealPorInsumo: real, totalProduzidoNum: anterior }
  }, [insumos, leituraPorInsumo])

  const insumosPendentes = useMemo(
    () => insumos.filter((i) => kgRealPorInsumo[i.insumo_id] === undefined),
    [insumos, kgRealPorInsumo]
  )
  const ativoEfetivoId =
    ativoId && insumos.some((i) => i.insumo_id === ativoId)
      ? ativoId
      : insumosPendentes[0]?.insumo_id ?? null
  const insumoAtivo = insumos.find((i) => i.insumo_id === ativoEfetivoId) || null
  const idxAtivo = insumoAtivo ? insumos.findIndex((i) => i.insumo_id === insumoAtivo.insumo_id) : -1
  const leituraAnteriorAtivo =
    idxAtivo > 0 ? normalizarNumero(leituraPorInsumo[insumos[idxAtivo - 1].insumo_id]) ?? 0 : 0
  const leituraDigitadaNum = normalizarNumero(leituraDigitada)
  const alvoAtivo = insumoAtivo ? alvoAcumulado[insumoAtivo.insumo_id] : 0
  // Quanto falta (positivo) ou passou (negativo) para o alvo da balança
  const faltaAtivo = leituraDigitadaNum !== null ? alvoAtivo - leituraDigitadaNum : alvoAtivo - leituraAnteriorAtivo

  // Faltam kg para completar o trato
  const faltamKg = useMemo(
    () => Math.max(0, totalAlvo - totalProduzidoNum),
    [totalAlvo, totalProduzidoNum]
  )

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
    if (todosTratosConcluidos) return false
    return true
  }, [carregando, salvando, dietaSelecionadaId, vagaoSelecionadoId, totalProduzidoNum, todosTratosConcluidos])

  // Pode encerrar o trato atual (mesmo com déficit ou sem produção) e avançar?
  const podeEncerrar = useMemo(() => {
    if (carregando || salvando) return false
    if (!dietaSelecionadaId || !vagaoSelecionadoId) return false
    if (todosTratosConcluidos || quantidadeTratos <= 0) return false
    if (ordemTratoAtual > quantidadeTratos) return false
    // Sem previsto não há registro válido para gravar (validação exige previsto > 0)
    if (totalPrevisto <= 0 && !registroFabricaNaoConcluidoId) return false
    return true
  }, [carregando, salvando, dietaSelecionadaId, vagaoSelecionadoId, todosTratosConcluidos, quantidadeTratos, ordemTratoAtual, totalPrevisto, registroFabricaNaoConcluidoId])

  // Tratos encerrados com produção abaixo do previsto (trava informativa)
  const deficitsTratos = useMemo(
    () =>
      registrosFabricaDia.filter(
        (r) => r.concluido && r.total_produzido < r.total_previsto - 0.5
      ),
    [registrosFabricaDia]
  )

  // Rascunho: persiste as leituras acumuladas da balança no IndexedDB
  const getRascunhoKey = useCallback(() => {
    const dataISO = brToDateISO(data)
    return `fabrica-rascunho-${fazendaId}-${dataISO}-${tipoSelecionado}-${dietaSelecionadaId}`
  }, [fazendaId, data, tipoSelecionado, dietaSelecionadaId])

  const salvarRascunhoFabrica = useCallback(
    async (leituras: Record<string, string>) => {
      if (!fazendaId) return
      const key = getRascunhoKey()
      try {
        await salvarRascunho(key, { leituraPorInsumo: leituras })
        setRascunhoSalvo(Object.values(leituras).some((v) => v !== ''))
      } catch (error) {
        console.error('Erro ao salvar rascunho da fábrica:', error)
      }
    },
    [fazendaId, getRascunhoKey]
  )

  // Flush do autosave antes de recarregar ou desmontar
  useEffect(() => {
    return () => {
      if (debounceRascunhoRef.current) {
        clearTimeout(debounceRascunhoRef.current)
      }
      const leituras = leituraRef.current
      if (Object.values(leituras).some((v) => v !== '')) {
        void salvarRascunhoFabrica(leituras)
      }
    }
  }, [data, tipoSelecionado, dietaSelecionadaId, fazendaId, salvarRascunhoFabrica])

  // Autosave debounced a cada leitura confirmada
  useEffect(() => {
    leituraRef.current = leituraPorInsumo
    if (carregando || !Object.values(leituraPorInsumo).some((v) => v !== '')) return
    if (debounceRascunhoRef.current) clearTimeout(debounceRascunhoRef.current)
    debounceRascunhoRef.current = setTimeout(() => {
      debounceRascunhoRef.current = null
      void salvarRascunhoFabrica(leituraPorInsumo)
    }, 500)
  }, [leituraPorInsumo, carregando, salvarRascunhoFabrica])

  const handleLeituraDigitada = (valor: string) => {
    setLeituraDigitada(sanitizarDecimalComVirgula(valor))
    setErroLeitura(null)
  }

  const confirmarLeitura = () => {
    if (!insumoAtivo) return
    if (leituraDigitadaNum === null) {
      setErroLeitura('Digite o número que a balança marcou.')
      return
    }
    if (leituraDigitadaNum < leituraAnteriorAtivo) {
      setErroLeitura(`A balança não pode marcar menos que no insumo anterior (${formatarKg(leituraAnteriorAtivo, 1)} kg).`)
      return
    }
    setLeituraPorInsumo((prev) => ({ ...prev, [insumoAtivo.insumo_id]: leituraDigitada }))
    setAtivoId(null)
    setLeituraDigitada('')
    setErroLeitura(null)
    setRascunhoSalvo(false)
  }

  const reabrirInsumo = (insumoId: string) => {
    setAtivoId(insumoId)
    setLeituraDigitada(leituraPorInsumo[insumoId] || '')
    setErroLeitura(null)
  }

  const handleTirarFoto = async () => {
    await capturarFoto()
  }

  const handleSalvar = useCallback(async (encerrarTrato = false) => {
    if (!fazendaId || salvando || carregando) return
    if (encerrarTrato ? !podeEncerrar : !podeSalvar) return
    setSalvando(true)
    setSucesso(false)
    setConfirmarEncerrar(false)
    try {
      const novoTotalProduzido = jaProduzidoNoTrato + totalProduzidoNum
      // Resumo por insumo para o texto compartilhável (soma com cargas anteriores do mesmo trato)
      const cargaAtual = insumos.map((i) => ({
        nome: i.nome,
        previsto: kgPrevistoPorInsumo[i.insumo_id] || 0,
        produzido: kgRealPorInsumo[i.insumo_id] ?? 0,
      }))
      // SALVAR acumula no trato aberto; o trato encerra quando atinge o previsto
      // ou quando o usuário confirma o encerramento com déficit via ENCERRAR TRATO.
      const concluido = encerrarTrato || novoTotalProduzido >= (totalPrevisto - 0.5)

      let registroId: string

      if (registroFabricaNaoConcluidoId) {
        // Atualizar registro existente (produção parcial complementar ou encerramento com déficit)
        const registroExistente = await getRegistro('fabrica-confinamento', registroFabricaNaoConcluidoId)
        if (!registroExistente) {
          setErro('Registro de produção parcial não encontrado. Tente novamente.')
          setSalvando(false)
          return
        }
        const resumoAnterior: { nome: string; previsto: number; produzido: number }[] = Array.isArray(
          (registroExistente as any).insumosResumo
        )
          ? (registroExistente as any).insumosResumo
          : []
        const insumosResumo = cargaAtual.map((c) => {
          const ant = resumoAnterior.find((a) => a.nome === c.nome)
          return { ...c, previsto: c.previsto + (ant?.previsto || 0), produzido: c.produzido + (ant?.produzido || 0) }
        })
        await updateRegistro('fabrica-confinamento', registroFabricaNaoConcluidoId, {
          insumosResumo,
          vagaoId: vagaoSelecionadoId,
          vagaoNome: vagaoSelecionado?.nome || '',
          totalPrevisto,
          totalProduzido: novoTotalProduzido,
          concluido: String(concluido),
          syncStatus: 'pending',
          ...(fotoBalanca ? { fotoBase64: fotoBalanca } : {}),
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
          totalPrevisto,
          totalProduzido: totalProduzidoNum,
          concluido: String(concluido),
          fotoBase64: fotoBalanca || null,
          insumosResumo: cargaAtual,
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

      // Salvar insumos como registros separados no IndexedDB + enfileirar sync.
      // Só grava quando esta carga teve produção (encerrar sem input novo não gera linhas zeradas).
      if (totalProduzidoNum > 0) {
        for (const insumo of insumos) {
          const kgPrev = kgPrevistoPorInsumo[insumo.insumo_id] || 0
          const kgProd = kgRealPorInsumo[insumo.insumo_id] ?? 0

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
      }

      registerBackgroundSync('sync-registros').catch(() => {})

      setSucesso(true)
      setSucessoMsg(
        encerrarTrato && novoTotalProduzido < totalPrevisto - 0.5
          ? `Trato ${ordemTratoAtual} encerrado. Ficaram faltando ${formatarKg(totalPrevisto - novoTotalProduzido, 1)} kg do previsto.`
          : 'Produção salva com sucesso!'
      )
      setLeituraPorInsumo({})
      leituraRef.current = {}
      setLeituraDigitada('')
      setAtivoId(null)
      setRascunhoSalvo(false)
      limparFoto()

      // Manter o resumo de déficits atualizado sem depender de refresh do Supabase
      setRegistrosFabricaDia((prev) => {
        const idx = prev.findIndex((r) => r.ordem_trato === ordemTratoAtual && !r.concluido)
        const atualizado: RegistroFabricaExistente = {
          id: idx >= 0 ? prev[idx].id : registroId,
          ordem_trato: ordemTratoAtual,
          total_previsto: totalPrevisto,
          total_produzido: novoTotalProduzido,
          concluido,
        }
        if (idx >= 0) {
          const arr = [...prev]
          arr[idx] = atualizado
          return arr
        }
        return [...prev, atualizado]
      })
      // Atualizar a ordem imediatamente, sem depender do refresh do Supabase.
      if (concluido) {
        const proximaOrdem = ordemTratoAtual + 1
        setRegistroFabricaNaoConcluidoId(null)
        setJaProduzidoNoTrato(0)
        setOrdemTratoAtual(Math.min(proximaOrdem, quantidadeTratos))
        if (proximaOrdem > quantidadeTratos) {
          setTodosTratosConcluidos(true)
          setTotalPrevisto(0)
        } else {
          const proximoPercentual = percentuaisTratos.find(
            (p) => p.ordem_trato === proximaOrdem
          )?.percentual || 0
          setTotalPrevisto(
            curraisFiltrados.reduce(
              (sum, curral) => sum + (curral.kgBaseDia || 0) * (proximoPercentual / 100),
              0
            )
          )
        }
      } else {
        setRegistroFabricaNaoConcluidoId(registroId)
        setJaProduzidoNoTrato(novoTotalProduzido)
      }

      // Limpar rascunho do IndexedDB
      const rascunhoKey = getRascunhoKey()
      await limparRascunho(rascunhoKey)
    } catch (error) {
      console.error('Erro ao salvar produção:', error)
      setErro('Erro ao salvar produção. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }, [fazendaId, podeSalvar, podeEncerrar, salvando, carregando, data, usuario, tipoSelecionado, dietaSelecionadaId, vagaoSelecionadoId, vagaoSelecionado, ordemTratoAtual, quantidadeTratos, percentuaisTratos, totalPrevisto, totalProduzidoNum, jaProduzidoNoTrato, registroFabricaNaoConcluidoId, insumos, kgPrevistoPorInsumo, kgRealPorInsumo, fotoBalanca, limparFoto, curraisFiltrados, getRascunhoKey, dietasDisponiveis])

  const handleLimpar = useCallback(() => {
    setLeituraPorInsumo({})
    leituraRef.current = {}
    setLeituraDigitada('')
    setAtivoId(null)
    setErroLeitura(null)
    setSucesso(false)
    setErro(null)
    setRascunhoSalvo(false)
    setConfirmarEncerrar(false)
    limparFoto()
    // Limpar rascunho do IndexedDB
    if (fazendaId) {
      const key = getRascunhoKey()
      limparRascunho(key)
    }
  }, [fazendaId, getRascunhoKey, limparFoto])

  const tiposVisiveis = TIPOS_PROGRAMACAO.filter((t) => tiposDisponiveis.includes(t.value))
  const nomesCurrais = curraisFiltrados.map((c) => c.curralNome).join(' + ')
  const todosPesados = insumos.length > 0 && insumosPendentes.length === 0
  const nomeCurto = (nome: string) => capitalizarIniciais(nome)
  const pendenciaTexto =
    insumosPendentes.length > 0 && totalProduzidoNum <= 0
      ? 'Falta pesar o primeiro insumo'
      : insumosPendentes.length > 0
        ? `Falta pesar ${insumosPendentes.map((i) => nomeCurto(i.nome).toLowerCase()).join(' e ')}`
        : undefined

  const bottomContent = (
    <div className="flex flex-col gap-2 pb-3">
      {confirmarEncerrar && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2">
          <p className="text-xs font-bold text-amber-800">
            Encerrar o trato {ordemTratoAtual}
            {faltamKg > 0 ? ` faltando ${formatarKg(faltamKg, 1)} kg` : ''}? Não será
            possível voltar a este trato.
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => handleSalvar(true)}
              className="!min-h-0 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600"
            >
              SIM, ENCERRAR
            </button>
            <button
              onClick={() => setConfirmarEncerrar(false)}
              className="!min-h-0 rounded-full bg-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-300"
            >
              CANCELAR
            </button>
          </div>
        </div>
      )}
      <button
        onClick={() => handleSalvar()}
        disabled={!podeSalvar}
        className={`w-full !min-h-0 rounded-2xl px-3 py-4 text-base font-bold transition-colors active:scale-[0.99] ${
          !podeSalvar ? 'cursor-not-allowed bg-gray-100 text-gray-400' : 'bg-green-600 text-white hover:bg-green-700'
        }`}
      >
        <span className="inline-flex items-center justify-center gap-2">
          {salvando ? <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} /> : <Save className="h-5 w-5" strokeWidth={2.5} />}
          SALVAR
        </span>
      </button>
      <div className="flex gap-2">
        <button
          onClick={() => setConfirmarEncerrar(true)}
          disabled={!podeEncerrar}
          className={`flex-1 !min-h-0 rounded-2xl border-2 px-3 py-2.5 text-xs font-bold transition-colors active:scale-95 ${
            !podeEncerrar
              ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
              : 'border-amber-500 bg-amber-50 text-amber-800 hover:bg-amber-100'
          }`}
        >
          ENCERRAR TRATO
        </button>
        <button
          onClick={handleLimpar}
          className="flex-1 !min-h-0 rounded-2xl bg-gray-100 px-3 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-200 active:scale-95"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Brush className="h-4 w-4" strokeWidth={2.5} />
            LIMPAR
          </span>
        </button>
      </div>
      {pendenciaTexto && (
        <p className="text-center text-xs font-semibold text-gray-500">
          <span className="text-red-500">*</span> {pendenciaTexto}
        </p>
      )}
    </div>
  )

  const renderInsumo = (insumo: InsumoFormulacao, idx: number) => {
    const id = insumo.insumo_id
    const real = kgRealPorInsumo[id]
    const feito = real !== undefined
    const ativo = id === ativoEfetivoId
    const prev = kgPrevistoPorInsumo[id] || 0
    const dif = feito && prev > 0 ? ((real - prev) / prev) * 100 : null
    const difOk = dif !== null && Math.abs(dif) <= 3
    const leituraMarcada = feito ? normalizarNumero(leituraPorInsumo[id]) : null

    return (
      <button
        key={id}
        type="button"
        onClick={() => (feito ? reabrirInsumo(id) : undefined)}
        className={`flex w-full items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left transition-colors ${
          ativo
            ? 'border-brand-900 bg-white'
            : feito
              ? 'border-green-400 bg-green-50'
              : 'border-gray-200 bg-white'
        }`}
      >
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-extrabold ${
            feito ? 'bg-green-500 text-white' : ativo ? 'bg-brand-900 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {feito ? '✓' : idx + 1}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-extrabold leading-tight text-gray-900">{nomeCurto(insumo.nome)}</span>
          <span className="block text-xs font-semibold text-gray-500">
            {insumo.formula_mn_percent.toFixed(1).replace('.', ',')}% · {formatarKg(prev, 1)} kg
          </span>
          {feito && dif !== null && todosPesados && (
            <span className={`block text-xs font-bold ${difOk ? 'text-green-700' : 'text-amber-700'}`}>
              {difOk ? '✓ ' : '⚠ '}
              {formatarKg(real, 1)} kg ({dif > 0 ? '+' : ''}{formatarKg(dif, 1)}%)
            </span>
          )}
          {feito && real < 0 && (
            <span className="block text-xs font-bold text-red-600">Leitura menor que a anterior, confira</span>
          )}
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[11px] font-semibold leading-tight text-gray-500">
            {feito ? 'pesou' : 'balança deve marcar'}
          </span>
          <span className="block text-2xl font-extrabold leading-tight text-gray-900">
            {feito ? formatarKg(leituraMarcada, Number.isInteger(leituraMarcada) ? 0 : 1) : formatarKg(alvoAcumulado[id] ?? 0, 0)}
          </span>
        </span>
      </button>
    )
  }

  return (
    <CadernetaLayout
      title="Carregamento Vagão"
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
      bottomPaddingClass="pb-60"
    >
      <CadernetaSection numero={1} titulo="Dados do carregamento">
        {tiposVisiveis.length > 1 && (
          <div>
            <span className="mb-2 block text-[15px] font-bold uppercase text-gray-900">Sistema de produção</span>
            <ChoiceGrid
              options={tiposVisiveis.map((t) => ({ value: t.value, label: t.label }))}
              value={tipoSelecionado}
              onChange={setTipoSelecionado}
              cols={tiposVisiveis.length >= 3 ? 3 : 2}
              size="sm"
              labelSize="xs"
            />
          </div>
        )}

        <div>
          <span className="mb-2 block text-[15px] font-bold uppercase text-gray-900">
            Dieta <span className="text-red-500">*</span>
          </span>
          {dietasDisponiveis.length === 0 ? (
            <InfoStrip tone="warning">Nenhuma dieta encontrada para lotes deste sistema de produção.</InfoStrip>
          ) : (
            <ChoiceGrid
              options={dietasDisponiveis.map((d) => ({ value: d.id, label: capitalizarIniciais(d.nome), icon: '🐂' }))}
              value={dietaSelecionadaId}
              onChange={setDietaSelecionadaId}
              cols={2}
            />
          )}
        </div>

        <div>
          <span className="mb-2 block text-[15px] font-bold uppercase text-gray-900">
            Vagão <span className="text-red-500">*</span>
          </span>
          {vagoes.length === 0 ? (
            <InfoStrip tone="warning">Nenhum vagão cadastrado. Cadastre no painel web.</InfoStrip>
          ) : (
            <ChoiceGrid
              options={vagoes.map((v) => ({
                value: v.id,
                label: `${v.nome}${v.capacidade_kg ? ` · ${formatarKg(v.capacidade_kg, 0)} kg` : ''}`,
                icon: '🚜',
              }))}
              value={vagaoSelecionadoId}
              onChange={setVagaoSelecionadoId}
              cols={2}
            />
          )}
        </div>

        {carregando ? (
          <div className="p-4 text-center text-gray-500">
            <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />
            Carregando...
          </div>
        ) : erro ? (
          <InfoStrip tone="danger" icon={<AlertCircle className="h-5 w-5" />}>{erro}</InfoStrip>
        ) : !dietaSelecionadaId ? (
          <InfoStrip tone="warning">Selecione uma dieta para continuar.</InfoStrip>
        ) : curraisFiltrados.length === 0 ? (
          <InfoStrip tone="warning">Nenhum curral encontrado para esta dieta e sistema de produção.</InfoStrip>
        ) : (
          <div>
            <span className="mb-2 block text-[15px] font-bold uppercase text-gray-900">Para quais currais?</span>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-gray-100 px-3 py-2">
                <span className="block text-xs font-semibold text-gray-500">
                  {ordemTratoAtual}º trato de {quantidadeTratos}
                </span>
              </div>
              <div className="min-w-0 rounded-xl bg-gray-100 px-3 py-2">
                <span className="block text-xs font-semibold text-gray-500">Currais</span>
                <span className="block break-words text-sm font-extrabold leading-tight text-gray-900">{nomesCurrais}</span>
              </div>
              <div className="rounded-xl bg-gray-100 px-3 py-2">
                <span className="block text-xs font-semibold text-gray-500">Total</span>
                <span className="block text-sm font-extrabold text-gray-900">{formatarKg(totalAlvo, 0)} kg</span>
              </div>
            </div>
          </div>
        )}

        {!carregando && !erro && todosTratosConcluidos && (
          <InfoStrip tone="success" icon={<CheckCircle2 className="h-5 w-5" />}>
            Todos os {quantidadeTratos} tratos do dia foram encerrados.
          </InfoStrip>
        )}
        {!carregando && !erro && tratoNaoConcluidoJaIniciado && faltamKg > 0 && (
          <InfoStrip tone="warning" icon={<AlertCircle className="h-5 w-5" />}>
            Trato {ordemTratoAtual} em aberto: já produzido {formatarKg(jaProduzidoNoTrato, 0)} kg, faltam{' '}
            {formatarKg(faltamKg, 0)} kg. Para seguir sem completar, use ENCERRAR TRATO.
          </InfoStrip>
        )}
        {!carregando && !erro && deficitsTratos.length > 0 && (
          <InfoStrip tone="warning" icon={<AlertCircle className="h-5 w-5" />}>
            <span className="block">
              {deficitsTratos.map((d) => (
                <span key={d.ordem_trato} className="block">
                  Trato {d.ordem_trato}: produzido {formatarKg(d.total_produzido, 0)} kg de{' '}
                  {formatarKg(d.total_previsto, 0)} kg (faltaram {formatarKg(d.total_previsto - d.total_produzido, 0)} kg)
                </span>
              ))}
            </span>
          </InfoStrip>
        )}
        {sucesso && (
          <InfoStrip tone="success" icon={<CheckCircle2 className="h-5 w-5" />}>{sucessoMsg}</InfoStrip>
        )}
      </CadernetaSection>

      {!carregando && !erro && curraisFiltrados.length > 0 && insumos.length > 0 && (
        <CadernetaSection numero={2} titulo="Insumos na ordem de carregar" required>
          <div className="flex flex-col gap-2">{insumos.map((insumo, idx) => renderInsumo(insumo, idx))}</div>

          {insumoAtivo && !todosTratosConcluidos && (
            <div className="rounded-2xl bg-brand-900 p-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-extrabold uppercase tracking-wide opacity-90">Quanto a balança marcou?</span>
                <span className="text-right text-xs font-extrabold uppercase tracking-wide opacity-90">
                  {faltaAtivo >= 0 ? 'Falta de' : 'Passou de'} {nomeCurto(insumoAtivo.nome).toLowerCase()}
                  <span className="block text-2xl normal-case">{formatarKg(Math.abs(faltaAtivo), 1)} kg</span>
                </span>
              </div>
              <div className="mt-1 flex items-end gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={leituraDigitada}
                  onChange={(e) => handleLeituraDigitada(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') confirmarLeitura()
                  }}
                  placeholder="0"
                  data-field="leitura-balanca"
                  className="w-full min-w-0 border-0 border-b-4 border-green-500 bg-transparent !px-0 text-4xl font-extrabold text-white placeholder-white/40 focus:outline-none"
                />
                <span className="pb-1 text-lg font-semibold">kg</span>
              </div>
              {erroLeitura && <p className="mt-2 text-sm font-bold text-amber-300">{erroLeitura}</p>}
              <button
                type="button"
                onClick={confirmarLeitura}
                className="mt-3 w-full !min-h-0 rounded-xl bg-green-600 px-3 py-3 text-sm font-extrabold uppercase text-white active:scale-[0.99]"
              >
                Confirmar {nomeCurto(insumoAtivo.nome)}
              </button>
            </div>
          )}

          <InfoStrip>
            Digite o número da balança do vagão depois de cada insumo. A caderneta calcula quanto entrou de cada um e
            avisa quanto falta.
          </InfoStrip>
          {rascunhoSalvo && (
            <InfoStrip tone="success" icon={<CheckCircle2 className="h-5 w-5" />}>Rascunho salvo</InfoStrip>
          )}
        </CadernetaSection>
      )}

      {!carregando && !erro && curraisFiltrados.length > 0 && (
        <CadernetaSection numero={3} titulo="Fechamento">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-gray-100 px-3 py-2">
              <span className="block text-xs font-semibold text-gray-500">Previsto</span>
              <span className="block text-2xl font-extrabold text-gray-900">{formatarKg(totalAlvo, 0)} kg</span>
            </div>
            <div className="rounded-xl bg-gray-100 px-3 py-2">
              <span className="block text-xs font-semibold text-gray-500">Carregado</span>
              <span className="block text-2xl font-extrabold text-gray-900">
                {totalProduzidoNum > 0 ? `${formatarKg(totalProduzidoNum, 0)} kg` : '— kg'}
              </span>
            </div>
          </div>

          {excedeCapacidade && vagaoSelecionado?.capacidade_kg && (
            <InfoStrip tone="warning" icon={<AlertCircle className="h-5 w-5" />}>
              Excede a capacidade do vagão ({formatarKg(vagaoSelecionado.capacidade_kg, 0)} kg): {formatarKg(totalProduzidoNum, 0)} kg
              equivalem a aproximadamente {Math.ceil(totalProduzidoNum / vagaoSelecionado.capacidade_kg)} cargas do vagão.
            </InfoStrip>
          )}

          {fotoBalanca ? (
            <div className="flex items-start gap-3">
              <img
                src={base64ToDataUrl(fotoBalanca)}
                alt="Foto da balança"
                className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
              />
              <button
                type="button"
                onClick={limparFoto}
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
              className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-brand-900 px-3 py-3 text-sm font-extrabold uppercase tracking-wide text-white transition-colors active:scale-[0.99] disabled:opacity-60"
            >
              <span className="text-lg leading-none">📷</span>
              {capturandoFoto ? 'Capturando...' : 'Foto da balança no final'}
            </button>
          )}
          {fotoErro && <InfoStrip tone="danger">{fotoErro}</InfoStrip>}

          <InfoStrip>Com tudo carregado, aparece a diferença de cada insumo (ok até 3%).</InfoStrip>
        </CadernetaSection>
      )}

      <input
        ref={fotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
      />
    </CadernetaLayout>
  )
}

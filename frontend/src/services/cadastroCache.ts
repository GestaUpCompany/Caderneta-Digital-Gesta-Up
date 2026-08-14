import { BACKEND_URL } from '../utils/constants'
import { saveCadastroData, getAllCadastroData, getCadastroData, deleteCadastroData, clearCadastroData } from './indexedDB'
import * as supabaseService from './supabaseService'
import { fetchFuncionariosComAcesso } from './funcionarioAuthService'
import { fetchChecklistRegras } from './checklistRegrasService'
import { fetchRotinas } from './rotinasService'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../utils/eventBus'

const CACHE_KEYS = {
  PASTOS_LOTES: 'pastos_lotes',
  SUPLEMENTACAO: 'suplementacao',
  FRIGORIFICOS: 'frigorificos',
}

const CACHE_EXPIRY_MS = 30 * 60 * 1000 // 30 minutos (polling de cache em foreground)

export interface PastoDetalhes {
  pasto: string
  areaUtil: string
  especie: string
  alturaEntrada: string
  alturaSaida: string
}

export interface LoteDetalhes {
  lote: string
  nCabecas: string
  categorias: string
  pesoVivo: string
  qtdBezerros: string
}

export interface CadastroCacheData {
  pastos: string[]
  lotes: string[]
  frigorificos?: string[]
  causasMorte?: string[]
  bebedouros?: string[]
  fornecedores?: string[]
  funcionarios?: string[]
  mineral?: string[]
  proteinado?: string[]
  racao?: string[]
  insumos?: string[]
  formulacoes?: string[]
  pastosDetalhes?: Record<string, PastoDetalhes>
  lotesDetalhes?: Record<string, LoteDetalhes>
  /** Mapa nome do lote -> nome do pasto onde o lote está. Usado para exibir o pasto ao lado do lote nos seletores. */
  lotesPastoMap?: Record<string, string>
  individuos?: { id: string; id_manejo: string | null; id_brinco: string | null; id_chip: string | null; id_provisorio_cria: string | null; sexo: string; raca: string; categoria: string; classificacao_matriz: string | null; numero_partos: number | null; status: string }[]
}

let cacheData: CadastroCacheData | null = null
let lastCacheUpdate: number = 0
let pollingInterval: number | null = null

const QUERY_CACHE_KEY = 'queryCache'
const SYNC_CHECKPOINT_KEY = 'syncCheckpoint'

/**
 * Checkpoint para retomar sync de onde parou caso o app seja fechado.
 * Salvo no IndexedDB a cada etapa concluída.
 */
interface SyncCheckpoint {
  fazendaId: string
  syncStepsCompleted: number      // índice do último step de syncAllCadastroData concluído
  warmPhase: string               // 'pastos' | 'lotes' | 'formulacoes' | 'rodeio' | 'medicamentos' | 'tratamentos' | 'extras' | 'almoxarifado' | 'bebedouros' | 'tratos' | 'done'
  warmPhaseIndex: number          // índice dentro da fase atual
  timestamp: number
}

async function saveSyncCheckpoint(cp: SyncCheckpoint): Promise<void> {
  try {
    await saveCadastroData(SYNC_CHECKPOINT_KEY, cp)
  } catch (error) {
    console.warn('[CadastroCache] Erro ao salvar checkpoint:', error)
  }
}

async function loadSyncCheckpoint(fazendaId: string): Promise<SyncCheckpoint | null> {
  try {
    const cp = await getCadastroData(SYNC_CHECKPOINT_KEY)
    if (cp && cp.fazendaId === fazendaId) {
      // Invalidar checkpoint com mais de 6 horas (dados podem estar stale)
      if (Date.now() - cp.timestamp > 6 * 60 * 60 * 1000) {
        console.log('[CadastroCache] Checkpoint expirado (>6h), ignorando')
        await clearSyncCheckpoint()
        return null
      }
      return cp as SyncCheckpoint
    }
    return null
  } catch {
    return null
  }
}

async function clearSyncCheckpoint(): Promise<void> {
  try {
    await deleteCadastroData(SYNC_CHECKPOINT_KEY)
  } catch {
    // ignorar
  }
}

/**
 * Persiste o cache lazy de queries detalhadas no IndexedDB.
 * Essencial para que detalhes de pastos/lotes sobrevivam ao fechamento do app.
 */
export async function saveQueryCacheToIndexedDB(): Promise<void> {
  try {
    const data = { queryCache, timestamp: Date.now() }
    await saveCadastroData(QUERY_CACHE_KEY, data)
    console.log('[CadastroCache] Query cache salvo no IndexedDB:', {
      entries: Object.keys(queryCache).length
    })
  } catch (error) {
    console.error('[CadastroCache] Erro ao salvar query cache no IndexedDB:', error)
  }
}

/**
 * Carrega o cache lazy de queries detalhadas do IndexedDB.
 * Sem TTL: o cache persiste indefinidamente até o usuário clicar "Atualizar Dados".
 * Isso garante funcionamento offline mesmo após reabrir o app no campo.
 */
export async function loadQueryCacheFromIndexedDB(): Promise<void> {
  try {
    const cached = await getCadastroData(QUERY_CACHE_KEY)
    if (cached?.queryCache) {
      // Filtrar apenas entradas vazias (arrays sem elementos) — não expirar por TTL
      const validEntries = Object.entries(cached.queryCache).filter(([_key, entry]: [string, any]) => {
        if (!entry) return false
        if (Array.isArray(entry.data) && entry.data.length === 0) return false
        return true
      })
      validEntries.forEach(([key, entry]) => {
        queryCache[key] = entry as { data: any; timestamp: number }
      })
      console.log('[CadastroCache] Query cache carregado do IndexedDB:', {
        entries: validEntries.length,
        skipped: Object.keys(cached.queryCache).length - validEntries.length,
        timestamp: cached.timestamp
      })
    }
  } catch (error) {
    console.error('[CadastroCache] Erro ao carregar query cache do IndexedDB:', error)
  }
}

/**
 * Carrega dados de cadastro do IndexedDB (cache)
 * Verifica se os dados pertencem à fazenda atual
 */
export async function loadFromCache(): Promise<CadastroCacheData | null> {
  try {
    const cached = await getAllCadastroData()
    if (cached[CACHE_KEYS.PASTOS_LOTES] || cached[CACHE_KEYS.SUPLEMENTACAO]) {
      // Verificar se os dados são da fazenda atual
      const cachedFazendaId = cached[CACHE_KEYS.PASTOS_LOTES]?.fazendaId
      if (currentFazendaId && cachedFazendaId && cachedFazendaId !== currentFazendaId) {
        console.log('[CadastroCache] Cache de outra fazenda detectado, ignorando:', cachedFazendaId, 'atual:', currentFazendaId)
        return null
      }
      
      console.log('[CadastroCache] Dados carregados do cache:', {
        pastos: cached[CACHE_KEYS.PASTOS_LOTES]?.pastos?.length || 0,
        lotes: cached[CACHE_KEYS.PASTOS_LOTES]?.lotes?.length || 0,
        frigorificos: cached[CACHE_KEYS.PASTOS_LOTES]?.frigorificos?.length || 0,
        causasMorte: cached[CACHE_KEYS.PASTOS_LOTES]?.causasMorte?.length || 0,
        bebedouros: cached[CACHE_KEYS.PASTOS_LOTES]?.bebedouros?.length || 0,
        fornecedores: cached[CACHE_KEYS.PASTOS_LOTES]?.fornecedores?.length || 0,
        pastosDetalhes: Object.keys(cached[CACHE_KEYS.PASTOS_LOTES]?.pastosDetalhes || {}).length,
        lotesDetalhes: Object.keys(cached[CACHE_KEYS.PASTOS_LOTES]?.lotesDetalhes || {}).length,
        mineral: cached[CACHE_KEYS.SUPLEMENTACAO]?.mineral?.length || 0,
        proteinado: cached[CACHE_KEYS.SUPLEMENTACAO]?.proteinado?.length || 0,
        racao: cached[CACHE_KEYS.SUPLEMENTACAO]?.racao?.length || 0,
        insumos: cached[CACHE_KEYS.SUPLEMENTACAO]?.insumos?.length || 0,
        fazendaId: cachedFazendaId,
      })
      return {
        pastos: cached[CACHE_KEYS.PASTOS_LOTES]?.pastos || [],
        lotes: cached[CACHE_KEYS.PASTOS_LOTES]?.lotes || [],
        frigorificos: cached[CACHE_KEYS.PASTOS_LOTES]?.frigorificos || [],
        causasMorte: cached[CACHE_KEYS.PASTOS_LOTES]?.causasMorte || [],
        bebedouros: cached[CACHE_KEYS.PASTOS_LOTES]?.bebedouros || [],
        fornecedores: cached[CACHE_KEYS.PASTOS_LOTES]?.fornecedores || [],
        funcionarios: cached[CACHE_KEYS.PASTOS_LOTES]?.funcionarios || [],
        formulacoes: cached[CACHE_KEYS.PASTOS_LOTES]?.formulacoes || [],
        pastosDetalhes: cached[CACHE_KEYS.PASTOS_LOTES]?.pastosDetalhes || {},
        lotesDetalhes: cached[CACHE_KEYS.PASTOS_LOTES]?.lotesDetalhes || {},
        lotesPastoMap: cached[CACHE_KEYS.PASTOS_LOTES]?.lotesPastoMap || {},
        individuos: cached[CACHE_KEYS.PASTOS_LOTES]?.individuos || [],
        mineral: cached[CACHE_KEYS.SUPLEMENTACAO]?.mineral || [],
        proteinado: cached[CACHE_KEYS.SUPLEMENTACAO]?.proteinado || [],
        racao: cached[CACHE_KEYS.SUPLEMENTACAO]?.racao || [],
        insumos: cached[CACHE_KEYS.SUPLEMENTACAO]?.insumos || [],
      }
    }
    console.log('[CadastroCache] Nenhum dado encontrado no cache')
    return null
  } catch (error) {
    console.error('Erro ao carregar do cache:', error)
    return null
  }
}

/**
 * Salva dados de cadastro no IndexedDB (cache)
 */
export async function saveToCache(data: CadastroCacheData): Promise<void> {
  try {
    await saveCadastroData(CACHE_KEYS.PASTOS_LOTES, {
      pastos: data.pastos,
      lotes: data.lotes,
      frigorificos: data.frigorificos || [],
      causasMorte: data.causasMorte || [],
      bebedouros: data.bebedouros || [],
      fornecedores: data.fornecedores || [],
      funcionarios: data.funcionarios || [],
      formulacoes: data.formulacoes || [],
      pastosDetalhes: data.pastosDetalhes || {},
      lotesDetalhes: data.lotesDetalhes || {},
      lotesPastoMap: data.lotesPastoMap || {},
      individuos: (data.individuos && data.individuos.length > 0)
        ? data.individuos
        : (await getCadastroData(CACHE_KEYS.PASTOS_LOTES))?.individuos || [],
    }, currentFazendaId || undefined)
    await saveCadastroData(CACHE_KEYS.SUPLEMENTACAO, {
      mineral: data.mineral,
      proteinado: data.proteinado,
      racao: data.racao,
      insumos: data.insumos,
    }, currentFazendaId || undefined)

    // Emitir evento para notificar que o cache foi atualizado
    eventBus.emit(CADASTRO_CACHE_UPDATED, data)
  } catch (error) {
    console.error('Erro ao salvar no cache:', error)
  }
}

/**
 * Busca dados de cadastro da API (apenas quando online e após sync)
 * Usa endpoints batch para reduzir número de requisições
 */
async function fetchCadastroData(cadastroSheetUrl: string, fazendaId?: string): Promise<CadastroCacheData> {
  try {
    if (fazendaId) {
      // Buscar do Supabase
      console.log('[CadastroCache] Buscando dados do Supabase para fazenda:', fazendaId)
      
      const [pastosData, lotesData, frigorificosData, causasMorteData, bebedourosData, fornecedoresData, funcionariosData, individuosData, mineralData, proteinadoData, racaoData, insumosData] = await Promise.all([
        supabaseService.getPastos(fazendaId),
        supabaseService.getLotes(fazendaId),
        supabaseService.getFrigorificos(fazendaId),
        supabaseService.getCausasMorte(fazendaId),
        supabaseService.getBebedouros(fazendaId),
        supabaseService.getFornecedores(fazendaId),
        supabaseService.getFuncionarios(fazendaId),
        supabaseService.getIndividuos(fazendaId, 100),
        supabaseService.getMineral(fazendaId),
        supabaseService.getProteinado(fazendaId),
        supabaseService.getRacao(fazendaId),
        supabaseService.getInsumos(fazendaId)
      ])

      const pastos = pastosData?.map((p: any) => p.nome) || []
      const lotes = lotesData?.map((l: any) => l.nome) || []
      const pastoNomeById: Record<string, string> = {}
      pastosData?.forEach((p: any) => { pastoNomeById[p.id] = p.nome })
      const lotesPastoMap: Record<string, string> = {}
      lotesData?.forEach((l: any) => { lotesPastoMap[l.nome] = pastoNomeById[l.pasto_id] || '' })
      const frigorificos = frigorificosData?.map((f: any) => f.nome) || []
      const causasMorte = causasMorteData?.map((c: any) => c.nome) || []
      const bebedouros = bebedourosData?.map((b: any) => b.nome) || []
      const fornecedores = fornecedoresData?.map((f: any) => f.nome) || []
      const funcionarios = funcionariosData?.map((f: any) => f.nome) || []

      // Cache separado dos funcionários com acesso ao app (para RBAC offline)
      try {
        await fetchFuncionariosComAcesso(fazendaId)
      } catch (err) {
        console.error('[CadastroCache] Erro ao cachear funcionários com acesso:', err)
      }

      // Cache das regras de exibição de checklists
      try {
        await fetchChecklistRegras(fazendaId)
      } catch (err) {
        console.error('[CadastroCache] Erro ao cachear regras de checklist:', err)
      }

      // Cache das rotinas de cadernetas por funcionário
      try {
        await fetchRotinas(fazendaId)
      } catch (err) {
        console.error('[CadastroCache] Erro ao cachear rotinas:', err)
      }

      const individuos = (individuosData || []).map((i: any) => ({
        id: i.id,
        id_manejo: i.id_manejo,
        id_brinco: i.id_brinco,
        id_chip: i.id_chip,
        id_provisorio_cria: i.id_provisorio_cria,
        sexo: i.sexo,
        raca: i.raca,
        categoria: i.categoria,
        classificacao_matriz: i.classificacao_matriz,
        numero_partos: i.numero_partos,
        status: i.status,
      }))
      const mineral = mineralData?.map((m: any) => m.nome) || []
      const proteinado = proteinadoData?.map((p: any) => p.nome) || []
      const racao = racaoData?.map((r: any) => r.nome) || []
      const insumos = insumosData?.map((i: any) => i.nome) || []

      return {
        pastos,
        lotes,
        frigorificos,
        causasMorte,
        bebedouros,
        fornecedores,
        funcionarios,
        pastosDetalhes: {},
        lotesDetalhes: {},
        lotesPastoMap,
        individuos,
        mineral,
        proteinado,
        racao,
        insumos,
      }
    }
    
    // Buscar pastos com detalhes em uma única requisição (endpoint batch)
    const pastosRes = await fetch(`${BACKEND_URL}/api/insumos/pastos-completos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl }),
    })
    const pastosData = await pastosRes.json()
    const pastos = pastosData.success ? pastosData.pastos || [] : []
    const pastosDetalhes = pastosData.success ? pastosData.pastosDetalhes || {} : {}

    // Delay de 500ms entre requisições para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))

    // Buscar lotes com detalhes em uma única requisição (endpoint batch)
    const lotesRes = await fetch(`${BACKEND_URL}/api/insumos/lotes-completos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl }),
    })
    const lotesData = await lotesRes.json()
    const lotes = lotesData.success ? lotesData.lotes || [] : []
    const lotesDetalhes = lotesData.success ? lotesData.lotesDetalhes || {} : {}

    // Delay de 500ms antes de buscar suplementação para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))

    // Buscar dados de suplementação
    const suplementacaoRes = await fetch(`${BACKEND_URL}/api/insumos/suplementacao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl }),
    })
    const suplementacaoData = await suplementacaoRes.json()

    return {
      pastos: pastos,
      lotes: lotes,
      frigorificos: [],
      pastosDetalhes,
      lotesDetalhes,
      mineral: suplementacaoData.mineral || [],
      proteinado: suplementacaoData.proteinado || [],
      racao: suplementacaoData.racao || [],
      insumos: suplementacaoData.insumos || [],
    }
  } catch (error) {
    console.error('[CadastroCache] Erro ao buscar dados da API:', error)
    // Retornar dados vazios em caso de erro para não quebrar o app
    return {
      pastos: [],
      lotes: [],
      frigorificos: [],
      pastosDetalhes: {},
      lotesDetalhes: {},
      mineral: [],
      proteinado: [],
      racao: [],
      insumos: [],
    }
  }
}

/**
 * Atualiza o cache de dados de cadastro
 * Verifica se há sync pendente antes de atualizar para evitar conflitos
 */
export async function updateCadastroCache(cadastroSheetUrl: string, fazendaId?: string): Promise<void> {
  if (!cadastroSheetUrl && !fazendaId) return

  try {
    console.log('[CadastroCache] Iniciando atualização do cache da API...')
    // Verificar se há sync pendente antes de atualizar
    const pendingCount = await (await import('./indexedDB')).countPending()
    if (pendingCount > 0) {
      console.log(`[CadastroCache] Há ${pendingCount} registros pendentes de sync. Aguardando sync antes de atualizar cache.`)
      return
    }

    const data = await fetchCadastroData(cadastroSheetUrl, fazendaId)
    await saveToCache(data)
    cacheData = data
    lastCacheUpdate = Date.now()
    console.log('[CadastroCache] Cache atualizado com sucesso da API:', {
      pastos: data.pastos.length,
      lotes: data.lotes.length,
      frigorificos: data.frigorificos?.length || 0,
      pastosDetalhes: Object.keys(data.pastosDetalhes || {}).length,
      lotesDetalhes: Object.keys(data.lotesDetalhes || {}).length,
      mineral: data.mineral?.length || 0,
      proteinado: data.proteinado?.length || 0,
      racao: data.racao?.length || 0,
      insumos: data.insumos?.length || 0,
    })
  } catch (error) {
    console.error('Erro ao atualizar cache de cadastro:', error)
  }
}

let currentFazendaId: string | null = null

/**
 * Limpa o cache de dados de cadastro (memória e IndexedDB)
 */
export async function clearCadastroCache(): Promise<void> {
  cacheData = null
  lastCacheUpdate = 0
  currentFazendaId = null
  // Limpar também o cache lazy de memória
  for (const key of Object.keys(queryCache)) {
    delete queryCache[key]
  }
  // Limpar o IndexedDB
  try {
    await clearCadastroData()
    console.log('[CadastroCache] IndexedDB limpo')
  } catch (error) {
    console.error('[CadastroCache] Erro ao limpar IndexedDB:', error)
  }
  console.log('[CadastroCache] Cache limpo')
}

/**
 * Inicializa o cache de dados de cadastro
 * Primeiro tenta carregar do IndexedDB, depois atualiza se online
 * Limpa o cache se a fazenda mudou
 */
export async function initializeCadastroCache(cadastroSheetUrl: string, fazendaId?: string): Promise<void> {
  if (!cadastroSheetUrl && !fazendaId) {
    console.log('[CadastroCache] cadastroSheetUrl e fazendaId não disponíveis, pulando inicialização')
    return
  }

  // Limpar cache se a fazenda mudou
  if (fazendaId && currentFazendaId && fazendaId !== currentFazendaId) {
    console.log('[CadastroCache] Fazenda mudou, limpando cache...')
    await clearCadastroCache()
  }

  currentFazendaId = fazendaId || null
  console.log('[CadastroCache] Iniciando inicialização do cache de cadastro...')
  
  // Primeiro carregar do cache (rápido, funciona offline)
  const cached = await loadFromCache()
  if (cached) {
    cacheData = cached
    lastCacheUpdate = Date.now()
    console.log('[CadastroCache] Dados carregados do cache com sucesso')
  } else {
    console.log('[CadastroCache] Nenhum dado no cache, será necessário carregar da API')
  }

  // Carregar detalhes de pastos/lotes persistidos (lazy cache)
  await loadQueryCacheFromIndexedDB()

  // Reconstrução proativa de lotesPastoMap em background.
  // Cobre o caso de cache populado (lotes presentes) mas com mapa degenerado
  // (chaves com valores vazios), sintoma de sync parcial anterior em que
  // getLotes retornou mas getPastos falhou. Sem isso, o usuário veria o pasto
  // como '-' ao abrir uma caderneta, e só se estivesse online naquele momento.
  // Fire-and-forget: não bloqueia a inicialização; a guarda interna de
  // isLotesPastoMapUsable faz a chamada Supabase só disparar quando o mapa
  // está efetivamente inválido, e a persistência o torna auto-limitante.
  if (cached && fazendaId) {
    ensureLotesPastoMap(cached, fazendaId).catch((e) => {
      console.warn('[CadastroCache] Reconstrução proativa de lotesPastoMap falhou:', e)
    })
  }

  // Auto-sync: se cache vazio e online, buscar do Supabase em background
  // Garante que na primeira instalação o cache seja populado sem precisar clicar "Atualizar Dados"
  if (!cached && fazendaId && navigator.onLine) {
    console.log('[CadastroCache] Cache vazio e online. Iniciando auto-sync em background...')
    try {
      const result = await syncAllCadastroData(fazendaId)
      if (result.success) {
        console.log('[CadastroCache] Auto-sync concluído com sucesso')
      } else {
        console.warn('[CadastroCache] Auto-sync concluído com erros:', result.errors)
      }
    } catch (error) {
      console.error('[CadastroCache] Erro no auto-sync:', error)
    }
  }

  console.log('[CadastroCache] Inicialização concluída.')
}

/**
 * Inicia polling para atualizar cache em foreground (30 minutos)
 * Rede de segurança para sessões longas; o botão "Atualizar Dados" permanece como ação manual
 */
export function startCadastroCachePolling(cadastroSheetUrl: string, fazendaId?: string): void {
  if (pollingInterval) {
    clearInterval(pollingInterval)
  }

  console.log('[CadastroCache] Iniciando polling de 30 minutos para atualização do cache')
  pollingInterval = window.setInterval(async () => {
    if (navigator.onLine && (cadastroSheetUrl || fazendaId)) {
      console.log('[CadastroCache] Polling: atualizando cache...')
      await updateCadastroCache(cadastroSheetUrl, fazendaId)
    }
  }, CACHE_EXPIRY_MS)
}

/**
 * Para o polling do cache
 */
export function stopCadastroCachePolling(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

/**
 * Retorna os dados em cache (ordenados alfabeticamente)
 * Se não houver dados em memória, tenta carregar do IndexedDB
 */
/**
 * Deduplica e ordena alfabeticamente uma lista de strings.
 * Necessário porque lotes podem compartilhar nome (ex.: múltiplos lotes
 * ativos chamados "Lote 147" no mesmo pasto) e os seletores não devem
 * exibir entradas repetidas.
 */
function dedupSorted(list: string[] | undefined): string[] {
  return Array.from(new Set(list || [])).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export async function getCachedCadastroData(): Promise<CadastroCacheData | null> {
  // Se já tem dados em memória, retorna
  if (cacheData) {
    return {
      pastos: dedupSorted(cacheData.pastos),
      lotes: dedupSorted(cacheData.lotes),
      frigorificos: dedupSorted(cacheData.frigorificos),
      causasMorte: dedupSorted(cacheData.causasMorte),
      bebedouros: dedupSorted(cacheData.bebedouros),
      fornecedores: dedupSorted(cacheData.fornecedores),
      funcionarios: dedupSorted(cacheData.funcionarios),
      formulacoes: dedupSorted(cacheData.formulacoes),
      mineral: dedupSorted(cacheData.mineral),
      proteinado: dedupSorted(cacheData.proteinado),
      racao: dedupSorted(cacheData.racao),
      insumos: dedupSorted(cacheData.insumos),
      pastosDetalhes: cacheData.pastosDetalhes || {},
      lotesDetalhes: cacheData.lotesDetalhes || {},
      lotesPastoMap: cacheData.lotesPastoMap || {},
      individuos: cacheData.individuos || [],
    }
  }

  // Se não tem dados em memória, tenta carregar do IndexedDB
  const cached = await loadFromCache()
  if (cached) {
    cacheData = cached
    lastCacheUpdate = Date.now()
    return {
      pastos: dedupSorted(cached.pastos),
      lotes: dedupSorted(cached.lotes),
      frigorificos: dedupSorted(cached.frigorificos),
      causasMorte: dedupSorted(cached.causasMorte),
      bebedouros: dedupSorted(cached.bebedouros),
      fornecedores: dedupSorted(cached.fornecedores),
      funcionarios: dedupSorted(cached.funcionarios),
      formulacoes: dedupSorted(cached.formulacoes),
      mineral: dedupSorted(cached.mineral),
      proteinado: dedupSorted(cached.proteinado),
      racao: dedupSorted(cached.racao),
      insumos: dedupSorted(cached.insumos),
      pastosDetalhes: cached.pastosDetalhes || {},
      lotesDetalhes: cached.lotesDetalhes || {},
      lotesPastoMap: cached.lotesPastoMap || {},
      individuos: cached.individuos || [],
    }
  }

  return null
}

/**
 * Retorna lotes ativos (ativo=true) com o mapa lote→pasto.
 * Quando online, busca sempre do Supabase (getLotes filtra ativo=true)
 * para garantir que lotes recém-inativados não apareçam nos seletores.
 * Quando offline, cai no cache em memória/IndexedDB.
 */
export async function getLotesAtivosCached(
  fazendaId: string
): Promise<{ lotes: string[]; lotesPastoMap: Record<string, string> }> {
  if (navigator.onLine) {
    try {
      const [lotesData, pastosData] = await Promise.all([
        supabaseService.getLotes(fazendaId),
        supabaseService.getPastos(fazendaId),
      ])
      const lotes = Array.from(new Set(lotesData?.map((l: any) => l.nome) || []))
      const pastoNomeById: Record<string, string> = {}
      pastosData?.forEach((p: any) => { pastoNomeById[p.id] = p.nome })
      const lotesPastoMap: Record<string, string> = {}
      lotesData?.forEach((l: any) => { lotesPastoMap[l.nome] = pastoNomeById[l.pasto_id] || '' })
      return { lotes, lotesPastoMap }
    } catch (error) {
      console.error('[CadastroCache] Erro ao buscar lotes ativos do Supabase, usando cache:', error)
    }
  }
  // Fallback offline ou erro
  const cache = await getCachedCadastroData()
  return {
    lotes: dedupSorted(cache?.lotes),
    lotesPastoMap: cache?.lotesPastoMap || {},
  }
}

/**
 * Verifica se o cache precisa ser atualizado
 */
export function needsCacheUpdate(): boolean {
  return !cacheData || Date.now() - lastCacheUpdate > CACHE_EXPIRY_MS
}

/**
 * Verifica se lotesPastoMap está em estado utilizável.
 * Considera inválido quando:
 *  - não existe
 *  - está vazio (sem chaves)
 *  - tem chaves mas todos os valores são string vazia (estado degenerado
 *    gerado por sync parcial em que getLotes retornou mas getPastos falhou)
 *
 * Retorna true apenas quando há pelo menos um valor não-vazio, o que indica
 * que pastos foram carregados e o mapeamento é confiável.
 */
function isLotesPastoMapUsable(map: Record<string, string> | undefined): boolean {
  if (!map) return false
  const keys = Object.keys(map)
  if (keys.length === 0) return false
  // Estado degenerado: chaves presentes mas nenhum pasto resolvido.
  // Reconstruir para evitar exibir '-' onde deveria haver pasto.
  return keys.some(k => map[k] && map[k].trim() !== '')
}

/**
 * Garante que lotesPastoMap esteja populado e utilizável.
 *
 * Reconstrói o mapa quando ele está ausente, vazio, ou degenerado
 * (chaves presentes mas valores vazios, sintoma de sync parcial em que
 * getLotes retornou mas getPastos falhou/retornou vazio).
 *
 * A reconstrução tenta a chamada ao Supabase independentemente da flag
 * navigator.onLine (notoriamente flaky em WebView de Android/iOS); em caso
 * de falha de rede, o catch retorna o mapa existente como fallback.
 *
 * Após reconstrução bem-sucedida, atualiza cache em memória, persiste no
 * IndexedDB e emite CADASTRO_CACHE_UPDATED para que páginas já montadas
 * atualizem seu estado local.
 */
export async function ensureLotesPastoMap(
  cache: CadastroCacheData,
  fazendaId?: string
): Promise<Record<string, string>> {
  if (isLotesPastoMapUsable(cache.lotesPastoMap)) {
    return cache.lotesPastoMap as Record<string, string>
  }
  if (!fazendaId) {
    return cache.lotesPastoMap || {}
  }
  try {
    const [lotesData, pastosData] = await Promise.all([
      supabaseService.getLotes(fazendaId),
      supabaseService.getPastos(fazendaId),
    ])
    const pastoNomeById: Record<string, string> = {}
    pastosData?.forEach((p: any) => { pastoNomeById[p.id] = p.nome })
    const mapa: Record<string, string> = {}
    lotesData?.forEach((l: any) => { mapa[l.nome] = pastoNomeById[l.pasto_id] || '' })

    // Só considerar a reconstrução válida se ela própria for utilizável.
    // Caso contrário (ex.: getPastos ainda retornou vazio), preservar o
    // estado anterior para não piorar a situação.
    if (!isLotesPastoMapUsable(mapa)) {
      console.warn('[CadastroCache] Reconstrução de lotesPastoMap resultou em mapa não utilizável, mantendo estado anterior')
      return cache.lotesPastoMap || mapa
    }

    // Atualizar cache em memória para próximas chamadas
    if (cacheData) {
      cacheData.lotesPastoMap = mapa
    }
    // Sincronizar também o objeto cache recebido por parâmetro, para que
    // o caller (ex.: loadData da página) use o mapa reconstruído.
    cache.lotesPastoMap = mapa

    // Persistir no IndexedDB para próximas sessões
    try {
      const existing = await getCadastroData(CACHE_KEYS.PASTOS_LOTES)
      if (existing) {
        await saveCadastroData(CACHE_KEYS.PASTOS_LOTES, { ...existing, lotesPastoMap: mapa }, currentFazendaId || undefined)
      }
    } catch (e) {
      console.warn('[CadastroCache] Falha ao persistir lotesPastoMap reconstruído:', e)
    }

    // Notificar páginas já montadas para que atualizem seu estado local.
    // Reaproveita o payload do cache em memória (já atualizado) para que os
    // assinantes recebam lotes, funcionarios, etc. consistentes com o mapa.
    if (cacheData) {
      eventBus.emit(CADASTRO_CACHE_UPDATED, cacheData)
    }

    return mapa
  } catch (error) {
    console.error('[CadastroCache] Falha ao reconstruir lotesPastoMap:', error)
    return cache.lotesPastoMap || {}
  }
}

/**
 * Busca detalhes de um pasto específico do cache
 */
export function getPastoDetalhes(pasto: string): PastoDetalhes | null {
  if (!cacheData?.pastosDetalhes) return null
  return cacheData.pastosDetalhes[pasto] || null
}

/**
 * Busca detalhes de um lote específico do cache
 */
export function getLoteDetalhes(lote: string): LoteDetalhes | null {
  if (!cacheData?.lotesDetalhes) return null
  return cacheData.lotesDetalhes[lote] || null
}

// ==================== CACHE LAZY PARA QUERIES ESPECÍFICAS ====================
// Permite funcionamento offline para buscas de detalhes individuais
// Sem TTL: o cache persiste até ser explicitamente atualizado pelo botão "Atualizar Dados"

const queryCache: Record<string, { data: any; timestamp: number }> = {}

function getCachedQuery<T>(key: string): T | null {
  const entry = queryCache[key]
  if (!entry) return null
  return entry.data as T
}

function setCachedQuery(key: string, data: any): void {
  queryCache[key] = { data, timestamp: Date.now() }
}

function buildKey(base: string, ...segments: string[]): string {
  return `${base}:${segments.join(':')}`
}

export function clearCachedQuery(key: string): void {
  delete queryCache[key]
}

export function buildCacheKey(base: string, ...segments: string[]): string {
  return buildKey(base, ...segments)
}

/**
 * Busca pasto por nome com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getPastoByNomeCached(fazendaId: string, nome: string): Promise<any | null> {
  const key = buildKey('pasto', fazendaId, nome)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return cached || null
  }

  try {
    const data = await supabaseService.getPastoByNome(fazendaId, nome)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca lote por nome com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getLoteByNomeCached(fazendaId: string, nome: string): Promise<any | null> {
  const key = buildKey('lote', fazendaId, nome)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return cached || null
  }

  try {
    const data = await supabaseService.getLoteByNome(fazendaId, nome)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca detalhes completos do lote (com categorias) com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getLoteDetalhesComCategoriasCached(loteId: string): Promise<any | null> {
  const key = buildKey('lote-detalhes', loteId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return cached || null
  }

  try {
    const data = await supabaseService.getLoteDetalhesComCategorias(loteId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca parâmetros do plano nutricional ativo de um lote com cache lazy.
 * Usado para calcular peso projetado na data do registro.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getPlanoNutricionalAtivoByLoteIdCached(loteId: string): Promise<any | null> {
  const key = buildKey('plano-nutricional-ativo', loteId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return cached || null
  }

  try {
    const data = await supabaseService.getPlanoNutricionalAtivoByLoteId(loteId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca lotes por ID do pasto com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getLotesByPastoIdCached(fazendaId: string, pastoId: string): Promise<any[] | null> {
  const key = buildKey('lotes-pasto', fazendaId, pastoId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return (cached && Array.isArray(cached)) ? cached : null
  }

  try {
    const data = await supabaseService.getLotesByPastoId(fazendaId, pastoId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca última data de entrada do pasto com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getUltimaDataPastoEntradaCached(fazendaId: string, pastoId: string): Promise<any | null> {
  const key = buildKey('ultima-entrada', fazendaId, pastoId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return cached || null
  }

  try {
    const data = await supabaseService.getUltimaDataPastoEntrada(fazendaId, pastoId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca última data de saída do pasto com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getUltimaDataPastoSaidaCached(fazendaId: string, pastoId: string): Promise<any | null> {
  const key = buildKey('ultima-saida', fazendaId, pastoId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return cached || null
  }

  try {
    const data = await supabaseService.getUltimaDataPastoSaida(fazendaId, pastoId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca último status do pasto com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getUltimoStatusPastoCached(fazendaId: string, pastoId: string): Promise<any | null> {
  const key = buildKey('ultimo-status', fazendaId, pastoId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return cached || null
  }

  try {
    const data = await supabaseService.getUltimoStatusPasto(fazendaId, pastoId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca ocupação atual do lote/pasto com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getOcupacaoAtualPorLotePastoCached(loteId: string, pastoId: string): Promise<any | null> {
  const key = buildKey('ocupacao', loteId, pastoId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return cached || null
  }

  try {
    const data = await supabaseService.getOcupacaoAtualPorLotePasto(loteId, pastoId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca ocupação atual do lote/módulo com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getOcupacaoAtualPorLoteModuloCached(loteId: string, moduloId: string): Promise<any | null> {
  const key = buildKey('ocupacao-modulo', loteId, moduloId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return cached || null
  }

  try {
    const data = await supabaseService.getOcupacaoAtualPorLoteModulo(loteId, moduloId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca formulação por nome com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getFormulacaoByNomeCached(fazendaId: string, nome: string): Promise<any | null> {
  const key = buildKey('formulacao', fazendaId, nome)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return cached || null
  }

  try {
    const data = await supabaseService.getFormulacaoByNome(fazendaId, nome)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}


/**
 * Busca registros de suplementação por lote.
 * Sempre vai ao Supabase quando online (dados dinâmicos críticos).
 * Usa cache apenas como fallback offline.
 */
export async function getRegistrosSuplementacaoByLoteCached(fazendaId: string, loteId: string): Promise<any | null> {
  const key = buildKey('suplementacao-lote', fazendaId, loteId)
  const cached = getCachedQuery(key)

  if (!navigator.onLine) return cached || null

  try {
    const data = await supabaseService.getRegistrosSuplementacaoByLote(fazendaId, loteId)
    if (data && Array.isArray(data) && data.length > 0) setCachedQuery(key, data)
    return data
  } catch {
    return cached || null
  }
}

/**
 * Busca configuração de notas de leitura de cocho por fazenda.
 * Sempre vai ao Supabase quando online. Usa cache apenas como fallback offline.
 */
export async function getNotasLeituraCochoConfigCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('notas-leitura-cocho-config', fazendaId)
  const cached = getCachedQuery(key) as any[] | null

  if (!navigator.onLine) return cached || null

  try {
    const data = await supabaseService.getNotasLeituraCochoConfig(fazendaId)
    if (data && Array.isArray(data) && data.length > 0) setCachedQuery(key, data)
    return data
  } catch {
    return cached || null
  }
}

/**
 * Busca registros de leitura de cocho por lote.
 * Sempre vai ao Supabase quando online (dados dinâmicos críticos).
 * Usa cache apenas como fallback offline.
 */
export async function getRegistrosLeituraCochoByLoteCached(
  fazendaId: string,
  loteId: string,
  dataInicio?: string,
  dataFim?: string
): Promise<any | null> {
  const key = buildKey('leitura-cocho-lote', fazendaId, loteId, dataInicio || '', dataFim || '')
  const cached = getCachedQuery(key)

  if (!navigator.onLine) return cached || null

  try {
    const data = await supabaseService.getRegistrosLeituraCochoByLote(fazendaId, loteId, dataInicio, dataFim)
    if (data && Array.isArray(data) && data.length > 0) setCachedQuery(key, data)
    return data
  } catch {
    return cached || null
  }
}

/**
 * Busca o total de kg do último dia de tratos para um lote (sistema de confinamento).
 * Retorna { data, total_kg } ou null.
 */
export async function getUltimoTratoTotalByLoteCached(
  fazendaId: string,
  loteId: string
): Promise<{ data: string; total_kg: number } | null> {
  const key = buildKey('ultimo-trato-lote', fazendaId, loteId)
  const cached = getCachedQuery(key) as { data: string; total_kg: number } | null

  if (!navigator.onLine) return cached || null

  try {
    const data = await supabaseService.getUltimoTratoTotalByLote(fazendaId, loteId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return cached || null
  }
}

/**
 * Tipos de programação de tratos ativos para a fazenda (engorda, sequestro).
 */
export async function getTiposProgramacaoTratosCached(fazendaId: string): Promise<string[]> {
  const key = buildKey('tipos-programacao-tratos', fazendaId)
  const cached = getCachedQuery(key) as string[] | null

  if (!navigator.onLine) return cached || []

  try {
    const data = await supabaseService.getTiposProgramacaoTratos(fazendaId)
    if (data && data.length > 0) setCachedQuery(key, data)
    return data || []
  } catch {
    return cached || []
  }
}

/**
 * Programação de tratos completa (programacao + percentuais + currais) por tipo.
 * Crítico para funcionamento offline da TratoConfinamentoPage.
 */
export async function getProgramacaoTratosCompletaCached(fazendaId: string, tipo: string): Promise<any> {
  const key = buildKey('programacao-tratos', fazendaId, tipo)
  const cached = getCachedQuery(key)

  if (!navigator.onLine) return cached || null

  try {
    const data = await supabaseService.getProgramacaoTratosCompleta(fazendaId, tipo)
    if (data && data.programacao) setCachedQuery(key, data)
    return data
  } catch {
    return cached || null
  }
}

/**
 * Registros de oferta de trato de toda a fazenda em uma data específica.
 * Usado pela TratoConfinamentoPage para contar tratos já feitos no dia.
 */
export async function getRegistrosOfertaTratoByFazendaDataCached(
  fazendaId: string,
  data: string
): Promise<any[]> {
  const key = buildKey('registros-trato-fazenda-data', fazendaId, data)
  const cached = getCachedQuery(key) as any[] | null

  if (!navigator.onLine) return cached || []

  try {
    const dataResult = await supabaseService.getRegistrosOfertaTratoByFazendaData(fazendaId, data)
    if (dataResult && dataResult.length > 0) setCachedQuery(key, dataResult)
    return dataResult || []
  } catch {
    return cached || []
  }
}

/**
 * Registros de oferta de trato anteriores à data de referência para um curral.
 * Usado para determinar dia 1 vs dia 2+ e calcular total real do dia anterior.
 */
export async function getRegistrosOfertaTratoAnterioresCached(
  fazendaId: string,
  curralId: string,
  dataReferencia: string
): Promise<any[]> {
  const key = buildKey('registros-trato-anteriores', fazendaId, curralId, dataReferencia)
  const cached = getCachedQuery(key) as any[] | null

  if (!navigator.onLine) return cached || []

  try {
    const data = await supabaseService.getRegistrosOfertaTratoAnteriores(fazendaId, curralId, dataReferencia)
    if (data && data.length > 0) setCachedQuery(key, data)
    return data || []
  } catch {
    return cached || []
  }
}

/**
 * Busca último rodeio do lote com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getLastRodeioDateCached(fazendaId: string, loteId: string): Promise<any | null> {
  const key = buildKey('ultimo-rodeio', fazendaId, loteId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return cached || null
  }

  try {
    const data = await supabaseService.getLastRodeioDate(loteId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca contagem de partos da vaca com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getContagemPartosVacaCached(fazendaId: string, idVaca: string): Promise<any | null> {
  const key = buildKey('partos-vaca', fazendaId, idVaca)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return cached || null
  }

  try {
    const data = await supabaseService.getContagemPartosVaca(fazendaId, idVaca)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca medicamentos com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getMedicamentosCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('medicamentos', fazendaId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return (cached && Array.isArray(cached)) ? cached : null
  }

  try {
    const data = await supabaseService.getMedicamentos(fazendaId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca tratamentos com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getTratamentosCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('tratamentos', fazendaId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return (cached && Array.isArray(cached)) ? cached : null
  }

  try {
    const data = await supabaseService.getTratamentos(fazendaId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca raças com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getRacasCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('racas', fazendaId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return (cached && Array.isArray(cached)) ? cached : null
  }

  try {
    const data = await supabaseService.getRacas(fazendaId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca causas de morte com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getCausasMorteCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('causas-morte', fazendaId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return (cached && Array.isArray(cached)) ? cached : null
  }

  try {
    const data = await supabaseService.getCausasMorte(fazendaId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca pluviômetros com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getPluviometrosCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('pluviometros', fazendaId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return (cached && Array.isArray(cached)) ? cached : null
  }

  try {
    const data = await supabaseService.getPluviometros(fazendaId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca máquinas/veículos com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getMaquinasVeiculosCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('maquinas-veiculos', fazendaId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return (cached && Array.isArray(cached)) ? cached : null
  }

  try {
    const data = await supabaseService.getMaquinasVeiculos(fazendaId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca implementos com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getImplementosCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('implementos', fazendaId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return (cached && Array.isArray(cached)) ? cached : null
  }

  try {
    const data = await supabaseService.getImplementos(fazendaId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca itens de supermercado (cantina) com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getItensSupermercadoCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('itens-supermercado', fazendaId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return (cached && Array.isArray(cached)) ? cached : null
  }

  try {
    const data = await supabaseService.getItensSupermercado(fazendaId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca setores com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getSetoresCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('setores', fazendaId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return (cached && Array.isArray(cached)) ? cached : null
  }

  try {
    const data = await supabaseService.getSetores(fazendaId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca locais com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getLocaisCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('locais', fazendaId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return (cached && Array.isArray(cached)) ? cached : null
  }

  try {
    const data = await supabaseService.getLocais(fazendaId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca classificações de almoxarifado com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getClassificacoesAlmoxarifadoCached(fazendaId: string): Promise<string[] | null> {
  const key = buildKey('classificacoes-almoxarifado', fazendaId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return (cached && Array.isArray(cached)) ? cached as string[] : null
  }

  try {
    const data = await supabaseService.getClassificacoesAlmoxarifado(fazendaId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca itens de almoxarifado por classificação com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getItensAlmoxarifadoCached(fazendaId: string, classificacao: string): Promise<any[] | null> {
  const key = buildKey('itens-almoxarifado', fazendaId, classificacao)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return (cached && Array.isArray(cached)) ? cached : null
  }

  try {
    const data = await supabaseService.getItensAlmoxarifado(fazendaId, classificacao)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca lista de currais (confinamento) com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getCurraisCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('currais', fazendaId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return (cached && Array.isArray(cached)) ? cached : null
  }

  try {
    const data = await supabaseService.getCurrais(fazendaId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca fazendas do mesmo grupo com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getFazendasDoMesmoGrupoCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('fazendas-grupo', fazendaId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return (cached && Array.isArray(cached)) ? cached : null
  }

  try {
    const data = await supabaseService.getFazendasDoMesmoGrupo(fazendaId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca lista de linhas de confinamento com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getLinhasConfinamentoCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('linhas-confinamento', fazendaId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return (cached && Array.isArray(cached)) ? cached : null
  }

  try {
    const data = await supabaseService.getLinhasConfinamento(fazendaId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca lista de bebedouros com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getBebedourosCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('bebedouros', fazendaId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return (cached && Array.isArray(cached)) ? cached : null
  }

  try {
    const data = await supabaseService.getBebedouros(fazendaId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca bebedouro por nome com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getBebedouroByNomeCached(fazendaId: string, nome: string): Promise<any | null> {
  const key = buildKey('bebedouro', fazendaId, nome)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return cached || null
  }

  try {
    const data = await supabaseService.getBebedouroByNome(fazendaId, nome)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca última data de limpeza de bebedouro com cache lazy.
 * TTL curto: dado dinâmico (muda a cada limpeza registrada).
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getUltimaDataLimpezaBebedouroCached(fazendaId: string, bebedouroId: string): Promise<string | null> {
  const key = buildKey('ultima-limpeza-bebedouro', fazendaId, bebedouroId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return (cached !== undefined && cached !== null) ? cached as string : null
  }

  try {
    const data = await supabaseService.getUltimaDataLimpezaBebedouro(fazendaId, bebedouroId)
    setCachedQuery(key, data ?? '')
    return data
  } catch {
    return null
  }
}

/**
 * Busca intervalo médio de limpezas do bebedouro com cache lazy.
 * Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getIntervaloMedioLimpezasCached(fazendaId: string, bebedouroId: string): Promise<number> {
  const key = buildKey('intervalo-limpeza-bebedouro', fazendaId, bebedouroId)

  if (!navigator.onLine) {
    const cached = getCachedQuery(key)
    return (cached !== undefined && cached !== null) ? cached as number : 0
  }

  try {
    const data = await supabaseService.getIntervaloMedioLimpezas(fazendaId, bebedouroId)
    setCachedQuery(key, data)
    return data
  } catch {
    return 0
  }
}

/**
 * Aquece o cache com todos os detalhes de pastos e lotes.
 * Deve ser chamado explicitamente quando o usuário clica em "Atualizar Dados"
 * ou quando há internet e se quer garantir funcionamento 100% offline.
 */
export async function warmAllCadastroCache(
  fazendaId: string,
  onProgress?: (current: number, total: number, item: string) => void,
  pastosData?: any[],
  lotesData?: any[],
  resumeCheckpoint?: { phase: string; index: number } | null
): Promise<{ success: boolean; warmedPastos: number; warmedLotes: number; warmedFormulacoes: number; warmedLotesRodeio: number; warmedMedicamentos: number; warmedTratamentos: number; warmedExtras: number; errors: string[] }> {
  const errors: string[] = []
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  // Helper: persistir lazy cache e atualizar checkpoint periodicamente
  const WARM_SAVE_INTERVAL = 10 // persistir a cada 10 itens processados
  let itemsSinceLastSave = 0
  const persistProgress = async (phase: string, index: number) => {
    itemsSinceLastSave++
    if (itemsSinceLastSave >= WARM_SAVE_INTERVAL) {
      await saveQueryCacheToIndexedDB()
      await saveSyncCheckpoint({
        fazendaId,
        syncStepsCompleted: 10, // todos os steps de lista já concluídos
        warmPhase: phase,
        warmPhaseIndex: index,
        timestamp: Date.now(),
      })
      itemsSinceLastSave = 0
    }
  }

  // Determinar ponto de retomada
  const resumePhase = resumeCheckpoint?.phase ?? null
  const resumeIndex = resumeCheckpoint?.index ?? 0
  // Fases em ordem: pastos, lotes, formulacoes, rodeio, medicamentos, tratamentos, extras, almoxarifado, bebedouros, tratos
  const phaseOrder = ['pastos', 'lotes', 'formulacoes', 'rodeio', 'medicamentos', 'tratamentos', 'extras', 'almoxarifado', 'bebedouros', 'tratos']
  const shouldSkip = (phase: string) => {
    if (!resumePhase) return false
    const resumeOrder = phaseOrder.indexOf(resumePhase)
    const currentOrder = phaseOrder.indexOf(phase)
    return currentOrder < resumeOrder
  }
  const shouldSkipItem = (phase: string, index: number) => {
    if (!resumePhase) return false
    if (phase !== resumePhase) return false
    return index < resumeIndex
  }

  // Usar listas fornecidas ou buscar do Supabase
  let pastos: any[] = pastosData || []
  let lotes: any[] = lotesData || []
  let formulacoes: any[] = []

  if (!pastosData || !lotesData) {
    try {
      const [fetchedPastos, fetchedLotes, fetchedFormulacoes] = await Promise.all([
        supabaseService.getPastos(fazendaId),
        supabaseService.getLotes(fazendaId),
        supabaseService.getFormulacoes(fazendaId)
      ])
      pastos = fetchedPastos || []
      lotes = fetchedLotes || []
      formulacoes = fetchedFormulacoes || []
    } catch (error) {
      console.error('[CadastroCache] Erro ao buscar listas para warm cache:', error)
      return { success: false, warmedPastos: 0, warmedLotes: 0, warmedFormulacoes: 0, warmedLotesRodeio: 0, warmedMedicamentos: 0, warmedTratamentos: 0, warmedExtras: 0, errors: ['Falha ao buscar listas de pastos/lotes/formulacoes'] }
    }
  } else {
    // Se pastos/lotes foram fornecidos, buscar formulações separadamente
    try {
      formulacoes = await supabaseService.getFormulacoes(fazendaId)
    } catch (error) {
      console.error('[CadastroCache] Erro ao buscar formulações:', error)
      formulacoes = []
    }
  }

  const totalItems = pastos.length + lotes.length + formulacoes.length + lotes.length + 17 // +extras (12 originais + itens almoxarifado + detalhes bebedouros + currais + linhas + RBAC + checklist + rotinas + notas leitura cocho + fazendas grupo)
  let warmedPastos = 0
  let warmedLotes = 0
  let warmedFormulacoes = 0
  let warmedLotesRodeio = 0
  let warmedMedicamentos = 0
  let warmedTratamentos = 0
  let warmedExtras = 0
  let processed = 0

  // Aquecer pastos: detalhes, lotes, últimas datas, status, ocupação
  if (shouldSkip('pastos')) {
    console.log('[CadastroCache] Pulando fase pastos (já concluída no checkpoint)')
  }
  for (let pi = 0; pi < pastos.length; pi++) {
    const pasto = pastos[pi]
    if (shouldSkip('pastos') || shouldSkipItem('pastos', pi)) continue
    processed++
    onProgress?.(processed, totalItems, `Pasto ${pasto.nome || pasto.id}`)

    try {
      const pastoNome = pasto.nome || pasto.id
      const pastoId = pasto.id || pasto.nome

      // Se temos dados brutos do pasto, guardar diretamente no cache lazy
      if (pasto.id && pastoNome !== pastoId) {
        setCachedQuery(buildKey('pasto', fazendaId, pastoNome), pasto)
      } else {
        await getPastoByNomeCached(fazendaId, pastoNome)
      }
      await delay(100)

      const lotesNoPasto = await getLotesByPastoIdCached(fazendaId, pastoId)
      await delay(100)
      await getUltimaDataPastoEntradaCached(fazendaId, pastoNome)
      await delay(100)
      await getUltimaDataPastoSaidaCached(fazendaId, pastoNome)
      await delay(100)
      await getUltimoStatusPastoCached(fazendaId, pastoNome)
      await delay(100)

      // Aquecer ocupação do módulo para cada lote presente no pasto
      if (pasto.modulo_id && lotesNoPasto && lotesNoPasto.length > 0) {
        for (const lote of lotesNoPasto) {
          if (lote.id) {
            await getOcupacaoAtualPorLoteModuloCached(lote.id, pasto.modulo_id)
            await delay(100)
          }
        }
      }
      warmedPastos++
    } catch (error) {
      console.error(`[CadastroCache] Erro ao aquecer pasto ${pasto.nome || pasto.id}:`, error)
      errors.push(`Pasto ${pasto.nome || pasto.id}`)
    }

    await persistProgress('pastos', pi)
    await delay(300)
  }

  // Aquecer lotes: detalhes com categorias
  for (let li = 0; li < lotes.length; li++) {
    const lote = lotes[li]
    if (shouldSkip('lotes') || shouldSkipItem('lotes', li)) continue
    processed++
    onProgress?.(processed, totalItems, `Lote ${lote.nome || lote.id}`)

    try {
      const loteNome = lote.nome || lote.id
      const loteId = lote.id || lote.nome

      // Se temos dados brutos do lote, guardar diretamente no cache lazy
      if (lote.id && loteNome !== loteId) {
        setCachedQuery(buildKey('lote', fazendaId, loteNome), lote)
      } else {
        await getLoteByNomeCached(fazendaId, loteNome)
      }
      await delay(100)

      await getLoteDetalhesComCategoriasCached(loteId)
      warmedLotes++
    } catch (error) {
      console.error(`[CadastroCache] Erro ao aquecer lote ${lote.nome || lote.id}:`, error)
      errors.push(`Lote ${lote.nome || lote.id}`)
    }

    await persistProgress('lotes', li)
    await delay(300)
  }

  // Aquecer formulações: detalhes, espaçamento ideal, histórico de suplementação
  for (let fi = 0; fi < formulacoes.length; fi++) {
    const formulacao = formulacoes[fi]
    if (shouldSkip('formulacoes') || shouldSkipItem('formulacoes', fi)) continue
    processed++
    onProgress?.(processed, totalItems, `Formulação ${formulacao.nome || formulacao.id}`)

    try {
      const nome = formulacao.nome || formulacao.id

      // Se temos dados brutos da formulação, guardar diretamente no cache lazy
      if (formulacao.id && nome !== formulacao.id) {
        setCachedQuery(buildKey('formulacao', fazendaId, nome), formulacao)
      } else {
        await getFormulacaoByNomeCached(fazendaId, nome)
      }
      await delay(100)

      // Buscar histórico de suplementação para todos os lotes desta formulação
      for (const lote of lotes) {
        await getRegistrosSuplementacaoByLoteCached(fazendaId, lote.id)
        await delay(50)
      }

      warmedFormulacoes++
    } catch (error) {
      console.error(`[CadastroCache] Erro ao aquecer formulação ${formulacao.nome || formulacao.id}:`, error)
      errors.push(`Formulação ${formulacao.nome || formulacao.id}`)
    }

    await persistProgress('formulacoes', fi)
    await delay(300)
  }

  // Aquecer dados de rodeio e leitura de cocho para todos os lotes
  for (let ri = 0; ri < lotes.length; ri++) {
    const lote = lotes[ri]
    if (shouldSkip('rodeio') || shouldSkipItem('rodeio', ri)) continue
    processed++
    onProgress?.(processed, totalItems, `Rodeio/Leitura Lote ${lote.nome || lote.id}`)

    try {
      await getLastRodeioDateCached(fazendaId, lote.id)
      // Aquecer registros de leitura de cocho do lote (sem janela de datas = histórico completo)
      // Crítico para funcionamento offline da LeituraCochoPage
      await getRegistrosLeituraCochoByLoteCached(fazendaId, lote.id)
      // Aquecer último trato de confinamento do lote (para Kg Cocho na LeituraCochoPage)
      await getUltimoTratoTotalByLoteCached(fazendaId, lote.id)
      // Aquecer plano nutricional ativo do lote (para peso projetado na SuplementacaoPage)
      await getPlanoNutricionalAtivoByLoteIdCached(lote.id)
      warmedLotesRodeio++
    } catch (error) {
      console.error(`[CadastroCache] Erro ao aquecer rodeio/leitura do lote ${lote.nome || lote.id}:`, error)
      errors.push(`Rodeio Lote ${lote.nome || lote.id}`)
    }

    await persistProgress('rodeio', ri)
    await delay(300)
  }

  // Aquecer medicamentos (uma única vez)
  if (!shouldSkip('medicamentos')) {
    processed++
    onProgress?.(processed, totalItems, 'Medicamentos')

    try {
      await getMedicamentosCached(fazendaId)
      warmedMedicamentos++
    } catch (error) {
      console.error('[CadastroCache] Erro ao aquecer medicamentos:', error)
      errors.push('Medicamentos')
    }
    await persistProgress('medicamentos', 0)
  }

  // Aquecer tratamentos (uma única vez)
  if (!shouldSkip('tratamentos')) {
    processed++
    onProgress?.(processed, totalItems, 'Tratamentos')

    try {
      await getTratamentosCached(fazendaId)
      warmedTratamentos++
    } catch (error) {
      console.error('[CadastroCache] Erro ao aquecer tratamentos:', error)
      errors.push('Tratamentos')
    }
    await persistProgress('tratamentos', 0)
  }

  // Aquecer dados das demais cadernetas (independentes, uma vez por fazenda)
  const extrasToWarm: { label: string; fn: () => Promise<any> }[] = [
    { label: 'Raças', fn: () => getRacasCached(fazendaId) },
    { label: 'Causas de Morte', fn: () => getCausasMorteCached(fazendaId) },
    { label: 'Pluviômetros', fn: () => getPluviometrosCached(fazendaId) },
    { label: 'Máquinas/Veículos', fn: () => getMaquinasVeiculosCached(fazendaId) },
    { label: 'Implementos', fn: () => getImplementosCached(fazendaId) },
    { label: 'Itens Supermercado', fn: () => getItensSupermercadoCached(fazendaId) },
    { label: 'Setores', fn: () => getSetoresCached(fazendaId) },
    { label: 'Locais', fn: () => getLocaisCached(fazendaId) },
    { label: 'Classificações Almoxarifado', fn: () => getClassificacoesAlmoxarifadoCached(fazendaId) },
    { label: 'Bebedouros', fn: () => getBebedourosCached(fazendaId) },
    { label: 'Currais (Confinamento)', fn: () => getCurraisCached(fazendaId) },
    { label: 'Linhas Confinamento', fn: () => getLinhasConfinamentoCached(fazendaId) },
    // RBAC / checklists / rotinas — críticos para login de peões e exibição offline
    { label: 'Funcionários com Acesso (RBAC)', fn: () => fetchFuncionariosComAcesso(fazendaId) },
    { label: 'Regras de Checklist', fn: () => fetchChecklistRegras(fazendaId) },
    { label: 'Rotinas de Cadernetas', fn: () => fetchRotinas(fazendaId) },
    { label: 'Notas Leitura Cocho (Config)', fn: () => getNotasLeituraCochoConfigCached(fazendaId) },
    { label: 'Fazendas do Mesmo Grupo', fn: () => getFazendasDoMesmoGrupoCached(fazendaId) },
  ]

  for (let ei = 0; ei < extrasToWarm.length; ei++) {
    const extra = extrasToWarm[ei]
    if (shouldSkip('extras') || shouldSkipItem('extras', ei)) continue
    processed++
    onProgress?.(processed, totalItems, extra.label)
    try {
      await extra.fn()
      warmedExtras++
    } catch (error) {
      console.error(`[CadastroCache] Erro ao aquecer ${extra.label}:`, error)
      errors.push(extra.label)
    }
    await persistProgress('extras', ei)
    await delay(200)
  }

  // Aquecer itens de almoxarifado por classificação
  if (!shouldSkip('almoxarifado')) {
    try {
      processed++
      onProgress?.(processed, totalItems, 'Itens Almoxarifado')
      const classificacoes = await getClassificacoesAlmoxarifadoCached(fazendaId)
      if (classificacoes && classificacoes.length > 0) {
        for (const classificacao of classificacoes) {
          await getItensAlmoxarifadoCached(fazendaId, classificacao)
          await delay(100)
        }
        warmedExtras++
      }
    } catch (error) {
      console.error('[CadastroCache] Erro ao aquecer itens almoxarifado:', error)
      errors.push('Itens Almoxarifado')
    }
    await persistProgress('almoxarifado', 0)
  }

  // Aquecer detalhes de bebedouros (última limpeza e intervalo médio por bebedouro)
  if (!shouldSkip('bebedouros')) {
    try {
      processed++
      onProgress?.(processed, totalItems, 'Detalhes Bebedouros')
      const bebedouros = await getBebedourosCached(fazendaId)
      if (bebedouros && bebedouros.length > 0) {
        for (const bebedouro of bebedouros) {
          await getUltimaDataLimpezaBebedouroCached(fazendaId, bebedouro.id)
          await delay(100)
          await getIntervaloMedioLimpezasCached(fazendaId, bebedouro.id)
          await delay(100)
        }
        warmedExtras++
      }
    } catch (error) {
      console.error('[CadastroCache] Erro ao aquecer detalhes de bebedouros:', error)
      errors.push('Detalhes Bebedouros')
    }
    await persistProgress('bebedouros', 0)
  }

  // Aquecer dados de trato de confinamento (programação + registros)
  // Crítico para funcionamento offline da TratoConfinamentoPage
  if (!shouldSkip('tratos')) {
    try {
      processed++
      onProgress?.(processed, totalItems, 'Tratos Confinamento')

      // 1. Tipos de programação ativos
      const tiposProg = await getTiposProgramacaoTratosCached(fazendaId)

      // 2. Programação completa por tipo + registros do dia atual e anterior
      const dataHoje = new Date().toISOString().slice(0, 10)
      const dataOntem = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

      for (const tipo of tiposProg.length > 0 ? tiposProg : ['engorda', 'sequestro']) {
        await delay(100)
        const progCompleta = await getProgramacaoTratosCompletaCached(fazendaId, tipo)
        if (progCompleta && progCompleta.currais) {
          // Aquecer registros do dia atual e anterior para todos os currais da programação
          await getRegistrosOfertaTratoByFazendaDataCached(fazendaId, dataHoje)
          await delay(100)
          await getRegistrosOfertaTratoByFazendaDataCached(fazendaId, dataOntem)
          await delay(100)

          // Aquecer registros anteriores por curral (para cálculo dia 1 vs dia 2+)
          for (const curral of progCompleta.currais) {
            await getRegistrosOfertaTratoAnterioresCached(fazendaId, curral.curral_id, dataHoje)
            await delay(50)
          }
        }
      }
      warmedExtras++
    } catch (error) {
      console.error('[CadastroCache] Erro ao aquecer tratos de confinamento:', error)
      errors.push('Tratos Confinamento')
    }
    await persistProgress('tratos', 0)
  }

  console.log('[CadastroCache] Warm cache completo concluído:', {
    warmedPastos,
    warmedLotes,
    warmedFormulacoes,
    warmedLotesRodeio,
    warmedMedicamentos,
    warmedTratamentos,
    warmedExtras,
    errors: errors.length
  })

  // Persistir no IndexedDB para sobreviver ao fechamento do app
  await saveQueryCacheToIndexedDB()

  return { success: errors.length === 0, warmedPastos, warmedLotes, warmedFormulacoes, warmedLotesRodeio, warmedMedicamentos, warmedTratamentos, warmedExtras, errors }
}

/**
 * Sincroniza todos os dados de cadastro do Supabase em sequência com delay
 * Ordem de dependência: Pastos → Lotes → Indivíduos → Bebedouros → Independentes
 */
export async function syncAllCadastroData(
  fazendaId: string,
  onProgress?: (current: number, total: number, item: string) => void
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = []
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

  // Guard: não atualizar cache se há registros pendentes de sync
  // Evita que o cache seja sobrescrito com dados frescos enquanto
  // registros locais ainda referenciam IDs antigos
  try {
    const pendingCount = await (await import('./indexedDB')).countPending()
    if (pendingCount > 0) {
      console.log(`[CadastroCache] Há ${pendingCount} registros pendentes de sync. Aguardando sync antes de atualizar cache.`)
      return { success: false, errors: ['Há registros pendentes de sincronização. Sincronize os registros antes de atualizar os dados.'] }
    }
  } catch (error) {
    console.warn('[CadastroCache] Não foi possível verificar registros pendentes:', error)
  }

  // Verificar checkpoint para retomar de onde parou
  const checkpoint = await loadSyncCheckpoint(fazendaId)
  const resumeFromStep = checkpoint?.syncStepsCompleted ?? -1
  if (checkpoint) {
    console.log(`[CadastroCache] Checkpoint encontrado: retomando sync do step ${resumeFromStep + 1}, warm phase=${checkpoint.warmPhase}`)
  }

  // Ordem de dependência
  const syncSteps = [
    { name: 'Pastos', fn: () => supabaseService.getPastos(fazendaId) },
    { name: 'Lotes', fn: () => supabaseService.getLotes(fazendaId) },
    { name: 'Indivíduos', fn: () => supabaseService.getIndividuos(fazendaId, 1000) },
    { name: 'Bebedouros', fn: () => supabaseService.getBebedouros(fazendaId) },
    { name: 'Formulações', fn: () => supabaseService.getFormulacoes(fazendaId) },
    { name: 'Funcionários', fn: () => supabaseService.getFuncionarios(fazendaId) },
    { name: 'Máquinas/Veículos', fn: () => supabaseService.getMaquinasVeiculos(fazendaId) },
    { name: 'Insumos', fn: () => supabaseService.getInsumos(fazendaId) },
    { name: 'Frigoríficos', fn: () => supabaseService.getFrigorificos(fazendaId) },
    { name: 'Causas de Morte', fn: () => supabaseService.getCausasMorte(fazendaId) },
    { name: 'Fornecedores', fn: () => supabaseService.getFornecedores(fazendaId) },
  ]

  const result: CadastroCacheData = {
    pastos: [],
    lotes: [],
    frigorificos: [],
    causasMorte: [],
    bebedouros: [],
    fornecedores: [],
    funcionarios: [],
    mineral: [],
    proteinado: [],
    racao: [],
    insumos: [],
    pastosDetalhes: {},
    lotesDetalhes: {},
    individuos: [],
  }

  // Manter dados brutos de pastos e lotes para warm cache
  let rawPastos: any[] = []
  let rawLotes: any[] = []

  for (let i = 0; i < syncSteps.length; i++) {
    const step = syncSteps[i]

    // Pular steps já concluídos (resume de checkpoint)
    if (i <= resumeFromStep) {
      console.log(`[CadastroCache] Pulando step já concluído: ${step.name}`)
      // Recarregar dados brutos necessários para warm cache
      if (step.name === 'Pastos') {
        try { rawPastos = await step.fn() || [] } catch { rawPastos = [] }
        result.pastos = rawPastos.map((p: any) => p.nome)
      } else if (step.name === 'Lotes') {
        try { rawLotes = await step.fn() || [] } catch { rawLotes = [] }
        result.lotes = rawLotes.map((l: any) => l.nome)
      }
      continue
    }

    onProgress?.(i + 1, syncSteps.length, step.name)

    try {
      const data = await step.fn()

      // Mapear dados para o cache
      switch (step.name) {
        case 'Pastos':
          rawPastos = data || []
          result.pastos = rawPastos.map((p: any) => p.nome)
          break
        case 'Lotes':
          rawLotes = data || []
          result.lotes = rawLotes.map((l: any) => l.nome)
          break
        case 'Indivíduos':
          result.individuos = (data || []).map((i: any) => ({
            id: i.id,
            id_manejo: i.id_manejo,
            id_brinco: i.id_brinco,
            id_chip: i.id_chip,
            id_provisorio_cria: i.id_provisorio_cria,
            sexo: i.sexo,
            raca: i.raca,
            categoria: i.categoria,
            classificacao_matriz: i.classificacao_matriz,
            numero_partos: i.numero_partos,
            status: i.status,
          }))
          break
        case 'Bebedouros':
          result.bebedouros = data?.map((b: any) => b.nome) || []
          break
        case 'Formulações':
          result.formulacoes = data?.map((f: any) => f.nome) || []
          break
        case 'Funcionários':
          result.funcionarios = data?.map((f: any) => f.nome) || []
          break
        case 'Máquinas/Veículos':
          // Maquinas não estão no cache atual, mas poderiam ser adicionados
          break
        case 'Insumos':
          result.insumos = data?.map((i: any) => i.nome) || []
          break
        case 'Frigoríficos':
          result.frigorificos = data?.map((f: any) => f.nome) || []
          break
        case 'Causas de Morte':
          result.causasMorte = data?.map((c: any) => c.nome) || []
          break
        case 'Fornecedores':
          result.fornecedores = data?.map((f: any) => f.nome) || []
          break
      }

      console.log(`[CadastroCache] ${step.name} carregados: ${Array.isArray(data) ? data.length : 0}`)

      // Salvar checkpoint após cada step concluído
      await saveSyncCheckpoint({
        fazendaId,
        syncStepsCompleted: i,
        warmPhase: 'none',
        warmPhaseIndex: 0,
        timestamp: Date.now(),
      })
    } catch (error) {
      console.error(`[CadastroCache] Erro ao carregar ${step.name}:`, error)
      errors.push(step.name)
    }

    // Delay entre queries (exceto última)
    if (i < syncSteps.length - 1) {
      await delay(750)
    }
  }

  // Construir lotesPastoMap a partir dos dados brutos de pastos e lotes
  const pastoNomeById: Record<string, string> = {}
  rawPastos.forEach((p: any) => { pastoNomeById[p.id] = p.nome })
  result.lotesPastoMap = {}
  const lotesPastoMap = result.lotesPastoMap
  rawLotes.forEach((l: any) => { lotesPastoMap[l.nome] = pastoNomeById[l.pasto_id] || '' })

  // Salvar no cache
  await saveToCache(result)
  cacheData = result
  lastCacheUpdate = Date.now()

  console.log('[CadastroCache] Sincronização de listas concluída:', {
    success: errors.length === 0,
    errors,
    pastos: result.pastos.length,
    lotes: result.lotes.length,
    lotesPastoMap: Object.keys(result.lotesPastoMap).length,
    individuos: result.individuos?.length || 0,
  })

  // Aquecer cache com todos os detalhes de pastos e lotes
  // Isso garante funcionamento 100% offline após o usuário clicar em "Atualizar Dados"
  if (errors.length === 0) {
    try {
      console.log('[CadastroCache] Iniciando warm cache completo...')
      const warmCheckpoint = checkpoint && checkpoint.warmPhase !== 'none' && checkpoint.warmPhase !== 'done'
        ? { phase: checkpoint.warmPhase, index: checkpoint.warmPhaseIndex }
        : null
      const warmResult = await warmAllCadastroCache(fazendaId, onProgress, rawPastos, rawLotes, warmCheckpoint)
      if (!warmResult.success) {
        errors.push(...warmResult.errors)
      }
    } catch (error) {
      console.error('[CadastroCache] Erro no warm cache:', error)
      errors.push('Warm cache')
    }
  }

  // Limpar checkpoint ao completar com sucesso
  await clearSyncCheckpoint()
  console.log('[CadastroCache] Checkpoint limpo. Sync concluído.')

  return { success: errors.length === 0, errors }
}

/**
 * Busca os pastos vinculados a um bebedouro (via junction pasto_bebedouros)
 * com cache lazy. Quando online, sempre consulta o Supabase (ignora cache).
 * Quando offline, usa o cache.
 */
export async function getPastosByBebedouroCached(
  fazendaId: string,
  bebedouroId: string
): Promise<{ id: string; nome: string }[] | null> {
  const key = buildKey('pastos-by-bebedouro', fazendaId, bebedouroId)

  if (!navigator.onLine) {
    const cached = getCachedQuery<{ id: string; nome: string }[]>(key)
    return cached ?? null
  }

  try {
    const data = await supabaseService.getPastosByBebedouro(fazendaId, bebedouroId)
    setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

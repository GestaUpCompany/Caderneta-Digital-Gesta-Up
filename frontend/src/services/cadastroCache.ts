import { BACKEND_URL } from '../utils/constants'
import { saveCadastroData, getAllCadastroData, getCadastroData } from './indexedDB'
import * as supabaseService from './supabaseService'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../utils/eventBus'

const CACHE_KEYS = {
  PASTOS_LOTES: 'pastos_lotes',
  SUPLEMENTACAO: 'suplementacao',
  FRIGORIFICOS: 'frigorificos',
}

const CACHE_EXPIRY_MS = 10 * 60 * 1000 // 10 minutos

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
  individuos?: { id: string; id_manejo: string | null; id_brinco: string | null; id_chip: string | null; id_provisorio_cria: string | null; sexo: string; raca: string; categoria: string; classificacao_matriz: string | null; numero_partos: number | null; status: string }[]
}

let cacheData: CadastroCacheData | null = null
let lastCacheUpdate: number = 0
let pollingInterval: number | null = null

const QUERY_CACHE_KEY = 'queryCache'

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
 */
export async function loadQueryCacheFromIndexedDB(): Promise<void> {
  try {
    const cached = await getCadastroData(QUERY_CACHE_KEY)
    if (cached?.queryCache) {
      Object.assign(queryCache, cached.queryCache)
      console.log('[CadastroCache] Query cache carregado do IndexedDB:', {
        entries: Object.keys(queryCache).length,
        timestamp: cached.timestamp
      })
    }
  } catch (error) {
    console.error('[CadastroCache] Erro ao carregar query cache do IndexedDB:', error)
  }
}

/**
 * Carrega dados de cadastro do IndexedDB (cache)
 */
export async function loadFromCache(): Promise<CadastroCacheData | null> {
  try {
    const cached = await getAllCadastroData()
    if (cached[CACHE_KEYS.PASTOS_LOTES] || cached[CACHE_KEYS.SUPLEMENTACAO]) {
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
      individuos: data.individuos || [],
    })
    await saveCadastroData(CACHE_KEYS.SUPLEMENTACAO, {
      mineral: data.mineral,
      proteinado: data.proteinado,
      racao: data.racao,
      insumos: data.insumos,
    })

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
      const frigorificos = frigorificosData?.map((f: any) => f.nome) || []
      const causasMorte = causasMorteData?.map((c: any) => c.nome) || []
      const bebedouros = bebedourosData?.map((b: any) => b.nome) || []
      const fornecedores = fornecedoresData?.map((f: any) => f.nome) || []
      const funcionarios = funcionariosData?.map((f: any) => f.nome) || []
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
 * Limpa o cache de dados de cadastro
 */
export function clearCadastroCache(): void {
  cacheData = null
  lastCacheUpdate = 0
  currentFazendaId = null
  // Limpar também o cache lazy de memória
  for (const key of Object.keys(queryCache)) {
    delete queryCache[key]
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
    clearCadastroCache()
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

  // Depois atualizar se online
  if (navigator.onLine) {
    console.log('[CadastroCache] App está online, atualizando cache da API...')
    await updateCadastroCache(cadastroSheetUrl, fazendaId)
  } else {
    console.log('[CadastroCache] App está offline, usando dados do cache')
  }
}

/**
 * Inicia polling para atualizar cache a cada 5 minutos
 */
export function startCadastroCachePolling(cadastroSheetUrl: string, fazendaId?: string): void {
  if (pollingInterval) {
    clearInterval(pollingInterval)
  }

  console.log('[CadastroCache] Iniciando polling de 5 minutos para atualização do cache')
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
export async function getCachedCadastroData(): Promise<CadastroCacheData | null> {
  // Se já tem dados em memória, retorna
  if (cacheData) {
    return {
      pastos: [...(cacheData.pastos || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      lotes: [...(cacheData.lotes || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      frigorificos: [...(cacheData.frigorificos || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      causasMorte: [...(cacheData.causasMorte || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      bebedouros: [...(cacheData.bebedouros || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      fornecedores: [...(cacheData.fornecedores || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      funcionarios: [...(cacheData.funcionarios || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      formulacoes: [...(cacheData.formulacoes || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      mineral: [...(cacheData.mineral || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      proteinado: [...(cacheData.proteinado || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      racao: [...(cacheData.racao || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      insumos: [...(cacheData.insumos || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      pastosDetalhes: cacheData.pastosDetalhes || {},
      lotesDetalhes: cacheData.lotesDetalhes || {},
      individuos: cacheData.individuos || [],
    }
  }

  // Se não tem dados em memória, tenta carregar do IndexedDB
  const cached = await loadFromCache()
  if (cached) {
    cacheData = cached
    lastCacheUpdate = Date.now()
    return {
      pastos: [...(cached.pastos || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      lotes: [...(cached.lotes || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      frigorificos: [...(cached.frigorificos || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      causasMorte: [...(cached.causasMorte || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      bebedouros: [...(cached.bebedouros || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      fornecedores: [...(cached.fornecedores || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      funcionarios: [...(cached.funcionarios || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      formulacoes: [...(cached.formulacoes || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      mineral: [...(cached.mineral || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      proteinado: [...(cached.proteinado || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      racao: [...(cached.racao || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      insumos: [...(cached.insumos || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      pastosDetalhes: cached.pastosDetalhes || {},
      lotesDetalhes: cached.lotesDetalhes || {},
      individuos: cached.individuos || [],
    }
  }

  return null
}

/**
 * Verifica se o cache precisa ser atualizado
 */
export function needsCacheUpdate(): boolean {
  return !cacheData || Date.now() - lastCacheUpdate > CACHE_EXPIRY_MS
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

const queryCache: Record<string, { data: any; timestamp: number }> = {}
const QUERY_CACHE_TTL = 10 * 60 * 1000 // 10 minutos

function getCachedQuery<T>(key: string): T | null {
  const entry = queryCache[key]
  if (!entry) return null
  if (Date.now() - entry.timestamp > QUERY_CACHE_TTL) {
    delete queryCache[key]
    return null
  }
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
 * Retorna do cache se disponível; se offline e não houver cache, retorna null.
 */
export async function getPastoByNomeCached(fazendaId: string, nome: string): Promise<any | null> {
  const key = buildKey('pasto', fazendaId, nome)
  const cached = getCachedQuery(key)
  if (cached) return cached

  if (!navigator.onLine) return null

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
 */
export async function getLoteByNomeCached(fazendaId: string, nome: string): Promise<any | null> {
  const key = buildKey('lote', fazendaId, nome)
  const cached = getCachedQuery(key)
  if (cached) return cached

  if (!navigator.onLine) return null

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
 */
export async function getLoteDetalhesComCategoriasCached(loteId: string): Promise<any | null> {
  const key = buildKey('lote-detalhes', loteId)
  const cached = getCachedQuery(key)
  if (cached) return cached

  if (!navigator.onLine) return null

  try {
    const data = await supabaseService.getLoteDetalhesComCategorias(loteId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca lotes por ID do pasto com cache lazy.
 */
export async function getLotesByPastoIdCached(fazendaId: string, pastoId: string): Promise<any[] | null> {
  const key = buildKey('lotes-pasto', fazendaId, pastoId)
  const cached = getCachedQuery(key)
  if (cached && Array.isArray(cached)) return cached

  if (!navigator.onLine) return null

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
 */
export async function getUltimaDataPastoEntradaCached(fazendaId: string, pastoId: string): Promise<any | null> {
  const key = buildKey('ultima-entrada', fazendaId, pastoId)
  const cached = getCachedQuery(key)
  if (cached) return cached

  if (!navigator.onLine) return null

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
 */
export async function getUltimaDataPastoSaidaCached(fazendaId: string, pastoId: string): Promise<any | null> {
  const key = buildKey('ultima-saida', fazendaId, pastoId)
  const cached = getCachedQuery(key)
  if (cached) return cached

  if (!navigator.onLine) return null

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
 */
export async function getUltimoStatusPastoCached(fazendaId: string, pastoId: string): Promise<any | null> {
  const key = buildKey('ultimo-status', fazendaId, pastoId)
  const cached = getCachedQuery(key)
  if (cached) return cached

  if (!navigator.onLine) return null

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
 */
export async function getOcupacaoAtualPorLotePastoCached(loteId: string, pastoId: string): Promise<any | null> {
  const key = buildKey('ocupacao', loteId, pastoId)
  const cached = getCachedQuery(key)
  if (cached) return cached

  if (!navigator.onLine) return null

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
 */
export async function getOcupacaoAtualPorLoteModuloCached(loteId: string, moduloId: string): Promise<any | null> {
  const key = buildKey('ocupacao-modulo', loteId, moduloId)
  const cached = getCachedQuery(key)
  if (cached) return cached

  if (!navigator.onLine) return null

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
 */
export async function getFormulacaoByNomeCached(fazendaId: string, nome: string): Promise<any | null> {
  const key = buildKey('formulacao', fazendaId, nome)
  const cached = getCachedQuery(key)
  if (cached) return cached

  if (!navigator.onLine) return null

  try {
    const data = await supabaseService.getFormulacaoByNome(fazendaId, nome)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca espaçamento ideal do cocho por formulação com cache lazy.
 */
export async function getEspacamentoIdealCochoPorFormulacaoCached(fazendaId: string, formulacao: string): Promise<any | null> {
  const key = buildKey('espacamento-cocho', fazendaId, formulacao)
  const cached = getCachedQuery(key)
  if (cached) return cached

  if (!navigator.onLine) return null

  try {
    const data = await supabaseService.getEspacamentoIdealCochoPorFormulacao(fazendaId, formulacao)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca registros de suplementação por lote com cache lazy.
 */
export async function getRegistrosSuplementacaoByLoteCached(fazendaId: string, loteId: string): Promise<any | null> {
  const key = buildKey('suplementacao-lote', fazendaId, loteId)
  const cached = getCachedQuery(key)
  if (cached) return cached

  if (!navigator.onLine) return null

  try {
    const data = await supabaseService.getRegistrosSuplementacaoByLote(fazendaId, loteId)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca último rodeio do lote com cache lazy.
 */
export async function getLastRodeioDateCached(fazendaId: string, loteId: string): Promise<any | null> {
  const key = buildKey('ultimo-rodeio', fazendaId, loteId)
  const cached = getCachedQuery(key)
  if (cached) return cached

  if (!navigator.onLine) return null

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
 */
export async function getContagemPartosVacaCached(fazendaId: string, idVaca: string): Promise<any | null> {
  const key = buildKey('partos-vaca', fazendaId, idVaca)
  const cached = getCachedQuery(key)
  if (cached) return cached

  if (!navigator.onLine) return null

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
 */
export async function getMedicamentosCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('medicamentos', fazendaId)
  const cached = getCachedQuery(key)
  if (cached && Array.isArray(cached)) return cached

  if (!navigator.onLine) return null

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
 */
export async function getTratamentosCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('tratamentos', fazendaId)
  const cached = getCachedQuery(key)
  if (cached && Array.isArray(cached)) return cached

  if (!navigator.onLine) return null

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
 */
export async function getRacasCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('racas', fazendaId)
  const cached = getCachedQuery(key)
  if (cached && Array.isArray(cached)) return cached

  if (!navigator.onLine) return null

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
 */
export async function getCausasMorteCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('causas-morte', fazendaId)
  const cached = getCachedQuery(key)
  if (cached && Array.isArray(cached)) return cached

  if (!navigator.onLine) return null

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
 */
export async function getPluviometrosCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('pluviometros', fazendaId)
  const cached = getCachedQuery(key)
  if (cached && Array.isArray(cached)) return cached

  if (!navigator.onLine) return null

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
 */
export async function getMaquinasVeiculosCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('maquinas-veiculos', fazendaId)
  const cached = getCachedQuery(key)
  if (cached && Array.isArray(cached)) return cached

  if (!navigator.onLine) return null

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
 */
export async function getImplementosCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('implementos', fazendaId)
  const cached = getCachedQuery(key)
  if (cached && Array.isArray(cached)) return cached

  if (!navigator.onLine) return null

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
 */
export async function getItensSupermercadoCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('itens-supermercado', fazendaId)
  const cached = getCachedQuery(key)
  if (cached && Array.isArray(cached)) return cached

  if (!navigator.onLine) return null

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
 */
export async function getSetoresCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('setores', fazendaId)
  const cached = getCachedQuery(key)
  if (cached && Array.isArray(cached)) return cached

  if (!navigator.onLine) return null

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
 */
export async function getLocaisCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('locais', fazendaId)
  const cached = getCachedQuery(key)
  if (cached && Array.isArray(cached)) return cached

  if (!navigator.onLine) return null

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
 */
export async function getClassificacoesAlmoxarifadoCached(fazendaId: string): Promise<string[] | null> {
  const key = buildKey('classificacoes-almoxarifado', fazendaId)
  const cached = getCachedQuery(key)
  if (cached && Array.isArray(cached)) return cached as string[]

  if (!navigator.onLine) return null

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
 */
export async function getItensAlmoxarifadoCached(fazendaId: string, classificacao: string): Promise<any[] | null> {
  const key = buildKey('itens-almoxarifado', fazendaId, classificacao)
  const cached = getCachedQuery(key)
  if (cached && Array.isArray(cached)) return cached

  if (!navigator.onLine) return null

  try {
    const data = await supabaseService.getItensAlmoxarifado(fazendaId, classificacao)
    if (data) setCachedQuery(key, data)
    return data
  } catch {
    return null
  }
}

/**
 * Busca lista de bebedouros com cache lazy.
 */
export async function getBebedourosCached(fazendaId: string): Promise<any[] | null> {
  const key = buildKey('bebedouros', fazendaId)
  const cached = getCachedQuery(key)
  if (cached && Array.isArray(cached)) return cached

  if (!navigator.onLine) return null

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
 */
export async function getBebedouroByNomeCached(fazendaId: string, nome: string): Promise<any | null> {
  const key = buildKey('bebedouro', fazendaId, nome)
  const cached = getCachedQuery(key)
  if (cached) return cached

  if (!navigator.onLine) return null

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
 */
export async function getUltimaDataLimpezaBebedouroCached(fazendaId: string, bebedouroId: string): Promise<string | null> {
  const key = buildKey('ultima-limpeza-bebedouro', fazendaId, bebedouroId)
  const cached = getCachedQuery(key)
  if (cached !== undefined && cached !== null) return cached as string

  if (!navigator.onLine) return null

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
 */
export async function getIntervaloMedioLimpezasCached(fazendaId: string, bebedouroId: string): Promise<number> {
  const key = buildKey('intervalo-limpeza-bebedouro', fazendaId, bebedouroId)
  const cached = getCachedQuery(key)
  if (cached !== undefined && cached !== null) return cached as number

  if (!navigator.onLine) return 0

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
  lotesData?: any[]
): Promise<{ success: boolean; warmedPastos: number; warmedLotes: number; warmedFormulacoes: number; warmedLotesRodeio: number; warmedMedicamentos: number; warmedTratamentos: number; warmedExtras: number; errors: string[] }> {
  const errors: string[] = []
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

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

  const totalItems = pastos.length + lotes.length + formulacoes.length + lotes.length + 12 // +extras
  let warmedPastos = 0
  let warmedLotes = 0
  let warmedFormulacoes = 0
  let warmedLotesRodeio = 0
  let warmedMedicamentos = 0
  let warmedTratamentos = 0
  let warmedExtras = 0
  let processed = 0

  // Aquecer pastos: detalhes, lotes, últimas datas, status, ocupação
  for (const pasto of pastos) {
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

    await delay(300)
  }

  // Aquecer lotes: detalhes com categorias
  for (const lote of lotes) {
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

    await delay(300)
  }

  // Aquecer formulações: detalhes, espaçamento ideal, histórico de suplementação
  for (const formulacao of formulacoes) {
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

      await getEspacamentoIdealCochoPorFormulacaoCached(fazendaId, nome)
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

    await delay(300)
  }

  // Aquecer dados de rodeio para todos os lotes
  for (const lote of lotes) {
    processed++
    onProgress?.(processed, totalItems, `Rodeio Lote ${lote.nome || lote.id}`)

    try {
      await getLastRodeioDateCached(fazendaId, lote.id)
      warmedLotesRodeio++
    } catch (error) {
      console.error(`[CadastroCache] Erro ao aquecer rodeio do lote ${lote.nome || lote.id}:`, error)
      errors.push(`Rodeio Lote ${lote.nome || lote.id}`)
    }

    await delay(300)
  }

  // Aquecer medicamentos (uma única vez)
  processed++
  onProgress?.(processed, totalItems, 'Medicamentos')

  try {
    await getMedicamentosCached(fazendaId)
    warmedMedicamentos++
  } catch (error) {
    console.error('[CadastroCache] Erro ao aquecer medicamentos:', error)
    errors.push('Medicamentos')
  }

  // Aquecer tratamentos (uma única vez)
  processed++
  onProgress?.(processed, totalItems, 'Tratamentos')

  try {
    await getTratamentosCached(fazendaId)
    warmedTratamentos++
  } catch (error) {
    console.error('[CadastroCache] Erro ao aquecer tratamentos:', error)
    errors.push('Tratamentos')
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
  ]

  for (const extra of extrasToWarm) {
    processed++
    onProgress?.(processed, totalItems, extra.label)
    try {
      await extra.fn()
      warmedExtras++
    } catch (error) {
      console.error(`[CadastroCache] Erro ao aquecer ${extra.label}:`, error)
      errors.push(extra.label)
    }
    await delay(200)
  }

  // Aquecer itens de almoxarifado por classificação
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

  // Aquecer detalhes de bebedouros (última limpeza e intervalo médio por bebedouro)
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

  // Ordem de dependência
  const syncSteps = [
    { name: 'Pastos', fn: () => supabaseService.getPastos(fazendaId) },
    { name: 'Lotes', fn: () => supabaseService.getLotes(fazendaId) },
    { name: 'Indivíduos', fn: () => supabaseService.getIndividuos(fazendaId, 100) },
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
    } catch (error) {
      console.error(`[CadastroCache] Erro ao carregar ${step.name}:`, error)
      errors.push(step.name)
    }

    // Delay entre queries (exceto última)
    if (i < syncSteps.length - 1) {
      await delay(750)
    }
  }

  // Salvar no cache
  await saveToCache(result)
  cacheData = result
  lastCacheUpdate = Date.now()

  console.log('[CadastroCache] Sincronização de listas concluída:', {
    success: errors.length === 0,
    errors,
    pastos: result.pastos.length,
    lotes: result.lotes.length,
    individuos: result.individuos?.length || 0,
  })

  // Aquecer cache com todos os detalhes de pastos e lotes
  // Isso garante funcionamento 100% offline após o usuário clicar em "Atualizar Dados"
  if (errors.length === 0) {
    try {
      console.log('[CadastroCache] Iniciando warm cache completo...')
      const warmResult = await warmAllCadastroCache(fazendaId, onProgress, rawPastos, rawLotes)
      if (!warmResult.success) {
        errors.push(...warmResult.errors)
      }
    } catch (error) {
      console.error('[CadastroCache] Erro no warm cache:', error)
      errors.push('Warm cache')
    }
  }

  return { success: errors.length === 0, errors }
}

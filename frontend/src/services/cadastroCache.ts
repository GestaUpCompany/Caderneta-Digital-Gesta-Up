import { BACKEND_URL } from '../utils/constants'
import { saveCadastroData, getAllCadastroData } from './indexedDB'

const CACHE_KEYS = {
  PASTOS_LOTES: 'pastos_lotes',
  SUPLEMENTACAO: 'suplementacao',
  FRIGORIFICOS: 'frigorificos',
}

const CACHE_EXPIRY_MS = 5 * 60 * 1000 // 5 minutos

export interface CadastroCacheData {
  pastos: string[]
  lotes: string[]
  frigorificos?: string[]
  mineral?: string[]
  proteinado?: string[]
  racao?: string[]
  insumos?: string[]
  dietas?: string[]
}

let cacheData: CadastroCacheData | null = null
let lastCacheUpdate: number = 0
let pollingInterval: number | null = null

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
        mineral: cached[CACHE_KEYS.SUPLEMENTACAO]?.mineral?.length || 0,
        proteinado: cached[CACHE_KEYS.SUPLEMENTACAO]?.proteinado?.length || 0,
        racao: cached[CACHE_KEYS.SUPLEMENTACAO]?.racao?.length || 0,
        insumos: cached[CACHE_KEYS.SUPLEMENTACAO]?.insumos?.length || 0,
        dietas: cached[CACHE_KEYS.SUPLEMENTACAO]?.dietas?.length || 0,
      })
      return {
        pastos: cached[CACHE_KEYS.PASTOS_LOTES]?.pastos || [],
        lotes: cached[CACHE_KEYS.PASTOS_LOTES]?.lotes || [],
        frigorificos: cached[CACHE_KEYS.PASTOS_LOTES]?.frigorificos || [],
        mineral: cached[CACHE_KEYS.SUPLEMENTACAO]?.mineral || [],
        proteinado: cached[CACHE_KEYS.SUPLEMENTACAO]?.proteinado || [],
        racao: cached[CACHE_KEYS.SUPLEMENTACAO]?.racao || [],
        insumos: cached[CACHE_KEYS.SUPLEMENTACAO]?.insumos || [],
        dietas: cached[CACHE_KEYS.SUPLEMENTACAO]?.dietas || [],
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
    })
    await saveCadastroData(CACHE_KEYS.SUPLEMENTACAO, {
      mineral: data.mineral,
      proteinado: data.proteinado,
      racao: data.racao,
      insumos: data.insumos,
      dietas: data.dietas,
    })
  } catch (error) {
    console.error('Erro ao salvar no cache:', error)
  }
}

/**
 * Busca dados de cadastro da API (apenas quando online e após sync)
 */
async function fetchCadastroData(cadastroSheetUrl: string): Promise<CadastroCacheData> {
  try {
    // Buscar pastos e lotes dos endpoints específicos
    const pastosRes = await fetch(`${BACKEND_URL}/api/insumos/pastos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl }),
    })
    const pastosData = await pastosRes.json()
    const pastos = pastosData.success ? pastosData.pastos || [] : []

    const lotesRes = await fetch(`${BACKEND_URL}/api/insumos/lotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl }),
    })
    const lotesData = await lotesRes.json()
    const lotes = lotesData.success ? lotesData.lotes || [] : []

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
      mineral: suplementacaoData.mineral || [],
      proteinado: suplementacaoData.proteinado || [],
      racao: suplementacaoData.racao || [],
      insumos: suplementacaoData.insumos || [],
      dietas: suplementacaoData.dietas || [],
    }
  } catch (error) {
    console.error('[CadastroCache] Erro ao buscar dados da API:', error)
    // Retornar dados vazios em caso de erro para não quebrar o app
    return {
      pastos: [],
      lotes: [],
      frigorificos: [],
      mineral: [],
      proteinado: [],
      racao: [],
      insumos: [],
      dietas: [],
    }
  }
}

/**
 * Atualiza o cache de dados de cadastro
 * Verifica se há sync pendente antes de atualizar para evitar conflitos
 */
export async function updateCadastroCache(cadastroSheetUrl: string): Promise<void> {
  if (!cadastroSheetUrl) return

  try {
    console.log('[CadastroCache] Iniciando atualização do cache da API...')
    // Verificar se há sync pendente antes de atualizar
    const pendingCount = await (await import('./indexedDB')).countPending()
    if (pendingCount > 0) {
      console.log(`[CadastroCache] Há ${pendingCount} registros pendentes de sync. Aguardando sync antes de atualizar cache.`)
      return
    }

    const data = await fetchCadastroData(cadastroSheetUrl)
    await saveToCache(data)
    cacheData = data
    lastCacheUpdate = Date.now()
    console.log('[CadastroCache] Cache atualizado com sucesso da API:', {
      pastos: data.pastos.length,
      lotes: data.lotes.length,
      frigorificos: data.frigorificos?.length || 0,
      mineral: data.mineral?.length || 0,
      proteinado: data.proteinado?.length || 0,
      racao: data.racao?.length || 0,
      insumos: data.insumos?.length || 0,
      dietas: data.dietas?.length || 0,
    })
  } catch (error) {
    console.error('Erro ao atualizar cache de cadastro:', error)
  }
}

/**
 * Inicializa o cache de dados de cadastro
 * Primeiro tenta carregar do IndexedDB, depois atualiza se online
 */
export async function initializeCadastroCache(cadastroSheetUrl: string): Promise<void> {
  if (!cadastroSheetUrl) {
    console.log('[CadastroCache] cadastroSheetUrl não disponível, pulando inicialização')
    return
  }

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

  // Depois atualizar se online
  if (navigator.onLine) {
    console.log('[CadastroCache] App está online, atualizando cache da API...')
    await updateCadastroCache(cadastroSheetUrl)
  } else {
    console.log('[CadastroCache] App está offline, usando dados do cache')
  }
}

/**
 * Inicia polling para atualizar cache a cada 5 minutos
 */
export function startCadastroCachePolling(cadastroSheetUrl: string): void {
  if (pollingInterval) {
    clearInterval(pollingInterval)
  }

  console.log('[CadastroCache] Iniciando polling de 5 minutos para atualização do cache')
  pollingInterval = window.setInterval(async () => {
    if (navigator.onLine && cadastroSheetUrl) {
      console.log('[CadastroCache] Polling: atualizando cache...')
      await updateCadastroCache(cadastroSheetUrl)
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
 * Retorna os dados em cache
 */
export function getCachedCadastroData(): CadastroCacheData | null {
  return cacheData
}

/**
 * Verifica se o cache precisa ser atualizado
 */
export function needsCacheUpdate(): boolean {
  return !cacheData || Date.now() - lastCacheUpdate > CACHE_EXPIRY_MS
}

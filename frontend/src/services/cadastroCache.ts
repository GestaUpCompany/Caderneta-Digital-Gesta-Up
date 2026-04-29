import { loadCadastroData } from './cadastroData'
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
  const [pastosLotes, suplementacao] = await Promise.all([
    loadCadastroData(cadastroSheetUrl),
    fetch(`${BACKEND_URL}/api/insumos/suplementacao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl }),
    }).then(res => res.json()),
  ])

  return {
    pastos: pastosLotes.pastos || [],
    lotes: pastosLotes.lotes || [],
    frigorificos: pastosLotes.frigorificos || [],
    mineral: suplementacao.mineral || [],
    proteinado: suplementacao.proteinado || [],
    racao: suplementacao.racao || [],
    insumos: suplementacao.insumos || [],
    dietas: suplementacao.dietas || [],
  }
}

/**
 * Atualiza o cache de dados de cadastro
 * Verifica se há sync pendente antes de atualizar para evitar conflitos
 */
export async function updateCadastroCache(cadastroSheetUrl: string): Promise<void> {
  if (!cadastroSheetUrl) return

  try {
    // Verificar se há sync pendente antes de atualizar
    const pendingCount = await (await import('./indexedDB')).countPending()
    if (pendingCount > 0) {
      console.log(`Há ${pendingCount} registros pendentes de sync. Aguardando sync antes de atualizar cache.`)
      return
    }

    const data = await fetchCadastroData(cadastroSheetUrl)
    await saveToCache(data)
    cacheData = data
    lastCacheUpdate = Date.now()
  } catch (error) {
    console.error('Erro ao atualizar cache de cadastro:', error)
  }
}

/**
 * Inicializa o cache de dados de cadastro
 * Primeiro tenta carregar do IndexedDB, depois atualiza se online
 */
export async function initializeCadastroCache(cadastroSheetUrl: string): Promise<void> {
  if (!cadastroSheetUrl) return

  // Primeiro carregar do cache (rápido, funciona offline)
  const cached = await loadFromCache()
  if (cached) {
    cacheData = cached
    lastCacheUpdate = Date.now()
  }

  // Depois atualizar se online
  if (navigator.onLine) {
    await updateCadastroCache(cadastroSheetUrl)
  }
}

/**
 * Inicia polling para atualizar cache a cada 5 minutos
 */
export function startCadastroCachePolling(cadastroSheetUrl: string): void {
  if (pollingInterval) {
    clearInterval(pollingInterval)
  }

  pollingInterval = window.setInterval(async () => {
    if (navigator.onLine && cadastroSheetUrl) {
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

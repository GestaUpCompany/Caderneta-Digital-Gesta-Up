import { BACKEND_URL } from '../utils/constants'
import { saveCadastroData, getAllCadastroData } from './indexedDB'

const CACHE_KEYS = {
  PASTOS_LOTES: 'pastos_lotes',
  SUPLEMENTACAO: 'suplementacao',
  FRIGORIFICOS: 'frigorificos',
}

const CACHE_EXPIRY_MS = 5 * 60 * 1000 // 5 minutos

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
  mineral?: string[]
  proteinado?: string[]
  racao?: string[]
  insumos?: string[]
  dietas?: string[]
  pastosDetalhes?: Record<string, PastoDetalhes>
  lotesDetalhes?: Record<string, LoteDetalhes>
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
        pastosDetalhes: Object.keys(cached[CACHE_KEYS.PASTOS_LOTES]?.pastosDetalhes || {}).length,
        lotesDetalhes: Object.keys(cached[CACHE_KEYS.PASTOS_LOTES]?.lotesDetalhes || {}).length,
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
        pastosDetalhes: cached[CACHE_KEYS.PASTOS_LOTES]?.pastosDetalhes || {},
        lotesDetalhes: cached[CACHE_KEYS.PASTOS_LOTES]?.lotesDetalhes || {},
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
      pastosDetalhes: data.pastosDetalhes || {},
      lotesDetalhes: data.lotesDetalhes || {},
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
    // Buscar pastos dos endpoints específicos
    const pastosRes = await fetch(`${BACKEND_URL}/api/insumos/pastos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl }),
    })
    const pastosData = await pastosRes.json()
    const pastos = pastosData.success ? pastosData.pastos || [] : []

    // Delay de 500ms entre requisições para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))

    const lotesRes = await fetch(`${BACKEND_URL}/api/insumos/lotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl }),
    })
    const lotesData = await lotesRes.json()
    const lotes = lotesData.success ? lotesData.lotes || [] : []

    // Delay de 500ms entre requisições para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))

    // Buscar detalhes de todos os pastos
    const pastosDetalhes: Record<string, PastoDetalhes> = {}
    for (const pasto of pastos) {
      try {
        const detRes = await fetch(`${BACKEND_URL}/api/insumos/pasto-detalhes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl, pasto }),
        })
        const detData = await detRes.json()
        if (detData.success) {
          pastosDetalhes[pasto] = detData.detalhes
        }
        // Delay de 200ms entre requisições de detalhes para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.error(`[CadastroCache] Erro ao buscar detalhes do pasto ${pasto}:`, error)
      }
    }

    // Buscar detalhes de todos os lotes
    const lotesDetalhes: Record<string, LoteDetalhes> = {}
    for (const lote of lotes) {
      try {
        const detRes = await fetch(`${BACKEND_URL}/api/insumos/lote-detalhes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl, lote }),
        })
        const detData = await detRes.json()
        if (detData.success) {
          lotesDetalhes[lote] = detData.detalhes
        }
        // Delay de 200ms entre requisições de detalhes para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error) {
        console.error(`[CadastroCache] Erro ao buscar detalhes do lote ${lote}:`, error)
      }
    }

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
      dietas: suplementacaoData.dietas || [],
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
      pastosDetalhes: Object.keys(data.pastosDetalhes || {}).length,
      lotesDetalhes: Object.keys(data.lotesDetalhes || {}).length,
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

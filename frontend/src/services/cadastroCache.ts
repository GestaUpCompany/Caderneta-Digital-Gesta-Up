import { BACKEND_URL } from '../utils/constants'
import { saveCadastroData, getAllCadastroData } from './indexedDB'
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
        pastosDetalhes: cached[CACHE_KEYS.PASTOS_LOTES]?.pastosDetalhes || {},
        lotesDetalhes: cached[CACHE_KEYS.PASTOS_LOTES]?.lotesDetalhes || {},
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
      pastosDetalhes: data.pastosDetalhes || {},
      lotesDetalhes: data.lotesDetalhes || {},
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
  const useSupabase = import.meta.env.VITE_USE_SUPABASE === 'true'
  
  try {
    if (useSupabase && fazendaId) {
      // Buscar do Supabase
      console.log('[CadastroCache] Buscando dados do Supabase para fazenda:', fazendaId)
      
      const [pastosData, lotesData, frigorificosData, causasMorteData, bebedourosData, fornecedoresData, funcionariosData, mineralData, proteinadoData, racaoData, insumosData] = await Promise.all([
        supabaseService.getPastos(fazendaId),
        supabaseService.getLotes(fazendaId),
        supabaseService.getFrigorificos(fazendaId),
        supabaseService.getCausasMorte(fazendaId),
        supabaseService.getBebedouros(fazendaId),
        supabaseService.getFornecedores(fazendaId),
        supabaseService.getFuncionarios(fazendaId),
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
 */
export function getCachedCadastroData(): CadastroCacheData | null {
  if (!cacheData) return null

  return {
    pastos: [...(cacheData.pastos || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    lotes: [...(cacheData.lotes || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    frigorificos: [...(cacheData.frigorificos || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    causasMorte: [...(cacheData.causasMorte || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    bebedouros: [...(cacheData.bebedouros || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    fornecedores: [...(cacheData.fornecedores || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    funcionarios: [...(cacheData.funcionarios || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    mineral: [...(cacheData.mineral || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    proteinado: [...(cacheData.proteinado || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    racao: [...(cacheData.racao || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    insumos: [...(cacheData.insumos || [])].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    pastosDetalhes: cacheData.pastosDetalhes || {},
    lotesDetalhes: cacheData.lotesDetalhes || {},
  }
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

import * as supabaseService from './supabaseService'

export interface CadastroData {
  pastos: string[]
  lotes: string[]
  fornecedores: string[]
  funcionarios: string[]
  frigorificos: string[]
}

// Cache simples em memória
let cache: CadastroData | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

/**
 * Carrega dados do Supabase
 * @param fazendaId ID da fazenda no Supabase
 * @param forceCache Se true, ignora o cache e força recarregamento
 * @returns Dados de cadastro
 */
export async function loadCadastroData(
  fazendaId?: string,
  forceCache: boolean = false
): Promise<CadastroData> {
  // Verificar cache
  if (!forceCache && cache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    console.log('Usando cache de cadastroData')
    return cache
  }

  try {
    let pastos: string[] = []
    let lotes: string[] = []
    let fornecedores: string[] = []
    let funcionarios: string[] = []
    let frigorificos: string[] = []

    if (fazendaId) {
      // Buscar do Supabase
      console.log('Buscando pastos e lotes do Supabase para fazenda:', fazendaId)
      
      const [pastosData, lotesData] = await Promise.all([
        supabaseService.getPastos(fazendaId),
        supabaseService.getLotes(fazendaId)
      ])
      
      pastos = pastosData?.map((p: any) => p.nome) || []
      lotes = lotesData?.map((l: any) => l.nome) || []
      
      console.log('Pastos do Supabase:', pastos)
      console.log('Lotes do Supabase:', lotes)
    }

    const cadastroData: CadastroData = {
      pastos,
      lotes,
      fornecedores,
      funcionarios,
      frigorificos,
    }

    // Atualizar cache
    cache = cadastroData
    cacheTimestamp = Date.now()

    return cadastroData
  } catch (error) {
    console.error('Erro ao carregar dados de cadastro:', error)
    throw new Error('Erro ao carregar dados de cadastro')
  }
}

/**
 * Invalida o cache de cadastroData
 * Deve ser chamado após salvar novos cadastros
 */
export function invalidateCadastroCache(): void {
  cache = null
  cacheTimestamp = 0
  console.log('Cache de cadastroData invalidado')
}

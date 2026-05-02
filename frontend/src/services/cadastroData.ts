import { BACKEND_URL } from '../utils/constants'
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
 * Carrega dados da planilha de cadastro ou do Supabase
 * @param cadastroSheetUrl URL da planilha de cadastro (opcional se usar Supabase)
 * @param fazendaId ID da fazenda no Supabase (opcional)
 * @param forceCache Se true, ignora o cache e força recarregamento
 * @returns Dados de cadastro
 */
export async function loadCadastroData(
  cadastroSheetUrl: string,
  fazendaId?: string,
  forceCache: boolean = false
): Promise<CadastroData> {
  // Verificar cache
  if (!forceCache && cache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    console.log('Usando cache de cadastroData')
    return cache
  }

  const useSupabase = import.meta.env.VITE_USE_SUPABASE === 'true'

  try {
    let pastos: string[] = []
    let lotes: string[] = []
    let fornecedores: string[] = []
    let funcionarios: string[] = []
    let frigorificos: string[] = []

    if (useSupabase && fazendaId) {
      // Buscar do Supabase
      console.log('Buscando pastos e lotes do Supabase para fazenda:', fazendaId)
      
      // Buscar token JWT do localStorage
      const token = localStorage.getItem('supabase_token')
      
      const [pastosData, lotesData] = await Promise.all([
        supabaseService.getPastos(fazendaId, token || undefined),
        supabaseService.getLotes(fazendaId, token || undefined)
      ])
      
      pastos = pastosData?.map((p: any) => p.nome) || []
      lotes = lotesData?.map((l: any) => l.nome) || []
      
      console.log('Pastos do Supabase:', pastos)
      console.log('Lotes do Supabase:', lotes)
    } else if (cadastroSheetUrl) {
      // Buscar do Google Sheets via backend
      // Carregar pastos da nova aba Pasto
      const pastosRes = await fetch(`${BACKEND_URL}/api/insumos/pastos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl }),
      })
      const pastosData = await pastosRes.json()
      pastos = pastosData.success ? pastosData.pastos : []

      // Carregar lotes da nova aba Lote
      const lotesRes = await fetch(`${BACKEND_URL}/api/insumos/lotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl }),
      })
      const lotesData = await lotesRes.json()
      lotes = lotesData.success ? lotesData.lotes : []

      // Usar endpoint existente /api/insumos/cadastro para os outros dados
      const readRes = await fetch(`${BACKEND_URL}/api/insumos/cadastro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl }),
      })

      const readData = await readRes.json()
      if (!readData.success || !readData.rows) {
        throw new Error('Não foi possível ler os dados de cadastro')
      }

      // Processar dados
      const rows = readData.rows as (string | number | null)[][]
      
      // Estrutura esperada da aba Administrativo: coluna 0 = FORNECEDORES, coluna 1 = FUNCIONÁRIOS, coluna 2 = FRIGORÍFICOS
      for (const row of rows) {
        if (row[0]) fornecedores.push(String(row[0]))
        if (row[1]) funcionarios.push(String(row[1]))
        if (row[2]) frigorificos.push(String(row[2]))
      }
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

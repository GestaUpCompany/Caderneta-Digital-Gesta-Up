import { BACKEND_URL } from '../utils/constants'

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
 * Carrega dados da planilha de cadastro
 * @param cadastroSheetUrl URL da planilha de cadastro
 * @param forceCache Se true, ignora o cache e força recarregamento
 * @returns Dados de cadastro
 */
export async function loadCadastroData(
  cadastroSheetUrl: string,
  forceCache: boolean = false
): Promise<CadastroData> {
  // Verificar cache
  if (!forceCache && cache && Date.now() - cacheTimestamp < CACHE_DURATION) {
    console.log('Usando cache de cadastroData')
    return cache
  }

  if (!cadastroSheetUrl) {
    throw new Error('cadastroSheetUrl é obrigatório')
  }

  try {
    // Carregar pastos da nova aba Pasto
    const pastosRes = await fetch(`${BACKEND_URL}/api/insumos/pastos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl }),
    })
    const pastosData = await pastosRes.json()
    const pastos = pastosData.success ? pastosData.pastos : []

    // Carregar lotes da nova aba Lote
    const lotesRes = await fetch(`${BACKEND_URL}/api/insumos/lotes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl }),
    })
    const lotesData = await lotesRes.json()
    const lotes = lotesData.success ? lotesData.lotes : []

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
    const cadastroData: CadastroData = {
      pastos: pastos,
      lotes: lotes,
      fornecedores: [],
      funcionarios: [],
      frigorificos: [],
    }

    // Estrutura esperada da aba Administrativo: coluna 0 = FORNECEDORES, coluna 1 = FUNCIONÁRIOS, coluna 2 = FRIGORÍFICOS
    for (const row of rows) {
      if (row[0]) cadastroData.fornecedores.push(String(row[0]))
      if (row[1]) cadastroData.funcionarios.push(String(row[1]))
      if (row[2]) cadastroData.frigorificos.push(String(row[2]))
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

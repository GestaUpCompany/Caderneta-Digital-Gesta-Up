import { getFuncionariosComAcessoApp } from './supabaseService'
import { saveCadastroData, getCadastroData, deleteCadastroData } from './indexedDB'
import { verifyPin } from '../utils/pinHash'

export interface FuncionarioRBAC {
  id: string
  fazenda_id: string
  nome: string
  cargo: string | null
  acessa_app: boolean
  pin_hash: string | null
  cadernetas_permitidas: string[] | null
  ativo: boolean | null
}

const CACHE_KEY = 'funcionarios_rbac'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 horas

export async function fetchFuncionariosComAcesso(fazendaId: string): Promise<FuncionarioRBAC[]> {
  const data = await getFuncionariosComAcessoApp(fazendaId)
  const funcionarios = (data || []).map((f: any) => ({
    id: f.id,
    fazenda_id: f.fazenda_id,
    nome: f.nome,
    cargo: f.cargo,
    acessa_app: f.acessa_app,
    pin_hash: f.pin_hash,
    cadernetas_permitidas: Array.isArray(f.cadernetas_permitidas) ? f.cadernetas_permitidas : [],
    ativo: f.ativo,
  })) as FuncionarioRBAC[]

  await saveCadastroData(CACHE_KEY, { fazendaId, funcionarios, timestamp: Date.now() }, fazendaId)
  return funcionarios
}

export async function getCachedFuncionariosComAcesso(fazendaId: string): Promise<FuncionarioRBAC[]> {
  const cached = await getCadastroData(CACHE_KEY)
  if (cached && cached.fazendaId === fazendaId && cached.funcionarios) {
    const isExpired = Date.now() - (cached.timestamp || 0) > CACHE_TTL_MS
    if (!isExpired) {
      return cached.funcionarios as FuncionarioRBAC[]
    }
  }
  return fetchFuncionariosComAcesso(fazendaId)
}

export async function getFuncionariosComAcessoOnlineFirst(fazendaId: string): Promise<FuncionarioRBAC[]> {
  try {
    return await fetchFuncionariosComAcesso(fazendaId)
  } catch (error) {
    console.warn('[FuncionarioAuth] Falha ao buscar funcionários online, usando cache:', error)
    const cached = await getCadastroData(CACHE_KEY)
    if (cached?.funcionarios) return cached.funcionarios as FuncionarioRBAC[]
    throw error
  }
}

export async function validarPinFuncionario(
  funcionario: FuncionarioRBAC,
  pin: string,
  fazendaId: string
): Promise<boolean> {
  if (!funcionario.pin_hash) return false
  return verifyPin(pin, funcionario.pin_hash, funcionario.id, fazendaId)
}

export async function clearFuncionariosCache(): Promise<void> {
  await deleteCadastroData(CACHE_KEY)
}

// --- Controle de versão RBAC ---
// O PWA guarda a última versão de rbac_versao vista para a fazenda.
// Quando a versão muda no banco (admin alterou funcionários ou toggle de RBAC),
// o PWA invalida o cache e recarrega a lista fresca.

const RBAC_VERSAO_KEY = 'rbac_versao'

export async function getRbacVersaoCache(): Promise<number> {
  const cached = await getCadastroData(RBAC_VERSAO_KEY)
  return typeof cached === 'number' ? cached : 0
}

export async function setRbacVersaoCache(versao: number): Promise<void> {
  await saveCadastroData(RBAC_VERSAO_KEY, versao)
}

export async function shouldInvalidateCache(currentVersao: number): Promise<boolean> {
  const cachedVersao = await getRbacVersaoCache()
  return cachedVersao !== currentVersao
}

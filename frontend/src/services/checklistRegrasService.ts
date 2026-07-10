import { getChecklistRegras } from './supabaseService'
import { saveCadastroData, getCadastroData } from './indexedDB'

export type ChecklistRegraTipo = 'periodo' | 'excecao'

export interface ChecklistRegra {
  id: string
  fazenda_id: string
  cadernetas: string[] | null
  tipo: ChecklistRegraTipo
  data_inicio: string
  data_fim: string | null
  ativo: boolean | null
  created_at: string | null
  updated_at: string | null
}

const CACHE_KEY = 'checklist_regras'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 horas

export async function fetchChecklistRegras(fazendaId: string): Promise<ChecklistRegra[]> {
  const data = await getChecklistRegras(fazendaId)
  const regras = (data || []).map((r: any) => ({
    id: r.id,
    fazenda_id: r.fazenda_id,
    cadernetas: Array.isArray(r.cadernetas) ? r.cadernetas : [],
    tipo: r.tipo || 'periodo',
    data_inicio: r.data_inicio,
    data_fim: r.data_fim || null,
    ativo: r.ativo,
    created_at: r.created_at,
    updated_at: r.updated_at,
  })) as ChecklistRegra[]

  await saveCadastroData(CACHE_KEY, { fazendaId, regras, timestamp: Date.now() }, fazendaId)
  return regras
}

export async function getCachedChecklistRegras(fazendaId: string): Promise<ChecklistRegra[]> {
  const cached = await getCadastroData(CACHE_KEY)
  if (cached && cached.fazendaId === fazendaId && cached.regras) {
    const isExpired = Date.now() - (cached.timestamp || 0) > CACHE_TTL_MS
    if (!isExpired) {
      return cached.regras as ChecklistRegra[]
    }
  }
  return fetchChecklistRegras(fazendaId)
}

export async function getChecklistRegrasOnlineFirst(fazendaId: string): Promise<ChecklistRegra[]> {
  try {
    return await fetchChecklistRegras(fazendaId)
  } catch (error) {
    console.warn('[ChecklistRegras] Falha ao buscar regras online, usando cache:', error)
    const cached = await getCadastroData(CACHE_KEY)
    if (cached?.regras) return cached.regras as ChecklistRegra[]
    throw error
  }
}

export function isRegraAtivaParaCaderneta(regras: ChecklistRegra[], cadernetaId: string, dataIso: string): boolean {
  const regrasNegativas = regras.filter((r) => r.ativo !== false && r.tipo === 'excecao')
  const regrasPositivas = regras.filter((r) => r.ativo !== false && r.tipo === 'periodo')

  const cobreCaderneta = (r: ChecklistRegra) =>
    !r.cadernetas || r.cadernetas.length === 0 || r.cadernetas.includes(cadernetaId)

  const cobreData = (r: ChecklistRegra) =>
    dataIso >= r.data_inicio && (!r.data_fim || dataIso <= r.data_fim)

  if (regrasNegativas.some((r) => cobreCaderneta(r) && cobreData(r))) return false

  return regrasPositivas.some((r) => cobreCaderneta(r) && cobreData(r))
}

export function getHojeIso(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

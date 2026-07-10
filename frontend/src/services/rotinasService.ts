import { getRotinas } from './supabaseService'
import { saveCadastroData, getCadastroData } from './indexedDB'
import type { Rotina } from '../utils/rotinas'

const CACHE_KEY = 'rotinas'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 horas

export type { Rotina }

export async function fetchRotinas(fazendaId: string): Promise<Rotina[]> {
  const data = await getRotinas(fazendaId)
  const rotinas = (data || []).map((r: any) => ({
    id: r.id,
    fazenda_id: r.fazenda_id,
    funcionario_id: r.funcionario_id,
    cadernetas: Array.isArray(r.cadernetas) ? r.cadernetas : [],
    dias_semana: Array.isArray(r.dias_semana) ? r.dias_semana.map(Number) : [],
    horarios: r.horarios && typeof r.horarios === 'object' ? r.horarios : {},
    data_inicio: r.data_inicio,
    data_fim: r.data_fim || null,
    ativo: r.ativo !== false,
    created_at: r.created_at,
    updated_at: r.updated_at,
  })) as Rotina[]

  await saveCadastroData(CACHE_KEY, { fazendaId, rotinas, timestamp: Date.now() }, fazendaId)
  return rotinas
}

export async function getCachedRotinas(fazendaId: string): Promise<Rotina[]> {
  const cached = await getCadastroData(CACHE_KEY)
  if (cached && cached.fazendaId === fazendaId && cached.rotinas) {
    const isExpired = Date.now() - (cached.timestamp || 0) > CACHE_TTL_MS
    if (!isExpired) {
      return cached.rotinas as Rotina[]
    }
  }
  return fetchRotinas(fazendaId)
}

export async function getRotinasOnlineFirst(fazendaId: string): Promise<Rotina[]> {
  try {
    return await fetchRotinas(fazendaId)
  } catch (error) {
    console.warn('[Rotinas] Falha ao buscar rotinas online, usando cache:', error)
    const cached = await getCadastroData(CACHE_KEY)
    if (cached?.rotinas) return cached.rotinas as Rotina[]
    throw error
  }
}

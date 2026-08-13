import { getSupabaseClientWithRefresh } from './supabaseClient'
import { saveCadastroData, getCadastroData } from './indexedDB'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../utils/eventBus'

const MAPA_CACHE_KEY = 'mapa_fazenda'

export interface MapaPasto {
  id: string
  nome: string
  geometria: GeoJSON.Geometry
  area_total_ha?: number | null
  area_util_ha?: number | null
}

export interface MapaCurral {
  id: string
  nome: string
  geometria: GeoJSON.Geometry
}

export interface MapaEstrada {
  id: string
  nome: string
  geometria: GeoJSON.Geometry
}

export interface MapaPonto {
  id: string
  nome: string
  tipo: string
  geometria: GeoJSON.Geometry
}

export interface MapaFazendaData {
  pastos: MapaPasto[]
  currais: MapaCurral[]
  estradas: MapaEstrada[]
  pontos: MapaPonto[]
  fazendaId: string
  timestamp: number
}

function parseGeom(g: any): GeoJSON.Geometry {
  if (typeof g === 'string') return JSON.parse(g)
  return g as GeoJSON.Geometry
}

/**
 * Baixa geometrias da fazenda do Supabase e persiste no IndexedDB.
 * Usa RPCs com ST_AsGeoJSON para pastos e currais, queries diretas para estradas e pontos.
 */
export async function syncMapaFazenda(fazendaId: string): Promise<MapaFazendaData> {
  const client = await getSupabaseClientWithRefresh() as any

  const [pastosRes, curraisRes, estradasRes, pontosRes] = await Promise.all([
    client.rpc('get_pastos_com_geometria', { p_fazenda_id: fazendaId }),
    client.rpc('get_currais_com_geometria', { p_fazenda_id: fazendaId }),
    client
      .from('mapa_estradas')
      .select('id, nome, geometria')
      .eq('fazenda_id', fazendaId)
      .eq('ativo', true)
      .order('nome'),
    client
      .from('mapa_pontos')
      .select('id, nome, tipo, geometria')
      .eq('fazenda_id', fazendaId)
      .eq('ativo', true)
      .order('nome'),
  ])

  if (pastosRes.error) throw pastosRes.error
  if (curraisRes.error) throw curraisRes.error
  if (estradasRes.error) throw estradasRes.error
  if (pontosRes.error) throw pontosRes.error

  const data: MapaFazendaData = {
    pastos: (pastosRes.data || []).map((p: any) => ({
      id: p.id,
      nome: p.nome,
      geometria: parseGeom(p.geometria_geojson),
      area_total_ha: p.area_total_ha ? Number(p.area_total_ha) : null,
      area_util_ha: p.area_util_ha ? Number(p.area_util_ha) : null,
    })),
    currais: (curraisRes.data || []).map((c: any) => ({
      id: c.id,
      nome: c.nome,
      geometria: parseGeom(c.geometria),
    })),
    estradas: (estradasRes.data || []).map((e: any) => ({
      id: e.id,
      nome: e.nome,
      geometria: parseGeom(e.geometria),
    })),
    pontos: (pontosRes.data || []).map((p: any) => ({
      id: p.id,
      nome: p.nome,
      tipo: p.tipo,
      geometria: parseGeom(p.geometria),
    })),
    fazendaId,
    timestamp: Date.now(),
  }

  await saveCadastroData(MAPA_CACHE_KEY, data, fazendaId)

  console.log('[MapaCache] Sincronizado:', {
    pastos: data.pastos.length,
    currais: data.currais.length,
    estradas: data.estradas.length,
    pontos: data.pontos.length,
  })

  eventBus.emit(CADASTRO_CACHE_UPDATED, data)
  return data
}

/**
 * Carrega geometrias do IndexedDB (cache local offline).
 */
export async function loadMapaFazenda(): Promise<MapaFazendaData | null> {
  const data = await getCadastroData(MAPA_CACHE_KEY)
  if (!data) return null
  return data as MapaFazendaData
}

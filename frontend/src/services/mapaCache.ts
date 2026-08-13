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
  versao?: string | null
}

function parseGeom(g: any): GeoJSON.Geometry {
  if (typeof g === 'string') return JSON.parse(g)
  return g as GeoJSON.Geometry
}

/**
 * Consulta a versão (updated_at) do mapa da fazenda no Supabase.
 * Retorna null se não houver versão registrada.
 */
export async function getMapaVersao(fazendaId: string): Promise<string | null> {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('mapa_versao')
    .select('updated_at')
    .eq('fazenda_id', fazendaId)
    .maybeSingle()

  if (error) {
    console.warn('[MapaCache] Erro ao verificar versão:', error.message)
    return null
  }

  return data?.updated_at ?? null
}

/**
 * Verifica se o cache local está desatualizado em relação ao Supabase.
 * Retorna true se há versão nova no servidor (ou se não há cache local).
 */
export async function mapaPrecisaAtualizar(fazendaId: string): Promise<boolean> {
  const versaoServidor = await getMapaVersao(fazendaId)
  if (!versaoServidor) return false // sem versão no servidor, não há o que atualizar

  const cached = await loadMapaFazenda()
  if (!cached) return true // sem cache local, precisa baixar

  if (!cached.versao) return true // cache antigo sem versionamento, precisa baixar

  return versaoServidor !== cached.versao
}

/**
 * Baixa geometrias da fazenda do Supabase e persiste no IndexedDB.
 * Usa RPCs com ST_AsGeoJSON para pastos e currais, queries diretas para estradas e pontos.
 * Também consulta e armazena a versão (updated_at do mapa_versao).
 */
export async function syncMapaFazenda(fazendaId: string): Promise<MapaFazendaData> {
  const client = await getSupabaseClientWithRefresh() as any

  const [pastosRes, curraisRes, estradasRes, pontosRes, versaoRes] = await Promise.all([
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
    client
      .from('mapa_versao')
      .select('updated_at')
      .eq('fazenda_id', fazendaId)
      .maybeSingle(),
  ])

  if (pastosRes.error) throw pastosRes.error
  if (curraisRes.error) throw curraisRes.error
  if (estradasRes.error) throw estradasRes.error
  if (pontosRes.error) throw pontosRes.error

  const versao = versaoRes.data?.updated_at ?? null

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
    versao,
  }

  await saveCadastroData(MAPA_CACHE_KEY, data, fazendaId)

  console.log('[MapaCache] Sincronizado:', {
    pastos: data.pastos.length,
    currais: data.currais.length,
    estradas: data.estradas.length,
    pontos: data.pontos.length,
    versao,
  })

  eventBus.emit(CADASTRO_CACHE_UPDATED, data)
  return data
}

/**
 * Verifica se há versão nova no Supabase e, se houver, sincroniza.
 * Retorna os dados atualizados ou o cache existente se não houver mudança.
 * Não faz nada se estiver offline.
 */
export async function syncMapaSePreciso(fazendaId: string): Promise<MapaFazendaData | null> {
  if (!navigator.onLine) return loadMapaFazenda()

  try {
    const precisa = await mapaPrecisaAtualizar(fazendaId)
    if (!precisa) {
      console.log('[MapaCache] Versão do cache está atualizada, pulando download')
      return loadMapaFazenda()
    }
    console.log('[MapaCache] Versão nova detectada, sincronizando...')
    return syncMapaFazenda(fazendaId)
  } catch (err) {
    console.warn('[MapaCache] Erro ao verificar versão, usando cache:', err)
    return loadMapaFazenda()
  }
}

// ==================== Detalhes de pasto/curral para o mapa ====================

export interface DetalheCategoria {
  categoria: string
  quant_atual: number
  peso_vivo_kg: number | null
  formulacao_nome: string | null
  formulacao_id: string | null
}

export interface DetalhePasto {
  pasto_id: string
  pasto_nome: string
  setor: string | null
  tipo: string | null
  area_total_ha: number | null
  area_util_ha: number | null
  especie: string | null
  metragem_cocho_m: number | null
  fonte_agua_principal: string | null
  modulo_nome: string | null
  lote_id: string | null
  lote_nome: string | null
  lote_cabecas: number
  lote_raca: string | null
  lote_sexo: string | null
  lote_peso_medio_kg: number | null
  categorias: DetalheCategoria[] | null
}

export interface DetalheCurral {
  curral_id: string
  curral_nome: string
  largura_m: number | null
  comprimento_m: number | null
  metros_cocho_m: number | null
  formulacao_nome: string | null
  lote_id: string | null
  lote_nome: string | null
  lote_cabecas: number
  lote_raca: string | null
  lote_sexo: string | null
  lote_peso_medio_kg: number | null
  categorias: DetalheCategoria[] | null
}

/**
 * Busca detalhes completos de um pasto (incluindo lote e dietas).
 * Requer conectividade (chama RPC do Supabase).
 */
export async function getDetalhesPasto(pastoId: string): Promise<DetalhePasto | null> {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client.rpc('get_detalhes_pasto_mapa', { p_pasto_id: pastoId })
  if (error) {
    console.warn('[MapaCache] Erro ao buscar detalhes do pasto:', error.message)
    return null
  }
  return data?.[0] ?? null
}

/**
 * Busca detalhes completos de um curral (incluindo lote e dietas).
 * Requer conectividade (chama RPC do Supabase).
 */
export async function getDetalhesCurral(curralId: string): Promise<DetalheCurral | null> {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client.rpc('get_detalhes_curral_mapa', { p_curral_id: curralId })
  if (error) {
    console.warn('[MapaCache] Erro ao buscar detalhes do curral:', error.message)
    return null
  }
  return data?.[0] ?? null
}

/**
 * Carrega geometrias do IndexedDB (cache local offline).
 */
export async function loadMapaFazenda(): Promise<MapaFazendaData | null> {
  const data = await getCadastroData(MAPA_CACHE_KEY)
  if (!data) return null
  return data as MapaFazendaData
}

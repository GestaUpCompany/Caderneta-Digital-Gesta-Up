import { getSupabaseClientWithRefresh } from './supabaseClient'
import { saveCadastroData, getCadastroData, saveRegistro, getAllRegistros } from './indexedDB'
import { Registro } from '../types/cadernetas'
import { v4 as uuidv4 } from 'uuid'

export interface AtividadeFuncionarioPWA {
  id: string
  atividadeId: string
  funcionarioId: string
  statusIndividual: string
  inicioAt: string | null
  fimAt: string | null
  detalhamento: string | null
  tempoGastoSegundos: number | null
  fotoBase64: string | null
  fotoUrl: string | null
  latitude: number | null
  longitude: number | null
  gpsAccuracy: number | null
  // Joined da atividade
  titulo: string
  descricao: string | null
  local: string | null
  dataInicio: string
  dataFim: string
  prioridade: number
  status: string
  naoPrevista: boolean
  setorNome: string | null
  // Sync
  syncStatus: 'pending' | 'synced' | 'error'
  lastModified: number
}

export interface AtividadeSessaoLocal {
  id: string
  supabaseId?: string
  atividadeFuncionarioId: string
  inicioAt: string
  fimAt: string | null
  duracaoSegundos: number | null
  trabalhada: boolean
  motivoPausa: string | null
  syncStatus: 'pending' | 'synced' | 'error'
  lastModified: number
}

export interface AtividadeImprevistoLocal {
  id: string
  supabaseId?: string
  atividadeFuncionarioId: string
  tipo: string
  descricao: string | null
  ocorridoAt: string
  impactoMinutos: number | null
  syncStatus: 'pending' | 'synced' | 'error'
  lastModified: number
}

export interface ImprevistoCategoria {
  id: string
  nome: string
}

export interface TempoCalculado {
  produtivoSeg: number
  brutoSeg: number
  temSessaoAberta: boolean
  inicioSessaoAberta: string | null
  sessaoAbertaId: string | null
}

const CACHE_KEY_PREFIX = 'atividades_'
const CATEGORIAS_CACHE_KEY = 'atividade_imprevisto_categorias_'

function afToRegistro(af: AtividadeFuncionarioPWA): Registro {
  return {
    id: af.id,
    supabaseId: af.id, // O id do atividade_funcionarios ja e o UUID do Supabase
    version: 1,
    lastModified: new Date(af.lastModified).toISOString(),
    syncStatus: af.syncStatus,
    // Campos especificos
    atividadeId: af.atividadeId,
    funcionarioId: af.funcionarioId,
    statusIndividual: af.statusIndividual,
    inicioAt: af.inicioAt,
    fimAt: af.fimAt,
    detalhamento: af.detalhamento,
    tempoGastoSegundos: af.tempoGastoSegundos,
    fotoBase64: af.fotoBase64,
    fotoUrl: af.fotoUrl,
    latitude: af.latitude,
    longitude: af.longitude,
    gpsAccuracy: af.gpsAccuracy,
  } as unknown as Registro
}

function sessaoToRegistro(s: AtividadeSessaoLocal): Registro {
  return {
    id: s.id,
    supabaseId: s.supabaseId || s.id,
    version: 1,
    lastModified: new Date(s.lastModified).toISOString(),
    syncStatus: s.syncStatus,
    data: s.inicioAt,
    atividadeFuncionarioId: s.atividadeFuncionarioId,
    inicioAt: s.inicioAt,
    fimAt: s.fimAt,
    duracaoSegundos: s.duracaoSegundos,
    trabalhada: s.trabalhada,
    motivoPausa: s.motivoPausa,
  } as unknown as Registro
}

function imprevistoToRegistro(i: AtividadeImprevistoLocal): Registro {
  return {
    id: i.id,
    supabaseId: i.supabaseId || i.id,
    version: 1,
    lastModified: new Date(i.lastModified).toISOString(),
    syncStatus: i.syncStatus,
    data: i.ocorridoAt,
    atividadeFuncionarioId: i.atividadeFuncionarioId,
    tipo: i.tipo,
    descricao: i.descricao,
    ocorridoAt: i.ocorridoAt,
    impactoMinutos: i.impactoMinutos,
  } as unknown as Registro
}

export async function fetchAtividadesFuncionario(
  fazendaId: string,
  funcionarioId: string
): Promise<AtividadeFuncionarioPWA[]> {
  const supabase = await getSupabaseClientWithRefresh()
  if (!supabase) throw new Error('Sem cliente Supabase')

  const { data, error } = await (supabase as any)
    .rpc('get_atividades_funcionario', {
      p_fazenda_id: fazendaId,
      p_funcionario_id: funcionarioId,
    })

  if (error) throw error

  const mapped = (data || []).map((row: any) => ({
    id: row.id,
    atividadeId: row.atividade_id,
    funcionarioId,
    statusIndividual: row.status_individual,
    inicioAt: row.inicio_at,
    fimAt: row.fim_at,
    detalhamento: row.detalhamento,
    tempoGastoSegundos: row.tempo_gasto_segundos,
    fotoBase64: null,
    fotoUrl: row.foto_url ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    gpsAccuracy: row.gps_accuracy ?? null,
    titulo: row.titulo,
    descricao: row.descricao,
    local: row.local,
    dataInicio: row.data_inicio,
    dataFim: row.data_fim,
    prioridade: row.prioridade,
    status: row.status,
    naoPrevista: row.nao_prevista ?? false,
    setorNome: row.setor_nome,
    syncStatus: 'synced' as const,
    lastModified: Date.now(),
  })) as AtividadeFuncionarioPWA[]

  // Salvar no cache (cadastroData) para a UI
  await saveCadastroData(`${CACHE_KEY_PREFIX}${funcionarioId}`, { fazendaId, atividades: mapped, timestamp: Date.now() })
  return mapped
}

export async function getCachedAtividades(funcionarioId: string): Promise<AtividadeFuncionarioPWA[]> {
  const cached = await getCadastroData(`${CACHE_KEY_PREFIX}${funcionarioId}`)
  if (cached && cached.atividades) {
    return cached.atividades as AtividadeFuncionarioPWA[]
  }
  return []
}

/**
 * Busca mutacoes locais pendentes no store atividade-funcionarios do IndexedDB.
 * Retorna um mapa de id -> status/inicio/fim/detalhamento para sobrepor ao fetch online.
 */
async function getLocalPendingMutations(): Promise<Map<string, Partial<AtividadeFuncionarioPWA>>> {
  const map = new Map<string, Partial<AtividadeFuncionarioPWA>>()
  try {
    const all = await getAllRegistros('atividade-funcionarios')
    for (const reg of all) {
      if (reg.syncStatus === 'pending') {
        map.set(reg.id, {
          statusIndividual: (reg as any).statusIndividual,
          inicioAt: (reg as any).inicioAt,
          fimAt: (reg as any).fimAt,
          detalhamento: (reg as any).detalhamento,
          tempoGastoSegundos: (reg as any).tempoGastoSegundos,
          fotoUrl: (reg as any).fotoUrl ?? null,
          latitude: (reg as any).latitude ?? null,
          longitude: (reg as any).longitude ?? null,
          gpsAccuracy: (reg as any).gpsAccuracy ?? null,
          syncStatus: 'pending',
        })
      }
    }
  } catch (err) {
    console.warn('[Atividades] Erro ao buscar mutacoes locais pendentes:', err)
  }
  return map
}

export async function getAtividadesOnlineFirst(
  fazendaId: string,
  funcionarioId: string
): Promise<AtividadeFuncionarioPWA[]> {
  try {
    // Ler cache ANTES do fetch, pois fetchAtividadesFuncionario sobrescreve o cache
    // com o resultado do servidor, apagando atividades criadas localmente que ainda nao sincronizaram
    const cachedBefore = await getCachedAtividades(funcionarioId)

    const online = await fetchAtividadesFuncionario(fazendaId, funcionarioId)
    // Sobrepor mutacoes locais pendentes sobre os dados online
    const pending = await getLocalPendingMutations()
    const onlineIds = new Set(online.map((a) => a.id))

    // Itens que estavam no cache antes do fetch mas nao no online (criados localmente, sync pendente)
    const localOnly = cachedBefore.filter((a) => !onlineIds.has(a.id) && a.syncStatus === 'pending')

    if (pending.size > 0 || localOnly.length > 0) {
      const merged = online.map((a) => {
        const local = pending.get(a.id)
        return local ? { ...a, ...local } : a
      })
      // Adicionar itens locais nao sincronizados no inicio da lista
      const result = [...localOnly, ...merged]
      await saveCadastroData(`${CACHE_KEY_PREFIX}${funcionarioId}`, { fazendaId, atividades: result, timestamp: Date.now() })
      return result
    }
    return online
  } catch (error) {
    console.warn('[Atividades] Falha ao buscar online, usando cache:', error)
    return getCachedAtividades(funcionarioId)
  }
}

async function updateCacheAndStore(af: AtividadeFuncionarioPWA): Promise<void> {
  // 1. Salvar no store atividade-funcionarios (para o processQueue encontrar)
  await saveRegistro('atividade-funcionarios', afToRegistro(af))
  // 2. Atualizar cache na cadastroData (para a UI) - upsert
  const cached = await getCachedAtividades(af.funcionarioId)
  const idx = cached.findIndex((a) => a.id === af.id)
  const updatedCache = idx >= 0 ? cached.map((a) => (a.id === af.id ? af : a)) : [af, ...cached]
  await saveCadastroData(`${CACHE_KEY_PREFIX}${af.funcionarioId}`, { atividades: updatedCache, timestamp: Date.now() })
}

// ============================================================
// Sessoes: buscar, calcular tempo
// ============================================================

export async function getSessoesLocal(atividadeFuncionarioId: string): Promise<AtividadeSessaoLocal[]> {
  try {
    const all = await getAllRegistros('atividade-sessoes')
    return all
      .filter((r) => (r as any).atividadeFuncionarioId === atividadeFuncionarioId)
      .map((r) => ({
        id: r.id,
        supabaseId: (r as any).supabaseId,
        atividadeFuncionarioId: (r as any).atividadeFuncionarioId,
        inicioAt: (r as any).inicioAt,
        fimAt: (r as any).fimAt ?? null,
        duracaoSegundos: (r as any).duracaoSegundos ?? null,
        trabalhada: (r as any).trabalhada ?? true,
        motivoPausa: (r as any).motivoPausa ?? null,
        syncStatus: r.syncStatus as any,
        lastModified: new Date(r.lastModified).getTime(),
      }))
      .sort((a, b) => a.inicioAt.localeCompare(b.inicioAt))
  } catch (err) {
    console.warn('[Atividades] Erro ao buscar sessoes locais:', err)
    return []
  }
}

export async function getImprevistosLocal(atividadeFuncionarioId: string): Promise<AtividadeImprevistoLocal[]> {
  try {
    const all = await getAllRegistros('atividade-imprevistos')
    return all
      .filter((r) => (r as any).atividadeFuncionarioId === atividadeFuncionarioId)
      .map((r) => ({
        id: r.id,
        supabaseId: (r as any).supabaseId,
        atividadeFuncionarioId: (r as any).atividadeFuncionarioId,
        tipo: (r as any).tipo,
        descricao: (r as any).descricao ?? null,
        ocorridoAt: (r as any).ocorridoAt,
        impactoMinutos: (r as any).impactoMinutos ?? null,
        syncStatus: r.syncStatus as any,
        lastModified: new Date(r.lastModified).getTime(),
      }))
      .sort((a, b) => a.ocorridoAt.localeCompare(b.ocorridoAt))
  } catch (err) {
    console.warn('[Atividades] Erro ao buscar imprevistos locais:', err)
    return []
  }
}

/**
 * Calcula tempo produtivo (só sessões trabalhadas fechadas + sessão aberta atual),
 * tempo bruto (todas as sessões fechadas + aberta), e info da sessão aberta.
 */
export async function calcularTempoLocal(atividadeFuncionarioId: string): Promise<TempoCalculado> {
  const sessoes = await getSessoesLocal(atividadeFuncionarioId)
  const now = Date.now()
  let produtivoSeg = 0
  let brutoSeg = 0
  let temSessaoAberta = false
  let inicioSessaoAberta: string | null = null
  let sessaoAbertaId: string | null = null

  for (const s of sessoes) {
    if (s.fimAt) {
      if (s.duracaoSegundos != null) {
        brutoSeg += s.duracaoSegundos
        if (s.trabalhada) produtivoSeg += s.duracaoSegundos
      }
    } else {
      // Sessao aberta: so conta como "temSessaoAberta" se for trabalhada (cronometro so roda em trabalho)
      if (s.trabalhada) {
        temSessaoAberta = true
        inicioSessaoAberta = s.inicioAt
        sessaoAbertaId = s.id
      }
      const decorrido = Math.floor((now - new Date(s.inicioAt).getTime()) / 1000)
      if (decorrido > 0) {
        brutoSeg += decorrido
        if (s.trabalhada) produtivoSeg += decorrido
      }
    }
  }

  return { produtivoSeg, brutoSeg, temSessaoAberta, inicioSessaoAberta, sessaoAbertaId }
}

// ============================================================
// Mutacoes: iniciar, pausar, retomar, concluir, imprevisto
// ============================================================

/**
 * Cria uma atividade nao prevista ja concluida, sem cronometro nem sessoes.
 * Registro pontual feito no fim do dia: titulo + descricao + foto/GPS opcionais.
 * Nao cria atividade_sessoes (atividade pontual sem medicao de tempo).
 */
export async function criarAtividadeNaoPrevistaConcluidaLocal(
  fazendaId: string,
  funcionarioId: string,
  titulo: string,
  descricao: string | null,
  fotoBase64?: string | null,
  latitude?: number | null,
  longitude?: number | null,
  gpsAccuracy?: number | null
): Promise<AtividadeFuncionarioPWA> {
  const now = new Date().toISOString()
  const today = now.split('T')[0]
  const nowMs = Date.now()

  const atividadeId = uuidv4()
  const afId = uuidv4()

  // 1. Salvar a atividade no store 'atividades' (para sync com Supabase)
  const atividadeRegistro: Registro = {
    id: atividadeId,
    supabaseId: atividadeId,
    version: 1,
    lastModified: now,
    syncStatus: 'pending',
    fazendaId,
    titulo,
    descricao,
    dataInicio: today,
    dataFim: today,
    prioridade: 3,
    status: 'concluida',
  } as unknown as Registro
  await saveRegistro('atividades', atividadeRegistro)

  // 2. Criar atividade_funcionarios ja concluida (sem sessoes)
  const af: AtividadeFuncionarioPWA = {
    id: afId,
    atividadeId,
    funcionarioId,
    statusIndividual: 'concluida',
    inicioAt: now,
    fimAt: now,
    detalhamento: null,
    tempoGastoSegundos: 0,
    fotoBase64: fotoBase64 ?? null,
    fotoUrl: null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    gpsAccuracy: gpsAccuracy ?? null,
    titulo,
    descricao,
    local: null,
    dataInicio: today,
    dataFim: today,
    prioridade: 3,
    status: 'concluida',
    naoPrevista: true,
    setorNome: null,
    syncStatus: 'pending',
    lastModified: nowMs,
  }
  await saveRegistro('atividade-funcionarios', afToRegistro(af))

  // 3. Atualizar cache da UI (sem criar atividade-sessoes)
  const cached = await getCachedAtividades(funcionarioId)
  await saveCadastroData(`${CACHE_KEY_PREFIX}${funcionarioId}`, {
    atividades: [af, ...cached],
    timestamp: nowMs,
  })

  return af
}

/**
 * Inicia a atividade: status -> em_andamento, cria sessao aberta.
 * Substitui marcarEmAndamentoLocal (que nao criava sessao).
 */
export async function iniciarAtividadeLocal(af: AtividadeFuncionarioPWA): Promise<AtividadeFuncionarioPWA> {
  const now = new Date().toISOString()
  const updated: AtividadeFuncionarioPWA = {
    ...af,
    statusIndividual: 'em_andamento',
    inicioAt: af.inicioAt || now, // mantem primeiro inicio se ja existia
    syncStatus: 'pending',
    lastModified: Date.now(),
  }
  await updateCacheAndStore(updated)

  // Criar sessao aberta
  const sessaoId = uuidv4()
  const sessao: AtividadeSessaoLocal = {
    id: sessaoId,
    supabaseId: sessaoId,
    atividadeFuncionarioId: af.id,
    inicioAt: now,
    fimAt: null,
    duracaoSegundos: null,
    trabalhada: true,
    motivoPausa: null,
    syncStatus: 'pending',
    lastModified: Date.now(),
  }
  await saveRegistro('atividade-sessoes', sessaoToRegistro(sessao))

  return updated
}

/**
 * Pausa a atividade: fecha sessao aberta com duracao calculada, status -> pausada.
 * trabalhada=true para pausa normal (ex: fim do expediente), false para almoço.
 */
export async function pausarAtividadeLocal(
  af: AtividadeFuncionarioPWA,
  trabalhada: boolean,
  motivoPausa?: string
): Promise<AtividadeFuncionarioPWA> {
  const now = new Date().toISOString()
  const nowMs = Date.now()

  // Buscar sessao aberta e fecha-la como TRABALHADA (o tempo ate agora foi trabalho)
  const sessoes = await getSessoesLocal(af.id)
  const aberta = sessoes.find((s) => !s.fimAt)
  if (aberta) {
    const duracao = Math.floor((nowMs - new Date(aberta.inicioAt).getTime()) / 1000)
    const fechada: AtividadeSessaoLocal = {
      ...aberta,
      fimAt: now,
      duracaoSegundos: duracao,
      trabalhada: true,
      motivoPausa: null,
      syncStatus: 'pending',
      lastModified: nowMs,
    }
    await saveRegistro('atividade-sessoes', sessaoToRegistro(fechada))
  }

  // Se a pausa nao e trabalhada (ex: almoço), abrir uma nova sessao nao trabalhada
  if (!trabalhada) {
    const sessaoId = uuidv4()
    const sessaoPausa: AtividadeSessaoLocal = {
      id: sessaoId,
      supabaseId: sessaoId,
      atividadeFuncionarioId: af.id,
      inicioAt: now,
      fimAt: null,
      duracaoSegundos: null,
      trabalhada: false,
      motivoPausa: motivoPausa || null,
      syncStatus: 'pending',
      lastModified: nowMs,
    }
    await saveRegistro('atividade-sessoes', sessaoToRegistro(sessaoPausa))
  }

  const updated: AtividadeFuncionarioPWA = {
    ...af,
    statusIndividual: 'pausada',
    syncStatus: 'pending',
    lastModified: nowMs,
  }
  await updateCacheAndStore(updated)
  return updated
}

/**
 * Retoma atividade pausada: status -> em_andamento, cria nova sessao aberta.
 */
export async function retomarAtividadeLocal(af: AtividadeFuncionarioPWA): Promise<AtividadeFuncionarioPWA> {
  const now = new Date().toISOString()
  const nowMs = Date.now()

  // Fechar qualquer sessao aberta (ex: sessao de almoço/pausa nao trabalhada)
  const sessoes = await getSessoesLocal(af.id)
  const aberta = sessoes.find((s) => !s.fimAt)
  if (aberta) {
    const duracao = Math.floor((nowMs - new Date(aberta.inicioAt).getTime()) / 1000)
    const fechada: AtividadeSessaoLocal = {
      ...aberta,
      fimAt: now,
      duracaoSegundos: duracao,
      syncStatus: 'pending',
      lastModified: nowMs,
    }
    await saveRegistro('atividade-sessoes', sessaoToRegistro(fechada))
  }

  const updated: AtividadeFuncionarioPWA = {
    ...af,
    statusIndividual: 'em_andamento',
    syncStatus: 'pending',
    lastModified: nowMs,
  }
  await updateCacheAndStore(updated)

  const sessaoId = uuidv4()
  const sessao: AtividadeSessaoLocal = {
    id: sessaoId,
    supabaseId: sessaoId,
    atividadeFuncionarioId: af.id,
    inicioAt: now,
    fimAt: null,
    duracaoSegundos: null,
    trabalhada: true,
    motivoPausa: null,
    syncStatus: 'pending',
    lastModified: nowMs,
  }
  await saveRegistro('atividade-sessoes', sessaoToRegistro(sessao))

  return updated
}

/**
 * Registra imprevisto anexado ao atividade_funcionario.
 */
export async function registrarImprevistoLocal(
  af: AtividadeFuncionarioPWA,
  tipo: string,
  descricao: string | null,
  impactoMinutos: number | null
): Promise<void> {
  const now = new Date().toISOString()
  const id = uuidv4()
  const imprevisto: AtividadeImprevistoLocal = {
    id,
    supabaseId: id,
    atividadeFuncionarioId: af.id,
    tipo,
    descricao,
    ocorridoAt: now,
    impactoMinutos,
    syncStatus: 'pending',
    lastModified: Date.now(),
  }
  await saveRegistro('atividade-imprevistos', imprevistoToRegistro(imprevisto))
}

/**
 * Conclui atividade: fecha sessao aberta se houver, status -> concluida, detalhamento.
 * Aceita foto (base64) e coordenadas GPS opcionais.
 */
export async function concluirAtividadeLocal(
  af: AtividadeFuncionarioPWA,
  detalhamento: string | null,
  fotoBase64?: string | null,
  latitude?: number | null,
  longitude?: number | null,
  gpsAccuracy?: number | null
): Promise<AtividadeFuncionarioPWA> {
  const now = new Date().toISOString()
  const nowMs = Date.now()

  // Fechar sessao aberta se houver
  const sessoes = await getSessoesLocal(af.id)
  const aberta = sessoes.find((s) => !s.fimAt)
  if (aberta) {
    const duracao = Math.floor((nowMs - new Date(aberta.inicioAt).getTime()) / 1000)
    const fechada: AtividadeSessaoLocal = {
      ...aberta,
      fimAt: now,
      duracaoSegundos: duracao,
      syncStatus: 'pending',
      lastModified: nowMs,
    }
    await saveRegistro('atividade-sessoes', sessaoToRegistro(fechada))
  }

  // Recalcular tempo produtivo local para refletir imediatamente na UI
  const tempo = await calcularTempoLocal(af.id)

  const updated: AtividadeFuncionarioPWA = {
    ...af,
    statusIndividual: 'concluida',
    fimAt: now,
    detalhamento,
    tempoGastoSegundos: tempo.produtivoSeg,
    fotoBase64: fotoBase64 ?? null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    gpsAccuracy: gpsAccuracy ?? null,
    syncStatus: 'pending',
    lastModified: nowMs,
  }
  await updateCacheAndStore(updated)
  return updated
}

// ============================================================
// Categorias de imprevisto (online com cache)
// ============================================================

export async function getImprevistoCategorias(fazendaId: string): Promise<ImprevistoCategoria[]> {
  // Tentar cache primeiro
  const cached = await getCadastroData(`${CATEGORIAS_CACHE_KEY}${fazendaId}`)
  if (cached && Array.isArray(cached.categorias) && cached.categorias.length > 0) {
    return cached.categorias as ImprevistoCategoria[]
  }

  try {
    const supabase = await getSupabaseClientWithRefresh()
    if (!supabase) return []
    const { data, error } = await (supabase as any)
      .from('atividade_imprevisto_categorias')
      .select('id, nome')
      .eq('fazenda_id', fazendaId)
      .eq('ativo', true)
      .order('nome', { ascending: true })
    if (error) throw error
    const categorias = (data || []) as ImprevistoCategoria[]
    await saveCadastroData(`${CATEGORIAS_CACHE_KEY}${fazendaId}`, { categorias, timestamp: Date.now() })
    return categorias
  } catch (err) {
    console.warn('[Atividades] Erro ao buscar categorias de imprevisto:', err)
    return cached?.categorias || []
  }
}

// ============================================================
// Backward compat: marcarEmAndamentoLocal / marcarConcluidaLocal
// ============================================================

/** @deprecated usar iniciarAtividadeLocal (cria sessao de tempo) */
export async function marcarEmAndamentoLocal(af: AtividadeFuncionarioPWA): Promise<AtividadeFuncionarioPWA> {
  return iniciarAtividadeLocal(af)
}

/** @deprecated usar concluirAtividadeLocal (fecha sessao aberta) */
export async function marcarConcluidaLocal(
  af: AtividadeFuncionarioPWA,
  detalhamento: string | null
): Promise<AtividadeFuncionarioPWA> {
  return concluirAtividadeLocal(af, detalhamento)
}

// ============================================================
// Formatacao
// ============================================================

export function formatarTempo(segundos: number): string {
  if (segundos <= 0) return '0min'
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}min`
  if (m > 0) return `${m}min${s > 0 ? ` ${s}s` : ''}`
  return `${s}s`
}

export function formatarResumoAtividades(atividades: AtividadeFuncionarioPWA[]): string {
  const concluidas = atividades.filter((a) => a.statusIndividual === 'concluida')
  if (concluidas.length === 0) return 'Nenhuma atividade concluída ainda.'

  let texto = `📋 RESUMO DE ATIVIDADES\n`
  texto += `📅 ${new Date().toLocaleDateString('pt-BR')}\n\n`

  concluidas.forEach((a, i) => {
    texto += `${i + 1}. ${a.titulo}\n`
    if (a.detalhamento) {
      texto += `   Detalhamento: ${a.detalhamento}\n`
    }
    if (a.tempoGastoSegundos && a.tempoGastoSegundos > 0) {
      texto += `   Tempo: ${formatarTempo(a.tempoGastoSegundos)}\n`
    }
    texto += `\n`
  })

  texto += `Total: ${concluidas.length} atividade(s) concluída(s)`
  return texto
}

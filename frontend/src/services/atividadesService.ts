import { getSupabaseClientWithRefresh } from './supabaseClient'
import { saveCadastroData, getCadastroData, saveRegistro, getAllRegistros } from './indexedDB'
import { Registro } from '../types/cadernetas'

export interface AtividadeFuncionarioPWA {
  id: string
  atividadeId: string
  funcionarioId: string
  statusIndividual: string
  inicioAt: string | null
  fimAt: string | null
  detalhamento: string | null
  tempoGastoSegundos: number | null
  // Joined da atividade
  titulo: string
  descricao: string | null
  dataInicio: string
  dataFim: string
  prioridade: number
  status: string
  setorNome: string | null
  equipeNome: string | null
  // Sync
  syncStatus: 'pending' | 'synced' | 'error'
  lastModified: number
}

const CACHE_KEY_PREFIX = 'atividades_'

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
    titulo: row.titulo,
    descricao: row.descricao,
    dataInicio: row.data_inicio,
    dataFim: row.data_fim,
    prioridade: row.prioridade,
    status: row.status,
    setorNome: row.setor_nome,
    equipeNome: row.equipe_nome,
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
    const online = await fetchAtividadesFuncionario(fazendaId, funcionarioId)
    // Sobrepor mutacoes locais pendentes sobre os dados online
    const pending = await getLocalPendingMutations()
    if (pending.size > 0) {
      const merged = online.map((a) => {
        const local = pending.get(a.id)
        return local ? { ...a, ...local } : a
      })
      // Atualizar cache com merged
      await saveCadastroData(`${CACHE_KEY_PREFIX}${funcionarioId}`, { fazendaId, atividades: merged, timestamp: Date.now() })
      return merged
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
  // 2. Atualizar cache na cadastroData (para a UI)
  const cached = await getCachedAtividades(af.funcionarioId)
  const updatedCache = cached.map((a) => (a.id === af.id ? af : a))
  await saveCadastroData(`${CACHE_KEY_PREFIX}${af.funcionarioId}`, { atividades: updatedCache, timestamp: Date.now() })
}

export async function marcarEmAndamentoLocal(af: AtividadeFuncionarioPWA): Promise<AtividadeFuncionarioPWA> {
  const updated: AtividadeFuncionarioPWA = {
    ...af,
    statusIndividual: 'em_andamento',
    inicioAt: new Date().toISOString(),
    syncStatus: 'pending',
    lastModified: Date.now(),
  }
  await updateCacheAndStore(updated)
  return updated
}

export async function marcarConcluidaLocal(
  af: AtividadeFuncionarioPWA,
  detalhamento: string
): Promise<AtividadeFuncionarioPWA> {
  const fimAt = new Date().toISOString()
  const inicioAt = af.inicioAt || fimAt
  const tempoGasto = Math.floor((new Date(fimAt).getTime() - new Date(inicioAt).getTime()) / 1000)

  const updated: AtividadeFuncionarioPWA = {
    ...af,
    statusIndividual: 'concluida',
    fimAt,
    detalhamento,
    tempoGastoSegundos: tempoGasto,
    syncStatus: 'pending',
    lastModified: Date.now(),
  }
  await updateCacheAndStore(updated)
  return updated
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
    if (a.tempoGastoSegundos) {
      const min = Math.floor(a.tempoGastoSegundos / 60)
      texto += `   Tempo: ${min}min\n`
    }
    texto += `\n`
  })

  texto += `Total: ${concluidas.length} atividade(s) concluída(s)`
  return texto
}

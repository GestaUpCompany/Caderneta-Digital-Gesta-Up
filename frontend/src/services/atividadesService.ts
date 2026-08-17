import { getSupabaseClientWithRefresh } from './supabaseClient'
import { saveCadastroData, getCadastroData } from './indexedDB'

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

export async function fetchAtividadesFuncionario(
  fazendaId: string,
  funcionarioId: string
): Promise<AtividadeFuncionarioPWA[]> {
  const supabase = await getSupabaseClientWithRefresh()
  if (!supabase) throw new Error('Sem cliente Supabase')

  // Usar RPC dedicada
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

export async function getAtividadesOnlineFirst(
  fazendaId: string,
  funcionarioId: string
): Promise<AtividadeFuncionarioPWA[]> {
  try {
    return await fetchAtividadesFuncionario(fazendaId, funcionarioId)
  } catch (error) {
    console.warn('[Atividades] Falha ao buscar online, usando cache:', error)
    return getCachedAtividades(funcionarioId)
  }
}

export async function marcarEmAndamentoLocal(af: AtividadeFuncionarioPWA): Promise<AtividadeFuncionarioPWA> {
  const updated: AtividadeFuncionarioPWA = {
    ...af,
    statusIndividual: 'em_andamento',
    inicioAt: new Date().toISOString(),
    syncStatus: 'pending',
    lastModified: Date.now(),
  }
  const cached = await getCachedAtividades(af.funcionarioId)
  const updatedCache = cached.map((a) => (a.id === af.id ? updated : a))
  await saveCadastroData(`${CACHE_KEY_PREFIX}${af.funcionarioId}`, { atividades: updatedCache, timestamp: Date.now() })
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
  const cached = await getCachedAtividades(af.funcionarioId)
  const updatedCache = cached.map((a) => (a.id === af.id ? updated : a))
  await saveCadastroData(`${CACHE_KEY_PREFIX}${af.funcionarioId}`, { atividades: updatedCache, timestamp: Date.now() })
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

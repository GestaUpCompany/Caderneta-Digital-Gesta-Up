import { saveCadastroData, getCadastroData } from './indexedDB'
import { getSupabaseClientWithRefresh } from './supabaseClient'
import {
  ExecucaoRotina,
  StatusExecucao,
  calcularStatusExecucao,
  getHorarioAtualHHMMSS,
  getDataIso,
} from '../utils/execucaoRotina'
import { DEFAULT_FARM_TIMEZONE } from '../utils/formatDate'

const CACHE_KEY = 'execucoes_rotina'

function gerarUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function getDispositivoId(): string {
  if (typeof navigator !== 'undefined' && navigator.userAgent) {
    return navigator.userAgent.slice(0, 200)
  }
  return 'unknown'
}

export type { ExecucaoRotina, StatusExecucao }

export interface GarantirExecucaoParams {
  fazendaId: string
  funcionarioId: string
  rotinaId?: string | null
  cadernetaId: string
  data?: string
  horarioProgramado?: string | null
  timezone?: string
}

export async function garantirExecucaoRotina(
  params: GarantirExecucaoParams
): Promise<ExecucaoRotina> {
  const {
    fazendaId,
    funcionarioId,
    rotinaId = null,
    cadernetaId,
    data = getDataIso(),
    horarioProgramado = null,
    timezone = DEFAULT_FARM_TIMEZONE,
  } = params

  const chaveLocal = `${fazendaId}:${funcionarioId}:${cadernetaId}:${data}`
  const cached = await getCadastroData(CACHE_KEY)
  const execucoesLocais: Record<string, ExecucaoRotina> = cached?.execucoes || {}

  const horaLocal = getHorarioAtualHHMMSS(timezone)

  const existente = execucoesLocais[chaveLocal]
  if (existente) {
    if (!existente.primeiro_acesso) {
      existente.primeiro_acesso = new Date().toISOString()
      existente.primeiro_acesso_local = horaLocal
    }
    existente.pendente_sync = true
    await salvarExecucoesLocal(fazendaId, execucoesLocais)
    // Fire-and-forget: telemetria não pode bloquear o fluxo do usuário;
    // falhas ficam marcadas com pendente_sync e são reenviadas depois.
    void sincronizarExecucaoMarcada(fazendaId, execucoesLocais, existente)
    return existente
  }

  const nova: ExecucaoRotina = {
    id: gerarUuid(),
    fazenda_id: fazendaId,
    funcionario_id: funcionarioId,
    rotina_id: rotinaId || null,
    caderneta_id: cadernetaId,
    data,
    horario_programado: horarioProgramado,
    primeiro_acesso: new Date().toISOString(),
    primeiro_acesso_local: horaLocal,
    primeiro_registro: null,
    primeiro_registro_local: null,
    status: 'nao_executado',
    observacao: null,
    concluido: false,
    dispositivo_id: getDispositivoId(),
    pendente_sync: true,
  }

  execucoesLocais[chaveLocal] = nova
  await salvarExecucoesLocal(fazendaId, execucoesLocais)
  void sincronizarExecucaoMarcada(fazendaId, execucoesLocais, nova)

  return nova
}

export interface RegistrarExecucaoParams {
  fazendaId: string
  funcionarioId: string
  cadernetaId: string
  data?: string
  horarioRegistro?: string
  observacao?: string | null
  toleranciaMinutos?: number
  timezone?: string
}

export async function registrarExecucaoRotina(
  params: RegistrarExecucaoParams
): Promise<ExecucaoRotina> {
  const {
    fazendaId,
    funcionarioId,
    cadernetaId,
    data = getDataIso(),
    horarioRegistro = getHorarioAtualHHMMSS(),
    observacao = null,
    toleranciaMinutos = 30,
    timezone = DEFAULT_FARM_TIMEZONE,
  } = params

  const chaveLocal = `${fazendaId}:${funcionarioId}:${cadernetaId}:${data}`
  const cached = await getCadastroData(CACHE_KEY)
  const execucoesLocais: Record<string, ExecucaoRotina> = cached?.execucoes || {}

  const horaLocal = getHorarioAtualHHMMSS(timezone)

  const existente = execucoesLocais[chaveLocal]
  if (existente) {
    if (!existente.primeiro_registro) {
      existente.primeiro_registro = new Date().toISOString()
      existente.primeiro_registro_local = horaLocal
    }
    existente.status = calcularStatusExecucao(
      existente.horario_programado,
      horarioRegistro,
      toleranciaMinutos
    )
    if (observacao) existente.observacao = observacao
    existente.concluido = true
    existente.pendente_sync = true
    await salvarExecucoesLocal(fazendaId, execucoesLocais)
    void sincronizarExecucaoMarcada(fazendaId, execucoesLocais, existente)
    return existente
  }

  const nova: ExecucaoRotina = {
    id: gerarUuid(),
    fazenda_id: fazendaId,
    funcionario_id: funcionarioId,
    rotina_id: null,
    caderneta_id: cadernetaId,
    data,
    horario_programado: null,
    primeiro_acesso: new Date().toISOString(),
    primeiro_acesso_local: horaLocal,
    primeiro_registro: new Date().toISOString(),
    primeiro_registro_local: horaLocal,
    status: calcularStatusExecucao(null, horarioRegistro, toleranciaMinutos),
    observacao,
    concluido: true,
    dispositivo_id: getDispositivoId(),
    pendente_sync: true,
  }

  execucoesLocais[chaveLocal] = nova
  await salvarExecucoesLocal(fazendaId, execucoesLocais)
  void sincronizarExecucaoMarcada(fazendaId, execucoesLocais, nova)

  return nova
}

async function salvarExecucoesLocal(
  fazendaId: string,
  execucoes: Record<string, ExecucaoRotina>
): Promise<void> {
  await saveCadastroData(
    CACHE_KEY,
    { fazendaId, execucoes, timestamp: Date.now() },
    fazendaId
  )
}

async function sincronizarExecucao(execucao: ExecucaoRotina): Promise<void> {
  const client = await getSupabaseClientWithRefresh()
  const payload = {
    id: execucao.id,
    fazenda_id: execucao.fazenda_id,
    funcionario_id: execucao.funcionario_id,
    rotina_id: execucao.rotina_id,
    caderneta_id: execucao.caderneta_id,
    data: execucao.data,
    horario_programado: execucao.horario_programado,
    primeiro_acesso: execucao.primeiro_acesso,
    primeiro_acesso_local: execucao.primeiro_acesso_local,
    primeiro_registro: execucao.primeiro_registro,
    primeiro_registro_local: execucao.primeiro_registro_local,
    status: execucao.status,
    observacao: execucao.observacao,
    concluido: execucao.concluido,
    dispositivo_id: execucao.dispositivo_id,
  }

  const { error } = await client.from('execucoes_rotina').upsert(payload, {
    onConflict: 'id',
  })

  if (error) throw error
}

// Sync best-effort: nunca propaga erro (telemetria não pode bloquear o
// registro da caderneta). Em sucesso, limpa a flag pendente_sync no cache
// local para que sincronizarExecucoesPendentes não reenvie à toa.
async function sincronizarExecucaoMarcada(
  fazendaId: string,
  execucoesLocais: Record<string, ExecucaoRotina>,
  execucao: ExecucaoRotina
): Promise<void> {
  try {
    await sincronizarExecucao(execucao)
    if (execucao.pendente_sync) {
      execucao.pendente_sync = false
      await salvarExecucoesLocal(fazendaId, execucoesLocais)
    }
  } catch (err) {
    console.warn('[ExecucaoRotina] Falha ao sincronizar execução, ficará no cache:', err)
  }
}

export async function getExecucoesRotinaDoDia(
  fazendaId: string,
  funcionarioId: string,
  data: string = getDataIso()
): Promise<ExecucaoRotina[]> {
  const cached = await getCadastroData(CACHE_KEY)
  if (cached?.execucoes) {
    return Object.values(cached.execucoes).filter(
      (e: any) =>
        e.fazenda_id === fazendaId &&
        e.funcionario_id === funcionarioId &&
        e.data === data
    ) as ExecucaoRotina[]
  }
  return []
}

export async function sincronizarExecucoesPendentes(fazendaId: string): Promise<void> {
  const cached = await getCadastroData(CACHE_KEY)
  if (!cached?.execucoes) return

  const execucoesLocais: Record<string, ExecucaoRotina> = cached.execucoes
  // pendente_sync !== false também cobre registros antigos de cache, de
  // antes da flag existir: são reenviados uma vez e marcados como limpos.
  const pendentes = Object.values(execucoesLocais).filter(
    (e: any) => e.fazenda_id === fazendaId && e.pendente_sync !== false
  ) as ExecucaoRotina[]

  let houveSucesso = false
  for (const execucao of pendentes) {
    try {
      await sincronizarExecucao(execucao)
      execucao.pendente_sync = false
      houveSucesso = true
    } catch (err) {
      console.warn('[ExecucaoRotina] Falha ao sincronizar execução:', execucao.id, err)
    }
  }

  if (houveSucesso) {
    await salvarExecucoesLocal(fazendaId, execucoesLocais)
  }
}

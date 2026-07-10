import { saveCadastroData, getCadastroData } from './indexedDB'
import { getSupabaseClient } from './supabaseClient'
import {
  ExecucaoRotina,
  StatusExecucao,
  calcularStatusExecucao,
  getHorarioAtualHHMMSS,
  getDataIso,
} from '../utils/execucaoRotina'

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
  } = params

  const chaveLocal = `${fazendaId}:${funcionarioId}:${cadernetaId}:${data}`
  const cached = await getCadastroData(CACHE_KEY)
  const execucoesLocais: Record<string, ExecucaoRotina> = cached?.execucoes || {}

  const existente = execucoesLocais[chaveLocal]
  if (existente) {
    if (!existente.primeiro_acesso) {
      existente.primeiro_acesso = new Date().toISOString()
    }
    await salvarExecucoesLocal(fazendaId, execucoesLocais)
    await sincronizarExecucao(existente)
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
    primeiro_registro: null,
    status: 'nao_executado',
    observacao: null,
    concluido: false,
    dispositivo_id: getDispositivoId(),
  }

  execucoesLocais[chaveLocal] = nova
  await salvarExecucoesLocal(fazendaId, execucoesLocais)
  await sincronizarExecucao(nova).catch((err) => {
    console.warn('[ExecucaoRotina] Falha ao sincronizar execução, ficará no cache:', err)
  })

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
  } = params

  const chaveLocal = `${fazendaId}:${funcionarioId}:${cadernetaId}:${data}`
  const cached = await getCadastroData(CACHE_KEY)
  const execucoesLocais: Record<string, ExecucaoRotina> = cached?.execucoes || {}

  const existente = execucoesLocais[chaveLocal]
  if (existente) {
    if (!existente.primeiro_registro) {
      existente.primeiro_registro = new Date().toISOString()
    }
    existente.status = calcularStatusExecucao(
      existente.horario_programado,
      horarioRegistro,
      toleranciaMinutos
    )
    if (observacao) existente.observacao = observacao
    existente.concluido = true
    await salvarExecucoesLocal(fazendaId, execucoesLocais)
    await sincronizarExecucao(existente)
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
    primeiro_registro: new Date().toISOString(),
    status: calcularStatusExecucao(null, horarioRegistro, toleranciaMinutos),
    observacao,
    concluido: true,
    dispositivo_id: getDispositivoId(),
  }

  execucoesLocais[chaveLocal] = nova
  await salvarExecucoesLocal(fazendaId, execucoesLocais)
  await sincronizarExecucao(nova).catch((err) => {
    console.warn('[ExecucaoRotina] Falha ao sincronizar execução, ficará no cache:', err)
  })

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
  const client = getSupabaseClient()
  const payload = {
    id: execucao.id,
    fazenda_id: execucao.fazenda_id,
    funcionario_id: execucao.funcionario_id,
    rotina_id: execucao.rotina_id,
    caderneta_id: execucao.caderneta_id,
    data: execucao.data,
    horario_programado: execucao.horario_programado,
    primeiro_acesso: execucao.primeiro_acesso,
    primeiro_registro: execucao.primeiro_registro,
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

  const execucoes = Object.values(cached.execucoes).filter(
    (e: any) => e.fazenda_id === fazendaId
  ) as ExecucaoRotina[]
  for (const execucao of execucoes) {
    try {
      await sincronizarExecucao(execucao)
    } catch (err) {
      console.warn('[ExecucaoRotina] Falha ao sincronizar execução:', execucao.id, err)
    }
  }
}

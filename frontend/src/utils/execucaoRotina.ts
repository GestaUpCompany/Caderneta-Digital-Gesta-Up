export type StatusExecucao = 'no_horario' | 'atrasado' | 'antecipado' | 'nao_executado'

export interface ExecucaoRotina {
  id: string
  fazenda_id: string
  funcionario_id: string
  rotina_id: string | null
  caderneta_id: string
  data: string
  horario_programado: string | null
  primeiro_acesso: string | null
  primeiro_registro: string | null
  status: StatusExecucao | null
  observacao: string | null
  concluido: boolean
  dispositivo_id: string | null
  created_at?: string
  updated_at?: string
}

export function horarioParaMinutos(horario: string): number {
  const [h, m] = horario.split(':').map(Number)
  return h * 60 + m
}

export function calcularStatusExecucao(
  horarioProgramado: string | null | undefined,
  horarioRegistro: string | null | undefined,
  toleranciaMinutos: number = 30
): StatusExecucao {
  if (!horarioProgramado || !horarioRegistro) return 'nao_executado'

  const programadoMin = horarioParaMinutos(horarioProgramado)
  const registroMin = horarioParaMinutos(horarioRegistro)
  const diferencaMin = registroMin - programadoMin

  if (Math.abs(diferencaMin) <= toleranciaMinutos) return 'no_horario'
  if (diferencaMin > toleranciaMinutos) return 'atrasado'
  return 'antecipado'
}

export function formatarHorario(horario: string | null | undefined): string | null {
  if (!horario || typeof horario !== 'string') return null
  const partes = horario.split(':')
  if (partes.length < 2) return null
  return `${partes[0].padStart(2, '0')}:${partes[1].padStart(2, '0')}`
}

export function getHorarioAtualHHMMSS(): string {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function getDataIso(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isAtrasoSignificativo(
  horarioProgramado: string | null | undefined,
  horarioRegistro: string | null | undefined,
  toleranciaMinutos: number = 30
): boolean {
  if (!horarioProgramado || !horarioRegistro) return false
  const programadoMin = horarioParaMinutos(horarioProgramado)
  const registroMin = horarioParaMinutos(horarioRegistro)
  return registroMin - programadoMin > toleranciaMinutos
}

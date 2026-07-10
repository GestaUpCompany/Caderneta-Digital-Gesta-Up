export interface Rotina {
  id: string
  fazenda_id: string
  funcionario_id: string
  cadernetas: string[]
  dias_semana: number[]
  horarios: Record<string, string | null>
  data_inicio: string
  data_fim: string | null
  ativo: boolean
  created_at?: string
  updated_at?: string
}

export function getDiaSemanaIso(dataIso: string): number {
  const [y, m, d] = dataIso.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

export function rotinaEstaAtivaHoje(rotina: Rotina, dataIso: string): boolean {
  if (!rotina.ativo) return false
  if (dataIso < rotina.data_inicio) return false
  if (rotina.data_fim && dataIso > rotina.data_fim) return false

  const diaSemana = getDiaSemanaIso(dataIso)
  return Array.isArray(rotina.dias_semana) && rotina.dias_semana.includes(diaSemana)
}

export function getRotinasDoDia(rotinas: Rotina[], dataIso: string): Rotina[] {
  return rotinas.filter((r) => rotinaEstaAtivaHoje(r, dataIso))
}

export function getRotinasDoFuncionario(
  rotinas: Rotina[],
  funcionarioId: string,
  dataIso: string
): Rotina[] {
  return rotinas.filter(
    (r) => r.funcionario_id === funcionarioId && rotinaEstaAtivaHoje(r, dataIso)
  )
}

export function getProgramacaoPorFuncionario(
  rotinas: Rotina[],
  funcionarioId: string,
  dataIso: string
): string[] {
  const rotinasDoFuncionario = getRotinasDoFuncionario(rotinas, funcionarioId, dataIso)
  const cadernetas = new Set<string>()

  for (const rotina of rotinasDoFuncionario) {
    if (Array.isArray(rotina.cadernetas)) {
      for (const caderneta of rotina.cadernetas) {
        if (caderneta) cadernetas.add(caderneta)
      }
    }
  }

  return Array.from(cadernetas)
}

export function getHorariosPorFuncionario(
  rotinas: Rotina[],
  funcionarioId: string,
  dataIso: string
): Record<string, string> {
  const rotinasDoFuncionario = getRotinasDoFuncionario(rotinas, funcionarioId, dataIso)
  const horarios: Record<string, string> = {}

  for (const rotina of rotinasDoFuncionario) {
    if (rotina.horarios && typeof rotina.horarios === 'object') {
      for (const [cadernetaId, horario] of Object.entries(rotina.horarios)) {
        if (horario && typeof horario === 'string') {
          horarios[cadernetaId] = horario
        }
      }
    }
  }

  return horarios
}

export function formatarHorario(horario: string | null | undefined): string | null {
  if (!horario || typeof horario !== 'string') return null
  const partes = horario.split(':')
  if (partes.length < 2) return null
  return `${partes[0].padStart(2, '0')}:${partes[1].padStart(2, '0')}`
}

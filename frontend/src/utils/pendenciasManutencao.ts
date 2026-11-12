// Pendências da Manutenção: itens que o peão marcou "Não fez" ('N') na manutenção anterior do MESMO
// equipamento e que ainda não foram feitos. Derivado do histórico, sem tabela própria: em ordem de `data`
// (momento do evento, pois o PWA grava offline e os registros chegam fora de ordem), um 'N' abre a pendência
// e o próximo 'S' do mesmo item a resolve. Itens ausentes no registro (ex.: checklist de outro tipo) não
// contam como feitos nem como pendentes.
//
// Registros anteriores a DATA_INICIO_ATIVIDADES usavam a semântica antiga (S = condição adequada,
// N = problema) e são ignorados.

export const DATA_INICIO_ATIVIDADES = '2026-11-11T00:00:00'

export interface RegistroChecklistManutencao {
  data: string
  localId?: string | null
  checklist: Record<string, any> | null
}

export interface PendenciaManutencao {
  campo: string
  /** Data do primeiro 'N' da sequência atual. */
  desde: string
  /** Motivo informado no 'N' mais recente. */
  motivo: string
  /** Quantas manutenções seguidas deixaram o item sem fazer. */
  ocorrencias: number
}

const instante = (iso: string): number => {
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? 0 : t
}

export function calcularPendenciasManutencao(registros: RegistroChecklistManutencao[]): PendenciaManutencao[] {
  const vistos = new Set<string>()
  const inicio = instante(DATA_INICIO_ATIVIDADES)
  const ordenados = registros
    .filter((r) => {
      if (instante(r.data) < inicio) return false
      if (!r.localId) return true
      if (vistos.has(r.localId)) return false
      vistos.add(r.localId)
      return true
    })
    .sort((a, b) => instante(a.data) - instante(b.data) || String(a.localId ?? '').localeCompare(String(b.localId ?? '')))

  const abertas = new Map<string, PendenciaManutencao>()
  for (const registro of ordenados) {
    for (const [campo, entrada] of Object.entries(registro.checklist ?? {})) {
      const valor = entrada?.valor
      if (valor === 'N') {
        const atual = abertas.get(campo)
        abertas.set(campo, {
          campo,
          desde: atual?.desde ?? registro.data,
          motivo: (typeof entrada.observacao === 'string' && entrada.observacao) || atual?.motivo || '',
          ocorrencias: (atual?.ocorrencias ?? 0) + 1,
        })
      } else if (valor === 'S') {
        abertas.delete(campo)
      }
    }
  }

  return [...abertas.values()].sort((a, b) => instante(a.desde) - instante(b.desde))
}

// Regras da Enfermaria em relação ao estoque da farmácia (sempre em frascos inteiros).
// A dose aplicada (mL/mg) é só texto informativo; quem baixa o estoque é `frascosUsados`.
// Espelha o trigger trg_enfermaria_baixa_farmacia: soma os frascosUsados por medicamento.

export interface MedicamentoDose {
  id?: string
  controla_estoque?: boolean | null
}

export type UnidadeDose = 'ml' | 'mg'

/** Número de frascos inteiro e não negativo; qualquer outra coisa (vazio, fração, texto) vale 0. */
export function frascosValidos(valor: unknown): number {
  const n = Number(valor)
  return Number.isInteger(n) && n > 0 ? n : 0
}

export interface AplicacaoFrascos {
  medicamentoId: string
  frascosUsados?: number | string | null
}

// Soma por medicamento controlado, como o trigger: item sem frascos não baixa.
export function baixaPorMedicamento(
  aplicacoes: AplicacaoFrascos[],
  medicamentos: MedicamentoDose[],
): { medicamentoId: string; quantidade: number }[] {
  const totais = new Map<string, number>()
  for (const ap of aplicacoes) {
    const med = medicamentos.find((m) => m.id === ap.medicamentoId)
    if (!med?.controla_estoque) continue
    const frascos = frascosValidos(ap.frascosUsados)
    if (frascos === 0) continue
    totais.set(ap.medicamentoId, (totais.get(ap.medicamentoId) ?? 0) + frascos)
  }
  return [...totais.entries()].map(([medicamentoId, quantidade]) => ({ medicamentoId, quantidade }))
}

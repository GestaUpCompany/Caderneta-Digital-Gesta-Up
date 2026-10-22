// Regras de dose da Enfermaria em relação ao estoque da farmácia.
// Espelha o banco (farmacia_dose_para_estoque e trg_enfermaria_baixa_farmacia) e
// modoBaixaEnfermaria do Painel Web: a conversão precisa bater com o que o trigger faz.

export interface MedicamentoDose {
  id?: string
  unidade?: string | null
  conteudo_por_unidade?: number | string | null
  conteudo_unidade?: string | null
  controla_estoque?: boolean | null
}

export type ModoBaixaMedicamento = 'direta' | 'embalagem' | 'sem_conversao' | 'nao_controla'

export type UnidadeDose = 'ml' | 'mg'

const UNIDADES_DIRETAS = ['mL', 'L', 'g', 'kg']
const DOSE_REGEX = /^\s*(\d+(?:[.,]\d+)?)\s*(ml|mg)?\s*$/i

const num = (v: unknown) => Number(v) || 0

export function modoBaixaMedicamento(med: MedicamentoDose): ModoBaixaMedicamento {
  if (!med.controla_estoque) return 'nao_controla'
  if (UNIDADES_DIRETAS.includes(med.unidade ?? '')) return 'direta'
  return num(med.conteudo_por_unidade) > 0 && med.conteudo_unidade ? 'embalagem' : 'sem_conversao'
}

// Unidade em que a dose deve ser digitada: travada quando o estoque a exige; null = o peão escolhe.
export function unidadeDoseFixa(med: MedicamentoDose): UnidadeDose | null {
  const modo = modoBaixaMedicamento(med)
  if (modo === 'direta') return med.unidade === 'g' || med.unidade === 'kg' ? 'mg' : 'ml'
  if (modo === 'embalagem') return med.conteudo_unidade?.toLowerCase() === 'mg' ? 'mg' : 'ml'
  return null
}

// Converte uma dose ("5 ml", "1,5 mg") na unidade de estoque. null = o banco não baixa.
export function doseParaEstoque(dose: string, med: MedicamentoDose): number | null {
  const m = DOSE_REGEX.exec(dose || '')
  if (!m) return null
  const valor = Number(m[1].replace(',', '.'))
  const unidadeDose = (m[2] || 'ml').toLowerCase()
  if (!(valor > 0)) return null

  const estoque = (med.unidade ?? '').toLowerCase()
  if (estoque === 'ml' && unidadeDose === 'ml') return valor
  if (estoque === 'l' && unidadeDose === 'ml') return valor / 1000
  if (estoque === 'g' && unidadeDose === 'mg') return valor / 1000
  if (estoque === 'kg' && unidadeDose === 'mg') return valor / 1000000
  if (['ml', 'l', 'g', 'kg'].includes(estoque)) return null

  const conteudo = num(med.conteudo_por_unidade)
  if (conteudo > 0 && (med.conteudo_unidade ?? '').toLowerCase() === unidadeDose) return valor / conteudo
  return null
}

export interface AplicacaoDose {
  medicamentoId: string
  doseAplicada: string
}

// Soma por medicamento, como o trigger: doses sem conversão não entram.
export function baixaPorMedicamento(
  aplicacoes: AplicacaoDose[],
  medicamentos: MedicamentoDose[],
): { medicamentoId: string; quantidade: number }[] {
  const totais = new Map<string, number>()
  for (const ap of aplicacoes) {
    const med = medicamentos.find((m) => m.id === ap.medicamentoId)
    if (!med || modoBaixaMedicamento(med) === 'nao_controla') continue
    const qtd = doseParaEstoque(ap.doseAplicada, med)
    if (qtd == null) continue
    totais.set(ap.medicamentoId, (totais.get(ap.medicamentoId) ?? 0) + qtd)
  }
  return [...totais.entries()]
    .map(([medicamentoId, quantidade]) => ({ medicamentoId, quantidade: Math.round(quantidade * 1000) / 1000 }))
    .filter((b) => b.quantidade > 0)
}

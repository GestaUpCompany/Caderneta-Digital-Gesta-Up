import { formatarMoedaBR } from './formatNumber'
import { isoToBR } from './formatDate'

// Regras puras de apresentação do estoque da Farmácia (sem acesso a banco ou cache).

export type TomEstoque = 'neutral' | 'success' | 'warning' | 'danger'

export interface StatusEstoque {
  tone: TomEstoque
  text: string
}

export interface MedicamentoEstoque {
  controla_estoque?: boolean | null
  estoque_atual?: number | string | null
  estoque_minimo?: number | string | null
}

const num = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** Converte "2,5" ou "2.5" em número; vazio ou inválido vira 0. */
export function parseQuantidade(texto: string): number {
  const n = parseFloat(String(texto ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

const PLURAIS: Record<string, string> = { frasco: 'frascos', dose: 'doses', caixa: 'caixas' }

/** Plural da unidade quando o valor é maior que 1 (frasco -> frascos); mL, kg, un etc. não mudam. */
export function unidadeConcordada(unidade: string, valor: number): string {
  return valor > 1 ? (PLURAIS[unidade] ?? unidade) : unidade
}

export function formatarQuantidade(valor: number, unidade?: string | null): string {
  const texto = valor.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
  return unidade ? `${texto} ${unidadeConcordada(unidade, valor)}` : texto
}

/** Situação do saldo em relação ao mínimo: abaixo, perto (até 20% acima) ou ok. */
export function statusEstoque(m: MedicamentoEstoque): StatusEstoque {
  if (!m.controla_estoque) {
    return { tone: 'neutral', text: 'Controle de estoque não ativado: o saldo só conta depois que o gestor ativar' }
  }
  const saldo = num(m.estoque_atual)
  const minimo = num(m.estoque_minimo)
  if (minimo > 0 && saldo < minimo) return { tone: 'danger', text: 'Abaixo do estoque mínimo' }
  if (minimo > 0 && saldo <= minimo * 1.2) return { tone: 'warning', text: 'Perto do estoque mínimo' }
  if (saldo < 0) return { tone: 'danger', text: 'Saldo negativo: confira os lançamentos' }
  return { tone: 'success', text: 'Estoque dentro do esperado' }
}

/** Saldo depois do lançamento (entrada soma, saída subtrai). */
export function saldoApos(saldoAtual: number | string | null | undefined, quantidade: number, saida: boolean): number {
  return Math.round((num(saldoAtual) + (saida ? -quantidade : quantidade)) * 1000) / 1000
}

// ---- Texto de exibição/compartilhamento de um registro de Farmácia ----

type RegistroFarmacia = Record<string, unknown>

/** "2 frascos", "0,5 dose", "100 mL" (unidade concordada com a quantidade). */
export function quantidadeRegistro(r: RegistroFarmacia): string {
  const quantidade = parseQuantidade(String(r.quantidade ?? ''))
  return formatarQuantidade(quantidade, r.unidade ? String(r.unidade) : null)
}

export function custoUnitarioRegistro(r: RegistroFarmacia): string | null {
  const v = formatarMoedaBR(String(r.custoUnitario ?? '').replace(',', '.') || null)
  return v ? `R$ ${v}` : null
}

/** Custo total da entrada (quantidade × custo unitário); nulo sem custo. */
export function custoTotalRegistro(r: RegistroFarmacia): string | null {
  const custo = parseQuantidade(String(r.custoUnitario ?? ''))
  const total = custo * parseQuantidade(String(r.quantidade ?? ''))
  const v = total > 0 ? formatarMoedaBR(total) : null
  return v ? `R$ ${v}` : null
}

/** Validade em dd/mm/aaaa (aceita ISO ou já em BR). */
export function validadeRegistro(r: RegistroFarmacia): string | null {
  const v = String(r.validade ?? '').trim()
  if (!v) return null
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? isoToBR(v) : v
}

export const ehSaidaFarmacia = (r: RegistroFarmacia) => r.tipoMovimentacao === 'baixa'

// ---- Seleção de medicamento no lançamento ----

/** Só medicamentos com controle de estoque aparecem para entrada e saída (o Painel controla o resto). */
export function medicamentosControlados<T extends MedicamentoEstoque>(lista: T[]): T[] {
  return lista.filter((m) => m.controla_estoque === true)
}

const semAcentoCaixa = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

/**
 * Procura um medicamento já controlado igual ao cadastrado (SKU ou nome, sem acento e caixa).
 * Item sem controle não conta: o cadastro segue para a RPC, que o deduplica e ativa o controle.
 */
export function encontrarMedicamentoExistente<T extends MedicamentoEstoque & { nome_comercial: string; sku?: string | null }>(
  lista: T[],
  dados: { nome_comercial: string; sku?: string | null },
): T | undefined {
  const nome = semAcentoCaixa(dados.nome_comercial)
  const sku = semAcentoCaixa(dados.sku ?? '')
  return medicamentosControlados(lista).find(
    (m) => semAcentoCaixa(m.nome_comercial) === nome || (sku !== '' && semAcentoCaixa(m.sku ?? '') === sku),
  )
}

// Regras da Enfermaria em relação ao estoque da farmácia (sempre em frascos inteiros).
// A dose aplicada (mL/mg) é só texto informativo; quem baixa o estoque é `frascosUsados`.
// Espelha o trigger trg_enfermaria_baixa_farmacia: soma os frascosUsados por medicamento.

export interface MedicamentoDose {
  id?: string
  controla_estoque?: boolean | null
}

export type UnidadeDose = 'ml' | 'mg' | 'un'

// "20 ml" / "1,5 mg" / "2 un" / "15" -> número (com ponto) + unidade; texto livre antigo ("15ml IV") não parseia
export const parseDose = (str: string): { num: string; un: UnidadeDose } | null => {
  const m = /^\s*(\d+(?:[.,]\d+)?)\s*(ml|mg|un)?\s*$/i.exec(str || '')
  return m ? { num: m[1].replace(',', '.'), un: ((m[2] || 'ml').toLowerCase() as UnidadeDose) } : null
}

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

// ---- Medicamento criado offline: o id local pode virar outro no servidor ----

export interface EntradaComMedicamentoNovo {
  fazendaId?: string | null
  isTestRecord?: boolean
  novoMedicamento?: { id?: string } & Record<string, unknown>
}

/** Medicamentos novos (de entradas deste aparelho) citados nos itens de um registro da Enfermaria. */
export function medicamentosNovosCitados<T extends EntradaComMedicamentoNovo>(
  itens: { medicamentoId?: string }[],
  entradas: T[],
  fazendaId: string,
): NonNullable<T['novoMedicamento']>[] {
  const ids = new Set(itens.map((i) => i.medicamentoId))
  const achados = new Map<string, NonNullable<T['novoMedicamento']>>()
  for (const e of entradas) {
    const novo = e.novoMedicamento
    if (!novo?.id || e.isTestRecord || !ids.has(novo.id)) continue
    if (e.fazendaId && e.fazendaId !== fazendaId) continue
    achados.set(novo.id, novo as NonNullable<T['novoMedicamento']>)
  }
  return [...achados.values()]
}

/** Troca os ids locais pelos do servidor; o restante do item não muda. */
export function trocarIdsMedicamentos<T extends { medicamentoId?: string }>(itens: T[], ids: Record<string, string>): T[] {
  return itens.map((i) => (i.medicamentoId && ids[i.medicamentoId] ? { ...i, medicamentoId: ids[i.medicamentoId] } : i))
}

// ---- Aviso de frasco no fim: soma das doses desde a última baixa (só informa, nunca baixa) ----

// Antes desta data o estoque baixava por fração: essas doses não indicam frasco aberto.
export const INICIO_FRASCOS_INTEIROS = '2026-11-03'

export interface RegistroDoses {
  id: string
  em: string
  medicamentos: { medicamentoId?: string; doseAplicada?: string; frascosUsados?: number | string | null }[]
}

export interface HistoricoDoses {
  registros: RegistroDoses[]
  baixas: { medicamentoId: string; em: string }[]
}

export interface MedicamentoConteudo {
  id?: string
  conteudo_por_unidade?: number | string | null
  conteudo_unidade?: string | null
}

/** Total aplicado, na unidade do conteúdo da embalagem, depois da última baixa do medicamento. */
export function dosesDesdeUltimaBaixa(historico: HistoricoDoses, medicamento: MedicamentoConteudo): number {
  const unidade = medicamento.conteudo_unidade?.toLowerCase()
  if (!medicamento.id || !unidade) return 0
  const unicos = new Map(historico.registros.map((r) => [r.id, r]))
  const aplicacoes: { em: number; dose: string; frascos: number }[] = []
  for (const r of unicos.values()) {
    const em = Date.parse(r.em)
    if (!Number.isFinite(em)) continue
    for (const item of r.medicamentos ?? []) {
      if (item.medicamentoId !== medicamento.id) continue
      aplicacoes.push({ em, dose: item.doseAplicada ?? '', frascos: frascosValidos(item.frascosUsados) })
    }
  }
  let corte = Date.parse(INICIO_FRASCOS_INTEIROS)
  for (const b of historico.baixas) {
    if (b.medicamentoId === medicamento.id) corte = Math.max(corte, Date.parse(b.em) || 0)
  }
  for (const a of aplicacoes) if (a.frascos > 0) corte = Math.max(corte, a.em)
  let total = 0
  for (const a of aplicacoes) {
    if (a.em <= corte) continue
    const dose = parseDose(a.dose)
    if (dose?.un === unidade) total += Number(dose.num)
  }
  return Math.round(total * 1000) / 1000
}

/** Mensagem a partir de 80% do conteúdo de um frasco; sem conteúdo cadastrado não há o que comparar. */
export function avisoFrascoNoFim(total: number, medicamento: MedicamentoConteudo): string | null {
  const conteudo = Number(medicamento.conteudo_por_unidade)
  if (!Number.isFinite(conteudo) || conteudo <= 0 || !medicamento.conteudo_unidade) return null
  if (total < conteudo * 0.8) return null
  const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
  const u = medicamento.conteudo_unidade
  return `Desde a última baixa: ${fmt(total)} ${u} aplicados, em frasco de ${fmt(conteudo)} ${u}. Se o frasco acabou, informe abaixo.`
}

/**
 * Mesmo nome pode aparecer duas vezes no aparelho: o cadastro antigo sem controle e o criado offline na Entrada,
 * até o sync unificar os dois. Prefere o controlado, senão o campo de frascos some e a baixa não pode ser lançada.
 */
export function escolherMedicamentoPorNome<T extends { nome_comercial?: string; tipo?: string; controla_estoque?: boolean | null }>(
  lista: T[],
  nome: string,
  tipo?: string,
): T | undefined {
  const iguais = lista.filter((m) => m.nome_comercial === nome && (!tipo || m.tipo === tipo))
  return iguais.find((m) => m.controla_estoque) ?? iguais[0]
}

import { getDateTimePartsInTimezone, addDaysISO } from './formatDate'
import type { CmsJanelas } from './leituraCochoMetrics'

/**
 * Linha de `consumo_confinamento_dia` (calculada pelo Painel, uma por lote e dia).
 * Só as colunas usadas aqui; a tabela não está em types/supabase.ts.
 */
export interface ConsumoConfinamentoDiaLinha {
  lote_id: string
  /** Coluna `date`: "yyyy-mm-dd", dia da fazenda. */
  data: string
  consumo_percent_pv: number | null
  leitura_confirmada: boolean
  dia_incompleto: boolean
  n_currais: number
}

/** Dia ("yyyy-mm-dd") no fuso da fazenda. Não usa o dia UTC do aparelho. */
export function diaDaFazendaISO(agora: Date = new Date()): string {
  const { year, month, day } = getDateTimePartsInTimezone(agora)
  return `${year}-${month}-${day}`
}

function arredondar4(valor: number): number {
  return Math.round(valor * 10000) / 10000
}

/**
 * Valor do dia só quando o dia está fechado e completo no Painel: leitura do dia seguinte já
 * registrada, todos os tratos lançados, um único curral no lote (o cartão da tela é por curral)
 * e consumo calculado. Qualquer outra situação devolve null e a tela mantém o cálculo local.
 */
function consumoFechadoDoDia(
  linhas: ConsumoConfinamentoDiaLinha[],
  loteId: string,
  diaISO: string
): number | null {
  const linha = linhas.find(
    (l) =>
      l.lote_id === loteId &&
      l.data === diaISO &&
      l.leitura_confirmada === true &&
      l.dia_incompleto === false &&
      l.n_currais === 1
  )
  if (!linha || linha.consumo_percent_pv === null || linha.consumo_percent_pv === undefined) return null
  const valor = Number(linha.consumo_percent_pv)
  return Number.isFinite(valor) ? arredondar4(valor) : null
}

/**
 * Troca o valor de "ontem", "2 dias" e "3 dias" pelo do Painel quando aquele dia exato já está
 * fechado. Nos demais casos (sem dado, offline sem cache, dia ainda aberto) devolve o cálculo
 * local intacto. "Média 10 dias" e "Geral" nunca mudam.
 */
export function aplicarConsumoServidor(
  cms: CmsJanelas,
  linhas: ConsumoConfinamentoDiaLinha[] | null | undefined,
  loteId: string,
  hojeFazendaISO: string
): CmsJanelas {
  if (!linhas || linhas.length === 0 || !hojeFazendaISO) return cms
  return {
    ...cms,
    ontem: consumoFechadoDoDia(linhas, loteId, addDaysISO(hojeFazendaISO, -1)) ?? cms.ontem,
    anteontem: consumoFechadoDoDia(linhas, loteId, addDaysISO(hojeFazendaISO, -2)) ?? cms.anteontem,
    tresDiasAtras: consumoFechadoDoDia(linhas, loteId, addDaysISO(hojeFazendaISO, -3)) ?? cms.tresDiasAtras,
  }
}

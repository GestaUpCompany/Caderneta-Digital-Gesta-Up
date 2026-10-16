/**
 * Acha o indivíduo Vivo que corresponde ao chip/brinco digitado, para vincular a morte (individuo_id) ao animal.
 * Chip tem prioridade. A comparação ignora caixa e espaços. Só vincula quando há exatamente um candidato:
 * com zero ou mais de um, devolve null e a morte segue só no agregado, como antes.
 */
export interface IndividuoParaVinculo {
  id: string
  id_brinco?: string | null
  id_chip?: string | null
  status?: string | null
}

const norm = (v?: string | null): string => (v || '').trim().toUpperCase()

export function individuoVivoPorIdentificacao(
  individuos: IndividuoParaVinculo[],
  brinco?: string | null,
  chip?: string | null
): string | null {
  const vivos = individuos.filter((i) => i.status === 'Vivo')
  const c = norm(chip)
  const b = norm(brinco)
  const porChip = c ? vivos.filter((i) => norm(i.id_chip) === c) : []
  const porBrinco = b ? vivos.filter((i) => norm(i.id_brinco) === b) : []
  const achados = porChip.length > 0 ? porChip : porBrinco
  return achados.length === 1 ? achados[0].id : null
}

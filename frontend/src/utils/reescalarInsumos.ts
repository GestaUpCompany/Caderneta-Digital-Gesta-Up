/**
 * Redistribui o novo total entre os insumos na proporção original.
 * Arredonda em 2 casas e joga o resíduo no maior insumo para a soma bater com o total.
 * Sem base de proporção (total antigo <= 0 ou soma zero), devolve os valores como estão.
 */
export function reescalarInsumos(kgAtuais: number[], totalAntigo: number, totalNovo: number): number[] {
  const soma = kgAtuais.reduce((acc, v) => acc + v, 0)
  if (kgAtuais.length === 0 || totalAntigo <= 0 || soma <= 0) return [...kgAtuais]

  const fator = totalNovo / soma
  const novos = kgAtuais.map((v) => Math.round(v * fator * 100) / 100)
  const residuo = Math.round((totalNovo - novos.reduce((acc, v) => acc + v, 0)) * 100) / 100
  if (residuo !== 0) {
    const iMax = kgAtuais.indexOf(Math.max(...kgAtuais))
    novos[iMax] = Math.round((novos[iMax] + residuo) * 100) / 100
  }
  return novos
}

/**
 * Distribui o novo kg de UM insumo entre as linhas dele (um trato com várias cargas tem várias linhas por insumo).
 * Mantém a proporção entre as linhas; se todas estiverem zeradas, o valor vai para a primeira.
 */
export function distribuirNoInsumo(kgLinhas: number[], novoKg: number): number[] {
  if (kgLinhas.length === 0) return []
  const soma = kgLinhas.reduce((acc, v) => acc + v, 0)
  if (soma <= 0) return kgLinhas.map((_, i) => (i === 0 ? Math.round(novoKg * 100) / 100 : 0))
  return reescalarInsumos(kgLinhas, soma, novoKg)
}

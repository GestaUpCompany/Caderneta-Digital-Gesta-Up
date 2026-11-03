const normalizarNome = (nome: string): string =>
  (nome || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

/**
 * Formulação da fazenda de destino que o app sugere para receber o produto: a de mesmo nome (sem acento, caixa
 * ou espaço duplicado). Só sugere quando há exatamente uma; com zero ou várias, o peão escolhe.
 */
export function sugerirFormulacaoDestino<T extends { id: string; nome: string }>(nomeOrigem: string, destinos: T[]): T | null {
  const alvo = normalizarNome(nomeOrigem)
  if (!alvo) return null
  const iguais = destinos.filter((d) => normalizarNome(d.nome) === alvo)
  return iguais.length === 1 ? iguais[0] : null
}

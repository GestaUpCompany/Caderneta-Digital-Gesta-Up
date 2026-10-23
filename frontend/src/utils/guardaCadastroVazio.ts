// Guarda contra gravação de cadastro vazio. Uma falha silenciosa (ex.: sessão expirada) pode devolver
// listas vazias sem erro; gravar isso apagaria o cache bom e marcaria os dados como atualizados.

export interface ListasCadastro {
  pastos: unknown[]
  lotes: unknown[]
}

/**
 * True quando pastos E lotes somem de um cache que os tinha. Só os dois juntos indicam falha de sessão;
 * uma fazenda que zera apenas os lotes é um caso legítimo e não deve travar a atualização.
 */
export function deveBloquearCadastroVazio(anterior: ListasCadastro | null, novo: ListasCadastro): boolean {
  if (!anterior) return false
  const perdeuTudo = anterior.pastos.length > 0 && anterior.lotes.length > 0
    && novo.pastos.length === 0 && novo.lotes.length === 0
  return perdeuTudo
}

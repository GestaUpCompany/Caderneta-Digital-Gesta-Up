/**
 * Lista vazia de tanques só prova "fazenda sem tanques" quando veio do servidor ou quando não há internet
 * (offline-first). Online sem confirmar com o servidor pode ser cache velho: salvar assim grava o
 * abastecimento sem tanque e sem baixa de estoque.
 */
export function tanquesIndisponiveis(
  tanques: unknown[] | null,
  doServidor: boolean,
  online: boolean
): boolean {
  if (!tanques) return true
  return tanques.length === 0 && !doServidor && online
}

/**
 * Busca todas as linhas de uma consulta paginada (o PostgREST limita cada resposta, em geral a 1000 linhas).
 * `buscarPagina(inicio, fim)` devolve as linhas do intervalo [inicio, fim] (inclusive); para quando vier menos que
 * o tamanho da página. `limiteMaximo` evita laço sem fim se o servidor ignorar o intervalo.
 */
export async function buscarTodasAsPaginas<T>(
  buscarPagina: (inicio: number, fim: number) => Promise<T[]>,
  tamanhoPagina = 1000,
  limiteMaximo = 50_000
): Promise<T[]> {
  const todas: T[] = []
  for (let inicio = 0; inicio < limiteMaximo; inicio += tamanhoPagina) {
    const pagina = await buscarPagina(inicio, inicio + tamanhoPagina - 1)
    todas.push(...pagina)
    if (pagina.length < tamanhoPagina) break
  }
  return todas
}

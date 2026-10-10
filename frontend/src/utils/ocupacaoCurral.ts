/**
 * Resolve a ocupação vigente de cada curral a partir de uma lista de ocupações
 * (lote_curral_historico) que cobrem uma data.
 *
 * Curral x lote é 1:1 no banco (constraints lch_sem_sobreposicao_*), então uma lista
 * vinda do servidor já traz no máximo uma ocupação por curral. A tolerância é
 * deliberada: o PWA guarda essas listas em cache offline (IndexedDB), e um aparelho
 * com cache anterior à limpeza do histórico pode ter duas ocupações para o mesmo
 * curral. Nesse caso vale a de maior data_inicial; em empate, a primeira da lista.
 */
export function ocupacaoVigentePorCurral<T extends { curral_id: string; data_inicial: string }>(
  ocupacoes: T[] | null | undefined
): T[] {
  const porCurral = new Map<string, T>()
  for (const o of ocupacoes || []) {
    const atual = porCurral.get(o.curral_id)
    if (!atual || o.data_inicial > atual.data_inicial) {
      porCurral.set(o.curral_id, o)
    }
  }
  return [...porCurral.values()]
}

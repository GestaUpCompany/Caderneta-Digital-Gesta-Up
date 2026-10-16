// O banco só conta uma movimentação cuja data seja >= lote_categorias.created_at da categoria;
// para datas anteriores ele grava a data/hora do registro (registros_movimentacao.data_informada
// guarda a informada). Aqui só se prevê isso para avisar o usuário: a regra é do servidor.

const OFFSET_FAZENDA = '-04:00' // America/Cuiaba, sem horário de verão

export interface CategoriaComCorte {
  categoria?: string | null
  created_at?: string | null
}

/** Maior created_at (corte) entre as categorias; null se nenhuma tiver. */
export function corteDasCategorias(categorias: CategoriaComCorte[] | null | undefined): Date | null {
  let corte: Date | null = null
  for (const c of categorias || []) {
    if (!c?.created_at) continue
    const d = new Date(c.created_at)
    if (Number.isNaN(d.getTime())) continue
    if (!corte || d > corte) corte = d
  }
  return corte
}

/**
 * Retorna o corte se a data escolhida (dd/mm/aaaa, mais a hora atual, como o form grava)
 * for anterior a ele; senão null.
 */
export function corteAtingidoPorData(
  dataBR: string,
  categorias: CategoriaComCorte[] | null | undefined,
  agora: Date = new Date()
): Date | null {
  const corte = corteDasCategorias(categorias)
  if (!corte) return null
  const [dia, mes, ano] = (dataBR || '').split('/')
  if (!dia || !mes || !ano) return null
  const hora = agora.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Cuiaba',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const escolhida = new Date(`${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T${hora}:00${OFFSET_FAZENDA}`)
  if (Number.isNaN(escolhida.getTime())) return null
  return escolhida < corte ? corte : null
}

export function formatarCorteBR(corte: Date): string {
  return corte.toLocaleDateString('pt-BR', { timeZone: 'America/Cuiaba' })
}

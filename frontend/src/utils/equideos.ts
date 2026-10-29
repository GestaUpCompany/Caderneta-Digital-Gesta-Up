// Equídeos (tropa por espécie e sexo). Cada espécie e sexo é uma categoria própria em lote_categorias;
// nos campos fixos de contagem todas somam em "tropa".

export interface EquideoCategoria {
  nome: string // slug como vem do banco (lote_categorias.categoria), em minúsculo
  rotulo: string
  especie: 'Equino' | 'Asinino' | 'Muar'
  sexo: 'Macho' | 'Fêmea'
}

export const EQUIDEOS: EquideoCategoria[] = [
  { nome: 'cavalo', rotulo: 'Cavalo', especie: 'Equino', sexo: 'Macho' },
  { nome: 'égua', rotulo: 'Égua', especie: 'Equino', sexo: 'Fêmea' },
  { nome: 'jumento', rotulo: 'Jumento', especie: 'Asinino', sexo: 'Macho' },
  { nome: 'jumenta', rotulo: 'Jumenta', especie: 'Asinino', sexo: 'Fêmea' },
  { nome: 'burro', rotulo: 'Burro', especie: 'Muar', sexo: 'Macho' },
  { nome: 'mula', rotulo: 'Mula', especie: 'Muar', sexo: 'Fêmea' },
]

const normalizarNome = (nome: string) =>
  nome
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export function equideoPorNome(nome: string): EquideoCategoria | undefined {
  const norm = normalizarNome(nome)
  return EQUIDEOS.find((e) => normalizarNome(e.nome) === norm)
}

export function ehEquideo(nome: string): boolean {
  return equideoPorNome(nome) !== undefined
}

// Valor do campo fixo "tropa" nos cards: o total, com o detalhe por espécie e sexo quando a contagem
// tem categorias_detalhes (array antes do sync, string JSON depois).
export function formatarTropaCard(value: unknown, registro: Record<string, unknown>): string {
  let detalhes = registro?.categorias_detalhes
  if (typeof detalhes === 'string') {
    try { detalhes = JSON.parse(detalhes) } catch { detalhes = null }
  }
  const porEspecie = tropaPorEspecie(Array.isArray(detalhes) ? detalhes : null)
  const total = String(value)
  if (porEspecie.length === 0) return total
  return `${total} (${porEspecie.map((e) => `${e.rotulo} ${e.quantidade}`).join(' · ')})`
}

// Detalhamento da tropa por espécie e sexo, a partir de categorias_detalhes da contagem.
// Só entram categorias de equídeos com quantidade > 0, na ordem de EQUIDEOS.
export function tropaPorEspecie(
  detalhes: { nome: string; quant_informada?: number | null }[] | null | undefined,
): { rotulo: string; quantidade: number }[] {
  if (!Array.isArray(detalhes)) return []
  return EQUIDEOS.map((eq) => {
    const achado = detalhes.find((d) => normalizarNome(d.nome) === normalizarNome(eq.nome))
    return { rotulo: eq.rotulo, quantidade: Number(achado?.quant_informada) || 0 }
  }).filter((e) => e.quantidade > 0)
}

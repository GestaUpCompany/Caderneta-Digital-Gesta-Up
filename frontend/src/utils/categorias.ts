// Normaliza nome de categoria para comparação (minúsculas, sem acentos, sem espaços extras)
export function normalizarCategoria(cat: string): string {
  return (cat || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

// Aliases aceitos para categorias de bezerro(a) ao pé (normalizados)
const CATEGORIAS_AO_PE = new Set([
  'bezerro ao pe',
  'bezerra ao pe',
  'bezerro ao pé',
  'bezerra ao pé',
])

export function isCategoriaAoPe(cat: string): boolean {
  return CATEGORIAS_AO_PE.has(normalizarCategoria(cat))
}

// Função para processar categorias com diferentes delimitadores
export function processarCategorias(categorias: string): string[] {
  if (!categorias) return []
  // Separar por: vírgula+espaço, vírgula, ponto+espaço, ponto, ponto e vírgula+espaço, ponto e vírgula
  const regex = /[,.;]+\s*/
  return categorias
    .split(regex)
    .map(c => c.trim())
    .filter(c => c.length > 0)
}

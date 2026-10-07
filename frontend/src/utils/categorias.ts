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

// Iniciais maiúsculas para exibição ("bezerro ao pé" -> "Bezerro Ao Pé")
export function capitalizarCategoria(cat: string): string {
  return cat
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

// Categorias disponíveis para Entrada conforme destino do lote
const CATEGORIAS_ABATE = ['Bezerro', 'Bezerra', 'Garrote', 'Novilha', 'Boi Magro', 'Boi Gordo', 'Vaca']
const CATEGORIAS_REPRODUCAO = ['Bezerro', 'Bezerra', 'Garrote', 'Novilha', 'Tourinho', 'Touro', 'Vaca']
const CATEGORIAS_ENFERMARIA = [...new Set([...CATEGORIAS_ABATE, ...CATEGORIAS_REPRODUCAO])]

export function getCategoriasPorDestino(destino: string | null | undefined): string[] {
  if (!destino) return []
  const d = destino.toLowerCase()
  if (d === 'corte') return CATEGORIAS_ABATE
  if (d === 'reprodução' || d === 'reproducao') return CATEGORIAS_REPRODUCAO
  if (d === 'enfermaria') return CATEGORIAS_ENFERMARIA
  return []
}

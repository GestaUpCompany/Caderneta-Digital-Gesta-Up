export type CampoCategoriaFixa =
  | 'vaca'
  | 'touro'
  | 'boiGordo'
  | 'boiMagro'
  | 'garrote'
  | 'bezerro'
  | 'novilha'
  | 'tropa'
  | 'outros'

export const CAMPOS_CATEGORIA_FIXA: CampoCategoriaFixa[] = [
  'vaca', 'touro', 'boiGordo', 'boiMagro', 'garrote', 'bezerro', 'novilha', 'tropa', 'outros',
]

// Mapear texto de categoria do banco (lote_categorias.categoria) para campo fixo do registro.
// O banco tem casing inconsistente ("boi gordo" vs "Boi Gordo") e variantes
// ("bezerra", "bezerro ao pé", "bezerra ao pé") que precisam agrupar em "bezerro".
export function normalizeCategoriaToField(categoria: string): CampoCategoriaFixa | null {
  const norm = categoria
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/\s+ao\s+pe\s*/g, '') // remove "ao pé"
    .replace(/\s+/g, ' ')
    .trim()

  const map: Record<string, CampoCategoriaFixa> = {
    'vaca': 'vaca',
    'vacas': 'vaca',
    'touro': 'touro',
    'touros': 'touro',
    'boi gordo': 'boiGordo',
    'bois gordo': 'boiGordo',
    'boi magro': 'boiMagro',
    'bois magro': 'boiMagro',
    'garrote': 'garrote',
    'garrotes': 'garrote',
    'bezerro': 'bezerro',
    'bezerros': 'bezerro',
    'bezerra': 'bezerro',
    'bezerras': 'bezerro',
    'novilha': 'novilha',
    'novilhas': 'novilha',
    'tropa': 'tropa',
    'tropas': 'tropa',
    'outros': 'outros',
    'outro': 'outros',
  }

  return map[norm] || null
}

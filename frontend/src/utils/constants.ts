export const BACKEND_URL = 'http://localhost:3001'

export const CADERNETAS = [
  { id: 'maternidade', label: 'MATERNIDADE', emoji: '🐄', sheetName: 'Maternidade Cria', disponivel: true },
  { id: 'pastagens', label: 'TROCA DE PASTOS', emoji: '🌾', sheetName: 'Troca de Pastos', disponivel: true },
  { id: 'rodeio', label: 'RODEIO GADO', emoji: '🤠', sheetName: 'Rodeio Gado', disponivel: true },
  { id: 'suplementacao', label: 'SUPLEMENTAÇÃO', emoji: '🥄', sheetName: 'Suplementação', disponivel: true },
  { id: 'bebedouros', label: 'BEBEDOUROS', emoji: '💧', sheetName: 'Bebedouros', disponivel: true },
  { id: 'movimentacao', label: 'MOVIMENTAÇÃO', emoji: '🚚', sheetName: 'Movimentação', disponivel: true },
]

export const CATEGORIAS_ANIMAL = ['Vaca', 'Touro', 'Boi', 'Bezerro', 'Garrote', 'Novilha'] as const

export const TIPOS_GADO = ['Cria', 'Recria', 'Engorda'] as const

export const PRODUTOS_SUPLEMENTACAO = ['Mineral', 'Proteinado', 'Ração'] as const

export const MOTIVOS_MOVIMENTACAO = [
  'Morte', 'Consumo', 'Transferência', 'Abate', 'Entrada', 'Entrevero',
] as const

export const TIPOS_PARTO = ['Normal', 'Distócico', 'Cesárea'] as const

export const SEXO_ANIMAL = ['Macho', 'Fêmea'] as const

export const DB_NAME = 'cadernetas-digitais'
export const DB_VERSION = 1

export const MAX_RETRY_COUNT = 3
export const SYNC_INTERVAL_MS = 30_000

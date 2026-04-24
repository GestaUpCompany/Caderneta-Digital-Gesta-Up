export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

const BASE = import.meta.env.BASE_URL

export const LOGO_URL = `${BASE}logo-gestaup-app-cadernetadigital.png`

export const DATABASE_URL = 'https://docs.google.com/spreadsheets/d/1HSq-3ihaSnVGIEPBCMdhYjCmFfwyWAQM7zFrkCuGxts/edit'

export const DEVICE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1i5zNHrN56caDV7vqmk9i8p1hm94_X8nOk5DpgTmqzIQ/edit'

export function getFarmLogo(farmName: string): string {
  // Lógica condicional simples para logo baseada no nome da fazenda
  // Pode ser expandida conforme necessário
  const lowerName = farmName.toLowerCase()

  if (lowerName.includes('aruã') || lowerName.includes('arua')) {
    return `${BASE}logo-arua.png`
  }
  if (lowerName.includes('sol nascente')) {
    return `${BASE}logo-sol-nascente.png`
  }
  if (lowerName.includes('vale verde')) {
    return `${BASE}logo-vale-verde.png`
  }
  if (lowerName.includes('boa vista')) {
    return `${BASE}logo-boa-vista.png`
  }
  if (lowerName.includes('são josé') || lowerName.includes('sao jose')) {
    return `${BASE}logo-sao-jose.png`
  }
  if (lowerName.includes('pioneira')) {
    return `${BASE}logo-pioneira.png`
  }
  if (lowerName.includes('marcon')) {
    return `${BASE}logo-marcon.png`
  }
  if (lowerName.includes('sirio') || lowerName.includes('sírio')) {
    return `${BASE}logo-sirio.png`
  }

  // Logo padrão se não encontrar match
  return LOGO_URL
}

export const CADERNETAS = [
  { id: 'maternidade', label: 'MATERNIDADE', emoji: '🐄', icon: `${BASE}cadernetas/maternidade.png`, color: '#6D9E3B', sheetName: 'Maternidade Cria', disponivel: true },
  { id: 'pastagens', label: 'TROCA DE PASTOS', emoji: '🌾', icon: `${BASE}cadernetas/pastagens.png`, color: '#7D9045', sheetName: 'Troca de Pastos', disponivel: true },
  { id: 'rodeio', label: 'RODEIO GADO', emoji: '🤠', icon: `${BASE}cadernetas/rodeio.png`, color: '#78AB46', sheetName: 'Rodeio Gado', disponivel: true },
  { id: 'suplementacao', label: 'SUPLEMENTAÇÃO', emoji: '🥄', icon: `${BASE}cadernetas/suplementacao.png`, color: '#B08D5E', sheetName: 'Suplementação', disponivel: true },
  { id: 'bebedouros', label: 'BEBEDOUROS', emoji: '💧', icon: `${BASE}cadernetas/bebedouros.png`, color: '#5B9BD5', sheetName: 'Bebedouros', disponivel: true },
  { id: 'movimentacao', label: 'MOVIMENTAÇÃO', emoji: '🚚', icon: `${BASE}cadernetas/movimentacao.png`, color: '#86AB54', sheetName: 'Movimentacao', disponivel: true },
]

export const CATEGORIAS_ANIMAL = ['Vaca', 'Touro', 'Boi', 'Bezerro', 'Garrote', 'Novilha'] as const

export const TIPOS_GADO = ['Cria', 'Recria', 'Engorda'] as const

export const PRODUTOS_SUPLEMENTACAO = ['Mineral', 'Proteinado', 'Ração'] as const

export const MOTIVOS_MOVIMENTACAO = [
  'Morte', 'Consumo', 'Transferência', 'Abate', 'Entrada', 'Entreverado',
] as const

export const TIPOS_PARTO = ['Normal', 'Distócico', 'Cesárea'] as const

export const SEXO_ANIMAL = ['Macho', 'Fêmea'] as const

export const DB_NAME = 'cadernetas-digitais'
export const DB_VERSION = 1

export const MAX_RETRY_COUNT = 3
export const SYNC_INTERVAL_MS = 5_000

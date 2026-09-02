const isDev = import.meta.env.MODE === 'development'

export const BACKEND_URL = isDev 
  ? (import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001')
  : import.meta.env.VITE_BACKEND_URL

const BASE = import.meta.env.BASE_URL

export const LOGO_URL = `${BASE}manejus360.png`

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
  if (lowerName.includes('guanabara')) {
    return `${BASE}logo-guanabara.jpg`
  }
  if (lowerName.includes('alegria')) {
    return `${BASE}logo-alegria.jpg`
  }
  if (lowerName.includes('dias cardoso') || lowerName.includes('diascardoso')) {
    return `${BASE}logo-diascardoso.jpeg`
  }
  if (lowerName.includes('jacamim') || lowerName.includes('estrela da jacamim')) {
    return `${BASE}logo-jacamim.jpeg`
  }
  if (lowerName.includes('paribo')) {
    return `${BASE}logo-paribo.jpeg`
  }

  // Logo padrão se não encontrar match
  return LOGO_URL
}

export const CADERNETAS = [
  { id: 'maternidade', label: 'MATERNIDADE', emoji: '🐄', icon: `${BASE}cadernetas/maternidade.png`, color: '#6D9E3B', disponivel: true, grupo: 'Gado & Pastagens' },
  { id: 'rodeio', label: 'RODEIO GADO', emoji: '🤠', icon: `${BASE}cadernetas/rodeio.png`, color: '#78AB46', disponivel: true, grupo: 'Gado & Pastagens' },
  { id: 'movimentacao', label: 'MOVIMENTAÇÃO', emoji: '🚚', icon: `${BASE}cadernetas/movimentacao.png`, color: '#86AB54', disponivel: true, grupo: 'Gado & Pastagens' },
  { id: 'enfermaria', label: 'ENFERMARIA', emoji: '🏥', icon: `${BASE}cadernetas/enfermaria.png`, color: '#78AB46', disponivel: true, grupo: 'Gado & Pastagens' },
  { id: 'morte', label: 'MORTE', emoji: '💀', icon: `${BASE}cadernetas/morte.png`, color: '#A0522D', disponivel: true, grupo: 'Gado & Pastagens' },
  { id: 'bebedouros', label: 'BEBEDOUROS', emoji: '💧', icon: `${BASE}cadernetas/bebedouros.png`, color: '#5B9BD5', disponivel: true, grupo: 'Infraestrutura & Geral' },
  { id: 'leitura-cocho', label: 'LEITURA DE COCHO', emoji: '📊', icon: `${BASE}cadernetas/leitura-cocho.png`, color: '#3B82F6', disponivel: true, grupo: 'Confinamento' },
  { id: 'trato-confinamento', label: 'TRATO CONFINAMENTO', emoji: '🌽', icon: `${BASE}cadernetas/trato-confinamento.png`, color: '#A0522D', disponivel: true, grupo: 'Confinamento' },
  { id: 'operacoes-maquinas', label: 'OPERAÇÕES DE MÁQUINAS', emoji: '🚜', icon: `${BASE}cadernetas/operacoes-maquinas.png`, color: '#059669', disponivel: true, grupo: 'Máquinas & Combustível' },
  { id: 'manutencao-maquinas', label: 'MANUTENÇÃO DE MÁQUINAS', emoji: '🔧', icon: `${BASE}cadernetas/manutencao-maquinas.png`, color: '#1e3a8a', disponivel: true, grupo: 'Máquinas & Combustível' },
  { id: 'abastecimento', label: 'ABASTECIMENTO', emoji: '⛽', icon: `${BASE}cadernetas/abastecimento.png`, color: '#F59E0B', disponivel: true, grupo: 'Máquinas & Combustível' },
  { id: 'almoxarifado', label: 'ALMOXARIFADO', emoji: '📦', icon: `${BASE}cadernetas/almoxarifado.png`, color: '#F97316', disponivel: true, grupo: 'Insumos & Estoque' },
  { id: 'entrada-insumos', label: 'ENTRADA DE INSUMOS', emoji: '', icon: `${BASE}cadernetas/entrada.png`, color: '#B08D5E', disponivel: true, grupo: 'Insumos & Estoque' },
  { id: 'saida-insumos', label: 'PRODUÇÃO FÁBRICA', emoji: '', icon: `${BASE}cadernetas/producao.png`, color: '#78AB46', disponivel: true, grupo: 'Insumos & Estoque' },
  { id: 'pastagens', label: 'MANEJO PASTAGENS', emoji: '🌾', icon: `${BASE}cadernetas/pastagens.png`, color: '#7D9045', disponivel: true, grupo: 'Gado & Pastagens' },
  { id: 'suplementacao', label: 'SUPLEMENTAÇÃO', emoji: '🥄', icon: `${BASE}cadernetas/suplementacao.png`, color: '#B08D5E', disponivel: true, grupo: 'Gado & Pastagens' },
  { id: 'clima', label: 'CLIMA', emoji: '🌤️', icon: `${BASE}cadernetas/clima.png`, color: '#4A90D9', disponivel: true, grupo: 'Infraestrutura & Geral' },
  { id: 'cantina', label: 'CANTINA', emoji: '🍽️', icon: `${BASE}cadernetas/cantina.png`, color: '#3B82F6', disponivel: true, grupo: 'Infraestrutura & Geral' },
  { id: 'limpeza', label: 'LIMPEZA', emoji: '🧹', icon: `${BASE}cadernetas/limpeza.png`, color: '#10B981', disponivel: true, grupo: 'Infraestrutura & Geral' },
  { id: 'problemas', label: 'PROBLEMAS', emoji: '⚠️', icon: `${BASE}cadernetas/problemas.png`, color: '#F59E0B', disponivel: true, grupo: 'Infraestrutura & Geral' },
]

export const CADERNETA_GRUPO_ORDEM = [
  'Gado & Pastagens',
  'Confinamento',
  'Infraestrutura & Geral',
  'Máquinas & Combustível',
  'Insumos & Estoque',
] as const

export const CADERNETA_GRUPO_CORES: Record<string, string> = {
  'Gado & Pastagens': '#6D9E3B',
  'Confinamento': '#B08D5E',
  'Máquinas & Combustível': '#4A6FA5',
  'Insumos & Estoque': '#D97706',
  'Infraestrutura & Geral': '#6B7280',
}

export const CATEGORIAS_ANIMAL = ['Vaca', 'Touro', 'Boi', 'Bezerro', 'Garrote', 'Novilha'] as const

export const TIPOS_GADO = ['Cria', 'Recria', 'Engorda'] as const

export const PRODUTOS_SUPLEMENTACAO = ['Mineral', 'Proteinado', 'Ração'] as const

export const MOTIVOS_MOVIMENTACAO = [
  'Consumo', 'Transferência', 'Abate', 'Entrada', 'Entrevero',
] as const

export const TIPOS_PARTO = ['Normal', 'Auxiliado', 'Cesárea', 'Aborto', 'Natimorto', 'Distócico', 'Gêmeos', 'Deficiência Física', 'Retenção de Placenta', 'Guacho'] as const

export const SEXO_ANIMAL = ['Macho', 'Fêmea'] as const

export const DB_NAME = 'cadernetas-digitais'
export const DB_VERSION = 8

export const MAX_RETRY_COUNT = 10
export const SYNC_INTERVAL_MS = 30_000
export const SYNC_CHECK_INTERVAL_MS = 10_000

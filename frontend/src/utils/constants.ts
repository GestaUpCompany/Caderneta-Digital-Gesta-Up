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
  { id: 'suplementacao', label: 'SUPLEMENTAÇÃO', emoji: '', icon: `${BASE}cadernetas/suplementacao.png`, color: '#B08D5E', disponivel: true, grupo: 'Suplementação a Pasto' },
  { id: 'saida-insumos', label: 'PRODUÇÃO FÁBRICA', emoji: '', icon: `${BASE}cadernetas/producao.png`, color: '#78AB46', disponivel: true, grupo: 'Suplementação a Pasto' },
  { id: 'leitura-cocho', label: 'LEITURA DE COCHO', emoji: '', icon: `${BASE}cadernetas/leitura-cocho.png`, color: '#3B82F6', disponivel: true, grupo: 'Confinamento & TIP' },
  { id: 'trato-confinamento', label: 'TRATO', emoji: '', icon: `${BASE}cadernetas/trato-confinamento.png`, color: '#A0522D', disponivel: true, grupo: 'Confinamento & TIP' },
  { id: 'fabrica-confinamento', label: 'CARREGAMENTO VAGÃO', emoji: '', icon: `${BASE}cadernetas/fabrica-confinamento.png`, color: '#8B4513', disponivel: true, grupo: 'Confinamento & TIP' },
  { id: 'rodeio', label: 'RODEIO GADO', emoji: '', icon: `${BASE}cadernetas/rodeio.png`, color: '#78AB46', disponivel: true, grupo: 'Gado & Pastagens' },
  { id: 'movimentacao', label: 'MOVIMENTAÇÃO', emoji: '', icon: `${BASE}cadernetas/movimentacao.png`, color: '#86AB54', disponivel: true, grupo: 'Gado & Pastagens' },
  { id: 'pastagens', label: 'MANEJO PASTAGENS', emoji: '', icon: `${BASE}cadernetas/pastagens.png`, color: '#7D9045', disponivel: true, grupo: 'Gado & Pastagens' },
  { id: 'morte', label: 'MORTE', emoji: '', icon: `${BASE}cadernetas/morte.png`, color: '#A0522D', disponivel: true, grupo: 'Gado & Pastagens' },
  { id: 'enfermaria', label: 'ENFERMARIA', emoji: '', icon: `${BASE}cadernetas/enfermaria.png`, color: '#78AB46', disponivel: true, grupo: 'Gado & Pastagens' },
  { id: 'maternidade', label: 'MATERNIDADE', emoji: '', icon: `${BASE}cadernetas/maternidade.png`, color: '#6D9E3B', disponivel: true, grupo: 'Gado & Pastagens' },
  { id: 'pesagem', label: 'PESAGEM', emoji: '', icon: `${BASE}cadernetas/pesagem.png`, color: '#4A6FA5', disponivel: true, grupo: 'Gado & Pastagens' },
  { id: 'bebedouros', label: 'BEBEDOUROS', emoji: '', icon: `${BASE}cadernetas/bebedouros.png`, color: '#5B9BD5', disponivel: true, grupo: 'Infraestrutura & Geral' },
  { id: 'limpeza', label: 'LIMPEZA', emoji: '', icon: `${BASE}cadernetas/limpeza.png`, color: '#10B981', disponivel: true, grupo: 'Infraestrutura & Geral' },
  { id: 'operacoes-maquinas', label: 'OPERAÇÕES MÁQUINAS', emoji: '', icon: `${BASE}cadernetas/operacoes-maquinas.png`, color: '#059669', disponivel: true, grupo: 'Máquinas' },
  { id: 'manutencao-maquinas', label: 'MANUTENÇÃO MÁQUINAS', emoji: '', icon: `${BASE}cadernetas/manutencao-maquinas.png`, color: '#1e3a8a', disponivel: true, grupo: 'Máquinas' },
  { id: 'abastecimento', label: 'ABASTECIMENTO', emoji: '', icon: `${BASE}cadernetas/abastecimento.png`, color: '#F59E0B', disponivel: true, grupo: 'Saída de Estoque' },  
  { id: 'almoxarifado', label: 'ALMOXARIFADO', emoji: '', icon: `${BASE}cadernetas/almoxarifado.png`, color: '#F97316', disponivel: true, grupo: 'Saída de Estoque' },
  { id: 'cantina', label: 'CANTINA', emoji: '', icon: `${BASE}cadernetas/cantina.png`, color: '#3B82F6', disponivel: true, grupo: 'Saída de Estoque' },
  { id: 'problemas', label: 'PROBLEMAS', emoji: '', icon: `${BASE}cadernetas/problemas.png`, color: '#F59E0B', disponivel: true, grupo: 'Infraestrutura & Geral' },
  { id: 'clima', label: 'CLIMA', emoji: '', icon: `${BASE}cadernetas/clima.png`, color: '#4A90D9', disponivel: true, grupo: 'Infraestrutura & Geral' },
  { id: 'entrada-insumos', label: 'INSUMOS', emoji: '', icon: `${BASE}cadernetas/entrada.png`, color: '#B08D5E', disponivel: true, grupo: 'Entrada de Estoque' },
  { id: 'entrada-combustivel', label: 'COMBUSTÍVEL', emoji: '', icon: `${BASE}cadernetas/entradacombustivel.png`, color: '#D97706', disponivel: true, grupo: 'Entrada de Estoque' },
  { id: 'entrada-almoxarifado', label: 'ALMOXARIFADO', emoji: '', icon: `${BASE}cadernetas/almoxarifado.png`, color: '#0F766E', disponivel: true, grupo: 'Entrada de Estoque' },
  { id: 'entrada-cantina', label: 'CANTINA', emoji: '', icon: `${BASE}cadernetas/cantina.png`, color: '#14B8A6', disponivel: true, grupo: 'Entrada de Estoque' },
]

export const CADERNETA_GRUPO_ORDEM = [
  'Suplementação a Pasto',
  'Confinamento & TIP',
  'Gado & Pastagens',
  'Infraestrutura & Geral',
  'Máquinas',
  'Saída de Estoque',
  'Entrada de Estoque',
] as const

export const CADERNETA_GRUPO_CORES: Record<string, string> = {
  'Suplementação a Pasto': '#223ecb',
  'Confinamento & TIP': '#8B4513',
  'Gado & Pastagens': '#6D9E3B',
  'Infraestrutura & Geral': '#b7b712',
  'Máquinas': '#4A6FA5',
  'Saída de Estoque': '#9e1f16',
  'Entrada de Estoque': '#148c76',
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

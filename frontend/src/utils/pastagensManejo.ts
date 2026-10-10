// Opções e constantes compartilhadas entre o manejo de pastos e o de currais (PastagensPage).

export const ESCORES_CORPORAIS = [
  { value: '1', label: 'Muito magro', dot: 'bg-red-500' },
  { value: '2', label: 'Magro', dot: 'bg-yellow-400' },
  { value: '3', label: 'Bom', dot: 'bg-green-500' },
  { value: '4', label: 'Gordo', dot: 'bg-yellow-400' },
  { value: '5', label: 'Muito gordo', dot: 'bg-red-500' },
]

export const ESCORES_FEZES = [
  { value: '1', label: 'Líquida', dot: 'bg-red-500' },
  { value: '2', label: 'Mole', dot: 'bg-yellow-400' },
  { value: '3', label: 'Ideal', dot: 'bg-green-500' },
  { value: '4', label: 'Firme', dot: 'bg-yellow-400' },
  { value: '5', label: 'Seca', dot: 'bg-red-500' },
]

export const EQUIPE_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6+' },
]

export const CONTADO_OPTIONS = [
  { value: 'Sim', label: 'SIM' },
  { value: 'Não', label: 'NÃO' },
]

// Chave usada em categoriasQuantidades quando o lote não tem categorias cadastradas.
export const CHAVE_TOTAL = '__total__'

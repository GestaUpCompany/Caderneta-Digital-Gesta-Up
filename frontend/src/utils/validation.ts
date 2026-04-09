export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

function isValidDate(value: string): boolean {
  if (!value) return false
  const regex = /^\d{2}\/\d{2}\/\d{4}$/
  if (!regex.test(value)) return false
  const [day, month, year] = value.split('/').map(Number)
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date <= new Date()
  )
}

function isPositiveNumber(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false
  const num = Number(value)
  return !isNaN(num) && num >= 0
}

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function isSnBoolean(value: unknown): boolean {
  return value === 'S' || value === 'N'
}

function isScaleValue(value: unknown, min: number, max: number, required = false): boolean {
  if (value === null || value === undefined || value === '') return !required
  const num = Number(value)
  return !isNaN(num) && num >= min && num <= max
}

export function validateMaternidade(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isNonEmptyString(data.pasto))
    errors.push({ field: 'pasto', message: 'Pasto é obrigatório' })
  if (!isNonEmptyString(data.numeroCria))
    errors.push({ field: 'numeroCria', message: 'Número da cria é obrigatório' })
  if (!isNonEmptyString(data.tratamento))
    errors.push({ field: 'tratamento', message: 'Tratamento é obrigatório' })
  if (!isNonEmptyString(data.tipoParto))
    errors.push({ field: 'tipoParto', message: 'Tipo de parto é obrigatório' })
  if (!isNonEmptyString(data.sexo))
    errors.push({ field: 'sexo', message: 'Sexo é obrigatório' })
  if (!isNonEmptyString(data.raca))
    errors.push({ field: 'raca', message: 'Raça é obrigatória' })
  if (!isNonEmptyString(data.numeroMae))
    errors.push({ field: 'numeroMae', message: 'Número da mãe é obrigatório' })
  if (!isNonEmptyString(data.categoriaMae))
    errors.push({ field: 'categoriaMae', message: 'Categoria da mãe é obrigatória' })

  return { isValid: errors.length === 0, errors }
}

export function validatePastagens(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isNonEmptyString(data.manejador))
    errors.push({ field: 'manejador', message: 'Manejador é obrigatório' })
  if (!isNonEmptyString(data.numeroLote))
    errors.push({ field: 'numeroLote', message: 'Número do lote é obrigatório' })
  if (!isNonEmptyString(data.pastoSaida))
    errors.push({ field: 'pastoSaida', message: 'Pasto de saída é obrigatório' })
  if (!isScaleValue(data.avaliacaoSaida, 1, 5, true))
    errors.push({ field: 'avaliacaoSaida', message: 'Avaliação de saída é obrigatória (1 a 5)' })
  if (!isNonEmptyString(data.pastoEntrada))
    errors.push({ field: 'pastoEntrada', message: 'Pasto de entrada é obrigatório' })
  if (!isScaleValue(data.avaliacaoEntrada, 1, 5, true))
    errors.push({ field: 'avaliacaoEntrada', message: 'Avaliação de entrada é obrigatória (1 a 5)' })

  const categorias = ['vaca', 'touro', 'bezerro', 'boiMagro', 'garrote', 'novilha']
  const algumPreenchido = categorias.some(
    (c) => data[c] !== null && data[c] !== undefined && data[c] !== '' && Number(data[c]) > 0
  )
  if (!algumPreenchido)
    errors.push({ field: 'categorias', message: 'Preencha ao menos uma categoria de animal' })

  return { isValid: errors.length === 0, errors }
}

export function validateRodeio(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isNonEmptyString(data.pasto))
    errors.push({ field: 'pasto', message: 'Pasto é obrigatório' })
  if (!isNonEmptyString(data.numeroLote))
    errors.push({ field: 'numeroLote', message: 'Número do lote é obrigatório' })

  const categorias = ['vaca', 'touro', 'bezerro', 'boi', 'garrote', 'novilha']
  const algumPreenchido = categorias.some(
    (c) => data[c] !== null && data[c] !== undefined && data[c] !== '' && Number(data[c]) > 0
  )
  if (!algumPreenchido)
    errors.push({ field: 'categorias', message: 'Preencha ao menos uma categoria de animal' })

  const avaliacoesSN: Record<string, string> = {
    escoreGadoIdeal: 'Escore do gado ideal',
    aguaBoaBebedouro: 'Água / Bebedouro',
    pastagemAdequada: 'Pastagem adequada',
    animaisDoentes: 'Animais doentes',
    cercasCochos: 'Cercas / Cochos',
    carrapatosMoscas: 'Carrapatos / Moscas',
    animaisEntrevados: 'Animais entrevados',
    animalMorto: 'Animal morto',
  }
  Object.entries(avaliacoesSN).forEach(([campo, label]) => {
    if (!isSnBoolean(data[campo]))
      errors.push({ field: campo, message: `${label}: selecione SIM ou NÃO` })
  })

  if (!isScaleValue(data.escoreFezes, 1, 5, true))
    errors.push({ field: 'escoreFezes', message: 'Escore de fezes é obrigatório (1 a 5)' })
  if (!isScaleValue(data.equipe, 1, 5, true))
    errors.push({ field: 'equipe', message: 'Avaliação da equipe é obrigatória (1 a 5)' })

  return { isValid: errors.length === 0, errors }
}

export function validateSuplementacao(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isNonEmptyString(data.tratador))
    errors.push({ field: 'tratador', message: 'Tratador é obrigatório' })
  if (!isNonEmptyString(data.pasto))
    errors.push({ field: 'pasto', message: 'Pasto é obrigatório' })
  if (!isNonEmptyString(data.produto))
    errors.push({ field: 'produto', message: 'Produto é obrigatório' })
  if (!isNonEmptyString(data.gado))
    errors.push({ field: 'gado', message: 'Tipo de gado é obrigatório' })
  if (!isScaleValue(data.leitura, -1, 3))
    errors.push({ field: 'leitura', message: 'Leitura deve ser entre -1 e 3' })
  if (!isPositiveNumber(data.kg))
    errors.push({ field: 'kg', message: 'KG deve ser um número positivo' })
  if (!isPositiveNumber(data.recria))
    errors.push({ field: 'recria', message: 'Recria deve ser um número positivo' })

  return { isValid: errors.length === 0, errors }
}

export function validateBebedouros(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isNonEmptyString(data.responsavel))
    errors.push({ field: 'responsavel', message: 'Responsável é obrigatório' })
  if (!isNonEmptyString(data.pasto))
    errors.push({ field: 'pasto', message: 'Pasto é obrigatório' })
  if (!isNonEmptyString(data.gado))
    errors.push({ field: 'gado', message: 'Tipo de gado é obrigatório' })
  if (!isNonEmptyString(data.categoria))
    errors.push({ field: 'categoria', message: 'Categoria é obrigatória' })
  if (!isScaleValue(data.leituraBebedouro, 1, 3, true))
    errors.push({ field: 'leituraBebedouro', message: 'Leitura do bebedouro deve ser entre 1 e 3' })

  return { isValid: errors.length === 0, errors }
}

export function validateMovimentacao(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isNonEmptyString(data.loteOrigem))
    errors.push({ field: 'loteOrigem', message: 'Lote de origem é obrigatório' })
  if (!isNonEmptyString(data.loteDestino))
    errors.push({ field: 'loteDestino', message: 'Lote de destino é obrigatório' })
  if (!isPositiveNumber(data.numeroCabecas) || Number(data.numeroCabecas) === 0)
    errors.push({ field: 'numeroCabecas', message: 'Número de cabeças deve ser maior que zero' })
  if (!isNonEmptyString(data.motivoMovimentacao))
    errors.push({ field: 'motivoMovimentacao', message: 'Motivo da movimentação é obrigatório' })

  const categorias = ['vaca', 'touro', 'boiGordo', 'boiMagro', 'garrote', 'bezerro', 'novilha', 'tropa', 'outros']
  const algumPreenchido = categorias.some((c) => data[c] === 'S')
  if (!algumPreenchido)
    errors.push({ field: 'categorias', message: 'Selecione ao menos uma categoria de animal' })

  return { isValid: errors.length === 0, errors }
}

export type CadernetaType = 'maternidade' | 'pastagens' | 'rodeio' | 'suplementacao' | 'bebedouros' | 'movimentacao'

const validators: Record<CadernetaType, (data: Record<string, unknown>) => ValidationResult> = {
  maternidade: validateMaternidade,
  pastagens: validatePastagens,
  rodeio: validateRodeio,
  suplementacao: validateSuplementacao,
  bebedouros: validateBebedouros,
  movimentacao: validateMovimentacao,
}

export function validate(caderneta: CadernetaType, data: Record<string, unknown>): ValidationResult {
  return validators[caderneta](data)
}

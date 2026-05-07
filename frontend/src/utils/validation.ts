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

/**
 * Helper para validar se ao menos uma categoria de animal numérica foi preenchida
 * @param data Objeto de dados contendo campos de categorias
 * @param categorias Array de nomes dos campos de categoria (ex: ['vaca', 'touro', 'bezerro'])
 * @param fieldName Nome do campo para erro (ex: 'categorias')
 * @param errorMessage Mensagem de erro personalizada
 * @returns ValidationError se nenhuma categoria preenchida, null se OK
 */
function validateCategoriasNumericas(
  data: Record<string, unknown>,
  categorias: string[],
  fieldName: string,
  errorMessage?: string
): ValidationError | null {
  const algumPreenchido = categorias.some(
    (c) => data[c] !== null && data[c] !== undefined && data[c] !== '' && Number(data[c]) > 0
  )
  if (!algumPreenchido) {
    return {
      field: fieldName,
      message: errorMessage || 'Preencha ao menos uma categoria de animal'
    }
  }
  return null
}

/**
 * Helper para validar se array de categorias tem pelo menos um item
 * @param categorias Array de strings de categorias
 * @param fieldName Nome do campo para erro (ex: 'categorias')
 * @param errorMessage Mensagem de erro personalizada
 * @returns ValidationError se array vazio, null se OK
 */
function validateCategoriasArray(
  categorias: unknown,
  fieldName: string,
  errorMessage?: string
): ValidationError | null {
  if (!categorias || !Array.isArray(categorias) || categorias.length === 0) {
    return {
      field: fieldName,
      message: errorMessage || 'Selecione ao menos uma categoria de animal'
    }
  }
  return null
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

  const categoriasError = validateCategoriasNumericas(
    data,
    ['vaca', 'touro', 'bezerro', 'boiMagro', 'garrote', 'novilha'],
    'categorias',
    'Preencha ao menos uma categoria de animal'
  )
  if (categoriasError) errors.push(categoriasError)

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

  const categoriasError = validateCategoriasNumericas(
    data,
    ['vaca', 'touro', 'boiGordo', 'boiMagro', 'garrote', 'bezerro', 'novilha', 'tropa', 'outros'],
    'categorias',
    'Preencha ao menos uma categoria de animal'
  )
  if (categoriasError) errors.push(categoriasError)

  const avaliacoesSN: Record<string, string> = {
    escoreGadoIdeal: 'Escore do gado ideal',
    aguaBoaBebedouro: 'Água / Bebedouro',
    pastagemAdequada: 'Pastagem adequada',
    animaisDoentes: 'Animais doentes / bichados',
    cercasCochos: 'Cercas / Cochos',
    carrapatosMoscas: 'Carrapatos / Moscas',
    animaisEntreverados: 'Animais entrevero',
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
  if (!isNonEmptyString(data.numeroLote))
    errors.push({ field: 'numeroLote', message: 'Lote é obrigatório' })
  if (!isNonEmptyString(data.produto))
    errors.push({ field: 'produto', message: 'Produto é obrigatório' })
  if (!isScaleValue(data.leituraCocho, -1, 3))
    errors.push({ field: 'leituraCocho', message: 'Leitura deve ser entre -1 e 3' })
  if (!isPositiveNumber(data.kgCocho))
    errors.push({ field: 'kgCocho', message: 'KG no cocho deve ser um número positivo' })
  if (!isPositiveNumber(data.kgDeposito))
    errors.push({ field: 'kgDeposito', message: 'KG no depósito deve ser um número positivo' })

  const categoriasError = validateCategoriasArray(
    data.categorias,
    'categorias',
    'Selecione ao menos uma categoria de animal'
  )
  if (categoriasError) errors.push(categoriasError)

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

  // Validação de brinco/chip apenas se for 1 cabeça
  if (Number(data.numeroCabecas) === 1) {
    if (!isNonEmptyString(data.brinco) && !isNonEmptyString(data.chip))
      errors.push({ field: 'brinco', message: 'Brinco ou Chip é obrigatório quando for 1 cabeça' })
  }

  const categoriasError = validateCategoriasArray(
    data.categorias,
    'categorias',
    'Selecione ao menos uma categoria de animal'
  )
  if (categoriasError) errors.push(categoriasError)

  return { isValid: errors.length === 0, errors }
}

export function validateEnfermaria(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isNonEmptyString(data.pasto))
    errors.push({ field: 'pasto', message: 'Pasto é obrigatório' })
  if (!isNonEmptyString(data.lote))
    errors.push({ field: 'lote', message: 'Lote é obrigatório' })
  // Pelo menos um dos dois é obrigatório
  if (!isNonEmptyString(data.brinco) && !isNonEmptyString(data.chip))
    errors.push({ field: 'brinco', message: 'Brinco ou Chip é obrigatório' })

  return { isValid: errors.length === 0, errors }
}

export function validateMorte(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isNonEmptyString(data.pasto))
    errors.push({ field: 'pasto', message: 'Pasto é obrigatório' })
  if (!isNonEmptyString(data.lote))
    errors.push({ field: 'lote', message: 'Lote é obrigatório' })
  // Pelo menos um dos dois é obrigatório
  if (!isNonEmptyString(data.brinco) && !isNonEmptyString(data.chip))
    errors.push({ field: 'brinco', message: 'Brinco ou Chip é obrigatório' })
  if (!isNonEmptyString(data.categoria))
    errors.push({ field: 'categoria', message: 'Categoria do animal é obrigatória' })
  if (data.categoria === 'Outros' && !isNonEmptyString(data.categoriaOutros))
    errors.push({ field: 'categoriaOutros', message: 'Especifique a categoria quando selecionar OUTROS' })
  if (!isNonEmptyString(data.sexo))
    errors.push({ field: 'sexo', message: 'Sexo é obrigatório' })
  if (!isNonEmptyString(data.raca))
    errors.push({ field: 'raca', message: 'Raça é obrigatória' })
  if (!isNonEmptyString(data.idade))
    errors.push({ field: 'idade', message: 'Idade é obrigatória' })
  if (!isNonEmptyString(data.causaMorte))
    errors.push({ field: 'causaMorte', message: 'Causa da morte é obrigatória' })

  return { isValid: errors.length === 0, errors }
}

export function validateClima(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isNonEmptyString(data.responsavel))
    errors.push({ field: 'responsavel', message: 'Responsável é obrigatório' })

  return { isValid: errors.length === 0, errors }
}

export function validateAbastecimento(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isNonEmptyString(data.quemAbasteceu))
    errors.push({ field: 'quemAbasteceu', message: 'Quem abasteceu é obrigatório' })
  if (!isNonEmptyString(data.operadorMotorista))
    errors.push({ field: 'operadorMotorista', message: 'Operador motorista é obrigatório' })
  if (!isNonEmptyString(data.veiculoTrator))
    errors.push({ field: 'veiculoTrator', message: 'Veículo trator é obrigatório' })
  if (!isNonEmptyString(data.placa))
    errors.push({ field: 'placa', message: 'Placa é obrigatória' })
  if (!isNonEmptyString(data.hidrometroInicial))
    errors.push({ field: 'hidrometroInicial', message: 'Hidrômetro inicial é obrigatório' })
  if (!isNonEmptyString(data.hidrometroFinal))
    errors.push({ field: 'hidrometroFinal', message: 'Hidrômetro final é obrigatório' })
  if (!isNonEmptyString(data.totalAbastecido))
    errors.push({ field: 'totalAbastecido', message: 'Total abastecido é obrigatório' })
  if (!isNonEmptyString(data.combustivel))
    errors.push({ field: 'combustivel', message: 'Combustível é obrigatório' })
  if (!isNonEmptyString(data.odometro))
    errors.push({ field: 'odometro', message: 'Odômetro é obrigatório' })
  if (!isNonEmptyString(data.tipoOperacao))
    errors.push({ field: 'tipoOperacao', message: 'Tipo de operação é obrigatório' })

  return { isValid: errors.length === 0, errors }
}

export function validateCantina(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isPositiveNumber(data.numeroCozinheiras) || Number(data.numeroCozinheiras) === 0)
    errors.push({ field: 'numeroCozinheiras', message: 'N° Cozinheiras deve ser maior que zero' })
  if (!isNonEmptyString(data.quemCozinhou))
    errors.push({ field: 'quemCozinhou', message: 'Quem cozinhou é obrigatório' })

  // Validar pelo menos um item preenchido
  if (data.itens && typeof data.itens === 'object') {
    const itens = data.itens as Record<string, unknown>
    const algumItemPreenchido = Object.values(itens).some(
      (valor) => valor !== null && valor !== undefined && valor !== '' && Number(valor) > 0
    )
    if (!algumItemPreenchido) {
      errors.push({ field: 'itens', message: 'Preencha pelo menos um item' })
    }
  } else {
    errors.push({ field: 'itens', message: 'Preencha pelo menos um item' })
  }

  return { isValid: errors.length === 0, errors }
}

export function validateLimpeza(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isPositiveNumber(data.numeroEquipe) || Number(data.numeroEquipe) === 0)
    errors.push({ field: 'numeroEquipe', message: 'N° Equipe deve ser maior que zero' })
  if (!isNonEmptyString(data.setor))
    errors.push({ field: 'setor', message: 'Setor é obrigatório' })
  if (!isNonEmptyString(data.local))
    errors.push({ field: 'local', message: 'Local é obrigatório' })
  if (!isNonEmptyString(data.horaInicio))
    errors.push({ field: 'horaInicio', message: 'Hora de início é obrigatória' })
  if (!isNonEmptyString(data.horaFinal))
    errors.push({ field: 'horaFinal', message: 'Hora final é obrigatória' })

  // Validar pelo menos um tipo de limpeza selecionado
  if (!data.limpezaRealizada || !Array.isArray(data.limpezaRealizada) || data.limpezaRealizada.length === 0) {
    errors.push({ field: 'limpezaRealizada', message: 'Selecione pelo menos um tipo de limpeza realizada' })
  }

  return { isValid: errors.length === 0, errors }
}

export type CadernetaType = 'maternidade' | 'pastagens' | 'rodeio' | 'suplementacao' | 'bebedouros' | 'movimentacao' | 'enfermaria' | 'morte' | 'clima' | 'abastecimento' | 'cantina' | 'limpeza'

const validators: Record<CadernetaType, (data: Record<string, unknown>) => ValidationResult> = {
  maternidade: validateMaternidade,
  pastagens: validatePastagens,
  rodeio: validateRodeio,
  suplementacao: validateSuplementacao,
  bebedouros: validateBebedouros,
  movimentacao: validateMovimentacao,
  enfermaria: validateEnfermaria,
  morte: validateMorte,
  clima: validateClima,
  abastecimento: validateAbastecimento,
  cantina: validateCantina,
  limpeza: validateLimpeza,
}

export function validate(caderneta: CadernetaType, data: Record<string, unknown>): ValidationResult {
  return validators[caderneta](data)
}

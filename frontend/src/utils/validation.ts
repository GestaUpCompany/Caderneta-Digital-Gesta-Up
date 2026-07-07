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

function isValidTime(value: unknown): boolean {
  if (typeof value !== 'string' || value.trim() === '') return false
  const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  return regex.test(value)
}

function isTimeAfter(startTime: unknown, endTime: unknown): boolean {
  if (!isValidTime(startTime) || !isValidTime(endTime)) return false
  const [startHours, startMinutes] = (startTime as string).split(':').map(Number)
  const [endHours, endMinutes] = (endTime as string).split(':').map(Number)
  const startTotalMinutes = startHours * 60 + startMinutes
  const endTotalMinutes = endHours * 60 + endMinutes
  return endTotalMinutes > startTotalMinutes
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
    (c) => {
      const value = Number(data[c])
      return !isNaN(value) && value > 0
    }
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
  if (!isNonEmptyString(data.idProvisorioCria))
    errors.push({ field: 'idProvisorioCria', message: 'ID Provisório é obrigatório' })
  if (!isNonEmptyString(data.tratamento))
    errors.push({ field: 'tratamento', message: 'Tratamento é obrigatório' })
  
  // Validate tipoParto - can be array (new) or string (old for compatibility)
  const tipoParto = data.tipoParto
  if (Array.isArray(tipoParto)) {
    if (tipoParto.length === 0)
      errors.push({ field: 'tipoParto', message: 'Tipo de parto é obrigatório' })
  } else if (!isNonEmptyString(tipoParto)) {
    errors.push({ field: 'tipoParto', message: 'Tipo de parto é obrigatório' })
  }
  
  if (!isNonEmptyString(data.sexo))
    errors.push({ field: 'sexo', message: 'Sexo é obrigatório' })
  if (!isNonEmptyString(data.raca))
    errors.push({ field: 'raca', message: 'Raça é obrigatória' })
  // Pelo menos um ID da mãe é obrigatório (Manejo, Brinco ou Chip)
  const hasManejo = isNonEmptyString(data.idManejoMae)
  const hasBrinco = isNonEmptyString(data.idBrincoMae)
  const hasChip = isNonEmptyString(data.idChipMae)
  if (!hasManejo && !hasBrinco && !hasChip)
    errors.push({ field: 'idManejoMae', message: 'Preencha o ID Manejo, Brinco ou Chip da mãe' })
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
  if (!isNonEmptyString(data.gadoContado))
    errors.push({ field: 'gadoContado', message: 'Responda se o gado foi contado' })

  // Only validate animal categories if gadoContado is "Sim"
  if (data.gadoContado === 'Sim') {
    const categoriasError = validateCategoriasNumericas(
      data,
      ['vaca', 'touro', 'bezerro', 'boiMagro', 'garrote', 'novilha'],
      'categorias',
      'Preencha ao menos uma categoria de animal'
    )
    if (categoriasError) errors.push(categoriasError)
  }

  return { isValid: errors.length === 0, errors }
}

export function validateRodeio(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isNonEmptyString(data.numeroLote))
    errors.push({ field: 'numeroLote', message: 'Número do lote é obrigatório' })
  if (!isNonEmptyString(data.gadoContado))
    errors.push({ field: 'gadoContado', message: 'Responda se o gado foi contado' })

  // Only validate categorias if gado was counted
  if (data.gadoContado === 'Sim') {
    const categoriasError = validateCategoriasNumericas(
      data,
      ['vaca', 'touro', 'boiGordo', 'boiMagro', 'garrote', 'bezerro', 'novilha', 'tropa', 'outros'],
      'categorias',
      'Preencha ao menos uma categoria de animal'
    )
    if (categoriasError) errors.push(categoriasError)
  }

  const avaliacoesSN: Record<string, string> = {
    bebedourosCochos: 'Bebedouros / Cochos',
    pastagensTaxaLotacao: 'Pastagens / Taxa de lotação',
    animaisMachucadosDoentesBichados: 'Animais machucados / doentes / bichados',
    cercasCochosPorteiras: 'Cercas / Cochos / Porteiras',
    carrapatosMoscas: 'Carrapatos / Moscas',
    animaisEntreverados: 'Animais entrevero',
    animalMorto: 'Animal morto',
  }
  Object.entries(avaliacoesSN).forEach(([campo, label]) => {
    const valor = (data.diagnosticos as any)?.[campo]?.valor
    if (!isSnBoolean(valor))
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
  if (!isNonEmptyString(data.formulacao))
    errors.push({ field: 'formulacao', message: 'Formulação é obrigatória' })
  if (!isScaleValue(data.leituraCocho, -1, 3))
    errors.push({ field: 'leituraCocho', message: 'Leitura deve ser entre -1 e 3' })
  if (!isPositiveNumber(data.kgCocho))
    errors.push({ field: 'kgCocho', message: 'KG no cocho deve ser um número positivo' })
  if (!isPositiveNumber(data.kgDeposito))
    errors.push({ field: 'kgDeposito', message: 'KG no depósito deve ser um número positivo' })

  return { isValid: errors.length === 0, errors }
}

export function validateBebedouros(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isNonEmptyString(data.responsavel))
    errors.push({ field: 'responsavel', message: 'Responsável é obrigatório' })
  if (!isScaleValue(data.leituraBebedouro, 1, 3, true))
    errors.push({ field: 'leituraBebedouro', message: 'Leitura do bebedouro deve ser entre 1 e 3' })

  return { isValid: errors.length === 0, errors }
}

export function validateMovimentacao(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  
  const motivo = data.motivoMovimentacao as string
  
  // Para Doação, apenas data e motivo são obrigatórios
  if (motivo === 'Doação') {
    if (!isNonEmptyString(data.motivoMovimentacao))
      errors.push({ field: 'motivoMovimentacao', message: 'Motivo da movimentação é obrigatório' })
    return { isValid: errors.length === 0, errors }
  }
  
  // Para outros motivos, validar campos normalmente
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
  // Pelo menos um ID de identificação é obrigatório
  if (!isNonEmptyString(data.idManejo) && !isNonEmptyString(data.brinco) && !isNonEmptyString(data.chip))
    errors.push({ field: 'idManejo', message: 'ID Manejo, Brinco ou Chip é obrigatório' })
  if (!isNonEmptyString(data.sexo))
    errors.push({ field: 'sexo', message: 'Sexo é obrigatório' })
  if (!isNonEmptyString(data.raca))
    errors.push({ field: 'raca', message: 'Raça é obrigatória' })
  if (!isNonEmptyString(data.idade))
    errors.push({ field: 'idade', message: 'Idade é obrigatória' })
  if (!isNonEmptyString(data.categoria))
    errors.push({ field: 'categoria', message: 'Categoria é obrigatória' })
  const diagnosticos = data.diagnosticos as string[] | undefined
  if (!diagnosticos || diagnosticos.length === 0)
    errors.push({ field: 'diagnosticos', message: 'Selecione pelo menos um diagnóstico' })

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

export function validateLeituraCocho(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isNonEmptyString(data.responsavel))
    errors.push({ field: 'responsavel', message: 'Responsável é obrigatório' })
  if (!isNonEmptyString(data.pastoCurral))
    errors.push({ field: 'pastoCurral', message: 'Pasto/Curral é obrigatório' })
  if (!isNonEmptyString(data.numeroLote))
    errors.push({ field: 'numeroLote', message: 'Lote é obrigatório' })
  if (!isScaleValue(data.leituraCocho, -1, 3, true))
    errors.push({ field: 'leituraCocho', message: 'Leitura do cocho deve ser entre -1 e 3' })

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
  if (!isNonEmptyString(data.maquinaVeiculo))
    errors.push({ field: 'maquinaVeiculo', message: 'Máquina/veículo é obrigatório' })
  if (!isNonEmptyString(data.totalAbastecido))
    errors.push({ field: 'totalAbastecido', message: 'Total abastecido é obrigatório' })
  if (!isNonEmptyString(data.combustivel))
    errors.push({ field: 'combustivel', message: 'Combustível é obrigatório' })
  if (!isNonEmptyString(data.odometro))
    errors.push({ field: 'odometro', message: 'Odômetro/horímetro é obrigatório' })
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

export function validateOperacoesMaquinas(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isNonEmptyString(data.maquinaVeiculo))
    errors.push({ field: 'maquinaVeiculo', message: 'Máquina/veículo é obrigatório' })
  
  // implementoUtilizado is now optional
  // horaInicial and horaFinal are now optional
  
  // Validar formato de horas only if provided
  if (data.horaInicial && !isValidTime(data.horaInicial))
    errors.push({ field: 'horaInicial', message: 'Hora inicial inválida. Use formato HH:MM' })
  
  if (data.horaFinal && !isValidTime(data.horaFinal))
    errors.push({ field: 'horaFinal', message: 'Hora final inválida. Use formato HH:MM' })
  
  // Validar que hora final é maior que hora inicial only if both provided
  if (isValidTime(data.horaInicial) && isValidTime(data.horaFinal) && !isTimeAfter(data.horaInicial, data.horaFinal)) {
    errors.push({ field: 'horaFinal', message: 'Hora final deve ser maior que hora inicial' })
  }
  
  // odometroHorimetroInicial and odometroHorimetroFinal are now optional
  
  // Validar que total odometro foi calculado (deve ser positivo quando ambos odômetros estão preenchidos)
  if (data.odometroHorimetroInicial && data.odometroHorimetroFinal && !isPositiveNumber(data.totalOdometroHorimetro)) {
    errors.push({ field: 'totalOdometroHorimetro', message: 'Odômetro final deve ser maior que o inicial' })
  }

  // tipoOperacao is now optional

  // Validar valores positivos em campos numéricos only if provided
  if (data.quantidadeTotalAplicada && !isPositiveNumber(data.quantidadeTotalAplicada))
    errors.push({ field: 'quantidadeTotalAplicada', message: 'Quantidade total aplicada deve ser positiva' })
  if (data.areaTrabalhada && !isPositiveNumber(data.areaTrabalhada))
    errors.push({ field: 'areaTrabalhada', message: 'Área trabalhada deve ser positiva' })
  if (data.doseAplicada && !isPositiveNumber(data.doseAplicada))
    errors.push({ field: 'doseAplicada', message: 'Dose aplicada deve ser positiva' })

  // Validar perguntas S/N only if provided
  if (data.metaDiariaBatida && !isSnBoolean(data.metaDiariaBatida))
    errors.push({ field: 'metaDiariaBatida', message: 'Meta diária batida: selecione SIM ou NÃO' })
  if (data.algumImprevisto && !isSnBoolean(data.algumImprevisto))
    errors.push({ field: 'algumImprevisto', message: 'Algum imprevisto: selecione SIM ou NÃO' })

  return { isValid: errors.length === 0, errors }
}

export function validateProblemas(data: Record<string, unknown>): ValidationResult {
  const errors: { field: string; message: string }[] = []

  // Validar data
  if (!data.data || typeof data.data !== 'string' || data.data.trim() === '')
    errors.push({ field: 'data', message: 'Data é obrigatória' })

  // Validar setor
  if (!data.setor || typeof data.setor !== 'string' || data.setor.trim() === '')
    errors.push({ field: 'setor', message: 'Setor é obrigatório' })

  // Validar local
  if (!data.local || typeof data.local !== 'string' || data.local.trim() === '')
    errors.push({ field: 'local', message: 'Local é obrigatório' })

  // Validar descrição do problema
  if (!data.descricaoProblema || typeof data.descricaoProblema !== 'string' || data.descricaoProblema.trim() === '')
    errors.push({ field: 'descricaoProblema', message: 'Descrição do problema é obrigatória' })

  // Validar perguntas S/N
  if (!isSnBoolean(data.causaIdentificada))
    errors.push({ field: 'causaIdentificada', message: 'Causa identificada: selecione SIM ou NÃO' })
  if (!isSnBoolean(data.acaoCorretivaRealizada))
    errors.push({ field: 'acaoCorretivaRealizada', message: 'Ação corretiva realizada: selecione SIM ou NÃO' })
  if (!isSnBoolean(data.causaRaizIdentificada))
    errors.push({ field: 'causaRaizIdentificada', message: 'Causa raiz identificada: selecione SIM ou NÃO' })

  // Validar tipo de ocorrência
  if (!data.tipoOcorrencia || typeof data.tipoOcorrencia !== 'string' || data.tipoOcorrencia.trim() === '')
    errors.push({ field: 'tipoOcorrencia', message: 'Tipo de ocorrência é obrigatório' })

  // Validar gravidade/impacto
  if (!data.gravidadeImpacto || typeof data.gravidadeImpacto !== 'string' || data.gravidadeImpacto.trim() === '')
    errors.push({ field: 'gravidadeImpacto', message: 'Gravidade ou impacto é obrigatório' })

  // Validar tipo de problema
  if (!data.tipoProblema || typeof data.tipoProblema !== 'string' || data.tipoProblema.trim() === '')
    errors.push({ field: 'tipoProblema', message: 'Tipo de problema é obrigatório' })

  // Validar prioridade
  if (!data.prioridade || typeof data.prioridade !== 'string' || data.prioridade.trim() === '')
    errors.push({ field: 'prioridade', message: 'Prioridade é obrigatória' })

  return { isValid: errors.length === 0, errors }
}

export function validateManutencaoMaquinas(data: Record<string, unknown>): ValidationResult {
  const errors: { field: string; message: string }[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isNonEmptyString(data.responsavelChecklist))
    errors.push({ field: 'responsavelChecklist', message: 'Responsável checklist é obrigatório' })
  if (!isNonEmptyString(data.maquinaVeiculo))
    errors.push({ field: 'maquinaVeiculo', message: 'Máquina/veículo é obrigatório' })

  const checklistPerguntas = [
    'abastecimentoRealizado',
    'lavagemRealizada',
    'vidrosPerfeitos',
    'freiosBons',
    'bateriaBoa',
    'conferiuEletrica',
    'maquinaEngraxada',
    'nivelAguaIdeal',
    'conferiuNivelOleo',
    'calibrouPneus',
    'limpouRadiador',
    'tapetesBons',
    'assentoBom',
  ]

  const checklist = data.checklist as Record<string, { valor: string | null; observacao: string }> | undefined
  checklistPerguntas.forEach(campo => {
    const valor = checklist?.[campo]?.valor
    if (valor !== 'S' && valor !== 'N')
      errors.push({ field: campo, message: 'Selecione SIM ou NÃO' })
  })

  return { isValid: errors.length === 0, errors }
}

export function validateEntradaInsumos(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.dataEntrada as string))
    errors.push({ field: 'dataEntrada', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isValidTime(data.horario))
    errors.push({ field: 'horario', message: 'Horário inválido. Use HH:MM' })
  if (!isNonEmptyString(data.produto))
    errors.push({ field: 'produto', message: 'Produto é obrigatório' })
  if (!isPositiveNumber(data.quantidade))
    errors.push({ field: 'quantidade', message: 'Quantidade deve ser maior ou igual a zero' })
  if (!isPositiveNumber(data.valorUnitario))
    errors.push({ field: 'valorUnitario', message: 'Valor unitário deve ser maior ou igual a zero' })
  if (!isPositiveNumber(data.valorTotal))
    errors.push({ field: 'valorTotal', message: 'Valor total deve ser maior ou igual a zero' })
  if (!isNonEmptyString(data.notaFiscal))
    errors.push({ field: 'notaFiscal', message: 'Nota fiscal é obrigatória' })
  if (!isNonEmptyString(data.fornecedor))
    errors.push({ field: 'fornecedor', message: 'Fornecedor é obrigatório' })
  if (!isNonEmptyString(data.responsavelRecebimento))
    errors.push({ field: 'responsavelRecebimento', message: 'Responsável pelo recebimento é obrigatório' })

  return { isValid: errors.length === 0, errors }
}

export function validateSaidaInsumos(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.dataProducao as string))
    errors.push({ field: 'dataProducao', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isNonEmptyString(data.dietaProduzida))
    errors.push({ field: 'dietaProduzida', message: 'Dieta produzida é obrigatória' })
  if (!isNonEmptyString(data.destinoProducao))
    errors.push({ field: 'destinoProducao', message: 'Destino da produção é obrigatório' })
  if (!isPositiveNumber(data.totalProduzido))
    errors.push({ field: 'totalProduzido', message: 'Total produzido deve ser maior ou igual a zero' })

  return { isValid: errors.length === 0, errors }
}

export function validateAlmoxarifado(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isNonEmptyString(data.quemEntregou))
    errors.push({ field: 'quemEntregou', message: 'Quem entregou é obrigatório' })
  if (!isNonEmptyString(data.quemPegou))
    errors.push({ field: 'quemPegou', message: 'Quem pegou é obrigatório' })

  // Validar pelo menos um item preenchido
  if (data.itens && Array.isArray(data.itens)) {
    if (data.itens.length === 0) {
      errors.push({ field: 'itens', message: 'Adicione pelo menos um item' })
    } else {
      data.itens.forEach((item: any, index: number) => {
        if (!isNonEmptyString(item.classificacao))
          errors.push({ field: `itens[${index}].classificacao`, message: 'Classificação do item é obrigatória' })
        if (!isNonEmptyString(item.nome))
          errors.push({ field: `itens[${index}].nome`, message: 'Nome do item é obrigatório' })
        if (!isPositiveNumber(item.quantidade))
          errors.push({ field: `itens[${index}].quantidade`, message: 'Quantidade deve ser maior que zero' })
        if (!isNonEmptyString(item.setor))
          errors.push({ field: `itens[${index}].setor`, message: 'Setor é obrigatório' })
        if (item.necessitaDevolucao === 'S' && !isNonEmptyString(item.prazoDevolucao))
          errors.push({ field: `itens[${index}].prazoDevolucao`, message: 'Prazo de devolução é obrigatório quando necessita devolução' })
      })
    }
  } else {
    errors.push({ field: 'itens', message: 'Adicione pelo menos um item' })
  }

  return { isValid: errors.length === 0, errors }
}

export type CadernetaType = 'maternidade' | 'pastagens' | 'rodeio' | 'suplementacao' | 'bebedouros' | 'movimentacao' | 'enfermaria' | 'morte' | 'clima' | 'abastecimento' | 'cantina' | 'limpeza' | 'operacoes-maquinas' | 'manutencao-maquinas' | 'problemas' | 'entrada-insumos' | 'saida-insumos' | 'almoxarifado' | 'leitura-cocho'

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
  'operacoes-maquinas': validateOperacoesMaquinas,
  'manutencao-maquinas': validateManutencaoMaquinas,
  problemas: validateProblemas,
  'entrada-insumos': validateEntradaInsumos,
  'saida-insumos': validateSaidaInsumos,
  almoxarifado: validateAlmoxarifado,
  'leitura-cocho': validateLeituraCocho,
}

export function validate(caderneta: CadernetaType, data: Record<string, unknown>): ValidationResult {
  return validators[caderneta](data)
}

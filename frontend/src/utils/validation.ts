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

function isValidDateWithTime(value: string): boolean {
  if (!value) return false
  const regex = /^\d{2}\/\d{2}\/\d{4}( \d{2}:\d{2})?$/
  if (!regex.test(value)) return false
  const [datePart] = value.split(' ')
  const [day, month, year] = datePart.split('/').map(Number)
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
export function validateMaternidade(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })

  // Detectar se é natimorto (2ª cria natimorta envia tipoParto com 'Natimorto')
  const tipoParto = data.tipoParto
  const isNatimorto = Array.isArray(tipoParto) ? tipoParto.includes('Natimorto') : tipoParto === 'Natimorto'

  if (!isNatimorto) {
    if (!isNonEmptyString(data.idProvisorioCria))
      errors.push({ field: 'idProvisorioCria', message: 'ID Provisório é obrigatório' })
    if (!isNonEmptyString(data.tratamento))
      errors.push({ field: 'tratamento', message: 'Tratamento é obrigatório' })
    if (!isNonEmptyString(data.sexo))
      errors.push({ field: 'sexo', message: 'Sexo é obrigatório' })
    if (!isNonEmptyString(data.raca))
      errors.push({ field: 'raca', message: 'Raça é obrigatória' })
  }

  // Validate tipoParto - can be array (new) or string (old for compatibility)
  if (Array.isArray(tipoParto)) {
    if (tipoParto.length === 0)
      errors.push({ field: 'tipoParto', message: 'Tipo de parto é obrigatório' })
  } else if (!isNonEmptyString(tipoParto)) {
    errors.push({ field: 'tipoParto', message: 'Tipo de parto é obrigatório' })
  }

  // Pelo menos um ID da mãe é obrigatório (Manejo, Brinco ou Chip)
  const hasManejo = isNonEmptyString(data.idManejoMae)
  const hasBrinco = isNonEmptyString(data.idBrincoMae)
  const hasChip = isNonEmptyString(data.idChipMae)
  if (!hasManejo && !hasBrinco && !hasChip)
    errors.push({ field: 'idManejoMae', message: 'Preencha o ID Manejo, Brinco ou Chip da mãe' })
  if (!isNonEmptyString(data.categoriaMae))
    errors.push({ field: 'categoriaMae', message: 'Categoria da mãe é obrigatória' })

  // Mãe adotiva (guacho): pelo menos um ID da adotiva é obrigatório
  const guachoCria = data.guachoCria === true || data.guachoCria === 'true'
  if (guachoCria) {
    const hasManejoAdotiva = isNonEmptyString(data.idManejoMaeAdotiva)
    const hasBrincoAdotiva = isNonEmptyString(data.idBrincoMaeAdotiva)
    const hasChipAdotiva = isNonEmptyString(data.idChipMaeAdotiva)
    if (!hasManejoAdotiva && !hasBrincoAdotiva && !hasChipAdotiva)
      errors.push({ field: 'idManejoMaeAdotiva', message: 'Preencha o ID Manejo, Brinco ou Chip da mãe adotiva' })
  }

  return { isValid: errors.length === 0, errors }
}

export function validatePastagens(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  // manejador não é validado aqui: é auto-injetado do Redux em api.ts,
  // que já tem guard próprio retornando mensagem mais útil.
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
    // Validar categorias_detalhes (formato novo) ou campos fixos (fallback)
    const categoriasDetalhes = data.categorias_detalhes
    if (Array.isArray(categoriasDetalhes) && categoriasDetalhes.length > 0) {
      const hasAny = categoriasDetalhes.some((c: any) => Number(c.quant_informada) > 0)
      if (!hasAny) {
        errors.push({ field: 'categorias', message: 'Preencha ao menos uma categoria de animal' })
      }
    } else {
      // Fallback: validar campos fixos para registros antigos
      const categoriasError = validateCategoriasNumericas(
        data,
        ['vaca', 'touro', 'bezerro', 'boiGordo', 'boiMagro', 'garrote', 'novilha', 'tropa', 'outros'],
        'categorias',
        'Preencha ao menos uma categoria de animal'
      )
      if (categoriasError) errors.push(categoriasError)
    }
  }

  // Escore do gado (1 a 5, permitindo 0.5)
  if (!isScaleValue(data.escoreGado, 1, 5, true))
    errors.push({ field: 'escoreGado', message: 'Escore do gado é obrigatório (1 a 5)' })

  // Escore de fezes (1 a 5)
  if (!isScaleValue(data.escoreFezes, 1, 5, true))
    errors.push({ field: 'escoreFezes', message: 'Escore de fezes é obrigatório (1 a 5)' })

  // Número de pessoas no manejo (1 a 5)
  const numPessoas = Number(data.numeroPessoasManejo) || 0
  if (numPessoas < 1 || numPessoas > 5)
    errors.push({ field: 'numeroPessoasManejo', message: 'Número de pessoas no manejo é obrigatório (1 a 5)' })

  // Validar nomes da equipe quando numeroPessoasManejo > 0
  if (numPessoas > 0) {
    const nomes = data.equipe_nomes
    let nomesPreenchidos = 0
    if (Array.isArray(nomes)) {
      nomesPreenchidos = nomes.filter((n: any) => typeof n === 'string' && n.trim() !== '').length
    }
    if (nomesPreenchidos < numPessoas)
      errors.push({ field: 'equipeNomes', message: `Preencha o nome de todas as ${numPessoas} pessoas` })
  }

  // Checklist (campos S/N) - validar apenas se algum campo estiver presente
  // (indica que o checklist está ativo para a fazenda)
  const checklistCampos = [
    { campo: 'bebedourosCochos', label: 'Bebedouros / Cochos' },
    { campo: 'pastagensTaxaLotacao', label: 'Pastagens / Taxa de lotação' },
    { campo: 'animaisMachucadosDoentesBichados', label: 'Animais machucados / doentes / bichados' },
    { campo: 'cercasCochosPorteiras', label: 'Cercas / Cochos / Porteiras' },
    { campo: 'carrapatosMoscas', label: 'Carrapatos / Moscas' },
    { campo: 'animaisEntreverados', label: 'Animais entreverados' },
    { campo: 'animalMorto', label: 'Animal morto' },
  ]
  const temChecklist = checklistCampos.some(({ campo }) => data[campo] !== undefined && data[campo] !== '')
  if (temChecklist) {
    checklistCampos.forEach(({ campo, label }) => {
      if (!isSnBoolean(data[campo]))
        errors.push({ field: campo, message: `${label}: selecione SIM ou NÃO` })
    })
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
  // Só valida diagnósticos quando o checklist está ativo (payload envia diagnosticos != null)
  if (data.diagnosticos) {
    Object.entries(avaliacoesSN).forEach(([campo, label]) => {
      const valor = (data.diagnosticos as any)?.[campo]?.valor
      if (!isSnBoolean(valor))
        errors.push({ field: campo, message: `${label}: selecione SIM ou NÃO` })
    })
  }

  if (!isScaleValue(data.escoreFezes, 1, 5, true))
    errors.push({ field: 'escoreFezes', message: 'Escore de fezes é obrigatório (1 a 5)' })
  if (!isScaleValue(data.equipe, 1, 5, true))
    errors.push({ field: 'equipe', message: 'Avaliação da equipe é obrigatória (1 a 5)' })

  // Validar nomes da equipe quando equipe > 0
  const numEquipe = Number(data.equipe) || 0
  if (numEquipe > 0) {
    const nomes = data.equipeNomes as string[] | undefined
    if (!nomes || nomes.length < numEquipe || nomes.some(v => !v || String(v).trim() === '')) {
      errors.push({ field: 'equipeNomes', message: 'Preencha o nome de todas as pessoas da equipe' })
    }
  }

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
  // Lote não é obrigatório: permite registrar suplementação em pasto sem lote ativo vinculado.
  // O aviso visual de "Nenhum lote ativo ocupando este pasto" permanece na UI (SuplementacaoPage.tsx).
  if (!isNonEmptyString(data.formulacao))
    errors.push({ field: 'formulacao', message: 'Formulação é obrigatória' })
  if (!isScaleValue(data.leituraCocho, -1, 3))
    errors.push({ field: 'leituraCocho', message: 'Leitura deve ser entre -1 e 3' })
  if (!isPositiveNumber(data.kgCocho) || Number(data.kgCocho) === 0)
    errors.push({ field: 'kgCocho', message: 'KG no cocho é obrigatório e deve ser maior que zero' })
  // KG no depósito é obrigatório e maior que zero apenas quando o pasto possui depósito
  if (data.possuiDeposito) {
    if (!isPositiveNumber(data.kgDeposito) || Number(data.kgDeposito) === 0)
      errors.push({ field: 'kgDeposito', message: 'KG no depósito é obrigatório e deve ser maior que zero' })
  }

  return { isValid: errors.length === 0, errors }
}

export function validateBebedouros(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isNonEmptyString(data.responsavel))
    errors.push({ field: 'responsavel', message: 'Responsável é obrigatório' })
  if (!isNonEmptyString(data.numeroBebedouro))
    errors.push({ field: 'numeroBebedouro', message: 'Bebedouro é obrigatório' })
  if (!isScaleValue(data.leituraBebedouro, 1, 3, true))
    errors.push({ field: 'leituraBebedouro', message: 'Leitura do bebedouro deve ser entre 1 e 3' })

  return { isValid: errors.length === 0, errors }
}

export function validateMovimentacao(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })

  const motivo = data.motivoMovimentacao as string
  const subtipo = data.subtipo as string

  // Para Doação, apenas data e motivo são obrigatórios
  if (motivo === 'Doação') {
    if (!isNonEmptyString(data.motivoMovimentacao))
      errors.push({ field: 'motivoMovimentacao', message: 'Motivo da movimentação é obrigatório' })
    return { isValid: errors.length === 0, errors }
  }

  // Para Transferência entre fazendas, validar origem e motivo (destino e categoria são tratados pela RPC)
  if (motivo === 'Saída' && subtipo === 'Transferência') {
    if (!isNonEmptyString(data.loteOrigem))
      errors.push({ field: 'loteOrigem', message: 'Lote de origem é obrigatório' })
    if (!isNonEmptyString(data.motivoMovimentacao))
      errors.push({ field: 'motivoMovimentacao', message: 'Motivo da movimentação é obrigatório' })
    return { isValid: errors.length === 0, errors }
  }

  // Para Entrada, validar lote (destino), categoria e cabeças (não exige loteDestino nem maxCabecasLote)
  if (motivo === 'Entrada') {
    if (!isNonEmptyString(data.loteOrigem))
      errors.push({ field: 'loteOrigem', message: 'Lote de destino é obrigatório' })
    if (!isNonEmptyString(data.motivoMovimentacao))
      errors.push({ field: 'motivoMovimentacao', message: 'Motivo da movimentação é obrigatório' })
    if (!isNonEmptyString(data.categoria))
      errors.push({ field: 'categoria', message: 'Categoria é obrigatória' })
    if (!isPositiveNumber(data.numeroCabecas) || Number(data.numeroCabecas) === 0)
      errors.push({ field: 'numeroCabecas', message: 'Número de cabeças deve ser maior que zero' })
    return { isValid: errors.length === 0, errors }
  }

  // Para outros motivos, validar campos normalmente
  if (!isNonEmptyString(data.loteOrigem))
    errors.push({ field: 'loteOrigem', message: 'Lote de origem é obrigatório' })
  if (!isNonEmptyString(data.loteDestino))
    errors.push({ field: 'loteDestino', message: 'Lote de destino é obrigatório' })
  if (!isPositiveNumber(data.numeroCabecas) || Number(data.numeroCabecas) === 0)
    errors.push({ field: 'numeroCabecas', message: 'Número de cabeças deve ser maior que zero' })
  if (data.maxCabecasLote && Number(data.numeroCabecas) > Number(data.maxCabecasLote))
    errors.push({ field: 'numeroCabecas', message: `Número de cabeças excede o total do lote (${data.maxCabecasLote})` })
  if (!isNonEmptyString(data.motivoMovimentacao))
    errors.push({ field: 'motivoMovimentacao', message: 'Motivo da movimentação é obrigatório' })
  if (!isNonEmptyString(data.categoria))
    errors.push({ field: 'categoria', message: 'Categoria é obrigatória' })

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
  // sexo, raca, idade e categoria são auto-derivados do banco de animais quando disponível.
  // Para animais novos, esses campos ficam vazios e são cadastrados posteriormente.
  const diagnosticos = data.diagnosticos as string[] | undefined
  if (!diagnosticos || diagnosticos.length === 0)
    errors.push({ field: 'diagnosticos', message: 'Selecione pelo menos um diagnóstico' })

  return { isValid: errors.length === 0, errors }
}

export function validateMorte(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isNonEmptyString(data.lote))
    errors.push({ field: 'lote', message: 'Lote é obrigatório' })
  // Brinco e chip sao opcionais, mas se ambos estiverem vazios, a observacao de identificacao e obrigatoria
  if (!isNonEmptyString(data.brinco) && !isNonEmptyString(data.chip) && !isNonEmptyString(data.observacaoIdentificacao))
    errors.push({ field: 'observacaoIdentificacao', message: 'Informe o brinco/chip ou a razão de o animal não ter identificação' })
  if (!isNonEmptyString(data.categoria))
    errors.push({ field: 'categoria', message: 'Categoria do animal é obrigatória' })
  if (data.categoria === 'Outros' && !isNonEmptyString(data.categoriaOutros))
    errors.push({ field: 'categoriaOutros', message: 'Especifique a categoria quando selecionar OUTROS' })
  if (!isNonEmptyString(data.sexo))
    errors.push({ field: 'sexo', message: 'Sexo é obrigatório' })
  if (!isNonEmptyString(data.raca))
    errors.push({ field: 'raca', message: 'Raça é obrigatória' })
  if (data.raca === 'Outros' && !isNonEmptyString(data.racaOutros))
    errors.push({ field: 'racaOutros', message: 'Especifique a raça quando selecionar OUTROS' })
  if (!isNonEmptyString(data.idade))
    errors.push({ field: 'idade', message: 'Idade é obrigatória' })
  if (!isNonEmptyString(data.causaMorte))
    errors.push({ field: 'causaMorte', message: 'Causa da morte é obrigatória' })
  if (data.causaMorte === 'Outros' && !isNonEmptyString(data.causaMorteOutros))
    errors.push({ field: 'causaMorteOutros', message: 'Especifique a causa da morte quando selecionar OUTROS' })

  // Validar 19 campos de diagnóstico (cada um deve ter valor S ou N)
  const CAMPOS_DIAGNOSTICO = [
    'secrecaoOrificios', 'sintomasPneumonia', 'inchaco', 'incoordenacaoTremores',
    'apatiaFraqueza', 'desordensDigestivas', 'fraturas', 'decomposicao',
    'doencasPrevias', 'medicamentosRecentes', 'morteSubita', 'animalSozinho',
    'salivacaoExcessiva', 'sinaisIntoxicacao', 'carrapatosMoscas', 'encontradoVivo',
    'medicado', 'animalInchado', 'animalBicheira',
  ]
  const diagnosticos = data.diagnosticos as Record<string, { valor: string | null; observacao: string }> | undefined
  for (const campo of CAMPOS_DIAGNOSTICO) {
    const valor = diagnosticos?.[campo]?.valor
    if (!isSnBoolean(valor))
      errors.push({ field: campo, message: 'Selecione SIM ou NÃO' })
  }

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

export function validateTratoConfinamento(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDate(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isNonEmptyString(data.curralId))
    errors.push({ field: 'curralId', message: 'Curral é obrigatório' })
  if (!isNonEmptyString(data.curral))
    errors.push({ field: 'curral', message: 'Nome do curral é obrigatório' })
  const ordem = Number(data.ordemTrato)
  if (!Number.isFinite(ordem) || ordem < 1)
    errors.push({ field: 'ordemTrato', message: 'Ordem do trato deve ser um número inteiro maior que zero' })
  // kg_real é opcional (pode estar vazio se o usuário ainda não digitou), mas se preenchido deve ser >= 0
  const kgReal = data.kgReal
  if (kgReal !== undefined && kgReal !== null && kgReal !== '') {
    const num = Number(kgReal)
    if (!Number.isFinite(num) || num < 0)
      errors.push({ field: 'kgReal', message: 'Kg real deve ser um número não negativo' })
  }

  return { isValid: errors.length === 0, errors }
}

export function validateFabricaConfinamento(data: Record<string, unknown>): ValidationResult {
  const errors: ValidationError[] = []

  if (!isValidDateWithTime(data.data as string))
    errors.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  if (!isNonEmptyString(data.tipo))
    errors.push({ field: 'tipo', message: 'Sistema de produção é obrigatório' })
  if (!isNonEmptyString(data.formulacaoId))
    errors.push({ field: 'formulacaoId', message: 'Dieta é obrigatória' })
  if (!isNonEmptyString(data.vagaoId))
    errors.push({ field: 'vagaoId', message: 'Vagão é obrigatório' })
  const ordem = Number(data.ordemTrato)
  if (!Number.isFinite(ordem) || ordem < 1)
    errors.push({ field: 'ordemTrato', message: 'Ordem do trato deve ser um número inteiro maior que zero' })
  const totalPrevisto = Number(data.totalPrevisto)
  if (!Number.isFinite(totalPrevisto) || totalPrevisto <= 0)
    errors.push({ field: 'totalPrevisto', message: 'Total previsto deve ser maior que zero' })
  const totalProduzido = Number(data.totalProduzido)
  if (!Number.isFinite(totalProduzido) || totalProduzido < 0)
    errors.push({ field: 'totalProduzido', message: 'Total produzido deve ser um número não negativo' })

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

  const modo = (data.modo as string) || 'cantina'

  if (modo === 'marmita') {
    // Validação modo marmita
    if (!isNonEmptyString(data.fornecedor))
      errors.push({ field: 'fornecedor', message: 'Fornecedor é obrigatório' })
    if (!isPositiveNumber(data.quantidadeMarmitas))
      errors.push({ field: 'quantidadeMarmitas', message: 'Quantidade de marmitas deve ser maior que zero' })
    if (!isPositiveNumber(data.precoUnitario))
      errors.push({ field: 'precoUnitario', message: 'Preço unitário deve ser maior que zero' })
    if (!isNonEmptyString(data.destinatario))
      errors.push({ field: 'destinatario', message: 'Destinatário é obrigatório' })
  } else {
    // Validação modo cantina (comportamento original)
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

  // implementoUtilizado is optional

  // horaInicial and horaFinal are optional, validate format if provided
  if (data.horaInicial && !isValidTime(data.horaInicial))
    errors.push({ field: 'horaInicial', message: 'Hora inicial inválida. Use formato HH:MM' })

  if (data.horaFinal && !isValidTime(data.horaFinal))
    errors.push({ field: 'horaFinal', message: 'Hora final inválida. Use formato HH:MM' })

  // Validar que hora final é maior que hora inicial only if both provided
  if (isValidTime(data.horaInicial) && isValidTime(data.horaFinal) && !isTimeAfter(data.horaInicial, data.horaFinal)) {
    errors.push({ field: 'horaFinal', message: 'Hora final deve ser maior que hora inicial' })
  }

  // odometroHorimetroInicial and odometroHorimetroFinal are required
  if (!isNonEmptyString(data.odometroHorimetroInicial))
    errors.push({ field: 'odometroHorimetroInicial', message: 'Odômetro/horímetro inicial é obrigatório' })
  if (!isNonEmptyString(data.odometroHorimetroFinal))
    errors.push({ field: 'odometroHorimetroFinal', message: 'Odômetro/horímetro final é obrigatório' })

  // Validar que total odometro foi calculado (deve ser positivo quando ambos odômetros estão preenchidos)
  if (data.odometroHorimetroInicial && data.odometroHorimetroFinal && !isPositiveNumber(data.totalOdometroHorimetro)) {
    errors.push({ field: 'totalOdometroHorimetro', message: 'Odômetro final deve ser maior que o inicial' })
  }

  // tipoOperacao is required
  if (!isNonEmptyString(data.tipoOperacao))
    errors.push({ field: 'tipoOperacao', message: 'Tipo de operação é obrigatório' })

  // Validar valores positivos em campos numéricos only if provided
  if (data.quantidadeTotalAplicada && !isPositiveNumber(data.quantidadeTotalAplicada))
    errors.push({ field: 'quantidadeTotalAplicada', message: 'Quantidade total aplicada deve ser positiva' })
  if (data.areaTrabalhada && !isPositiveNumber(data.areaTrabalhada))
    errors.push({ field: 'areaTrabalhada', message: 'Área trabalhada deve ser positiva' })
  if (data.doseAplicada && !isPositiveNumber(data.doseAplicada))
    errors.push({ field: 'doseAplicada', message: 'Dose aplicada deve ser positiva' })

  // metaDiariaBatida and algumImprevisto are required
  if (!isSnBoolean(data.metaDiariaBatida))
    errors.push({ field: 'metaDiariaBatida', message: 'Meta diária batida: selecione SIM ou NÃO' })
  if (!isSnBoolean(data.algumImprevisto))
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

export type CadernetaType = 'maternidade' | 'pastagens' | 'rodeio' | 'suplementacao' | 'bebedouros' | 'movimentacao' | 'enfermaria' | 'morte' | 'clima' | 'abastecimento' | 'cantina' | 'limpeza' | 'operacoes-maquinas' | 'manutencao-maquinas' | 'problemas' | 'entrada-insumos' | 'saida-insumos' | 'almoxarifado' | 'leitura-cocho' | 'trato-confinamento' | 'fabrica-confinamento'

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
  'trato-confinamento': validateTratoConfinamento,
  'fabrica-confinamento': validateFabricaConfinamento,
}

export function validate(caderneta: CadernetaType, data: Record<string, unknown>): ValidationResult {
  return validators[caderneta](data)
}

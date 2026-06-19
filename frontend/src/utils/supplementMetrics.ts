interface LoteCategoria {
  categoria: string
  quant_atual: number | null
  peso_vivo_atual_kg_cab: number | null
}

interface RegistroSuplementacao {
  data: string
  kg_cocho: number | null
  kg_deposito: number | null
  formulacao: string | null
}

interface Formulacao {
  nome: string | null
  teor_ms_dieta: number | null
  meta_consumo_ms_percent_pv: number | null
  custo_dieta_reais_cab_dia: number | null
  consumo_mn_kg_cab_dia: number | null
  consumo_ms_kg_cab_dia: number | null
  custo_mn_tonelada: number | null
  custo_ms_tonelada: number | null
}

interface SupplementMetrics {
  consumoMedioGeralPercentPV: number | null
  consumoMedio30DiasPercentPV: number | null
  consumoMedioGeralKgMN: number | null
  consumoMedio30DiasKgMN: number | null
  custoMedioReaisCabDia: number | null
}

const CATEGORIAS_EXCLUIDAS = [
  'bezerro',
  'bezerra',
  'bezerro ao pé',
  'bezerra ao pé'
]

/**
 * Calcula o peso vivo médio do lote, excluindo categorias de bezerros/bezerras
 */
function calcularPesoVivoMedio(categorias: LoteCategoria[]): number | null {
  let pesoTotal = 0
  let quantTotal = 0

  categorias.forEach(cat => {
    const categoriaNormalizada = cat.categoria.toLowerCase()
    const isExcluida = CATEGORIAS_EXCLUIDAS.some(excluida =>
      categoriaNormalizada.includes(excluida)
    )

    if (!isExcluida && cat.quant_atual && cat.peso_vivo_atual_kg_cab) {
      pesoTotal += cat.peso_vivo_atual_kg_cab * cat.quant_atual
      quantTotal += cat.quant_atual
    }
  })

  return quantTotal > 0 ? pesoTotal / quantTotal : null
}

/**
 * Calcula o consumo total de MN dos registros
 */
function calcularConsumoTotalMN(registros: RegistroSuplementacao[]): number {
  return registros.reduce((total, reg) => {
    const kgCocho = reg.kg_cocho || 0
    const kgDeposito = reg.kg_deposito || 0
    return total + kgCocho + kgDeposito
  }, 0)
}

/**
 * Filtra registros por período (últimos N dias)
 */
function filtrarRegistrosPorPeriodo(
  registros: RegistroSuplementacao[],
  dias: number
): RegistroSuplementacao[] {
  const dataCorte = new Date()
  dataCorte.setDate(dataCorte.getDate() - dias)

  return registros.filter(reg => {
    const dataReg = new Date(reg.data)
    return dataReg >= dataCorte
  })
}

/**
 * Filtra registros por formulação
 */
function filtrarRegistrosPorFormulacao(
  registros: RegistroSuplementacao[],
  nomeFormulacao: string | null
): RegistroSuplementacao[] {
  if (!nomeFormulacao) return registros
  return registros.filter(reg => reg.formulacao === nomeFormulacao)
}

/**
 * Calcula o número de dias únicos nos registros
 */
function calcularDiasUnicos(registros: RegistroSuplementacao[]): number {
  const datasUnicas = new Set(
    registros.map(reg => reg.data.split('T')[0])
  )
  return datasUnicas.size
}

/**
 * Calcula todas as métricas de suplementação
 */
export function calcularMetricasSuplementacao(
  categorias: LoteCategoria[],
  registros: RegistroSuplementacao[],
  formulacao: Formulacao
): SupplementMetrics {
  const pesoVivoMedio = calcularPesoVivoMedio(categorias)

  if (!pesoVivoMedio) {
    return {
      consumoMedioGeralPercentPV: null,
      consumoMedio30DiasPercentPV: null,
      consumoMedioGeralKgMN: null,
      consumoMedio30DiasKgMN: null,
      custoMedioReaisCabDia: null
    }
  }

  // Calcular número de animais elegíveis (excluindo bezerros/bezerras)
  const animaisElegiveis = categorias.reduce((total, cat) => {
    const categoriaNormalizada = cat.categoria.toLowerCase()
    const isExcluida = CATEGORIAS_EXCLUIDAS.some(excluida =>
      categoriaNormalizada.includes(excluida)
    )
    return isExcluida ? total : total + (cat.quant_atual || 0)
  }, 0)

  if (animaisElegiveis === 0) {
    return {
      consumoMedioGeralPercentPV: null,
      consumoMedio30DiasPercentPV: null,
      consumoMedioGeralKgMN: null,
      consumoMedio30DiasKgMN: null,
      custoMedioReaisCabDia: null
    }
  }

  // Filtrar registros pela formulação selecionada
  const registrosDaFormulacao = filtrarRegistrosPorFormulacao(registros, formulacao.nome)

  // Métricas gerais (todos os registros da formulação)
  const todosRegistros = registrosDaFormulacao
  const consumoTotalGeralMN = calcularConsumoTotalMN(todosRegistros)
  const diasGerais = calcularDiasUnicos(todosRegistros)

  const consumoMedioGeralKgMN = diasGerais > 0
    ? consumoTotalGeralMN / (animaisElegiveis * diasGerais)
    : null

  const consumoMedioGeralPercentPV = consumoMedioGeralKgMN !== null
    ? (consumoMedioGeralKgMN / pesoVivoMedio) * 100
    : null

  // Métricas 30 dias
  const registros30Dias = filtrarRegistrosPorPeriodo(registrosDaFormulacao, 30)
  const consumoTotal30DiasMN = calcularConsumoTotalMN(registros30Dias)
  const dias30Dias = calcularDiasUnicos(registros30Dias)

  const consumoMedio30DiasKgMN = dias30Dias > 0
    ? consumoTotal30DiasMN / (animaisElegiveis * dias30Dias)
    : null

  const consumoMedio30DiasPercentPV = consumoMedio30DiasKgMN !== null
    ? (consumoMedio30DiasKgMN / pesoVivoMedio) * 100
    : null

  // Custo médio (usando custo por tonelada e consumo real)
  let custoMedioReaisCabDia: number | null = null
  if (formulacao.custo_mn_tonelada && consumoMedioGeralKgMN !== null) {
    // Custo por tonelada (R$/ton) × consumo médio (kg/cab/dia) / 1000
    custoMedioReaisCabDia = (formulacao.custo_mn_tonelada * consumoMedioGeralKgMN) / 1000
  }

  return {
    consumoMedioGeralPercentPV,
    consumoMedio30DiasPercentPV,
    consumoMedioGeralKgMN,
    consumoMedio30DiasKgMN,
    custoMedioReaisCabDia
  }
}

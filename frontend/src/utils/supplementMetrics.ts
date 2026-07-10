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
  consumoMedioGeralKgMS: number | null
  consumoMedio30DiasKgMS: number | null
  custoMedioReaisCabDia: number | null
  motivoFalha?: string
  categoriasNaoElegiveis?: string[]
}

interface IntervaloTrato {
  inicio: Date
  fim: Date
  dias: number
  kgCocho: number
  consumoDiarioMN: number
}

const CATEGORIAS_EXCLUIDAS = [
  'bezerro',
  'bezerra',
  'bezerro ao pé',
  'bezerra ao pé'
]

function dataSemHoraUTC(dataStr: string): Date {
  const dataPart = dataStr.substring(0, 10)
  const [ano, mes, dia] = dataPart.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia))
}

function diferencaDias(inicio: Date, fim: Date): number {
  const diff = Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 1
}

function ordenarRegistrosPorData(registros: RegistroSuplementacao[]): RegistroSuplementacao[] {
  return [...registros].sort((a, b) => {
    const dataA = dataSemHoraUTC(a.data)
    const dataB = dataSemHoraUTC(b.data)
    return dataA.getTime() - dataB.getTime()
  })
}

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
 * Filtra registros por formulação
 */
function filtrarRegistrosPorFormulacao(
  registros: RegistroSuplementacao[],
  nomeFormulacao: string | null
): RegistroSuplementacao[] {
  if (!nomeFormulacao) return registros
  return registros.filter(reg => reg.formulacao === nomeFormulacao)
}

function calcularIntervalosTratos(
  registros: RegistroSuplementacao[]
): IntervaloTrato[] {
  const ordenados = ordenarRegistrosPorData(registros)
  const intervalos: IntervaloTrato[] = []

  for (let i = 0; i < ordenados.length - 1; i++) {
    const atual = ordenados[i]
    const proximo = ordenados[i + 1]
    const inicio = dataSemHoraUTC(atual.data)
    const fim = dataSemHoraUTC(proximo.data)
    const dias = diferencaDias(inicio, fim)
    const kgCocho = atual.kg_cocho || 0

    intervalos.push({
      inicio,
      fim,
      dias,
      kgCocho,
      consumoDiarioMN: kgCocho / dias
    })
  }

  return intervalos
}

function calcularMediaPorDiasCobertos(
  intervalos: IntervaloTrato[],
  dataInicio: Date,
  dataFim: Date
): number | null {
  let totalMN = 0
  let diasCobertos = 0

  const atual = new Date(dataInicio)
  while (atual <= dataFim) {
    const intervalo = intervalos.find(
      int => atual >= int.inicio && atual < int.fim
    )
    if (intervalo) {
      totalMN += intervalo.consumoDiarioMN
      diasCobertos++
    }
    atual.setUTCDate(atual.getUTCDate() + 1)
  }

  return diasCobertos > 0 ? totalMN / diasCobertos : null
}

function nullMetrics(
  motivoFalha: string,
  categoriasNaoElegiveis: string[]
): SupplementMetrics {
  return {
    consumoMedioGeralPercentPV: null,
    consumoMedio30DiasPercentPV: null,
    consumoMedioGeralKgMN: null,
    consumoMedio30DiasKgMN: null,
    consumoMedioGeralKgMS: null,
    consumoMedio30DiasKgMS: null,
    custoMedioReaisCabDia: null,
    motivoFalha,
    categoriasNaoElegiveis: categoriasNaoElegiveis.length > 0 ? categoriasNaoElegiveis : undefined
  }
}

/**
 * Calcula todas as métricas de suplementação
 */
export function calcularMetricasSuplementacao(
  categorias: LoteCategoria[],
  registros: RegistroSuplementacao[],
  formulacao: Formulacao
): SupplementMetrics {
  // Identificar categorias não elegíveis
  const categoriasNaoElegiveis: string[] = []
  categorias.forEach(cat => {
    const categoriaNormalizada = cat.categoria.toLowerCase()
    const isExcluida = CATEGORIAS_EXCLUIDAS.some(excluida =>
      categoriaNormalizada.includes(excluida)
    )
    if (isExcluida) {
      categoriasNaoElegiveis.push(cat.categoria)
    }
  })

  const pesoVivoMedio = calcularPesoVivoMedio(categorias)

  if (!pesoVivoMedio) {
    return nullMetrics('Não há peso vivo médio cadastrado no lote', categoriasNaoElegiveis)
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
    return nullMetrics(
      `Lote composto apenas por categorias não elegíveis: ${categoriasNaoElegiveis.join(', ')}`,
      categoriasNaoElegiveis
    )
  }

  // Filtrar registros pela formulação selecionada
  const registrosDaFormulacao = filtrarRegistrosPorFormulacao(registros, formulacao.nome)
  const intervalos = calcularIntervalosTratos(registrosDaFormulacao)

  if (intervalos.length === 0) {
    return nullMetrics(
      'É necessário pelo menos dois tratos para calcular o consumo médio',
      categoriasNaoElegiveis
    )
  }

  // Média geral: cobre do primeiro trato até o início do último trato
  const dataInicioGeral = intervalos[0].inicio
  const dataFimGeral = intervalos[intervalos.length - 1].fim
  const mediaMNGeral = calcularMediaPorDiasCobertos(intervalos, dataInicioGeral, dataFimGeral)

  const consumoMedioGeralKgMN = mediaMNGeral !== null
    ? mediaMNGeral / animaisElegiveis
    : null

  // Média 30 dias: cobre os últimos 30 dias até hoje
  const hoje = new Date()
  hoje.setUTCHours(0, 0, 0, 0)
  const inicio30Dias = new Date(hoje)
  inicio30Dias.setUTCDate(hoje.getUTCDate() - 30)
  const mediaMN30Dias = calcularMediaPorDiasCobertos(intervalos, inicio30Dias, hoje)

  const consumoMedio30DiasKgMN = mediaMN30Dias !== null
    ? mediaMN30Dias / animaisElegiveis
    : null

  // Cálculos de MS e %PV
  const teorMs = formulacao.teor_ms_dieta
  const fatorMs = teorMs ? teorMs / 100 : null

  const consumoMedioGeralKgMS = consumoMedioGeralKgMN !== null && fatorMs !== null
    ? consumoMedioGeralKgMN * fatorMs
    : null

  const consumoMedio30DiasKgMS = consumoMedio30DiasKgMN !== null && fatorMs !== null
    ? consumoMedio30DiasKgMN * fatorMs
    : null

  const consumoMedioGeralPercentPV = consumoMedioGeralKgMS !== null
    ? (consumoMedioGeralKgMS / pesoVivoMedio) * 100
    : null

  const consumoMedio30DiasPercentPV = consumoMedio30DiasKgMS !== null
    ? (consumoMedio30DiasKgMS / pesoVivoMedio) * 100
    : null

  // Custo médio (usando custo por tonelada de MN e consumo real)
  let custoMedioReaisCabDia: number | null = null
  if (formulacao.custo_mn_tonelada && consumoMedioGeralKgMN !== null) {
    custoMedioReaisCabDia = (formulacao.custo_mn_tonelada * consumoMedioGeralKgMN) / 1000
  }

  return {
    consumoMedioGeralPercentPV,
    consumoMedio30DiasPercentPV,
    consumoMedioGeralKgMN,
    consumoMedio30DiasKgMN,
    consumoMedioGeralKgMS,
    consumoMedio30DiasKgMS,
    custoMedioReaisCabDia,
    categoriasNaoElegiveis: categoriasNaoElegiveis.length > 0 ? categoriasNaoElegiveis : undefined
  }
}

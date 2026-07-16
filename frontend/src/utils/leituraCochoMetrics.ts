import { isoToBR } from './formatDate'

function round2(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !isFinite(value)) return null
  return Math.round(value * 100) / 100
}

interface CategoriaLote {
  categoria: string
  quant_atual: number | null
  peso_vivo_kg: number | null
}

interface LoteDetalhes {
  categorias?: CategoriaLote[] | string | null
  categorias_raw?: CategoriaLote[] | null
  n_cabecas?: number | null
  peso_vivo_kg?: number | null
}

function obterCategoriasArray(detalhesLote: LoteDetalhes): CategoriaLote[] {
  if (Array.isArray(detalhesLote.categorias_raw)) {
    return detalhesLote.categorias_raw
  }
  if (Array.isArray(detalhesLote.categorias)) {
    return detalhesLote.categorias
  }
  return []
}

interface RegistroSuplementacao {
  data: string
  kg_cocho: number | null
  formulacao: string | null
}

interface Formulacao {
  nome: string | null
  teor_ms_dieta: number | null
}

interface LeituraCochoAnterior {
  data: string
  leitura_cocho: number | null
}

export interface MetricasLeituraCocho {
  mediaConsumoMsKgDesdeFormacao: number | null
  mediaConsumoMsKgUltimos10Dias: number | null
  consumoMsKgDiaAnterior: number | null
  mediaConsumoMsPctPVDesdeFormacao: number | null
  mediaConsumoMsPctPVUltimos10Dias: number | null
  consumoMsPctPVDiaAnterior: number | null
  leiturasUltimos3Dias: { data: string; dataBR: string; nota: number | null }[]
  mensagem: string | null
}

const CATEGORIAS_EXCLUIDAS = [
  'bezerro',
  'bezerra',
  'bezerro ao pé',
  'bezerra ao pé',
]

function normalizarCategoria(categoria: string): string {
  return categoria.toLowerCase().trim()
}

function isCategoriaExcluida(categoria: string): boolean {
  const normalizada = normalizarCategoria(categoria)
  return CATEGORIAS_EXCLUIDAS.some(excluida => normalizada.includes(excluida))
}

export interface CmsJanelas {
  ontem: number | null
  anteontem: number | null
  tresDiasAtras: number | null
  dezDias: number | null
  geral: number | null
}

function parseDataRegistro(data: string): Date | null {
  if (!data) return null
  // Tenta formato ISO YYYY-MM-DDTHH:mm:ss
  const matchIso = data.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (matchIso) {
    const [_, ano, mes, dia] = matchIso
    return new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)))
  }
  // Tenta formato BR DD/MM/YYYY
  const matchBr = data.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (matchBr) {
    const [_, dia, mes, ano] = matchBr
    return new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)))
  }
  return null
}

function ordenarRegistrosPorData(registros: RegistroSuplementacao[]): RegistroSuplementacao[] {
  return [...registros].sort((a, b) => {
    const dataA = parseDataRegistro(a.data)
    const dataB = parseDataRegistro(b.data)
    if (!dataA || !dataB) return 0
    return dataA.getTime() - dataB.getTime()
  })
}

function calcularCmsIntervalo(
  kgCocho: number,
  diasIntervalo: number,
  cabecas: number,
  pesoVivoMedio: number,
  teorMs: number
): number | null {
  if (!kgCocho || diasIntervalo <= 0 || !cabecas || !pesoVivoMedio || !teorMs) return null
  const ms = kgCocho * (teorMs / 100)
  const msPorAnimalDia = ms / diasIntervalo / cabecas
  return (msPorAnimalDia / pesoVivoMedio) * 100
}

export function calcularCmsPorJanelas(
  detalhesLote: LoteDetalhes,
  registrosSuplementacao: RegistroSuplementacao[],
  teorMsDieta: number | null
): CmsJanelas {
  const cabecas = calcularCabecasElegiveis(detalhesLote)
  const pesoVivoMedio = calcularPesoVivoMedio(detalhesLote)

  if (!cabecas || !pesoVivoMedio || !teorMsDieta) {
    return { ontem: null, anteontem: null, tresDiasAtras: null, dezDias: null, geral: null }
  }

  const ordenados = ordenarRegistrosPorData(registrosSuplementacao)
  if (ordenados.length < 2) {
    return { ontem: null, anteontem: null, tresDiasAtras: null, dezDias: null, geral: null }
  }

  const hoje = new Date()
  hoje.setUTCHours(0, 0, 0, 0)

  const intervalos: { inicio: Date; fim: Date; dias: number; kgCocho: number; cms: number | null }[] = []

  for (let i = 0; i < ordenados.length - 1; i++) {
    const atual = ordenados[i]
    const proximo = ordenados[i + 1]
    const inicio = parseDataRegistro(atual.data)
    const fim = parseDataRegistro(proximo.data)
    if (!inicio || !fim) continue

    const diffMs = fim.getTime() - inicio.getTime()
    const dias = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)))
    const kgCocho = atual.kg_cocho || 0

    intervalos.push({
      inicio,
      fim,
      dias,
      kgCocho,
      cms: calcularCmsIntervalo(kgCocho, dias, cabecas, pesoVivoMedio, teorMsDieta),
    })
  }

  if (intervalos.length === 0) {
    return { ontem: null, anteontem: null, tresDiasAtras: null, dezDias: null, geral: null }
  }

  function cmsNaData(data: Date): number | null {
    const intervalo = intervalos.find(int => data >= int.inicio && data < int.fim)
    return intervalo?.cms ?? null
  }

  const ontem = new Date(hoje)
  ontem.setUTCDate(hoje.getUTCDate() - 1)

  const anteontem = new Date(hoje)
  anteontem.setUTCDate(hoje.getUTCDate() - 2)

  const tresDiasAtras = new Date(hoje)
  tresDiasAtras.setUTCDate(hoje.getUTCDate() - 3)

  const inicio10Dias = new Date(hoje)
  inicio10Dias.setUTCDate(hoje.getUTCDate() - 10)

  const valores10Dias: number[] = []
  const atual10 = new Date(inicio10Dias)
  while (atual10 <= hoje) {
    const cms = cmsNaData(atual10)
    if (cms !== null) valores10Dias.push(cms)
    atual10.setUTCDate(atual10.getUTCDate() + 1)
  }

  const valoresGeral: number[] = []
  const inicioGeral = intervalos[0].inicio
  const fimGeral = intervalos[intervalos.length - 1].fim
  const atualGeral = new Date(inicioGeral)
  while (atualGeral <= fimGeral) {
    const cms = cmsNaData(atualGeral)
    if (cms !== null) valoresGeral.push(cms)
    atualGeral.setUTCDate(atualGeral.getUTCDate() + 1)
  }

  return {
    ontem: round2(cmsNaData(ontem)),
    anteontem: round2(cmsNaData(anteontem)),
    tresDiasAtras: round2(cmsNaData(tresDiasAtras)),
    dezDias: valores10Dias.length > 0 ? round2(valores10Dias.reduce((a, b) => a + b, 0) / valores10Dias.length) : null,
    geral: valoresGeral.length > 0 ? round2(valoresGeral.reduce((a, b) => a + b, 0) / valoresGeral.length) : null,
  }
}

function calcularPesoVivoMedio(detalhesLote: LoteDetalhes): number | null {
  const categorias = obterCategoriasArray(detalhesLote)
  if (categorias.length === 0) {
    if (detalhesLote.peso_vivo_kg && detalhesLote.n_cabecas) {
      return Number(detalhesLote.peso_vivo_kg)
    }
    return null
  }

  let pesoTotal = 0
  let quantTotal = 0

  categorias.forEach(cat => {
    if (isCategoriaExcluida(cat.categoria)) return
    const quant = cat.quant_atual || 0
    const peso = cat.peso_vivo_kg || 0
    if (quant > 0 && peso > 0) {
      pesoTotal += peso * quant
      quantTotal += quant
    }
  })

  if (quantTotal === 0) return null
  return pesoTotal / quantTotal
}

function calcularCabecasElegiveis(detalhesLote: LoteDetalhes): number | null {
  const categorias = obterCategoriasArray(detalhesLote)
  if (categorias.length === 0) {
    return detalhesLote.n_cabecas || null
  }

  const total = categorias.reduce((acc, cat) => {
    if (isCategoriaExcluida(cat.categoria)) return acc
    return acc + (cat.quant_atual || 0)
  }, 0)

  return total > 0 ? total : null
}

function extrairDataUTC(iso: string): string {
  const date = new Date(iso)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function agruparMsPorDia(
  registros: RegistroSuplementacao[],
  formulacoes: Map<string, number | null>
): Map<string, number> {
  const porDia = new Map<string, number>()

  registros.forEach(reg => {
    if (!reg.data || !reg.kg_cocho) return
    const teorMs = reg.formulacao ? (formulacoes.get(reg.formulacao) ?? null) : null
    if (!teorMs) return

    const ms = reg.kg_cocho * (teorMs / 100)
    const dia = extrairDataUTC(reg.data)
    porDia.set(dia, (porDia.get(dia) || 0) + ms)
  })

  return porDia
}

function calcularMediaMsKg(
  porDia: Map<string, number>,
  dataInicio: Date,
  dataFim: Date,
  cabecas: number
): number | null {
  let totalMs = 0
  let diasComRegistro = 0

  const atual = new Date(dataInicio)
  while (atual <= dataFim) {
    const chave = extrairDataUTC(atual.toISOString())
    if (porDia.has(chave)) {
      totalMs += porDia.get(chave) || 0
      diasComRegistro++
    }
    atual.setUTCDate(atual.getUTCDate() + 1)
  }

  if (diasComRegistro === 0 || cabecas <= 0) return null
  return totalMs / (diasComRegistro * cabecas)
}

function calcularMediaMsKgEntreDatas(
  porDia: Map<string, number>,
  inicio: Date,
  fim: Date,
  cabecas: number
): number | null {
  return calcularMediaMsKg(porDia, inicio, fim, cabecas)
}

export async function calcularMetricasLeituraCocho(
  detalhesLote: LoteDetalhes,
  registrosSuplementacao: RegistroSuplementacao[],
  buscarFormulacao: (nome: string) => Promise<Formulacao | null>,
  leiturasAnteriores: LeituraCochoAnterior[]
): Promise<MetricasLeituraCocho> {
  if (!registrosSuplementacao || registrosSuplementacao.length === 0) {
    return {
      mediaConsumoMsKgDesdeFormacao: null,
      mediaConsumoMsKgUltimos10Dias: null,
      consumoMsKgDiaAnterior: null,
      mediaConsumoMsPctPVDesdeFormacao: null,
      mediaConsumoMsPctPVUltimos10Dias: null,
      consumoMsPctPVDiaAnterior: null,
      leiturasUltimos3Dias: [],
      mensagem:
        'Não há registros de suplementação para este lote ainda. Por isso não é possível calcular as métricas de consumo.',
    }
  }

  const cabecas = calcularCabecasElegiveis(detalhesLote)
  const pesoVivoMedio = calcularPesoVivoMedio(detalhesLote)

  if (!cabecas) {
    return {
      mediaConsumoMsKgDesdeFormacao: null,
      mediaConsumoMsKgUltimos10Dias: null,
      consumoMsKgDiaAnterior: null,
      mediaConsumoMsPctPVDesdeFormacao: null,
      mediaConsumoMsPctPVUltimos10Dias: null,
      consumoMsPctPVDiaAnterior: null,
      leiturasUltimos3Dias: [],
      mensagem: 'Não foi possível determinar a quantidade de cabeças do lote.',
    }
  }

  // Buscar teor de MS de cada formulação distinta
  const nomesFormulacoes = new Set(
    registrosSuplementacao
      .map(r => r.formulacao)
      .filter((f): f is string => !!f)
  )
  const formulacoes = new Map<string, number | null>()

  for (const nome of nomesFormulacoes) {
    try {
      const formulacao = await buscarFormulacao(nome)
      formulacoes.set(nome, formulacao?.teor_ms_dieta ?? null)
    } catch (error) {
      console.error(`Erro ao buscar formulação ${nome}:`, error)
      formulacoes.set(nome, null)
    }
  }

  const porDia = agruparMsPorDia(registrosSuplementacao, formulacoes)

  if (porDia.size === 0) {
    return {
      mediaConsumoMsKgDesdeFormacao: null,
      mediaConsumoMsKgUltimos10Dias: null,
      consumoMsKgDiaAnterior: null,
      mediaConsumoMsPctPVDesdeFormacao: null,
      mediaConsumoMsPctPVUltimos10Dias: null,
      consumoMsPctPVDiaAnterior: null,
      leiturasUltimos3Dias: [],
      mensagem:
        'Os registros de suplementação não possuem formulação com teor de MS configurado. Não é possível calcular as métricas de consumo.',
    }
  }

  // Data de formação = primeiro registro de suplementação
  const diasOrdenados = Array.from(porDia.keys()).sort()
  const dataFormacao = new Date(`${diasOrdenados[0]}T00:00:00Z`)
  const hoje = new Date()
  hoje.setUTCHours(0, 0, 0, 0)

  // Média desde a formação
  const mediaKgDesdeFormacao = calcularMediaMsKgEntreDatas(porDia, dataFormacao, hoje, cabecas)

  // Média últimos 10 dias
  const inicio10Dias = new Date(hoje)
  inicio10Dias.setUTCDate(inicio10Dias.getUTCDate() - 9)
  const mediaKg10Dias = calcularMediaMsKgEntreDatas(porDia, inicio10Dias, hoje, cabecas)

  // Consumo dia anterior
  const ontem = new Date(hoje)
  ontem.setUTCDate(ontem.getUTCDate() - 1)
  const chaveOntem = extrairDataUTC(ontem.toISOString())
  const msOntem = porDia.get(chaveOntem) || null
  const consumoKgOntem = msOntem !== null ? msOntem / cabecas : null

  // Percentuais
  const percentual = (valorKg: number | null) =>
    valorKg !== null && pesoVivoMedio && pesoVivoMedio > 0
      ? (valorKg / pesoVivoMedio) * 100
      : null

  const mediaPctDesdeFormacao = percentual(mediaKgDesdeFormacao)
  const mediaPct10Dias = percentual(mediaKg10Dias)
  const consumoPctOntem = percentual(consumoKgOntem)

  // Leituras de cocho dos últimos 3 dias
  const leiturasUltimos3Dias = leiturasAnteriores
    .filter(l => l.data && l.leitura_cocho !== null && l.leitura_cocho !== undefined)
    .slice(0, 3)
    .map(l => ({
      data: l.data,
      dataBR: isoToBR(extrairDataUTC(l.data)),
      nota: l.leitura_cocho,
    }))

  return {
    mediaConsumoMsKgDesdeFormacao: round2(mediaKgDesdeFormacao),
    mediaConsumoMsKgUltimos10Dias: round2(mediaKg10Dias),
    consumoMsKgDiaAnterior: round2(consumoKgOntem),
    mediaConsumoMsPctPVDesdeFormacao: round2(mediaPctDesdeFormacao),
    mediaConsumoMsPctPVUltimos10Dias: round2(mediaPct10Dias),
    consumoMsPctPVDiaAnterior: round2(consumoPctOntem),
    leiturasUltimos3Dias,
    mensagem: null,
  }
}

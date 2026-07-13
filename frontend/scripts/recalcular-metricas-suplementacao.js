// Script para recalcular métricas de consumo de suplementação para uma fazenda específica
// Uso: node scripts/recalcular-metricas-suplementacao.js
// Variáveis de ambiente: SUPABASE_URL, SUPABASE_ANON_KEY, FAZENDA_ID

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://nrwljcvhwbezmoummxbl.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''
const FAZENDA_ID = process.env.FAZENDA_ID || 'd649c65e-16ab-4b77-a84b-df937aa41cc3'

if (!SUPABASE_ANON_KEY) {
  console.error('ERRO: SUPABASE_ANON_KEY não definida')
  process.exit(1)
}

const CATEGORIAS_EXCLUIDAS = [
  'bezerro',
  'bezerra',
  'bezerro ao pé',
  'bezerra ao pé',
]

function dataSemHoraUTC(dataStr) {
  const dataPart = dataStr.substring(0, 10)
  const [ano, mes, dia] = dataPart.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia))
}

function diferencaDias(inicio, fim) {
  const diff = Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 1
}

function ordenarRegistrosPorData(registros) {
  return [...registros].sort((a, b) => {
    const dataA = dataSemHoraUTC(a.data)
    const dataB = dataSemHoraUTC(b.data)
    return dataA.getTime() - dataB.getTime()
  })
}

function calcularPesoVivoMedio(categorias) {
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

function filtrarRegistrosPorFormulacao(registros, nomeFormulacao) {
  if (!nomeFormulacao) return registros
  return registros.filter(reg => reg.formulacao === nomeFormulacao)
}

function calcularIntervalosTratos(registros) {
  const ordenados = ordenarRegistrosPorData(registros)
  const intervalos = []

  for (let i = 0; i < ordenados.length - 1; i++) {
    const atual = ordenados[i]
    const proximo = ordenados[i + 1]
    const inicio = dataSemHoraUTC(atual.data)
    const fim = dataSemHoraUTC(proximo.data)
    const dias = diferencaDias(inicio, fim)
    const kgCocho = Number(atual.kg_cocho) || 0

    intervalos.push({
      inicio,
      fim,
      dias,
      kgCocho,
      consumoDiarioMN: kgCocho / dias,
    })
  }

  return intervalos
}

function calcularMediaPorDiasCobertos(intervalos, dataInicio, dataFim) {
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

function calcularMetricasSuplementacao(categorias, registros, formulacao) {
  const categoriasNaoElegiveis = []
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
    return {
      consumoMedioGeralPercentPV: null,
      consumoMedio30DiasPercentPV: null,
      consumoMedioGeralKgMN: null,
      consumoMedio30DiasKgMN: null,
      consumoMedioGeralKgMS: null,
      consumoMedio30DiasKgMS: null,
      custoMedioReaisCabDia: null,
      motivoFalha: 'Não há peso vivo médio cadastrado no lote',
    }
  }

  const animaisElegiveis = categorias.reduce((total, cat) => {
    const categoriaNormalizada = cat.categoria.toLowerCase()
    const isExcluida = CATEGORIAS_EXCLUIDAS.some(excluida =>
      categoriaNormalizada.includes(excluida)
    )
    return isExcluida ? total : total + (Number(cat.quant_atual) || 0)
  }, 0)

  if (animaisElegiveis === 0) {
    return {
      consumoMedioGeralPercentPV: null,
      consumoMedio30DiasPercentPV: null,
      consumoMedioGeralKgMN: null,
      consumoMedio30DiasKgMN: null,
      consumoMedioGeralKgMS: null,
      consumoMedio30DiasKgMS: null,
      custoMedioReaisCabDia: null,
      motivoFalha: `Lote composto apenas por categorias não elegíveis: ${categoriasNaoElegiveis.join(', ')}`,
    }
  }

  const registrosDaFormulacao = filtrarRegistrosPorFormulacao(registros, formulacao.nome)
  const intervalos = calcularIntervalosTratos(registrosDaFormulacao)

  if (intervalos.length === 0) {
    return {
      consumoMedioGeralPercentPV: null,
      consumoMedio30DiasPercentPV: null,
      consumoMedioGeralKgMN: null,
      consumoMedio30DiasKgMN: null,
      consumoMedioGeralKgMS: null,
      consumoMedio30DiasKgMS: null,
      custoMedioReaisCabDia: null,
      motivoFalha: 'É necessário pelo menos dois tratos para calcular o consumo médio',
    }
  }

  const dataInicioGeral = intervalos[0].inicio
  const dataFimGeral = intervalos[intervalos.length - 1].fim
  const mediaMNGeral = calcularMediaPorDiasCobertos(intervalos, dataInicioGeral, dataFimGeral)

  const consumoMedioGeralKgMN = mediaMNGeral !== null
    ? mediaMNGeral / animaisElegiveis
    : null

  const hoje = new Date()
  hoje.setUTCHours(0, 0, 0, 0)
  const inicio30Dias = new Date(hoje)
  inicio30Dias.setUTCDate(hoje.getUTCDate() - 30)
  const mediaMN30Dias = calcularMediaPorDiasCobertos(intervalos, inicio30Dias, hoje)

  const consumoMedio30DiasKgMN = mediaMN30Dias !== null
    ? mediaMN30Dias / animaisElegiveis
    : null

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

  let custoMedioReaisCabDia = null
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
  }
}

async function supabaseRequest(method, path, body) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`
  const options = {
    method,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
  }
  if (body) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(url, options)
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Erro ${response.status}: ${text}`)
  }
  if (response.status === 204) return null
  return response.json()
}

async function fetchAll(table, query = '') {
  const path = `${table}?${query}`
  const data = await supabaseRequest('GET', path)
  return data || []
}

async function main() {
  console.log(`Iniciando recálculo para fazenda ${FAZENDA_ID}`)

  // Buscar dados necessários
  const [registros, lotes, categorias, formulacoes] = await Promise.all([
    fetchAll('registros_suplementacao', `fazenda_id=eq.${FAZENDA_ID}&order=data.asc&limit=10000`),
    fetchAll('lotes', `fazenda_id=eq.${FAZENDA_ID}&ativo=eq.true&limit=1000`),
    fetchAll('lote_categorias', `quant_atual=gt.0&limit=10000`),
    fetchAll('formulacoes', `fazenda_id=eq.${FAZENDA_ID}&ativo=eq.true&limit=1000`),
  ])

  console.log(`Registros: ${registros.length}`)
  console.log(`Lotes: ${lotes.length}`)
  console.log(`Categorias: ${categorias.length}`)
  console.log(`Formulações: ${formulacoes.length}`)

  // Agrupar categorias por lote
  const categoriasPorLote = {}
  categorias.forEach(cat => {
    if (!categoriasPorLote[cat.lote_id]) categoriasPorLote[cat.lote_id] = []
    categoriasPorLote[cat.lote_id].push(cat)
  })

  // Agrupar registros por lote_id
  const registrosPorLote = {}
  registros.forEach(reg => {
    if (!reg.lote_id) return
    if (!registrosPorLote[reg.lote_id]) registrosPorLote[reg.lote_id] = []
    registrosPorLote[reg.lote_id].push({
      id: reg.id,
      data: reg.data,
      kg_cocho: reg.kg_cocho,
      kg_deposito: reg.kg_deposito,
      formulacao: reg.formulacao,
    })
  })

  // Mapear formulações por nome
  const formulacaoPorNome = {}
  formulacoes.forEach(f => {
    formulacaoPorNome[f.nome] = f
  })

  let atualizados = 0
  let falhas = 0
  let semLote = 0

  for (const registro of registros) {
    if (!registro.lote_id) {
      semLote++
      continue
    }

    const cats = categoriasPorLote[registro.lote_id]
    if (!cats || cats.length === 0) {
      console.warn(`Registro ${registro.id} sem categorias no lote ${registro.lote_id}`)
      falhas++
      continue
    }

    const regsDoLote = registrosPorLote[registro.lote_id] || []
    const formulacao = formulacaoPorNome[registro.formulacao] || {
      nome: registro.formulacao,
      teor_ms_dieta: null,
      meta_consumo_ms_percent_pv: null,
      custo_dieta_reais_cab_dia: null,
      consumo_mn_kg_cab_dia: null,
      consumo_ms_kg_cab_dia: null,
      custo_mn_tonelada: null,
      custo_ms_tonelada: null,
    }

    const metricas = calcularMetricasSuplementacao(cats, regsDoLote, formulacao)

    if (metricas.motivoFalha) {
      console.warn(`Registro ${registro.id}: ${metricas.motivoFalha}`)
      falhas++
      continue
    }

    const payload = {
      consumo_medio_geral_percent_pv: metricas.consumoMedioGeralPercentPV,
      consumo_medio_30dias_percent_pv: metricas.consumoMedio30DiasPercentPV,
      consumo_medio_geral_kg_mn: metricas.consumoMedioGeralKgMN,
      consumo_medio_30dias_kg_mn: metricas.consumoMedio30DiasKgMN,
      consumo_medio_geral_kg_ms: metricas.consumoMedioGeralKgMS,
      consumo_medio_30dias_kg_ms: metricas.consumoMedio30DiasKgMS,
      custo_medio_reais_cab_dia: metricas.custoMedioReaisCabDia,
    }

    await supabaseRequest('PATCH', `registros_suplementacao?id=eq.${registro.id}`, payload)
    atualizados++
  }

  console.log('\nResumo:')
  console.log(`- Atualizados: ${atualizados}`)
  console.log(`- Falhas: ${falhas}`)
  console.log(`- Sem lote: ${semLote}`)
}

main().catch(err => {
  console.error('Erro fatal:', err)
  process.exit(1)
})

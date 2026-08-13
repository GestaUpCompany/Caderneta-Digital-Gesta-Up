import { aStar } from 'ngraph.path'
import createGraph from 'ngraph.graph'
import * as turf from '@turf/turf'
import type { MapaEstrada } from './mapaCache'

interface GraphNode {
  id: string
  lng: number
  lat: number
}

interface RouteResult {
  rota: GeoJSON.LineString | null
  distancia_m: number
  encontrou: boolean
}

/**
 * Constrói um grafo navegável a partir das LineStrings de estradas.
 * Nós são criados nos endpoints de cada estrada, com snap por tolerância
 * para conectar estradas adjacentes. Nós intermediários preservam a
 * geometria real da estrada.
 */
function construirGrafo(estradas: MapaEstrada[], toleranciaMetros: number = 30) {
  const graph = createGraph<GraphNode, { estradaId: string; comprimento: number }>()
  const nosPorCoord: Map<string, string> = new Map() // key "lng,lat" arredondado -> nodeId

  function obterOuCriarNo(lng: number, lat: number): string {
    // Snap por tolerância: arredondar coordenadas para agrupar pontos próximos
    // ~1 metro ≈ 0.00001 grau em lat; usar toleranciaMetros para definir o snap
    const snapFactor = toleranciaMetros / 111320 // aprox metros para graus
    const key = `${lng.toFixed(Math.max(0, -Math.log10(snapFactor)))},${lat.toFixed(Math.max(0, -Math.log10(snapFactor)))}`

    const existente = nosPorCoord.get(key)
    if (existente) return existente

    const id = `n${nosPorCoord.size}`
    graph.addNode(id, { id, lng, lat })
    nosPorCoord.set(key, id)
    return id
  }

  for (const estrada of estradas) {
    const geom = estrada.geometria
    if (!geom) continue
    let coords: [number, number][] = []

    if (geom.type === 'LineString') {
      coords = geom.coordinates as [number, number][]
    } else if (geom.type === 'MultiLineString') {
      // Processar cada parte da MultiLineString independentemente
      for (const parte of geom.coordinates as [number, number][][]) {
        processarSegmento(parte, estrada.id, obterOuCriarNo, graph)
      }
      continue
    } else {
      continue
    }

    processarSegmento(coords, estrada.id, obterOuCriarNo, graph)
  }

  return graph
}

function processarSegmento(
  coords: [number, number][],
  estradaId: string,
  obterOuCriarNo: (lng: number, lat: number) => string,
  graph: any,
) {
  if (coords.length < 2) return

  const nosIds: string[] = []
  for (const [lng, lat] of coords) {
    nosIds.push(obterOuCriarNo(lng, lat))
  }

  for (let i = 0; i < nosIds.length - 1; i++) {
    const de = nosIds[i]
    const para = nosIds[i + 1]
    const deData = graph.getNode(de).data as GraphNode
    const paraData = graph.getNode(para).data as GraphNode
    const dePoint = turf.point([deData.lng, deData.lat])
    const paraPoint = turf.point([paraData.lng, paraData.lat])
    const dist = turf.distance(dePoint, paraPoint, { units: 'meters' })

    if (dist < 0.1) continue // ignorar nós duplicados

    // Adicionar aresta bidirecional
    graph.addLink(de, para, { estradaId, comprimento: dist })
    graph.addLink(para, de, { estradaId, comprimento: dist })
  }
}

/**
 * Encontra o nó do grafo mais próximo de um ponto [lng, lat].
 */
function noMaisProximo(graph: any, lng: number, lat: number): string | null {
  let maisProximo: string | null = null
  let menorDist = Infinity

  graph.forEachNode((node: any) => {
    const data = node.data as GraphNode
    const d = Math.sqrt((data.lng - lng) ** 2 + (data.lat - lat) ** 2)
    if (d < menorDist) {
      menorDist = d
      maisProximo = node.id
    }
  })

  return maisProximo
}

/**
 * Calcula a rota entre dois pontos usando as estradas marcadas.
 * Retorna a LineString da rota e a distância total em metros.
 */
export function calcularRota(
  estradas: MapaEstrada[],
  origem: [number, number],
  destino: [number, number],
  toleranciaMetros: number = 30,
): RouteResult {
  if (estradas.length === 0) {
    return { rota: null, distancia_m: 0, encontrou: false }
  }

  const graph = construirGrafo(estradas, toleranciaMetros)

  const noOrigem = noMaisProximo(graph, origem[0], origem[1])
  const noDestino = noMaisProximo(graph, destino[0], destino[1])

  if (!noOrigem || !noDestino) {
    return { rota: null, distancia_m: 0, encontrou: false }
  }

  if (noOrigem === noDestino) {
    // Origem e destino snaparam para o mesmo nó
    const nodeData = graph.getNode(noOrigem)?.data as GraphNode | undefined
    if (!nodeData) {
      return { rota: null, distancia_m: 0, encontrou: false }
    }
    return {
      rota: {
        type: 'LineString',
        coordinates: [[nodeData.lng, nodeData.lat], destino],
      },
      distancia_m: turf.distance(turf.point(origem), turf.point(destino), { units: 'meters' }),
      encontrou: true,
    }
  }

  // Usar ngraph.path com A* para encontrar o caminho mais curto
  const pathFinder = aStar(graph, {
    oriented: false,
  })

  const caminho = pathFinder.find(noOrigem, noDestino)

  if (!caminho || caminho.length < 2) {
    return { rota: null, distancia_m: 0, encontrou: false }
  }

  // Construir LineString a partir dos nós do caminho
  const coordinates: [number, number][] = []
  let distanciaTotal = 0

  // Adicionar ponto de origem real (pode não estar exatamente no nó)
  coordinates.push(origem)

  for (let i = 0; i < caminho.length; i++) {
    const nodeData = caminho[i].data as GraphNode
    if (i === 0) {
      // Distância da origem real ao primeiro nó
      distanciaTotal += turf.distance(turf.point(origem), turf.point([nodeData.lng, nodeData.lat]), { units: 'meters' })
    }
    coordinates.push([nodeData.lng, nodeData.lat])
    if (i > 0) {
      const prevData = caminho[i - 1].data as GraphNode
      distanciaTotal += turf.distance(
        turf.point([prevData.lng, prevData.lat]),
        turf.point([nodeData.lng, nodeData.lat]),
        { units: 'meters' },
      )
    }
  }

  // Adicionar ponto de destino real
  const ultimoNo = caminho[caminho.length - 1].data as GraphNode
  distanciaTotal += turf.distance(
    turf.point([ultimoNo.lng, ultimoNo.lat]),
    turf.point(destino),
    { units: 'meters' },
  )
  coordinates.push(destino)

  return {
    rota: {
      type: 'LineString',
      coordinates,
    },
    distancia_m: distanciaTotal,
    encontrou: true,
  }
}

/**
 * Calcula a distância em linha reta entre dois pontos (fallback sem estradas).
 */
export function distanciaReta(origem: [number, number], destino: [number, number]): number {
  return turf.distance(turf.point(origem), turf.point(destino), { units: 'meters' })
}

/**
 * Calcula o centroide de um polígono (ponderado por área).
 * Usa a mesma fórmula do MapaFazenda.tsx do painel web.
 */
export function calcularCentroidePoligono(coords: [number, number][]): [number, number] {
  let area = 0
  let cx = 0
  let cy = 0

  for (let i = 0; i < coords.length - 1; i++) {
    const [x0, y0] = coords[i]
    const [x1, y1] = coords[i + 1]
    const cross = x0 * y1 - x1 * y0
    area += cross
    cx += (x0 + x1) * cross
    cy += (y0 + y1) * cross
  }

  area *= 0.5
  if (area === 0) {
    let lx = 0, ly = 0
    coords.forEach((c) => { lx += c[0]; ly += c[1] })
    return [lx / coords.length, ly / coords.length]
  }

  cx = cx / (6 * area)
  cy = cy / (6 * area)
  return [cx, cy]
}

/**
 * Verifica se um ponto está dentro de um polígono (ray casting).
 */
export function pontoDentroPoligono(lng: number, lat: number, coords: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const [xi, yi] = coords[i]
    const [xj, yj] = coords[j]
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi)
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * Calcula o melhor ponto para o label de um polígono:
 * 1. Centróide verdadeiro (ponderado por área)
 * 2. Se cair fora, centro do bounding box
 * 3. Se também cair fora, busca em grade
 */
export function calcularMelhorLabel(coords: [number, number][]): [number, number] {
  const [cx, cy] = calcularCentroidePoligono(coords)
  if (pontoDentroPoligono(cx, cy, coords)) {
    return [cx, cy]
  }

  const lngs = coords.map((c) => c[0])
  const lats = coords.map((c) => c[1])
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const bboxCx = (minLng + maxLng) / 2
  const bboxCy = (minLat + maxLat) / 2
  if (pontoDentroPoligono(bboxCx, bboxCy, coords)) {
    return [bboxCx, bboxCy]
  }

  const steps = 20
  for (let i = 1; i < steps; i++) {
    for (let j = 1; j < steps; j++) {
      const x = minLng + (maxLng - minLng) * (i / steps)
      const y = minLat + (maxLat - minLat) * (j / steps)
      if (pontoDentroPoligono(x, y, coords)) {
        return [x, y]
      }
    }
  }

  return [cx, cy]
}

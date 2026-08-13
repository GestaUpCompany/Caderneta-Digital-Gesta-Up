import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import MapLibreGL from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Map, Source, Layer, NavigationControl } from 'react-map-gl/maplibre'
import { Geolocation } from '@capacitor/geolocation'
import { Capacitor } from '@capacitor/core'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { ArrowLeft, Search, MapPin, Navigation, Crosshair, AlertCircle, X, Loader2 } from 'lucide-react'
import { syncMapaSePreciso, loadMapaFazenda, getDetalhesPasto, getDetalhesCurral, type MapaFazendaData, type DetalhePasto, type DetalheCurral } from '../services/mapaCache'
import { distanciaReta, calcularMelhorLabel } from '../services/mapaRouting'

// ==================== Configuração do mapa ====================

const esriWorldImagery: MapLibreGL.RasterSourceSpecification = {
  type: 'raster',
  tiles: [
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  ],
  tileSize: 256,
  attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',
  maxzoom: 19,
}

const esriLabels: MapLibreGL.RasterSourceSpecification = {
  type: 'raster',
  tiles: [
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  ],
  tileSize: 256,
  maxzoom: 19,
}

const mapStyle: MapLibreGL.StyleSpecification = {
  version: 8,
  sources: {
    esri: esriWorldImagery,
    'esri-labels': esriLabels,
  },
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: {
        'background-color': '#3a4a3a',
      },
    },
    {
      id: 'esri-satellite',
      type: 'raster',
      source: 'esri',
      paint: {},
    },
    {
      id: 'esri-labels',
      type: 'raster',
      source: 'esri-labels',
      paint: {
        'raster-opacity': 0.8,
      },
    },
  ],
}

// ==================== Tipos ====================

interface DestinoSelecionado {
  id: string
  nome: string
  tipo: 'pasto' | 'curral' | 'fabrica'
  geometria: GeoJSON.Geometry
  centroide: [number, number]
}

// ==================== Componente ====================

export default function MapaFazendaPage() {
  const navigate = useNavigate()
  const { fazendaId } = useSelector((state: RootState) => state.config)

  const [mapaData, setMapaData] = useState<MapaFazendaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'error'>('idle')
  const [gpsPosition, setGpsPosition] = useState<{ lng: number; lat: number; accuracy: number; heading: number | null } | null>(null)
  const [destino, setDestino] = useState<DestinoSelecionado | null>(null)
  const [busca, setBusca] = useState('')
  const [showBusca, setShowBusca] = useState(false)
  const [rota, setRota] = useState<GeoJSON.LineString | null>(null)
  const [distanciaRota, setDistanciaRota] = useState<number | null>(null)
  const [offlineAviso, setOfflineAviso] = useState(false)
  const [detalhePasto, setDetalhePasto] = useState<DetalhePasto | null>(null)
  const [detalheCurral, setDetalheCurral] = useState<DetalheCurral | null>(null)
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)
  const [detalheAberto, setDetalheAberto] = useState(false)
  const [initialView] = useState({
    longitude: -54.68,
    latitude: -16.52,
    zoom: 15,
  })

  const mapRef = useRef<any>(null)
  const gpsPrimeiraLeituraRef = useRef(true)
  const gpsWatchIdRef = useRef<string | null>(null)
  const headingSuavizadoRef = useRef<number | null>(null)

  // ==================== Carregar dados do mapa ====================
  useEffect(() => {
    if (!fazendaId) {
      setLoading(false)
      return
    }

    let cancelado = false

    async function carregar() {
      // 1. Tentar carregar do cache local (offline)
      const cached = await loadMapaFazenda()
      if (cached && !cancelado) {
        setMapaData(cached)
        // Centralizar no primeiro pasto se disponível
        if (cached.pastos.length > 0) {
          const g = cached.pastos[0].geometria
          if (g.type === 'Polygon') {
            const coords = (g as GeoJSON.Polygon).coordinates[0] as [number, number][]
            const [lng, lat] = calcularMelhorLabel(coords)
            voarPara(lng, lat, 15)
          }
        }
      }

      // 2. Sincronizar com Supabase se online
      if (navigator.onLine && !cancelado) {
        setSyncing(true)
        try {
          const fresh = await syncMapaSePreciso(fazendaId!)
          if (!cancelado && fresh) {
            setMapaData(fresh)
            if (fresh.pastos.length > 0 && !cached) {
              const g = fresh.pastos[0].geometria
              if (g.type === 'Polygon') {
                const coords = (g as GeoJSON.Polygon).coordinates[0] as [number, number][]
                const [lng, lat] = calcularMelhorLabel(coords)
                voarPara(lng, lat, 15)
              }
            }
          }
        } catch (err) {
          console.error('[MapaFazenda] Erro ao sincronizar:', err)
        } finally {
          if (!cancelado) setSyncing(false)
        }
      }

      if (!cancelado) setLoading(false)
    }

    carregar()
    return () => { cancelado = true }
  }, [fazendaId])

  // ==================== Helper: voar para coordenada ====================
  const voarPara = useCallback((lng: number, lat: number, zoom?: number) => {
    const map = mapRef.current?.getMap?.()
    if (!map) return
    const currentZoom = map.getZoom()
    map.flyTo({
      center: [lng, lat],
      zoom: zoom ?? Math.max(currentZoom, 16),
      duration: 1000,
      essential: true,
    })
  }, [])

  // ==================== GPS ====================
  const iniciarGPS = useCallback(async () => {
    setGpsStatus('requesting')
    gpsPrimeiraLeituraRef.current = true
    try {
      // Pedir permissão primeiro (necessário no Capacitor nativo)
      if (Capacitor.isNativePlatform()) {
        const perm = await Geolocation.requestPermissions()
        if (perm.location === 'denied') {
          setGpsStatus('denied')
          return
        }
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 15000,
      }

      const watchId = await Geolocation.watchPosition(options, (pos) => {
        if (!pos) {
          setGpsStatus('error')
          return
        }

        const lng = pos.coords.longitude
        const lat = pos.coords.latitude
        const accuracy = pos.coords.accuracy ?? 0
        let heading = pos.coords.heading ?? null

        // Suavização do heading: interpolação angular para evitar saltos bruscos
        // O GPS nativo pode retornar heading com ruído quando o usuário está parado
        if (heading !== null && !isNaN(heading)) {
          const prev = headingSuavizadoRef.current
          if (prev !== null) {
            // Diferença angular considerando wrap-around (0-360)
            let diff = heading - prev
            if (diff > 180) diff -= 360
            if (diff < -180) diff += 360
            // Interpolação suave: 70% do anterior + 30% do novo
            let suavizado = prev + diff * 0.3
            if (suavizado < 0) suavizado += 360
            if (suavizado >= 360) suavizado -= 360
            headingSuavizadoRef.current = suavizado
            heading = suavizado
          } else {
            headingSuavizadoRef.current = heading
          }
        }

        setGpsPosition({ lng, lat, accuracy, heading })
        setGpsStatus('active')

        // Centralizar mapa apenas na primeira leitura
        if (gpsPrimeiraLeituraRef.current) {
          gpsPrimeiraLeituraRef.current = false
          voarPara(lng, lat, 17)
        }
      })

      gpsWatchIdRef.current = watchId
    } catch (err: any) {
      console.error('[GPS] Erro ao iniciar:', err)
      if (err?.message?.includes('denied') || err?.code === 1) {
        setGpsStatus('denied')
      } else {
        setGpsStatus('error')
      }
    }
  }, [voarPara])

  // Parar GPS ao desmontar
  useEffect(() => {
    return () => {
      if (gpsWatchIdRef.current !== null) {
        Geolocation.clearWatch({ id: gpsWatchIdRef.current }).catch(() => {})
      }
    }
  }, [])

  // ==================== Iniciar GPS automaticamente ao montar ====================
  useEffect(() => {
    iniciarGPS()
  }, [iniciarGPS])

  // ==================== Calcular distância quando destino muda ====================
  // Routing por estradas temporariamente desabilitado: usar apenas distância em linha reta
  useEffect(() => {
    if (!destino || !gpsPosition) {
      setRota(null)
      setDistanciaRota(null)
      return
    }

    const origem: [number, number] = [gpsPosition.lng, gpsPosition.lat]
    const dist = distanciaReta(origem, destino.centroide)
    setRota(null)
    setDistanciaRota(dist)
  }, [destino, gpsPosition])

  // ==================== Detectar offline ====================
  useEffect(() => {
    const handleOffline = () => setOfflineAviso(true)
    const handleOnline = () => setOfflineAviso(false)

    setOfflineAviso(!navigator.onLine)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  // ==================== GeoJSON dos pastos ====================
  const pastosGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!mapaData) return { type: 'FeatureCollection', features: [] }
    const features: GeoJSON.Feature[] = mapaData.pastos.map((p) => ({
      type: 'Feature',
      properties: { id: p.id, nome: p.nome, tipo: 'pasto' },
      geometry: p.geometria,
    }))
    return { type: 'FeatureCollection', features }
  }, [mapaData])

  const pastosLabelsGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!mapaData) return { type: 'FeatureCollection', features: [] }
    const features: GeoJSON.Feature[] = []
    mapaData.pastos.forEach((p) => {
      if (p.geometria.type === 'Polygon') {
        const coords = (p.geometria as GeoJSON.Polygon).coordinates[0] as [number, number][]
        const [lng, lat] = calcularMelhorLabel(coords)
        features.push({
          type: 'Feature',
          properties: { id: p.id, nome: p.nome },
          geometry: { type: 'Point', coordinates: [lng, lat] },
        })
      }
    })
    return { type: 'FeatureCollection', features }
  }, [mapaData])

  // ==================== GeoJSON dos currais ====================
  const curraisGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!mapaData) return { type: 'FeatureCollection', features: [] }
    const features: GeoJSON.Feature[] = mapaData.currais.map((c) => ({
      type: 'Feature',
      properties: { id: c.id, nome: c.nome, tipo: 'curral' },
      geometry: c.geometria,
    }))
    return { type: 'FeatureCollection', features }
  }, [mapaData])

  const curraisLabelsGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!mapaData) return { type: 'FeatureCollection', features: [] }
    const features: GeoJSON.Feature[] = []
    mapaData.currais.forEach((c) => {
      if (c.geometria.type === 'Polygon') {
        const coords = (c.geometria as GeoJSON.Polygon).coordinates[0] as [number, number][]
        const [lng, lat] = calcularMelhorLabel(coords)
        features.push({
          type: 'Feature',
          properties: { id: c.id, nome: c.nome },
          geometry: { type: 'Point', coordinates: [lng, lat] },
        })
      }
    })
    return { type: 'FeatureCollection', features }
  }, [mapaData])

  // ==================== GeoJSON das estradas ====================
  const estradasGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!mapaData) return { type: 'FeatureCollection', features: [] }
    const features: GeoJSON.Feature[] = mapaData.estradas.map((e) => ({
      type: 'Feature',
      properties: { id: e.id, nome: e.nome },
      geometry: e.geometria,
    }))
    return { type: 'FeatureCollection', features }
  }, [mapaData])

  // ==================== GeoJSON dos pontos de interesse (apenas Point) ====================
  const pontosGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!mapaData) return { type: 'FeatureCollection', features: [] }
    const features: GeoJSON.Feature[] = mapaData.pontos
      .filter((p) => p.geometria.type === 'Point')
      .map((p) => ({
        type: 'Feature',
        properties: { id: p.id, nome: p.nome, tipo: p.tipo },
        geometry: p.geometria,
      }))
    return { type: 'FeatureCollection', features }
  }, [mapaData])

  // ==================== GeoJSON das fábricas (polígonos em mapa_pontos com tipo='fabrica') ====================
  const fabricasGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!mapaData) return { type: 'FeatureCollection', features: [] }
    const features: GeoJSON.Feature[] = mapaData.pontos
      .filter((p) => p.geometria.type === 'Polygon')
      .map((p) => ({
        type: 'Feature',
        properties: { id: p.id, nome: p.nome, tipo: 'fabrica' },
        geometry: p.geometria,
      }))
    return { type: 'FeatureCollection', features }
  }, [mapaData])

  const fabricasLabelsGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!mapaData) return { type: 'FeatureCollection', features: [] }
    const features: GeoJSON.Feature[] = []
    mapaData.pontos
      .filter((p) => p.geometria.type === 'Polygon')
      .forEach((p) => {
        const coords = (p.geometria as GeoJSON.Polygon).coordinates[0] as [number, number][]
        const [lng, lat] = calcularMelhorLabel(coords)
        features.push({
          type: 'Feature',
          properties: { id: p.id, nome: p.nome },
          geometry: { type: 'Point', coordinates: [lng, lat] },
        })
      })
    return { type: 'FeatureCollection', features }
  }, [mapaData])

  // ==================== GeoJSON da rota ====================
  const rotaGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!rota) return { type: 'FeatureCollection', features: [] }
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: rota,
      }],
    }
  }, [rota])

  // ==================== GeoJSON da posição GPS ====================
  const gpsGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!gpsPosition) return { type: 'FeatureCollection', features: [] }
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { accuracy: gpsPosition.accuracy },
        geometry: { type: 'Point', coordinates: [gpsPosition.lng, gpsPosition.lat] },
      }],
    }
  }, [gpsPosition])

  // ==================== GeoJSON do cone de direção (heading) ====================
  // O cone é renderizado como ícone SVG (symbol layer) com gradiente, rotacionado pelo heading.
  // O GeoJSON só carrega a posição + heading; o ícone é adicionado ao mapa via onLoad.
  const gpsHeadingGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!gpsPosition || gpsPosition.heading === null || isNaN(gpsPosition.heading)) {
      return { type: 'FeatureCollection', features: [] }
    }

    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { heading: gpsPosition.heading },
        geometry: { type: 'Point', coordinates: [gpsPosition.lng, gpsPosition.lat] },
      }],
    }
  }, [gpsPosition])

  // ==================== GeoJSON do destino ====================
  const destinoGeoJSON = useMemo<GeoJSON.FeatureCollection>(() => {
    if (!destino) return { type: 'FeatureCollection', features: [] }
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: { nome: destino.nome },
        geometry: { type: 'Point', coordinates: destino.centroide },
      }],
    }
  }, [destino])

  // ==================== Busca ====================
  const resultadosBusca = useMemo(() => {
    if (!busca.trim()) return []
    const termo = busca.toLowerCase()

    const pastosResults: { id: string; nome: string; tipo: 'pasto' | 'curral' | 'fabrica'; geometria: GeoJSON.Geometry; centroide: [number, number] }[] =
      (mapaData?.pastos || [])
        .filter((p) => p.nome.toLowerCase().includes(termo))
        .map((p) => {
          let centroide: [number, number] = [0, 0]
          if (p.geometria.type === 'Polygon') {
            centroide = calcularMelhorLabel((p.geometria as GeoJSON.Polygon).coordinates[0] as [number, number][])
          }
          return { id: p.id, nome: p.nome, tipo: 'pasto' as const, geometria: p.geometria, centroide }
        })

    const curraisResults: { id: string; nome: string; tipo: 'pasto' | 'curral' | 'fabrica'; geometria: GeoJSON.Geometry; centroide: [number, number] }[] =
      (mapaData?.currais || [])
        .filter((c) => c.nome.toLowerCase().includes(termo))
        .map((c) => {
          let centroide: [number, number] = [0, 0]
          if (c.geometria.type === 'Polygon') {
            centroide = calcularMelhorLabel((c.geometria as GeoJSON.Polygon).coordinates[0] as [number, number][])
          }
          return { id: c.id, nome: c.nome, tipo: 'curral' as const, geometria: c.geometria, centroide }
        })

    const fabricasResults: { id: string; nome: string; tipo: 'pasto' | 'curral' | 'fabrica'; geometria: GeoJSON.Geometry; centroide: [number, number] }[] =
      (mapaData?.pontos || [])
        .filter((p) => p.geometria.type === 'Polygon' && p.nome.toLowerCase().includes(termo))
        .map((p) => {
          let centroide: [number, number] = [0, 0]
          if (p.geometria.type === 'Polygon') {
            centroide = calcularMelhorLabel((p.geometria as GeoJSON.Polygon).coordinates[0] as [number, number][])
          }
          return { id: p.id, nome: p.nome, tipo: 'fabrica' as const, geometria: p.geometria, centroide }
        })

    return [...pastosResults, ...curraisResults, ...fabricasResults].slice(0, 15)
  }, [busca, mapaData])

  // ==================== Handlers ====================
  const selecionarDestino = (d: DestinoSelecionado) => {
    setDestino(d)
    setShowBusca(false)
    setBusca('')
    // Voar para o destino
    voarPara(d.centroide[0], d.centroide[1], 16)
  }

  const limparDestino = () => {
    setDestino(null)
    setRota(null)
    setDistanciaRota(null)
  }

  const centralizarGPS = () => {
    if (gpsPosition) {
      voarPara(gpsPosition.lng, gpsPosition.lat, 17)
    }
  }

  // ==================== Click no mapa ====================
  const onMapClick = async (e: any) => {
    if (!mapRef.current) return
    const map = mapRef.current.getMap()
    const features = map.queryRenderedFeatures(e.point, {
      layers: ['pastos-fill', 'currais-fill', 'fabricas-fill', 'pastos-labels', 'currais-labels', 'fabricas-labels'],
    })

    if (features.length === 0) return

    const f = features[0]
    const id = f.properties?.id as string
    const nome = f.properties?.nome as string
    const tipo = f.properties?.tipo as 'pasto' | 'curral' | 'fabrica'

    if (!id || !nome) return

    // Buscar geometria correspondente conforme o tipo
    let geometria: GeoJSON.Geometry | undefined
    if (tipo === 'pasto') {
      geometria = mapaData?.pastos.find((p) => p.id === id)?.geometria
    } else if (tipo === 'curral') {
      geometria = mapaData?.currais.find((c) => c.id === id)?.geometria
    } else if (tipo === 'fabrica') {
      geometria = mapaData?.pontos.find((p) => p.id === id)?.geometria
    }

    if (!geometria) return

    let centroide: [number, number] = [e.lngLat.lng, e.lngLat.lat]
    if (geometria.type === 'Polygon') {
      centroide = calcularMelhorLabel((geometria as GeoJSON.Polygon).coordinates[0] as [number, number][])
    }

    // Para fábrica, selecionar como destino diretamente (não há detalhes de lote)
    if (tipo === 'fabrica') {
      selecionarDestino({ id, nome, tipo, geometria, centroide })
      return
    }

    // Para pasto/curral, guardar info e mostrar botão "Exibir detalhes"
    setDetalhePasto(null)
    setDetalheCurral(null)
    setDetalheAberto(false)
    setDestinoPendente({ id, nome, tipo, geometria, centroide })
  }

  // Info pendente para o botão "Ir até aqui" do painel de detalhes
  const [destinoPendente, setDestinoPendente] = useState<DestinoSelecionado | null>(null)

  const abrirDetalhe = async () => {
    if (!destinoPendente) return
    setDetalheAberto(true)
    setCarregandoDetalhe(true)

    if (navigator.onLine) {
      try {
        if (destinoPendente.tipo === 'pasto') {
          const detalhe = await getDetalhesPasto(destinoPendente.id)
          if (detalhe) setDetalhePasto(detalhe)
        } else if (destinoPendente.tipo === 'curral') {
          const detalhe = await getDetalhesCurral(destinoPendente.id)
          if (detalhe) setDetalheCurral(detalhe)
        }
      } catch (err) {
        console.warn('[MapaFazenda] Erro ao buscar detalhes:', err)
      }
    }

    setCarregandoDetalhe(false)
  }

  const irAteDetalhe = () => {
    if (destinoPendente) {
      selecionarDestino(destinoPendente)
      setDetalhePasto(null)
      setDetalheCurral(null)
      setDestinoPendente(null)
      setDetalheAberto(false)
    }
  }

  const fecharDetalhe = () => {
    setDetalhePasto(null)
    setDetalheCurral(null)
    setDestinoPendente(null)
    setDetalheAberto(false)
  }

  // ==================== Render ====================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          <p className="text-gray-600 font-medium">Carregando mapa da fazenda...</p>
        </div>
      </div>
    )
  }

  if (!fazendaId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Nenhuma fazenda configurada.</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col">
      {/* ==================== Header ==================== */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 text-white z-10">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-gray-800 active:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold flex-1">Mapa da Fazenda</h1>
        {syncing && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Sincronizando
          </div>
        )}
        <button
          onClick={() => setShowBusca(!showBusca)}
          className="p-2 rounded-lg hover:bg-gray-800 active:bg-gray-700 transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>
      </div>

      {/* ==================== Barra de busca ==================== */}
      {showBusca && (
        <div className="absolute top-14 left-2 right-2 z-20 bg-white rounded-lg shadow-lg max-h-80 overflow-y-auto">
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pasto ou curral..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              autoFocus
            />
          </div          >
          {resultadosBusca.length > 0 && (
            <div className="py-1">
              {resultadosBusca.map((r) => (
                <button
                  key={`${r.tipo}-${r.id}`}
                  onClick={() => selecionarDestino({
                    id: r.id,
                    nome: r.nome,
                    tipo: r.tipo,
                    geometria: r.geometria,
                    centroide: r.centroide,
                  })}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-100 active:bg-gray-200 transition-colors text-left"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${r.tipo === 'pasto' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{r.nome}</p>
                    <p className="text-xs text-gray-500 capitalize">{r.tipo}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {busca.trim() && resultadosBusca.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">
              Nenhum resultado encontrado.
            </div>
          )}
        </div>
      )}

      {/* ==================== Aviso offline ==================== */}
      {offlineAviso && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 bg-yellow-500/90 text-black text-xs font-medium px-3 py-1.5 rounded-full shadow-lg">
          Sem conexão: mostrando delimitações e sua posição. O satélite voltará quando houver sinal.
        </div>
      )}

      {/* ==================== Aviso GPS negado ==================== */}
      {gpsStatus === 'denied' && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10 bg-red-500/90 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg max-w-[90%] text-center">
          Acesso à localização negado. Habilite nas configurações do navegador ou do app.
        </div>
      )}

      {/* ==================== Mapa ==================== */}
      <div className="flex-1 relative overflow-hidden" style={{ touchAction: 'none', minHeight: 0 }}>
        <Map
          ref={mapRef}
          initialViewState={initialView}
          mapStyle={mapStyle}
          interactiveLayerIds={['pastos-fill', 'currais-fill', 'fabricas-fill', 'pastos-labels', 'currais-labels', 'fabricas-labels']}
          onClick={onMapClick}
          dragRotate={false}
          touchPitch={false}
          pitchWithRotate={false}
          style={{ width: '100%', height: '100%' }}
          onLoad={(e) => {
            // Adicionar ícone do cone de direção GPS com gradiente
            const svg = `
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
                <defs>
                  <linearGradient id="coneGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.05"/>
                    <stop offset="40%" stop-color="#3b82f6" stop-opacity="0.25"/>
                    <stop offset="100%" stop-color="#60a5fa" stop-opacity="0.55"/>
                  </linearGradient>
                  <linearGradient id="coneStroke" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="#2563eb" stop-opacity="0.7"/>
                  </linearGradient>
                </defs>
                <path d="M 40 72 L 18 8 Q 40 0 62 8 Z"
                      fill="url(#coneGrad)"
                      stroke="url(#coneStroke)"
                      stroke-width="1.5"
                      stroke-linejoin="round"/>
              </svg>
            `
            const img = new Image()
            img.onload = () => {
              if (e.target && !e.target.hasImage('gps-cone-icon')) {
                e.target.addImage('gps-cone-icon', img, { pixelRatio: 2, sdf: false })
              }
            }
            img.src = 'data:image/svg+xml;base64,' + btoa(svg)
          }}
        >
          <NavigationControl position="top-right" showCompass={false} />

          {/* Source: pastos */}
          <Source id="pastos-source" type="geojson" data={pastosGeoJSON}>
            <Layer
              id="pastos-fill"
              type="fill"
              paint={{
                'fill-color': '#22c55e',
                'fill-opacity': destino ? 0.15 : 0.25,
              }}
              filter={['!=', 'id', destino?.id ?? '']}
            />
            <Layer
              id="pastos-fill-highlight"
              type="fill"
              paint={{
                'fill-color': '#facc15',
                'fill-opacity': 0.5,
              }}
              filter={['==', 'id', destino?.id ?? '__none__']}
            />
            <Layer
              id="pastos-line"
              type="line"
              paint={{
                'line-color': '#16a34a',
                'line-width': 2,
              }}
            />
          </Source>

          {/* Source: labels dos pastos (esconde o label do destino selecionado) */}
          <Source id="pastos-labels-source" type="geojson" data={pastosLabelsGeoJSON}>
            <Layer
              id="pastos-labels"
              type="symbol"
              layout={{
                'text-field': ['get', 'nome'],
                'text-size': 16,
                'text-anchor': 'center',
                'text-allow-overlap': true,
                'text-padding': 4,
                'text-font': ['Open Sans Bold', 'Open Sans Regular'],
              }}
              paint={{
                'text-color': '#ffffff',
                'text-halo-color': '#000000',
                'text-halo-width': 1,
              }}
              filter={['!=', 'id', destino?.id ?? '__none__']}
            />
          </Source>

          {/* Source: currais */}
          <Source id="currais-source" type="geojson" data={curraisGeoJSON}>
            <Layer
              id="currais-fill"
              type="fill"
              paint={{
                'fill-color': '#b45309',
                'fill-opacity': 0.4,
              }}
            />
            <Layer
              id="currais-line"
              type="line"
              paint={{
                'line-color': '#92400e',
                'line-width': 2,
              }}
            />
          </Source>

          {/* Source: labels dos currais (esconde o label do destino selecionado) */}
          <Source id="currais-labels-source" type="geojson" data={curraisLabelsGeoJSON}>
            <Layer
              id="currais-labels"
              type="symbol"
              layout={{
                'text-field': ['get', 'nome'],
                'text-size': 15,
                'text-anchor': 'center',
                'text-allow-overlap': true,
                'text-padding': 4,
                'text-font': ['Open Sans Bold', 'Open Sans Regular'],
              }}
              paint={{
                'text-color': '#ffffff',
                'text-halo-color': '#000000',
                'text-halo-width': 1,
              }}
              filter={['!=', 'id', destino?.id ?? '__none__']}
            />
          </Source>

          {/* Source: estradas */}
          <Source id="estradas-source" type="geojson" data={estradasGeoJSON}>
            <Layer
              id="estradas-line"
              type="line"
              paint={{
                'line-color': '#d97706',
                'line-width': 3,
                'line-opacity': 0.8,
              }}
            />
          </Source>

          {/* Source: fábricas (polígonos roxos) */}
          {fabricasGeoJSON.features.length > 0 && (
            <Source id="fabricas-source" type="geojson" data={fabricasGeoJSON}>
              <Layer
                id="fabricas-fill"
                type="fill"
                paint={{
                  'fill-color': '#7c3aed',
                  'fill-opacity': 0.3,
                }}
                filter={['==', '$type', 'Polygon']}
              />
              <Layer
                id="fabricas-line"
                type="line"
                paint={{
                  'line-color': '#5b21b6',
                  'line-width': 2,
                  'line-opacity': 0.9,
                }}
                filter={['==', '$type', 'Polygon']}
              />
            </Source>
          )}

          {/* Source: labels das fábricas (esconde o label do destino selecionado) */}
          {fabricasLabelsGeoJSON.features.length > 0 && (
            <Source id="fabricas-labels-source" type="geojson" data={fabricasLabelsGeoJSON}>
              <Layer
                id="fabricas-labels"
                type="symbol"
                layout={{
                  'text-field': ['get', 'nome'],
                  'text-size': 15,
                  'text-anchor': 'center',
                  'text-allow-overlap': true,
                  'text-padding': 4,
                  'text-font': ['Open Sans Bold', 'Open Sans Regular'],
                }}
                paint={{
                  'text-color': '#ffffff',
                  'text-halo-color': '#5b21b6',
                  'text-halo-width': 1,
                }}
                filter={['!=', 'id', destino?.id ?? '__none__']}
              />
            </Source>
          )}

          {/* Source: pontos de interesse (apenas Point) */}
          <Source id="pontos-source" type="geojson" data={pontosGeoJSON}>
            <Layer
              id="pontos-circle"
              type="circle"
              paint={{
                'circle-radius': 6,
                'circle-color': '#7c3aed',
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff',
              }}
              filter={['==', '$type', 'Point']}
            />
          </Source>

          {/* Source: rota */}
          {rotaGeoJSON.features.length > 0 && (
            <Source id="rota-source" type="geojson" data={rotaGeoJSON}>
              <Layer
                id="rota-line"
                type="line"
                layout={{
                  'line-cap': 'round',
                  'line-join': 'round',
                }}
                paint={{
                  'line-color': '#3b82f6',
                  'line-width': 4,
                  'line-opacity': 0.85,
                }}
              />
            </Source>
          )}

          {/* Source: cone de direção (heading) - ícone SVG com gradiente rotacionado */}
          {gpsHeadingGeoJSON.features.length > 0 && (
            <Source id="gps-heading-source" type="geojson" data={gpsHeadingGeoJSON}>
              <Layer
                id="gps-heading-cone"
                type="symbol"
                layout={{
                  'icon-image': 'gps-cone-icon',
                  'icon-rotate': ['get', 'heading'],
                  'icon-rotation-alignment': 'map',
                  'icon-allow-overlap': true,
                  'icon-anchor': 'bottom',
                  'icon-size': 1,
                  'icon-offset': [0, 0],
                }}
                paint={{
                  'icon-opacity': 0.9,
                }}
              />
            </Source>
          )}

          {/* Source: posição GPS (círculo de precisão + ponto central) */}
          {gpsGeoJSON.features.length > 0 && (
            <Source id="gps-source" type="geojson" data={gpsGeoJSON}>
              <Layer
                id="gps-accuracy"
                type="circle"
                paint={{
                  'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    0, 0,
                    10, Math.min(gpsPosition!.accuracy * 0.05, 20),
                    15, Math.min(gpsPosition!.accuracy * 0.5, 60),
                    18, Math.min(gpsPosition!.accuracy * 2, 120),
                    20, Math.min(gpsPosition!.accuracy * 4, 200),
                  ],
                  'circle-color': '#3b82f6',
                  'circle-opacity': 0.15,
                  'circle-stroke-width': 1,
                  'circle-stroke-color': '#3b82f6',
                  'circle-stroke-opacity': 0.4,
                }}
              />
              <Layer
                id="gps-dot"
                type="circle"
                paint={{
                  'circle-radius': 8,
                  'circle-color': '#3b82f6',
                  'circle-stroke-width': 3,
                  'circle-stroke-color': '#ffffff',
                }}
              />
            </Source>
          )}

          {/* Source: destino (pino amarelo) */}
          {destinoGeoJSON.features.length > 0 && (
            <Source id="destino-source" type="geojson" data={destinoGeoJSON}>
              <Layer
                id="destino-circle"
                type="circle"
                paint={{
                  'circle-radius': 10,
                  'circle-color': '#facc15',
                  'circle-stroke-width': 3,
                  'circle-stroke-color': '#a16207',
                }}
              />
              <Layer
                id="destino-label"
                type="symbol"
                layout={{
                  'text-field': ['get', 'nome'],
                  'text-size': 15,
                  'text-anchor': 'top',
                  'text-offset': [0, 0.8],
                  'text-allow-overlap': true,
                  'text-padding': 4,
                  'text-font': ['Open Sans Bold', 'Open Sans Regular'],
                }}
                paint={{
                  'text-color': '#ffffff',
                  'text-halo-color': '#a16207',
                  'text-halo-width': 1,
                }}
              />
            </Source>
          )}
        </Map>

        {/* ==================== Painel de detalhes (pasto/curral) ==================== */}
        {detalheAberto && (
          <div className="absolute top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl z-20 overflow-y-auto">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  {carregandoDetalhe && !detalhePasto && !detalheCurral ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="text-sm text-gray-500">Carregando...</span>
                    </div>
                  ) : detalhePasto ? (
                    <>
                      <h2 className="text-lg font-bold text-gray-900">{detalhePasto.pasto_nome}</h2>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Pasto</span>
                    </>
                  ) : detalheCurral ? (
                    <>
                      <h2 className="text-lg font-bold text-gray-900">{detalheCurral.curral_nome}</h2>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Curral</span>
                    </>
                  ) : null}
                </div>
                <button
                  onClick={fecharDetalhe}
                  className="p-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Detalhes do pasto */}
              {detalhePasto && (
                <div className="space-y-2 text-sm">
                  {detalhePasto.setor && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Setor:</span>
                      <span className="font-medium">{detalhePasto.setor}</span>
                    </div>
                  )}
                  {detalhePasto.tipo && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tipo:</span>
                      <span className="font-medium">{detalhePasto.tipo}</span>
                    </div>
                  )}
                  {detalhePasto.area_total_ha != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Área total:</span>
                      <span className="font-medium">{Number(detalhePasto.area_total_ha).toFixed(1)} ha</span>
                    </div>
                  )}
                  {detalhePasto.area_util_ha != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Área útil:</span>
                      <span className="font-medium">{Number(detalhePasto.area_util_ha).toFixed(1)} ha</span>
                    </div>
                  )}
                  {detalhePasto.especie && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Espécie:</span>
                      <span className="font-medium text-right">{detalhePasto.especie}</span>
                    </div>
                  )}
                  {detalhePasto.metragem_cocho_m != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cocho:</span>
                      <span className="font-medium">{Number(detalhePasto.metragem_cocho_m).toFixed(0)} m</span>
                    </div>
                  )}
                  {detalhePasto.fonte_agua_principal && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Água:</span>
                      <span className="font-medium">{detalhePasto.fonte_agua_principal}</span>
                    </div>
                  )}
                  {detalhePasto.modulo_nome && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Módulo:</span>
                      <span className="font-medium">{detalhePasto.modulo_nome}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Detalhes do curral */}
              {detalheCurral && (
                <div className="space-y-2 text-sm">
                  {detalheCurral.largura_m != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Largura:</span>
                      <span className="font-medium">{Number(detalheCurral.largura_m).toFixed(0)} m</span>
                    </div>
                  )}
                  {detalheCurral.comprimento_m != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Comprimento:</span>
                      <span className="font-medium">{Number(detalheCurral.comprimento_m).toFixed(0)} m</span>
                    </div>
                  )}
                  {detalheCurral.metros_cocho_m != null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cocho:</span>
                      <span className="font-medium">{Number(detalheCurral.metros_cocho_m).toFixed(0)} m</span>
                    </div>
                  )}
                  {detalheCurral.formulacao_nome && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Dieta:</span>
                      <span className="font-medium text-right">{detalheCurral.formulacao_nome}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Lote atual (pasto ou curral) */}
              {detalhePasto?.lote_nome && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Lote Atual</p>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">{detalhePasto.lote_nome}</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-600">
                      <span>Cabeças:</span>
                      <span className="font-medium text-gray-800">{detalhePasto.lote_cabecas}</span>
                      {detalhePasto.lote_raca && (
                        <>
                          <span>Raça:</span>
                          <span className="font-medium text-gray-800">{detalhePasto.lote_raca}</span>
                        </>
                      )}
                      {detalhePasto.lote_sexo && (
                        <>
                          <span>Sexo:</span>
                          <span className="font-medium text-gray-800">{detalhePasto.lote_sexo}</span>
                        </>
                      )}
                      {detalhePasto.lote_peso_medio_kg != null && (
                        <>
                          <span>Peso médio:</span>
                          <span className="font-medium text-gray-800">{Number(detalhePasto.lote_peso_medio_kg).toFixed(0)} kg</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {detalheCurral?.lote_nome && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Lote Atual</p>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">{detalheCurral.lote_nome}</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-gray-600">
                      <span>Cabeças:</span>
                      <span className="font-medium text-gray-800">{detalheCurral.lote_cabecas}</span>
                      {detalheCurral.lote_raca && (
                        <>
                          <span>Raça:</span>
                          <span className="font-medium text-gray-800">{detalheCurral.lote_raca}</span>
                        </>
                      )}
                      {detalheCurral.lote_sexo && (
                        <>
                          <span>Sexo:</span>
                          <span className="font-medium text-gray-800">{detalheCurral.lote_sexo}</span>
                        </>
                      )}
                      {detalheCurral.lote_peso_medio_kg != null && (
                        <>
                          <span>Peso médio:</span>
                          <span className="font-medium text-gray-800">{Number(detalheCurral.lote_peso_medio_kg).toFixed(0)} kg</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Categorias e dietas */}
              {((detalhePasto?.categorias && detalhePasto.categorias.length > 0) ||
                (detalheCurral?.categorias && detalheCurral.categorias.length > 0)) && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Categorias e Dietas</p>
                  <div className="space-y-2">
                    {(detalhePasto?.categorias || detalheCurral?.categorias || []).map((cat, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-2">
                        <div className="flex justify-between items-start">
                          <span className="font-medium text-sm text-gray-800">{cat.categoria?.replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
                          <span className="text-sm text-gray-600">{cat.quant_atual} cab</span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Peso: {cat.peso_vivo_kg ? `${Number(cat.peso_vivo_kg).toFixed(0)} kg` : '—'}</span>
                          <span className={cat.formulacao_nome ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                            {cat.formulacao_nome || 'Sem dieta'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Aviso offline */}
              {!navigator.onLine && carregandoDetalhe && (
                <p className="text-xs text-gray-400 mt-3 text-center">
                  Detalhes completos requerem internet. Conecte-se para ver lote e dietas.
                </p>
              )}

              {/* Botão Ir até aqui */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <button
                  onClick={irAteDetalhe}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  Ir até aqui
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== Botão GPS flutuante ==================== */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
          {gpsPosition && (
            <button
              onClick={centralizarGPS}
              className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center active:bg-gray-100 transition-colors"
              title="Centralizar no GPS"
            >
              <Crosshair className="w-5 h-5 text-blue-600" />
            </button>
          )}
          {gpsStatus !== 'active' && gpsStatus !== 'requesting' && (
            <button
              onClick={iniciarGPS}
              className="w-12 h-12 rounded-full bg-blue-600 shadow-lg flex items-center justify-center active:bg-blue-700 transition-colors"
              title="Ativar GPS"
            >
              <Navigation className="w-5 h-5 text-white" />
            </button>
          )}
          {gpsStatus === 'requesting' && (
            <div className="w-12 h-12 rounded-full bg-blue-600 shadow-lg flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* ==================== Botão "Exibir detalhes" ao clicar em pasto/curral ==================== */}
        {destinoPendente && !detalheAberto && !destino && (
          <div className="absolute bottom-4 left-4 right-20 z-10 bg-white rounded-xl shadow-lg p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${destinoPendente.tipo === 'pasto' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {destinoPendente.tipo === 'pasto' ? 'Pasto' : 'Curral'}
                </span>
                <span className="font-bold text-gray-900 truncate">{destinoPendente.nome}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={abrirDetalhe}
                  className="flex items-center gap-1.5 bg-gray-100 text-gray-700 font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  Exibir detalhes
                </button>
                <button
                  onClick={() => setDestinoPendente(null)}
                  className="p-1 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== Painel de destino + distância ==================== */}
        {destino && (
          <div className="absolute bottom-4 left-4 right-20 z-10 bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${destino.tipo === 'pasto' ? 'bg-green-100 text-green-700' : destino.tipo === 'curral' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'}`}>
                    {destino.tipo === 'pasto' ? 'Pasto' : destino.tipo === 'curral' ? 'Curral' : 'Fábrica'}
                  </span>
                  <h2 className="text-base font-bold text-gray-900 truncate">{destino.nome}</h2>
                </div>
                {distanciaRota !== null && (
                  <p className="text-sm text-gray-600">
                    {gpsPosition ? (
                      <>
                        <span className="font-semibold text-gray-900">
                          {distanciaRota < 1000
                            ? `${Math.round(distanciaRota)} m`
                            : `${(distanciaRota / 1000).toFixed(2)} km`
                        }
                        </span>
                        {' em linha reta'}
                      </>
                    ) : (
                      <span className="text-gray-400">Ative o GPS para calcular a distância</span>
                    )}
                  </p>
                )}
              </div>
              <button
                onClick={limparDestino}
                className="p-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        )}

        {/* ==================== Aviso inicial de GPS ==================== */}
        {gpsStatus === 'idle' && !destino && (
          <div className="absolute bottom-4 left-4 right-4 z-10 bg-white/95 rounded-xl shadow-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Navigation className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-900 mb-1">Ativar localização</h3>
                <p className="text-xs text-gray-600 mb-2">
                  Toque no botão azul para ativar o GPS e ver sua posição no mapa. Você poderá selecionar um pasto ou curral como destino e ver a distância até ele.
                </p>
                {offlineAviso && (
                  <p className="text-xs text-yellow-700 bg-yellow-50 rounded px-2 py-1 mt-2">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    Sem conexão: o satélite não carrega, mas as delimitações e o GPS funcionam normalmente.
                  </p>
                )}
              </div>
              <button
                onClick={iniciarGPS}
                className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg active:bg-blue-700 transition-colors flex-shrink-0"
              >
                Ativar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

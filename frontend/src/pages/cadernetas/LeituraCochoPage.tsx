import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { DatePicker } from '../../components/ui'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import {
  getLoteDetalhesComCategoriasCached,
  getRegistrosSuplementacaoByLoteCached,
  getRegistrosLeituraCochoByLoteCached,
  getUltimoTratoTotalByLoteCached,
  getCurraisCached,
  getLinhasConfinamentoCached,
  getFormulacaoByNomeCached,
  getCachedCadastroData,
  getNotasLeituraCochoConfigCached,
  getLoteByNomeCached,
} from '../../services/cadastroCache'
import { getLotes, getNotasLeituraCochoConfig } from '../../services/supabaseService'
import { calcularCmsPorJanelas, CmsJanelas } from '../../utils/leituraCochoMetrics'
import { ChevronLeft, ChevronRight, Check, ArrowLeft } from 'lucide-react'
interface NotaConfig {
  id: string
  nota: number
  descricao: string | null
  percentual_ajuste: number
}
interface LoteItem {
  id: string
  nome: string
  curral: string
  curralId: string | null
  linhaId: string | null
  dieta: string | null
  teorMsDieta: number | null
  leituraAnterior: number | null
  leituraAnteriorId: string | null
  tratoAnterior: number | null
  nota: string
  notaSalva: boolean
  salvando: boolean
  erroSalvar: boolean
  quantidade: number | null
  pesoVivoKg: number | null
  periodoDias: number | null
  categorias: string
  cms: CmsJanelas
}

interface LinhaItem {
  id: string
  nome: string
  curralNomes: string[]
}

function formatarPercentual(valor: number | null): string {
  if (valor === null || valor === undefined) return '—'
  return `${valor.toFixed(2).replace('.', ',')}%`
}

function formatarNumero(valor: number | null, casas = 2): string {
  if (valor === null || valor === undefined) return '—'
  return valor.toFixed(casas).replace('.', ',')
}

function formatarNumeroMilhar(valor: number | null, casas = 2): string {
  if (valor === null || valor === undefined) return '—'
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })
}

function capitalizarIniciais(texto: string): string {
  return texto
    .toLowerCase()
    .split(' ')
    .map((palavra) => (palavra.length > 0 ? palavra[0].toUpperCase() + palavra.slice(1) : palavra))
    .join(' ')
}

function parseDataBR(data: string): Date | null {
  const [day, month, year] = data.split('/').map(Number)
  if (!day || !month || !year) return null
  return new Date(Date.UTC(year, month - 1, day))
}

function diferencaDias(inicio: Date, fim: Date): number {
  const diff = Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 1
}

export default function LeituraCochoPage() {
  const navigate = useNavigate()
  const { fazendaId, usuario } = useSelector((state: RootState) => state.config)
  const [data, setData] = useState<string>(todayBR())
  const [lotes, setLotes] = useState<LoteItem[]>([])
  const [linhas, setLinhas] = useState<LinhaItem[]>([])
  const [linhaSelecionadaId, setLinhaSelecionadaId] = useState<string | null>(null)
  const [loteSelecionadoId, setLoteSelecionadoId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [totalLotesSemCurral, setTotalLotesSemCurral] = useState(0)
  const [notasConfig, setNotasConfig] = useState<NotaConfig[]>([])
  const listaRef = useRef<HTMLDivElement>(null)
  const inputRefs = useRef<Record<string, HTMLSelectElement | null>>({})

  useEffect(() => {
    async function carregarDadosIniciais() {
      if (!fazendaId) return
      setCarregando(true)
      setErro(null)

      try {
        // Buscar lotes: online usa supabaseService, offline usa cache lazy por nome
        let lotesData: any[] | null = null
        if (navigator.onLine) {
          try {
            lotesData = await getLotes(fazendaId)
          } catch {
            lotesData = null
          }
        }
        if (!lotesData || lotesData.length === 0) {
          // Fallback offline: buscar cada lote pelo nome no cache lazy
          const cache = await getCachedCadastroData()
          if (cache && cache.lotes && cache.lotes.length > 0) {
            const lotesFromCache = await Promise.all(
              cache.lotes.map((nome: string) => getLoteByNomeCached(fazendaId, nome))
            )
            lotesData = lotesFromCache.filter((l: any) => l !== null)
          }
        }

        // Notas de leitura de cocho: usar versão cached
        let notasConfigData: any[] | null = null
        try {
          notasConfigData = await getNotasLeituraCochoConfigCached(fazendaId)
        } catch {
          if (navigator.onLine) {
            try { notasConfigData = await getNotasLeituraCochoConfig(fazendaId) } catch { notasConfigData = null }
          }
        }

        const [curraisData, linhasData] = await Promise.all([
          getCurraisCached(fazendaId),
          getLinhasConfinamentoCached(fazendaId),
        ])

        const notasConfigOrdenadas = (notasConfigData || [])
          .map((n: any) => ({
            id: n.id,
            nota: n.nota,
            descricao: n.descricao,
            percentual_ajuste: Number(n.percentual_ajuste),
          }))
          .sort((a: NotaConfig, b: NotaConfig) => a.nota - b.nota)
        setNotasConfig(notasConfigOrdenadas)

        // Mapa de currais por lote_id (apenas currais com lote_id e linha_id)
        const curraisPorLote = new Map<string, { id: string; nome: string; linhaId: string | null; formulacao_id: string | null }>()
        // Mapa de currais por linha_id (para montar resumo de nomes)
        const curraisPorLinha = new Map<string, string[]>()
        curraisData?.forEach((c: any) => {
          if (!c.id || !c.nome || !c.lote_id) return
          curraisPorLote.set(c.lote_id, {
            id: c.id,
            nome: c.nome,
            linhaId: c.linha_id || null,
            formulacao_id: c.formulacao_id || null,
          })
          if (c.linha_id) {
            const arr = curraisPorLinha.get(c.linha_id) || []
            arr.push(c.nome)
            curraisPorLinha.set(c.linha_id, arr)
          }
        })

        // Monta lista de linhas com resumo dos currais
        const linhasMapeadas: LinhaItem[] = (linhasData || [])
          .map((l: any) => ({
            id: l.id,
            nome: l.nome,
            curralNomes: curraisPorLinha.get(l.id) || [],
          }))
          .filter((l) => l.curralNomes.length > 0)
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        setLinhas(linhasMapeadas)

        if (!lotesData || lotesData.length === 0) {
          setLotes([])
          setCarregando(false)
          return
        }

        const lotesEnriquecidos = await Promise.all(
          lotesData.map(async (lote: any) => {
            const detalhes = await getLoteDetalhesComCategoriasCached(lote.id)
            const [registrosSuplementacao, registrosLeitura, ultimoTrato] = await Promise.all([
              getRegistrosSuplementacaoByLoteCached(fazendaId, lote.id),
              getRegistrosLeituraCochoByLoteCached(fazendaId, lote.id),
              getUltimoTratoTotalByLoteCached(fazendaId, lote.id),
            ])

            const curralInfo = lote.id ? curraisPorLote.get(lote.id) : null
            if (!curralInfo) {
              return null
            }
            const curral = curralInfo.nome || ''

            const supOrdenados = [...(registrosSuplementacao || [])].sort(
              (a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()
            )
            let dieta = supOrdenados[0]?.formulacao || null

            // Se não há suplementação mas há trato de confinamento, busca a formulação do curral
            if (!dieta && curralInfo?.formulacao_id) {
              try {
                const { getFormulacaoById } = await import('../../services/supabaseService')
                const form = await getFormulacaoById(curralInfo.formulacao_id)
                dieta = form?.nome || null
              } catch {
                // ignorar erro
              }
            }

            // Buscar teor_ms_dieta da formulação
            let teorMsDieta: number | null = null
            if (dieta && fazendaId) {
              try {
                const formulacao = await getFormulacaoByNomeCached(fazendaId, dieta)
                teorMsDieta = formulacao?.teor_ms_dieta ? Number(formulacao.teor_ms_dieta) : null
              } catch {
                // ignorar erro, usa fallback
              }
            }

            const leitOrdenados = [...(registrosLeitura || [])].sort(
              (a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()
            )
            const leituraAnterior = leitOrdenados[0]?.leitura_cocho ?? null
            const leituraAnteriorId = leitOrdenados[0]?.nota_config_id ?? null

            // Kg Cocho: prioriza suplementação; se não houver, usa o total do último trato de confinamento
            const tratoAnterior: number | null =
              supOrdenados[0]?.kg_cocho ?? ultimoTrato?.total_kg ?? null

            let periodoDias: number | null = null
            if (supOrdenados.length >= 2) {
              const maisRecente = supOrdenados[0]
              const anterior = supOrdenados[1]
              const dataMaisRecente = parseDataBR(maisRecente.data) || new Date(maisRecente.data)
              const dataAnterior = parseDataBR(anterior.data) || new Date(anterior.data)
              periodoDias = diferencaDias(dataAnterior, dataMaisRecente)
            }

            const categorias =
              typeof detalhes?.categorias === 'string' && detalhes.categorias !== '-'
                ? detalhes.categorias
                : Array.isArray(detalhes?.categorias)
                  ? detalhes.categorias
                      .map((c: any) => (typeof c === 'string' ? c : c.categoria))
                      .filter(Boolean)
                      .join(', ')
                  : ''

            const teorEfetivo = teorMsDieta ?? 70
            const cms = calcularCmsPorJanelas(detalhes || lote, registrosSuplementacao || [], teorEfetivo)

            return {
              id: lote.id,
              nome: lote.nome,
              curral,
              curralId: curralInfo.id,
              linhaId: curralInfo.linhaId,
              dieta,
              teorMsDieta,
              leituraAnterior,
              leituraAnteriorId,
              tratoAnterior,
              nota: '',
              notaSalva: false,
              salvando: false,
              erroSalvar: false,
              quantidade: detalhes?.quant_atual ?? lote.n_cabecas ?? null,
              pesoVivoKg: detalhes?.peso_vivo_kg ?? lote.peso_vivo_kg ?? null,
              periodoDias,
              categorias,
              cms,
            } as LoteItem
          })
        )

        const lotesValidos = lotesEnriquecidos.filter((l): l is LoteItem => l !== null)
        const lotesFiltrados = lotesValidos
          .filter((l) => l.linhaId !== null)
          .sort((a, b) => a.curral.localeCompare(b.curral, 'pt-BR'))

        const semCurral = lotesData.length - lotesValidos.length
        setTotalLotesSemCurral(semCurral > 0 ? semCurral : 0)
        setLotes(lotesFiltrados)
        setLinhaSelecionadaId(null)
        setLoteSelecionadoId(null)
      } catch (error) {
        console.error('Erro ao carregar dados da leitura de cocho:', error)
        setErro('Erro ao carregar dados. Tente novamente.')
      } finally {
        setCarregando(false)
      }
    }

    carregarDadosIniciais()
  }, [fazendaId])

  const lotesDaLinha = useMemo(
    () => lotes.filter((l) => l.linhaId === linhaSelecionadaId),
    [lotes, linhaSelecionadaId]
  )

  const linhaSelecionada = useMemo(
    () => linhas.find((l) => l.id === linhaSelecionadaId) || null,
    [linhas, linhaSelecionadaId]
  )

  const selecionarLinha = useCallback((id: string) => {
    setLinhaSelecionadaId(id)
    const primeiroLote = lotes.find((l) => l.linhaId === id)
    setLoteSelecionadoId(primeiroLote?.id || null)
  }, [lotes])

  const selecionarLote = useCallback((id: string) => {
    setLoteSelecionadoId(id)
    const elemento = document.getElementById(`lote-card-${id}`)
    if (elemento) {
      elemento.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [])

  const navegarLote = useCallback(
    (direcao: 'anterior' | 'proximo') => {
      if (!loteSelecionadoId) return
      const index = lotesDaLinha.findIndex((l) => l.id === loteSelecionadoId)
      if (index === -1) return
      const novoIndex = direcao === 'anterior' ? index - 1 : index + 1
      if (novoIndex >= 0 && novoIndex < lotesDaLinha.length) {
        selecionarLote(lotesDaLinha[novoIndex].id)
        setTimeout(() => {
          inputRefs.current[lotesDaLinha[novoIndex].id]?.focus()
        }, 150)
      }
    },
    [lotesDaLinha, loteSelecionadoId, selecionarLote]
  )

  const atualizarNota = useCallback((id: string, valor: string) => {
    setLotes((prev) =>
      prev.map((l) => (l.id === id ? { ...l, nota: valor, notaSalva: false, erroSalvar: false } : l))
    )
  }, [])

  const salvarNota = useCallback(
    async (id: string, notaConfigIdParam?: string) => {
      const lote = lotes.find((l) => l.id === id)
      if (!lote || !fazendaId) return

      const configId = notaConfigIdParam ?? lote.nota
      const configSelecionada = notasConfig.find((c) => c.id === configId) || null
      const notaNumero = configSelecionada ? configSelecionada.nota : null
      const notaConfigId = configSelecionada ? configSelecionada.id : null

      setLotes((prev) => prev.map((l) => (l.id === id ? { ...l, salvando: true, erroSalvar: false } : l)))

      try {
        const result = await salvarRegistro('leitura-cocho', {
          data: data,
          responsavel: usuario,
          usuario: usuario,
          pastoCurral: lote.curral,
          pastoId: null,
          numeroLote: lote.nome,
          loteId: lote.id,
          leituraCocho: notaNumero !== null ? String(notaNumero) : '',
          notaConfigId: notaConfigId,
        })

        if (!result.success) {
          setLotes((prev) =>
            prev.map((l) => (l.id === id ? { ...l, salvando: false, notaSalva: false, erroSalvar: true } : l))
          )
          return
        }

        setLotes((prev) =>
          prev.map((l) =>
            l.id === id
              ? { ...l, notaSalva: true, salvando: false, erroSalvar: false, leituraAnterior: notaNumero, leituraAnteriorId: notaConfigId }
              : l
          )
        )
      } catch (error) {
        console.error('Erro ao salvar nota:', error)
        setLotes((prev) =>
          prev.map((l) => (l.id === id ? { ...l, salvando: false, notaSalva: false, erroSalvar: true } : l))
        )
      }
    },
    [lotes, fazendaId, data, usuario, notasConfig]
  )

  const handleNotaChange = useCallback(
    (id: string, valor: string) => {
      atualizarNota(id, valor)
    },
    [atualizarNota]
  )

  const [salvandoLinha, setSalvandoLinha] = useState(false)

  const salvarNotasLinha = useCallback(async () => {
    const pendentes = lotesDaLinha.filter((l) => l.nota !== '' && !l.notaSalva && !l.salvando)
    if (pendentes.length === 0) return

    setSalvandoLinha(true)
    setLotes((prev) =>
      prev.map((l) =>
        lotesDaLinha.some((pl) => pl.id === l.id) && l.nota !== '' && !l.notaSalva && !l.salvando
          ? { ...l, salvando: true, erroSalvar: false }
          : l
      )
    )

    await Promise.all(pendentes.map((l) => salvarNota(l.id, l.nota)))
    setSalvandoLinha(false)
  }, [lotesDaLinha, salvarNota])

  const limparNotas = useCallback(() => {
    setLotes((prev) => prev.map((l) => ({ ...l, nota: '', notaSalva: false, erroSalvar: false })))
  }, [])

  const handleNotaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLSelectElement>, _id: string) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        navegarLote('proximo')
      }
    },
    [navegarLote]
  )

  const indiceSelecionado = lotesDaLinha.findIndex((l) => l.id === loteSelecionadoId)

  const notasPendentes = useMemo(
    () => lotesDaLinha.filter((l) => l.nota !== '' && !l.notaSalva && !l.salvando).length,
    [lotesDaLinha]
  )

  return (
    <CadernetaLayout
      title="Leitura de Cocho"
      cadernetaId="leitura-cocho"
      onBack={() => navigate('/')}
    >
      {/* Seção 1: Dados Principais */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="section-title">1. DADOS PRINCIPAIS</h2>
          <div className="flex items-center gap-2 shrink-0">
            {usuario && (
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 font-semibold bg-gray-100 rounded-full px-3 py-1 whitespace-nowrap">
                <span>👤</span>
                <span>{usuario}</span>
              </span>
            )}
            <DatePicker value={data} onChange={setData} compact inline />
          </div>
        </div>
      </div>

      {/* Seção 2: Linhas / Currais */}
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Cabeçalho fixo da seção */}
        <div className="px-4 py-3 bg-[#1a3a2a] text-white">
          <div className="mb-2">
            <h2 className="text-lg font-black tracking-tight">2. LEITURA DE COCHO</h2>
            {linhaSelecionada ? (
              <p className="text-xl font-bold text-yellow-400 truncate">
                {linhaSelecionada.nome}
              </p>
            ) : (
              <p className="text-sm text-white/70">Selecione uma linha</p>
            )}
          </div>
          {linhaSelecionada && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navegarLote('anterior')}
                disabled={indiceSelecionado === 0}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white/10 active:bg-white/20 disabled:opacity-30 transition-colors text-sm font-bold"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <button
                type="button"
                onClick={() => navegarLote('proximo')}
                disabled={indiceSelecionado === lotesDaLinha.length - 1}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white/10 active:bg-white/20 disabled:opacity-30 transition-colors text-sm font-bold"
              >
                Próximo
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setLinhaSelecionadaId(null)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white/10 active:bg-white/20 transition-colors text-sm font-bold ml-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                Trocar linha
              </button>
            </div>
          )}
        </div>

        <div className="p-6 flex flex-col gap-4">
          {!linhaSelecionada ? (
            <>
              <p className="text-sm text-gray-500">
                Toque em uma linha para ver os currais e lançar as notas.
              </p>
              {totalLotesSemCurral > 0 && (
                <p className="text-xs text-gray-400 italic">
                  {totalLotesSemCurral} lote(s) sem curral associado não aparecem na lista.
                </p>
              )}

              <div ref={listaRef} className="flex flex-col gap-2 max-h-[45vh] overflow-y-auto -mx-1 px-1 pb-1">
                {carregando ? (
                  <div className="p-8 text-center text-gray-500">Carregando linhas...</div>
                ) : erro ? (
                  <div className="p-8 text-center text-red-600">{erro}</div>
                ) : linhas.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    Nenhuma linha de confinamento encontrada.
                  </div>
                ) : (
                  linhas.map((linha) => {
                    const lotesDaLinhaCount = lotes.filter((l) => l.linhaId === linha.id).length
                    return (
                      <div
                        key={linha.id}
                        onClick={() => selecionarLinha(linha.id)}
                        className="rounded-2xl border-2 border-gray-200 bg-white hover:border-yellow-500 hover:bg-yellow-50 p-4 cursor-pointer transition-all"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-base font-bold text-[#1a3a2a] truncate">
                            {linha.nome}
                          </span>
                          <span className="text-xs font-semibold text-gray-500 shrink-0">
                            {lotesDaLinhaCount === 1 ? '1 curral' : `${lotesDaLinhaCount} currais`}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {linha.curralNomes.length > 0
                            ? linha.curralNomes.join(' · ')
                            : 'Sem currais'}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500">
                Toque em um curral para carregar os dados e lançar a nota.
              </p>

              <div ref={listaRef} className="flex flex-col gap-2 max-h-[45vh] overflow-y-auto -mx-1 px-1 pb-1">
                {carregando ? (
                  <div className="p-8 text-center text-gray-500">Carregando currais...</div>
                ) : erro ? (
                  <div className="p-8 text-center text-red-600">{erro}</div>
                ) : lotesDaLinha.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    Nenhum curral com lote associado nesta linha.
                  </div>
                ) : (
                  lotesDaLinha.map((lote) => {
                    const selecionado = lote.id === loteSelecionadoId
                    return (
                      <div
                        key={lote.id}
                        id={`lote-card-${lote.id}`}
                        onClick={() => selecionarLote(lote.id)}
                        className={`rounded-2xl border-2 p-3 cursor-pointer transition-all ${
                          selecionado
                            ? 'border-yellow-500 bg-yellow-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        {/* Linha 1: Curral | Lote + Dieta */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="min-w-0 flex-1">
                            <span className="text-base font-bold text-gray-900 truncate">
                              {lote.curral || '—'}
                            </span>
                            <span className="text-xs text-gray-500 truncate block">
                              {lote.dieta || '—'}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-base font-bold text-[#1a3a2a]">{lote.nome}</span>
                          </div>
                        </div>

                        {/* Linha 2: Cab | PV | Período | Categorias (inline compacto) */}
                        <div className="text-sm text-gray-700 mb-2 truncate">
                          <span className="font-bold text-gray-500">Cab: </span>
                          <span className="font-bold text-gray-900 mr-2">{lote.quantidade ?? '—'}</span>
                          <span className="font-bold text-gray-500">PV: </span>
                          <span className="font-bold text-gray-900 mr-2">{formatarNumero(lote.pesoVivoKg, 2)} kg</span>
                          <span className="font-bold text-gray-500">Per: </span>
                          <span className="font-bold text-gray-900 mr-2">{lote.periodoDias ?? '—'} d</span>
                          {lote.categorias && (
                            <>
                              <span className="font-bold text-gray-500">Cat: </span>
                              <span className="font-bold text-gray-900">
                                {lote.categorias
                                  .split(',')
                                  .map((c) => c.trim())
                                  .filter(Boolean)
                                  .map((c) => capitalizarIniciais(c))
                                  .join(', ')}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Linha 3: Leitura anterior | Kg Cocho | Nota */}
                        <div className="flex items-end justify-between gap-3 border-t border-gray-100 pt-2">
                          <div className="flex items-end gap-4">
                            <div>
                              <span className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider block">
                                Leitura
                              </span>
                              <span className="text-base font-bold text-gray-900">
                                {lote.leituraAnterior !== null ? lote.leituraAnterior : '—'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider block">
                                Kg Cocho
                              </span>
                              <span className="text-base font-bold text-gray-900">
                                {formatarNumeroMilhar(lote.tratoAnterior)}
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0 flex flex-col items-center">
                            <span className="text-[0.65rem] font-bold text-yellow-600 uppercase tracking-wider block mb-1">
                              Nota
                            </span>
                            <div className="relative">
                              <select
                                ref={(el) => (inputRefs.current[lote.id] = el)}
                                value={lote.nota}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => handleNotaChange(lote.id, e.target.value)}
                                onKeyDown={(e) => handleNotaKeyDown(e, lote.id)}
                                className={`w-20 h-12 text-center text-xl font-bold border-2 rounded-xl focus:outline-none transition-colors appearance-none cursor-pointer ${
                                  lote.erroSalvar
                                    ? 'border-red-500 bg-red-50 text-red-700'
                                    : lote.notaSalva
                                      ? 'border-green-500 bg-green-50 text-green-700'
                                      : 'border-yellow-500 bg-white text-gray-900 focus:border-yellow-600'
                                }`}
                              >
                                <option value="">—</option>
                                {notasConfig.map((config) => (
                                  <option key={config.id} value={config.id}>
                                    {config.nota}
                                  </option>
                                ))}
                              </select>
                              {lote.salvando && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                              )}
                              {lote.notaSalva && !lote.salvando && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </span>
                              )}
                              {lote.erroSalvar && !lote.salvando && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">!</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Descrição da nota selecionada */}
                        {(() => {
                          if (!lote.nota) return null
                          const config = notasConfig.find((c) => c.id === lote.nota)
                          if (!config?.descricao) return null
                          return (
                            <div className="mt-2 rounded-lg bg-gray-50 border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 font-medium leading-snug">
                              {config.descricao}
                            </div>
                          )
                        })()}

                        {/* Linha 6: CMS (% PV) inline compacto */}
                        <div className="border-t border-gray-100 pt-2 mt-2">
                          <div className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                            CMS (% PV)
                          </div>
                          <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm">
                            <span>
                              <span className="text-gray-500">1d: </span>
                              <span className="font-bold text-[#1a3a2a]">{formatarPercentual(lote.cms.ontem)}</span>
                            </span>
                            <span>
                              <span className="text-gray-500">2d: </span>
                              <span className="font-bold text-[#1a3a2a]">{formatarPercentual(lote.cms.anteontem)}</span>
                            </span>
                            <span>
                              <span className="text-gray-500">3d: </span>
                              <span className="font-bold text-[#1a3a2a]">{formatarPercentual(lote.cms.tresDiasAtras)}</span>
                            </span>
                            <span>
                              <span className="text-gray-500">10d: </span>
                              <span className="font-bold text-[#1a3a2a]">{formatarPercentual(lote.cms.dezDias)}</span>
                            </span>
                            <span>
                              <span className="text-gray-500">Geral: </span>
                              <span className="font-bold text-[#1a3a2a]">{formatarPercentual(lote.cms.geral)}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {linhaSelecionada && (
        <div className="flex flex-col gap-3 desktop-form-container">
          <button
            onClick={salvarNotasLinha}
            disabled={salvandoLinha || notasPendentes === 0}
            className={`font-bold text-base px-6 py-3 rounded-2xl border-2 transition-colors active:scale-95 ${
              salvandoLinha
                ? 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed'
                : notasPendentes === 0
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-[#1a3a2a] text-white border-[#1a3a2a] hover:bg-[#245038]'
            }`}
          >
            {salvandoLinha
              ? 'SALVANDO...'
              : notasPendentes > 0
                ? `SALVAR NOTAS (${notasPendentes})`
                : 'SALVAR NOTAS'}
          </button>
          <button
            onClick={limparNotas}
            className="bg-gray-200 text-gray-700 font-bold text-base px-6 py-3 rounded-2xl border-2 border-gray-300 hover:bg-gray-300 transition-colors active:scale-95"
          >
            🧹 LIMPAR NOTAS
          </button>
        </div>
      )}
    </CadernetaLayout>
  )
}

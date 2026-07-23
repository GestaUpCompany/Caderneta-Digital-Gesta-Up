import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, SearchableModal } from '../../components/ui'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import {
  getCachedCadastroData,
  getLoteDetalhesComCategoriasCached,
  getRegistrosSuplementacaoByLoteCached,
  getRegistrosLeituraCochoByLoteCached,
  getCurraisCached,
  getLinhasConfinamentoCached,
} from '../../services/cadastroCache'
import { getLotes, getFuncionarios } from '../../services/supabaseService'
import { calcularCmsPorJanelas, CmsJanelas } from '../../utils/leituraCochoMetrics'
import { ChevronLeft, ChevronRight, Check, ArrowLeft } from 'lucide-react'

interface LoteItem {
  id: string
  nome: string
  curral: string
  curralId: string | null
  linhaId: string | null
  dieta: string | null
  leituraAnterior: number | null
  tratoAnterior: number | null
  nota: string
  notaSalva: boolean
  salvando: boolean
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
  const [responsavel, setResponsavel] = useState<string>(usuario || '')
  const [responsaveis, setResponsaveis] = useState<string[]>([])
  const [carregandoResponsaveis, setCarregandoResponsaveis] = useState(false)
  const [lotes, setLotes] = useState<LoteItem[]>([])
  const [linhas, setLinhas] = useState<LinhaItem[]>([])
  const [linhaSelecionadaId, setLinhaSelecionadaId] = useState<string | null>(null)
  const [loteSelecionadoId, setLoteSelecionadoId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const listaRef = useRef<HTMLDivElement>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    async function carregarDadosIniciais() {
      if (!fazendaId) return
      setCarregando(true)
      setErro(null)

      try {
        setCarregandoResponsaveis(true)
        const cache = await getCachedCadastroData()
        if (cache?.funcionarios?.length) {
          setResponsaveis(cache.funcionarios)
        }

        const [lotesData, funcionariosData, curraisData, linhasData] = await Promise.all([
          getLotes(fazendaId),
          getFuncionarios(fazendaId),
          getCurraisCached(fazendaId),
          getLinhasConfinamentoCached(fazendaId),
        ])

        const funcionariosNomes = funcionariosData?.map((f: any) => f.nome) || []
        setResponsaveis(funcionariosNomes)
        setCarregandoResponsaveis(false)

        // Mapa de currais por lote_id (apenas currais com lote_id e linha_id)
        const curraisPorLote = new Map<string, { id: string; nome: string; linhaId: string | null }>()
        // Mapa de currais por linha_id (para montar resumo de nomes)
        const curraisPorLinha = new Map<string, string[]>()
        curraisData?.forEach((c: any) => {
          if (!c.id || !c.nome || !c.lote_id) return
          curraisPorLote.set(c.lote_id, {
            id: c.id,
            nome: c.nome,
            linhaId: c.linha_id || null,
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
            const [registrosSuplementacao, registrosLeitura] = await Promise.all([
              getRegistrosSuplementacaoByLoteCached(fazendaId, lote.id),
              getRegistrosLeituraCochoByLoteCached(fazendaId, lote.id),
            ])

            const curralInfo = lote.id ? curraisPorLote.get(lote.id) : null
            if (!curralInfo) {
              return null
            }
            const curral = curralInfo.nome || ''

            const supOrdenados = [...(registrosSuplementacao || [])].sort(
              (a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()
            )
            const dieta = supOrdenados[0]?.formulacao || null

            const leitOrdenados = [...(registrosLeitura || [])].sort(
              (a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()
            )
            const leituraAnterior = leitOrdenados[0]?.leitura_cocho ?? null

            const tratoAnterior: number | null = supOrdenados[0]?.kg_cocho ?? null

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

            const cms = calcularCmsPorJanelas(detalhes || lote, registrosSuplementacao || [], 70)

            return {
              id: lote.id,
              nome: lote.nome,
              curral,
              curralId: curralInfo.id,
              linhaId: curralInfo.linhaId,
              dieta,
              leituraAnterior,
              tratoAnterior,
              nota: '',
              notaSalva: false,
              salvando: false,
              quantidade: detalhes?.quant_atual ?? lote.n_cabecas ?? null,
              pesoVivoKg: detalhes?.peso_vivo_kg ?? lote.peso_vivo_kg ?? null,
              periodoDias,
              categorias,
              cms,
            } as LoteItem
          })
        )

        const lotesFiltrados = lotesEnriquecidos
          .filter((l): l is LoteItem => l !== null && l.linhaId !== null)
          .sort((a, b) => a.curral.localeCompare(b.curral, 'pt-BR'))

        setLotes(lotesFiltrados)
        setLinhaSelecionadaId(null)
        setLoteSelecionadoId(null)
      } catch (error) {
        console.error('Erro ao carregar dados da leitura de cocho:', error)
        setErro('Erro ao carregar dados. Tente novamente.')
      } finally {
        setCarregando(false)
        setCarregandoResponsaveis(false)
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
    // Permite apenas números e sinal de negativo
    const valorFiltrado = valor.replace(/[^\d-]/g, '')
    // Evita múltiplos sinais de negativo
    const valorLimpo = valorFiltrado.startsWith('-')
      ? '-' + valorFiltrado.slice(1).replace(/-/g, '')
      : valorFiltrado.replace(/-/g, '')
    setLotes((prev) =>
      prev.map((l) => (l.id === id ? { ...l, nota: valorLimpo, notaSalva: false } : l))
    )
  }, [])

  const salvarNota = useCallback(
    async (id: string) => {
      const lote = lotes.find((l) => l.id === id)
      if (!lote || !fazendaId) return

      const notaNumero = lote.nota === '' || lote.nota === '-' ? null : Number(lote.nota)
      if (lote.nota !== '' && lote.nota !== '-' && isNaN(notaNumero as number)) return

      setLotes((prev) => prev.map((l) => (l.id === id ? { ...l, salvando: true } : l)))

      try {
        await salvarRegistro('leitura-cocho', {
          data: `${data} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          responsavel,
          pastoCurral: lote.curral,
          pastoId: null,
          numeroLote: lote.nome,
          loteId: lote.id,
          leituraCocho: notaNumero !== null ? String(notaNumero) : '',
          observacao: '',
        })

        setLotes((prev) =>
          prev.map((l) =>
            l.id === id
              ? { ...l, notaSalva: true, salvando: false, leituraAnterior: notaNumero }
              : l
          )
        )
      } catch (error) {
        console.error('Erro ao salvar nota:', error)
        setLotes((prev) =>
          prev.map((l) => (l.id === id ? { ...l, salvando: false, notaSalva: false } : l))
        )
      }
    },
    [lotes, fazendaId, data, responsavel]
  )

  const handleNotaBlur = useCallback(
    (id: string) => {
      const lote = lotes.find((l) => l.id === id)
      if (lote && lote.nota !== '' && lote.nota !== '-' && !lote.notaSalva) {
        salvarNota(id)
      }
    },
    [lotes, salvarNota]
  )

  const handleNotaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const lote = lotes.find((l) => l.id === id)
        if (lote && lote.nota !== '' && lote.nota !== '-') {
          salvarNota(id).then(() => navegarLote('proximo'))
        } else {
          navegarLote('proximo')
        }
      }
    },
    [lotes, salvarNota, navegarLote]
  )

  const indiceSelecionado = lotesDaLinha.findIndex((l) => l.id === loteSelecionadoId)

  return (
    <CadernetaLayout
      title="Leitura de Cocho"
      cadernetaId="leitura-cocho"
      onBack={() => navigate('/')}
    >
      {/* Seção 1: Dados Principais */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">
          1. DADOS PRINCIPAIS <span className="text-red-500">*</span>
        </h2>
        <DatePicker label="DATA" value={data} onChange={setData} />
        {responsaveis.length > 0 ? (
          <SearchableModal
            label="RESPONSÁVEL"
            value={responsavel}
            onChange={setResponsavel}
            options={responsaveis}
            placeholder="Buscar funcionário..."
            disabled={carregandoResponsaveis}
            id="responsavel"
            name="responsavel"
          />
        ) : (
          <Input
            label="RESPONSÁVEL"
            placeholder={carregandoResponsaveis ? 'Carregando funcionários...' : 'Nome do responsável'}
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
          />
        )}
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
            <div className="flex items-center gap-2">
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
                              <input
                                ref={(el) => (inputRefs.current[lote.id] = el)}
                                type="tel"
                                inputMode="numeric"
                                value={lote.nota}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => atualizarNota(lote.id, e.target.value)}
                                onBlur={() => handleNotaBlur(lote.id)}
                                onKeyDown={(e) => handleNotaKeyDown(e, lote.id)}
                                placeholder=""
                                className={`w-16 h-12 text-center text-xl font-bold border-2 rounded-xl focus:outline-none transition-colors ${
                                  lote.notaSalva
                                    ? 'border-green-500 bg-green-50 text-green-700'
                                    : 'border-yellow-500 bg-white text-gray-900 focus:border-yellow-600'
                                }`}
                              />
                              {lote.salvando && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                              )}
                              {lote.notaSalva && !lote.salvando && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

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
    </CadernetaLayout>
  )
}

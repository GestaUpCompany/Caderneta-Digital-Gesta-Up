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
  getCurraisCached,
  getRegistrosLeituraCochoByLoteCached,
  getProgramacaoTratosCompletaCached,
  getTiposProgramacaoTratosCached,
  getRegistrosOfertaTratoByFazendaDataCached,
  getRegistrosOfertaTratoAnterioresCached,
} from '../../services/cadastroCache'
import {
  getLotes,
  getNotasLeituraCochoConfig,
} from '../../services/supabaseService'
import { Check } from 'lucide-react'

interface NotaConfig {
  id: string
  nota: number
  descricao: string | null
  percentual_ajuste: number
}

interface CurralTrato {
  curralId: string
  curralNome: string
  loteId: string | null
  loteNome: string | null
  formulacaoNome: string | null
  quantidadeTratos: number
  ordemTrato: number // próximo trato a ser feito (count + 1)
  percentualTrato: number // percentual do trato atual
  kgPlanejado: number | null
  kgReal: string
  leituraCochoNota: number | null
  leituraPercentualAjuste: number | null
  totalRealDiaAnterior: number | null
  kgBaseDia: number | null
  isDia1: boolean
  tratosConcluidos: boolean
  // estado de UI
  salvo: boolean
  salvando: boolean
  erroSalvar: boolean
  // dados de exibição do lote
  nCabecas: number | null
  pesoVivoKg: number | null
  categorias: string
}

interface ProgramacaoData {
  programacaoId: string | null
  quantidadeTratos: number
  percentuais: { ordem_trato: number; percentual: number; horario_sugerido: string | null }[]
  kgMnDiaPorCurral: Map<string, number>
  curraisIdsDaProgramacao: Set<string>
}

function formatarKg(valor: number | null, casas = 1): string {
  if (valor === null || valor === undefined || !isFinite(valor)) return '—'
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

/**
 * Converte data BR (DD/MM/AAAA) para YYYY-MM-DD (formato date do Supabase).
 */
function brToDateISO(dataBR: string): string {
  const [day, month, year] = dataBR.split(' ')[0].split('/').map(Number)
  if (!day || !month || !year) return ''
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const TIPOS_PROGRAMACAO = [
  { value: 'engorda', label: 'Engorda' },
  { value: 'sequestro', label: 'Sequestro' },
]

export default function TratoConfinamentoPage() {
  const navigate = useNavigate()
  const { fazendaId, usuario } = useSelector((state: RootState) => state.config)
  const [data, setData] = useState<string>(todayBR())
  const [currais, setCurrais] = useState<CurralTrato[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [notasConfig, setNotasConfig] = useState<NotaConfig[]>([])
  const [tiposDisponiveis, setTiposDisponiveis] = useState<string[]>([])
  const [tipoSelecionado, setTipoSelecionado] = useState<string>('engorda')
  const [programacao, setProgramacao] = useState<ProgramacaoData | null>(null)
  const [salvandoLote, setSalvandoLote] = useState(false)
  const listaRef = useRef<HTMLDivElement>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Carregamento inicial: notas config e tipos disponíveis
  useEffect(() => {
    async function carregarInicial() {
      if (!fazendaId) return
      try {
        const [notasData, tiposData] = await Promise.all([
          getNotasLeituraCochoConfig(fazendaId),
          getTiposProgramacaoTratosCached(fazendaId),
        ])
        const notasOrdenadas = (notasData || [])
          .map((n: any) => ({
            id: n.id,
            nota: n.nota,
            descricao: n.descricao,
            percentual_ajuste: Number(n.percentual_ajuste),
          }))
          .sort((a: NotaConfig, b: NotaConfig) => a.nota - b.nota)
        setNotasConfig(notasOrdenadas)

        const tipos = (tiposData || []).filter((t: string) =>
          TIPOS_PROGRAMACAO.some((tp) => tp.value === t)
        )
        setTiposDisponiveis(tipos.length > 0 ? tipos : ['engorda'])
        if (tipos.length > 0 && !tipos.includes('engorda')) {
          setTipoSelecionado(tipos[0])
        }
      } catch (error) {
        console.error('Erro ao carregar dados iniciais do trato:', error)
        setErro('Erro ao carregar configuração. Tente novamente.')
      }
    }
    carregarInicial()
  }, [fazendaId])

  // Carregamento principal: currais + programação + registros do dia
  const carregarDados = useCallback(async () => {
    if (!fazendaId || !tipoSelecionado) return
    setCarregando(true)
    setErro(null)

    try {
      const dataISO = brToDateISO(data)
      if (!dataISO) {
        setErro('Data inválida.')
        setCarregando(false)
        return
      }

      const [progCompleta, curraisData, lotesData, registrosDoDia] = await Promise.all([
        getProgramacaoTratosCompletaCached(fazendaId, tipoSelecionado),
        getCurraisCached(fazendaId),
        getLotes(fazendaId),
        getRegistrosOfertaTratoByFazendaDataCached(fazendaId, dataISO),
      ])

      // Se não há programação ativa para o tipo, mostra mensagem
      if (!progCompleta.programacao) {
        setProgramacao(null)
        setCurrais([])
        setCarregando(false)
        return
      }

      // Monta estrutura da programação
      const kgMnDiaPorCurral = new Map<string, number>()
      const curraisIdsDaProgramacao = new Set<string>()
      for (const c of progCompleta.currais) {
        kgMnDiaPorCurral.set(c.curral_id, Number(c.kg_mn_dia) || 0)
        curraisIdsDaProgramacao.add(c.curral_id)
      }

      const progData: ProgramacaoData = {
        programacaoId: progCompleta.programacao.id,
        quantidadeTratos: progCompleta.programacao.quantidade_tratos,
        percentuais: progCompleta.percentuais.map((p: any) => ({
          ordem_trato: p.ordem_trato,
          percentual: Number(p.percentual),
          horario_sugerido: p.horario_sugerido,
        })),
        kgMnDiaPorCurral,
        curraisIdsDaProgramacao,
      }
      setProgramacao(progData)

      // Mapa de lotes por id
      const lotesPorId = new Map<string, any>()
      for (const l of lotesData || []) {
        lotesPorId.set(l.id, l)
      }

      // Mapa de currais por id (apenas currais ativos com lote)
      const curraisPorId = new Map<string, any>()
      for (const c of curraisData || []) {
        if (c.id && c.lote_id) {
          curraisPorId.set(c.id, c)
        }
      }

      // Agrupa registros do dia por curral_id
      const registrosPorCurral = new Map<string, any[]>()
      for (const r of registrosDoDia) {
        const arr = registrosPorCurral.get(r.curral_id) || []
        arr.push(r)
        registrosPorCurral.set(r.curral_id, arr)
      }

      // Para cada curral da programação, monta o CurralTrato
      const curraisTratoList: CurralTrato[] = await Promise.all(
        Array.from(curraisIdsDaProgramacao).map(async (curralId) => {
          const curralInfo = curraisPorId.get(curralId)
          const curralNome = curralInfo?.nome || curralId
          const loteId = curralInfo?.lote_id || null
          const lote = loteId ? lotesPorId.get(loteId) : null
          const loteNome = lote?.nome || null

          // Busca detalhes do lote (categorias, cabecas, peso)
          let nCabecas: number | null = null
          let pesoVivoKg: number | null = null
          let categorias = ''
          let formulacaoNome: string | null = null
          if (loteId) {
            try {
              const detalhes = await getLoteDetalhesComCategoriasCached(loteId)
              nCabecas = detalhes?.quant_atual ?? lote?.n_cabecas ?? null
              pesoVivoKg = detalhes?.peso_vivo_kg ?? lote?.peso_vivo_kg ?? null
              categorias =
                typeof detalhes?.categorias === 'string' && detalhes.categorias !== '-'
                  ? detalhes.categorias
                  : Array.isArray(detalhes?.categorias)
                    ? detalhes.categorias
                        .map((c: any) => (typeof c === 'string' ? c : c.categoria))
                        .filter(Boolean)
                        .join(', ')
                    : ''
            } catch {
              // ignorar erro, usa defaults
            }
          }

          // Busca a formulação vigente do lote (última suplementação ou formulação do curral)
          if (loteId) {
            try {
              if (curralInfo?.formulacao_id) {
                // Buscar nome da formulação por id
                const { getFormulacaoById } = await import('../../services/supabaseService')
                const form = await getFormulacaoById(curralInfo.formulacao_id)
                formulacaoNome = form?.nome || null
              }
            } catch {
              // ignorar erro
            }
          }

          // Fallback: se não achou formulação por id, tenta por nome via última suplementação
          if (!formulacaoNome && loteId) {
            try {
              const { getRegistrosSuplementacaoByLoteCached } = await import(
                '../../services/cadastroCache'
              )
              const supRegs = await getRegistrosSuplementacaoByLoteCached(fazendaId, loteId)
              const supOrdenados = [...(supRegs || [])].sort(
                (a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()
              )
              formulacaoNome = supOrdenados[0]?.formulacao || null
            } catch {
              // ignorar erro
            }
          }

          // Conta tratos já registrados no dia para este curral
          const tratosDoDia = registrosPorCurral.get(curralId) || []
          const tratosFeitos = tratosDoDia.filter((t) => t.kg_ofertado_real !== null).length
          const ordemTrato = tratosFeitos + 1
          const quantidadeTratos = progData.quantidadeTratos
          const tratosConcluidos = ordemTrato > quantidadeTratos

          // Percentual do trato atual
          const percentualTrato = progData.percentuais.find(
            (p) => p.ordem_trato === ordemTrato
          )?.percentual ?? 0

          // Verifica se é dia 1 (não há tratos em datas anteriores)
          const registrosAnteriores = await getRegistrosOfertaTratoAnterioresCached(
            fazendaId,
            curralId,
            dataISO
          )
          const isDia1 = registrosAnteriores.length === 0

          // Busca a última leitura de cocho do lote para pegar nota e percentual_ajuste
          let leituraCochoNota: number | null = null
          let leituraPercentualAjuste: number | null = null
          if (loteId) {
            try {
              const leituras = await getRegistrosLeituraCochoByLoteCached(fazendaId, loteId)
              const leitOrdenadas = [...(leituras || [])].sort(
                (a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()
              )
              const ultimaLeitura = leitOrdenadas[0]
              if (ultimaLeitura) {
                leituraCochoNota = ultimaLeitura.leitura_cocho ?? null
                // Busca o percentual_ajuste da nota config
                if (ultimaLeitura.nota_config_id) {
                  const config = notasConfig.find((n) => n.id === ultimaLeitura.nota_config_id)
                  if (config) {
                    leituraPercentualAjuste = config.percentual_ajuste
                  }
                }
                // Fallback: se não tem nota_config_id, busca por nota número
                if (leituraPercentualAjuste === null && leituraCochoNota !== null) {
                  const config = notasConfig.find((n) => n.nota === leituraCochoNota)
                  if (config) {
                    leituraPercentualAjuste = config.percentual_ajuste
                  }
                }
              }
            } catch {
              // ignorar erro
            }
          }

          // Calcula total real do dia anterior
          let totalRealDiaAnterior: number | null = null
          if (!isDia1 && registrosAnteriores.length > 0) {
            // O dia anterior é a data mais recente entre os registros anteriores
            const dataAnteriorMaisRecente = registrosAnteriores[0].data
            const tratosDiaAnterior = registrosAnteriores.filter(
              (r: any) => r.data === dataAnteriorMaisRecente
            )
            totalRealDiaAnterior = tratosDiaAnterior.reduce(
              (sum: number, r: any) => sum + (Number(r.kg_ofertado_real) || 0),
              0
            )
          }

          // Calcula kg_planejado e kg_base_dia
          let kgBaseDia: number | null = null
          let kgPlanejado: number | null = null
          const kgMnDia = kgMnDiaPorCurral.get(curralId) || 0

          if (isDia1) {
            // Dia 1: usa kg_mn_dia da programação
            kgBaseDia = kgMnDia
            kgPlanejado = kgMnDia * (percentualTrato / 100)
          } else if (totalRealDiaAnterior !== null && totalRealDiaAnterior > 0) {
            // Dia 2+: total real dia anterior * (1 + percentual_ajuste / 100)
            const fatorAjuste = leituraPercentualAjuste !== null ? 1 + leituraPercentualAjuste / 100 : 1
            kgBaseDia = totalRealDiaAnterior * fatorAjuste
            kgPlanejado = kgBaseDia * (percentualTrato / 100)
          }

          // Verifica se já existe um registro para este trato do dia (permite editar)
          const registroExistente = tratosDoDia.find((t) => t.ordem_trato === ordemTrato)
          const kgRealInicial = registroExistente?.kg_ofertado_real != null
            ? String(registroExistente.kg_ofertado_real)
            : ''

          return {
            curralId,
            curralNome,
            loteId,
            loteNome,
            formulacaoNome,
            quantidadeTratos,
            ordemTrato,
            percentualTrato,
            kgPlanejado,
            kgReal: kgRealInicial,
            leituraCochoNota,
            leituraPercentualAjuste,
            totalRealDiaAnterior,
            kgBaseDia,
            isDia1,
            tratosConcluidos,
            salvo: registroExistente?.kg_ofertado_real != null,
            salvando: false,
            erroSalvar: false,
            nCabecas,
            pesoVivoKg,
            categorias,
          } as CurralTrato
        })
      )

      // Ordena por nome do curral
      curraisTratoList.sort((a, b) => a.curralNome.localeCompare(b.curralNome, 'pt-BR'))
      setCurrais(curraisTratoList)
    } catch (error) {
      console.error('Erro ao carregar dados do trato:', error)
      setErro('Erro ao carregar dados. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }, [fazendaId, data, tipoSelecionado, notasConfig])

  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Focar no primeiro input após carregar (apenas na transição de carregando -> pronto)
  const carregandoRef = useRef(true)
  useEffect(() => {
    // Só foca quando termina o carregamento (carregando vai de true -> false)
    if (carregandoRef.current && !carregando && currais.length > 0 && !currais[0].tratosConcluidos) {
      const primeiro = currais[0]
      setTimeout(() => {
        inputRefs.current[primeiro.curralId]?.focus()
      }, 200)
    }
    carregandoRef.current = carregando
  }, [carregando, currais])

  const atualizarKgReal = useCallback((curralId: string, valor: string) => {
    setCurrais((prev) =>
      prev.map((c) =>
        c.curralId === curralId ? { ...c, kgReal: valor, salvo: false, erroSalvar: false } : c
      )
    )
  }, [])

  const salvarTrato = useCallback(
    async (curralId: string) => {
      const curral = currais.find((c) => c.curralId === curralId)
      if (!curral || !fazendaId) return
      if (curral.kgReal === '' || curral.tratosConcluidos) return

      setCurrais((prev) =>
        prev.map((c) => (c.curralId === curralId ? { ...c, salvando: true, erroSalvar: false } : c))
      )

      try {
        const result = await salvarRegistro('trato-confinamento', {
          data: data,
          responsavel: usuario,
          usuario: usuario,
          curral: curral.curralNome,
          curralId: curral.curralId,
          numeroLote: curral.loteNome || '',
          loteId: curral.loteId || '',
          ordemTrato: String(curral.ordemTrato),
          kgPlanejado: curral.kgPlanejado !== null ? String(curral.kgPlanejado) : '',
          kgReal: curral.kgReal,
          leituraCochoNota: curral.leituraCochoNota !== null ? String(curral.leituraCochoNota) : '',
          programacaoId: programacao?.programacaoId || '',
        })

        if (!result.success) {
          setCurrais((prev) =>
            prev.map((c) =>
              c.curralId === curralId ? { ...c, salvando: false, salvo: false, erroSalvar: true } : c
            )
          )
          return
        }

        setCurrais((prev) =>
          prev.map((c) =>
            c.curralId === curralId ? { ...c, salvando: false, salvo: true, erroSalvar: false } : c
          )
        )
      } catch (error) {
        console.error('Erro ao salvar trato:', error)
        setCurrais((prev) =>
          prev.map((c) =>
            c.curralId === curralId ? { ...c, salvando: false, salvo: false, erroSalvar: true } : c
          )
        )
      }
    },
    [currais, fazendaId, data, usuario, programacao]
  )

  const handleKgRealKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, curralId: string) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        // Salva o trato atual e avança para o próximo
        salvarTrato(curralId)
        const index = currais.findIndex((c) => c.curralId === curralId)
        if (index >= 0 && index < currais.length - 1) {
          const proximo = currais[index + 1]
          setTimeout(() => {
            inputRefs.current[proximo.curralId]?.focus()
          }, 150)
        }
      }
    },
    [salvarTrato, currais]
  )

  const salvarTodosPendentes = useCallback(async () => {
    const pendentes = currais.filter(
      (c) => c.kgReal !== '' && !c.salvo && !c.salvando && !c.tratosConcluidos
    )
    if (pendentes.length === 0) return

    setSalvandoLote(true)
    setCurrais((prev) =>
      prev.map((c) =>
        pendentes.some((p) => p.curralId === c.curralId)
          ? { ...c, salvando: true, erroSalvar: false }
          : c
      )
    )

    await Promise.all(pendentes.map((c) => salvarTrato(c.curralId)))
    setSalvandoLote(false)
  }, [currais, salvarTrato])

  const limparKgReais = useCallback(() => {
    setCurrais((prev) =>
      prev.map((c) => ({ ...c, kgReal: '', salvo: false, erroSalvar: false }))
    )
  }, [])

  const tratosPendentes = useMemo(
    () =>
      currais.filter((c) => c.kgReal !== '' && !c.salvo && !c.salvando && !c.tratosConcluidos)
        .length,
    [currais]
  )

  const tiposVisiveis = TIPOS_PROGRAMACAO.filter((t) => tiposDisponiveis.includes(t.value))

  return (
    <CadernetaLayout
      title="Trato Confinamento"
      cadernetaId="trato-confinamento"
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

      {/* Seção 2: Tratos */}
      <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Cabeçalho fixo da seção */}
        <div className="px-4 py-3 bg-[#1a3a2a] text-white">
          <div className="mb-2">
            <h2 className="text-lg font-black tracking-tight">2. TRATOS</h2>
            {programacao && (
              <p className="text-sm text-white/70">
                {programacao.quantidadeTratos} tratos/dia · Tipo:{' '}
                {TIPOS_PROGRAMACAO.find((t) => t.value === tipoSelecionado)?.label}
              </p>
            )}
          </div>
          {/* Seletor de tipo */}
          {tiposVisiveis.length > 1 && (
            <div className="flex items-center gap-2 mt-2">
              {tiposVisiveis.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipoSelecionado(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                    tipoSelecionado === t.value
                      ? 'bg-yellow-400 text-[#1a3a2a]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 flex flex-col gap-4">
          {!programacao ? (
            <div className="p-8 text-center text-gray-500">
              {carregando ? (
                'Carregando programação...'
              ) : (
                <>
                  <p className="font-bold mb-2">Nenhuma programação de tratos ativa</p>
                  <p className="text-sm">
                    Configure a programação de tratos no painel web antes de usar esta tela.
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500">
                Digite a quantidade real (kg) tratada em cada curral. O valor previsto é calculado
                automaticamente com base na programação e na leitura de cocho do dia anterior.
              </p>

              <div
                ref={listaRef}
                className="flex flex-col gap-2 max-h-[55vh] overflow-y-auto -mx-1 px-1 pb-1"
              >
                {carregando ? (
                  <div className="p-8 text-center text-gray-500">Carregando currais...</div>
                ) : erro ? (
                  <div className="p-8 text-center text-red-600">{erro}</div>
                ) : currais.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    Nenhum curral na programação deste tipo.
                  </div>
                ) : (
                  currais.map((curral) => (
                    <div
                      key={curral.curralId}
                      id={`curral-card-${curral.curralId}`}
                      className={`rounded-2xl border-2 p-3 transition-all ${
                        curral.erroSalvar
                          ? 'border-red-300 bg-red-50'
                          : curral.salvo
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-200 bg-white'
                      }`}
                    >
                      {/* Linha 1: Curral | Lote + Formulação */}
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="min-w-0 flex-1">
                          <span className="text-base font-bold text-gray-900 truncate block">
                            {curral.curralNome}
                          </span>
                          <span className="text-xs text-gray-500 truncate block">
                            {curral.formulacaoNome || '—'}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-base font-bold text-[#1a3a2a]">
                            {curral.loteNome || '—'}
                          </span>
                        </div>
                      </div>

                      {/* Linha 2: Cab | PV | Categorias (inline compacto) */}
                      <div className="text-sm text-gray-700 mb-2 truncate">
                        <span className="font-bold text-gray-500">Cab: </span>
                        <span className="font-bold text-gray-900 mr-2">
                          {curral.nCabecas ?? '—'}
                        </span>
                        <span className="font-bold text-gray-500">PV: </span>
                        <span className="font-bold text-gray-900 mr-2">
                          {curral.pesoVivoKg != null
                            ? `${formatarKg(curral.pesoVivoKg, 0)} kg`
                            : '—'}
                        </span>
                        {curral.categorias && (
                          <>
                            <span className="font-bold text-gray-500">Cat: </span>
                            <span className="font-bold text-gray-900">
                              {curral.categorias
                                .split(',')
                                .map((c) => c.trim())
                                .filter(Boolean)
                                .map((c) => capitalizarIniciais(c))
                                .join(', ')}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Linha 3: Trato Nº | Previsto | Real */}
                      {curral.tratosConcluidos ? (
                        <div className="border-t border-gray-100 pt-2 mt-2">
                          <div className="flex items-center justify-center gap-2 py-2 text-green-700 font-bold">
                            <Check className="w-5 h-5" />
                            <span>
                              Tratos do dia concluídos ({curral.quantidadeTratos}/{curral.quantidadeTratos})
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2 border-t border-gray-100 pt-2">
                          <div className="flex items-start gap-3 sm:gap-6 min-w-0 flex-1">
                            <div className="min-w-[3rem] sm:min-w-[4rem] flex flex-col">
                              <span className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider block leading-none mb-1">
                                Trato
                              </span>
                              <span className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                                {curral.ordemTrato}º de {curral.quantidadeTratos}
                              </span>
                            </div>
                            <div className="min-w-[4rem] sm:min-w-[5rem] flex flex-col">
                              <span className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider block leading-none mb-1">
                                Previsto
                              </span>
                              <span className="text-sm sm:text-base font-bold text-[#1a3a2a] leading-tight">
                                {formatarKg(curral.kgPlanejado)} kg
                              </span>
                            </div>
                            {curral.leituraCochoNota !== null && (
                              <div className="min-w-[4rem] sm:min-w-[5rem] flex flex-col">
                                <span className="text-[0.65rem] font-bold text-gray-400 uppercase tracking-wider block leading-none mb-1">
                                  Leitura
                                </span>
                                <span className="text-sm sm:text-base font-bold text-gray-900 leading-tight">
                                  {curral.leituraCochoNota}
                                  {curral.leituraPercentualAjuste !== null && (
                                    <span
                                      className={`text-[0.65rem] sm:text-xs ml-1 ${
                                        curral.leituraPercentualAjuste > 0
                                          ? 'text-green-600'
                                          : curral.leituraPercentualAjuste < 0
                                            ? 'text-red-600'
                                            : 'text-gray-500'
                                      }`}
                                    >
                                      ({curral.leituraPercentualAjuste > 0 ? '+' : ''}
                                      {curral.leituraPercentualAjuste}%)
                                    </span>
                                  )}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 flex flex-col items-center">
                            <span className="text-[0.65rem] font-bold text-yellow-600 uppercase tracking-wider block mb-1">
                              Real (kg)
                            </span>
                            <div className="relative">
                              <input
                                ref={(el) => (inputRefs.current[curral.curralId] = el)}
                                type="number"
                                inputMode="decimal"
                                step="0.1"
                                min="0"
                                value={curral.kgReal}
                                onChange={(e) => atualizarKgReal(curral.curralId, e.target.value)}
                                onKeyDown={(e) => handleKgRealKeyDown(e, curral.curralId)}
                                placeholder="—"
                                className={`w-20 h-11 sm:w-24 sm:h-12 text-center text-lg sm:text-xl font-bold border-2 rounded-xl focus:outline-none transition-colors appearance-none cursor-text ${
                                  curral.erroSalvar
                                    ? 'border-red-500 bg-red-50 text-red-700'
                                    : curral.salvo
                                      ? 'border-green-500 bg-green-50 text-green-700'
                                      : 'border-yellow-500 bg-white text-gray-900 focus:border-yellow-600'
                                }`}
                              />
                              {curral.salvando && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                              )}
                              {curral.salvo && !curral.salvando && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </span>
                              )}
                              {curral.erroSalvar && !curral.salvando && (
                                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                  !
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Detalhe do cálculo (colapsado, discreto) */}
                      {!curral.tratosConcluidos && (
                        <div className="mt-2 rounded-lg bg-gray-50 border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 font-medium leading-snug">
                          {curral.isDia1 ? (
                            <>
                              <span className="font-bold">Dia 1:</span> {formatarKg(curral.kgBaseDia)}{' '}
                              kg/dia (programação) × {curral.percentualTrato}% ={' '}
                              {formatarKg(curral.kgPlanejado)} kg
                            </>
                          ) : (
                            <>
                              <span className="font-bold">Dia 2+:</span> real dia anterior{' '}
                              {formatarKg(curral.totalRealDiaAnterior)} kg
                              {curral.leituraPercentualAjuste !== null &&
                                curral.leituraPercentualAjuste !== 0 && (
                                  <>
                                    {' '}
                                    × (1{' '}
                                    {curral.leituraPercentualAjuste > 0 ? '+' : ''}
                                    {curral.leituraPercentualAjuste / 100})
                                  </>
                                )}{' '}
                              = {formatarKg(curral.kgBaseDia)} kg/dia × {curral.percentualTrato}% ={' '}
                              {formatarKg(curral.kgPlanejado)} kg
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {programacao && currais.length > 0 && (
        <div className="flex flex-col gap-3 desktop-form-container">
          <button
            onClick={salvarTodosPendentes}
            disabled={salvandoLote || tratosPendentes === 0}
            className={`font-bold text-base px-6 py-3 rounded-2xl border-2 transition-colors active:scale-95 ${
              salvandoLote
                ? 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed'
                : tratosPendentes === 0
                  ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-[#1a3a2a] text-white border-[#1a3a2a] hover:bg-[#245038]'
            }`}
          >
            {salvandoLote
              ? 'SALVANDO...'
              : tratosPendentes > 0
                ? `SALVAR TRATOS (${tratosPendentes})`
                : 'SALVAR TRATOS'}
          </button>
          <button
            onClick={limparKgReais}
            className="bg-gray-200 text-gray-700 font-bold text-base px-6 py-3 rounded-2xl border-2 border-gray-300 hover:bg-gray-300 transition-colors active:scale-95"
          >
            🧹 LIMPAR KG REAIS
          </button>
        </div>
      )}
    </CadernetaLayout>
  )
}

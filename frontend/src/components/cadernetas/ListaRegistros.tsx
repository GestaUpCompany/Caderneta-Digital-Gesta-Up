import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { requestSyncNow } from '../../store/slices/syncSlice'
import { Registro } from '../../types/cadernetas'
import { CadernetaStore } from '../../services/indexedDB'
import { listarRegistros, reenviarRegistro, aguardarSyncConcluido } from '../../services/api'
import { useSearchFiltros } from '../../hooks/useSearchFiltros'
import { Input, Button } from '../ui'
import DatePickerIcon from '../ui/DatePickerIcon'
import { ChevronLeft, List } from 'lucide-react'
import { RootState } from '../../store/store'
import { LABELS_BY_CADERNETA } from '../../config/labelConfig'
import { formatarRegistroComoTexto, compartilharWhatsApp, formatarTempoDesdeLimpeza } from '../../utils/shareUtils'
import { calcularMetricasSuplementacao } from '../../utils/supplementMetrics'
import { getLoteDetalhesComCategoriasCached, getFormulacaoByNomeCached, getBebedouroByNomeCached, getUltimaDataLimpezaBebedouroAntesDeCached, getIntervaloMedioLimpezasCached } from '../../services/cadastroCache'
import { CADERNETA_DISPLAY_CONFIG } from '../../config/cadernetas/index'
import { GLOBAL_HIDDEN_FIELDS, FieldConfig } from '../../config/registroDisplayConfig'
import { SPECIAL_COMPONENTS } from './registroSpecialComponents'

interface Props {
  caderneta: CadernetaStore
  titulo: React.ReactNode
  rotaForm: string
  extraActions?: React.ReactNode
}


const statusLabel: Record<string, string> = {
  pending: '⏳',
  synced: '✅',
  conflict: '⚠️',
  error: '❌',
  pending_approval: '🕐',
  rejected: '🚫',
}

const statusText: Record<string, string> = {
  pending_approval: 'Aguardando aprovação',
  rejected: 'Rejeitado',
}

const formatFieldValue = (key: string, value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—'
  if (key === 'pesoCria' && value !== null && value !== undefined && value !== '') {
    return `${String(value)} kg`
  }
  const valueStr = String(value)
  if (valueStr === 'S') return 'Sim'
  if (valueStr === 'N') return 'Não'
  if (key === 'categorias' && Array.isArray(value)) {
    return value.join(', ')
  }
  if (key === 'limpezaRealizada' && Array.isArray(value)) {
    // Mapear valores para labels legíveis
    const labelMap: Record<string, string> = {
      capina: 'Capina',
      grama: 'Grama',
      herbicida: 'Herbicida',
      veiculo: 'Veículo',
      moto: 'Moto',
      trator: 'Trator',
      implemento: 'Implemento',
      barracao: 'Barracão',
      curral: 'Curral',
      banheiros: 'Banheiros',
      sede: 'Sede',
      alojamento: 'Alojamento',
      pocilga: 'Pocilga',
      galinheiro: 'Galinheiro',
      aprisco: 'Aprisco',
      baias: 'Baias',
      tanque: 'Tanque',
      jardins: 'Jardins',
      oficina: 'Oficina',
      corredores: 'Corredores',
      aceiros: 'Aceiros',
      entrada: 'Entrada',
      pista: 'Pista',
      reservatorio: 'Reservatório',
      poda_arvores: 'Poda Árvores',
      lixo_recolhido: 'Lixo Recolhido',
      patio: 'Pátio',
      rocada: 'Roçada',
      horta: 'Horta',
    }
    return value.map(v => labelMap[v as string] || v as string).join(', ')
  }
  return valueStr
}

export default function ListaRegistros({ caderneta, titulo, rotaForm, extraActions }: Props) {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { usuario, fazendaId } = useSelector((state: RootState) => state.config)
  const [registros, setRegistros] = useState<Registro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [filtroSexo, setFiltroSexo] = useState('')
  const [filtroTipoParto, setFiltroTipoParto] = useState('')
  const [periodoAtivo, setPeriodoAtivo] = useState<'todos' | 'hoje' | '7dias' | '30dias' | null>(null)
  const [mostrarModalCompartilhar, setMostrarModalCompartilhar] = useState(false)
  const [registroParaCompartilhar, setRegistroParaCompartilhar] = useState<Registro | null>(null)
  const [reenviandoId, setReenviandoId] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const lista = await listarRegistros(caderneta)
    setRegistros(lista)
    setCarregando(false)
  }, [caderneta])

  useEffect(() => {
    carregar()
  }, [carregar])

  const {
    filtros,
    registrosFiltrados,
    setBusca,
    setDataInicio,
    setDataFim,
    setOrdenacao,
    limparFiltros,
    setPeriodoRapido,
    temFiltrosAtivos,
  } = useSearchFiltros(registros)

  // Filtragem específica para maternidade
  const registrosFiltradosFinal = useMemo(() => {
    let resultado = registrosFiltrados

    if (caderneta === 'maternidade') {
      if (filtroSexo) {
        resultado = resultado.filter((r) => r.sexo === filtroSexo)
      }
      if (filtroTipoParto) {
        resultado = resultado.filter((r) => r.tipoParto === filtroTipoParto)
      }
    }

    return resultado
  }, [registrosFiltrados, caderneta, filtroSexo, filtroTipoParto])

  // const handleExportCSV = () => exportToCSV(registrosFiltradosFinal, `${caderneta}_export`, colunas)
  // const handleExportJSON = () => exportToJSON(registrosFiltradosFinal, `${caderneta}_export`)
  // const handleCopy = () => copyToClipboard(registrosFiltradosFinal)

  const handleLimparFiltrosCompletos = () => {
    limparFiltros()
    setFiltroSexo('')
    setFiltroTipoParto('')
    setPeriodoAtivo(null)
  }

  const handleSetPeriodoRapido = (periodo: 'todos' | '7dias' | '30dias' | 'hoje') => {
    setPeriodoRapido(periodo)
    setPeriodoAtivo(periodo)
  }

  

  const handleCompartilhar = (registro: Registro) => {
    setRegistroParaCompartilhar(registro)
    setMostrarModalCompartilhar(true)
  }

  const handleCompartilharTexto = async () => {
    if (!registroParaCompartilhar) return
    let registroParaShare = registroParaCompartilhar

    if (caderneta === 'suplementacao' && registroParaCompartilhar.loteId && registroParaCompartilhar.formulacao && fazendaId) {
      try {
        const loteId = registroParaCompartilhar.loteId as string
        const nomeFormulacao = registroParaCompartilhar.formulacao as string
        const [detalhesLote, formulacaoData] = await Promise.all([
          getLoteDetalhesComCategoriasCached(loteId),
          getFormulacaoByNomeCached(fazendaId, nomeFormulacao),
        ])

        if (detalhesLote && formulacaoData) {
          const categorias = detalhesLote.categorias_raw || []
          const formulacao = {
            nome: formulacaoData.nome,
            teor_ms_dieta: formulacaoData.teor_ms_dieta ?? null,
            meta_consumo_ms_percent_pv: formulacaoData.consumo_ms_percent_pv ?? null,
            custo_dieta_reais_cab_dia: formulacaoData.custo_dieta_reais_cab_dia ?? null,
            custo_mn_tonelada: formulacaoData.custo_mn_tonelada ?? null,
            consumo_mn_kg_cab_dia: null,
            consumo_ms_kg_cab_dia: null,
            custo_ms_tonelada: null,
          }

          const registrosDoLote = (registros as any[]).filter(
            r => r.loteId === loteId
          ).map(r => ({
            id: r.id,
            data: r.data,
            kg_cocho: r.kgCocho ? Number(r.kgCocho) : null,
            kg_deposito: r.kgDeposito ? Number(r.kgDeposito) : null,
            formulacao: r.formulacao,
          }))

          const metricas = calcularMetricasSuplementacao(categorias, registrosDoLote, formulacao, registroParaCompartilhar.id)
          if (metricas) {
            registroParaShare = {
              ...registroParaCompartilhar,
              consumoMedioGeralPercentPV: metricas.consumoMedioGeralPercentPV,
              consumoMedio30DiasPercentPV: metricas.consumoMedio30DiasPercentPV,
              consumoMedioGeralKgMN: metricas.consumoMedioGeralKgMN,
              consumoMedio30DiasKgMN: metricas.consumoMedio30DiasKgMN,
              consumoMedioGeralKgMS: metricas.consumoMedioGeralKgMS,
              consumoMedio30DiasKgMS: metricas.consumoMedio30DiasKgMS,
              custoMedioReaisCabDia: metricas.custoMedioReaisCabDia,
            }
          }
        }
      } catch (error) {
        console.error('Erro ao recalcular métricas para share:', error)
      }
    }

    if (caderneta === 'bebedouros' && registroParaCompartilhar.numeroBebedouro && fazendaId) {
      try {
        const bebedouro = await getBebedouroByNomeCached(fazendaId, registroParaCompartilhar.numeroBebedouro as string)
        if (bebedouro) {
          // registro.data pode incluir hora ("DD/MM/YYYY HH:MM"); descartar antes do split
          const dataSemHora = (registroParaCompartilhar.data as string).split(' ')[0]
          const [dia, mes, ano] = dataSemHora.split('/')
          const dataRef = `${ano}-${mes}-${dia}`
          const ultimaDataLimpeza = await getUltimaDataLimpezaBebedouroAntesDeCached(fazendaId, bebedouro.id, dataRef)
          const tempoDesdeLimpeza = formatarTempoDesdeLimpeza(ultimaDataLimpeza)
          const intervaloMedio = await getIntervaloMedioLimpezasCached(fazendaId, bebedouro.id)
          const intervaloMedioStr = intervaloMedio > 0 ? `${intervaloMedio} dias` : 'Sem dados suficientes'
          const metaIntervalo = bebedouro.meta_intervalo_limpeza ? `${bebedouro.meta_intervalo_limpeza} dias` : 'Não definida'
          registroParaShare = {
            ...registroParaShare,
            tempoDesdeLimpeza,
            intervaloMedioLimpezas: intervaloMedioStr,
            metaIntervaloLimpeza: metaIntervalo,
          }
        }
      } catch (error) {
        console.error('Erro ao recalcular dados de limpeza para share:', error)
      }
    }

    const texto = formatarRegistroComoTexto(registroParaShare, caderneta, registros)
    const foto = (registroParaShare as any).fotoBase64 as string | null | undefined
    compartilharWhatsApp(texto, foto)
    setMostrarModalCompartilhar(false)
    setRegistroParaCompartilhar(null)
  }

  const handleReenviar = async (registro: Registro) => {
    setReenviandoId(registro.id)
    const result = await reenviarRegistro(caderneta, registro.id)
    if (!result.success) {
      alert(result.message)
      setReenviandoId(null)
      return
    }
    // Dispara sync imediato para não depender do próximo tick do setInterval
    dispatch(requestSyncNow())
    // Aguarda o sync concluir para atualizar o card sem recarregar a página
    const finalStatus = await aguardarSyncConcluido(caderneta, registro.id)
    await carregar()
    setReenviandoId(null)
    if (finalStatus === 'error') {
      alert('Falha ao sincronizar. Verifique a conexão e tente novamente.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="sticky top-0 z-20 bg-gradient-to-b from-[#23503a] via-[#1d4030] to-[#1a3a2a] text-white shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
        <div className="px-3 py-3 desktop-container">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/20 active:bg-white/25 transition-colors text-white text-xs font-semibold pl-2 pr-3 py-2 min-h-[40px] backdrop-blur-sm"
              aria-label="Voltar"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
              <span>Voltar</span>
            </button>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400/15 text-yellow-200 px-2.5 py-1.5 text-xs font-semibold">
              <List className="w-3.5 h-3.5" strokeWidth={2.5} />
              {registrosFiltradosFinal.length} registros
            </span>
          </div>

          <h1 className="mt-3 text-lg font-bold leading-tight tracking-tight text-center truncate tracking-wide">{titulo}</h1>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-3 pb-8 desktop-container">
        {/* Ações principais */}
        <Button onClick={() => navigate(rotaForm)} variant="primary" icon="➕">
          NOVO REGISTRO
        </Button>

        {extraActions}

        {/* Busca rápida */}
        <Input
          placeholder="🔍 Buscar por pasto, número, tratamento..."
          value={filtros.busca}
          onChange={(e) => setBusca(e.target.value)}
          fullWidth
          textSize="base"
        />

        {/* Botões de período rápido */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button
            onClick={() => handleSetPeriodoRapido('todos')}
            variant={periodoAtivo === 'todos' ? 'secondary' : 'ghost'}
            size="sm"
            icon="📆"
            className="!gap-1"
          >
            TODOS
          </Button>
          <Button
            onClick={() => handleSetPeriodoRapido('hoje')}
            variant={periodoAtivo === 'hoje' ? 'secondary' : 'ghost'}
            size="sm"
            icon="📆"
            className="!gap-1"
          >
            HOJE
          </Button>
          <Button
            onClick={() => handleSetPeriodoRapido('7dias')}
            variant={periodoAtivo === '7dias' ? 'secondary' : 'ghost'}
            size="sm"
            icon="📆"
            className="!gap-1"
          >
            7 DIAS
          </Button>
          <Button
            onClick={() => handleSetPeriodoRapido('30dias')}
            variant={periodoAtivo === '30dias' ? 'secondary' : 'ghost'}
            size="sm"
            icon="📆"
            className="!gap-1"
          >
            30 DIAS
          </Button>
        </div>

        {/* Botões de filtros e exportar */}
        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            variant={temFiltrosAtivos ? 'secondary' : 'ghost'}
            size="sm"
            icon="🔎"
          >
            {temFiltrosAtivos ? 'FILTROS ATIVOS' : 'FILTROS'}
          </Button>
        </div>

        {temFiltrosAtivos && (
          <Button
            onClick={limparFiltros}
            variant="secondary"
            size="sm"
            icon="🧹"
          >
            LIMPAR FILTROS
          </Button>
        )}

        {/* Painel de filtros avançados */}
        {mostrarFiltros && (
          <div className="bg-white rounded-2xl p-4 border-2 border-gray-200 flex flex-col gap-3">
            <h3 className="font-bold text-gray-800">🔎 Filtros Avançados</h3>
            <div className="grid grid-cols-2 gap-3">
              <DatePickerIcon
                label="Data Início"
                value={filtros.dataInicio}
                onChange={setDataInicio}
              />
              <DatePickerIcon
                label="Data Fim"
                value={filtros.dataFim}
                onChange={setDataFim}
              />
            </div>
            <div>
              <label className="block text-base font-bold text-gray-800 mb-2">ORDENAÇÃO</label>
              <select
                value={filtros.ordenacao}
                onChange={(e) => setOrdenacao(e.target.value as any)}
                className="w-full min-h-[60px] text-xl px-4 py-3 bg-white border-2 border-gray-400 rounded-xl"
              >
                <option value="data_desc">📅 Data (mais recente)</option>
                <option value="data_asc">📅 Data (mais antiga)</option>
              </select>
            </div>

            {caderneta === 'maternidade' && (
              <>
                <div>
                  <label className="block text-base font-bold text-gray-800 mb-2">SEXO</label>
                  <select
                    value={filtroSexo}
                    onChange={(e) => setFiltroSexo(e.target.value)}
                    className="w-full min-h-[60px] text-xl px-4 py-3 bg-white border-2 border-gray-400 rounded-xl"
                  >
                    <option value="">Todos</option>
                    <option value="Macho">Macho ♂️</option>
                    <option value="Fêmea">Fêmea ♀️</option>
                  </select>
                </div>
                <div>
                  <label className="block text-base font-bold text-gray-800 mb-2">TIPO DE PARTO</label>
                  <select
                    value={filtroTipoParto}
                    onChange={(e) => setFiltroTipoParto(e.target.value)}
                    className="w-full min-h-[60px] text-xl px-4 py-3 bg-white border-2 border-gray-400 rounded-xl"
                  >
                    <option value="">Todos</option>
                    <option value="Normal">Normal ✅</option>
                    <option value="Auxiliado">Auxiliado 🤝</option>
                    <option value="Cesárea">Cesárea 🏥</option>
                    <option value="Aborto">Aborto ❌</option>
                    <option value="Natimorto">Natimorto 💀</option>
                    <option value="Distócico">Distócico ⚠️</option>
                    <option value="Gêmeos">Gêmeos 👯</option>
                    <option value="Deficiência Física">Deficiência Física ♿</option>
                    <option value="Retenção de Placenta">Retenção de Placenta 🩸</option>
                    <option value="Guacho">Guacho 🐄</option>
                  </select>
                </div>
              </>
            )}
            {(temFiltrosAtivos || filtroSexo || filtroTipoParto) && (
              <Button onClick={handleLimparFiltrosCompletos} variant="ghost" size="sm">
                🧹 LIMPAR FILTROS
              </Button>
            )}
          </div>
        )}

        {/* Lista de registros */}
        {carregando ? (
          <div className="flex items-center justify-center py-16">
            <span className="text-2xl animate-spin">⏳</span>
            <span className="ml-3 text-lg font-semibold text-gray-600">Carregando...</span>
          </div>
        ) : registrosFiltradosFinal.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border-2 border-gray-200">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-xl font-bold text-gray-700">
              {registros.length === 0 ? 'Nenhum registro ainda' : 'Nenhum resultado encontrado'}
            </p>
            <p className="text-base text-gray-500 mt-2">
              {registros.length === 0
                ? 'Toque em "NOVO REGISTRO" para começar'
                : 'Ajuste os filtros ou limpe a busca'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-4">
            {registrosFiltradosFinal.map((registro) => (
              <div
                key={registro.id}
                className="bg-white rounded-2xl p-4 border-2 border-gray-200 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{statusLabel[registro.syncStatus] ?? '⏳'}</span>
                    <span className="text-base font-bold text-gray-800">{registro.data as string}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{(registro.id as string).slice(0, 8)}</span>
                </div>

                {(registro.syncStatus === 'pending_approval' || registro.syncStatus === 'rejected') && (
                  <div className={`mb-3 p-3 rounded-xl text-sm font-semibold ${registro.syncStatus === 'pending_approval' ? 'bg-amber-50 text-amber-900 border border-amber-300' : 'bg-red-50 text-red-900 border border-red-300'}`}>
                    <p>{statusText[registro.syncStatus]}</p>
                    {registro.syncStatus === 'pending_approval' && (registro as any).subtipo === 'Novo Lote' && (
                      <p className="text-xs mt-1 opacity-80">
                        Solicitação de criação do lote &quot;{(registro as any).loteDestino || ''}&quot; enviada ao Painel Web.
                      </p>
                    )}
                    {registro.syncStatus === 'rejected' && (registro as any).motivoRejeicao && (
                      <p className="text-xs mt-1 opacity-90">
                        Motivo: {(registro as any).motivoRejeicao}
                      </p>
                    )}
                  </div>
                )}

                {(() => {
                    const config = CADERNETA_DISPLAY_CONFIG[caderneta]

                    const renderFieldValue = (fieldConfig: FieldConfig, value: unknown): string => {
                      if (fieldConfig.format) return fieldConfig.format(value, registro as any)
                      const str = String(value)
                      if (str === 'S') return 'Sim'
                      if (str === 'N') return 'Não'
                      if (Array.isArray(value)) return (value as string[]).join(', ')
                      return str
                    }

                    if (config) {
                      const allHidden = [...GLOBAL_HIDDEN_FIELDS, ...(config.hiddenFields || [])]
                      return (
                        <div className="mb-3">
                          {usuario && (
                            <div className="mb-2">
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">USUÁRIO</p>
                              <p className="text-base font-semibold text-gray-900">{usuario}</p>
                            </div>
                          )}
                          {config.sections
                            .sort((a, b) => a.order - b.order)
                            .map((section) => {
                              const sectionFields = Object.values(config.fieldConfig)
                                .filter(f => f.section === section.title)
                                .filter(f => !f.condition || f.condition(registro as any))
                                .sort((a, b) => (a.priority || 0) - (b.priority || 0))
                                .filter(f => {
                                  const v = registro[f.key]
                                  return v !== null && v !== undefined && v !== ''
                                })

                              if (sectionFields.length === 0) return null

                              return (
                                <div key={section.title} className="mb-3">
                                  <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-1">
                                    {section.icon} {section.title}
                                  </p>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                    {sectionFields.map((field) => {
                                      const value = registro[field.key]
                                      const label = field.label || LABELS_BY_CADERNETA[caderneta]?.[field.key] || field.key.toUpperCase()
                                      return (
                                        <div key={field.key} className={field.colSpan === 2 ? 'col-span-2' : ''}>
                                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</p>
                                          <p className="text-base font-semibold text-gray-900 break-words whitespace-normal">
                                            {renderFieldValue(field, value)}
                                          </p>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })}
                          {(() => {
                            const specials = SPECIAL_COMPONENTS[caderneta]
                            if (!specials) return null
                            return Object.entries(specials).map(([key, Component]) => {
                              if (!allHidden.includes(key)) return null
                              const node = Component(registro as any)
                              if (!node) return null
                              return <div key={key} className="col-span-2">{node}</div>
                            })
                          })()}
                        </div>
                      )
                    }

                    // Fallback: generic flat display for unconfigured cadernetas
                    const camposNormais: [string, unknown][] = []
                    const categoriasAnimais: string[] = []

                    if (caderneta === 'movimentacao') {
                      // Para movimentação, usar ordem específica dos formulários
                      const ordemMovimentacao = [
                        'loteOrigem',
                        'brincoChip',
                        'numeroCabecas',
                        'pesoVivoAtual',
                        'categoria',
                        'motivoMovimentacao',
                        'causaObservacao',
                        'loteDestino'
                      ]
                      
                      ordemMovimentacao.forEach(key => {
                        const value = registro[key]
                        if (value !== null && value !== undefined && value !== '') {
                          camposNormais.push([key, value])
                        }
                      })
                    } else if (caderneta === 'bebedouros') {
                      // Para bebedouros, usar ordem específica dos formulários
                      const ordemBebedouros = [
                        'responsavel',
                        'pasto',
                        'numeroLote',
                        'categoria',
                        'numeroBebedouro',
                        'leituraBebedouro',
                        'observacao',
                        // Checklist fields
                        'aguaSuficiente',
                        'vazaoBebedouroIdeal',
                        'aterroAcessoBebedouroIdeal',
                        'espacamentoBebedouroIdeal'
                      ]
                      
                      ordemBebedouros.forEach(key => {
                        const value = registro[key]
                        if (value !== null && value !== undefined && value !== '') {
                          camposNormais.push([key, value])
                        }
                      })
                    } else if (caderneta === 'suplementacao') {
                      // Para suplementação, usar ordem específica dos formulários
                      const ordemSuplementacao = [
                        'tratador',
                        'pasto',
                        'numeroLote',
                        'produto',
                        'creepKg',
                        'leituraCocho',
                        'kgCocho',
                        'kgDeposito',
                        'categorias',
                        'escoreFezes',
                        // Checklist fields
                        'limpezaCocho',
                        'cochosCondicoes',
                        'aterroAcessoIdeal',
                        'espacamentoCochoCmCab',
                        'espacamentoCochoAdequado',
                        'depositoCondicoes'
                      ]
                      
                      ordemSuplementacao.forEach(key => {
                        const value = registro[key]
                        if (value !== null && value !== undefined && value !== '') {
                          camposNormais.push([key, value])
                        }
                      })
                    } else if (caderneta === 'entrada-insumos') {
                      // Para entrada de insumos, usar ordem específica dos formulários
                      const ordemEntradaInsumos = [
                        'dataEntrada',
                        'horario',
                        'produto',
                        'quantidade',
                        'valorUnitario',
                        'valorTotal',
                        'notaFiscal',
                        'fornecedor',
                        'placa',
                        'motorista',
                        'responsavelRecebimento'
                      ]
                      
                      ordemEntradaInsumos.forEach(key => {
                        const value = registro[key]
                        if (value !== null && value !== undefined && value !== '') {
                          camposNormais.push([key, value])
                        }
                      })
                    } else if (caderneta === 'saida-insumos') {
                      // Para saída de insumos, usar ordem específica dos formulários
                      const ordemSaidaInsumos = [
                        'dataProducao',
                        'dietaProduzida',
                        'destinoProducao',
                        'totalProduzido'
                      ]
                      
                      ordemSaidaInsumos.forEach(key => {
                        const value = registro[key]
                        if (value !== null && value !== undefined && value !== '') {
                          camposNormais.push([key, value])
                        }
                      })
                      
                      // Adicionar insumos utilizados
                      if (registro.insumosQuantidades) {
                        Object.entries(registro.insumosQuantidades).forEach(([insumo, quantidade]) => {
                          if (quantidade && parseFloat(String(quantidade)) > 0) {
                            camposNormais.push([insumo, quantidade])
                          }
                        })
                      }
                    } else if (caderneta === 'rodeio') {
                      // Para rodeio, usar ordem específica dos formulários
                      const ordemRodeio = [
                        'pasto',
                        'numeroLote',
                        'vaca',
                        'touro',
                        'boiGordo',
                        'boiMagro',
                        'garrote',
                        'bezerro',
                        'novilha',
                        'tropa',
                        'outros',
                        'totalCabecas',
                        'escoreGadoIdeal',
                        'aguaBoaBebedouro',
                        'pastagemAdequada',
                        'animaisDoentes',
                        'cercasCochos',
                        'carrapatosMoscas',
                        'animaisEntreverados',
                        'animalMorto',
                        'escoreFezes',
                        'equipe'
                      ]
                      
                      ordemRodeio.forEach(key => {
                        const value = registro[key]
                        if (value !== null && value !== undefined && value !== '') {
                          camposNormais.push([key, value])
                        }
                        
                        // Adicionar observação imediatamente após o campo principal
                        const obsField = `${key}Obs`
                        if (registro[obsField] && registro[obsField] !== '') {
                          camposNormais.push([obsField, registro[obsField]])
                        }
                      })
                    } else if (caderneta === 'enfermaria') {
                      // Para enfermaria, usar ordem específica dos formulários
                      const ordemEnfermaria = [
                        'pasto',
                        'lote',
                        'brincoChip',
                        'categoria',
                        'tratamento',
                        'problemaCasco',
                        'sintomasPneumonia',
                        'picadoCobra',
                        'incoordenacaoTremores',
                        'febreAlta',
                        'presencaSangue',
                        'fraturas',
                        'desordensDigestivas'
                      ]
                      
                      ordemEnfermaria.forEach(key => {
                        const value = registro[key]
                        if (value !== null && value !== undefined && value !== '') {
                          camposNormais.push([key, value])
                        }
                        
                        // Adicionar observação imediatamente após o campo principal
                        const obsField = `${key}Obs`
                        if (registro[obsField] && registro[obsField] !== '') {
                          camposNormais.push([obsField, registro[obsField]])
                        }
                      })
                    } else if (caderneta === 'cantina') {
                      // Para cantina, usar ordem específica dos formulários
                      const ordemCantina = [
                        'numeroCozinheiras',
                        'quemCozinhou',
                        'quemAjudou',
                        'numeroCafeManha',
                        'numeroLanches',
                        'numeroRefeicoesAlmoco',
                        'numeroRefeicoesJantar',
                        'observacao'
                      ]
                      
                      ordemCantina.forEach(key => {
                        const value = registro[key]
                        if (value !== null && value !== undefined && value !== '') {
                          camposNormais.push([key, value])
                        }
                      })
                      
                      // Adicionar itens preenchidos
                      if (registro.itens && typeof registro.itens === 'object') {
                        const itens = registro.itens as Record<string, unknown>
                        Object.entries(itens).forEach(([nome, valor]) => {
                          if (valor !== null && valor !== undefined && valor !== '' && Number(valor) > 0) {
                            camposNormais.push([nome, valor])
                          }
                        })
                      }
                    } else if (caderneta === 'limpeza') {
                      // Para limpeza, usar ordem específica dos formulários
                      const ordemLimpeza = [
                        'numeroEquipe',
                        'setor',
                        'local',
                        'horaInicio',
                        'horaFinal',
                        'limpezaRealizada',
                        'observacao'
                      ]
                      
                      ordemLimpeza.forEach(key => {
                        const value = registro[key]
                        if (value !== null && value !== undefined && value !== '') {
                          camposNormais.push([key, value])
                        }
                      })
                    } else if (caderneta === 'problemas') {
                      // Para problemas, usar ordem específica dos formulários
                      const ordemProblemas = [
                        'setor',
                        'local',
                        'descricaoProblema',
                        'causaIdentificada',
                        'causaIdentificadaObs',
                        'acaoCorretivaRealizada',
                        'acaoCorretivaRealizadaObs',
                        'tipoOcorrencia',
                        'tipoOcorrenciaObs',
                        'causaRaizIdentificada',
                        'causaRaizIdentificadaObs',
                        'gravidadeImpacto',
                        'gravidadeImpactoObs',
                        'tipoProblema',
                        'tipoProblemaObs',
                        'prioridade'
                      ]

                      ordemProblemas.forEach(key => {
                        const value = registro[key]
                        if (value !== null && value !== undefined && value !== '') {
                          camposNormais.push([key, value])
                        }
                      })
                    } else if (caderneta === 'almoxarifado') {
                      const ordemAlmoxarifado = [
                        'quemEntregou',
                        'quemPegou',
                        'observacao'
                      ]
                      
                      ordemAlmoxarifado.forEach(key => {
                        const value = registro[key]
                        if (value !== null && value !== undefined && value !== '') {
                          camposNormais.push([key, value])
                        }
                      })
                    } else {
                      Object.entries(registro).forEach(([key, value]) => {
                        if (
                          !['id', 'googleRowId', 'version', 'lastModified', 'syncStatus', 'categoriasMarcadas'].includes(key) &&
                          value !== null &&
                          value !== undefined &&
                          value !== ''
                        ) {
                          if (key === 'causaObservacao') {
                            // Será adicionado por último
                          } else {
                            camposNormais.push([key, value])
                          }
                        }
                      })
                    }

                    return (
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
                        {usuario && (
                          <div className="col-span-2">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">USUÁRIO</p>
                            <p className="text-base font-semibold text-gray-900">{usuario}</p>
                          </div>
                        )}
                        {camposNormais.map(([key, value]) => {
                          let label = LABELS_BY_CADERNETA[caderneta]?.[key] || key.toUpperCase()
                          if (key.match(/^animal\d+Id$/)) {
                            label = `animal ${String(value)}`
                          } else if (key.match(/^animal\d+Tratamentos$/)) {
                            label = 'Tratamentos'
                          }
                          return (
                            <div key={key}>
                              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</p>
                              <p className="text-base font-semibold text-gray-900 break-words whitespace-normal">
                                {formatFieldValue(key, value)}
                              </p>
                            </div>
                          )
                        })}
                        {caderneta === 'movimentacao' && categoriasAnimais.length > 0 && (
                          <div className="col-span-2" key="categoriasAnimais">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">CATEGORIAS DOS ANIMAIS</p>
                            <p className="text-base font-semibold text-gray-900 break-words whitespace-normal">{categoriasAnimais.join(', ')}</p>
                          </div>
                        )}
                        {caderneta === 'movimentacao' && !!registro.causaObservacao && String(registro.causaObservacao) !== '' && (
                          <div className="col-span-2" key="causaObservacao">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{LABELS_BY_CADERNETA[caderneta]?.['causaObservacao'] || 'CAUSA/OBSERVAÇÃO'}</p>
                            <p className="text-base font-semibold text-gray-900 break-words whitespace-normal">{formatFieldValue('causaObservacao', registro.causaObservacao)}</p>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleCompartilhar(registro)}
                      variant="ghost"
                      size="sm"
                      icon="🔗"
                    >
                      COMPARTILHAR
                    </Button>
                  </div>
                  {registro.syncStatus === 'error' && (
                    <Button
                      onClick={() => handleReenviar(registro)}
                      variant="primary"
                      size="sm"
                      icon={reenviandoId === registro.id ? '⏳' : '🔄'}
                      disabled={reenviandoId === registro.id}
                    >
                      {reenviandoId === registro.id ? 'ENVIANDO...' : 'REENVIAR'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de escolha de formato de compartilhamento */}
        {mostrarModalCompartilhar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-xl font-bold text-gray-900 mb-4">📤 Compartilhar Registro</h3>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleCompartilharTexto}
                  variant="secondary"
                  fullWidth
                  icon="📋"
                >
                  COMPARTILHAR
                </Button>
                <Button
                  onClick={() => {
                    setMostrarModalCompartilhar(false)
                    setRegistroParaCompartilhar(null)
                  }}
                  variant="ghost"
                  fullWidth
                >
                  CANCELAR
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
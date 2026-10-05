import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { requestSyncNow } from '../../store/slices/syncSlice'
import { Registro } from '../../types/cadernetas'
import { CadernetaStore } from '../../services/indexedDB'
import { listarRegistros, reenviarRegistro, aguardarSyncConcluido } from '../../services/api'
import { useSearchFiltros } from '../../hooks/useSearchFiltros'
import DatePickerIcon from '../ui/DatePickerIcon'
import {
  ChevronLeft, List, Share2, Plus, Search, SlidersHorizontal, FilterX,
  CheckCircle2, Clock, AlertTriangle, AlertCircle, XCircle,
  RefreshCw, ChevronDown, ChevronUp, Copy, ClipboardList, Loader2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import AppHeader from '../AppHeader'
import { RootState } from '../../store/store'
import { LABELS_BY_CADERNETA } from '../../config/labelConfig'
import { formatarRegistroComoTexto, compartilharWhatsApp, formatarTempoDesdeLimpeza } from '../../utils/shareUtils'
import { translateSyncError, formatSyncErrorForSupport } from '../../utils/syncErrorMessages'
import { formatarNumeroBR, normalizarNumero } from '../../utils/formatNumber'
import { calcularMetricasSuplementacao } from '../../utils/supplementMetrics'
import { isCategoriaAoPe } from '../../utils/categorias'
import { getLoteDetalhesComCategoriasCached, getFormulacaoByNomeCached, getBebedouroByNomeCached, getUltimaDataLimpezaBebedouroAntesDeCached, getIntervaloMedioLimpezasCached } from '../../services/cadastroCache'
import { CADERNETA_DISPLAY_CONFIG } from '../../config/cadernetas/index'
import { GLOBAL_HIDDEN_FIELDS, FieldConfig } from '../../config/registroDisplayConfig'
import { SPECIAL_COMPONENTS } from './registroSpecialComponents'

interface Props {
  caderneta: CadernetaStore
  titulo: React.ReactNode
  rotaForm: string
  extraActions?: React.ReactNode
  // Filtro extra aplicado sobre os registros do store (ex: OS por tipo)
  filtrarRegistro?: (registro: Registro) => boolean
}


const SYNC_BADGE: Record<string, { label: string; icon: LucideIcon; className: string }> = {
  synced: { label: 'Sincronizado', icon: CheckCircle2, className: 'bg-brand-50 text-brand-700 border-brand-200' },
  pending: { label: 'Pendente', icon: Clock, className: 'bg-amber-50 text-amber-800 border-amber-300' },
  conflict: { label: 'Conflito', icon: AlertCircle, className: 'bg-amber-50 text-amber-800 border-amber-300' },
  error: { label: 'Erro de sync', icon: AlertTriangle, className: 'bg-red-50 text-red-700 border-red-300' },
  pending_approval: { label: 'Aguardando aprovação', icon: Clock, className: 'bg-amber-50 text-amber-800 border-amber-300' },
  rejected: { label: 'Rejeitado', icon: XCircle, className: 'bg-red-50 text-red-700 border-red-300' },
}

const statusText: Record<string, string> = {
  pending_approval: 'Aguardando aprovação',
  rejected: 'Rejeitado',
}

const BADGE_TONES = {
  danger: 'bg-red-50 text-red-700 border-red-300',
  warning: 'bg-amber-50 text-amber-800 border-amber-300',
  success: 'bg-brand-50 text-brand-700 border-brand-200',
  neutral: 'bg-gray-100 text-gray-600 border-gray-300',
} as const

const PERIODOS = [
  { id: 'todos', label: 'Todos' },
  { id: 'hoje', label: 'Hoje' },
  { id: '7dias', label: '7 dias' },
  { id: '30dias', label: '30 dias' },
] as const

const formatFieldValue = (key: string, value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—'
  if (value === true) return 'Sim'
  if (value === false) return 'Não'
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

export default function ListaRegistros({ caderneta, titulo, rotaForm, extraActions, filtrarRegistro }: Props) {
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
  const [erroExpandidoId, setErroExpandidoId] = useState<string | null>(null)
  const [copiadoId, setCopiadoId] = useState<string | null>(null)

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

  // Filtragem específica para maternidade + filtro extra opcional do caller
  const registrosFiltradosFinal = useMemo(() => {
    let resultado = registrosFiltrados

    if (filtrarRegistro) {
      resultado = resultado.filter(filtrarRegistro)
    }

    if (caderneta === 'maternidade') {
      if (filtroSexo) {
        resultado = resultado.filter((r) => r.sexo === filtroSexo)
      }
      if (filtroTipoParto) {
        resultado = resultado.filter((r) => r.tipoParto === filtroTipoParto)
      }
    }

    return resultado
  }, [registrosFiltrados, caderneta, filtroSexo, filtroTipoParto, filtrarRegistro])

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
          // Escopo do registro compartilhado: creep quando a linha carrega só
          // dados de bezerro ao pé (suplementarAdulto=false) ou veio do banco
          // como escopo 'creep'. Categorias e série seguem o mesmo escopo para
          // peso e denominador ficarem na mesma base (adulto ÷ adulto).
          const isCreep = registroParaCompartilhar.suplementarAdulto === false
            || registroParaCompartilhar.escopo === 'creep'
          const categorias = (detalhesLote.categorias_raw || [])
            .filter((c: any) => isCreep ? isCategoriaAoPe(c.categoria) : !isCategoriaAoPe(c.categoria))
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
              && (isCreep
                ? r.suplementarAdulto === false || r.escopo === 'creep' || Number(r.creepKgCocho) > 0
                : r.suplementarAdulto !== false && r.escopo !== 'creep')
          ).map(r => {
            // Linhas "só creep" já carregam os dados do creep nos campos
            // primários; em linhas mistas o creep fica nos campos creep*.
            const linhaCreep = r.suplementarAdulto === false || r.escopo === 'creep'
            const usarCreep = isCreep && !linhaCreep
            return {
              id: r.id,
              data: r.data,
              kg_cocho: usarCreep
                ? (r.creepKgCocho ? Number(r.creepKgCocho) : null)
                : (r.kgCocho ? Number(r.kgCocho) : null),
              kg_deposito: isCreep ? null : (r.kgDeposito ? Number(r.kgDeposito) : null),
              formulacao: usarCreep ? (r.creepFormulacao ?? null) : r.formulacao,
              n_cabecas: usarCreep
                ? (r.creepNCabecas ? Number(r.creepNCabecas) : null)
                : (r.nCabecasLote ? Number(r.nCabecasLote) : null),
              qtd_bezerros: isCreep ? 0 : (r.qtdBezerrosLote ? Number(r.qtdBezerrosLote) : null),
            }
          })

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

  const handleCopiarErro = async (registro: Registro) => {
    const texto = formatSyncErrorForSupport(registro.syncError, caderneta, registro.id)
    try {
      await navigator.clipboard.writeText(texto)
      setCopiadoId(registro.id)
      setTimeout(() => setCopiadoId(null), 2000)
    } catch {
      // Fallback para navegadores sem clipboard API
      const textarea = document.createElement('textarea')
      textarea.value = texto
      document.body.appendChild(textarea)
      textarea.select()
      try { document.execCommand('copy') } catch {}
      document.body.removeChild(textarea)
      setCopiadoId(registro.id)
      setTimeout(() => setCopiadoId(null), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <AppHeader
        title={titulo}
        subtitle="Registros salvos no aparelho"
        variant="centered"
        sticky
        left={
          <button
            onClick={() => navigate(-1)}
            className="header-chip"
            aria-label="Voltar"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
            <span>Voltar</span>
          </button>
        }
        right={
          <span className="header-chip">
            <List className="w-3.5 h-3.5" strokeWidth={2.5} />
            {registrosFiltradosFinal.length}
          </span>
        }
      />

      <main className="flex-1 p-4 flex flex-col gap-3 pb-8 desktop-container">
        {/* Ações principais */}
        <button
          onClick={() => navigate(rotaForm)}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-brand-700 py-4 font-extrabold uppercase tracking-wide text-white shadow-md transition-all active:bg-brand-800 active:scale-[0.99]"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          Novo registro
        </button>

        {extraActions}

        {/* Busca rápida */}
        <div className="app-card flex items-center gap-2.5 px-4">
          <Search className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar nos registros..."
            value={filtros.busca}
            onChange={(e) => setBusca(e.target.value)}
            className="min-h-[48px] flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>

        {/* Período rápido + filtros */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSetPeriodoRapido(p.id)}
              className={`shrink-0 rounded-full px-4 min-h-[40px] text-xs font-bold uppercase tracking-wide transition-colors ${
                periodoAtivo === p.id
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 active:bg-gray-50'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className={`shrink-0 rounded-full px-4 min-h-[40px] text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 transition-colors ${
              temFiltrosAtivos || mostrarFiltros
                ? 'bg-brand-700 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 active:bg-gray-50'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={2.5} />
            Filtros
            {temFiltrosAtivos && <span className="h-2 w-2 rounded-full bg-accent-400" />}
          </button>
          {temFiltrosAtivos && (
            <button
              onClick={limparFiltros}
              className="shrink-0 rounded-full px-4 min-h-[40px] text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 transition-colors active:bg-gray-50"
            >
              <FilterX className="h-4 w-4" strokeWidth={2.5} />
              Limpar
            </button>
          )}
        </div>

        {/* Painel de filtros avançados */}
        {mostrarFiltros && (
          <div className="app-card p-4 flex flex-col gap-3">
            <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wide text-gray-900">
              <SlidersHorizontal className="h-4 w-4 text-brand-700" strokeWidth={2.5} />
              Filtros avançados
            </h3>
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
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Ordenação</label>
              <select
                value={filtros.ordenacao}
                onChange={(e) => setOrdenacao(e.target.value as any)}
                className="w-full min-h-[44px] text-base px-3 py-2 bg-white border border-gray-300 rounded-xl"
              >
                <option value="data_desc">Data (mais recente)</option>
                <option value="data_asc">Data (mais antiga)</option>
              </select>
            </div>

            {caderneta === 'maternidade' && (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Sexo</label>
                  <select
                    value={filtroSexo}
                    onChange={(e) => setFiltroSexo(e.target.value)}
                    className="w-full min-h-[44px] text-base px-3 py-2 bg-white border border-gray-300 rounded-xl"
                  >
                    <option value="">Todos</option>
                    <option value="Macho">Macho ♂️</option>
                    <option value="Fêmea">Fêmea ♀️</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-1.5">Tipo de parto</label>
                  <select
                    value={filtroTipoParto}
                    onChange={(e) => setFiltroTipoParto(e.target.value)}
                    className="w-full min-h-[44px] text-base px-3 py-2 bg-white border border-gray-300 rounded-xl"
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
              <button
                onClick={handleLimparFiltrosCompletos}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-gray-600 transition-colors active:bg-gray-50"
              >
                <FilterX className="h-4 w-4" strokeWidth={2.5} />
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* Lista de registros */}
        {carregando ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-brand-700" />
            <span className="ml-3 text-base font-semibold text-gray-600">Carregando...</span>
          </div>
        ) : registrosFiltradosFinal.length === 0 ? (
          <div className="app-card p-8 text-center">
            <ClipboardList className="mx-auto mb-4 h-14 w-14 text-gray-300" strokeWidth={1.5} />
            <p className="text-lg font-extrabold text-gray-800">
              {registros.length === 0 ? 'Nenhum registro ainda' : 'Nenhum resultado encontrado'}
            </p>
            <p className="text-sm text-gray-500 mt-1.5">
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
                className="app-card p-4"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-base font-bold text-gray-900">
                    {String(registro.data ?? '').startsWith('undefined')
                      ? [registro.dataProducao || registro.dataEntrada, String(registro.data).split(' ')[1]].filter(Boolean).join(' ')
                      : (registro.data as string)}
                  </span>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {(() => {
                      const badgeCfg = CADERNETA_DISPLAY_CONFIG[caderneta]?.cardBadge
                      if (!badgeCfg) return null
                      const raw = registro[badgeCfg.key]
                      if (raw === null || raw === undefined || raw === '') return null
                      const label = badgeCfg.format ? badgeCfg.format(raw, registro) : String(raw).toUpperCase()
                      const tone = BADGE_TONES[badgeCfg.tones?.[String(raw)] ?? 'neutral']
                      return (
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${tone}`}>
                          {label}
                        </span>
                      )
                    })()}
                    {(() => {
                      const meta = SYNC_BADGE[registro.syncStatus ?? 'pending'] ?? SYNC_BADGE.pending
                      const Icon = meta.icon
                      return (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${meta.className}`}>
                          <Icon className="h-3 w-3" strokeWidth={2.5} />
                          {meta.label}
                        </span>
                      )
                    })()}
                  </div>
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
                                  <p className="text-xs font-bold text-brand-700 uppercase tracking-wide mb-1">
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
                        'observacao',
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
                        'qtdSacos',
                        'kgDeposito',
                        'categorias',
                        'suplementarAdulto',
                        'suplementarCreep',
                        'creepFormulacao',
                        'creepLeitura',
                        'creepKgCocho',
                        'creepQtdSacos',
                        'creepNCabecas',
                        'creepCategorias',
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
                          const kg = normalizarNumero(quantidade as any)
                          if (kg !== null && kg > 0) {
                            camposNormais.push([insumo, formatarNumeroBR(kg)])
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
                    } else if (caderneta === 'fabrica-confinamento') {
                      const ordemFabrica = [
                        'ordemTrato',
                        'totalPrevisto',
                        'totalProduzido',
                      ]
                      const labelsFabrica: Record<string, string> = {
                        ordemTrato: 'Trato',
                        totalPrevisto: 'Total Previsto',
                        totalProduzido: 'Total Produzido',
                      }
                      ordemFabrica.forEach(key => {
                        const value = registro[key]
                        if (value !== null && value !== undefined && value !== '') {
                          const label = labelsFabrica[key] || key
                          let displayValue = String(value)
                          if (key === 'totalPrevisto' || key === 'totalProduzido') {
                            const num = Number(String(value).replace(',', '.'))
                            displayValue = `${num.toFixed(1).replace('.', ',')} kg`
                          }
                          if (key === 'ordemTrato') {
                            displayValue = `Trato ${value}`
                          }
                          camposNormais.push([label, displayValue])
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
                    <button
                      onClick={() => handleCompartilhar(registro)}
                      className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-600 transition-colors hover:bg-gray-50 active:bg-gray-100"
                    >
                      <Share2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                      Compartilhar
                    </button>
                  </div>
                  {registro.syncStatus === 'error' && (
                    <>
                      <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                        <button
                          onClick={() => setErroExpandidoId(erroExpandidoId === registro.id ? null : registro.id)}
                          className="flex items-center justify-between w-full text-left"
                        >
                          <span className="text-sm font-semibold text-red-700">
                            {translateSyncError(registro.syncError)}
                          </span>
                          {erroExpandidoId === registro.id
                            ? <ChevronUp className="h-4 w-4 text-red-500" />
                            : <ChevronDown className="h-4 w-4 text-red-500" />}
                        </button>
                        {erroExpandidoId === registro.id && (
                          <div className="mt-2 pt-2 border-t border-red-100">
                            {registro.syncError?.code && (
                              <p className="text-xs text-red-600 mb-1">
                                <span className="font-semibold">Código:</span> {registro.syncError.code}
                              </p>
                            )}
                            {registro.syncError?.message && (
                              <p className="text-xs text-gray-600 mb-1 break-words">
                                <span className="font-semibold">Mensagem:</span> {registro.syncError.message}
                              </p>
                            )}
                            {registro.syncError?.details && (
                              <p className="text-xs text-gray-500 mb-1 break-words">
                                <span className="font-semibold">Detalhes:</span> {registro.syncError.details}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mb-2">
                              <span className="font-semibold">Tentativas:</span> {registro.syncError?.retryCount ?? 1} | <span className="font-semibold">Data:</span> {registro.syncError?.failedAt ? new Date(registro.syncError.failedAt).toLocaleString('pt-BR') : '—'}
                            </p>
                            <button
                              onClick={() => handleCopiarErro(registro)}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200"
                            >
                              {copiadoId === registro.id ? (
                                <><CheckCircle2 className="h-3.5 w-3.5 text-brand-700" /> Copiado</>
                              ) : (
                                <><Copy className="h-3.5 w-3.5" /> Copiar para suporte</>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleReenviar(registro)}
                        disabled={reenviandoId === registro.id}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-colors active:bg-brand-800 disabled:opacity-60"
                      >
                        <RefreshCw className={`h-4 w-4 ${reenviandoId === registro.id ? 'animate-spin' : ''}`} strokeWidth={2.5} />
                        {reenviandoId === registro.id ? 'Enviando...' : 'Reenviar'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de escolha de formato de compartilhamento */}
        {mostrarModalCompartilhar && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setMostrarModalCompartilhar(false)
              setRegistroParaCompartilhar(null)
            }}
          >
            <div
              className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Share2 className="h-12 w-12 text-green-700 mx-auto" />
              <h3 className="text-lg font-black text-gray-900 mt-2">
                Compartilhar registro
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                O registro será formatado como texto para enviar pelo WhatsApp.
              </p>

              <div className="mt-4 flex flex-col gap-2">
                <button
                  onClick={handleCompartilharTexto}
                  className="w-full font-bold px-4 py-3 rounded-2xl bg-green-700 text-white active:bg-green-800 flex items-center justify-center gap-2"
                >
                  <Share2 className="h-5 w-5" />
                  COMPARTILHAR
                </button>
                <button
                  onClick={() => {
                    setMostrarModalCompartilhar(false)
                    setRegistroParaCompartilhar(null)
                  }}
                  className="w-full font-bold px-4 py-3 rounded-2xl border-2 border-gray-300 text-gray-700 bg-gray-100 active:bg-gray-200"
                >
                  CANCELAR
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
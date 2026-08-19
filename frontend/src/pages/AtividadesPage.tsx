import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { requestSyncNow } from '../store/slices/syncSlice'
import { useState, useEffect, useCallback, useRef } from 'react'
import { RootState } from '../store/store'
import {
  ChevronLeft, Clock, CheckCircle, Share2, WifiOff,
  Play, Pause, Coffee, AlertTriangle, RotateCcw, ChevronDown, ChevronUp,
} from 'lucide-react'
import { LOGO_URL, getFarmLogo } from '../utils/constants'
import {
  AtividadeFuncionarioPWA,
  AtividadeSessaoLocal,
  AtividadeImprevistoLocal,
  ImprevistoCategoria,
  TempoCalculado,
  getAtividadesOnlineFirst,
  iniciarAtividadeLocal,
  pausarAtividadeLocal,
  retomarAtividadeLocal,
  concluirAtividadeLocal,
  registrarImprevistoLocal,
  getSessoesLocal,
  getImprevistosLocal,
  calcularTempoLocal,
  getImprevistoCategorias,
  formatarTempo,
  formatarResumoAtividades,
} from '../services/atividadesService'
import { compartilharWhatsApp } from '../utils/shareUtils'
import { enqueueRegistro } from '../services/syncService'

const PRIORIDADE_CORES: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-yellow-400',
  3: 'bg-green-500',
}

const STATUS_ATIVIDADE_CORES: Record<string, string> = {
  pendente: 'bg-gray-100 text-gray-700',
  em_andamento: 'bg-blue-100 text-blue-700',
  concluido: 'bg-green-100 text-green-700',
  atrasado: 'bg-red-100 text-red-700',
  pausada: 'bg-amber-100 text-amber-700',
}

const STATUS_ATIVIDADE_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  atrasado: 'Atrasado',
  pausada: 'Pausada',
}

function formatarDataAtividade(dataInicio: string, dataFim?: string | null): string {
  if (!dataInicio) return ''
  const [, mi, di] = dataInicio.split('-')
  if (!dataFim || dataFim === dataInicio) {
    return `${di}/${mi}`
  }
  const [, mf, df] = dataFim.split('-')
  return `${di}/${mi} - ${df}/${mf}`
}

function formatarHora(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// ============================================================
// Card de atividade com cronometro e acoes
// ============================================================

interface AtividadeCardProps {
  af: AtividadeFuncionarioPWA
  onConcluir: (af: AtividadeFuncionarioPWA) => void
  onImprevisto: (af: AtividadeFuncionarioPWA) => void
  onMutate: () => void
}

function AtividadeCard({ af, onConcluir, onImprevisto, onMutate }: AtividadeCardProps) {
  const dispatch = useDispatch()
  const [tempo, setTempo] = useState<TempoCalculado | null>(null)
  const [sessoes, setSessoes] = useState<AtividadeSessaoLocal[]>([])
  const [imprevistos, setImprevistos] = useState<AtividadeImprevistoLocal[]>([])
  const [expanded, setExpanded] = useState(false)
  const [, setTick] = useState(0)
  const [acting, setActing] = useState(false)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadDetalhes = useCallback(async () => {
    const [t, s, i] = await Promise.all([
      calcularTempoLocal(af.id),
      getSessoesLocal(af.id),
      getImprevistosLocal(af.id),
    ])
    setTempo(t)
    setSessoes(s)
    setImprevistos(i)
  }, [af.id])

  useEffect(() => {
    loadDetalhes()
  }, [loadDetalhes, af.statusIndividual, af.lastModified])

  // Cronometro ao vivo quando em_andamento com sessao aberta
  useEffect(() => {
    if (tempo?.temSessaoAberta) {
      tickRef.current = setInterval(() => setTick((t) => t + 1), 1000)
      return () => {
        if (tickRef.current) clearInterval(tickRef.current)
        tickRef.current = null
      }
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [tempo?.temSessaoAberta])

  const enqueueAndSync = async (store: 'atividade-funcionarios' | 'atividade-sessoes' | 'atividade-imprevistos', id: string, op: 'create' | 'update') => {
    try {
      await enqueueRegistro(store, id, op)
      dispatch(requestSyncNow())
    } catch (err) {
      console.warn('[AtividadesPage] Erro ao enfileirar sync:', err)
    }
  }

  const handleIniciar = async () => {
    if (acting) return
    setActing(true)
    try {
      const updated = await iniciarAtividadeLocal(af)
      await enqueueAndSync('atividade-funcionarios', updated.id, 'update')
      // Enfileirar a sessao criada (buscar a mais recente)
      const s = await getSessoesLocal(updated.id)
      const aberta = s.find((x) => !x.fimAt)
      if (aberta) await enqueueAndSync('atividade-sessoes', aberta.id, 'create')
      onMutate()
    } finally {
      setActing(false)
    }
  }

  const handlePausar = async (trabalhada: boolean, motivo?: string) => {
    if (acting) return
    setActing(true)
    try {
      const updated = await pausarAtividadeLocal(af, trabalhada, motivo)
      // Enfileirar update da sessao fechada (a que estava aberta)
      const s = await getSessoesLocal(updated.id)
      const ultimaFechada = s.filter((x) => x.fimAt).sort((a, b) => (b.fimAt || '').localeCompare(a.fimAt || ''))[0]
      if (ultimaFechada) await enqueueAndSync('atividade-sessoes', ultimaFechada.id, 'update')
      await enqueueAndSync('atividade-funcionarios', updated.id, 'update')
      onMutate()
    } finally {
      setActing(false)
    }
  }

  const handleRetomar = async () => {
    if (acting) return
    setActing(true)
    try {
      const updated = await retomarAtividadeLocal(af)
      await enqueueAndSync('atividade-funcionarios', updated.id, 'update')
      const s = await getSessoesLocal(updated.id)
      const aberta = s.find((x) => !x.fimAt)
      if (aberta) await enqueueAndSync('atividade-sessoes', aberta.id, 'create')
      onMutate()
    } finally {
      setActing(false)
    }
  }

  const handleConcluir = () => {
    onConcluir(af)
  }

  const handleImprevisto = () => {
    onImprevisto(af)
  }

  // Tempo exibido no cronometro: produtivo acumulado + decorrido da sessao aberta
  const tempoExibido = (() => {
    if (!tempo) return 0
    if (tempo.temSessaoAberta && tempo.inicioSessaoAberta) {
      const decorrido = Math.floor((Date.now() - new Date(tempo.inicioSessaoAberta).getTime()) / 1000)
      // produtivoSeg ja inclui o decorrido via calcularTempoLocal, mas como tick muda, recalculamos
      // Porem calcularTempoLocal so roda no loadDetalhes. Para o tick, recalculamos manualmente:
      const fechadoProdutivo = sessoes
        .filter((s) => s.fimAt && s.trabalhada && s.duracaoSegundos != null)
        .reduce((acc, s) => acc + (s.duracaoSegundos || 0), 0)
      return fechadoProdutivo + decorrido
    }
    return tempo.produtivoSeg
  })()

  const temSessoes = sessoes.length > 0
  const temImprevistos = imprevistos.length > 0
  const podeExpandir = af.statusIndividual === 'concluida' && (temSessoes || temImprevistos)

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      {/* Header do card */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 mt-1 ${PRIORIDADE_CORES[af.prioridade] || 'bg-gray-400'}`} />
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-800 text-lg leading-tight">{af.titulo}</h3>
            {af.descricao && (
              <p className="text-base text-gray-600 mt-1 line-clamp-2">{af.descricao}</p>
            )}
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-sm font-medium flex-shrink-0 ${STATUS_ATIVIDADE_CORES[af.statusIndividual] || STATUS_ATIVIDADE_CORES[af.status] || 'bg-gray-100'}`}>
          {STATUS_ATIVIDADE_LABELS[af.statusIndividual] || af.statusIndividual}
        </span>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-2 text-base text-gray-500 mb-3">
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {formatarDataAtividade(af.dataInicio, af.dataFim)}
        </span>
        {af.setorNome && <span>{af.setorNome}</span>}
        {af.local && <span>📍 {af.local}</span>}
      </div>

      {/* Cronometro ao vivo (em_andamento ou pausada com sessoes) */}
      {(af.statusIndividual === 'em_andamento' || af.statusIndividual === 'pausada') && tempo && (
        <div className={`rounded-lg p-3 mb-3 ${af.statusIndividual === 'em_andamento' ? 'bg-blue-50' : 'bg-amber-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tempo produtivo</p>
              <p className={`text-2xl font-bold tabular-nums ${af.statusIndividual === 'em_andamento' ? 'text-blue-700' : 'text-amber-700'}`}>
                {formatarTempo(tempoExibido)}
              </p>
            </div>
            {af.statusIndividual === 'em_andamento' && tempo.temSessaoAberta && (
              <div className="flex items-center gap-1.5 text-blue-600">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-sm font-medium">gravando</span>
              </div>
            )}
            {af.statusIndividual === 'pausada' && (
              <div className="flex items-center gap-1.5 text-amber-600">
                <Pause className="w-4 h-4" />
                <span className="text-sm font-medium">pausada</span>
              </div>
            )}
          </div>
          {tempo.brutoSeg !== tempo.produtivoSeg && (
            <p className="text-xs text-gray-500 mt-1">
              Bruto: {formatarTempo(tempo.brutoSeg)} (inclui pausas não trabalhadas)
            </p>
          )}
          {temImprevistos && (
            <p className="text-xs text-red-600 mt-1 inline-flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {imprevistos.length} imprevisto(s) registrado(s)
            </p>
          )}
        </div>
      )}

      {/* Detalhamento se concluída */}
      {af.statusIndividual === 'concluida' && af.detalhamento && (
        <div className="bg-gray-50 rounded-lg p-2 mb-3">
          <p className="text-base text-gray-500 font-medium mb-1">Detalhamento:</p>
          <p className="text-base text-gray-700">{af.detalhamento}</p>
        </div>
      )}

      {/* Tempo total e resumo de sessoes/imprevistos se concluida */}
      {af.statusIndividual === 'concluida' && tempo && tempo.produtivoSeg > 0 && (
        <div className="bg-green-50 rounded-lg p-2 mb-3">
          <p className="text-sm text-green-700 font-medium">
            ⏱ Tempo produtivo: {formatarTempo(tempo.produtivoSeg)}
            {tempo.brutoSeg !== tempo.produtivoSeg && ` (bruto: ${formatarTempo(tempo.brutoSeg)})`}
          </p>
          {temImprevistos && (
            <p className="text-xs text-red-600 mt-1 inline-flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {imprevistos.length} imprevisto(s)
            </p>
          )}
        </div>
      )}

      {/* Expandir detalhes (sessoes + imprevistos) */}
      {podeExpandir && (
        <div className="mb-3">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-sm text-blue-600 font-medium inline-flex items-center gap-1 hover:underline"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {expanded ? 'Ocultar detalhes' : 'Ver detalhes (sessões e imprevistos)'}
          </button>
          {expanded && (
            <div className="mt-2 space-y-2 text-sm">
              {sessoes.length > 0 && (
                <div>
                  <p className="font-medium text-gray-700 mb-1">Sessões ({sessoes.length}):</p>
                  <ul className="space-y-1">
                    {sessoes.map((s) => (
                      <li key={s.id} className="flex items-center gap-2 text-gray-600">
                        <span className={`w-2 h-2 rounded-full ${s.trabalhada ? 'bg-green-400' : 'bg-amber-400'}`} />
                        <span>{formatarHora(s.inicioAt)} → {s.fimAt ? formatarHora(s.fimAt) : '...'}</span>
                        <span className="font-medium">{s.duracaoSegundos != null ? formatarTempo(s.duracaoSegundos) : 'em andamento'}</span>
                        {s.motivoPausa && <span className="text-gray-400">({s.motivoPausa})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {imprevistos.length > 0 && (
                <div>
                  <p className="font-medium text-gray-700 mb-1">Imprevistos ({imprevistos.length}):</p>
                  <ul className="space-y-1">
                    {imprevistos.map((i) => (
                      <li key={i.id} className="text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-red-500" />
                          <span className="font-medium">{i.tipo}</span>
                          <span className="text-gray-400">· {formatarHora(i.ocorridoAt)}</span>
                        </span>
                        {i.descricao && <p className="ml-4 text-gray-500">{i.descricao}</p>}
                        {i.impactoMinutos != null && <p className="ml-4 text-gray-400 text-xs">Impacto estimado: {i.impactoMinutos}min</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        {(af.statusIndividual === 'pendente' || af.statusIndividual === 'atrasada') && (
          <button
            onClick={handleIniciar}
            disabled={acting}
            className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-base font-medium hover:bg-blue-700 transition-colors min-h-[44px] disabled:opacity-50"
          >
            <Play className="w-4 h-4" />
            Iniciar
          </button>
        )}

        {af.statusIndividual === 'em_andamento' && (
          <>
            <button
              onClick={() => handlePausar(true)}
              disabled={acting}
              className="flex-1 flex items-center justify-center gap-1.5 bg-amber-600 text-white px-3 py-2.5 rounded-lg text-base font-medium hover:bg-amber-700 transition-colors min-h-[44px] disabled:opacity-50"
            >
              <Pause className="w-4 h-4" />
              Pausar
            </button>
            <button
              onClick={() => handlePausar(false, 'Almoço')}
              disabled={acting}
              className="flex items-center justify-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-2.5 rounded-lg text-base font-medium hover:bg-amber-200 transition-colors min-h-[44px] disabled:opacity-50"
              title="Pausar para almoço (não conta como tempo trabalhado)"
            >
              <Coffee className="w-4 h-4" />
              Almoço
            </button>
            <button
              onClick={handleImprevisto}
              className="flex items-center justify-center gap-1.5 bg-red-100 text-red-700 px-3 py-2.5 rounded-lg text-base font-medium hover:bg-red-200 transition-colors min-h-[44px]"
              title="Registrar imprevisto"
            >
              <AlertTriangle className="w-4 h-4" />
              Imprevisto
            </button>
            <button
              onClick={handleConcluir}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white px-4 py-2.5 rounded-lg text-base font-medium hover:bg-green-700 transition-colors min-h-[44px]"
            >
              <CheckCircle className="w-4 h-4" />
              Concluir
            </button>
          </>
        )}

        {af.statusIndividual === 'pausada' && (
          <>
            <button
              onClick={handleRetomar}
              disabled={acting}
              className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-base font-medium hover:bg-blue-700 transition-colors min-h-[44px] disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              Retomar
            </button>
            <button
              onClick={handleImprevisto}
              className="flex items-center justify-center gap-1.5 bg-red-100 text-red-700 px-3 py-2.5 rounded-lg text-base font-medium hover:bg-red-200 transition-colors min-h-[44px]"
              title="Registrar imprevisto"
            >
              <AlertTriangle className="w-4 h-4" />
              Imprevisto
            </button>
            <button
              onClick={handleConcluir}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white px-4 py-2.5 rounded-lg text-base font-medium hover:bg-green-700 transition-colors min-h-[44px]"
            >
              <CheckCircle className="w-4 h-4" />
              Concluir
            </button>
          </>
        )}

        {af.statusIndividual === 'concluida' && (
          <div className="flex items-center justify-center gap-1.5 text-green-600 py-2 text-base font-medium w-full">
            <CheckCircle className="w-4 h-4" />
            Concluída
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Modal de imprevisto
// ============================================================

interface ImprevistoModalProps {
  af: AtividadeFuncionarioPWA | null
  categorias: ImprevistoCategoria[]
  onClose: () => void
  onConfirm: (tipo: string, descricao: string | null, impactoMin: number | null) => void
}

function ImprevistoModal({ af, categorias, onClose, onConfirm }: ImprevistoModalProps) {
  const [tipo, setTipo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [impactoMin, setImpactoMin] = useState('')

  useEffect(() => {
    if (af) {
      setTipo('')
      setDescricao('')
      setImpactoMin('')
    }
  }, [af])

  if (!af) return null

  const handleConfirm = () => {
    if (!tipo.trim()) {
      alert('Selecione a categoria do imprevisto')
      return
    }
    const impacto = impactoMin.trim() ? parseInt(impactoMin, 10) : null
    onConfirm(tipo.trim(), descricao.trim() || null, impacto && !isNaN(impacto) ? impacto : null)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          Registrar Imprevisto
        </h3>
        <p className="text-sm text-gray-600 mb-4">{af.titulo}</p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[44px]"
          >
            <option value="">Selecione...</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.nome}>{c.nome}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={3}
            placeholder="Ex: Chuva forte impediu de continuar..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[80px]"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Impacto estimado em minutos (opcional)</label>
          <input
            type="number"
            inputMode="numeric"
            value={impactoMin}
            onChange={(e) => setImpactoMin(e.target.value)}
            placeholder="Ex: 45"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[44px]"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            className="flex-1 bg-red-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors min-h-[48px]"
          >
            Registrar Imprevisto
          </button>
          <button
            onClick={onClose}
            className="px-4 bg-gray-200 text-gray-700 py-3 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors min-h-[48px]"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Pagina principal
// ============================================================

export default function AtividadesPage() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { fazenda, logoUrl, fazendaId, funcionarioId, funcionarioNome, controleAcessoHabilitado } = useSelector(
    (state: RootState) => state.config
  )
  const [atividades, setAtividades] = useState<AtividadeFuncionarioPWA[]>([])
  const [loading, setLoading] = useState(true)
  const [online, setOnline] = useState(navigator.onLine)
  const [showDetalhamentoModal, setShowDetalhamentoModal] = useState(false)
  const [atividadeParaConcluir, setAtividadeParaConcluir] = useState<AtividadeFuncionarioPWA | null>(null)
  const [detalhamento, setDetalhamento] = useState('')
  const [atividadeParaImprevisto, setAtividadeParaImprevisto] = useState<AtividadeFuncionarioPWA | null>(null)
  const [filtro, setFiltro] = useState<'todas' | 'pendentes' | 'em_andamento' | 'pausadas' | 'concluidas'>('todas')
  const [categorias, setCategorias] = useState<ImprevistoCategoria[]>([])

  const loadAtividades = useCallback(async () => {
    if (!fazendaId || !funcionarioId) {
      setAtividades([])
      setLoading(false)
      return
    }
    try {
      const data = await getAtividadesOnlineFirst(fazendaId, funcionarioId)
      setAtividades(data)
    } catch (err) {
      console.error('[AtividadesPage] Erro ao carregar atividades:', err)
      setAtividades([])
    } finally {
      setLoading(false)
    }
  }, [fazendaId, funcionarioId])

  useEffect(() => {
    loadAtividades()
  }, [loadAtividades])

  useEffect(() => {
    if (!fazendaId) return
    getImprevistoCategorias(fazendaId)
      .then(setCategorias)
      .catch((err) => console.warn('[AtividadesPage] Erro ao carregar categorias:', err))
  }, [fazendaId])

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleOpenConcluir = (af: AtividadeFuncionarioPWA) => {
    setAtividadeParaConcluir(af)
    setDetalhamento('')
    setShowDetalhamentoModal(true)
  }

  const handleConfirmarConclusao = async () => {
    if (!atividadeParaConcluir) return
    const updated = await concluirAtividadeLocal(atividadeParaConcluir, detalhamento.trim() || null)
    setAtividades((prev) => prev.map((a) => (a.id === atividadeParaConcluir.id ? updated : a)))
    try {
      // Enfileirar update do af e das sessoes fechadas
      await enqueueRegistro('atividade-funcionarios', updated.id, 'update')
      const s = await getSessoesLocal(updated.id)
      const ultimaFechada = s.filter((x) => x.fimAt).sort((a, b) => (b.fimAt || '').localeCompare(a.fimAt || ''))[0]
      if (ultimaFechada) await enqueueRegistro('atividade-sessoes', ultimaFechada.id, 'update')
      dispatch(requestSyncNow())
    } catch (err) {
      console.warn('[AtividadesPage] Erro ao enfileirar sync:', err)
    }
    setShowDetalhamentoModal(false)
    setAtividadeParaConcluir(null)
    setDetalhamento('')
  }

  const handleOpenImprevisto = (af: AtividadeFuncionarioPWA) => {
    setAtividadeParaImprevisto(af)
  }

  const handleConfirmarImprevisto = async (tipo: string, descricao: string | null, impactoMin: number | null) => {
    if (!atividadeParaImprevisto) return
    await registrarImprevistoLocal(atividadeParaImprevisto, tipo, descricao, impactoMin)
    try {
      const imprevistos = await getImprevistosLocal(atividadeParaImprevisto.id)
      const ultimo = imprevistos.sort((a, b) => b.ocorridoAt.localeCompare(a.ocorridoAt))[0]
      if (ultimo) {
        await enqueueRegistro('atividade-imprevistos', ultimo.id, 'create')
        dispatch(requestSyncNow())
      }
    } catch (err) {
      console.warn('[AtividadesPage] Erro ao enfileirar sync:', err)
    }
    setAtividadeParaImprevisto(null)
    // Recarregar para atualizar contagem de imprevistos no card
    loadAtividades()
  }

  const handleCompartilhar = async () => {
    const texto = formatarResumoAtividades(atividades)
    await compartilharWhatsApp(texto)
  }

  const ORDEM_STATUS: Record<string, number> = {
    atrasado: 0,
    em_andamento: 1,
    pausada: 2,
    concluida: 3,
    pendente: 4,
  }

  const atividadesFiltradas = atividades
    .filter((a) => {
      if (filtro === 'todas') return true
      if (filtro === 'pendentes') return a.statusIndividual === 'pendente'
      if (filtro === 'em_andamento') return a.statusIndividual === 'em_andamento'
      if (filtro === 'pausadas') return a.statusIndividual === 'pausada'
      if (filtro === 'concluidas') return a.statusIndividual === 'concluida'
      return true
    })
    .sort((a, b) => {
      const oa = ORDEM_STATUS[a.statusIndividual] ?? 99
      const ob = ORDEM_STATUS[b.statusIndividual] ?? 99
      return oa - ob
    })

  // Gate: se RBAC desativado ou sem funcionário logado
  if (!controleAcessoHabilitado || !funcionarioId) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <header className="sticky top-0 z-20 bg-gradient-to-b from-[#23503a] via-[#1d4030] to-[#1a3a2a] text-white shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
          <div className="relative px-3 py-3 desktop-container">
            <button
              onClick={() => navigate('/')}
              className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/20 active:bg-white/25 transition-colors text-white text-xs font-semibold pl-2 pr-3 py-2 min-h-[40px] backdrop-blur-sm"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
              <span>Voltar</span>
            </button>
            <div className="mx-24 sm:mx-0 flex flex-col items-center">
              <h1 className="mt-2 text-lg font-bold leading-tight tracking-tight text-center">ATIVIDADES</h1>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 flex flex-col items-center justify-center desktop-container">
          <div className="bg-white rounded-xl p-8 shadow-md text-center max-w-md">
            <p className="text-lg font-semibold text-gray-800 mb-2">Atividades requer controle de acesso</p>
            <p className="text-sm text-gray-600">
              O controle de acesso por funcionário precisa estar ativado e você precisa estar logado para ver suas atividades.
              Contate o administrador da fazenda.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-gradient-to-b from-[#23503a] via-[#1d4030] to-[#1a3a2a] text-white shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
        <div className="relative px-3 py-3 desktop-container">
          <button
            onClick={() => navigate('/')}
            className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/20 active:bg-white/25 transition-colors text-white text-xs font-semibold pl-2 pr-3 py-2 min-h-[40px] backdrop-blur-sm"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
            <span>Voltar</span>
          </button>
          <div className="mx-24 sm:mx-0 flex flex-col items-center">
            <h1 className="mt-2 text-lg font-bold leading-tight tracking-tight text-center">ATIVIDADES</h1>
            <p className="mt-1 text-sm font-semibold text-white/75 text-center">{funcionarioNome}</p>
            <div className="mt-3 flex items-center justify-center gap-3">
              <img src={LOGO_URL} alt="GestaUp" className="w-10 h-10 object-contain rounded-[16px]" />
              {fazenda && (
                <img
                  src={logoUrl && logoUrl.trim() !== '' ? logoUrl : getFarmLogo(fazenda)}
                  alt="Logo Fazenda"
                  className="h-10 w-auto max-w-[80px] object-contain rounded-[16px]"
                />
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-4 desktop-container">
        {/* Offline banner */}
        {!online && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
            <WifiOff className="w-4 h-4" />
            <span>Offline - alterações serão sincronizadas quando voltar a conexão</span>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {([
            { value: 'todas', label: 'Todas' },
            { value: 'pendentes', label: 'Pendentes' },
            { value: 'em_andamento', label: 'Em Andamento' },
            { value: 'pausadas', label: 'Pausadas' },
            { value: 'concluidas', label: 'Concluídas' },
          ] as const).map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all text-center flex items-center justify-center min-w-[80px] ${
                filtro === f.value
                  ? 'bg-[#23503a] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <span className="text-4xl animate-spin">⏳</span>
            <p className="mt-3 text-sm text-gray-600">Carregando atividades...</p>
          </div>
        ) : atividadesFiltradas.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm text-center">
            <p className="text-gray-600">Nenhuma atividade encontrada</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {atividadesFiltradas.map((af) => (
              <AtividadeCard
                key={af.id}
                af={af}
                onConcluir={handleOpenConcluir}
                onImprevisto={handleOpenImprevisto}
                onMutate={loadAtividades}
              />
            ))}
          </div>
        )}

        {/* Botão compartilhar */}
        {atividades.some((a) => a.statusIndividual === 'concluida') && (
          <button
            onClick={handleCompartilhar}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors min-h-[48px] shadow-md"
          >
            <Share2 className="w-5 h-5" />
            Compartilhar Resumo
          </button>
        )}
      </main>

      {/* Modal de detalhamento (conclusão) */}
      {showDetalhamentoModal && atividadeParaConcluir && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Concluir Atividade</h3>
            <p className="text-sm text-gray-600 mb-4">{atividadeParaConcluir.titulo}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descreva o que foi feito (opcional)
              </label>
              <textarea
                value={detalhamento}
                onChange={(e) => setDetalhamento(e.target.value)}
                rows={4}
                autoFocus
                placeholder=""
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[100px]"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmarConclusao}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors min-h-[48px]"
              >
                Confirmar Conclusão
              </button>
              <button
                onClick={() => { setShowDetalhamentoModal(false); setAtividadeParaConcluir(null); setDetalhamento('') }}
                className="px-4 bg-gray-200 text-gray-700 py-3 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors min-h-[48px]"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de imprevisto */}
      <ImprevistoModal
        af={atividadeParaImprevisto}
        categorias={categorias}
        onClose={() => { setAtividadeParaImprevisto(null) }}
        onConfirm={handleConfirmarImprevisto}
      />
    </div>
  )
}

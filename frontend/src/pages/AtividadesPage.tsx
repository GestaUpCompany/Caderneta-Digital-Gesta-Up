import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { requestSyncNow } from '../store/slices/syncSlice'
import { useState, useEffect, useCallback, useRef } from 'react'
import { RootState } from '../store/store'
import { ChevronLeft, Clock, CheckCircle, PlayCircle, Share2, WifiOff } from 'lucide-react'
import { LOGO_URL, getFarmLogo } from '../utils/constants'
import {
  AtividadeFuncionarioPWA,
  getAtividadesOnlineFirst,
  marcarEmAndamentoLocal,
  marcarConcluidaLocal,
  formatarResumoAtividades,
} from '../services/atividadesService'
import { compartilharWhatsApp } from '../utils/shareUtils'
import { enqueueRegistro } from '../services/syncService'

const PRIORIDADE_CORES: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-yellow-400',
  3: 'bg-green-500',
}

const STATUS_INDIVIDUAL_CORES: Record<string, string> = {
  pendente: 'bg-gray-100 text-gray-700',
  em_andamento: 'bg-blue-100 text-blue-700',
  concluida: 'bg-green-100 text-green-700',
}

const STATUS_INDIVIDUAL_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
}

const STATUS_ATIVIDADE_CORES: Record<string, string> = {
  pendente: 'bg-gray-100 text-gray-700',
  em_andamento: 'bg-blue-100 text-blue-700',
  concluido: 'bg-green-100 text-green-700',
  atrasado: 'bg-red-100 text-red-700',
}

const STATUS_ATIVIDADE_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluido: 'Concluído',
  atrasado: 'Atrasado',
}

function formatarSemana(dataInicio: string): string {
  if (!dataInicio) return ''
  const [y, m, d] = dataInicio.split('-')
  const dt = new Date(Number(y), Number(m) - 1, Number(d))
  const fim = new Date(dt)
  fim.setDate(dt.getDate() + 6)
  const di = d
  const mi = m
  const df = fim.toISOString().split('T')[0].split('-')[2]
  const mf = fim.toISOString().split('T')[0].split('-')[1]
  return `${di}/${mi} - ${df}/${mf}`
}

function formatarTempo(segundos: number | null): string {
  if (!segundos) return '-'
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  if (h > 0) return `${h}h ${m}min`
  return `${m}min`
}

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
  const [filtro, setFiltro] = useState<'todas' | 'pendentes' | 'em_andamento' | 'concluidas'>('todas')
  const [pendingConfirmId, setPendingConfirmId] = useState<string | null>(null)
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleIniciarClick = (af: AtividadeFuncionarioPWA) => {
    if (pendingConfirmId === af.id) {
      // Segundo toque: confirmar
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current)
        confirmTimeoutRef.current = null
      }
      setPendingConfirmId(null)
      handleMarcarEmAndamento(af)
    } else {
      // Primeiro toque: mostrar confirmação
      setPendingConfirmId(af.id)
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current)
      confirmTimeoutRef.current = setTimeout(() => {
        setPendingConfirmId(null)
        confirmTimeoutRef.current = null
      }, 3000)
    }
  }

  const handleCancelarConfirm = () => {
    if (confirmTimeoutRef.current) {
      clearTimeout(confirmTimeoutRef.current)
      confirmTimeoutRef.current = null
    }
    setPendingConfirmId(null)
  }

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current)
    }
  }, [])

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
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleMarcarEmAndamento = async (af: AtividadeFuncionarioPWA) => {
    const updated = await marcarEmAndamentoLocal(af)
    setAtividades((prev) => prev.map((a) => (a.id === af.id ? updated : a)))
    // Enfileirar sync e disparar imediatamente
    try {
      await enqueueRegistro('atividade-funcionarios', af.id, 'update')
      dispatch(requestSyncNow())
    } catch (err) {
      console.warn('[AtividadesPage] Erro ao enfileirar sync:', err)
    }
  }

  const handleOpenConcluir = (af: AtividadeFuncionarioPWA) => {
    setAtividadeParaConcluir(af)
    setDetalhamento('')
    setShowDetalhamentoModal(true)
  }

  const handleConfirmarConclusao = async () => {
    if (!atividadeParaConcluir) return
    if (!detalhamento.trim()) {
      alert('Descreva o que foi feito para concluir a atividade')
      return
    }
    const updated = await marcarConcluidaLocal(atividadeParaConcluir, detalhamento.trim())
    setAtividades((prev) => prev.map((a) => (a.id === atividadeParaConcluir.id ? updated : a)))
    try {
      await enqueueRegistro('atividade-funcionarios', atividadeParaConcluir.id, 'update')
      dispatch(requestSyncNow())
    } catch (err) {
      console.warn('[AtividadesPage] Erro ao enfileirar sync:', err)
    }
    setShowDetalhamentoModal(false)
    setAtividadeParaConcluir(null)
    setDetalhamento('')
  }

  const handleCompartilhar = async () => {
    const texto = formatarResumoAtividades(atividades)
    await compartilharWhatsApp(texto)
  }

  const atividadesFiltradas = atividades.filter((a) => {
    if (filtro === 'todas') return true
    if (filtro === 'pendentes') return a.statusIndividual === 'pendente'
    if (filtro === 'em_andamento') return a.statusIndividual === 'em_andamento'
    if (filtro === 'concluidas') return a.statusIndividual === 'concluida'
    return true
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
                  className="h-10 w-auto max-w-[80px] object-contain"
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
        <div className="flex gap-2 overflow-x-auto pb-1">
          {([
            { value: 'todas', label: 'Todas' },
            { value: 'pendentes', label: 'Pendentes' },
            { value: 'em_andamento', label: 'Em Andamento' },
            { value: 'concluidas', label: 'Concluídas' },
          ] as const).map((f) => (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filtro === f.value
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 border border-gray-200'
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
              <div key={af.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                {/* Header do card */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1.5 ${PRIORIDADE_CORES[af.prioridade] || 'bg-gray-400'}`} />
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm leading-tight">{af.titulo}</h3>
                      {af.descricao && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{af.descricao}</p>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_ATIVIDADE_CORES[af.status] || 'bg-gray-100'}`}>
                    {STATUS_ATIVIDADE_LABELS[af.status] || af.status}
                  </span>
                </div>

                {/* Meta */}
                <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatarSemana(af.dataInicio)}
                  </span>
                  {af.setorNome && <span>{af.setorNome}</span>}
                  {af.equipeNome && <span>Equipe: {af.equipeNome}</span>}
                </div>

                {/* Status individual */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_INDIVIDUAL_CORES[af.statusIndividual] || 'bg-gray-100'}`}>
                    {STATUS_INDIVIDUAL_LABELS[af.statusIndividual] || af.statusIndividual}
                  </span>
                  {af.tempoGastoSegundos && (
                    <span className="text-xs text-gray-500">Tempo: {formatarTempo(af.tempoGastoSegundos)}</span>
                  )}
                </div>

                {/* Detalhamento se concluída */}
                {af.statusIndividual === 'concluida' && af.detalhamento && (
                  <div className="bg-gray-50 rounded-lg p-2 mb-3">
                    <p className="text-xs text-gray-500 font-medium mb-1">Detalhamento:</p>
                    <p className="text-xs text-gray-700">{af.detalhamento}</p>
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2">
                  {af.statusIndividual === 'pendente' && (
                    pendingConfirmId === af.id ? (
                      <div className="flex-1 flex gap-2">
                        <button
                          onClick={() => handleIniciarClick(af)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors min-h-[44px] animate-pulse"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Confirmar Início
                        </button>
                        <button
                          onClick={handleCancelarConfirm}
                          className="px-3 bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors min-h-[44px]"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleIniciarClick(af)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors min-h-[44px]"
                      >
                        <PlayCircle className="w-4 h-4" />
                        Iniciar
                      </button>
                    )
                  )}
                  {af.statusIndividual === 'em_andamento' && (
                    <button
                      onClick={() => handleOpenConcluir(af)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors min-h-[44px]"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Concluir
                    </button>
                  )}
                  {af.statusIndividual === 'atrasada' && (
                    pendingConfirmId === af.id ? (
                      <div className="flex-1 flex gap-2">
                        <button
                          onClick={() => handleIniciarClick(af)}
                          className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors min-h-[44px] animate-pulse"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Confirmar Início
                        </button>
                        <button
                          onClick={handleCancelarConfirm}
                          className="px-3 bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors min-h-[44px]"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleIniciarClick(af)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors min-h-[44px]"
                      >
                        <PlayCircle className="w-4 h-4" />
                        Iniciar (Atrasada)
                      </button>
                    )
                  )}
                  {af.statusIndividual === 'concluida' && (
                    <div className="flex-1 flex items-center justify-center gap-1.5 text-green-600 py-2.5 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Concluída
                    </div>
                  )}
                </div>
              </div>
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

      {/* Modal de detalhamento */}
      {showDetalhamentoModal && atividadeParaConcluir && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Concluir Atividade</h3>
            <p className="text-sm text-gray-600 mb-4">{atividadeParaConcluir.titulo}</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descreva o que foi feito *
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
    </div>
  )
}

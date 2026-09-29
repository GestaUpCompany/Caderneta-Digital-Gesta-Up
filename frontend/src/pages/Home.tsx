import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '../components/ui'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../store/store'
import { setConfig } from '../store/slices/configSlice'
import { ClipboardList, Sun, Moon, Settings, ChevronRight, RefreshCw, Loader2, UserRound, AlertTriangle, Check, NotebookPen, ListChecks, Users, FileBarChart, Map, ListTodo } from 'lucide-react'
import { CADERNETAS } from '../utils/constants'
import AppHeader from '../components/AppHeader'
import { getRecentCadernetas } from '../utils/recentCadernetas'

import { VERSICULOS, Versiculo } from '../config/versiculos'
import { getFazendaByAcessoId } from '../services/supabaseService'
import { syncAllCadastroData, setCadastroCacheTimestamp, getCadastroCacheTimestamp, PENDING_SYNC_ERROR_MSG } from '../services/cadastroCache'
import { setCadastroSyncState } from '../services/cadastroSyncState'
import { getSyncQueue } from '../services/indexedDB'
import { setPendingCount } from '../store/slices/syncSlice'
import {
  shouldInvalidateCache,
  setRbacVersaoCache,
  clearFuncionariosCache,
} from '../services/funcionarioAuthService'
import FuncionarioLoginModal from '../components/FuncionarioLoginModal'
import LongPressButton from '../components/LongPressButton'
import { useFuncionarioAuth } from '../hooks/useFuncionarioAuth'
import { useAppLock } from '../hooks/useAppLock'
import { useExpediente } from '../hooks/useExpediente'
import { useCadastroSyncState } from '../hooks/useCadastroSyncState'

export default function Home() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { configurado, fazenda, usuario, acessoId, fazendaId, controleAcessoHabilitado, expedienteHabilitado, expedienteTimezone, expedienteDias } = useSelector((state: RootState) => state.config)
  const pendingSyncCount = useSelector((state: RootState) => state.sync.pendingCount)
  const { active: cadastroSyncActive } = useCadastroSyncState()
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; item: string } | null>(null)
  const [syncErrors, setSyncErrors] = useState<string[]>([])
  const [completedItems, setCompletedItems] = useState<string[]>([])
  const LAST_SYNC_KEY = 'ultimo-aquecimento-cache'
  // Timestamp numérico da última atualização (manual ou SW em background).
  // Atualizado no mount, após sync manual, e quando o SW notifica BG_CACHE_UPDATED.
  const [cacheTimestamp, setCacheTimestamp] = useState<number | null>(() => getCadastroCacheTimestamp())

  // Formata timestamp como "há X min" / "há X h" / "há X dias"
  function formatTimeAgo(ts: number): string {
    const diffMs = Date.now() - ts
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'agora mesmo'
    if (diffMin < 60) return `há ${diffMin} min`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `há ${diffH}h`
    const diffDays = Math.floor(diffH / 24)
    return `há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`
  }

  // Cor do indicador: verde (<1h), neutro (<12h), amarelo (>12h ou sem dados)
  function getTimestampColor(ts: number | null): string {
    if (!ts) return 'text-amber-600'
    const diffMin = (Date.now() - ts) / 60000
    if (diffMin < 60) return 'text-green-600'
    if (diffMin < 720) return 'text-gray-600'
    return 'text-amber-600'
  }

  // Quando a fila de sync zera, remove o aviso de "registros pendentes":
  // sem isso o card de erro ficava preso na tela mesmo depois do sync em
  // background resolver a pendência.
  useEffect(() => {
    if (pendingSyncCount === 0) {
      setSyncErrors((prev) => prev.filter((e) => e !== PENDING_SYNC_ERROR_MSG))
    }
  }, [pendingSyncCount])

  // Atualizar timestamp periodicamente (a cada minuto) para refletir "há X min"
  useEffect(() => {
    const interval = setInterval(() => {
      setCacheTimestamp(getCadastroCacheTimestamp())
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  // Listener: SW terminou cache em background (Periodic Sync ou Background Sync).
  // Atualiza o timestamp do indicador para refletir a atualização automática.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BG_CACHE_UPDATED') {
        setCacheTimestamp(event.data.timestamp || Date.now())
      }
    }
    navigator.serviceWorker.addEventListener('message', handleSWMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage)
  }, [])

  // Buscar logoUrl diretamente do banco usando acessoId
  useEffect(() => {
    async function fetchLogoUrl() {
      if (!acessoId || !configurado) {
        return
      }

      try {
        const fazendaData = await getFazendaByAcessoId(acessoId)
        if (fazendaData?.logo_url) {
          dispatch(setConfig({ logoUrl: fazendaData.logo_url }))
        }
      } catch (error) {
        console.error('[Home] Error fetching fazenda:', error)
      }
    }

    fetchLogoUrl()
  }, [acessoId, configurado])

  // Verificar primeiro acesso e redirecionar automaticamente
  useEffect(() => {
    if (!configurado) {
      const primeiroAcesso = localStorage.getItem('primeiro-acesso')

      if (!primeiroAcesso) {
        // Marcar que o primeiro acesso foi feito
        localStorage.setItem('primeiro-acesso', 'true')

        // Redirecionar automaticamente para configurações
        navigate('/configuracoes')
      }
    }
  }, [navigate, configurado])

  // Lógica de saudação contextual
  const [greeting, setGreeting] = useState('')
  const [greetingIcon, setGreetingIcon] = useState(<Sun />)

  const [ultimaCaderneta, setUltimaCaderneta] = useState<typeof CADERNETAS[0] | null>(null)
  const [versiculoDoDia, setVersiculoDoDia] = useState<Versiculo | null>(null)
  const [showTrocarHint, setShowTrocarHint] = useState(false)

  const {
    rbacAtivo,
    rbacMisconfigured,
    funcionarioLogado,
    funcionariosDisponiveis,
    showLogin,
    login,
    logout,
    refreshFuncionarios,
  } = useFuncionarioAuth()

  const {
    locked,
    lastFuncionario,
    loading: appLockLoading,
    switchUser,
  } = useAppLock({
    fazendaId: fazendaId || '',
    funcionarioLogado,
    funcionariosDisponiveis,
    onLogin: login,
    onLogout: logout,
  })

  // Override de expediente do funcionario logado (vem da lista fresca, nao do Redux)
  const funcionarioFresh = funcionariosDisponiveis.find(f => f.id === funcionarioLogado?.id)
  const { expedienteAtivo, dentroExpediente, expedienteDia } = useExpediente(
    expedienteHabilitado,
    expedienteTimezone,
    expedienteDias,
    funcionarioFresh?.expediente_override ?? null,
    rbacAtivo,
  )

  // Quando o expediente acaba e o funcionario estava logado, mostra tela de bloqueio.
  // Nao faz logout automatico: o funcionario permanece logado e o app desbloqueia sozinho
  // quando o horario permite novamente. Isto evita loop de login/logout quando o
  // funcionario tem override que difere do expediente da fazenda.

  const handleLogout = useCallback(() => {
    logout()
    switchUser()
  }, [logout, switchUser])

  const atualizarControleAcesso = useCallback(async () => {
    if (!acessoId || !configurado) return
    try {
      const fazendaData = await getFazendaByAcessoId(acessoId)
      if (fazendaData && typeof fazendaData.controle_acesso_habilitado === 'boolean') {
        dispatch(setConfig({
          controleAcessoHabilitado: fazendaData.controle_acesso_habilitado,
          acessoConfinamento: fazendaData.acesso_confinamento || false,
          acessoComercial: fazendaData.acesso_comercial || false,
          travaSuplementacao: fazendaData.trava_suplementacao || false,
          expedienteHabilitado: !!fazendaData.expediente_habilitado,
          expedienteTimezone: fazendaData.expediente_timezone || 'America/Cuiaba',
          expedienteDias: fazendaData.expediente_dias || null,
        }))

        // Verifica se a versão de RBAC mudou desde a última checagem.
        // Se mudou, invalida o cache de funcionários e recarrega a lista.
        const versaoAtual = typeof fazendaData.rbac_versao === 'number' ? fazendaData.rbac_versao : 0
        const shouldInvalidate = await shouldInvalidateCache(versaoAtual)
        if (shouldInvalidate) {
          await clearFuncionariosCache()
          await setRbacVersaoCache(versaoAtual)
          refreshFuncionarios()
        }
      }
    } catch (error) {
      console.error('[Home] Erro ao buscar config de controle de acesso:', error)
    }
  }, [acessoId, configurado, dispatch, refreshFuncionarios])

  useEffect(() => {
    atualizarControleAcesso()
  }, [atualizarControleAcesso])

  // Interval periódico para cobrir o caso de app em foreground contínuo.
  // O visibilitychange não dispara se o app nunca vai para background.
  // Quando bloqueado por expediente, polling a cada 30s para detectar liberação rápida.
  // Caso contrário, a cada 10 minutos para não sobrecarregar o banco.
  useEffect(() => {
    if (!acessoId || !configurado) return
    const bloqueadoPorExpediente = expedienteAtivo && !dentroExpediente
    const intervalMs = bloqueadoPorExpediente ? 30 * 1000 : 10 * 60 * 1000
    const interval = setInterval(() => {
      atualizarControleAcesso()
    }, intervalMs)
    return () => clearInterval(interval)
  }, [acessoId, configurado, atualizarControleAcesso, expedienteAtivo, dentroExpediente])

  // Revalida RBAC quando o app volta de background
  useEffect(() => {
    function handleVisibility() {
      if (!document.hidden) {
        atualizarControleAcesso()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [atualizarControleAcesso])

  // Revalida expediente e RBAC quando o SW termina cache em background
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BG_CACHE_UPDATED') {
        atualizarControleAcesso()
      }
    }
    navigator.serviceWorker.addEventListener('message', handleSWMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage)
  }, [atualizarControleAcesso])

  const handleSync = async () => {
    if (!fazendaId || syncing) return

    setSyncing(true)
    setSyncProgress(null)
    setSyncErrors([])
    setCompletedItems([])
    setCadastroSyncState({ active: true, current: 0, total: 0, item: '' })

    try {
      const result = await syncAllCadastroData(fazendaId, (current, total, item) => {
        setSyncProgress({ current, total, item })
        setCadastroSyncState({ current, total, item })
        setCompletedItems(prev => {
          const next = [...prev, item]
          // Manter apenas os últimos 5 itens para não poluir a UI
          return next.slice(-5)
        })
      })

      if (result.errors.length > 0) {
        setSyncErrors(result.errors)
      } else {
        const now = new Date()
        const timestamp = now.toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit',
          hour: '2-digit', minute: '2-digit'
        })
        localStorage.setItem(LAST_SYNC_KEY, timestamp)
        setCadastroCacheTimestamp()
        setCacheTimestamp(Date.now())
      }

      // Atualiza config de expediente e RBAC junto com o sync manual
      await atualizarControleAcesso()
    } catch (error) {
      console.error('Erro ao sincronizar:', error)
      setSyncErrors(['Erro geral de sincronização'])
    } finally {
      setSyncing(false)
      setSyncProgress(null)
      setCadastroSyncState({ active: false, current: 0, total: 0, item: '' })
      // Reflete no Redux o estado da fila após o drain feito pelo
      // syncAllCadastroData, sem esperar o próximo tick do useSync.
      getSyncQueue()
        .then((queue) => dispatch(setPendingCount(queue.length)))
        .catch(() => {})
    }
  }

  useEffect(() => {
    const now = new Date()
    const hour = now.getHours()

    // Saudação baseada no horário
    if (hour >= 5 && hour < 12) {
      setGreeting('Bom dia')
      setGreetingIcon(<Sun className="text-yellow-500" />)
    } else if (hour >= 12 && hour < 18) {
      setGreeting('Boa tarde')
      setGreetingIcon(<Sun className="text-orange-500" />)
    } else {
      setGreeting('Boa noite')
      setGreetingIcon(<Moon className="text-blue-400" />)
    }

    // Última caderneta acessada (mesma fonte do menu: recentCadernetas)
    const recentId = getRecentCadernetas()[0]
    setUltimaCaderneta(CADERNETAS.find(c => c.id === recentId && c.disponivel) || null)

    // Lógica de versículos
    const STORAGE_KEY = 'versiculo-do-dia'
    const DATA_KEY = 'versiculo-data'
    
    const hoje = now.toDateString() // Ex: "Mon Apr 27 2026"
    const dataSalva = localStorage.getItem(DATA_KEY)
    const versiculoSalvo = localStorage.getItem(STORAGE_KEY)
    
    // Se a data mudou ou não há versículo salvo, escolher novo
    if (dataSalva !== hoje || !versiculoSalvo) {
      const versiculosExibidos = JSON.parse(localStorage.getItem('versiculos-exibidos') || '[]')
      
      // Se todos os versículos foram exibidos, reiniciar o ciclo
      if (versiculosExibidos.length >= VERSICULOS.length) {
        localStorage.setItem('versiculos-exibidos', JSON.stringify([]))
      }
      
      // Carregar versículos já exibidos atualizados
      const versiculosExibidosAtualizados = JSON.parse(localStorage.getItem('versiculos-exibidos') || '[]')
      
      // Encontrar o próximo versículo não exibido
      const versiculosDisponiveis = VERSICULOS.filter((_, index) => !versiculosExibidosAtualizados.includes(index))
      
      if (versiculosDisponiveis.length > 0) {
        const proximoVersiculo = versiculosDisponiveis[0]
        const proximoIndex = VERSICULOS.indexOf(proximoVersiculo)
        
        setVersiculoDoDia(proximoVersiculo)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(proximoVersiculo))
        localStorage.setItem(DATA_KEY, hoje)
        
        // Marcar como exibido
        versiculosExibidosAtualizados.push(proximoIndex)
        localStorage.setItem('versiculos-exibidos', JSON.stringify(versiculosExibidosAtualizados))
      }
    } else {
      // Usar versículo salvo do mesmo dia
      setVersiculoDoDia(JSON.parse(versiculoSalvo))
    }
  }, [])

  const MODULOS = [
    { label: 'Cadernetas', desc: 'Registros de campo', icon: NotebookPen, iconColor: 'text-green-600', tint: 'bg-green-50', path: '/modulos/cadernetas' },
    { label: 'Checklists', desc: 'Rotinas e verificações', icon: ListChecks, iconColor: 'text-orange-500', tint: 'bg-orange-50', path: '/modulos/checklists' },
    { label: 'Cadastros', desc: 'Fazenda e equipe', icon: Users, iconColor: 'text-blue-600', tint: 'bg-blue-50', path: '/configuracoes' },
    { label: 'Relatórios', desc: 'Análises e PDFs', icon: FileBarChart, iconColor: 'text-violet-600', tint: 'bg-violet-50', path: '/modulos/relatorios' },
    { label: 'Mapa da fazenda', desc: 'Pastos e cercas', icon: Map, iconColor: 'text-cyan-600', tint: 'bg-cyan-50', path: '/mapa-fazenda' },
  ]

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <AppHeader
        variant="start"
        title={
          configurado && usuario ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="flex items-center [&>svg]:w-4 [&>svg]:h-4">{greetingIcon}</span>
              <span>{greeting}, {usuario}</span>
            </span>
          ) : (
            "Manej'Us 360"
          )
        }
        subtitle={
          fazenda
            ? fazenda.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
            : "Gesta'Up"
        }
        right={
          <div className="flex items-center gap-2">
            {rbacAtivo && (
              <LongPressButton
                onLongPress={() => {
                  setShowTrocarHint(false)
                  handleLogout()
                }}
                onClick={() => setShowTrocarHint(true)}
                ariaLabel="Trocar funcionário"
                className="header-chip select-none"
              >
                <UserRound className="w-4 h-4" strokeWidth={2.5} />
              </LongPressButton>
            )}
            <button
              onClick={() => navigate('/configuracoes')}
              className="header-chip"
              aria-label="Configurações"
            >
              <Settings className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        }
      />

      <main className="flex-1 p-4 flex flex-col gap-4 desktop-container">
        {showTrocarHint && rbacAtivo && (
          <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            Toque e segure o botão de usuário no topo para trocar de funcionário.
          </p>
        )}

        {/* Status de sincronização */}
        {configurado && fazendaId && !cadastroSyncActive && (
          <div className={`app-card p-4 ${syncErrors.length > 0 ? 'border-red-200 bg-red-50/60' : ''}`}>
            {syncing ? (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-700 flex-shrink-0" />
                  <p className="text-sm font-semibold text-gray-900">Atualizando dados para uso offline...</p>
                </div>
                {syncProgress && (
                  <>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300 max-w-full min-w-1"
                        style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                      />
                    </div>
                    {completedItems.length > 0 && (
                      <div className="space-y-1 mb-3 min-w-0">
                        {completedItems.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                            <Check className="w-4 h-4 text-green-600 flex-shrink-0" strokeWidth={3} />
                            <span className="break-words min-w-0">{item}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-700 min-w-0">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse flex-shrink-0" />
                      <span className="break-words min-w-0">{syncProgress.item}</span>
                    </div>

                    {/* Aviso para não fechar o app */}
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-800 font-bold">
                        Não feche o app até aparecer "Dados atualizados com sucesso". Caso contrário, os dados não estarão completos ao sair ao pasto.
                      </p>
                    </div>
                  </>
                )}
              </>
            ) : syncErrors.length > 0 ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm font-semibold text-red-900">Erros na sincronização</p>
                </div>
                <ul className="text-sm text-red-700 space-y-1 mb-3">
                  {syncErrors.map((error, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-red-500">•</span>
                      {error}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleSync}
                  className="w-full bg-brand-800 text-white font-bold py-2.5 rounded-xl text-sm min-h-[44px] flex items-center justify-center gap-2 active:bg-brand-900 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  TENTAR NOVAMENTE
                </button>
              </>
            ) : (() => {
              const hoursSinceUpdate = cacheTimestamp ? (Date.now() - cacheTimestamp) / 3600000 : 999
              const isCritical = hoursSinceUpdate >= 48
              const isStale = hoursSinceUpdate >= 24
              const dotColor = isCritical ? 'bg-red-500' : isStale ? 'bg-amber-500' : 'bg-green-500'
              return (
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">
                      {cacheTimestamp ? (
                        <>Dados atualizados <span className={`font-semibold ${getTimestampColor(cacheTimestamp)}`}>{formatTimeAgo(cacheTimestamp)}</span></>
                      ) : (
                        <span className="font-semibold text-red-700">Dados nunca atualizados</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {isCritical
                        ? 'Atualize agora para trabalhar offline.'
                        : isStale
                        ? 'Dados desatualizados. Atualize antes de sair.'
                        : 'Atualize antes de sair ao pasto sem sinal.'}
                    </p>
                  </div>
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex-shrink-0 bg-brand-800 text-white font-bold px-4 rounded-xl text-sm min-h-[44px] flex items-center gap-2 active:bg-brand-900 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                    ATUALIZAR
                  </button>
                </div>
              )
            })()}
          </div>
        )}

        {/* Continuar de onde parou */}
        {configurado && fazenda && ultimaCaderneta && (
          <button
            onClick={() => navigate(`/caderneta/${ultimaCaderneta.id}`)}
            className="app-card w-full p-3.5 flex items-center gap-3 text-left transition-transform active:scale-[0.98] animate-fade-in"
          >
            <div className="w-11 h-11 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center flex-shrink-0">
              <ClipboardList className="w-5 h-5 text-green-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-green-700">
                Continue de onde parou
              </p>
              <p className="text-sm font-bold text-gray-900 truncate">
                {ultimaCaderneta.label}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </button>
        )}
        {!configurado ? (
          <div className="app-card p-8 text-center animate-fade-in">
            <div className="w-16 h-16 bg-brand-50 border border-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Settings className="w-8 h-8 text-brand-700" />
            </div>
            <p className="text-xl font-extrabold text-gray-900 mb-2">
              Configuração necessária
            </p>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Configure sua fazenda para começar a usar o sistema e acessar todas as funcionalidades das cadernetas.
            </p>
            <Button 
              onClick={() => navigate('/configuracoes')} 
              variant="primary"
              size="md"
            >
              IR PARA CONFIGURAÇÕES
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 animate-fade-in">
            {MODULOS.map((modulo) => (
              <button
                key={modulo.path}
                onClick={() => navigate(modulo.path)}
                className="app-card flex flex-col items-center justify-center gap-1.5 p-4 min-h-[136px] text-center transition-transform active:scale-[0.97]"
              >
                <div className={`w-16 h-16 rounded-2xl ${modulo.tint} flex items-center justify-center mb-1`}>
                  <modulo.icon className={`w-7 h-7 ${modulo.iconColor}`} strokeWidth={2} />
                </div>
                <span className="text-sm font-bold text-gray-900 leading-tight">
                  {modulo.label}
                </span>
                <span className="text-[11px] font-medium text-gray-500 leading-tight">
                  {modulo.desc}
                </span>
              </button>
            ))}

            {/* Atividades (só aparece se RBAC ativo e funcionário logado) */}
            {controleAcessoHabilitado && funcionarioLogado && (
              <button
                onClick={() => navigate('/atividades')}
                className="app-card flex flex-col items-center justify-center gap-1.5 p-4 min-h-[136px] text-center transition-transform active:scale-[0.97]"
              >
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-1">
                  <ListTodo className="w-7 h-7 text-indigo-600" strokeWidth={2} />
                </div>
                <span className="text-sm font-bold text-gray-900 leading-tight">
                  Atividades
                </span>
                <span className="text-[11px] font-medium text-gray-500 leading-tight">
                  Tarefas do dia
                </span>
              </button>
            )}
          </div>
        )}
      </main>

      {/* Tela de bloqueio quando RBAC está habilitado mas nenhum funcionário tem acesso configurado */}
      {rbacMisconfigured && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-brand-900 p-6 text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-black text-white mb-2">Controle de acesso ativado</h2>
          <p className="text-sm text-accent-400 font-semibold mb-4">
            Nenhum funcionário com acesso ao app foi encontrado.
          </p>
          <p className="text-xs text-gray-300 max-w-sm">
            Peça ao administrador para cadastrar pelo menos um funcionário com acesso ao app e PIN configurado, ou desativar o controle de acesso na fazenda.
          </p>
          <button
            onClick={() => navigate('/configuracoes')}
            className="mt-6 bg-accent-400 text-brand-900 font-bold px-6 py-3 rounded-xl active:bg-accent-300 transition-colors"
          >
            Ir para Configurações
          </button>
        </div>
      )}

      {/* Bloqueio por fora de expediente - so mostra quando funcionario esta logado */}
      {!appLockLoading && expedienteAtivo && !dentroExpediente && funcionarioLogado && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-brand-900 p-6">
          <div className="text-5xl mb-4">⏰</div>
          <h2 className="text-xl font-black text-white mb-2">Fora do expediente</h2>
          <p className="text-sm text-accent-400 font-semibold mb-4 text-center max-w-sm">
            {expedienteDia
              ? `O expediente de hoje é das ${expedienteDia.inicio} às ${expedienteDia.fim}.`
              : 'Não há expediente hoje.'}
          </p>
          <p className="text-xs text-gray-300 max-w-sm text-center">
            Volte dentro do horário de atividade para acessar o app.
          </p>
        </div>
      )}

      {/* Login de funcionário quando RBAC está ativo */}
      {!appLockLoading && showLogin && funcionariosDisponiveis.length > 0 && !locked && (
        <FuncionarioLoginModal
          funcionarios={funcionariosDisponiveis}
          fazendaId={fazendaId || ''}
          onLogin={login}
        />
      )}

      {/* Tela de bloqueio com PIN do último usuário */}
      {!appLockLoading && locked && lastFuncionario && !(expedienteAtivo && !dentroExpediente) && (
        <FuncionarioLoginModal
          funcionarios={funcionariosDisponiveis}
          fazendaId={fazendaId || ''}
          onLogin={login}
          lastFuncionario={lastFuncionario}
          onSwitchUser={switchUser}
          pinOnly
        />
      )}

      {/* Versículo do Dia */}
      {versiculoDoDia && configurado && (
        <footer className="px-4 py-6 border-t border-gray-200/80">
          <div className="max-w-md mx-auto text-center">
            <div className="text-xl mb-2">📖</div>
            <p className="text-sm text-gray-700 leading-relaxed">
              "{versiculoDoDia.texto}"
            </p>
            <p className="text-xs font-semibold text-gray-500 mt-2">
              {versiculoDoDia.referencia}
            </p>
          </div>
        </footer>
      )}
    </div>
  )
}

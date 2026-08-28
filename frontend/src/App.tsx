import { useEffect, useRef, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Configuracoes from './pages/Configuracoes'
import WelcomePage from './pages/WelcomePage'
import SyncStatusBar from './components/SyncStatusBar'
import ConflictModal from './components/ConflictModal'
import InstallPrompt from './components/InstallPrompt'
import CadastroSyncOverlay from './components/CadastroSyncOverlay'
import { useServiceWorkerUpdate } from './hooks/useServiceWorkerUpdate'
import PageLoader from './components/PageLoader'
import { useSync } from './hooks/useSync'
import { useConflicts } from './hooks/useConflicts'
import { useFirstOpen } from './hooks/useFirstOpen'
import { verificarBackupAutomatico } from './services/backupService'
import { useSelector } from 'react-redux'
import { RootState } from './store/store'
import { checkPWARequirements, debugPWA } from './utils/pwaDebug'
import { preventPullToRefresh, addPullToRefreshCSS } from './utils/preventPullToRefresh'
import { initializeCadastroCache, updateCadastroCache, startCadastroCachePolling, stopCadastroCachePolling } from './services/cadastroCache'
import { syncMapaSePreciso } from './services/mapaCache'
import { fetchChecklistRegras } from './services/checklistRegrasService'
import { reauthenticateFarm, isTokenValid } from './services/authService'
import { useFarmStatus } from './hooks/useFarmStatus'
import FarmInactiveBlock from './components/FarmInactiveBlock'
import ScrollToTop from './components/ScrollToTop'
import { useStoragePersistence } from './hooks/useStoragePersistence'
import TestModeBanner from './components/TestModeBanner'
import { registerPushSubscription, unregisterPushSubscription } from './services/pushNotificationService'
import { registerBackgroundSync } from './serviceWorkerRegistration'
import { incorporateCacheFromSW } from './services/cadastroCache'

// Envia config (token, refresh_token, fazenda_id, supabase_url, anon_key) ao SW.
// O SW persiste em IndexedDB própria e usa para fazer fetch de cadastro em background.
function sendConfigToSW(fazendaId: string | undefined) {
  if (!('serviceWorker' in navigator)) return
  const token = localStorage.getItem('supabase_token')
  const refreshToken = localStorage.getItem('supabase_refresh_token')
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  if (!token || !supabaseUrl || !anonKey) return
  navigator.serviceWorker.ready.then((reg) => {
    reg.active?.postMessage({
      type: 'SET_SW_CONFIG',
      token,
      refreshToken,
      fazendaId,
      supabaseUrl,
      anonKey,
    })
  }).catch(() => {})
}

// Componente wrapper para tela de reload durante atualização automática
// e banner de nova versão disponível
function PWAUpdateModalWrapper() {
  const { isReloading, hasUpdateAvailable, applyUpdate } = useServiceWorkerUpdate()

  // Tela de reload:覆盖 toda a tela enquanto o SW recarrega
  if (isReloading) {
    return (
      <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="text-4xl animate-spin">⏳</span>
          <p className="text-lg font-semibold text-gray-700">Atualizando app...</p>
        </div>
      </div>
    )
  }

  // Banner discreto no topo: nova versão baixada, usuário decide quando atualizar
  if (hasUpdateAvailable) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[9999] bg-[#1a3a2a] text-white px-4 py-3 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <p className="text-sm font-semibold">Nova versão disponível</p>
        </div>
        <button
          onClick={applyUpdate}
          className="bg-white text-[#1a3a2a] font-bold text-sm px-4 py-1.5 rounded-lg active:scale-95 transition-transform whitespace-nowrap"
        >
          Atualizar
        </button>
      </div>
    )
  }

  return null
}

// Lazy loading das cadernetas
const MaternidadePage = lazy(() => import('./pages/cadernetas/MaternidadePage'))
const MaternidadeListaPage = lazy(() => import('./pages/cadernetas/MaternidadeListaPage'))
const PastagensPage = lazy(() => import('./pages/cadernetas/PastagensPage'))
const PastagensListaPage = lazy(() => import('./pages/cadernetas/PastagensListaPage'))
const RodeioPage = lazy(() => import('./pages/cadernetas/RodeioPage'))
const RodeioListaPage = lazy(() => import('./pages/cadernetas/RodeioListaPage'))
const SuplementacaoPage = lazy(() => import('./pages/cadernetas/SuplementacaoPage'))
const SuplementacaoListaPage = lazy(() => import('./pages/cadernetas/SuplementacaoListaPage'))
const BebedourosPage = lazy(() => import('./pages/cadernetas/BebedourosPage'))
const BebedourosListaPage = lazy(() => import('./pages/cadernetas/BebedourosListaPage'))
const MovimentacaoPage = lazy(() => import('./pages/cadernetas/MovimentacaoPage'))
const MovimentacaoListaPage = lazy(() => import('./pages/cadernetas/MovimentacaoListaPage'))
const EnfermariaPage = lazy(() => import('./pages/cadernetas/EnfermariaPage'))
const EnfermariaListaPage = lazy(() => import('./pages/cadernetas/EnfermariaListaPage'))
const MortePage = lazy(() => import('./pages/cadernetas/MortePage'))
const MorteListaPage = lazy(() => import('./pages/cadernetas/MorteListaPage'))
const ClimaPage = lazy(() => import('./pages/cadernetas/ClimaPage'))
const ClimaListaPage = lazy(() => import('./pages/cadernetas/ClimaListaPage'))
const AbastecimentoPage = lazy(() => import('./pages/cadernetas/AbastecimentoPage'))
const AbastecimentoListaPage = lazy(() => import('./pages/cadernetas/AbastecimentoListaPage'))
const CantinaPage = lazy(() => import('./pages/cadernetas/CantinaPage'))
const CantinaListaPage = lazy(() => import('./pages/cadernetas/CantinaListaPage'))
const EntradaInsumosPage = lazy(() => import('./pages/cadernetas/EntradaInsumosPage'))
const EntradaInsumosListaPage = lazy(() => import('./pages/cadernetas/EntradaInsumosListaPage'))
const SaidaInsumosPage = lazy(() => import('./pages/cadernetas/SaidaInsumosPage'))
const SaidaInsumosListaPage = lazy(() => import('./pages/cadernetas/SaidaInsumosListaPage'))
const AlmoxarifadoPage = lazy(() => import('./pages/cadernetas/AlmoxarifadoPage'))
const AlmoxarifadoListaPage = lazy(() => import('./pages/cadernetas/AlmoxarifadoListaPage'))
const LimpezaPage = lazy(() => import('./pages/cadernetas/LimpezaPage'))
const LimpezaListaPage = lazy(() => import('./pages/cadernetas/LimpezaListaPage'))
const OperacoesMaquinasPage = lazy(() => import('./pages/cadernetas/OperacoesMaquinasPage'))
const OperacoesMaquinasListaPage = lazy(() => import('./pages/cadernetas/OperacoesMaquinasListaPage'))
const ManutencaoMaquinasPage = lazy(() => import('./pages/cadernetas/ManutencaoMaquinasPage'))
const ManutencaoMaquinasListaPage = lazy(() => import('./pages/cadernetas/ManutencaoMaquinasListaPage'))
const ProblemasPage = lazy(() => import('./pages/cadernetas/ProblemasPage'))
const ProblemasListaPage = lazy(() => import('./pages/cadernetas/ProblemasListaPage'))
const LeituraCochoPage = lazy(() => import('./pages/cadernetas/LeituraCochoPage'))
const TratoConfinamentoPage = lazy(() => import('./pages/cadernetas/TratoConfinamentoPage'))

// Lazy loading dos menus de módulos
const ModulosMenuPage = lazy(() => import('./pages/ModulosMenuPage'))
const ChecklistsMenuPage = lazy(() => import('./pages/ChecklistsMenuPage'))
const RelatoriosPage = lazy(() => import('./pages/RelatoriosPage'))
const RelatorioLoteSeletorPage = lazy(() => import('./pages/RelatorioLoteSeletorPage'))
const RelatorioLotePage = lazy(() => import('./pages/RelatorioLotePage'))
const ProgramacaoHojePage = lazy(() => import('./pages/ProgramacaoHojePage'))
const AtividadesPage = lazy(() => import('./pages/AtividadesPage'))

// Lazy loading do estoque de insumos
const EstoquePage = lazy(() => import('./pages/estoque-insumos/EstoquePage'))

// Lazy loading do mapa da fazenda
const MapaFazendaPage = lazy(() => import('./pages/MapaFazendaPage'))

function AppInner() {
  useSync()
  const location = useLocation()
  const { currentConflict, loadConflicts, handleConflictResolved } = useConflicts()
  const { shouldShowWelcome } = useFirstOpen()
  const syncStatus = useSelector((state: RootState) => state.sync.status)
  const { fazendaId, acessoId, configurado } = useSelector((state: RootState) => state.config)
  const { active: farmActive, loading: farmStatusLoading, nome: farmNome } = useFarmStatus({ acessoId, configurado })

  // Permite acessar a tela de configurações mesmo com fazenda inativa para trocar de fazenda
  const isFarmInactive = configurado && !farmActive && !farmStatusLoading && location.pathname !== '/configuracoes'

  // Rastreia o fazendaId anterior para detectar troca de fazenda
  const previousFazendaIdRef = useRef<string | undefined>(undefined)

  // Hooks de analytics (desativados temporariamente)
  // const sessionTime = useSessionTimer()
  // const { getScreens } = useScreenTracking()
  // const { offlineTime, onlineTime } = useNetworkTracking()

  // Solicitar persistência de armazenamento para evitar evicção do navegador
  useStoragePersistence()

  // Limpar tokens expirados automaticamente ao carregar o app
  useEffect(() => {
    const clearExpiredTokens = () => {
      const token = localStorage.getItem('supabase_token')
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          const now = Math.floor(Date.now() / 1000)
          
          // Limpar se expirou ou vai expirar em menos de 5 minutos
          if (payload.exp && payload.exp - now < 300) {
            console.log('[App] Limpando token expirado do localStorage')
            localStorage.removeItem('supabase_token')
            localStorage.removeItem('supabase_refresh_token')
          }
        } catch (error) {
          console.error('[App] Erro ao verificar token, limpando:', error)
          localStorage.removeItem('supabase_token')
          localStorage.removeItem('supabase_refresh_token')
        }
      }
    }

    clearExpiredTokens()
  }, [])

  // Inicializar cache de dados de cadastro (apenas carrega do IndexedDB, não faz polling)
  // A atualização completa dos dados é feita manualmente via botão "Atualizar Dados" na Home
  useEffect(() => {
    if (fazendaId && !isFarmInactive) {
      const previousFazendaId = previousFazendaIdRef.current
      const trocouFazenda = previousFazendaId && previousFazendaId !== fazendaId

      // Incorporar cache do SW (Cache API) antes de inicializar do Dexie.
      // Se o SW fez fetch em background enquanto o app estava fechado, os dados
      // frescos estão no Cache API e são incorporados ao Dexie instantaneamente.
      incorporateCacheFromSW(fazendaId).catch((err) => {
        console.warn('[App] Falha ao incorporar cache do SW:', err)
      })

      initializeCadastroCache(fazendaId)
      // Enviar config ao SW para que ele possa fazer fetch de cadastro em background
      sendConfigToSW(fazendaId)
      // Sincronizar mapa da fazenda (verifica versão antes de baixar)
      syncMapaSePreciso(fazendaId).catch((err) => {
        console.warn('[App] Falha ao sincronizar mapa:', err)
      })
      // Pré-cachear regras de checklist: consulta pequena que garante
      // funcionamento offline do useChecklistAtivo desde a abertura do app
      fetchChecklistRegras(fazendaId).catch((err) => {
        console.warn('[App] Falha ao pré-cachear regras de checklist:', err)
      })

      // Push notification: unregister da fazenda anterior antes de registrar a nova
      const registerPush = async () => {
        if (trocouFazenda) {
          console.log('[App] Troca de fazenda detectada, removendo subscription anterior')
          await unregisterPushSubscription().catch((err) => {
            console.warn('[App] Falha ao remover subscription anterior:', err)
          })
        }
        registerPushSubscription(fazendaId).catch((err) => {
          console.warn('[App] Falha ao registrar push:', err)
        })
      }
      registerPush()

      previousFazendaIdRef.current = fazendaId
    }
  }, [fazendaId, isFarmInactive])

  // Re-enviar config ao SW quando o app volta de background.
  // O token pode ter sido refreshed enquanto o app esteve aberto em background,
  // e o SW precisa do token fresco para o próximo Periodic Sync.
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && fazendaId) {
        sendConfigToSW(fazendaId)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fazendaId])

  // Camada 1: Foreground sync do cache de cadastro
  // Atualiza o cache automaticamente quando o app volta de background ou recupera conexão
  // Polling de 30 minutos como rede de segurança para dados stale em sessões longas
  useEffect(() => {
    if (!fazendaId || isFarmInactive) return

    // Atualizar cache quando o app volta de background para foreground
    const handleVisibilityChange = () => {
      if (!document.hidden && navigator.onLine) {
        console.log('[App] App voltou de background, atualizando cache de cadastro')
        updateCadastroCache(fazendaId, fazendaId).catch((err) => {
          console.warn('[App] Falha ao atualizar cache on visibility change:', err)
        })
        syncMapaSePreciso(fazendaId).catch((err) => {
          console.warn('[App] Falha ao sincronizar mapa on visibility change:', err)
        })
      }
    }

    // Atualizar cache quando o dispositivo recupera conectividade
    const handleOnline = () => {
      console.log('[App] Dispositivo online, atualizando cache de cadastro')
      updateCadastroCache(fazendaId, fazendaId).catch((err) => {
        console.warn('[App] Falha ao atualizar cache on online event:', err)
      })
      syncMapaSePreciso(fazendaId).catch((err) => {
        console.warn('[App] Falha ao sincronizar mapa on online event:', err)
      })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)

    // Iniciar polling de 30 minutos (rede de segurança para sessões longas)
    startCadastroCachePolling(fazendaId)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      stopCadastroCachePolling()
    }
  }, [fazendaId, isFarmInactive])

  // Camada 2/3: Listener para mensagens do Service Worker (Background Sync)
  // O SW envia mensagens quando periodicsync ou sync disparam em background
  useEffect(() => {
    if (!fazendaId) return

    const handleSWMessage = (event: MessageEvent) => {
      const type = event.data?.type
      if (type === 'BG_SYNC_REFRESH_CACHE') {
        console.log('[App] Background Sync: atualizando cache de cadastro')
        updateCadastroCache(fazendaId, fazendaId).catch((err) => {
          console.warn('[App] Falha ao atualizar cache via BG Sync:', err)
        })
        syncMapaSePreciso(fazendaId).catch((err) => {
          console.warn('[App] Falha ao sincronizar mapa via BG Sync:', err)
        })
      } else if (type === 'BG_CACHE_UPDATED') {
        // SW terminou fetch de cadastro em background e salvou no Cache API.
        // Incorporar ao Dexie imediatamente se o app estiver aberto.
        console.log('[App] SW terminou cache em background, incorporando...')
        incorporateCacheFromSW(fazendaId).catch((err) => {
          console.warn('[App] Falha ao incorporar cache do SW:', err)
        })
      }
      // BG_SYNC_REGISTROS é tratado pelo useSync (fila de registros)
    }

    navigator.serviceWorker.addEventListener('message', handleSWMessage)
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage)
    }
  }, [fazendaId])

  // Registrar Background Sync one-shot quando há registros pendentes
  // Garante que o SW tente sincronizar quando a conexão retornar, mesmo com app fechado
  useEffect(() => {
    if (!fazendaId || !navigator.onLine) return
    // Registrar sync one-shot para cache de cadastro (dispara quando online novamente)
    registerBackgroundSync('refresh-cadastro-cache').catch(() => {})
  }, [fazendaId])

  // Re-authenticate automatically if config exists but token is invalid
  useEffect(() => {
    if (!acessoId || !configurado || isFarmInactive) return

    const checkAndReauth = async () => {
      if (!isTokenValid()) {
        console.log('[App] Token inválido, tentando re-autenticação automática')
        const result = await reauthenticateFarm(acessoId)
        if (result.sucesso) {
          console.log('[App] Re-autenticação bem-sucedida')
        } else {
          console.warn('[App] Re-autenticação falhou, usuário precisará reconfigurar')
        }
      }
    }

    checkAndReauth()
  }, [acessoId, configurado, isFarmInactive])

  useEffect(() => {
    if (syncStatus === 'conflict') {
      loadConflicts()
    }
  }, [syncStatus, loadConflicts])

  // Prevenir pull-to-refresh em PWAs instalados
  useEffect(() => {
    // Adicionar CSS para prevenir pull-to-refresh
    addPullToRefreshCSS()
    
    // Adicionar listeners JavaScript para prevenir pull-to-refresh
    const cleanup = preventPullToRefresh()
    
    return cleanup
  }, [])

  // Backup automático a cada 24 horas
  useEffect(() => {
    verificarBackupAutomatico()
    
    // Debug PWA - remover em produção
    if (import.meta.env.DEV) {
      setTimeout(() => {
        console.log('Iniciando debug PWA...')
        checkPWARequirements()
        debugPWA()
      }, 2000)
    }
  }, [])

  // Enviar dados de analytics periodicamente (a cada 5 minutos)
  // DESATIVADO para evitar rate limiting ao abrir o app
  /*
  useEffect(() => {
    const sendAnalytics = async () => {
      try {
        const deviceId = getDeviceId()
        const screens = getScreens()

        // Obter dados de analytics calculados
        const analyticsRes = await fetch(`${BACKEND_URL}/api/devices/analytics?deviceSheetUrl=${DEVICE_SHEET_URL}`)
        const analyticsData = await analyticsRes.json()

        await fetch(`${BACKEND_URL}/api/devices/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceSheetUrl: DEVICE_SHEET_URL,
            uuid: deviceId,
            fazenda: fazenda || '',
            sessionTime,
            screens,
            offlineTime,
            onlineTime,
            peakHour: analyticsData.peakHour,
            mostActiveDay: analyticsData.mostActiveDay,
            avgSessionInterval: analyticsData.avgSessionInterval,
          }),
        })
      } catch (error) {
        console.error('Erro ao enviar analytics:', error)
      }
    }

    sendAnalytics()
    const interval = setInterval(sendAnalytics, 5 * 60 * 1000) // 5 minutos

    return () => clearInterval(interval)
  }, [sessionTime, fazenda])
  */

  // Registrar dispositivo ao abrir app
  // DESATIVADO para evitar rate limiting ao abrir o app
  /*
  useEffect(() => {
    const registerDevice = async () => {
      try {
        const deviceId = getDeviceId()
        const deviceData = getDeviceStaticData()
        const res = await fetch(`${BACKEND_URL}/api/devices/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceSheetUrl: DEVICE_SHEET_URL,
            uuid: deviceId,
            fazenda: fazenda || '',
            ...deviceData,
          }),
        })
        await res.json()
      } catch (error) {
        console.error('Erro ao registrar dispositivo:', error)
      }
    }

    const updateSession = async () => {
      try {
        const deviceId = getDeviceId()
        const sessionData = getSessionData()
        const res = await fetch(`${BACKEND_URL}/api/devices/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceSheetUrl: DEVICE_SHEET_URL,
            uuid: deviceId,
            fazenda: fazenda || '',
            ...sessionData,
          }),
        })
        await res.json()
      } catch (error) {
        console.error('Erro ao atualizar sessão:', error)
      }
    }

    registerDevice()
    updateSession()
  }, [fazenda])
  */

  if (configurado && farmStatusLoading && location.pathname !== '/configuracoes') {
    return <PageLoader />
  }

  if (isFarmInactive) {
    return (
      <>
        <FarmInactiveBlock nome={farmNome} />
        <PWAUpdateModalWrapper />
        <CadastroSyncOverlay />
        {currentConflict && (
          <ConflictModal
            conflict={currentConflict}
            onResolved={handleConflictResolved}
          />
        )}
        <InstallPrompt />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Só mostrar sync se não for WelcomePage */}
      {(location.pathname !== '/' || !shouldShowWelcome) && location.pathname !== '/welcome' && (
        <SyncStatusBar />
      )}

      {/* Banner do modo teste (visível em qualquer tela quando ativo) */}
      {location.pathname !== '/welcome' && (
        <TestModeBanner />
      )}
      
      <div className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={
              shouldShowWelcome ? <WelcomePage /> : <Home />
            } />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/configuracoes" element={<Configuracoes />} />

            {/* Menus de Módulos */}
            <Route path="/modulos/cadernetas" element={<ModulosMenuPage />} />
            <Route path="/modulos/checklists" element={<ChecklistsMenuPage />} />
            <Route path="/modulos/relatorios" element={<RelatoriosPage />} />
            <Route path="/modulos/relatorios/lote" element={<RelatorioLoteSeletorPage />} />
            <Route path="/modulos/relatorios/lote/:loteId" element={<RelatorioLotePage />} />
            <Route path="/programacao-hoje" element={<ProgramacaoHojePage />} />
            <Route path="/atividades" element={<AtividadesPage />} />

            {/* Estoque de Insumos */}
            <Route path="/estoque-insumos/estoque" element={<EstoquePage />} />

            {/* Mapa da Fazenda */}
            <Route path="/mapa-fazenda" element={<MapaFazendaPage />} />

            {/* Maternidade */}
            <Route path="/caderneta/maternidade" element={<MaternidadePage />} />
            <Route path="/caderneta/maternidade/lista" element={<MaternidadeListaPage />} />

            {/* Troca de Pastos */}
            <Route path="/caderneta/pastagens" element={<PastagensPage />} />
            <Route path="/caderneta/pastagens/lista" element={<PastagensListaPage />} />

            {/* Rodeio Gado */}
            <Route path="/caderneta/rodeio" element={<RodeioPage />} />
            <Route path="/caderneta/rodeio/lista" element={<RodeioListaPage />} />

            {/* Suplementação */}
            <Route path="/caderneta/suplementacao" element={<SuplementacaoPage />} />
            <Route path="/caderneta/suplementacao/lista" element={<SuplementacaoListaPage />} />

            {/* Bebedouros */}
            <Route path="/caderneta/bebedouros" element={<BebedourosPage />} />
            <Route path="/caderneta/bebedouros/lista" element={<BebedourosListaPage />} />

            {/* Movimentação */}
            <Route path="/caderneta/movimentacao" element={<MovimentacaoPage />} />
            <Route path="/caderneta/movimentacao/lista" element={<MovimentacaoListaPage />} />

            {/* Enfermaria */}
            <Route path="/caderneta/enfermaria" element={<EnfermariaPage />} />
            <Route path="/caderneta/enfermaria/lista" element={<EnfermariaListaPage />} />

            {/* Morte */}
            <Route path="/caderneta/morte" element={<MortePage />} />
            <Route path="/caderneta/morte/lista" element={<MorteListaPage />} />

            {/* Clima */}
            <Route path="/caderneta/clima" element={<ClimaPage />} />
            <Route path="/caderneta/clima/lista" element={<ClimaListaPage />} />

            {/* Abastecimento */}
            <Route path="/caderneta/abastecimento" element={<AbastecimentoPage />} />
            <Route path="/caderneta/abastecimento/lista" element={<AbastecimentoListaPage />} />

            {/* Cantina */}
            <Route path="/caderneta/cantina" element={<CantinaPage />} />
            <Route path="/caderneta/cantina/lista" element={<CantinaListaPage />} />

            {/* Entrada de Insumos */}
            <Route path="/caderneta/entrada-insumos" element={<EntradaInsumosPage />} />
            <Route path="/caderneta/entrada-insumos/lista" element={<EntradaInsumosListaPage />} />

            {/* Saída de Insumos */}
            <Route path="/caderneta/saida-insumos" element={<SaidaInsumosPage />} />
            <Route path="/caderneta/saida-insumos/lista" element={<SaidaInsumosListaPage />} />

            {/* Almoxarifado */}
            <Route path="/caderneta/almoxarifado" element={<AlmoxarifadoPage />} />
            <Route path="/caderneta/almoxarifado/lista" element={<AlmoxarifadoListaPage />} />

            {/* Limpeza */}
            <Route path="/caderneta/limpeza" element={<LimpezaPage />} />
            <Route path="/caderneta/limpeza/lista" element={<LimpezaListaPage />} />

            {/* Operações de Máquinas */}
            <Route path="/caderneta/operacoes-maquinas" element={<OperacoesMaquinasPage />} />
            <Route path="/caderneta/operacoes-maquinas/lista" element={<OperacoesMaquinasListaPage />} />

            {/* Manutenção de Máquinas */}
            <Route path="/caderneta/manutencao-maquinas" element={<ManutencaoMaquinasPage />} />
            <Route path="/caderneta/manutencao-maquinas/lista" element={<ManutencaoMaquinasListaPage />} />

            {/* Problemas */}
            <Route path="/caderneta/problemas" element={<ProblemasPage />} />
            <Route path="/caderneta/problemas/lista" element={<ProblemasListaPage />} />

            {/* Leitura de Cocho */}
            <Route path="/caderneta/leitura-cocho" element={<LeituraCochoPage />} />

            {/* Trato Confinamento */}
            <Route path="/caderneta/trato-confinamento" element={<TratoConfinamentoPage />} />

            {/* Fallback */}
            <Route path="/caderneta/:id" element={<Navigate to="/" replace />} />
            <Route path="/caderneta/:id/lista" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
      <PWAUpdateModalWrapper />
      <CadastroSyncOverlay />
      {currentConflict && (
        <ConflictModal
          conflict={currentConflict}
          onResolved={handleConflictResolved}
        />
      )}
      <InstallPrompt />
    </div>
  )
}

function App() {
  return (
    <Router basename="/Caderneta-Digital-Gesta-Up">
      <ScrollToTop />
      <AppInner />
    </Router>
  )
}

export default App

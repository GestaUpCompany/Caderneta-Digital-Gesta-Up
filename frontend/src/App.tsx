import { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Configuracoes from './pages/Configuracoes'
import WelcomePage from './pages/WelcomePage'
import SyncStatusBar from './components/SyncStatusBar'
import ConflictModal from './components/ConflictModal'
import InstallPrompt from './components/InstallPrompt'
import { UpdateDialog } from './components/UpdateDialog'
import { PWAUpdateModal } from './components/PWAUpdateModal'
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
import { initializeCadastroCache, startCadastroCachePolling, stopCadastroCachePolling } from './services/cadastroCache'

// Componente wrapper para PWAUpdateModal com hook
function PWAUpdateModalWrapper() {
  const { showUpdateModal, applyUpdate, dismissUpdateModal, isReloading } = useServiceWorkerUpdate()
  
  return (
    <>
      {isReloading && (
        <div className="fixed inset-0 bg-white z-[9999] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <span className="text-4xl animate-spin">⏳</span>
            <p className="text-lg font-semibold text-gray-700">Atualizando app...</p>
          </div>
        </div>
      )}
      <PWAUpdateModal
        isOpen={showUpdateModal}
        onRestartNow={applyUpdate}
        onLater={dismissUpdateModal}
      />
    </>
  )
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
const EntradaInsumosPage = lazy(() => import('./pages/cadernetas/EntradaInsumosPage'))
const EntradaInsumosListaPage = lazy(() => import('./pages/cadernetas/EntradaInsumosListaPage'))
const SaidaInsumosPage = lazy(() => import('./pages/cadernetas/SaidaInsumosPage'))
const SaidaInsumosListaPage = lazy(() => import('./pages/cadernetas/SaidaInsumosListaPage'))

// Lazy loading dos menus de módulos
const ModulosMenuPage = lazy(() => import('./pages/ModulosMenuPage'))
const ChecklistsMenuPage = lazy(() => import('./pages/ChecklistsMenuPage'))
const RelatoriosPage = lazy(() => import('./pages/RelatoriosPage'))

// Lazy loading do estoque de insumos
const EstoquePage = lazy(() => import('./pages/estoque-insumos/EstoquePage'))

function AppInner() {
  useSync()
  const location = useLocation()
  const { currentConflict, loadConflicts, handleConflictResolved } = useConflicts()
  const { shouldShowWelcome, isLoading } = useFirstOpen()
  const syncStatus = useSelector((state: RootState) => state.sync.status)
  const { cadastroSheetUrl } = useSelector((state: RootState) => state.config)
  
  // Hooks de analytics (desativados temporariamente)
  // const sessionTime = useSessionTimer()
  // const { getScreens } = useScreenTracking()
  // const { offlineTime, onlineTime } = useNetworkTracking()

  // Inicializar cache de dados de cadastro
  useEffect(() => {
    if (cadastroSheetUrl) {
      initializeCadastroCache(cadastroSheetUrl)
      startCadastroCachePolling(cadastroSheetUrl)
    }
    return () => {
      stopCadastroCachePolling()
    }
  }, [cadastroSheetUrl])

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
    if (process.env.NODE_ENV === 'development') {
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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Só mostrar sync se não for WelcomePage */}
      {(location.pathname !== '/' || !shouldShowWelcome) && location.pathname !== '/welcome' && (
        <SyncStatusBar />
      )}
      
      <div className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={
              isLoading ? <PageLoader /> : 
              shouldShowWelcome ? <WelcomePage /> : <Home />
            } />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/configuracoes" element={<Configuracoes />} />

            {/* Menus de Módulos */}
            <Route path="/modulos/cadernetas" element={<ModulosMenuPage />} />
            <Route path="/modulos/checklists" element={<ChecklistsMenuPage />} />
            <Route path="/modulos/relatorios" element={<RelatoriosPage />} />

            {/* Estoque de Insumos */}
            <Route path="/estoque-insumos/estoque" element={<EstoquePage />} />

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

            {/* Entrada de Insumos */}
            <Route path="/caderneta/entrada-insumos" element={<EntradaInsumosPage />} />
            <Route path="/caderneta/entrada-insumos/lista" element={<EntradaInsumosListaPage />} />

            {/* Saída de Insumos */}
            <Route path="/caderneta/saida-insumos" element={<SaidaInsumosPage />} />
            <Route path="/caderneta/saida-insumos/lista" element={<SaidaInsumosListaPage />} />

            {/* Fallback */}
            <Route path="/caderneta/:id" element={<Navigate to="/" replace />} />
            <Route path="/caderneta/:id/lista" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
      <PWAUpdateModalWrapper />
      {currentConflict && (
        <ConflictModal
          conflict={currentConflict}
          onResolved={handleConflictResolved}
        />
      )}
      <InstallPrompt />
      <UpdateDialog />
    </div>
  )
}

function App() {
  return (
    <Router basename="/Caderneta-Digital-Gesta-Up">
      <AppInner />
    </Router>
  )
}

export default App

import { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Configuracoes from './pages/Configuracoes'
import WelcomePage from './pages/WelcomePage'
import SyncStatusBar from './components/SyncStatusBar'
import ConflictModal from './components/ConflictModal'
import InstallPrompt from './components/InstallPrompt'
import { UpdateDialog } from './components/UpdateDialog'
import { PWAUpdateBanner } from './components/PWAUpdateBanner'
import PageLoader from './components/PageLoader'
import { useSync } from './hooks/useSync'
import { useConflicts } from './hooks/useConflicts'
import { useFirstOpen } from './hooks/useFirstOpen'
import { verificarBackupAutomatico } from './services/backupService'
import { useSelector } from 'react-redux'
import { RootState } from './store/store'
import { checkPWARequirements, debugPWA } from './utils/pwaDebug'
import { preventPullToRefresh, addPullToRefreshCSS } from './utils/preventPullToRefresh'

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

function AppInner() {
  console.log('AppInner: Testando hooks...')
  
  useSync()
  const { currentConflict, loadConflicts, handleConflictResolved } = useConflicts()
  const { shouldShowWelcome, isLoading } = useFirstOpen()
  const syncStatus = useSelector((state: RootState) => state.sync.status)

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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <SyncStatusBar />
      {/* Header simples */}
      <div className="bg-green-700 text-white px-4 py-2">
        <span className="text-base">CADERNETAS DIGITAIS</span>
      </div>
      
      <div className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={
              isLoading ? <PageLoader /> : 
              shouldShowWelcome ? <WelcomePage /> : <Home />
            } />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/configuracoes" element={<Configuracoes />} />

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

            {/* Fallback */}
            <Route path="/caderneta/:id" element={<Navigate to="/" replace />} />
            <Route path="/caderneta/:id/lista" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
      <PWAUpdateBanner />
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
    <Router>
      <AppInner />
    </Router>
  )
}

export default App

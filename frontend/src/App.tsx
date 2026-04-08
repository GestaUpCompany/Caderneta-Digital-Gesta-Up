import { useEffect, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Configuracoes from './pages/Configuracoes'
import SyncStatusBar from './components/SyncStatusBar'
import ConflictModal from './components/ConflictModal'
import InstallPrompt from './components/InstallPrompt'
import PageLoader from './components/PageLoader'
import { useSync } from './hooks/useSync'
import { useConflicts } from './hooks/useConflicts'
import { verificarBackupAutomatico } from './services/backupService'
import { useSelector } from 'react-redux'
import { RootState } from './store/store'

// Lazy loading das cadernetas (code splitting)
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
  const { runSync } = useSync()
  const { currentConflict, loadConflicts, handleConflictResolved } = useConflicts()
  const syncStatus = useSelector((state: RootState) => state.sync.status)

  useEffect(() => {
    if (syncStatus === 'conflict') {
      loadConflicts()
    }
  }, [syncStatus, loadConflicts])

  // Backup automático a cada 24 horas
  useEffect(() => {
    verificarBackupAutomatico()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <SyncStatusBar />
      <div className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home onSyncRequest={runSync} />} />
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
          </Routes>
        </Suspense>
      </div>
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
    <Router>
      <AppInner />
    </Router>
  )
}

export default App

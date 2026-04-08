import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Configuracoes from './pages/Configuracoes'
import SyncStatusBar from './components/SyncStatusBar'
import ConflictModal from './components/ConflictModal'
import { useSync } from './hooks/useSync'
import { useConflicts } from './hooks/useConflicts'
import { useSelector } from 'react-redux'
import { RootState } from './store/store'

function AppInner() {
  const { runSync } = useSync()
  const { currentConflict, loadConflicts, handleConflictResolved } = useConflicts()
  const syncStatus = useSelector((state: RootState) => state.sync.status)

  useEffect(() => {
    if (syncStatus === 'conflict') {
      loadConflicts()
    }
  }, [syncStatus, loadConflicts])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <SyncStatusBar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home onSyncRequest={runSync} />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Routes>
      </div>
      {currentConflict && (
        <ConflictModal
          conflict={currentConflict}
          onResolved={handleConflictResolved}
        />
      )}
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

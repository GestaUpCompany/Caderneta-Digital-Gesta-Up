import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Configuracoes from './pages/Configuracoes'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

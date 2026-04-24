import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Button } from '../components/ui'
import { LOGO_URL, DATABASE_URL, getFarmLogo } from '../utils/constants'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { Settings } from 'lucide-react'
import FarmLogo from '../components/FarmLogo'

export default function Home() {
  const navigate = useNavigate()
  const { configurado, fazenda, fazendaId } = useSelector((state: RootState) => state.config)

  // Verificar se é fazenda Marcon ou GestaUp (usando o ID)
  const farmId = fazendaId || fazenda
  const isMarcon = farmId?.toLowerCase().includes('marcon')
  const isGestaUp = farmId?.toLowerCase().includes('gestaup')
  const isSirio = farmId?.toLowerCase().includes('sirio') || farmId?.toLowerCase().includes('sírio')
  const showInsumos = isMarcon || isGestaUp || isSirio

  // Verificar primeiro acesso e redirecionar automaticamente
  useEffect(() => {
    const primeiroAcesso = localStorage.getItem('primeiro-acesso')

    if (!primeiroAcesso) {
      // Marcar que o primeiro acesso foi feito
      localStorage.setItem('primeiro-acesso', 'true')

      // Redirecionar automaticamente para configurações
      navigate('/configuracoes')
    }
  }, [navigate])

  const logoUrl = LOGO_URL

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-[#1a3a2a] text-white py-6 border-b-4 border-yellow-400 relative">
        <button
          onClick={() => navigate('/configuracoes')}
          className="absolute top-0 right-[-8px] flex items-center justify-center text-white hover:text-yellow-400 transition-colors z-10"
        >
          <Settings size={24} />
        </button>
        <div className="flex flex-col items-center gap-3 px-4">
          <div className="flex items-center justify-between w-full">
            <FarmLogo
              farmName={configurado ? fazenda : undefined}
              type="both"
              size="medium"
              className="justify-between w-full"
            />
          </div>
          {configurado && fazenda && (
            <h1 className="text-2xl font-bold text-white">{fazenda.toUpperCase()}</h1>
          )}
        </div>
      </header>

      {/* Menu de Módulos - 2 botões grandes */}
      <main className="flex-1 p-4">
        {!configurado ? (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-6 text-center">
            <p className="text-xl font-bold text-yellow-800 mb-4">
              CONFIGURAÇÃO NECESSÁRIA
            </p>
            <p className="text-lg text-gray-700 mb-6">
              Configure a fazenda antes de usar as cadernetas
            </p>
            <Button onClick={() => navigate('/configuracoes')} variant="primary">
              IR PARA CONFIGURAÇÕES
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Botão Cadernetas */}
            <button
              onClick={() => navigate('/modulos/cadernetas')}
              className="relative flex items-center gap-4 p-6 transition-all rounded-2xl hover:scale-105"
              style={{ backgroundColor: 'rgba(109, 158, 59, 0.25)' }}
            >
              <span className="text-6xl">📋</span>
              <div className="flex-1 text-left">
                <span className="text-2xl font-bold text-gray-900 block">
                  CADERNETAS
                </span>
              </div>
              <span className="text-3xl text-gray-400">→</span>
            </button>

            {/* Botão Estoque de Insumos (só Marcon e GestaUp) */}
            {showInsumos && (
              <button
                onClick={() => navigate('/modulos/insumos')}
                className="relative flex items-center gap-4 p-6 transition-all rounded-2xl hover:scale-105"
                style={{ backgroundColor: 'rgba(59, 130, 246, 0.25)' }}
              >
                <span className="text-6xl">📦</span>
                <div className="flex-1 text-left">
                  <span className="text-2xl font-bold text-gray-900 block">
                    CHECKLISTS
                  </span>
                </div>
                <span className="text-3xl text-gray-400">→</span>
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

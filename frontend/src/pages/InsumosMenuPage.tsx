import { useNavigate } from 'react-router-dom'
import { LOGO_URL } from '../utils/constants'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'

export default function InsumosMenuPage() {
  const navigate = useNavigate()
  const { fazenda } = useSelector((state: RootState) => state.config)

  const menuItems = [
    {
      id: 'cadastro',
      label: 'CADASTRO',
      emoji: '📋',
      description: 'Visualizar insumos, dietas, fornecedores e funcionários',
      path: '/estoque-insumos/cadastro',
      color: '#3b82f6',
    },
    {
      id: 'entrada',
      label: 'ENTRADA DE INSUMOS',
      emoji: '📥',
      description: 'Registrar entrada de insumos no estoque',
      path: '/estoque-insumos/entrada',
      color: '#10b981',
    },
    {
      id: 'producao',
      label: 'PRODUÇÃO FÁBRICA',
      emoji: '🏭',
      description: 'Registrar saída de insumos para produção',
      path: '/estoque-insumos/producao',
      color: '#f59e0b',
    },
  ]

  const hexToRgba = (hex: string, alpha: number = 0.25): string => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-[#1a3a2a] text-white py-6 border-b-4 border-yellow-400 relative">
        <button
          onClick={() => navigate('/')}
          className="absolute top-0 left-4 flex items-center justify-center text-white hover:text-yellow-400 transition-colors z-10"
        >
          <span className="text-2xl">←</span>
        </button>
        <div className="flex flex-col items-center gap-3 px-4">
          <div className="flex items-center justify-between w-full">
            <img src={LOGO_URL} alt="Logo GestaUp" className="w-16 h-auto object-contain rounded-[22px] ml-7" />
            {fazenda && (
              <img src={LOGO_URL} alt="Logo Fazenda" className="h-[58px] w-auto object-contain rounded-[22px] mr-7" />
            )}
          </div>
          {fazenda && (
            <h1 className="text-2xl font-bold text-white">{fazenda.toUpperCase()}</h1>
          )}
          <p className="text-white text-base font-semibold">ESTOQUE DE INSUMOS</p>
        </div>
      </header>

      {/* Menu de Insumos - 3 botões grandes */}
      <main className="flex-1 p-4">
        <div className="flex flex-col gap-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              style={{ backgroundColor: hexToRgba(item.color) }}
              className="relative flex items-center gap-4 p-6 transition-all rounded-2xl hover:scale-105"
            >
              <span className="text-6xl">{item.emoji}</span>
              <div className="flex-1 text-left">
                <span className="text-xl font-bold text-gray-900 block">
                  {item.label}
                </span>
                <span className="text-sm text-gray-700 block">
                  {item.description}
                </span>
              </div>
              <span className="text-3xl text-gray-400">→</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}

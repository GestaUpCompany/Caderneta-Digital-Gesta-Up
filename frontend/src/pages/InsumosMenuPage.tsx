import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import FarmLogo from '../components/FarmLogo'

const BASE = import.meta.env.BASE_URL

export default function InsumosMenuPage() {
  const navigate = useNavigate()
  const { fazenda } = useSelector((state: RootState) => state.config)

  const menuItems = [
    {
      id: 'cadastro',
      label: 'VISUALIZAR CADASTROS',
      emoji: '📋',
      icon: `${BASE}checklists/cadastro.png`,
      description: 'Visualizar insumos, dietas, fornecedores e funcionários',
      path: '/estoque-insumos/cadastro',
      color: '#3b82f6',
    },
    {
      id: 'entrada',
      label: 'ENTRADA DE INSUMOS',
      emoji: '📥',
      icon: `${BASE}checklists/entrada.png`,
      description: 'Registrar entrada de insumos no estoque',
      path: '/estoque-insumos/entrada',
      color: '#10b981',
    },
    {
      id: 'producao',
      label: 'PRODUÇÃO FÁBRICA',
      emoji: '🏭',
      icon: `${BASE}checklists/producao.png`,
      description: 'Registrar saída de insumos para produção',
      path: '/estoque-insumos/producao',
      color: '#f59e0b',
    },
    {
      id: 'estoque',
      label: 'ESTOQUE',
      emoji: '📦',
      icon: `${BASE}checklists/estoque.png`,
      description: 'Visualizar estoque atual',
      path: '/estoque-insumos/estoque',
      color: '#8b5cf6',
      disponivel: false,
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
        <div className="flex flex-col items-center gap-3 px-4">
          <div className="flex items-center justify-between w-full">
            <FarmLogo
              farmName={fazenda}
              type="both"
              size="medium"
              className="justify-between w-full"
            />
          </div>
          {fazenda && (
            <h1 className="text-2xl font-bold text-white">{fazenda.toUpperCase()}</h1>
          )}
          <div className="flex items-center gap-3 w-full relative">
            <button
              onClick={() => navigate('/')}
              className="text-yellow-400 font-bold text-sm min-h-[40px] px-3 absolute left-0"
            >
              VOLTAR
            </button>
            <p className="text-white text-base font-semibold flex-1 text-center">CHECKLISTS DIGITAIS</p>
          </div>
        </div>
      </header>

      {/* Menu de Insumos - 3 botões grandes */}
      <main className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.disponivel !== false && navigate(item.path)}
              disabled={item.disponivel === false}
              style={{ backgroundColor: hexToRgba(item.color) }}
              className={`relative flex flex-col items-center justify-center gap-2 p-4 transition-all rounded-2xl
                ${item.disponivel === false
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-105'
                }`}
            >
              {item.disponivel === false && (
                <span className="absolute top-2 right-2 bg-gray-400 text-white text-xs font-bold px-2 py-1 rounded-lg">
                  EM BREVE
                </span>
              )}
              {item.icon ? (
                <>
                  <img
                    src={item.icon}
                    alt={item.label}
                    className="w-40 h-auto object-contain rounded-[32px]"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const emoji = target.parentElement?.querySelector('.fallback-emoji') as HTMLElement
                      if (emoji) emoji.style.display = 'block'
                    }}
                  />
                  <span className="text-5xl fallback-emoji hidden">{item.emoji}</span>
                </>
              ) : (
                <span className="text-5xl">{item.emoji}</span>
              )}
              <span className="text-base font-bold text-center leading-tight text-gray-900">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}

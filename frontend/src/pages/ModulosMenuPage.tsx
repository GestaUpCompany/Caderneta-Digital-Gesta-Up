import { useNavigate } from 'react-router-dom'
import { CADERNETAS } from '../utils/constants'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import FarmLogo from '../components/FarmLogo'

// Função helper para converter HEX para RGBA com opacidade
const hexToRgba = (hex: string, alpha: number = 0.25): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function ModulosMenuPage() {
  const navigate = useNavigate()
  const { fazenda } = useSelector((state: RootState) => state.config)

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
            <p className="text-white text-base font-semibold flex-1 text-center">CADERNETAS DIGITAIS</p>
          </div>
        </div>
      </header>

      {/* Grid de Cadernetas - 6 botões grandes */}
      <main className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-6">
          {CADERNETAS.map((caderneta) => (
            <button
              key={caderneta.id}
              onClick={() => caderneta.disponivel && navigate(`/caderneta/${caderneta.id}`)}
              disabled={!caderneta.disponivel}
              style={{ backgroundColor: hexToRgba(caderneta.color || '#E5E7EB') }}
              className={`caderneta-card relative flex flex-col items-center justify-center gap-2 p-4 transition-all rounded-2xl
                ${caderneta.disponivel
                  ? 'hover:scale-105'
                  : 'opacity-50 cursor-not-allowed'
                }`}
            >
              {!caderneta.disponivel && (
                <span className="absolute top-2 right-2 bg-gray-400 text-white text-xs font-bold px-2 py-1 rounded-lg">
                  EM BREVE
                </span>
              )}
              <img
                src={caderneta.icon}
                alt={caderneta.label}
                className="w-40 h-auto object-contain rounded-[32px]"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const emoji = target.parentElement?.querySelector('.fallback-emoji') as HTMLElement
                  if (emoji) emoji.style.display = 'block'
                }}
              />
              <span className="text-5xl fallback-emoji hidden">{caderneta.emoji}</span>
              <span className="text-base font-bold text-center leading-tight text-gray-900">
                {caderneta.label}
              </span>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}

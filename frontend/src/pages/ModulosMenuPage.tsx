import { useNavigate } from 'react-router-dom'
import { CADERNETAS, LOGO_URL } from '../utils/constants'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'

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
          <p className="text-white text-base font-semibold">CADERNETAS</p>
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

import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Button } from '../components/ui'
import { CADERNETAS, LOGO_URL, getFarmLogo } from '../utils/constants'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'

// Função helper para converter HEX para RGBA com opacidade
const hexToRgba = (hex: string, alpha: number = 0.25): string => {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function Home() {
  const navigate = useNavigate()
  const { configurado, fazenda } = useSelector((state: RootState) => state.config)

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
      <header className="bg-[#1a3a2a] text-white py-6 border-b-4 border-yellow-400">
        <div className="flex flex-col items-center gap-3 px-4">
          <div className="flex items-center gap-4">
            <img src={logoUrl} alt="Logo GestaUp" className="w-16 h-auto object-contain rounded-[22px]" />
            {configurado && fazenda && (
              <img src={getFarmLogo(fazenda)} alt="Logo Fazenda" className="h-[58px] w-auto object-contain rounded-[22px]" />
            )}
          </div>
          <h1 className="text-2xl font-bold">CADERNETAS DIGITAIS</h1>
          {configurado && fazenda && (
            <p className="text-yellow-400 text-base font-semibold">{fazenda.toUpperCase()}</p>
          )}
        </div>
      </header>

      {/* Grid de Cadernetas - 6 botões grandes */}
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
        )}
      </main>

      {/* Footer com ações */}
      <footer className="p-4 bg-[#1a3a2a] flex flex-col gap-3">
        <Button onClick={() => navigate('/configuracoes')} variant="ghost" icon="⚙️" className="text-white hover:text-gray-200">
          CONFIGURAÇÕES
        </Button>
      </footer>
    </div>
  )
}

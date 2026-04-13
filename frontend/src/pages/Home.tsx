import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { Button } from '../components/ui'
import { CADERNETAS } from '../utils/constants'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'

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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-black text-white text-center py-6 border-b-4 border-yellow-400">
        <h1 className="text-2xl font-bold">CADERNETAS DIGITAIS</h1>
        {configurado && fazenda && (
          <p className="text-yellow-400 text-base mt-1 font-semibold">{fazenda.toUpperCase()}</p>
        )}
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
                className={`caderneta-card relative flex flex-col items-center justify-center gap-2 p-4 transition-all
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
      <footer className="p-4 bg-gray-900 flex flex-col gap-3">
        <Button onClick={() => navigate('/configuracoes')} variant="ghost" icon="⚙️" className="text-white hover:text-gray-200">
          CONFIGURAÇÕES
        </Button>
      </footer>
    </div>
  )
}

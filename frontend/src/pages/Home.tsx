import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { Settings, ClipboardList, ClipboardCheck, Sun, Moon } from 'lucide-react'
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

  // Lógica de saudação contextual
  const [greeting, setGreeting] = useState('')
  const [greetingIcon, setGreetingIcon] = useState(<Sun />)
  const [currentDate, setCurrentDate] = useState('')
  const [ultimaCaderneta, setUltimaCaderneta] = useState<string | null>(null)

  useEffect(() => {
    const now = new Date()
    const hour = now.getHours()

    // Saudação baseada no horário
    if (hour >= 5 && hour < 12) {
      setGreeting('Bom dia')
      setGreetingIcon(<Sun className="text-yellow-500" />)
    } else if (hour >= 12 && hour < 18) {
      setGreeting('Boa tarde')
      setGreetingIcon(<Sun className="text-orange-500" />)
    } else {
      setGreeting('Boa noite')
      setGreetingIcon(<Moon className="text-blue-400" />)
    }

    // Data formatada em português
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }
    const dateString = now.toLocaleDateString('pt-BR', options)
    setCurrentDate(dateString.charAt(0).toUpperCase() + dateString.slice(1))

    // Carregar última caderneta acessada
    const ultima = localStorage.getItem('ultima-caderneta-acessada')
    setUltimaCaderneta(ultima)
  }, [])

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
          {/* Banner de boas-vindas como overlay */}
          {configurado && fazenda && (
            <div className="mt-4 p-4 rounded-xl shadow-lg animate-fade-in w-full" style={{ backgroundImage: 'linear-gradient(to bottom right, rgba(34, 197, 94, 0.15), rgba(22, 163, 74, 0.05))', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {greetingIcon}
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-white">
                    {greeting}, {fazenda.toUpperCase()}!
                  </p>
                  <p className="text-xs text-gray-200 mt-1">
                    {currentDate}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Menu de Módulos - 2 botões grandes */}
      <main className="flex-1 p-4">
        {/* Botão de ação rápida - última caderneta acessada */}
        {configurado && fazenda && ultimaCaderneta && (
          <button
            onClick={() => navigate(`/caderneta/${ultimaCaderneta}`)}
            className="mb-6 w-full p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 ease-out animate-fade-in flex items-center gap-4"
            style={{ backgroundImage: 'linear-gradient(to right, rgba(34, 197, 94, 0.1), rgba(34, 197, 94, 0.05))', border: '1px solid rgba(34, 197, 94, 0.3)' }}
          >
            <ClipboardList size={40} className="text-green-600" />
            <div className="flex-1 text-left">
              <p className="text-base font-bold text-gray-900">
                Continuar em {ultimaCaderneta.charAt(0).toUpperCase() + ultimaCaderneta.slice(1)}
              </p>
            </div>
            <span className="text-2xl text-gray-400">→</span>
          </button>
        )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Botão Cadernetas */}
            <button
              onClick={() => navigate('/modulos/cadernetas')}
              className="relative flex items-center gap-4 p-6 transition-all duration-300 ease-out rounded-2xl hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-green-500/20 border border-white/30 backdrop-blur-sm animate-fade-in-delay-0"
              style={{ backgroundImage: 'linear-gradient(to bottom right, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.1))' }}
            >
              <ClipboardList size={64} className="text-green-600" />
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
                className="relative flex items-center gap-4 p-6 transition-all duration-300 ease-out rounded-2xl hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-blue-500/20 border border-white/30 backdrop-blur-sm animate-fade-in-delay-100"
                style={{ backgroundImage: 'linear-gradient(to bottom right, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1))' }}
              >
                <ClipboardCheck size={64} className="text-blue-600" />
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

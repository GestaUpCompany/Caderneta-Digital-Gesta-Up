import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Button } from '../components/ui'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { ClipboardList, Sun, Moon } from 'lucide-react'
import FarmLogo from '../components/FarmLogo'
import { VERSICULOS, Versiculo } from '../config/versiculos'

const BASE = import.meta.env.BASE_URL

export default function Home() {
  const navigate = useNavigate()
  const { configurado, fazenda, fazendaId, usuario } = useSelector((state: RootState) => state.config)

  // Verificar se é fazenda Marcon, GestaUp, Sirio, Guanabara, Alegria, Dias Cardoso, Estrela da Jacamim ou Paribó (usando o ID)
  const farmId = fazendaId || fazenda
  const isMarcon = farmId?.toLowerCase().includes('marcon')
  const isGestaUp = farmId?.toLowerCase().includes('gestaup')
  const isSirio = farmId?.toLowerCase().includes('sirio') || farmId?.toLowerCase().includes('sírio')
  const isGuanabara = farmId?.toLowerCase().includes('guanabara')
  const isAlegria = farmId?.toLowerCase().includes('alegria')
  const isDiasCardoso = farmId?.toLowerCase().includes('dias cardoso') || farmId?.toLowerCase().includes('diascardoso')
  const isJacamim = farmId?.toLowerCase().includes('jacamim') || farmId?.toLowerCase().includes('estrela da jacamim')
  const isParibo = farmId?.toLowerCase().includes('paribo')
  const showInsumos = isMarcon || isGestaUp || isSirio || isGuanabara || isAlegria || isDiasCardoso || isJacamim || isParibo

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
  const [versiculoDoDia, setVersiculoDoDia] = useState<Versiculo | null>(null)

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

    // Lógica de versículos
    const STORAGE_KEY = 'versiculo-do-dia'
    const DATA_KEY = 'versiculo-data'
    
    const hoje = now.toDateString() // Ex: "Mon Apr 27 2026"
    const dataSalva = localStorage.getItem(DATA_KEY)
    const versiculoSalvo = localStorage.getItem(STORAGE_KEY)
    
    // Se a data mudou ou não há versículo salvo, escolher novo
    if (dataSalva !== hoje || !versiculoSalvo) {
      const versiculosExibidos = JSON.parse(localStorage.getItem('versiculos-exibidos') || '[]')
      
      // Se todos os versículos foram exibidos, reiniciar o ciclo
      if (versiculosExibidos.length >= VERSICULOS.length) {
        localStorage.setItem('versiculos-exibidos', JSON.stringify([]))
      }
      
      // Carregar versículos já exibidos atualizados
      const versiculosExibidosAtualizados = JSON.parse(localStorage.getItem('versiculos-exibidos') || '[]')
      
      // Encontrar o próximo versículo não exibido
      const versiculosDisponiveis = VERSICULOS.filter((_, index) => !versiculosExibidosAtualizados.includes(index))
      
      if (versiculosDisponiveis.length > 0) {
        const proximoVersiculo = versiculosDisponiveis[0]
        const proximoIndex = VERSICULOS.indexOf(proximoVersiculo)
        
        setVersiculoDoDia(proximoVersiculo)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(proximoVersiculo))
        localStorage.setItem(DATA_KEY, hoje)
        
        // Marcar como exibido
        versiculosExibidosAtualizados.push(proximoIndex)
        localStorage.setItem('versiculos-exibidos', JSON.stringify(versiculosExibidosAtualizados))
      }
    } else {
      // Usar versículo salvo do mesmo dia
      setVersiculoDoDia(JSON.parse(versiculoSalvo))
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-[#1a3a2a] text-white py-6 border-b-4 border-yellow-400 relative">
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
          {configurado && usuario && (
            <div className="mt-4 p-4 rounded-xl shadow-lg animate-fade-in w-full" style={{ backgroundImage: 'linear-gradient(to bottom right, rgba(34, 197, 94, 0.15), rgba(22, 163, 74, 0.05))', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {greetingIcon}
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-white">
                    {greeting}, {usuario}!
                  </p>
                  {fazenda && (
                    <p className="text-xs text-gray-200 mt-1">
                      {fazenda.toUpperCase()} • {currentDate}
                    </p>
                  )}
                  {!fazenda && (
                    <p className="text-xs text-gray-200 mt-1">
                      {currentDate}
                    </p>
                  )}
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
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-300 rounded-3xl p-8 text-center shadow-lg animate-fade-in">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-blue-900 mb-3">
              CONFIGURAÇÃO NECESSÁRIA
            </p>
            <p className="text-base text-gray-700 mb-8 leading-relaxed">
              Configure sua fazenda para começar a usar o sistema e acessar todas as funcionalidades das cadernetas.
            </p>
            <Button 
              onClick={() => navigate('/configuracoes')} 
              variant="primary"
              className="w-full py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
            >
              IR PARA CONFIGURAÇÕES
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Botões de cima: Cadernetas e Checklists */}
            <div className="grid grid-cols-2 gap-6">
              {/* Botão Cadernetas */}
              <button
                onClick={() => navigate('/modulos/cadernetas')}
                className="relative w-full flex flex-col items-center justify-center gap-2 p-4 transition-all duration-300 ease-out rounded-2xl hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-green-500/20 border border-white/30 backdrop-blur-sm"
                style={{ backgroundImage: 'linear-gradient(to bottom right, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.1))' }}
              >
                <img src={`${BASE}home/cadernetas.png`} alt="Cadernetas" className="w-40 h-auto object-contain rounded-[32px]" />
                <span className="text-base font-bold text-center leading-tight text-gray-900">
                  CADERNETAS
                </span>
              </button>

              {/* Botão Checklists */}
              {showInsumos && (
                <button
                  onClick={() => navigate('/modulos/checklists')}
                  className="relative w-full flex flex-col items-center justify-center gap-2 p-4 transition-all duration-300 ease-out rounded-2xl hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-orange-500/20 border border-white/30 backdrop-blur-sm"
                  style={{ backgroundImage: 'linear-gradient(to bottom right, rgba(249, 115, 22, 0.2), rgba(234, 88, 12, 0.1))' }}
                >
                  <img src={`${BASE}home/checklists.png`} alt="Checklists" className="w-40 h-auto object-contain rounded-[32px]" />
                  <span className="text-base font-bold text-center leading-tight text-gray-900">
                    CHECKLISTS
                  </span>
                </button>
              )}
            </div>

            {/* Botões de baixo: Configurações e Relatórios */}
            <div className="grid grid-cols-2 gap-6">
              {/* Botão Cadastros */}
              <button
                onClick={() => navigate('/configuracoes')}
                className="relative w-full flex flex-col items-center justify-center gap-2 p-4 transition-all duration-300 ease-out rounded-2xl hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-blue-500/20 border border-white/30 backdrop-blur-sm"
                style={{ backgroundImage: 'linear-gradient(to bottom right, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1))' }}
              >
                <img src={`${BASE}home/cadastro.png`} alt="Cadastros" className="w-40 h-auto object-contain rounded-[32px]" />
                <span className="text-base font-bold text-center leading-tight text-gray-900">
                  CADASTROS
                </span>
              </button>

              {/* Botão Relatórios */}
              <button
                onClick={() => navigate('/modulos/relatorios')}
                className="relative w-full flex flex-col items-center justify-center gap-2 p-4 transition-all duration-300 ease-out rounded-2xl hover:scale-105 shadow-lg hover:shadow-xl hover:shadow-purple-500/20 border border-white/30 backdrop-blur-sm"
                style={{ backgroundImage: 'linear-gradient(to bottom right, rgba(168, 85, 247, 0.2), rgba(139, 92, 246, 0.1))' }}
              >
                <img src={`${BASE}home/relatorios.png`} alt="Relatórios" className="w-40 h-auto object-contain rounded-[32px]" />
                <span className="text-base font-bold text-center leading-tight text-gray-900">
                  RELATÓRIOS
                </span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Versículo do Dia */}
      {versiculoDoDia && configurado && (
        <div className="px-4 py-6 bg-gradient-to-r from-green-50 to-blue-50 border-t-2 border-green-200">
          <div className="max-w-md mx-auto text-center">
            <div className="text-2xl mb-2">📖</div>
            <p className="text-base font-semibold text-gray-800 leading-relaxed mb-2">
              {versiculoDoDia.texto}
            </p>
            <p className="text-sm text-gray-600 font-medium">
              {versiculoDoDia.referencia}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

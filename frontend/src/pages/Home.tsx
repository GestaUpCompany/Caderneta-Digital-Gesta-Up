import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '../components/ui'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '../store/store'
import { setConfig } from '../store/slices/configSlice'
import { ClipboardList, Sun, Moon } from 'lucide-react'
import FarmLogo from '../components/FarmLogo'
import { VERSICULOS, Versiculo } from '../config/versiculos'
import { getFazendaByAcessoId } from '../services/supabaseService'
import { syncAllCadastroData } from '../services/cadastroCache'
import FuncionarioLoginModal from '../components/FuncionarioLoginModal'
import LongPressButton from '../components/LongPressButton'
import { useFuncionarioAuth } from '../hooks/useFuncionarioAuth'
import { useAppLock } from '../hooks/useAppLock'

const BASE = import.meta.env.BASE_URL

export default function Home() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { configurado, fazenda, usuario, acessoId, logoUrl, fazendaId } = useSelector((state: RootState) => state.config)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number; item: string } | null>(null)
  const [syncErrors, setSyncErrors] = useState<string[]>([])
  const [completedItems, setCompletedItems] = useState<string[]>([])
  const LAST_SYNC_KEY = 'ultimo-aquecimento-cache'
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem(LAST_SYNC_KEY)
  })

  // Buscar logoUrl diretamente do banco usando acessoId
  useEffect(() => {
    async function fetchLogoUrl() {
      if (!acessoId || !configurado) {
        return
      }

      try {
        const fazendaData = await getFazendaByAcessoId(acessoId)
        if (fazendaData?.logo_url) {
          dispatch(setConfig({ logoUrl: fazendaData.logo_url }))
        }
      } catch (error) {
        console.error('[Home] Error fetching fazenda:', error)
      }
    }

    fetchLogoUrl()
  }, [acessoId, configurado])

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
  const [showTrocarHint, setShowTrocarHint] = useState(false)

  const {
    rbacAtivo,
    funcionarioLogado,
    funcionariosDisponiveis,
    showLogin,
    login,
    logout,
  } = useFuncionarioAuth()

  const {
    locked,
    lastFuncionario,
    loading: appLockLoading,
    switchUser,
  } = useAppLock({
    fazendaId: fazendaId || '',
    funcionarioLogado,
    funcionariosDisponiveis,
    onLogin: login,
    onLogout: logout,
  })

  const handleLogout = useCallback(() => {
    logout()
    switchUser()
  }, [logout, switchUser])

  const atualizarControleAcesso = useCallback(async () => {
    if (!acessoId || !configurado) return
    try {
      const fazendaData = await getFazendaByAcessoId(acessoId)
      if (fazendaData && typeof fazendaData.controle_acesso_habilitado === 'boolean') {
        dispatch(setConfig({
          controleAcessoHabilitado: fazendaData.controle_acesso_habilitado,
        }))
      }
    } catch (error) {
      console.error('[Home] Erro ao buscar config de controle de acesso:', error)
    }
  }, [acessoId, configurado, dispatch])

  useEffect(() => {
    atualizarControleAcesso()
  }, [atualizarControleAcesso])

  const handleSync = async () => {
    if (!fazendaId || syncing) return

    setSyncing(true)
    setSyncProgress(null)
    setSyncErrors([])
    setCompletedItems([])

    try {
      const result = await syncAllCadastroData(fazendaId, (current, total, item) => {
        setSyncProgress({ current, total, item })
        setCompletedItems(prev => {
          const next = [...prev, item]
          // Manter apenas os últimos 5 itens para não poluir a UI
          return next.slice(-5)
        })
      })

      if (result.errors.length > 0) {
        setSyncErrors(result.errors)
      } else {
        const now = new Date()
        const timestamp = now.toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit',
          hour: '2-digit', minute: '2-digit'
        })
        setLastSyncTime(timestamp)
        localStorage.setItem(LAST_SYNC_KEY, timestamp)
      }
    } catch (error) {
      console.error('Erro ao sincronizar:', error)
      setSyncErrors(['Erro geral de sincronização'])
    } finally {
      setSyncing(false)
      setSyncProgress(null)
    }
  }

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
        <div className="flex flex-col items-center gap-3 px-4 desktop-container">
          {/* Título Manej'Us 360 */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold text-white leading-none">Manej'Us</span>
            <span className="text-2xl font-bold text-yellow-400 leading-none">360</span>
          </div>
          {/* Logos */}
          <div className="flex items-center justify-center w-full mt-4">
            <FarmLogo
              farmName={configurado ? fazenda : undefined}
              logoUrl={logoUrl}
              type="both"
              size="medium"
              gap="gap-4"
              className="justify-center"
            />
          </div>
        </div>
      </header>

      {/* Menu de Módulos - 2 botões grandes */}
      <main className="flex-1 p-4 desktop-container">
        {/* Banner de boas-vindas */}
        {configurado && usuario && (
          <div className="mb-6 p-4 rounded-xl shadow-lg animate-fade-in w-full bg-[#1a3a2a]" style={{ border: '1px solid rgba(34, 197, 94, 0.3)' }}>
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                {greetingIcon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold text-white truncate">
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
              {rbacAtivo && (
                <LongPressButton
                  onLongPress={() => {
                    setShowTrocarHint(false)
                    handleLogout()
                  }}
                  onClick={() => setShowTrocarHint(true)}
                  ariaLabel="Trocar funcionário"
                  className="flex-shrink-0 bg-yellow-400 text-[#1a3a2a] font-bold text-xs px-3 py-2 rounded-xl active:bg-yellow-300 transition-colors select-none"
                >
                  TROCAR
                </LongPressButton>
              )}
            </div>
            {showTrocarHint && (
              <p className="text-xs text-yellow-300 mt-2 font-semibold">
                Toque e segure o botão TROCAR para trocar de funcionário
              </p>
            )}
          </div>
        )}

        {/* Sync Button and Status */}
        {configurado && fazendaId && (
          <div className="mb-6 flex flex-col gap-3">
            {/* Alerta sempre visível para atualizar antes de sair ao pasto */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-xs text-amber-800 font-medium">
                Vai ficar sem internet? Atualize os dados primeiro antes de sair ao pasto.
              </p>
            </div>

            <button
              onClick={handleSync}
              disabled={syncing}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600"
            >
              {syncing ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  ATUALIZANDO...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  ATUALIZAR DADOS
                </>
              )}
            </button>

            {/* Sync Status Card */}
            {(syncing || syncErrors.length > 0 || (!syncing && syncErrors.length === 0 && syncProgress === null)) && (
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
                {syncing && syncProgress && (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-900">Atualizando dados para uso offline...</p>
                      <span className="text-xs text-gray-500">{syncProgress.current}/{syncProgress.total}</span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300 max-w-full min-w-1"
                        style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                      ></div>
                    </div>
                    {/* Completed Items */}
                    {completedItems.length > 0 && (
                      <div className="space-y-1 mb-3 min-w-0">
                        {completedItems.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-gray-600 min-w-0">
                            <svg className="w-4 h-4 text-green-600 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="break-words min-w-0">{item}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Current Item */}
                    <div className="flex items-center gap-2 text-sm text-gray-700 min-w-0">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse flex-shrink-0"></div>
                      <span className="break-words min-w-0">{syncProgress.item}</span>
                    </div>

                    {/* Aviso para não fechar o app */}
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <p className="text-xs text-red-800 font-bold">
                        Não feche o app até aparecer "Dados atualizados com sucesso". Caso contrário, os dados não estarão completos ao sair ao pasto.
                      </p>
                    </div>
                  </>
                )}

                {syncErrors.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-red-900">Erros na sincronização</p>
                    </div>
                    <ul className="text-sm text-red-700 space-y-1">
                      {syncErrors.map((error, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-red-500">•</span>
                          {error}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {!syncing && syncErrors.length === 0 && syncProgress === null && (
                  <div className="flex items-center gap-2 py-1">
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-xs text-gray-600">
                      Última atualização: <span className="font-medium text-gray-800">{lastSyncTime || 'Nunca atualizado'}</span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
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

      {/* Login de funcionário quando RBAC está ativo */}
      {!appLockLoading && showLogin && funcionariosDisponiveis.length > 0 && !locked && (
        <FuncionarioLoginModal
          funcionarios={funcionariosDisponiveis}
          fazendaId={fazendaId || ''}
          onLogin={login}
        />
      )}

      {/* Tela de bloqueio com PIN do último usuário */}
      {!appLockLoading && locked && lastFuncionario && (
        <FuncionarioLoginModal
          funcionarios={funcionariosDisponiveis}
          fazendaId={fazendaId || ''}
          onLogin={login}
          lastFuncionario={lastFuncionario}
          onSwitchUser={switchUser}
          pinOnly
        />
      )}

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

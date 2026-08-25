import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Download, Smartphone, Chrome } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

export default function Page() {
  const navigate = useNavigate()
  const [isStandalone, setIsStandalone] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installing, setInstalling] = useState(false)
  const [showManualInstructions, setShowManualInstructions] = useState(false)
  const [installDismissed, setInstallDismissed] = useState(false)

  // Detectar se é PWA standalone
  useEffect(() => {
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                              (window.navigator as any).standalone === true
    setIsStandalone(isStandaloneMode)

    // Se já está instalado, redirecionar após 2.5s
    if (isStandaloneMode) {
      const timer = setTimeout(() => navigate('/'), 2500)
      return () => clearTimeout(timer)
    }

    // Ler evento capturado globalmente
    const globalPrompt = (window as any).__deferredInstallPrompt as BeforeInstallPromptEvent | null
    if (globalPrompt) {
      setDeferredPrompt(globalPrompt)
    }

    // Escutar evento de instalação disponível
    const handleAvailable = () => {
      const prompt = (window as any).__deferredInstallPrompt as BeforeInstallPromptEvent | null
      if (prompt) setDeferredPrompt(prompt)
    }
    window.addEventListener('install-prompt-available', handleAvailable)

    // Escutar instalação concluída
    const handleInstalled = () => {
      setDeferredPrompt(null)
      setInstalling(false)
      // Redirecionar após instalação
      setTimeout(() => navigate('/'), 1500)
    }
    window.addEventListener('app-installed', handleInstalled)

    // Se após 3s não há deferredPrompt, mostrar instruções manuais
    const manualTimer = setTimeout(() => {
      setDeferredPrompt(prev => {
        if (!prev) setShowManualInstructions(true)
        return prev
      })
    }, 3000)

    return () => {
      window.removeEventListener('install-prompt-available', handleAvailable)
      window.removeEventListener('app-installed', handleInstalled)
      clearTimeout(manualTimer)
    }
  }, [navigate])

  // Marcar que o usuário já viu a tela de boas-vindas
  useEffect(() => {
    localStorage.setItem('welcome-seen', 'true')
  }, [])

  const handleInstall = useCallback(async () => {
    const prompt = deferredPrompt || (window as any).__deferredInstallPrompt as BeforeInstallPromptEvent | null
    if (!prompt) {
      setShowManualInstructions(true)
      return
    }

    setInstalling(true)
    prompt.prompt()
    const { outcome } = await prompt.userChoice

    if (outcome === 'accepted') {
      // appinstalled event vai disparar e redirecionar
    } else {
      setInstalling(false)
      // Usuário cancelou no diálogo nativo, mostrar instruções manuais
      setShowManualInstructions(true)
    }

    setDeferredPrompt(null)
    ;(window as any).__deferredInstallPrompt = null
  }, [deferredPrompt])

  const handleSkip = useCallback(() => {
    setInstallDismissed(true)
    navigate('/')
  }, [navigate])

  // No modo standalone, mostrar tela simples com botão "Começar a Usar"
  if (isStandalone) {
    return (
      <div className="min-h-screen bg-white text-gray-900 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          <div className="w-32 h-32 bg-white rounded-[1.5rem] flex items-center justify-center mb-8 shadow-2xl">
            <img
              src="/Caderneta-Digital-Gesta-Up/manejus360.png"
              alt="Logo Gesta'Up"
              className="w-24 h-24 rounded-2xl"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                const fallback = document.createElement('div')
                fallback.className = 'text-6xl text-black'
                fallback.textContent = 'MU'
                e.currentTarget.parentElement?.appendChild(fallback)
              }}
            />
          </div>
          <h1 className="text-4xl font-bold text-center mb-4">Manej'Us 360</h1>
          <p className="text-xl text-gray-600 text-center mb-12">Gestão rural na palma da mão</p>
          <button
            onClick={() => navigate('/')}
            className="mt-8 bg-yellow-400 text-black font-bold text-lg px-8 py-4 rounded-2xl border-2 border-black hover:bg-yellow-300 transition-colors active:scale-95"
          >
            Começar a Usar
          </button>
        </div>
        <div className="p-6 text-center">
          <p className="text-gray-400 text-sm">Versão 1.0.0</p>
        </div>
      </div>
    )
  }

  // Modo navegador: tela de instalação
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-800 text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Logo */}
        <div className="w-28 h-28 bg-white rounded-[1.5rem] flex items-center justify-center mb-6 shadow-2xl">
          <img
            src="/Caderneta-Digital-Gesta-Up/manejus360.png"
            alt="Logo Gesta'Up"
            className="w-20 h-20 rounded-2xl"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              const fallback = document.createElement('div')
              fallback.className = 'text-5xl text-black font-bold'
              fallback.textContent = 'MU'
              e.currentTarget.parentElement?.appendChild(fallback)
            }}
          />
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold text-center mb-2">
          Manej'Us 360
        </h1>
        <p className="text-lg text-green-200 text-center mb-8">
          Gestão rural na palma da mão
        </p>

        {/* Features */}
        <div className="space-y-3 mb-8 max-w-sm w-full">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-green-100 text-sm">Funciona offline no campo, sincroniza com internet</p>
          </div>
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-green-100 text-sm">Instale no celular para acesso rápido como um app</p>
          </div>
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
            <p className="text-green-100 text-sm">Cadernetas de suplementação, bebedouros, maternidade e mais</p>
          </div>
        </div>

        {/* Botão Instalar */}
        {!installDismissed && (
          <div className="w-full max-w-sm space-y-3">
            <button
              onClick={handleInstall}
              disabled={installing}
              className="w-full bg-yellow-400 text-black font-bold text-lg px-8 py-4 rounded-2xl border-2 border-black hover:bg-yellow-300 transition-colors active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {installing ? (
                <>
                  <Download className="w-5 h-5 animate-bounce" />
                  Instalando...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  INSTALAR APP
                </>
              )}
            </button>

            {/* Instruções manuais (fallback) */}
            {showManualInstructions && !installing && (
              <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-3">
                  <Chrome className="w-5 h-5 text-yellow-400" />
                  <p className="font-semibold text-sm">Não apareceu o botão? Instale manualmente:</p>
                </div>
                <ol className="space-y-2 text-sm text-green-100">
                  <li className="flex gap-2">
                    <span className="font-bold text-yellow-400">1.</span>
                    <span>Toque no menu do Chrome <span className="font-bold text-white">⋮</span> (canto superior direito)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-yellow-400">2.</span>
                    <span>Toque em <span className="font-bold text-white">"Instalar app"</span> ou <span className="font-bold text-white">"Adicionar à tela inicial"</span></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-yellow-400">3.</span>
                    <span>Confirme a instalação</span>
                  </li>
                </ol>
              </div>
            )}

            {/* Pular instalação */}
            <button
              onClick={handleSkip}
              className="w-full text-green-300 text-sm py-2 hover:text-white transition-colors"
            >
              Continuar sem instalar →
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 text-center">
        <p className="text-green-300 text-xs flex items-center justify-center gap-1">
          <Smartphone className="w-3 h-3" />
          Recomendado: Android com Chrome
        </p>
      </div>
    </div>
  )
}

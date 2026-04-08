import { useState, useEffect } from 'react'
import Button from './ui/Button'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Verifica se já está instalado
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Verifica se o usuário já rejeitou o prompt
    const promptDismissed = localStorage.getItem('install-prompt-dismissed')
    if (promptDismissed) {
      const dismissedTime = parseInt(promptDismissed, 10)
      const oneWeek = 7 * 24 * 60 * 60 * 1000
      if (Date.now() - dismissedTime < oneWeek) {
        return
      }
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setIsInstalled(true)
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('install-prompt-dismissed', Date.now().toString())
  }

  if (!showPrompt || isInstalled) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-black border-2 border-yellow-400 rounded-2xl p-4 shadow-2xl z-50">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">📱</span>
        <div className="flex-1">
          <p className="text-white font-bold text-lg">Instalar Cadernetas Digitais</p>
          <p className="text-gray-300 text-sm">
            Acesse rapidamente do seu celular, mesmo offline
          </p>
        </div>
      </div>
      <div className="flex gap-3">
        <Button onClick={handleInstall} variant="primary" fullWidth icon="⬇️">
          INSTALAR APP
        </Button>
        <Button onClick={handleDismiss} variant="ghost" size="sm" className="!text-white !border-gray-600">
          AGORA NÃO
        </Button>
      </div>
    </div>
  )
}

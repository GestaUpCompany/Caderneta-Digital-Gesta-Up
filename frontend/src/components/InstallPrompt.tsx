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
  const [showDownloadBanner, setShowDownloadBanner] = useState(false)

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
      setShowDownloadBanner(true)
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  if (showDownloadBanner) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
          <div className="flex flex-col items-center text-center gap-4">
            <span className="text-5xl">⬇️</span>
            <p className="text-gray-900 font-bold text-lg leading-snug">
              O download será iniciado em breve.
            </p>
            <p className="text-gray-600 text-sm">
              O aplicativo <strong>Gesta'Up Cadernetas Digitais</strong> será instalado automaticamente no seu dispositivo.
            </p>
            <Button onClick={() => setShowDownloadBanner(false)} variant="primary" fullWidth>
              OK
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!showPrompt || isInstalled) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-black border-2 border-yellow-400 rounded-2xl p-4 shadow-2xl z-50">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">📱</span>
        <div className="flex-1">
          <p className="text-white font-bold text-lg">Gesta'Up Cadernetas Digitais</p>
          <p className="text-gray-300 text-sm">
            Acesse rapidamente do seu celular, mesmo offline
          </p>
        </div>
      </div>
      <div className="mt-4 p-3 bg-yellow-400/20 rounded-xl border border-yellow-400/30">
        <p className="text-yellow-300 text-xs font-medium text-center">
          IMPORTANTE: Após clicar em INSTALAR, permaneça nesta página até o ícone de download aparecer na tela de notificações. O app será instalado quando o ícone desaparecer.
        </p>
      </div>
      <Button onClick={handleInstall} variant="primary" fullWidth icon="" className="mt-3">
        INSTALAR APP
      </Button>
    </div>
  )
}

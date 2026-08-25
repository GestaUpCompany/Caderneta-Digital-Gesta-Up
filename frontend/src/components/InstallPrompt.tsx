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

    // Ler evento capturado globalmente em main.tsx
    const globalPrompt = (window as any).__deferredInstallPrompt as BeforeInstallPromptEvent | null
    if (globalPrompt) {
      setDeferredPrompt(globalPrompt)
      setShowPrompt(true)
    }

    // Escutar evento de instalação disponível (disparado por main.tsx)
    const handleAvailable = () => {
      const prompt = (window as any).__deferredInstallPrompt as BeforeInstallPromptEvent | null
      if (prompt) {
        setDeferredPrompt(prompt)
        setShowPrompt(true)
      }
    }
    window.addEventListener('install-prompt-available', handleAvailable)

    // Escutar instalação concluída
    const handleInstalled = () => {
      setIsInstalled(true)
      setShowPrompt(false)
      setDeferredPrompt(null)
    }
    window.addEventListener('app-installed', handleInstalled)

    return () => {
      window.removeEventListener('install-prompt-available', handleAvailable)
      window.removeEventListener('app-installed', handleInstalled)
    }
  }, [])

  const handleInstall = async () => {
    const prompt = deferredPrompt || (window as any).__deferredInstallPrompt as BeforeInstallPromptEvent | null
    if (!prompt) return

    prompt.prompt()
    const { outcome } = await prompt.userChoice

    if (outcome === 'accepted') {
      setIsInstalled(true)
    }

    setDeferredPrompt(null)
    setShowPrompt(false)
    ;(window as any).__deferredInstallPrompt = null
  }

  if (!showPrompt || isInstalled) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-black border-2 border-yellow-400 rounded-2xl p-4 shadow-2xl z-50">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">📱</span>
        <div className="flex-1">
          <p className="text-white font-bold text-lg">Manej'Us 360</p>
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

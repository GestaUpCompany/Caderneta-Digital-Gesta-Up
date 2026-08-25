import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function useFirstOpen() {
  const [shouldShowWelcome, setShouldShowWelcome] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const location = useLocation()

  useEffect(() => {
    // Verificar se PWA está instalado
    const checkFirstOpen = () => {
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true

      const welcomeSeen = localStorage.getItem('welcome-seen')

      // Se PWA está instalado, não mostrar WelcomePage
      // Se welcome-seen foi setado (usuário clicou "Começar a Usar"), não mostrar
      const shouldShow = !isInstalled && !welcomeSeen

      setShouldShowWelcome(shouldShow)
      setIsLoading(false)
    }

    // Pequeno delay para garantir que o PWA está carregado
    const timer = setTimeout(checkFirstOpen, 100)

    return () => clearTimeout(timer)
  }, [location.pathname])

  return { shouldShowWelcome, isLoading }
}

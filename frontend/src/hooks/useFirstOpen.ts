import { useState, useEffect } from 'react'

export function useFirstOpen() {
  const [shouldShowWelcome, setShouldShowWelcome] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Verificar se PWA está instalado
    const checkFirstOpen = () => {
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true
      
      // Em desenvolvimento, não mostrar WelcomePage se já foi vista
      const isDev = import.meta.env.DEV
      const welcomeSeen = isDev ? localStorage.getItem('welcome-seen') : null
      
      // Se PWA está instalado, não mostrar WelcomePage
      // Se PWA não está instalado, mostrar WelcomePage (exceto em dev se já foi vista)
      const shouldShow = !isInstalled && !welcomeSeen
      
      setShouldShowWelcome(shouldShow)
      setIsLoading(false)
    }

    // Pequeno delay para garantir que o PWA está carregado
    const timer = setTimeout(checkFirstOpen, 100)
    
    return () => clearTimeout(timer)
  }, [])

  return { shouldShowWelcome, isLoading }
}

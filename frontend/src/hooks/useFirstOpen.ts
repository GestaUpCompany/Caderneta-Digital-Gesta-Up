import { useState, useEffect } from 'react'

export function useFirstOpen() {
  const [shouldShowWelcome, setShouldShowWelcome] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Verificar se é a primeira abertura do app instalado
    const checkFirstOpen = () => {
      const welcomeSeen = localStorage.getItem('welcome-seen')
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      
      // Mostrar welcome se:
      // 1. App está instalado (standalone)
      // 2. Nunca viu a tela de boas-vindas
      const shouldShow = isStandalone && !welcomeSeen
      
      setShouldShowWelcome(shouldShow)
      setIsLoading(false)
    }

    // Pequeno delay para garantir que o PWA está carregado
    const timer = setTimeout(checkFirstOpen, 100)
    
    return () => clearTimeout(timer)
  }, [])

  return { shouldShowWelcome, isLoading }
}

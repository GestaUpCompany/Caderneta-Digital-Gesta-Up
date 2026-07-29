import { useState, useEffect, useCallback } from 'react'

export function useServiceWorkerUpdate() {
  const [isReloading, setIsReloading] = useState(false)

  const forceCheck = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          registration.update()
        })
      })
    }
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Auto-aplicar SW waiting na abertura do app (sem interromper o usuário)
    navigator.serviceWorker.getRegistration().then(registration => {
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
    })

    // Quando o SW assume o controle (controllerchange), recarregar silenciosamente
    const handleControllerChange = () => {
      setIsReloading(true)
      window.location.reload()
    }

    // Listener para mensagem do service worker (SW_ACTIVATED)
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_ACTIVATED') {
        handleControllerChange()
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    navigator.serviceWorker.addEventListener('message', handleSWMessage)

    // Verificar atualização imediatamente ao carregar
    forceCheck()

    // Verificar ao ganhar foco
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        forceCheck()
      }
    }

    // iOS: pageshow com persisted=true (BFCache) dispara em vez de visibilitychange
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        forceCheck()
      }
    }

    // Verificação periódica: iOS PWAs em standalone podem não disparar
    // visibilitychange quando o usuário volta de outras apps
    const UPDATE_CHECK_INTERVAL = 30 * 60 * 1000 // 30 minutos
    const intervalId = setInterval(forceCheck, UPDATE_CHECK_INTERVAL)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      navigator.serviceWorker.removeEventListener('message', handleSWMessage)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
      clearInterval(intervalId)
    }
  }, [forceCheck])

  return {
    isReloading,
    forceCheck,
  }
}

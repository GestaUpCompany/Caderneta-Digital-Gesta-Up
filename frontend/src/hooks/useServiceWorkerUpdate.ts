import { useState, useEffect, useCallback, useRef } from 'react'

export function useServiceWorkerUpdate() {
  const [isReloading, setIsReloading] = useState(false)
  // Flag: só faz reload se NÓS dispararmos o SKIP_WAITING (na abertura do app).
  // Durante o uso, forceCheck baixa novo SW mas ele fica em waiting; sem reload.
  const skipWaitingSent = useRef(false)

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

    let swRegistration: ServiceWorkerRegistration | null = null

    const handleUpdateFound = () => {
      const installingWorker = swRegistration?.installing
      if (!installingWorker) return
      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
          skipWaitingSent.current = true
          swRegistration?.waiting?.postMessage({ type: 'SKIP_WAITING' })
        }
      })
    }

    // Auto-aplicar SW waiting na abertura do app (sem interromper o usuário)
    // Cobertura para SW que ficou waiting de uma sessão anterior.
    navigator.serviceWorker.getRegistration().then(registration => {
      swRegistration = registration ?? null
      if (registration?.waiting) {
        skipWaitingSent.current = true
        registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }

      // Listener para SW que termina de baixar durante esta sessão.
      // O forceCheck() abaixo dispara registration.update(); se encontrar
      // um SW novo, o download inicia e dispara updatefound.
      // Quando o novo SW termina de instalar, enviamos SKIP_WAITING imediatamente,
      // ativando a nova versão na mesma abertura do app.
      if (registration) {
        registration.addEventListener('updatefound', handleUpdateFound)
      }
    })

    // Quando o SW assume o controle (controllerchange), recarregar.
    // Só recarrega se nós dispararmos SKIP_WAITING na abertura do app.
    // Se o SW ativar por outro motivo, não interfere no uso.
    const handleControllerChange = () => {
      if (skipWaitingSent.current) {
        setIsReloading(true)
        window.location.reload()
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

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
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
      clearInterval(intervalId)
      swRegistration?.removeEventListener('updatefound', handleUpdateFound)
    }
  }, [forceCheck])

  return {
    isReloading,
    forceCheck,
  }
}

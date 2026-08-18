import { useState, useEffect, useCallback, useRef } from 'react'

export function useServiceWorkerUpdate() {
  const [isReloading, setIsReloading] = useState(false)
  // Flag: só faz reload se NÓS dispararmos o SKIP_WAITING.
  // Evita reloads por ativação de SW não provocada por nós.
  const skipWaitingSent = useRef(false)
  // Registration corrente, compartilhada entre forceCheck e handlers.
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null)

  // Aplica SW em estado waiting: envia SKIP_WAITING e marca flag para
  // que o controllerchange dispare o reload.
  // Idempotente: só envia uma vez por sessão (guardado por skipWaitingSent).
  const applyWaitingSW = useCallback(() => {
    const registration = swRegistrationRef.current
    if (registration?.waiting && !skipWaitingSent.current) {
      skipWaitingSent.current = true
      registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    }
  }, [])

  const forceCheck = useCallback(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        swRegistrationRef.current = registration
        // Aplicar SW waiting imediatamente: cobre o caso em que o browser
        // já baixou um novo SW e o colocou em waiting antes deste listener
        // existir (updatefound perdido no carregamento da página).
        applyWaitingSW()
        // Disparar verificação de update contra o servidor.
        registration.update().then(() => {
          // Após update(), reavaliar waiting: o update pode ter promovido
          // um worker recém-baixado a waiting de forma síncrona.
          swRegistrationRef.current = registration
          applyWaitingSW()
        }).catch(() => {})
      })
    })
  }, [applyWaitingSW])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Handler de updatefound: caminho acelerado para SW que termina de
    // baixar durante esta sessão. Não é o único caminho: applyWaitingSW
    // também roda no mount e em cada forceCheck, cobrindo updatefound
    // perdidos antes do listener existir.
    const handleUpdateFound = (event: Event) => {
      const registration = event.target as ServiceWorkerRegistration
      swRegistrationRef.current = registration
      const installingWorker = registration.installing
      if (!installingWorker) return
      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
          applyWaitingSW()
        }
      })
    }

    // Auto-aplicar SW waiting na abertura do app (sem interromper o usuário).
    // Cobertura para SW que ficou waiting de uma sessão anterior ou que foi
    // baixado pelo auto-check do browser antes deste hook montar.
    navigator.serviceWorker.getRegistration().then(registration => {
      swRegistrationRef.current = registration ?? null
      applyWaitingSW()
      if (registration) {
        registration.addEventListener('updatefound', handleUpdateFound)
      }
    })

    // Quando o SW assume o controle (controllerchange), recarregar.
    // Só recarrega se nós dispararmos SKIP_WAITING; ativação por outro
    // motivo não interfere no uso.
    const handleControllerChange = () => {
      if (skipWaitingSent.current) {
        setIsReloading(true)
        window.location.reload()
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    // Verificar atualização imediatamente ao carregar.
    // forceCheck também aplica SW waiting já existente.
    forceCheck()

    // Verificar ao ganhar foco.
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        forceCheck()
      }
    }

    // iOS: pageshow com persisted=true (BFCache) dispara em vez de visibilitychange.
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        forceCheck()
      }
    }

    // Verificação periódica: iOS PWAs em standalone podem não disparar
    // visibilitychange quando o usuário volta de outras apps.
    const UPDATE_CHECK_INTERVAL = 30 * 60 * 1000 // 30 minutos
    const intervalId = setInterval(forceCheck, UPDATE_CHECK_INTERVAL)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pageshow', handlePageShow)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handlePageShow)
      clearInterval(intervalId)
      const reg = swRegistrationRef.current
      if (reg) reg.removeEventListener('updatefound', handleUpdateFound)
    }
  }, [forceCheck, applyWaitingSW])

  return {
    isReloading,
    forceCheck,
  }
}

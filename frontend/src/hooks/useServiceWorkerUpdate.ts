import { useState, useEffect, useCallback, useRef } from 'react'

export function useServiceWorkerUpdate() {
  const [isReloading, setIsReloading] = useState(false)
  const [hasUpdateAvailable, setHasUpdateAvailable] = useState(false)
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
    } else if (!registration?.waiting) {
      // Sem SW waiting (já foi ativado por outro motivo): recarregar direto.
      setIsReloading(true)
      setHasUpdateAvailable(false)
      setTimeout(() => {
        window.location.reload()
        // Fallback para iOS PWA standalone onde reload() pode nao funcionar
        setTimeout(() => { window.location.href = window.location.href }, 2000)
      }, 500)
    }
  }, [])

  const forceCheck = useCallback(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        swRegistrationRef.current = registration
        // Se já existe SW waiting, mostrar banner (não auto-aplicar).
        if (registration.waiting) {
          setHasUpdateAvailable(true)
        }
        // Disparar verificação de update contra o servidor.
        registration.update().then(() => {
          // Após update(), reavaliar waiting: o update pode ter promovido
          // um worker recém-baixado a waiting de forma síncrona.
          swRegistrationRef.current = registration
          if (registration.waiting) {
            setHasUpdateAvailable(true)
          }
        }).catch(() => {})
      })
    })
  }, [])

  // Usuário clicou "Atualizar" no banner: aplica o SW waiting.
  const applyUpdate = useCallback(() => {
    applyWaitingSW()
  }, [applyWaitingSW])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Handler de updatefound: SW terminou de baixar durante esta sessão.
    // NÃO aplicar automaticamente: mostrar banner para o usuário decidir.
    const handleUpdateFound = (event: Event) => {
      const registration = event.target as ServiceWorkerRegistration
      swRegistrationRef.current = registration
      const installingWorker = registration.installing
      if (!installingWorker) return
      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // SW baixado durante a sessão: mostrar banner, não auto-reload.
          setHasUpdateAvailable(true)
        }
      })
    }

    // Verificar SW waiting na abertura do app.
    // SEMPRE mostrar banner (não auto-aplicar): garante comportamento
    // consistente entre Android (que costuma ter SW waiting no mount)
    // e iOS (que descobre updates durante a sessão).
    navigator.serviceWorker.getRegistration().then(registration => {
      swRegistrationRef.current = registration ?? null
      if (registration?.waiting) {
        setHasUpdateAvailable(true)
      }
      if (registration) {
        registration.addEventListener('updatefound', handleUpdateFound)
      }
    })

    // Quando o SW assume o controle (controllerchange), recarregar.
    // Só recarrega se nós dispararmos SKIP_WAITING; ativação por outro
    // motivo não interfere no uso.
    // Atraso de 500ms para garantir que o activate event do SW terminou
    // de purgar caches e fazer clients.claim() antes do reload.
    // Fallback com location.href para iOS PWA standalone onde reload()
    // pode nao disparar navegacao corretamente.
    const handleControllerChange = () => {
      if (skipWaitingSent.current) {
        setIsReloading(true)
        setHasUpdateAvailable(false)
        setTimeout(() => {
          window.location.reload()
          // Se reload() nao funcionar (iOS PWA standalone), tentar location.href
          setTimeout(() => { window.location.href = window.location.href }, 2000)
        }, 500)
      }
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    // Verificar atualização imediatamente ao carregar.
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
  }, [forceCheck])

  return {
    isReloading,
    hasUpdateAvailable,
    applyUpdate,
    forceCheck,
  }
}

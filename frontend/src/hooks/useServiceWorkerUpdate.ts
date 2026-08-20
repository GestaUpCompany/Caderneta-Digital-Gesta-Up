import { useState, useEffect, useCallback, useRef } from 'react'

export function useServiceWorkerUpdate() {
  const [isReloading, setIsReloading] = useState(false)
  const [hasUpdateAvailable, setHasUpdateAvailable] = useState(false)
  // Flag: só faz reload se NÓS dispararmos o SKIP_WAITING.
  // Evita reloads por ativação de SW não provocada por nós.
  const skipWaitingSent = useRef(false)
  // Registration corrente, compartilhada entre forceCheck e handlers.
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null)
  // Se true, o SW já estava waiting quando o app abriu (pode reload imediato).
  // Se false, o SW foi baixado durante esta sessão (pedir confirmação).
  const wasWaitingOnMount = useRef(false)
  // Controla se o mount já verificou SW waiting existente.
  const mountCheckDone = useRef(false)

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
        // Aplicar SW waiting imediatamente APENAS se já estava waiting
        // no mount (usuário ainda não começou a usar o app).
        // Se foi baixado durante a sessão, mostrar banner em vez de reload.
        if (registration.waiting) {
          if (wasWaitingOnMount.current && mountCheckDone.current) {
            applyWaitingSW()
          } else if (!mountCheckDone.current) {
            // Primeira verificação no mount: SW já estava waiting, pode aplicar.
            wasWaitingOnMount.current = true
            mountCheckDone.current = true
            applyWaitingSW()
          }
        }
        // Disparar verificação de update contra o servidor.
        registration.update().then(() => {
          // Após update(), reavaliar waiting: o update pode ter promovido
          // um worker recém-baixado a waiting de forma síncrona.
          // NÃO aplicar automaticamente: será pego pelo updatefound handler
          // ou pela próxima verificação, que decide via banner.
          swRegistrationRef.current = registration
        }).catch(() => {})
      })
    })
  }, [applyWaitingSW])

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

    // Auto-aplicar SW waiting na abertura do app (sem interromper o usuário).
    // Cobertura para SW que ficou waiting de uma sessão anterior.
    navigator.serviceWorker.getRegistration().then(registration => {
      swRegistrationRef.current = registration ?? null
      if (registration?.waiting) {
        // SW já estava waiting antes do app abrir: reload imediato é seguro.
        wasWaitingOnMount.current = true
        mountCheckDone.current = true
        applyWaitingSW()
      } else {
        mountCheckDone.current = true
      }
      if (registration) {
        registration.addEventListener('updatefound', handleUpdateFound)
      }
    })

    // Quando o SW assume o controle (controllerchange), recarregar.
    // Só recarrega se nós dispararmos SKIP_WAITING; ativação por outro
    // motivo não interfere no uso.
    // Pequeno atraso (300ms) para garantir que o activate event do SW
    // terminou de purgar caches e fazer clients.claim() antes do reload.
    const handleControllerChange = () => {
      if (skipWaitingSent.current) {
        setIsReloading(true)
        setHasUpdateAvailable(false)
        setTimeout(() => window.location.reload(), 300)
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
  }, [forceCheck, applyWaitingSW])

  return {
    isReloading,
    hasUpdateAvailable,
    applyUpdate,
    forceCheck,
  }
}

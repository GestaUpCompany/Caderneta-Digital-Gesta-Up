// Service Worker registration customizado para detectar atualizações

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/Caderneta-Digital-Gesta-Up/sw.js')
        .then(async (registration) => {
          console.log('SW registered: ', registration)

          // Forçar verificação de atualização imediatamente após registro
          // iOS não verifica automaticamente; chamada explícita é necessária
          registration.update().catch(() => {})

          // Camada 2: Periodic Background Sync (Android apenas)
          // Permite que o SW atualize o cache de cadastro periodicamente mesmo com app fechado
          // iOS não suporta esta API; a feature detection garante degradação graciosa
          if ('periodicSync' in registration) {
            try {
              await (registration as any).periodicSync.register('refresh-cadastro-cache', {
                minInterval: 12 * 60 * 60 * 1000, // 12 horas (mínimo prático do Chrome)
              })
              console.log('[SW] Periodic Background Sync registrado (12h)')
            } catch (error) {
              console.warn('[SW] Falha ao registrar Periodic Background Sync:', error)
            }
          }
        })
        .catch((error) => {
          console.error('Error during service worker registration:', error)
        })
    })
  }
}

/**
 * Registra Background Sync one-shot para sincronização de registros
 * e atualização de cache quando a conectividade retornar.
 * Android apenas (iOS não suporta Background Sync API).
 */
export async function registerBackgroundSync(tag: 'sync-registros' | 'refresh-cadastro-cache'): Promise<void> {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready
      await (registration as any).sync.register(tag)
      console.log(`[SW] Background Sync registrado: ${tag}`)
    } catch (error) {
      console.warn(`[SW] Falha ao registrar Background Sync (${tag}):`, error)
    }
  }
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      // Desregistrar Periodic Background Sync se existir
      if ('periodicSync' in registration) {
        (registration as any).periodicSync.unregister('refresh-cadastro-cache').catch(() => {})
      }
      registration.unregister()
    }).catch((error) => {
      console.error(error.message)
    })
  }
}

// Service Worker registration customizado para detectar atualizações

export interface UpdateEvent extends Event {
  detail: {
    waiting: ServiceWorker | null
  }
}

declare global {
  interface WindowEventMap {
    'sw-update-available': UpdateEvent
    'sw-activated': Event
  }
}

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration)

          // Verificar se há atualização disponível
          registration.addEventListener('updatefound', () => {
            console.log('New content is downloading.')
            const installingWorker = registration.installing
            
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Novo Service Worker está esperando para ativar
                  console.log('New content is available; please refresh.')
                  
                  // Emitir evento customizado
                  window.dispatchEvent(new CustomEvent('sw-update-available', {
                    detail: { waiting: registration.waiting }
                  }))
                }
              })
            }
          })

          // Verificar se já há um SW esperando
          if (registration.waiting) {
            console.log('Service Worker is waiting to activate.')
            window.dispatchEvent(new CustomEvent('sw-update-available', {
              detail: { waiting: registration.waiting }
            }))
          }

          // Listener para quando o SW controla a página
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('Controller changed, page will reload.')
            window.dispatchEvent(new Event('sw-activated'))
          })

          // Listener para recarregar automaticamente em caso de erro de fetch
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'RELOAD') {
              console.log('Received reload message from service worker, reloading page...')
              window.location.reload()
            }
          })

        })
        .catch((error) => {
          console.error('Error during service worker registration:', error)
        })
    })
  }
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister()
    }).catch((error) => {
      console.error(error.message)
    })
  }
}

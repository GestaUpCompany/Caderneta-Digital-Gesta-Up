// Service Worker registration customizado para detectar atualizações

export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/Caderneta-Digital-Gesta-Up/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration)

          // Forçar verificação de atualização imediatamente após registro
          // iOS não verifica automaticamente; chamada explícita é necessária
          registration.update().catch(() => {})
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

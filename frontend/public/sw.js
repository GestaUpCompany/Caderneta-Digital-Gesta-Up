// Service Worker customizado para atualizações automáticas
// Este arquivo será injetado pelo Vite PWA plugin

// Adicionar listener para mensagens de SKIP_WAITING
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Handler de erro para recarregar automaticamente em caso de 404
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch((error) => {
      // Se o fetch falhar (404, network error, etc.), tenta recarregar a página
      console.error('Fetch error:', error)
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'RELOAD' })
        })
        throw error
      })
    })
  )
})

// Outro código do Service Worker será adicionado automaticamente pelo Vite PWA plugin

// Service Worker customizado para atualizações automáticas
// Este arquivo será injetado pelo Vite PWA plugin

// Adicionar listener para mensagens de SKIP_WAITING
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Outro código do Service Worker será adicionado automaticamente pelo Vite PWA plugin

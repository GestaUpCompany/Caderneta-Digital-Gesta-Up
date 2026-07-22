/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

// SKIP_WAITING message handler
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Activate: claim clients and notify
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => {
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_ACTIVATED' })
        })
      })
    })
  )
})

// Precache assets (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST || [])
cleanupOutdatedCaches()

/**
 * Plugin customizado: garante que Responses de navegação tenham
 * Content-Type: text/html; charset=utf-8.
 *
 * Causa raiz do bug: em alguns celulares Android, o Cache API retorna
 * Responses sem Content-Type (ou com tipo errado) após evicção parcial
 * do cache. O Chromium classifica a resposta como download (IsDownload)
 * quando o MIME type não é reconhecido como renderizável.
 */
const ensureHtmlContentType = {
  cacheWillUpdate: async ({ response }: { response: Response }) => {
    const contentType = response.headers.get('Content-Type')
    if (!contentType || !contentType.includes('text/html')) {
      const body = await response.blob()
      const headers = new Headers(response.headers)
      headers.set('Content-Type', 'text/html; charset=utf-8')
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    }
    return response
  },
}

/**
 * Rota de navegação: NetworkFirst com fallback para index.html precacheado.
 *
 * Antes: NavigationRoute + createHandlerBoundToURL (CacheFirst do precache)
 * — servia SEMPRE do cache, que podia não ter Content-Type.
 *
 * Agora: tenta a rede primeiro (GitHub Pages envia Content-Type correto),
 * usa cache como fallback para offline. Em ambos os casos, garante
 * Content-Type: text/html via plugin.
 */
const navigationStrategy = new NetworkFirst({
  cacheName: 'navigation-cache',
  networkTimeoutSeconds: 5,
  plugins: [
    ensureHtmlContentType,
    new ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 60 * 60 * 24, // 1 dia
    }),
    new CacheableResponsePlugin({
      statuses: [0, 200],
    }),
  ],
})

registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ event, request }) => {
    try {
      return await navigationStrategy.handle({ event, request })
    } catch {
      // Fallback: servir index.html do precache com Content-Type garantido
      const cache = await caches.open(
        'workbox-precache-v2-Caderneta-Digital-Gesta-Up'
      )
      const keys = await cache.keys()
      const indexEntry = keys.find((req) =>
        req.url.includes('index.html')
      )
      if (indexEntry) {
        const cached = await cache.match(indexEntry)
        if (cached) {
          const contentType = cached.headers.get('Content-Type')
          if (!contentType || !contentType.includes('text/html')) {
            const body = await cached.blob()
            return new Response(body, {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
          }
          return cached
        }
      }
      throw new Error('No cached navigation response available')
    }
  }
)

// Runtime caching: Google Fonts CSS
registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
  'GET'
)

// Runtime caching: gstatic fonts
registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
  'GET'
)

// Runtime caching: imagens
registerRoute(
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24 * 30,
      }),
    ],
  }),
  'GET'
)

// Runtime caching: JS/CSS (NetworkFirst para atualizações imediatas)
registerRoute(
  /\.(?:js|css)$/i,
  new NetworkFirst({
    cacheName: 'static-resources-cache',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
  'GET'
)

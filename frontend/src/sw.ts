/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

// SKIP_WAITING message handler (mantido para compatibilidade com codigo antigo)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Install: NÃO chamar self.skipWaiting() aqui.
// O SW deve ficar em estado waiting até que a página envie SKIP_WAITING,
// que só acontece na abertura do app (useServiceWorkerUpdate.ts).
// Isso evita reloads durante o uso do app.

// Caches de runtime que precisam ser purgados quando um novo SW ativa.
// Sem isso, o navigation-cache (NetworkFirst, 1 dia) pode servir HTML antigo
// que referencia chunks JS com hashes antigos, mantendo a versao antiga mesmo
// apos o reload.
const RUNTIME_CACHES_TO_PURGE = [
  'navigation-cache',
  'static-resources-cache',
]

// Activate: purgar caches de runtime antigos, claim clients e notificar
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all(
      RUNTIME_CACHES_TO_PURGE.map((cacheName) =>
        caches.delete(cacheName).catch(() => {})
      )
    ).then(() => {
      return self.clients.claim().then(() => {
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'SW_ACTIVATED' })
          })
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

async function servePrecachedIndex(): Promise<Response> {
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

registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ event, request }) => {
    try {
      const response = await navigationStrategy.handle({ event, request })
      // GitHub Pages retorna 404 para rotas client-side (ex: /enfermaria).
      // NetworkFirst trata 404 como resposta válida e a retorna ao browser.
      // Se não for 200, cair no fallback do precache para servir index.html.
      if (!response.ok) {
        return await servePrecachedIndex()
      }
      return response
    } catch {
      return await servePrecachedIndex()
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

// ==================== BACKGROUND SYNC ====================

// Camada 2: Periodic Background Sync (Android apenas, iOS não suporta)
// O navegador dispara periodicsync no intervalo registrado (mínimo 12h na prática).
// O SW notifica os clients para que eles chamem updateCadastroCache.
self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'refresh-cadastro-cache') {
    console.log('[SW] Periodic Background Sync: refresh-cadastro-cache')
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'BG_SYNC_REFRESH_CACHE' })
        })
      })
    )
  }
})

// Camada 3: Background Sync API one-shot (Android apenas)
// Dispara quando a conectividade retorna, mesmo com o app fechado.
// Usado para sincronizar registros pendentes e atualizar cache de cadastro.
self.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-registros') {
    console.log('[SW] Background Sync: sync-registros')
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'BG_SYNC_REGISTROS' })
        })
      })
    )
  } else if (event.tag === 'refresh-cadastro-cache') {
    console.log('[SW] Background Sync: refresh-cadastro-cache')
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'BG_SYNC_REFRESH_CACHE' })
        })
      })
    )
  }
})

// ==================== PUSH NOTIFICATIONS ====================

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return

  let payload: { title?: string; body?: string; url?: string }
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'GestaUp', body: event.data.text() }
  }

  const title = payload.title || 'GestaUp'
  const options: NotificationOptions = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-96.png',
    tag: payload.url || 'gestaup-notification',
    data: { url: payload.url || '/' },
    // vibrate não é parte de NotificationOptions no TS lib, mas é suportado no Android
    ...({ vibrate: [200, 100, 200] } as object),
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()

  const targetUrl = (event.notification.data?.url as string) || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já há uma janela aberta, foca nela e navega
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.focus()
          client.navigate(targetUrl)
          return
        }
      }
      // Senão, abre nova janela
      return self.clients.openWindow(targetUrl)
    })
  )
})

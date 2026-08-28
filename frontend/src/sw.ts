/// <reference lib="webworker" />

import { precacheAndRoute, cleanupOutdatedCaches, matchPrecache } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope

// ==================== SW CONFIG (token, fazenda_id) ====================

const SW_DB_NAME = 'sw-config'
const SW_DB_VERSION = 1
const SW_STORE = 'config'
const CADASTRO_BG_CACHE = 'cadastro-bg-cache'

function openSWDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SW_DB_NAME, SW_DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(SW_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function putSWConfig(key: string, value: any): Promise<void> {
  const db = await openSWDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SW_STORE, 'readwrite')
    tx.objectStore(SW_STORE).put(value, key)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror = () => { db.close(); reject(tx.error) }
  })
}

async function getSWConfig(key: string): Promise<any> {
  const db = await openSWDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SW_STORE, 'readonly')
    const req = tx.objectStore(SW_STORE).get(key)
    req.onsuccess = () => { db.close(); resolve(req.result) }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const now = Math.floor(Date.now() / 1000)
    return payload.exp && payload.exp - now < 60
  } catch {
    return true
  }
}

async function refreshSWToken(
  supabaseUrl: string,
  anonKey: string,
  refreshToken: string
): Promise<string | null> {
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: anonKey },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
    if (!res.ok) return null
    const data = await res.json()
    await putSWConfig('supabase_token', data.access_token)
    if (data.refresh_token) {
      await putSWConfig('supabase_refresh_token', data.refresh_token)
    }
    return data.access_token
  } catch {
    return null
  }
}

async function fetchTable(
  supabaseUrl: string,
  anonKey: string,
  token: string,
  table: string,
  query: string
): Promise<any[]> {
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Failed to fetch ${table}: ${res.status}`)
  return res.json()
}

/**
 * Busca as 12 listas de cadastro do Supabase em background e salva em Cache API.
 * Roda dentro do SW (Periodic Sync ou Background Sync one-shot), com app fechado.
 * Faz as queries em paralelo via REST API do Supabase (PostgREST).
 * Salva apenas as listas (leve); o warm cache de detalhes fica para o botão manual.
 */
async function fetchAndCacheCadastroData(): Promise<void> {
  const fazendaId = await getSWConfig('fazenda_id')
  const supabaseUrl = await getSWConfig('supabase_url')
  const anonKey = await getSWConfig('supabase_anon_key')
  let token = await getSWConfig('supabase_token')
  const refreshToken = await getSWConfig('supabase_refresh_token')

  if (!fazendaId || !supabaseUrl || !anonKey || !token) {
    console.log('[SW] Config incompleto, pulando background cache')
    return
  }

  // Refresh token se expirado (JWT expira em 1h; Periodic Sync roda a cada 12h)
  if (isTokenExpired(token)) {
    if (!refreshToken) {
      console.log('[SW] Token expirado e sem refresh token, pulando')
      return
    }
    token = await refreshSWToken(supabaseUrl, anonKey, refreshToken)
    if (!token) {
      console.log('[SW] Refresh token falhou, pulando')
      return
    }
  }

  try {
    const f = `fazenda_id=eq.${fazendaId}`
    const ativo = `&ativo=eq.true&order=nome`
    const [pastos, lotes, frigorificos, causasMorte, bebedouros, fornecedores, funcionarios, individuos, mineral, proteinado, racao, insumos] = await Promise.all([
      fetchTable(supabaseUrl, anonKey, token, 'pastos', `select=*&${f}${ativo}`),
      fetchTable(supabaseUrl, anonKey, token, 'lotes', `select=*&${f}${ativo}`),
      fetchTable(supabaseUrl, anonKey, token, 'frigorificos', `select=*&${f}${ativo}`),
      fetchTable(supabaseUrl, anonKey, token, 'causas_morte', `select=*&${f}${ativo}`),
      fetchTable(supabaseUrl, anonKey, token, 'bebedouros', `select=*&${f}${ativo}`),
      fetchTable(supabaseUrl, anonKey, token, 'fornecedores', `select=*&${f}${ativo}`),
      fetchTable(supabaseUrl, anonKey, token, 'funcionarios', `select=*&${f}${ativo}`),
      fetchTable(supabaseUrl, anonKey, token, 'individuos', `select=id,id_manejo,id_brinco,id_chip,id_provisorio_cria,sexo,raca,categoria,classificacao_matriz,numero_partos,status&${f}&status=eq.Vivo&order=id_manejo&limit=1000`),
      fetchTable(supabaseUrl, anonKey, token, 'mineral', `select=*&${f}${ativo}`),
      fetchTable(supabaseUrl, anonKey, token, 'proteinado', `select=*&${f}${ativo}`),
      fetchTable(supabaseUrl, anonKey, token, 'racao', `select=*&${f}${ativo}`),
      fetchTable(supabaseUrl, anonKey, token, 'insumos', `select=*&${f}${ativo}`),
    ])

    // Transformar em CadastroCacheData (mesmo formato do fetchCadastroData no app)
    const pastoNomeById: Record<string, string> = {}
    pastos.forEach((p: any) => { pastoNomeById[p.id] = p.nome })
    const lotesPastoMap: Record<string, string> = {}
    lotes.forEach((l: any) => { lotesPastoMap[l.nome] = pastoNomeById[l.pasto_id] || '' })

    const data = {
      pastos: pastos.map((p: any) => p.nome),
      lotes: lotes.map((l: any) => l.nome),
      frigorificos: frigorificos.map((x: any) => x.nome),
      causasMorte: causasMorte.map((x: any) => x.nome),
      bebedouros: bebedouros.map((x: any) => x.nome),
      fornecedores: fornecedores.map((x: any) => x.nome),
      funcionarios: funcionarios.map((x: any) => x.nome),
      pastosDetalhes: {},
      lotesDetalhes: {},
      lotesPastoMap,
      individuos: individuos.map((i: any) => ({
        id: i.id, id_manejo: i.id_manejo, id_brinco: i.id_brinco, id_chip: i.id_chip,
        id_provisorio_cria: i.id_provisorio_cria, sexo: i.sexo, raca: i.raca,
        categoria: i.categoria, classificacao_matriz: i.classificacao_matriz,
        numero_partos: i.numero_partos, status: i.status,
      })),
      mineral: mineral.map((x: any) => x.nome),
      proteinado: proteinado.map((x: any) => x.nome),
      racao: racao.map((x: any) => x.nome),
      insumos: insumos.map((x: any) => x.nome),
    }

    // Salvar em Cache API com timestamp
    const cache = await caches.open(CADASTRO_BG_CACHE)
    const cacheKey = `${self.location.origin}/cadastro-bg/${fazendaId}`
    const response = new Response(JSON.stringify({ data, timestamp: Date.now(), fazendaId }), {
      headers: { 'Content-Type': 'application/json' },
    })
    await cache.put(new Request(cacheKey), response)

    console.log('[SW] Cache de cadastro atualizado em background:', {
      pastos: data.pastos.length, lotes: data.lotes.length,
    })

    // Notificar clients ativos (se houver app aberto)
    const clients = await self.clients.matchAll()
    clients.forEach((client) => {
      client.postMessage({ type: 'BG_CACHE_UPDATED', timestamp: Date.now() })
    })
  } catch (error) {
    console.error('[SW] Erro ao buscar dados de cadastro em background:', error)
  }
}

// Message handler: SKIP_WAITING (update) + SET_SW_CONFIG (receber token/fazenda do app)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  } else if (event.data && event.data.type === 'SET_SW_CONFIG') {
    const { token, refreshToken, fazendaId, supabaseUrl, anonKey } = event.data
    if (token) putSWConfig('supabase_token', token).catch(() => {})
    if (refreshToken) putSWConfig('supabase_refresh_token', refreshToken).catch(() => {})
    if (fazendaId) putSWConfig('fazenda_id', fazendaId).catch(() => {})
    if (supabaseUrl) putSWConfig('supabase_url', supabaseUrl).catch(() => {})
    if (anonKey) putSWConfig('supabase_anon_key', anonKey).catch(() => {})
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
  // matchPrecache() resolve o cache name corretamente (workbox-precache-v2-<scope>),
  // independentemente do scope/origin. Antes o cache name era hardcoded e nunca
  // batia com o nome real gerado pelo workbox, fazendo o fallback sempre falhar.
  const cached = await matchPrecache('/Caderneta-Digital-Gesta-Up/index.html')
  if (!cached) throw new Error('No cached navigation response available')
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

// Fallback HTML minimalista: se o precache tambem falhar (race condition
// durante ativacao do SW), retorna uma pagina que recarrega sozinha
// apos 2 segundos. Inclui botao manual para o caso do auto-reload falhar
// (conhecido em iOS PWA standalone onde location.reload() pode nao disparar
// uma navegacao que o SW consiga interceptar corretamente).
function fallbackReloadHtml(): Response {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Atualizando...</title><style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:system-ui,sans-serif;background:#1a3a2a;color:#fff;text-align:center;gap:1.5rem}p{font-size:1.25rem;margin:0}button{background:#fff;color:#1a3a2a;border:none;border-radius:0.5rem;padding:0.75rem 2rem;font-size:1rem;font-weight:700;cursor:pointer}button:active{transform:scale(0.95)}</style></head><body><p>Atualizando o aplicativo...<br>A página vai recarregar automaticamente.</p><button onclick="location.reload()">Recarregar agora</button><script>setTimeout(function(){location.reload()},2000)</script></body></html>`
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
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
        try {
          return await servePrecachedIndex()
        } catch {
          return fallbackReloadHtml()
        }
      }
      return response
    } catch {
      try {
        return await servePrecachedIndex()
      } catch {
        return fallbackReloadHtml()
      }
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

// Periodic Background Sync (Android apenas, iOS não suporta)
// O navegador acorda o SW a cada ~12h (registrado em serviceWorkerRegistration.ts).
// O SW faz as 12 queries ao Supabase e salva em Cache API, mesmo com app fechado.
// Se houver clients ativos (app em background), também notifica para atualizar UI.
self.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'refresh-cadastro-cache') {
    console.log('[SW] Periodic Background Sync: fetchAndCacheCadastroData')
    event.waitUntil(fetchAndCacheCadastroData())
  }
})

// Background Sync API one-shot (Android apenas)
// Dispara quando a conectividade retorna, mesmo com o app fechado.
// sync-registros: notifica clients ativos para sincronizar fila de registros.
// refresh-cadastro-cache: faz fetch de cadastro e salva em Cache API.
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
    console.log('[SW] Background Sync: fetchAndCacheCadastroData')
    event.waitUntil(fetchAndCacheCadastroData())
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

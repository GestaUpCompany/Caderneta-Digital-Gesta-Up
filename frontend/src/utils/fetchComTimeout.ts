// Tempo máximo de uma requisição ao Supabase. Sem limite, uma conexão pendurada (Wi-Fi sem internet,
// sinal fraco) prende telas e o ciclo de sync até o navegador desistir, o que pode levar minutos.
const TIMEOUT_PADRAO_MS = 20_000
const TIMEOUT_UPLOAD_MS = 60_000 // fotos: o corpo é grande e o sinal no campo é lento
const TIMEOUT_FUNCTION_MS = 30_000

export function timeoutDaRequisicaoMs(url: string): number {
  if (url.includes('/storage/v1/object')) return TIMEOUT_UPLOAD_MS
  if (url.includes('/functions/v1/')) return TIMEOUT_FUNCTION_MS
  return TIMEOUT_PADRAO_MS
}

/**
 * Envolve o fetch com um limite de tempo. Ao estourar, a requisição é abortada (AbortError), que o sync
 * classifica como falha de rede e reenvia sozinho; as escritas são idempotentes por local_id.
 * `fetchBase` é resolvido a cada chamada para respeitar quem substitui `window.fetch`.
 */
export function criarFetchComTimeout(fetchBase: typeof fetch = (...args) => fetch(...args)): typeof fetch {
  return (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutDaRequisicaoMs(url))

    // Respeita o cancelamento de quem chamou (ex.: navegação, debounce)
    const sinalDoChamador = init?.signal ?? (input instanceof Request ? input.signal : undefined)
    if (sinalDoChamador) {
      if (sinalDoChamador.aborted) controller.abort()
      else sinalDoChamador.addEventListener('abort', () => controller.abort(), { once: true })
    }

    return fetchBase(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
  }
}

const NETWORK_CODES = new Set(['ERR_NETWORK', 'ERR_INTERNET_DISCONNECTED', 'ERR_TIMED_OUT', 'network', 'offline', 'timeout'])

// O cliente do Supabase (postgrest-js) transforma a exceção do fetch em um objeto comum com "Nome: mensagem",
// sem `name`: o AbortError do nosso timeout chega como "AbortError: The operation was aborted."
const NETWORK_MESSAGE = /failed to fetch|networkerror|network request failed|load failed|network error|timeout|timed out|abort|err_internet_disconnected|err_network/i

// Códigos Postgres/PostgREST de falha momentânea do servidor: timeout de statement, deadlock, conexões esgotadas,
// banco indisponível, cache de schema recarregando. Repetir mais tarde costuma resolver.
const TRANSIENT_CODES = new Set([
  '57014', // statement_timeout
  '40001', // serialization_failure
  '40P01', // deadlock_detected
  '55P03', // lock_not_available
  '53300', // too_many_connections
  '53400', // configuration_limit_exceeded
  '08000', '08003', '08006', // connection_exception
  'PGRST000', 'PGRST001', 'PGRST002', 'PGRST003', // sem conexão com o banco, schema cache, pool
  '408', '429', '502', '503', '504',
])

// Gateway fora do ar chega sem código, só com o corpo da resposta (muitas vezes uma página HTML).
const TRANSIENT_MESSAGE = /<html|<!doctype|bad gateway|service unavailable|gateway time-?out|upstream|too many requests|temporarily unavailable/i

// JWT vencido durante o ciclo: o próximo ciclo reautentica antes de enviar.
const AUTH_EXPIRED_CODES = new Set(['PGRST301', '401'])

export type ClasseErroSync = 'network' | 'transient' | 'permanent'

/** Tentativas automáticas para falhas transitórias do servidor antes de o registro virar `error`. */
export const MAX_TENTATIVAS_TRANSITORIAS = 6

/** Espera antes da próxima tentativa: 15 s, 30 s, 1 min, 2 min, 5 min, 10 min. */
export function esperaTransitoriaMs(tentativasFeitas: number): number {
  const passos = [15_000, 30_000, 60_000, 120_000, 300_000, 600_000]
  return passos[Math.min(Math.max(tentativasFeitas, 0), passos.length - 1)]
}

/**
 * Indica se o erro é de conectividade (sem rede, rede travada, timeout) e não uma recusa do servidor.
 * Nesses casos o registro deve continuar na fila: a requisição pode nem ter saído do aparelho, e as
 * tabelas de registro são idempotentes por local_id, então reenviar não duplica.
 */
export function isNetworkError(error: unknown, onLine: boolean = typeof navigator === 'undefined' ? true : navigator.onLine): boolean {
  if (!onLine) return true

  const err = error as any
  if (!err) return false

  if (err.name === 'AbortError') return true

  const code = String(err.code ?? err.error?.code ?? '')
  if (code && NETWORK_CODES.has(code)) return true

  // Erro do Postgres/PostgREST tem código próprio (23505, 42501...): é resposta do servidor, não falha de rede.
  if (code && /^[0-9A-Z]{5}$/.test(code)) return false
  if (err.status && Number(err.status) >= 400) return false

  return NETWORK_MESSAGE.test(String(err.message ?? err.error?.message ?? err))
}

/** Falha momentânea do servidor ou JWT vencido: vale tentar de novo sozinho, com espera crescente. */
export function isTransientServerError(error: unknown): boolean {
  const err = error as any
  if (!err) return false

  const code = String(err.code ?? err.error?.code ?? err.status ?? '')
  if (code && (TRANSIENT_CODES.has(code) || AUTH_EXPIRED_CODES.has(code))) return true

  const message = String(err.message ?? err.error?.message ?? '')
  if (/jwt expired/i.test(message)) return true

  // Sem código do banco, o texto do corpo revela gateway indisponível. Com código de 5 caracteres (23505...) é recusa.
  if (!code || !/^[0-9A-Z]{5}$/.test(code)) return TRANSIENT_MESSAGE.test(message)
  return false
}

export function classificarErroDeSync(
  error: unknown,
  onLine: boolean = typeof navigator === 'undefined' ? true : navigator.onLine
): ClasseErroSync {
  if (isNetworkError(error, onLine)) return 'network'
  if (isTransientServerError(error)) return 'transient'
  return 'permanent'
}

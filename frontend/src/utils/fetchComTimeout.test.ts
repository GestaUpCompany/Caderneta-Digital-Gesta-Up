import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarFetchComTimeout, timeoutDaRequisicaoMs } from './fetchComTimeout'

describe('timeoutDaRequisicaoMs', () => {
  it('dá mais tempo para upload de foto e function', () => {
    expect(timeoutDaRequisicaoMs('https://x.supabase.co/rest/v1/registros_rodeio')).toBe(20_000)
    expect(timeoutDaRequisicaoMs('https://x.supabase.co/storage/v1/object/fotos-registros/a.webp')).toBe(60_000)
    expect(timeoutDaRequisicaoMs('https://x.supabase.co/functions/v1/login-peao')).toBe(30_000)
  })
})

describe('criarFetchComTimeout', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  // fetch que só termina quando o sinal aborta, como uma conexão pendurada
  const fetchPendurado = ((_input: any, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
    })) as typeof fetch

  it('aborta a requisição pendurada depois do limite', async () => {
    const f = criarFetchComTimeout(fetchPendurado)
    const resultado = f('https://x.supabase.co/rest/v1/registros_rodeio').catch((e) => e)
    await vi.advanceTimersByTimeAsync(20_001)
    expect((await resultado).name).toBe('AbortError')
  })

  it('não aborta quem responde a tempo', async () => {
    const ok = (async () => new Response('{}', { status: 200 })) as typeof fetch
    const f = criarFetchComTimeout(ok)
    const resposta = await f('https://x.supabase.co/rest/v1/registros_rodeio')
    expect(resposta.status).toBe(200)
  })

  it('propaga o cancelamento de quem chamou', async () => {
    const f = criarFetchComTimeout(fetchPendurado)
    const externo = new AbortController()
    const resultado = f('https://x.supabase.co/rest/v1/x', { signal: externo.signal }).catch((e) => e)
    externo.abort()
    expect((await resultado).name).toBe('AbortError')
  })
})

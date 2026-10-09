import { beforeEach, describe, expect, it } from 'vitest'
import {
  criarFetchComTimeout,
  redeInstavelRecentemente,
  registrarFalhaDeRede,
  registrarRespostaDeRede,
} from './fetchComTimeout'

describe('sinal de rede instável', () => {
  beforeEach(() => registrarRespostaDeRede())

  it('começa sem falha registrada', () => {
    expect(redeInstavelRecentemente()).toBe(false)
  })

  it('vale só dentro da janela', () => {
    registrarFalhaDeRede(1_000)
    expect(redeInstavelRecentemente(20_000, 5_000)).toBe(true)
    expect(redeInstavelRecentemente(20_000, 30_000)).toBe(false)
  })

  it('falha de conexão liga o sinal e a próxima resposta desliga', async () => {
    const falha = criarFetchComTimeout((() => Promise.reject(new TypeError('Failed to fetch'))) as unknown as typeof fetch)
    await expect(falha('https://x.supabase.co/rest/v1/a')).rejects.toThrow('Failed to fetch')
    expect(redeInstavelRecentemente()).toBe(true)

    const ok = criarFetchComTimeout((() => Promise.resolve(new Response('{}'))) as unknown as typeof fetch)
    await ok('https://x.supabase.co/rest/v1/a')
    expect(redeInstavelRecentemente()).toBe(false)
  })

  it('cancelamento de quem chamou não conta como rede ruim', async () => {
    const controller = new AbortController()
    controller.abort()
    const abortado = criarFetchComTimeout((() => Promise.reject(new DOMException('abort', 'AbortError'))) as unknown as typeof fetch)
    await expect(abortado('https://x.supabase.co/rest/v1/a', { signal: controller.signal })).rejects.toThrow()
    expect(redeInstavelRecentemente()).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import {
  classificarErroDeSync,
  esperaTransitoriaMs,
  isNetworkError,
  isTransientServerError,
  MAX_TENTATIVAS_TRANSITORIAS,
} from './syncErrors'

describe('isTransientServerError', () => {
  it('reconhece falhas momentâneas do banco', () => {
    expect(isTransientServerError({ code: '57014', message: 'canceling statement due to statement timeout' })).toBe(true)
    expect(isTransientServerError({ code: '40P01', message: 'deadlock detected' })).toBe(true)
    expect(isTransientServerError({ code: 'PGRST002', message: 'Could not query the database for the schema cache' })).toBe(true)
    expect(isTransientServerError({ code: '53300', message: 'too many connections' })).toBe(true)
  })

  it('reconhece gateway indisponível, com código numérico ou só com o corpo da resposta', () => {
    expect(isTransientServerError({ code: '503', message: 'Service Unavailable' })).toBe(true)
    expect(isTransientServerError({ status: 429, message: 'x' })).toBe(true)
    expect(isTransientServerError({ message: '<html><head><title>502 Bad Gateway</title></head></html>' })).toBe(true)
    expect(isTransientServerError({ message: 'An invalid response was received from the upstream server' })).toBe(true)
  })

  it('trata JWT vencido como transitório (o próximo ciclo reautentica)', () => {
    expect(isTransientServerError({ code: 'PGRST301', message: 'JWT expired' })).toBe(true)
    expect(isTransientServerError({ message: 'JWT expired' })).toBe(true)
  })

  it('não repete erro que o servidor recusou de forma definitiva', () => {
    expect(isTransientServerError({ code: '23505', message: 'duplicate key' })).toBe(false)
    expect(isTransientServerError({ code: '42501', message: 'row-level security' })).toBe(false)
    expect(isTransientServerError({ code: '23514', message: 'check constraint' })).toBe(false)
    expect(isTransientServerError({ code: 'P0001', message: 'CATEGORIA_NOT_IN_LOTE' })).toBe(false)
    expect(isTransientServerError(new Error('Cannot read properties of undefined'))).toBe(false)
  })
})

describe('classificarErroDeSync', () => {
  it('separa rede, transitório e definitivo', () => {
    expect(classificarErroDeSync(new TypeError('Failed to fetch'), true)).toBe('network')
    expect(classificarErroDeSync({ code: '57014', message: 'timeout' }, true)).toBe('transient')
    expect(classificarErroDeSync({ code: '23505', message: 'duplicate' }, true)).toBe('permanent')
  })
})

describe('esperaTransitoriaMs', () => {
  it('cresce a cada tentativa e para no teto', () => {
    expect(esperaTransitoriaMs(0)).toBe(15_000)
    expect(esperaTransitoriaMs(2)).toBe(60_000)
    expect(esperaTransitoriaMs(MAX_TENTATIVAS_TRANSITORIAS + 10)).toBe(600_000)
  })
})

describe('isNetworkError', () => {
  it('reconhece falha de fetch do navegador', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'), true)).toBe(true)
    expect(isNetworkError(new TypeError('NetworkError when attempting to fetch resource.'), true)).toBe(true)
    expect(isNetworkError(new TypeError('Load failed'), true)).toBe(true)
  })

  it('reconhece timeout e abort', () => {
    expect(isNetworkError(new Error('timeout'), true)).toBe(true)
    expect(isNetworkError({ name: 'AbortError', message: 'aborted' }, true)).toBe(true)
  })

  it('reconhece o abort do nosso timeout como o postgrest-js o entrega (objeto sem name, código vazio)', () => {
    expect(isNetworkError({ message: 'AbortError: The operation was aborted.', details: '', hint: '', code: '' }, true)).toBe(true)
    expect(isNetworkError({ message: 'AbortError: signal is aborted without reason', code: '' }, true)).toBe(true)
  })

  it('reconhece códigos de rede', () => {
    expect(isNetworkError({ code: 'ERR_NETWORK' }, true)).toBe(true)
    expect(isNetworkError({ code: 'ERR_INTERNET_DISCONNECTED' }, true)).toBe(true)
  })

  it('trata qualquer erro como de rede quando o aparelho está offline', () => {
    expect(isNetworkError(new Error('qualquer coisa'), false)).toBe(true)
  })

  it('não confunde recusa do servidor com falha de rede', () => {
    expect(isNetworkError({ code: '23505', message: 'duplicate key value violates unique constraint' }, true)).toBe(false)
    expect(isNetworkError({ code: '42501', message: 'new row violates row-level security policy' }, true)).toBe(false)
    expect(isNetworkError({ code: 'P0001', message: 'CATEGORIA_NOT_IN_LOTE' }, true)).toBe(false)
    expect(isNetworkError({ status: 401, message: 'JWT expired' }, true)).toBe(false)
  })

  it('não trata erro comum de código como falha de rede', () => {
    expect(isNetworkError(new Error('Cannot read properties of undefined'), true)).toBe(false)
    expect(isNetworkError(null, true)).toBe(false)
  })
})

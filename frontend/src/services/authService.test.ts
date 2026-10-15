import { afterEach, describe, expect, it, vi } from 'vitest'
import { lerAcessoIdPersistido } from './authService'

function stubLocalStorage(valor: string | null) {
  vi.stubGlobal('localStorage', { getItem: () => valor })
}

describe('lerAcessoIdPersistido', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lê o acessoId do estado persistido pelo redux-persist', () => {
    stubLocalStorage(JSON.stringify({ config: JSON.stringify({ acessoId: 'chibata', configurado: true }) }))
    expect(lerAcessoIdPersistido()).toBe('chibata')
  })

  it('devolve null sem estado, sem acessoId ou com JSON inválido', () => {
    stubLocalStorage(null)
    expect(lerAcessoIdPersistido()).toBeNull()
    stubLocalStorage(JSON.stringify({ config: JSON.stringify({ acessoId: '  ' }) }))
    expect(lerAcessoIdPersistido()).toBeNull()
    stubLocalStorage('{quebrado')
    expect(lerAcessoIdPersistido()).toBeNull()
  })
})

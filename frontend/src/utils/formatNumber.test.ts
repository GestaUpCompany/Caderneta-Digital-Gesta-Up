import { describe, it, expect } from 'vitest'
import { normalizarNumero } from './formatNumber'

describe('normalizarNumero', () => {
  it('retorna null para vazio e inválido', () => {
    expect(normalizarNumero('')).toBeNull()
    expect(normalizarNumero(null)).toBeNull()
    expect(normalizarNumero(undefined)).toBeNull()
  })

  it('aceita vírgula e ponto decimais', () => {
    expect(normalizarNumero('1,5')).toBe(1.5)
    expect(normalizarNumero('1.5')).toBe(1.5)
    expect(normalizarNumero(7)).toBe(7)
  })
})

import { describe, it, expect } from 'vitest'
import { reescalarInsumos } from './reescalarInsumos'

describe('reescalarInsumos', () => {
  it('mantém a proporção', () => {
    expect(reescalarInsumos([600, 400], 1000, 500)).toEqual([300, 200])
  })

  it('soma exatamente o novo total (resíduo no maior insumo)', () => {
    const r = reescalarInsumos([1, 1, 1], 3, 10)
    expect(Math.round(r.reduce((a, b) => a + b, 0) * 100) / 100).toBe(10)
  })

  it('sem base de proporção devolve os valores originais', () => {
    expect(reescalarInsumos([0, 0], 0, 100)).toEqual([0, 0])
    expect(reescalarInsumos([5], 0, 100)).toEqual([5])
  })

  it('lista vazia', () => {
    expect(reescalarInsumos([], 100, 50)).toEqual([])
  })
})

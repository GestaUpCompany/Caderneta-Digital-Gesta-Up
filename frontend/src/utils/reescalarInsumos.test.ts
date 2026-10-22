import { describe, it, expect } from 'vitest'
import { reescalarInsumos, distribuirNoInsumo } from './reescalarInsumos'

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

describe('distribuirNoInsumo', () => {
  it('uma linha recebe o valor novo', () => {
    expect(distribuirNoInsumo([40], 55)).toEqual([55])
  })

  it('várias linhas mantêm a proporção', () => {
    expect(distribuirNoInsumo([30, 10], 20)).toEqual([15, 5])
  })

  it('linhas zeradas: tudo na primeira', () => {
    expect(distribuirNoInsumo([0, 0], 12.345)).toEqual([12.35, 0])
  })

  it('sem linhas', () => {
    expect(distribuirNoInsumo([], 10)).toEqual([])
  })
})

import { describe, it, expect } from 'vitest'
import { tanquesIndisponiveis } from './abastecimentoTanques'

describe('tanquesIndisponiveis', () => {
  it('offline com cache vazio: fazenda sem tanques, não bloqueia', () => {
    expect(tanquesIndisponiveis([], false, false)).toBe(false)
  })
  it('offline sem cache nenhum: indisponível', () => {
    expect(tanquesIndisponiveis(null, false, false)).toBe(true)
  })
  it('offline com tanque em cache: disponível', () => {
    expect(tanquesIndisponiveis([{ id: 't1' }], false, false)).toBe(false)
  })
  it('online com lista vazia vinda do cache/rede instável: indisponível', () => {
    expect(tanquesIndisponiveis([], false, true)).toBe(true)
  })
  it('online com lista vazia confirmada pelo servidor: fazenda sem tanques', () => {
    expect(tanquesIndisponiveis([], true, true)).toBe(false)
  })
  it('online com tanque do servidor: disponível', () => {
    expect(tanquesIndisponiveis([{ id: 't1' }], true, true)).toBe(false)
  })
})

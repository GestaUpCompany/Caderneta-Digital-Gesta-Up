import { describe, expect, it } from 'vitest'
import { corteAtingidoPorData, corteDasCategorias, formatarCorteBR } from './dataRetroativaMovimentacao'

const agora = new Date('2026-10-16T14:00:00-04:00')
const cats = [
  { categoria: 'bezerro', created_at: '2026-10-09T13:55:58-04:00' },
  { categoria: 'garrote', created_at: '2026-09-01T10:00:00-04:00' },
]

describe('corteDasCategorias', () => {
  it('usa o maior created_at', () => {
    expect(corteDasCategorias(cats)?.toISOString()).toBe(new Date('2026-10-09T13:55:58-04:00').toISOString())
  })
  it('retorna null sem categorias ou sem created_at', () => {
    expect(corteDasCategorias([])).toBeNull()
    expect(corteDasCategorias(undefined)).toBeNull()
    expect(corteDasCategorias([{ categoria: 'x' }])).toBeNull()
  })
})

describe('corteAtingidoPorData', () => {
  it('detecta data anterior ao corte', () => {
    const corte = corteAtingidoPorData('25/09/2026', cats, agora)
    expect(corte).not.toBeNull()
    expect(formatarCorteBR(corte!)).toBe('09/10/2026')
  })
  it('não avisa para data posterior ao corte', () => {
    expect(corteAtingidoPorData('16/10/2026', cats, agora)).toBeNull()
  })
  it('no dia do corte, com a hora atual depois dele, não avisa', () => {
    expect(corteAtingidoPorData('09/10/2026', cats, agora)).toBeNull()
  })
  it('ignora data inválida e lote sem corte', () => {
    expect(corteAtingidoPorData('', cats, agora)).toBeNull()
    expect(corteAtingidoPorData('25/09/2026', [], agora)).toBeNull()
  })
})

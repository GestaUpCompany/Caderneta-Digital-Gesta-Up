import { describe, it, expect } from 'vitest'
import {
  calcularDistanciaPuxada,
  atingiuLimiar,
  motivoBloqueioRefresh,
  PTR_LIMIAR_PX,
  PTR_MAX_PX,
} from './pullToRefreshLogic'

describe('calcularDistanciaPuxada', () => {
  it('ignora arrasto para cima ou nulo', () => {
    expect(calcularDistanciaPuxada(-30)).toBe(0)
    expect(calcularDistanciaPuxada(0)).toBe(0)
  })
  it('aplica resistência e respeita o teto', () => {
    expect(calcularDistanciaPuxada(100)).toBe(50)
    expect(calcularDistanciaPuxada(1000)).toBe(PTR_MAX_PX)
  })
})

describe('atingiuLimiar', () => {
  it('só dispara a partir do limiar', () => {
    expect(atingiuLimiar(PTR_LIMIAR_PX - 1)).toBe(false)
    expect(atingiuLimiar(PTR_LIMIAR_PX)).toBe(true)
  })
})

describe('motivoBloqueioRefresh', () => {
  const base = { online: true, testModeAtivo: false, fazendaId: 'f1' }
  it('libera quando tudo ok', () => {
    expect(motivoBloqueioRefresh(base)).toBeNull()
  })
  it('bloqueia offline, modo teste e sem fazenda', () => {
    expect(motivoBloqueioRefresh({ ...base, online: false })).toBe('offline')
    expect(motivoBloqueioRefresh({ ...base, testModeAtivo: true })).toBe('modo-teste')
    expect(motivoBloqueioRefresh({ ...base, fazendaId: null })).toBe('sem-fazenda')
  })
})

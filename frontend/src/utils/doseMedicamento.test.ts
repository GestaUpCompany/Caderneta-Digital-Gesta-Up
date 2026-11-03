import { describe, expect, it } from 'vitest'
import { baixaPorMedicamento, frascosValidos } from './doseMedicamento'

const draxxin = { id: 'd', controla_estoque: true }
const exceller = { id: 'e', controla_estoque: true }
const penicilina = { id: 'p', controla_estoque: false }

describe('frascosValidos', () => {
  it('aceita só inteiros positivos', () => {
    expect(frascosValidos(2)).toBe(2)
    expect(frascosValidos('3')).toBe(3)
  })

  it('fração, zero, vazio e texto valem 0', () => {
    expect(frascosValidos(0.5)).toBe(0)
    expect(frascosValidos('1,5')).toBe(0)
    expect(frascosValidos(0)).toBe(0)
    expect(frascosValidos('')).toBe(0)
    expect(frascosValidos(null)).toBe(0)
    expect(frascosValidos(undefined)).toBe(0)
    expect(frascosValidos('abc')).toBe(0)
    expect(frascosValidos(-1)).toBe(0)
  })
})

describe('baixaPorMedicamento', () => {
  const meds = [draxxin, exceller, penicilina]

  it('soma os frascos do mesmo medicamento, como o trigger', () => {
    const r = baixaPorMedicamento(
      [
        { medicamentoId: 'd', frascosUsados: 1 },
        { medicamentoId: 'd', frascosUsados: 2 },
      ],
      meds,
    )
    expect(r).toEqual([{ medicamentoId: 'd', quantidade: 3 }])
  })

  it('ignora item sem frascos e medicamentos que não controlam estoque', () => {
    const r = baixaPorMedicamento(
      [
        { medicamentoId: 'e', frascosUsados: 0 },
        { medicamentoId: 'e' },
        { medicamentoId: 'p', frascosUsados: 1 },
        { medicamentoId: 'd', frascosUsados: 1 },
        { medicamentoId: 'x', frascosUsados: 1 },
      ],
      meds,
    )
    expect(r).toEqual([{ medicamentoId: 'd', quantidade: 1 }])
  })

  it('não gera baixa para lista vazia', () => {
    expect(baixaPorMedicamento([], meds)).toEqual([])
  })
})

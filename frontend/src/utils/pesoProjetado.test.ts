import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { calcularPesoProjetado, type ParametrosPesoProjetado } from './pesoProjetado'

const base: ParametrosPesoProjetado = {
  pesoInicioKgCab: null,
  dataInicio: '2026-07-16',
  gmdEfetivo: 1.35,
  dataAjustePeso: null,
  pesoVivoAtualKgCab: null,
}

describe('calcularPesoProjetado', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 30, 10, 0))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('lote misto projeta cada categoria pela sua base (caso Lote 3 Marin Pequenos)', () => {
    const peso = calcularPesoProjetado('29/10/2026', {
      ...base,
      // Campos médios do cálculo antigo, que davam 151,83 kg: não podem mais ser usados
      pesoInicioKgCab: 453.4 / 45,
      categoriasProjecao: [
        { quant: 44, gmd: 1.35, base: 'ajuste', pesoBase: 568.52 },
        { quant: 1, gmd: 1.35, base: 'inicio', pesoBase: 453.4 },
      ],
    })
    // Boi magro: 568,52 - 1,35 = 567,17; garrote: 453,40 + 1,35 × 105 = 595,15
    expect(peso).toBeCloseTo((567.17 * 44 + 595.15) / 45, 2)
  })

  it('lote só com ajuste projeta a partir de hoje', () => {
    const peso = calcularPesoProjetado('28/10/2026', {
      ...base,
      categoriasProjecao: [{ quant: 10, gmd: 1.5, base: 'ajuste', pesoBase: 400 }],
    })
    expect(peso).toBeCloseTo(397, 2)
  })

  it('lote sem ajuste dá o mesmo resultado da projeção média', () => {
    const categoriasProjecao = [
      { quant: 10, gmd: 1, base: 'inicio' as const, pesoBase: 200 },
      { quant: 30, gmd: 2, base: 'inicio' as const, pesoBase: 300 },
    ]
    const porCategoria = calcularPesoProjetado('2026-07-26', { ...base, categoriasProjecao })
    const media = calcularPesoProjetado('2026-07-26', {
      ...base,
      pesoInicioKgCab: (200 * 10 + 300 * 30) / 40,
      gmdEfetivo: (1 * 10 + 2 * 30) / 40,
    })
    expect(porCategoria).toBeCloseTo(media!, 6)
  })

  it('cache antigo sem categoriasProjecao usa os campos médios', () => {
    const peso = calcularPesoProjetado('2026-07-26', { ...base, pesoInicioKgCab: 300 })
    expect(peso).toBeCloseTo(313.5, 2)
  })
})

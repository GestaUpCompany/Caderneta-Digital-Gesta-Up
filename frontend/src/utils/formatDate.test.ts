import { describe, it, expect, afterEach, vi } from 'vitest'
import { addDaysISO, getDayRangeIso, isFutureBR, toFarmDateISO } from './formatDate'

describe('toFarmDateISO', () => {
  it('converte timestamptz UTC para o dia da fazenda', () => {
    // 21:00 em Cuiabá = 01:00 UTC do dia seguinte
    expect(toFarmDateISO('2026-10-09T01:00:00+00:00', 'America/Cuiaba')).toBe('2026-10-08')
    expect(toFarmDateISO('2026-10-08T14:00:00+00:00', 'America/Cuiaba')).toBe('2026-10-08')
  })

  it('aceita o formato Postgres com espaço e offset curto', () => {
    expect(toFarmDateISO('2026-10-09 01:00:00+00', 'America/Cuiaba')).toBe('2026-10-08')
  })

  it('mantém datas sem hora e converte BR', () => {
    expect(toFarmDateISO('2026-10-08')).toBe('2026-10-08')
    expect(toFarmDateISO('08/10/2026 21:30')).toBe('2026-10-08')
    expect(toFarmDateISO(null)).toBe('')
  })
})

describe('addDaysISO', () => {
  it('vira mês e ano', () => {
    expect(addDaysISO('2026-02-28', 1)).toBe('2026-03-01')
    expect(addDaysISO('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDaysISO('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('getDayRangeIso', () => {
  it('usa o offset de Cuiabá (-04:00) nos dois limites', () => {
    expect(getDayRangeIso('2026-10-08', 'America/Cuiaba')).toEqual({
      inicio: '2026-10-08T00:00:00-04:00',
      fim: '2026-10-09T00:00:00-04:00',
    })
  })

  it('inclui um lançamento das 21h locais no dia certo', () => {
    const { inicio, fim } = getDayRangeIso('2026-10-08', 'America/Cuiaba')
    // 21:00 em Cuiabá = 01:00 UTC do dia seguinte
    const lancamento = new Date('2026-10-09T01:00:00Z').getTime()
    expect(lancamento).toBeGreaterThanOrEqual(new Date(inicio).getTime())
    expect(lancamento).toBeLessThan(new Date(fim).getTime())
  })

  it('vira o mês no limite final', () => {
    expect(getDayRangeIso('2026-10-31', 'America/Cuiaba').fim).toBe('2026-11-01T00:00:00-04:00')
  })
})

describe('isFutureBR', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('compara com o dia da fazenda, não com o do aparelho', () => {
    // 01:30 UTC de 08/10 ainda é 21:30 de 07/10 em Cuiabá
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-08T01:30:00Z'))
    expect(isFutureBR('07/10/2026', 'America/Cuiaba')).toBe(false)
    expect(isFutureBR('07/10/2026 23:59', 'America/Cuiaba')).toBe(false)
    expect(isFutureBR('06/10/2026', 'America/Cuiaba')).toBe(false)
    expect(isFutureBR('08/10/2026', 'America/Cuiaba')).toBe(true)
    expect(isFutureBR('01/01/2027', 'America/Cuiaba')).toBe(true)
  })
})

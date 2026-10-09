import { describe, expect, it } from 'vitest'
import { formatarVersaoCompleta } from './version'

describe('formatarVersaoCompleta', () => {
  it('produção não leva etiqueta de ambiente', () => {
    expect(formatarVersaoCompleta('1.0.0', '2026.10.08-222ba39', 'producao')).toBe('1.0.0 · 2026.10.08-222ba39')
  })
  it('staging leva a etiqueta STAGING', () => {
    expect(formatarVersaoCompleta('1.0.0', '2026.10.08-222ba39', 'staging')).toBe('1.0.0 · 2026.10.08-222ba39 · STAGING')
  })
})

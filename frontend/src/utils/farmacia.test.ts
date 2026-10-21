import { describe, it, expect } from 'vitest'
import { validateFarmacia } from './validation'

const base = { data: '21/10/2026', tipoMovimentacao: 'entrada', medicamentoId: 'm1', quantidade: '2,5' }

describe('validateFarmacia', () => {
  it('aceita entrada e saída completas', () => {
    expect(validateFarmacia(base).isValid).toBe(true)
    expect(validateFarmacia({ ...base, tipoMovimentacao: 'baixa' }).isValid).toBe(true)
  })

  it('exige tipo, medicamento e quantidade positiva', () => {
    const r = validateFarmacia({ ...base, tipoMovimentacao: '', medicamentoId: '', quantidade: '0' })
    expect(r.errors.map((e) => e.field)).toEqual(['tipoMovimentacao', 'medicamentoId', 'quantidade'])
  })

  it('rejeita data inválida', () => {
    expect(validateFarmacia({ ...base, data: '' }).errors[0].field).toBe('data')
  })
})

import { describe, expect, it } from 'vitest'
import { validateBebedouros } from './validation'

const base = () => ({ data: '08/10/2026', responsavel: 'Victor Hugo', numeroBebedouro: 'Bebedouro Pasto A1', leituraBebedouro: 2 })
const campos = (extra: Record<string, unknown> = {}) => validateBebedouros({ ...base(), ...extra }).errors.map((e) => e.field)

describe('validateBebedouros', () => {
  it('aceita o registro completo', () => {
    expect(validateBebedouros(base()).isValid).toBe(true)
  })

  it('exige responsável, bebedouro e leitura de 1 a 3', () => {
    expect(campos({ responsavel: '' })).toContain('responsavel')
    expect(campos({ numeroBebedouro: '' })).toContain('numeroBebedouro')
    expect(campos({ leituraBebedouro: null })).toContain('leituraBebedouro')
    expect(campos({ leituraBebedouro: 0 })).toContain('leituraBebedouro')
    expect(campos({ leituraBebedouro: 4 })).toContain('leituraBebedouro')
    expect(campos({ leituraBebedouro: 3 })).toEqual([])
  })

  it('recusa data inválida', () => {
    expect(campos({ data: '31/02/2026' })).toContain('data')
  })
})

import { describe, expect, it } from 'vitest'
import { validateSuplementacao } from './validation'

const base = () => ({
  data: '08/10/2026',
  tratador: 'Victor Hugo',
  pasto: 'P20',
  formulacao: 'Terminação Boi',
  leituraCocho: '1',
  kgCocho: 120,
  possuiDeposito: false,
  suplementarAdulto: true,
  suplementarCreep: false,
})

const campos = (extra: Record<string, unknown> = {}) =>
  validateSuplementacao({ ...base(), ...extra }).errors.map((e) => e.field)

describe('validateSuplementacao', () => {
  it('aceita o registro completo do lote', () => {
    expect(validateSuplementacao(base()).isValid).toBe(true)
  })

  it('exige pasto, formulação, leitura e quantidade do lote', () => {
    expect(campos({ pasto: '' })).toContain('pasto')
    expect(campos({ formulacao: '' })).toContain('formulacao')
    expect(campos({ leituraCocho: '' })).toContain('leituraCocho')
    expect(campos({ kgCocho: 0 })).toContain('kgCocho')
  })

  it('leitura do cocho vai de -1 a 3', () => {
    expect(campos({ leituraCocho: '-1' })).not.toContain('leituraCocho')
    expect(campos({ leituraCocho: '3' })).not.toContain('leituraCocho')
    expect(campos({ leituraCocho: '4' })).toContain('leituraCocho')
  })

  it('só creep: dispensa o grupo do lote, mas exige o creep completo', () => {
    const soCreep = { suplementarAdulto: false, suplementarCreep: true, formulacao: null, leituraCocho: null, kgCocho: null }
    expect(campos({ ...soCreep, creepFormulacao: 'Creep Teste', creepLeitura: '1', creepKgCocho: 25 })).toEqual([])
    expect(campos({ ...soCreep, creepFormulacao: 'Creep Teste', creepLeitura: '', creepKgCocho: 25 })).toContain('creepLeitura')
    expect(campos({ ...soCreep, creepFormulacao: '', creepLeitura: '1', creepKgCocho: 25 })).toContain('creepFormulacao')
  })

  it('sem lote nem creep preenchidos, recusa', () => {
    expect(campos({ suplementarAdulto: false, suplementarCreep: false })).toContain('suplementarCreep')
  })

  it('depósito só é exigido quando o pasto tem depósito', () => {
    expect(campos({ possuiDeposito: false, kgDeposito: 0 })).not.toContain('kgDeposito')
    expect(campos({ possuiDeposito: true, kgDeposito: 0 })).toContain('kgDeposito')
    expect(campos({ possuiDeposito: true, kgDeposito: 120 })).not.toContain('kgDeposito')
  })
})

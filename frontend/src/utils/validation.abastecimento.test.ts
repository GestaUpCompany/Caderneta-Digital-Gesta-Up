import { describe, expect, it } from 'vitest'
import { validateAbastecimento } from './validation'

const base = () => ({
  data: '09/10/2026',
  quemAbasteceu: 'Victor Hugo',
  operadorMotorista: 'Victor Hugo',
  maquinaVeiculo: 'Deere BH 154',
  totalAbastecido: '10',
  combustivel: 'Diesel Comum',
  odometro: '1234,5',
  tipoOperacao: 'Limpeza',
})
const campos = (extra: Record<string, unknown> = {}) => validateAbastecimento({ ...base(), ...extra }).errors.map((e) => e.field)

describe('validateAbastecimento', () => {
  it('aceita o registro completo', () => {
    expect(validateAbastecimento(base()).isValid).toBe(true)
  })

  it('exige total abastecido maior que zero', () => {
    expect(campos({ totalAbastecido: '' })).toContain('totalAbastecido')
    expect(campos({ totalAbastecido: '0' })).toContain('totalAbastecido')
    expect(campos({ totalAbastecido: '-5' })).toContain('totalAbastecido')
    expect(campos({ totalAbastecido: 'abc' })).toContain('totalAbastecido')
    expect(campos({ totalAbastecido: '12,5' })).toEqual([])
  })

  it('odômetro só é dispensado com a máquina sem horímetro', () => {
    expect(campos({ odometro: '' })).toContain('odometro')
    expect(campos({ odometro: '', semHorimetro: true })).toEqual([])
    expect(campos({ odometro: 'abc' })).toContain('odometro')
  })

  it('serviço Outros exige especificar', () => {
    expect(campos({ tipoOperacao: 'Outros' })).toContain('tipoOperacaoOutros')
    expect(campos({ tipoOperacao: 'Outros', tipoOperacaoOutros: 'Reboque' })).toEqual([])
  })

  it('recusa data inválida e campos de identificação vazios', () => {
    expect(campos({ data: '31/02/2026' })).toContain('data')
    expect(campos({ maquinaVeiculo: '' })).toContain('maquinaVeiculo')
    expect(campos({ operadorMotorista: '' })).toContain('operadorMotorista')
    expect(campos({ combustivel: '' })).toContain('combustivel')
  })
})

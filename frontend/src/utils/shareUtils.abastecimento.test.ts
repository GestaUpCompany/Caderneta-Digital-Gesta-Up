import { describe, expect, it } from 'vitest'
import { formatarRegistroComoTexto } from './shareUtils'

const base = () =>
  ({
    id: 'a1',
    data: '09/10/2026 09:11',
    quemAbasteceu: 'Victor Hugo',
    operadorMotorista: 'Victor Hugo',
    maquinaVeiculo: 'Deere BH 154',
    placa: 'ABC1D23',
    totalAbastecido: '10',
    totalBomba: '1234,5',
    combustivel: 'Diesel Comum',
    tanqueNome: 'Diesel Comum',
    odometro: '1234.5',
    tipoOperacao: 'Limpeza',
  }) as any

const texto = (extra: Record<string, unknown> = {}) => formatarRegistroComoTexto({ ...base(), ...extra }, 'abastecimento')

describe('texto compartilhável do Abastecimento', () => {
  it('traz máquina, operador, litros, tanque e horímetro', () => {
    const t = texto()
    expect(t).toContain('MÁQUINA/VEÍCULO: *Deere BH 154*')
    expect(t).toContain('OPERADOR MOTORISTA: *Victor Hugo*')
    expect(t).toContain('TOTAL ABASTECIDO: *10 L*')
    expect(t).toContain('TANQUE: *Diesel Comum*')
    expect(t).toContain('TIPO DE OPERAÇÃO: *Limpeza*')
    expect(t).not.toContain('Sem horímetro')
  })

  it('máquina sem horímetro aparece como tal', () => {
    expect(texto({ odometro: '', semHorimetro: true })).toContain('ODÔMETRO/HORÍMETRO: *Sem horímetro*')
  })

  it('sem tanque (fazenda sem controle de estoque) não imprime a linha do tanque', () => {
    expect(texto({ tanqueNome: '' })).not.toContain('TANQUE:')
  })

  it('serviço Outros mostra o que foi especificado', () => {
    expect(texto({ tipoOperacao: 'Outros', tipoOperacaoOutros: 'Reboque' })).toContain('ESPECIFICAR: *Reboque*')
  })

  it('não vaza ids internos nem sinaliza foto', () => {
    const t = texto({ tanqueId: 'abc', maquinaVeiculoId: 'def' })
    expect(t).not.toContain('abc')
    expect(t).not.toContain('def')
    expect(t.toLowerCase()).not.toContain('foto')
  })
})

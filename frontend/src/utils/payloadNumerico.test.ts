import { describe, expect, it } from 'vitest'
import { COLUNAS_NUMERICAS, paraNumero, sanitizarPayloadNumerico, ValorForaDaFaixaError } from './payloadNumerico'

describe('paraNumero', () => {
  it('aceita vírgula decimal e milhar com vírgula', () => {
    expect(paraNumero('12,5')).toBe(12.5)
    expect(paraNumero('1.234,5')).toBe(1234.5)
    expect(paraNumero(' 40 ')).toBe(40)
  })
  it('sem vírgula lê como o JavaScript (comportamento anterior)', () => {
    expect(paraNumero('1.5')).toBe(1.5)
    expect(paraNumero('0.125')).toBe(0.125)
    expect(paraNumero(7)).toBe(7)
  })
  it('devolve NaN para o que não é número', () => {
    expect(paraNumero('')).toBeNaN()
    expect(paraNumero('abc')).toBeNaN()
    expect(paraNumero(undefined)).toBeNaN()
    expect(paraNumero(null)).toBeNaN()
  })
})

describe('sanitizarPayloadNumerico', () => {
  it('converte decimal em coluna inteira (Morte: peso 433.99)', () => {
    expect(sanitizarPayloadNumerico('registros_morte', { peso_vivo: '433.99' }).peso_vivo).toBe(434)
    expect(sanitizarPayloadNumerico('registros_morte', { peso_vivo: 254.4 }).peso_vivo).toBe(254)
  })

  it('vírgula decimal e arredondamento na escala da coluna', () => {
    const r = sanitizarPayloadNumerico('registros_suplementacao', { kg_cocho: '1045,456', kg_deposito: 0 })
    expect(r.kg_cocho).toBe(1045.46)
    expect(r.kg_deposito).toBe(0)
  })

  it('vazio, nulo, NaN e lixo viram null, sem quebrar', () => {
    const r = sanitizarPayloadNumerico('registros_rodeio', { vaca: '', touro: null, boi: NaN, bezerro: 'abc', garrote: undefined })
    expect(r).toEqual({ vaca: null, touro: null, boi: null, bezerro: null, garrote: null })
  })

  it('valor que estoura numeric(10,2) é barrado antes do envio (caso Chibata 104530000)', () => {
    expect(() => sanitizarPayloadNumerico('registros_suplementacao', { kg_cocho: 104530000 })).toThrow(ValorForaDaFaixaError)
    expect(sanitizarPayloadNumerico('registros_suplementacao', { kg_cocho: 99999999.99 }).kg_cocho).toBe(99999999.99)
  })

  it('inteiro acima do limite do integer é barrado', () => {
    expect(() => sanitizarPayloadNumerico('registros_rodeio', { vaca: 3_000_000_000 })).toThrow(ValorForaDaFaixaError)
  })

  it('não mexe em outros campos, em tabelas fora do mapa nem em campos ausentes', () => {
    const base = { nome: 'x', pasto: 'P1', local_id: 'a-1' }
    expect(sanitizarPayloadNumerico('registros_rodeio', base)).toEqual(base)
    expect(sanitizarPayloadNumerico('tabela_desconhecida', { vaca: '12,5' })).toEqual({ vaca: '12,5' })
    expect(sanitizarPayloadNumerico(undefined, { vaca: '12,5' })).toEqual({ vaca: '12,5' })
  })

  it('coordenadas e colunas livres passam como número', () => {
    const r = sanitizarPayloadNumerico('registros_morte', { latitude: -15.1234567, longitude: '-56,5', escore: '3' })
    expect(r).toEqual({ latitude: -15.1234567, longitude: -56.5, escore: 3 })
  })

  it('o mapa cobre as colunas do caso real', () => {
    expect(COLUNAS_NUMERICAS.registros_suplementacao.kg_cocho).toEqual({ p: 10, s: 2 })
    expect(COLUNAS_NUMERICAS.registros_morte.peso_vivo).toBe('int')
  })
})

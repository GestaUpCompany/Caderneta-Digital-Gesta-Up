import { describe, expect, it } from 'vitest'
import { conflitosComRebanho, conflitosDeIdentificacao, mesmoId } from './maternidadeIds'

const base = { cria1Viva: true, cria2Viva: false, guacho1: false, guacho2: false }
const campos = (f: Record<string, unknown>, op = base) => conflitosDeIdentificacao(f, op).map((e) => e.field)

describe('mesmoId', () => {
  it('ignora caixa e espaços, e vazio nunca é igual a vazio', () => {
    expect(mesmoId('870 F', ' 870 f ')).toBe(true)
    expect(mesmoId('', '')).toBe(false)
    expect(mesmoId(null, undefined)).toBe(false)
    expect(mesmoId('870', '871')).toBe(false)
  })
})

describe('conflitosDeIdentificacao', () => {
  it('brinco da cria igual ao da mãe (o caso que travava o sync na Chibiu)', () => {
    expect(campos({ idBrincoCria: '870 F', idBrincoMae: '870 F' })).toEqual(['idBrincoCria'])
    expect(conflitosDeIdentificacao({ idBrincoCria: '870 F', idBrincoMae: '870 f' }, base)[0].message).toMatch(/brinco da cria não pode ser igual ao brinco da mãe/)
  })

  it('chip da cria igual ao da mãe', () => {
    expect(campos({ idChipCria: '55', idChipMae: '55' })).toEqual(['idChipCria'])
  })

  it('cria sem brinco/chip nunca conflita (só ID provisório)', () => {
    expect(campos({ idBrincoCria: '', idBrincoMae: '870 F', idChipCria: '', idChipMae: '' })).toEqual([])
  })

  it('cria morta não tem identificação e não entra na checagem', () => {
    expect(campos({ idBrincoCria: '870', idBrincoMae: '870' }, { ...base, cria1Viva: false })).toEqual([])
  })

  it('gêmeos: brinco repetido entre as crias e entre a 2ª cria e a mãe', () => {
    const op = { ...base, cria2Viva: true }
    expect(campos({ idBrincoCria: '1', idBrincoCria2: '1', idBrincoMae: '9' }, op)).toEqual(['idBrincoCria2'])
    expect(campos({ idBrincoCria: '1', idBrincoCria2: '9', idBrincoMae: '9' }, op)).toEqual(['idBrincoCria2'])
  })

  it('mãe adotiva só conta quando é guacho', () => {
    const f = { idBrincoCria: '7', idBrincoMae: '9', idBrincoMaeAdotiva: '7' }
    expect(campos(f)).toEqual([])
    expect(campos(f, { ...base, guacho1: true })).toEqual(['idBrincoCria'])
  })
})

describe('conflitosComRebanho', () => {
  const rebanho = [{ id: 'a', id_brinco: 'MAE-BR-N1', id_chip: null }, { id: 'b', id_brinco: null, id_chip: '4' }]
  const op = { cria1Viva: true, cria2Viva: false }

  it('avisa quando o brinco ou o chip da cria já existe no aparelho', () => {
    expect(conflitosComRebanho({ idBrincoCria: ' mae-br-n1 ' }, op, rebanho).map((e) => e.field)).toEqual(['idBrincoCria'])
    expect(conflitosComRebanho({ idChipCria: '4' }, op, rebanho).map((e) => e.field)).toEqual(['idChipCria'])
  })

  it('brinco novo, vazio ou cria morta passam', () => {
    expect(conflitosComRebanho({ idBrincoCria: 'NOVO-1' }, op, rebanho)).toEqual([])
    expect(conflitosComRebanho({ idBrincoCria: '' }, op, rebanho)).toEqual([])
    expect(conflitosComRebanho({ idBrincoCria: 'MAE-BR-N1' }, { cria1Viva: false, cria2Viva: false }, rebanho)).toEqual([])
  })
})

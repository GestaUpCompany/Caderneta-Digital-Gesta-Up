import { describe, expect, it } from 'vitest'
import { validateCurral } from './validation'

const base = () => ({
  data: '10/10/2026',
  numeroLote: 'ENS-L1',
  curralSaida: 'ENS-C1',
  curralEntrada: 'ENS-C2',
  gadoContado: 'Sim',
  categorias_detalhes: [{ nome: 'Boi', quant_atual: 10, quant_informada: 10 }],
  escoreGado: '3',
  escoreFezes: '3',
  numeroPessoasManejo: 2,
  equipe_nomes: ['A', 'B'],
})

const campos = (d: Record<string, unknown>) => validateCurral(d).errors.map((e) => e.field)

describe('validateCurral', () => {
  it('payload completo é válido', () => {
    expect(validateCurral(base()).errors).toEqual([])
  })

  it.each([
    ['numeroLote', 'numeroLote'],
    ['curralSaida', 'curralSaida'],
    ['curralEntrada', 'curralEntrada'],
    ['gadoContado', 'gadoContado'],
    ['escoreGado', 'escoreGado'],
    ['escoreFezes', 'escoreFezes'],
    ['numeroPessoasManejo', 'numeroPessoasManejo'],
  ])('esvaziar %s reclama só de %s', (campo, esperado) => {
    expect(campos({ ...base(), [campo]: '' })).toEqual(expect.arrayContaining([esperado]))
  })

  it('curral de entrada igual ao de saída é recusado', () => {
    expect(campos({ ...base(), curralEntrada: 'ENS-C1' })).toEqual(['curralEntrada'])
  })

  it('contado "Sim" exige ao menos uma categoria informada', () => {
    expect(campos({ ...base(), categorias_detalhes: [{ nome: 'Boi', quant_atual: 10, quant_informada: 0 }] })).toEqual(['categorias'])
  })

  it('contado "Não" não exige categorias', () => {
    expect(validateCurral({ ...base(), gadoContado: 'Não', categorias_detalhes: null }).errors).toEqual([])
  })

  it('equipe precisa de um nome por pessoa', () => {
    expect(campos({ ...base(), equipe_nomes: ['A', ''] })).toEqual(['equipeNomes'])
  })
})

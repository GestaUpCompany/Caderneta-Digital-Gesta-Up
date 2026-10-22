import { describe, expect, it } from 'vitest'
import { baixaPorMedicamento, doseParaEstoque, modoBaixaMedicamento, unidadeDoseFixa } from './doseMedicamento'

const draxxin = { id: 'd', unidade: 'frasco', conteudo_por_unidade: 500, conteudo_unidade: 'mL', controla_estoque: true }
const exceller = { id: 'e', unidade: 'dose', conteudo_por_unidade: null, conteudo_unidade: null, controla_estoque: true }
const penicilina = { id: 'p', unidade: 'un', conteudo_por_unidade: null, conteudo_unidade: null, controla_estoque: false }
const oleo = { id: 'o', unidade: 'L', conteudo_por_unidade: null, conteudo_unidade: null, controla_estoque: true }

describe('modoBaixaMedicamento', () => {
  it('classifica pelo mesmo critério do Painel', () => {
    expect(modoBaixaMedicamento(draxxin)).toBe('embalagem')
    expect(modoBaixaMedicamento(exceller)).toBe('sem_conversao')
    expect(modoBaixaMedicamento(penicilina)).toBe('nao_controla')
    expect(modoBaixaMedicamento(oleo)).toBe('direta')
  })
})

describe('unidadeDoseFixa', () => {
  it('trava a unidade pelo medicamento; sem conversão deixa o peão escolher', () => {
    expect(unidadeDoseFixa(draxxin)).toBe('ml')
    expect(unidadeDoseFixa({ ...draxxin, conteudo_unidade: 'mg' })).toBe('mg')
    expect(unidadeDoseFixa(oleo)).toBe('ml')
    expect(unidadeDoseFixa({ unidade: 'g', controla_estoque: true })).toBe('mg')
    expect(unidadeDoseFixa(exceller)).toBeNull()
    expect(unidadeDoseFixa(penicilina)).toBeNull()
  })
})

describe('doseParaEstoque (paridade com farmacia_dose_para_estoque)', () => {
  it('converte pela embalagem', () => {
    expect(doseParaEstoque('5 ml', draxxin)).toBeCloseTo(0.01, 6)
  })

  it('converte direto para mL, L, g e kg', () => {
    expect(doseParaEstoque('20 ml', oleo)).toBeCloseTo(0.02, 6)
    expect(doseParaEstoque('500 mg', { unidade: 'g', controla_estoque: true })).toBeCloseTo(0.5, 6)
    expect(doseParaEstoque('2000 mg', { unidade: 'kg', controla_estoque: true })).toBeCloseTo(0.002, 6)
  })

  it('aceita vírgula decimal', () => {
    expect(doseParaEstoque('1,5 ml', oleo)).toBeCloseTo(0.0015, 6)
  })

  it('não converte sem conteúdo, formato livre ou unidade incompatível', () => {
    expect(doseParaEstoque('3 ml', exceller)).toBeNull()
    expect(doseParaEstoque('10ml IM', draxxin)).toBeNull()
    expect(doseParaEstoque('1,5 mg', { unidade: 'un', controla_estoque: true })).toBeNull()
    expect(doseParaEstoque('5 ml', { unidade: 'g', controla_estoque: true })).toBeNull()
    expect(doseParaEstoque('0 ml', draxxin)).toBeNull()
    expect(doseParaEstoque('', draxxin)).toBeNull()
  })
})

describe('baixaPorMedicamento', () => {
  const meds = [draxxin, exceller, penicilina]

  it('soma as doses do mesmo medicamento, como o trigger', () => {
    const r = baixaPorMedicamento(
      [
        { medicamentoId: 'd', doseAplicada: '5 ml' },
        { medicamentoId: 'd', doseAplicada: '5 ml' },
      ],
      meds,
    )
    expect(r).toEqual([{ medicamentoId: 'd', quantidade: 0.02 }])
  })

  it('ignora sem conversão e medicamentos que não controlam estoque', () => {
    const r = baixaPorMedicamento(
      [
        { medicamentoId: 'e', doseAplicada: '3 ml' },
        { medicamentoId: 'p', doseAplicada: '20 ml' },
        { medicamentoId: 'd', doseAplicada: '5 ml' },
      ],
      meds,
    )
    expect(r.map((b) => b.medicamentoId)).toEqual(['d'])
  })

  it('não gera baixa para lista vazia', () => {
    expect(baixaPorMedicamento([], meds)).toEqual([])
  })
})

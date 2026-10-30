import { describe, it, expect } from 'vitest'
import { calcularPlanoNutricional } from './planoNutricionalCalculo'

const plano = { data_inicio: '2026-01-01', formulacao_id: 'f1' }

describe('calcularPlanoNutricional', () => {
  it('sem categorias devolve plano sem projeção, com nome da formulação', () => {
    expect(calcularPlanoNutricional(plano, 'Dieta A', [], [], [])).toEqual({
      pesoInicioKgCab: null,
      dataInicio: '2026-01-01',
      gmdEfetivo: null,
      dataAjustePeso: null,
      pesoVivoAtualKgCab: null,
      formulacaoId: 'f1',
      formulacaoNome: 'Dieta A',
      categoriasProjecao: [],
    })
  })

  it('lote misto guarda a base de projeção de cada categoria', () => {
    const categorias = [
      { id: 'c1', categoria: 'Boi magro', quant_atual: 44, data_ajuste_peso: '2026-10-30', peso_vivo_atual_kg_cab: 568.52 },
      { id: 'c2', categoria: 'Garrote', quant_atual: 1, data_ajuste_peso: null, peso_vivo_atual_kg_cab: 596.5 },
    ]
    const personalizacao = [{ lote_categoria_id: 'c2', peso_inicio_kg_cab: 453.4 }]
    const gmds = [
      { categoria: 'boi magro', gmd: 1.35 },
      { categoria: 'garrote', gmd: 1.35 },
    ]
    const r = calcularPlanoNutricional(plano, null, categorias, personalizacao, gmds)
    expect(r.categoriasProjecao).toEqual([
      { quant: 44, gmd: 1.35, base: 'ajuste', pesoBase: 568.52 },
      { quant: 1, gmd: 1.35, base: 'inicio', pesoBase: 453.4 },
    ])
  })

  it('projeta por peso de início quando nenhuma categoria tem ajuste', () => {
    const categorias = [
      { id: 'c1', categoria: 'Novilhas', quant_atual: 10, data_ajuste_peso: null, peso_vivo_atual_kg_cab: null },
      { id: 'c2', categoria: 'Bois', quant_atual: 30, data_ajuste_peso: null, peso_vivo_atual_kg_cab: null },
    ]
    const personalizacao = [
      { lote_categoria_id: 'c1', peso_inicio_kg_cab: 200 },
      { lote_categoria_id: 'c2', peso_inicio_kg_cab: 300 },
    ]
    const gmds = [
      { categoria: 'novilhas', gmd: 1 },
      { categoria: 'BOIS', gmd: 2 },
    ]
    const r = calcularPlanoNutricional(plano, 'Dieta A', categorias, personalizacao, gmds)
    expect(r.pesoInicioKgCab).toBeCloseTo((200 * 10 + 300 * 30) / 40)
    expect(r.gmdEfetivo).toBeCloseTo((1 * 10 + 2 * 30) / 40)
    expect(r.pesoVivoAtualKgCab).toBeNull()
  })

  it('usa projeção por ajuste quando todas as categorias têm ajuste', () => {
    const categorias = [
      { id: 'c1', categoria: 'Bois', quant_atual: 10, data_ajuste_peso: '2026-03-01', peso_vivo_atual_kg_cab: 400 },
    ]
    const gmds = [{ categoria: 'bois', gmd: 1.5 }]
    const r = calcularPlanoNutricional(plano, null, categorias, [], gmds)
    expect(r.pesoInicioKgCab).toBeNull()
    expect(r.pesoVivoAtualKgCab).toBeCloseTo(400)
    expect(r.dataAjustePeso).toBe('2026-03-01')
    expect(r.gmdEfetivo).toBeCloseTo(1.5)
  })

  it('ignora categoria sem GMD na formulação', () => {
    const categorias = [
      { id: 'c1', categoria: 'Vacas', quant_atual: 10, data_ajuste_peso: null, peso_vivo_atual_kg_cab: null },
    ]
    const personalizacao = [{ lote_categoria_id: 'c1', peso_inicio_kg_cab: 250 }]
    const r = calcularPlanoNutricional(plano, null, categorias, personalizacao, [])
    expect(r.gmdEfetivo).toBeNull()
    expect(r.pesoInicioKgCab).toBeNull()
  })
})

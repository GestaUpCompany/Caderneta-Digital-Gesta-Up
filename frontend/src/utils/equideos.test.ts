import { describe, it, expect } from 'vitest'
import { ehEquideo, formatarTropaCard, tropaPorEspecie } from './equideos'

describe('formatarTropaCard', () => {
  const detalhes = [
    { nome: 'égua', quant_informada: 8 },
    { nome: 'burro', quant_informada: 6 },
  ]

  it('mostra o total com o detalhe por espécie e sexo', () => {
    expect(formatarTropaCard(14, { categorias_detalhes: detalhes })).toBe('14 (Égua 8 · Burro 6)')
  })

  it('lê categorias_detalhes como string JSON (registro já sincronizado)', () => {
    expect(formatarTropaCard(14, { categorias_detalhes: JSON.stringify(detalhes) })).toBe('14 (Égua 8 · Burro 6)')
  })

  it('mostra só o total quando não há detalhe de equídeos', () => {
    expect(formatarTropaCard(5, {})).toBe('5')
    expect(formatarTropaCard(5, { categorias_detalhes: [{ nome: 'vaca', quant_informada: 5 }] })).toBe('5')
    expect(formatarTropaCard(5, { categorias_detalhes: 'json inválido' })).toBe('5')
  })
})

describe('ehEquideo', () => {
  it('reconhece os 6 equídeos, com ou sem acento e em qualquer caixa', () => {
    for (const nome of ['cavalo', 'Égua', 'egua', 'JUMENTO', 'Jumenta', 'burro', 'Mula']) {
      expect(ehEquideo(nome)).toBe(true)
    }
  })

  it('não reconhece categorias bovinas nem a tropa genérica', () => {
    for (const nome of ['vaca', 'boi gordo', 'tropa']) {
      expect(ehEquideo(nome)).toBe(false)
    }
  })
})

describe('tropaPorEspecie', () => {
  it('detalha só os equídeos com quantidade, na ordem de espécie e sexo', () => {
    const detalhes = [
      { nome: 'burro', quant_informada: 6 },
      { nome: 'vaca', quant_informada: 50 },
      { nome: 'égua', quant_informada: 8 },
      { nome: 'cavalo', quant_informada: 0 },
    ]
    expect(tropaPorEspecie(detalhes)).toEqual([
      { rotulo: 'Égua', quantidade: 8 },
      { rotulo: 'Burro', quantidade: 6 },
    ])
  })

  it('retorna vazio sem detalhes', () => {
    expect(tropaPorEspecie(null)).toEqual([])
    expect(tropaPorEspecie(undefined)).toEqual([])
  })
})

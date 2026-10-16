import { describe, expect, it } from 'vitest'
import { acharConflitoComAnimalBaixado, acharPorIdentificador, mesclarAnimais, normalizarIdentificador } from './identificadores'

const lista = [
  { id: 'a', id_manejo: 'M-001', id_brinco: 'AB-12', id_chip: null },
  { id: 'b', id_manejo: null, id_brinco: '2021-089', id_chip: '982000123456789' },
]

describe('normalizarIdentificador', () => {
  it('apara e põe em maiúsculas; vazio vira string vazia', () => {
    expect(normalizarIdentificador('  ab-12 ')).toBe('AB-12')
    expect(normalizarIdentificador(null)).toBe('')
    expect(normalizarIdentificador(undefined)).toBe('')
  })
})

describe('acharPorIdentificador', () => {
  it('ignora caixa e espaços', () => {
    expect(acharPorIdentificador(lista, { brinco: ' ab-12' })?.id).toBe('a')
    expect(acharPorIdentificador(lista, { manejo: 'm-001' })?.id).toBe('a')
  })

  it('acha o identificador digitado em qualquer campo', () => {
    expect(acharPorIdentificador(lista, { manejo: '2021-089' })?.id).toBe('b')
    expect(acharPorIdentificador(lista, { chip: 'ab-12' })?.id).toBe('a')
  })

  it('valor vazio ou ausente não casa com animal sem aquele identificador', () => {
    expect(acharPorIdentificador(lista, { brinco: '   ' })).toBeUndefined()
    expect(acharPorIdentificador(lista, {})).toBeUndefined()
    expect(acharPorIdentificador(lista, { brinco: 'NAO-EXISTE' })).toBeUndefined()
  })
})

describe('acharConflitoComAnimalBaixado', () => {
  const baixados = [
    { id: 'x', id_brinco: 'Z-9', id_chip: null, id_manejo: null, status: 'Morto' },
    { id: 'y', id_brinco: null, id_chip: '111', id_manejo: 'M-7', status: 'Vendido' },
  ]

  it('avisa quando o número digitado é de um animal baixado, comparando campo a campo', () => {
    expect(acharConflitoComAnimalBaixado(baixados, { brinco: ' z-9 ' })).toEqual({ campo: 'brinco', valor: 'z-9', status: 'Morto' })
    expect(acharConflitoComAnimalBaixado(baixados, { chip: '111' })).toEqual({ campo: 'chip', valor: '111', status: 'Vendido' })
  })

  it('o mesmo número em outro campo não é conflito (a unicidade é por campo)', () => {
    expect(acharConflitoComAnimalBaixado(baixados, { manejo: 'Z-9' })).toBeUndefined()
  })

  it('sem digitação ou sem baixados não há conflito', () => {
    expect(acharConflitoComAnimalBaixado(baixados, {})).toBeUndefined()
    expect(acharConflitoComAnimalBaixado([], { brinco: 'Z-9' })).toBeUndefined()
  })
})

describe('mesclarAnimais', () => {
  it('não repete animal e mantém a prioridade da primeira lista', () => {
    const r = mesclarAnimais(
      [{ id: '1', id_brinco: 'A' }],
      [{ id: '1', id_brinco: 'DIFERENTE' }, { id: '2', id_brinco: 'B' }]
    )
    expect(r.map((a) => [a.id, a.id_brinco])).toEqual([['1', 'A'], ['2', 'B']])
  })
})

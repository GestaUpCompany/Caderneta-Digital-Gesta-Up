import { describe, it, expect } from 'vitest'
import { individuoVivoPorIdentificacao } from './individuoPorIdentificacao'

const base = [
  { id: 'a', id_brinco: '928 F', id_chip: null, status: 'Vivo' },
  { id: 'b', id_brinco: 'X1', id_chip: 'CHIP-1', status: 'Vivo' },
  { id: 'c', id_brinco: 'MORTO1', id_chip: null, status: 'Morto' },
]

describe('individuoVivoPorIdentificacao', () => {
  it('acha por brinco ignorando caixa e espaços', () => {
    expect(individuoVivoPorIdentificacao(base, ' 928 f ', '')).toBe('a')
  })
  it('chip tem prioridade sobre o brinco', () => {
    expect(individuoVivoPorIdentificacao(base, '928 F', 'chip-1')).toBe('b')
  })
  it('ignora animal que não está Vivo', () => {
    expect(individuoVivoPorIdentificacao(base, 'MORTO1', '')).toBeNull()
  })
  it('não vincula quando há mais de um candidato', () => {
    const dup = [...base, { id: 'd', id_brinco: '928 f', status: 'Vivo' }]
    expect(individuoVivoPorIdentificacao(dup, '928 F', '')).toBeNull()
  })
  it('sem identificação devolve null', () => {
    expect(individuoVivoPorIdentificacao(base, '', '')).toBeNull()
  })
})

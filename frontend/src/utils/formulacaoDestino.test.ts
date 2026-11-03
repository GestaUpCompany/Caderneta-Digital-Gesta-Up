import { describe, it, expect } from 'vitest'
import { sugerirFormulacaoDestino } from './formulacaoDestino'

const destinos = [
  { id: 'a', nome: 'PROTEINADO 0,3%' },
  { id: 'b', nome: 'Sal Mineral Reprodução' },
  { id: 'c', nome: 'Ração Engorda' },
]

describe('sugerirFormulacaoDestino', () => {
  it('sugere a de mesmo nome ignorando caixa', () => {
    expect(sugerirFormulacaoDestino('Proteinado 0,3%', destinos)?.id).toBe('a')
  })

  it('ignora acento e espaço duplicado', () => {
    expect(sugerirFormulacaoDestino('  Sal  Mineral Reproducao ', destinos)?.id).toBe('b')
  })

  it('não sugere quando não há nome igual', () => {
    expect(sugerirFormulacaoDestino('Ração Recria', destinos)).toBeNull()
  })

  it('não sugere quando há mais de uma com o mesmo nome', () => {
    const duplicadas = [...destinos, { id: 'd', nome: 'racao engorda' }]
    expect(sugerirFormulacaoDestino('Ração Engorda', duplicadas)).toBeNull()
  })

  it('nome vazio não sugere nada', () => {
    expect(sugerirFormulacaoDestino('', destinos)).toBeNull()
  })
})

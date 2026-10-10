import { describe, expect, it } from 'vitest'
import { ocupacaoVigentePorCurral } from './ocupacaoCurral'

const oc = (id: string, curral_id: string, data_inicial: string) => ({ id, curral_id, data_inicial })

describe('ocupacaoVigentePorCurral', () => {
  it('mantém uma ocupação por curral sem alterar a lista (caso normal, 1:1)', () => {
    const lista = [oc('a', 'c1', '2026-10-01'), oc('b', 'c2', '2026-09-20')]
    expect(ocupacaoVigentePorCurral(lista)).toEqual(lista)
  })

  it('em cache antigo com duas ocupações no mesmo curral, vale a de maior data_inicial', () => {
    const lista = [oc('antiga', 'c1', '2026-10-05'), oc('nova', 'c1', '2026-10-08')]
    expect(ocupacaoVigentePorCurral(lista).map((o) => o.id)).toEqual(['nova'])
  })

  it('a ordem da lista não muda o resultado', () => {
    const lista = [oc('nova', 'c1', '2026-10-08'), oc('antiga', 'c1', '2026-10-05')]
    expect(ocupacaoVigentePorCurral(lista).map((o) => o.id)).toEqual(['nova'])
  })

  it('em empate de data_inicial, mantém a primeira da lista', () => {
    const lista = [oc('primeira', 'c1', '2026-10-06'), oc('segunda', 'c1', '2026-10-06')]
    expect(ocupacaoVigentePorCurral(lista).map((o) => o.id)).toEqual(['primeira'])
  })

  it('resolve cada curral de forma independente', () => {
    const lista = [oc('a1', 'c1', '2026-10-01'), oc('a2', 'c1', '2026-10-08'), oc('b1', 'c2', '2026-09-01')]
    expect(ocupacaoVigentePorCurral(lista).map((o) => o.id).sort()).toEqual(['a2', 'b1'])
  })

  it('aceita lista vazia, nula e indefinida', () => {
    expect(ocupacaoVigentePorCurral([])).toEqual([])
    expect(ocupacaoVigentePorCurral(null)).toEqual([])
    expect(ocupacaoVigentePorCurral(undefined)).toEqual([])
  })
})

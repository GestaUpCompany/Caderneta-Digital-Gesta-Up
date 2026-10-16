import { describe, expect, it } from 'vitest'
import { CADERNETAS, CADERNETAS_EM_TESTE, FAZENDA_DE_TESTES_ID, cadernetaVisivelNaFazenda } from './constants'

describe('cadernetas em teste', () => {
  it('só aparecem na fazenda de testes; as demais valem para todas', () => {
    for (const id of CADERNETAS_EM_TESTE) {
      expect(cadernetaVisivelNaFazenda(id, FAZENDA_DE_TESTES_ID)).toBe(true)
      expect(cadernetaVisivelNaFazenda(id, 'outra-fazenda')).toBe(false)
      expect(cadernetaVisivelNaFazenda(id, null)).toBe(false)
      expect(cadernetaVisivelNaFazenda(id, undefined)).toBe(false)
    }
    expect(cadernetaVisivelNaFazenda('enfermaria', 'outra-fazenda')).toBe(true)
  })

  it('a lista de teste tem manejo de curral e sanidade, e todas existem no menu', () => {
    expect([...CADERNETAS_EM_TESTE].sort()).toEqual(['manejo-curral', 'sanidade'])
    for (const id of CADERNETAS_EM_TESTE) expect(CADERNETAS.some((c) => c.id === id)).toBe(true)
  })
})

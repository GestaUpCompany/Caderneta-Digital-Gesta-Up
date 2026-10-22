import { describe, expect, it } from 'vitest'
import {
  CADERNETAS,
  CADERNETAS_EM_TESTE,
  CADERNETAS_IATF,
  CADERNETA_GRUPO_CORES,
  CADERNETA_GRUPO_ORDEM,
  FAZENDA_DE_TESTES_ID,
  cadernetaVisivel,
  cadernetaVisivelNaFazenda,
} from './constants'

describe('cadernetas em teste: Reprodução, Sanidade, Manejo de Curral e Farmácia', () => {
  it('só aparecem na fazenda de testes; as demais valem para todas', () => {
    expect([...CADERNETAS_EM_TESTE].sort()).toEqual(['entrada-farmacia', 'manejo-curral', 'reproducao', 'saida-farmacia', 'sanidade'])
    for (const id of CADERNETAS_EM_TESTE) {
      expect(cadernetaVisivelNaFazenda(id, FAZENDA_DE_TESTES_ID)).toBe(true)
      expect(cadernetaVisivelNaFazenda(id, 'outra-fazenda')).toBe(false)
      expect(cadernetaVisivelNaFazenda(id, null)).toBe(false)
      expect(cadernetaVisivelNaFazenda(id, undefined)).toBe(false)
    }
    for (const id of ['manejo-curral', 'reproducao', 'sanidade']) {
      expect(CADERNETAS.find((c) => c.id === id)?.grupo).toBe('Controle Individual')
    }
    expect(cadernetaVisivelNaFazenda('enfermaria', 'outra-fazenda')).toBe(true)
  })
})

describe('cadernetas do IATF: flag acesso_iatf por fazenda', () => {
  it('só o Protocolo IATF depende da flag, num grupo próprio, e existe no menu', () => {
    expect([...CADERNETAS_IATF]).toEqual(['protocolo-iatf'])
    expect(CADERNETAS.find((c) => c.id === 'protocolo-iatf')?.grupo).toBe('IATF')
    expect(CADERNETAS.filter((c) => c.grupo === 'IATF')).toHaveLength(1)
  })

  it('aparece com a flag em qualquer fazenda; sem a flag (ou ainda desconhecida) fica oculto', () => {
    expect(cadernetaVisivel('protocolo-iatf', 'outra-fazenda', true)).toBe(true)
    expect(cadernetaVisivel('protocolo-iatf', FAZENDA_DE_TESTES_ID, false)).toBe(false)
    expect(cadernetaVisivel('protocolo-iatf', FAZENDA_DE_TESTES_ID, undefined)).toBe(false)
    expect(cadernetaVisivel('protocolo-iatf', null, null)).toBe(false)
    // as em teste seguem a fazenda de testes, não a flag do IATF
    expect(cadernetaVisivel('sanidade', FAZENDA_DE_TESTES_ID, false)).toBe(true)
    expect(cadernetaVisivel('sanidade', 'outra-fazenda', true)).toBe(false)
    expect(cadernetaVisivel('enfermaria', 'outra-fazenda', false)).toBe(true)
  })

  it('os grupos novos têm ordem e cor, e todo grupo usado aparece na ordem do menu', () => {
    for (const g of ['Controle Individual', 'IATF']) {
      expect(CADERNETA_GRUPO_ORDEM as readonly string[]).toContain(g)
      expect(CADERNETA_GRUPO_CORES[g]).toBeTruthy()
    }
    for (const c of CADERNETAS) expect((CADERNETA_GRUPO_ORDEM as readonly string[]).includes(c.grupo)).toBe(true)
  })

  it('o novo lote de protocolo não é item do menu: usa a mesma chave de liberação', () => {
    expect(CADERNETAS.some((c) => c.id === 'protocolo-iatf-lote')).toBe(false)
  })
})

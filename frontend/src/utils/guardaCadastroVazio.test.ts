import { describe, it, expect } from 'vitest'
import { deveBloquearCadastroVazio } from './guardaCadastroVazio'

const com = { pastos: [1, 2], lotes: [1] }
const vazio = { pastos: [], lotes: [] }

describe('deveBloquearCadastroVazio', () => {
  it('bloqueia quando pastos e lotes somem juntos de um cache que os tinha', () => {
    expect(deveBloquearCadastroVazio(com, vazio)).toBe(true)
  })
  it('não bloqueia quando só os lotes somem (fazenda sem lotes ativos)', () => {
    expect(deveBloquearCadastroVazio(com, { pastos: [1], lotes: [] })).toBe(false)
  })
  it('não bloqueia quando só os pastos somem', () => {
    expect(deveBloquearCadastroVazio(com, { pastos: [], lotes: [1] })).toBe(false)
  })
  it('não bloqueia quando não havia cache anterior (primeira atualização)', () => {
    expect(deveBloquearCadastroVazio(null, vazio)).toBe(false)
  })
  it('não bloqueia quando o anterior já estava vazio', () => {
    expect(deveBloquearCadastroVazio(vazio, vazio)).toBe(false)
  })
  it('não bloqueia atualização normal', () => {
    expect(deveBloquearCadastroVazio(com, { pastos: [1, 2, 3], lotes: [1, 2] })).toBe(false)
  })
})

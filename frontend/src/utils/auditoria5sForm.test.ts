import { describe, expect, it } from 'vitest'
import { SECOES_5S, TOTAL_ITENS_5S } from './auditoria5sItens'
import { chavesSemResposta5S, marcarRestantesConformes5S } from './auditoria5sForm'

const utilizacao = SECOES_5S[0]

describe('chavesSemResposta5S', () => {
  it('sem respostas, todos os itens faltam, na ordem da auditoria', () => {
    const faltam = chavesSemResposta5S({})
    expect(faltam).toHaveLength(TOTAL_ITENS_5S)
    expect(faltam[0]).toBe('utilizacao_1')
  })

  it('item respondido (C, N ou NA) não falta', () => {
    const faltam = chavesSemResposta5S({ utilizacao_1: 'C', utilizacao_2: 'N', utilizacao_3: 'NA' }, [], utilizacao)
    expect(faltam).toEqual(['utilizacao_4', 'utilizacao_5'])
  })

  it('itens ignorados (pendências anteriores) não contam como faltantes', () => {
    expect(chavesSemResposta5S({}, ['utilizacao_1'], utilizacao)).not.toContain('utilizacao_1')
  })
})

describe('marcarRestantesConformes5S', () => {
  it('marca C só nos itens sem resposta do pilar e preserva as respostas existentes', () => {
    const r = marcarRestantesConformes5S({ utilizacao_2: 'N', utilizacao_3: 'NA', limpeza_1: 'N' }, utilizacao)
    expect(r).toMatchObject({ utilizacao_1: 'C', utilizacao_2: 'N', utilizacao_3: 'NA', utilizacao_4: 'C', utilizacao_5: 'C', limpeza_1: 'N' })
  })

  it('não toca em itens de outros pilares nem nos ignorados', () => {
    const r = marcarRestantesConformes5S({}, utilizacao, ['utilizacao_5'])
    expect(r.utilizacao_5).toBeUndefined()
    expect(Object.keys(r).every((c) => c.startsWith('utilizacao_'))).toBe(true)
  })

  it('sem itens faltando devolve o mesmo objeto', () => {
    const itens = { utilizacao_1: 'C', utilizacao_2: 'C', utilizacao_3: 'C', utilizacao_4: 'C', utilizacao_5: 'C' }
    expect(marcarRestantesConformes5S(itens, utilizacao)).toBe(itens)
  })
})

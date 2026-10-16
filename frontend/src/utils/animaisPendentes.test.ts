import { describe, expect, it } from 'vitest'
import { extrairAnimaisPendentes } from './animaisPendentes'

const F = 'fazenda-1'

describe('extrairAnimaisPendentes', () => {
  it('lê mãe e cria dos registros pendentes e completa os campos que faltam', () => {
    const r = extrairAnimaisPendentes(
      [
        {
          novosIndividuos: [
            { id: 'm1', fazenda_id: F, id_brinco: 'MAE-1', sexo: 'Fêmea', categoria: 'Vaca', status: 'Vivo' },
            { id: 'c1', fazenda_id: F, id_provisorio_cria: 'P-1', sexo: 'Macho', categoria: 'Bezerro ao Pé', lote_atual: 'L1' },
          ],
        },
      ],
      F
    )
    expect(r).toHaveLength(2)
    expect(r[0]).toMatchObject({ id: 'm1', id_brinco: 'MAE-1', id_chip: null, status: 'Vivo' })
    expect(r[1]).toMatchObject({ id: 'c1', id_provisorio_cria: 'P-1', lote_atual: 'L1', raca: '' })
  })

  it('não repete o mesmo animal (mãe presente nos dois registros de gêmeos)', () => {
    const mae = { id: 'm1', fazenda_id: F, id_brinco: 'MAE-1' }
    const r = extrairAnimaisPendentes([{ novosIndividuos: [mae] }, { novosIndividuos: [mae, { id: 'c2', fazenda_id: F }] }], F)
    expect(r.map((a) => a.id)).toEqual(['m1', 'c2'])
  })

  it('ignora outra fazenda, animal que não está Vivo, item sem id e registro sem a lista', () => {
    const r = extrairAnimaisPendentes(
      [
        { novosIndividuos: [{ id: 'x', fazenda_id: 'outra' }, { id: 'y', fazenda_id: F, status: 'Morto' }, { fazenda_id: F }] },
        { observacao: 'sem animais' },
        null,
      ],
      F
    )
    expect(r).toEqual([])
  })
})

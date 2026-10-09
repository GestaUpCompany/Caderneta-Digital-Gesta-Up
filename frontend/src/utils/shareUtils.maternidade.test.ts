import { describe, expect, it } from 'vitest'
import { formatarRegistroComoTexto } from './shareUtils'

const base = () =>
  ({
    id: 'm1',
    data: '09/10/2026 13:27',
    pasto: 'P50',
    lote: 'Teste 3',
    idManejoMae: 'MAE-N1',
    idBrincoMae: 'MAE-BR-N1',
    categoriaMae: 'Primípara',
    escoreMatriz: 3,
    docilidadeMatriz: 1,
    tipoParto: ['Normal'],
    idProvisorioCria: 'BAT-M1',
    idBrincoCria: '',
    pesoCria: 32,
    sexo: 'Macho',
    raca: 'Nelore',
    tratamento: 'Colostro, Cura umbigo',
    novosIndividuos: [{ id: 'x', id_brinco: 'MAE-BR-N1' }],
  }) as any

const texto = (extra: Record<string, unknown> = {}) => formatarRegistroComoTexto({ ...base(), ...extra }, 'maternidade')

describe('texto compartilhável da Maternidade', () => {
  it('traz lote, mãe, parto e cria', () => {
    const t = texto()
    expect(t).toContain('LOTE: *Teste 3*')
    expect(t).toContain('ID BRINCO: *MAE-BR-N1*')
    expect(t).toContain('CATEGORIA MÃE: *Primípara*')
    expect(t).toContain('TIPO DE PARTO: *Normal*')
    expect(t).toContain('BAT-M1')
  })

  it('não vaza os animais novos que viajam no registro nem marca foto', () => {
    const t = texto()
    expect(t).not.toContain('novosIndividuos')
    expect(t).not.toContain('"id"')
    expect(t.toLowerCase()).not.toContain('foto')
  })

  it('sem valores quebrados', () => {
    expect(texto()).not.toMatch(/undefined|NaN|\[object|\bnull\b/)
  })
})

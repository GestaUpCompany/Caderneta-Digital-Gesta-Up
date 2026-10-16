import { describe, expect, it } from 'vitest'
import { formatarRegistroComoTexto } from './shareUtils'
import { novaLinha } from './manejoCurral'

const registro = () => ({
  id: 's1',
  data: '16/10/2026 10:15',
  usuario: 'Victor Hugo',
  observacao: 'Curral 2',
  linhas: [
    {
      ...novaLinha('a'),
      individuoId: 'ind-1',
      identificadorLido: 'P-7',
      idBrincoNovo: 'B-100',
      motivoTroca: 'definitivo',
      loteDestinoId: 'L1',
      loteDestinoNome: 'Lote A',
      pesoKg: '412,5',
    },
    { ...novaLinha('b'), idChipNovo: 'C-9', sexo: 'Fêmea', categoria: 'Novilha', raca: 'Nelore' },
  ],
})

describe('formatarRegistroComoTexto — manejo de curral', () => {
  it('lista os animais com identificação nova, lote, peso e animal novo', () => {
    const t = formatarRegistroComoTexto(registro() as any, 'manejo-curral')
    expect(t).toContain('MANEJO DE CURRAL')
    expect(t).toContain('2 animais')
    expect(t).toContain('1. P-7 → brinco B-100 (brinco definitivo)')
    expect(t).toContain('Lote: Lote A')
    expect(t).toContain('412,5 kg')
    expect(t).toContain('2. Animal sem ID → chip C-9')
    expect(t).toContain('Animal novo: Novilha · Fêmea · Nelore')
    expect(t).toContain('Victor Hugo')
    expect(t).toContain('Curral 2')
  })

  it('avisa que a mudança de lote aguarda o gestor', () => {
    expect(formatarRegistroComoTexto(registro() as any, 'manejo-curral')).toContain('1 mudança(s) de lote aguardam confirmação do gestor')
  })

  it('sessão sem linhas não quebra', () => {
    const t = formatarRegistroComoTexto({ id: 'x', data: '16/10/2026 10:00' } as any, 'manejo-curral')
    expect(t).toContain('0 animais')
  })
})

import { describe, expect, it } from 'vitest'
import { formatarRegistroComoTexto } from './shareUtils'

describe('formatarRegistroComoTexto — sanidade', () => {
  it('aplicação em animal: produto, dose, carência e próxima dose', () => {
    const t = formatarRegistroComoTexto(
      {
        id: 's1', data: '16/10/2026', usuario: 'Victor Hugo', alvo: 'animal', brinco: 'B-1', tipo: 'Vacinação',
        medicamentoNome: 'Aftosa', dose: '2 ml', via: 'SC', carenciaDias: '21', intervaloDias: '180', observacao: 'Curral 2',
      } as any,
      'sanidade'
    )
    expect(t).toContain('SANIDADE')
    expect(t).toContain('Vacinação*: Aftosa')
    expect(t).toContain('Animal: B-1')
    expect(t).toContain('Dose: 2 ml (SC)')
    expect(t).toContain('Carência para abate: 21 dias')
    expect(t).toContain('Reaplicar em: 180 dias')
    expect(t).toContain('Curral 2')
  })

  it('aplicação em lote: lote, categoria e cabeças', () => {
    const t = formatarRegistroComoTexto(
      { id: 's2', data: '16/10/2026', alvo: 'lote', loteNome: 'Lote A', categoria: 'Novilha', numeroCabecas: '80', tipo: 'Vermifugação', medicamentoNome: 'Ivomec', carenciaDias: '' } as any,
      'sanidade'
    )
    expect(t).toContain('Lote: Lote A (Novilha)')
    expect(t).toContain('80 cabeças')
    expect(t).not.toContain('Carência para abate')
  })
})

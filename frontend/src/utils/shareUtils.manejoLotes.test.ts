import { describe, expect, it } from 'vitest'
import { formatarRegistroComoTexto } from './shareUtils'

const base = {
  id: 'p1',
  data: '26/10/2026 10:27',
  manejador: 'Victor Hugo',
  numeroLote: 'Lote A - Bois Gordos',
  gadoContado: 'Sim',
  totalAnimais: 122,
  escoreGado: '3',
  escoreFezes: '3',
  numeroPessoasManejo: 2,
  equipe_nomes: ['Victor Hugo', 'Camila'],
}

describe('formatarRegistroComoTexto — manejo de lotes com lado curral', () => {
  it('mostra o curral de saída quando o registro de pastagens tem curralSaida', () => {
    const t = formatarRegistroComoTexto({
      ...base,
      curralSaida: 'Curral A1',
      curralSaidaId: 'c1',
      pastoEntrada: 'Pasto 2',
      pastoEntradaAreaUtil: '12',
      pastoEntradaEspecie: 'Zuri',
      avaliacaoEntrada: '4',
      tempoVedacao: 'Menos de 1 hora',
      pastoEntradaId: 'p2',
    } as any, 'pastagens')
    expect(t).toContain('CURRAL SAÍDA\nNome: *Curral A1*')
    expect(t).not.toContain('Avaliação saída')
    expect(t).toContain('PASTO/CURRAL ENTRADA\nNome: *Pasto 2*')
  })

  it('mostra o curral de entrada quando o lado de entrada é curral', () => {
    const t = formatarRegistroComoTexto({
      ...base,
      pastoSaida: 'Pasto 2',
      pastoSaidaAreaUtil: '12',
      pastoSaidaEspecie: 'Zuri',
      avaliacaoSaida: '2',
      tempoOcupacao: 'Menos de 1 hora',
      curralEntrada: 'Curral A1',
      curralEntradaId: 'c1',
    } as any, 'pastagens')
    expect(t).toContain('PASTO/CURRAL SAÍDA\nNome: *Pasto 2*')
    expect(t).toContain('CURRAL ENTRADA\nNome: *Curral A1*')
    expect(t).not.toContain('Avaliação entrada')
  })
})

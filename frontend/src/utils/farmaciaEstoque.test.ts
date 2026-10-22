import { describe, it, expect } from 'vitest'
import {
  parseQuantidade,
  saldoApos,
  statusEstoque,
  formatarQuantidade,
  unidadeConcordada,
  medicamentosControlados,
  encontrarMedicamentoExistente,
} from './farmaciaEstoque'

describe('parseQuantidade', () => {
  it('aceita vírgula e ponto', () => {
    expect(parseQuantidade('2,5')).toBe(2.5)
    expect(parseQuantidade('2.5')).toBe(2.5)
  })
  it('vazio ou inválido vira 0', () => {
    expect(parseQuantidade('')).toBe(0)
    expect(parseQuantidade('abc')).toBe(0)
  })
})

describe('saldoApos', () => {
  it('entrada soma e saída subtrai', () => {
    expect(saldoApos(10, 2.5, false)).toBe(12.5)
    expect(saldoApos(10, 2.5, true)).toBe(7.5)
  })
  it('saída maior que o saldo fica negativa', () => {
    expect(saldoApos(1, 3, true)).toBe(-2)
  })
  it('evita ruído de ponto flutuante', () => {
    expect(saldoApos(0.1, 0.2, false)).toBe(0.3)
  })
})

describe('statusEstoque', () => {
  const base = { controla_estoque: true, estoque_minimo: 10 }
  it('sem controle ativo é neutro', () => {
    expect(statusEstoque({ controla_estoque: false, estoque_atual: 5 }).tone).toBe('neutral')
  })
  it('abaixo do mínimo é perigo', () => {
    expect(statusEstoque({ ...base, estoque_atual: 9 }).tone).toBe('danger')
  })
  it('até 20% acima do mínimo é atenção', () => {
    expect(statusEstoque({ ...base, estoque_atual: 10 }).tone).toBe('warning')
    expect(statusEstoque({ ...base, estoque_atual: 12 }).tone).toBe('warning')
  })
  it('acima disso está ok', () => {
    expect(statusEstoque({ ...base, estoque_atual: 13 }).tone).toBe('success')
  })
  it('sem mínimo definido só alerta saldo negativo', () => {
    expect(statusEstoque({ controla_estoque: true, estoque_atual: 3 }).tone).toBe('success')
    expect(statusEstoque({ controla_estoque: true, estoque_atual: -1 }).tone).toBe('danger')
  })
})

describe('formatarQuantidade', () => {
  it('usa formato pt-BR com a unidade', () => {
    expect(formatarQuantidade(1234.5, 'mL')).toBe('1.234,5 mL')
  })
})

describe('unidadeConcordada', () => {
  it('põe no plural só quando o valor é maior que 1', () => {
    expect(unidadeConcordada('frasco', 1)).toBe('frasco')
    expect(unidadeConcordada('frasco', 2)).toBe('frascos')
    expect(unidadeConcordada('dose', 0.5)).toBe('dose')
    expect(unidadeConcordada('dose', 18)).toBe('doses')
  })
  it('não altera unidades sem plural', () => {
    expect(unidadeConcordada('mL', 100)).toBe('mL')
    expect(formatarQuantidade(18, 'frasco')).toBe('18 frascos')
  })
})

describe('seleção de medicamento no lançamento', () => {
  const lista = [
    { nome_comercial: 'Draxxin', sku: 'MED-001', controla_estoque: true },
    { nome_comercial: 'Penicilina', sku: null, controla_estoque: false },
    { nome_comercial: 'Exceller', sku: null, controla_estoque: true },
  ]
  it('só mantém os controlados', () => {
    expect(medicamentosControlados(lista).map((m) => m.nome_comercial)).toEqual(['Draxxin', 'Exceller'])
  })
  it('acha o existente ignorando acento e caixa, e pelo SKU', () => {
    expect(encontrarMedicamentoExistente(lista, { nome_comercial: 'DRAXXIN' })?.nome_comercial).toBe('Draxxin')
    expect(encontrarMedicamentoExistente(lista, { nome_comercial: 'Outro nome', sku: 'med-001' })?.nome_comercial).toBe('Draxxin')
  })
  it('item sem controle não conta como existente', () => {
    expect(encontrarMedicamentoExistente(lista, { nome_comercial: 'Penicilina' })).toBeUndefined()
  })
})

describe('texto do registro', () => {
  const entrada = {
    id: 'abc-123',
    data: '21/10/2026 15:17',
    tipoMovimentacao: 'entrada',
    medicamentoId: 'uuid-interno',
    medicamentoNome: 'Draxxin',
    unidade: 'frasco',
    quantidade: '2',
    custoUnitario: '120,50',
    validade: '2027-03-31',
    notaFiscal: 'NF-1',
    usuario: 'Victor Hugo',
    novoMedicamento: { id: 'x' },
  }
  it('quantidade, custo e validade saem formatados', async () => {
    const m = await import('./farmaciaEstoque')
    expect(m.quantidadeRegistro(entrada)).toBe('2 frascos')
    expect(m.custoUnitarioRegistro(entrada)).toBe('R$ 120,50')
    expect(m.custoTotalRegistro(entrada)).toBe('R$ 241,00')
    expect(m.validadeRegistro(entrada)).toBe('31/03/2027')
  })
  it('texto compartilhado não traz ids nem objetos internos', async () => {
    const { formatarRegistroComoTexto } = await import('./shareUtils')
    const texto = formatarRegistroComoTexto(entrada as any, 'entrada-farmacia')
    expect(texto).toContain('ENTRADA DE ESTOQUE - FARMÁCIA')
    expect(texto).toContain('QUANTIDADE: *2 frascos*')
    expect(texto).toContain('CUSTO TOTAL: *R$ 241,00*')
    expect(texto).toContain('VALIDADE: *31/03/2027*')
    expect(texto).not.toMatch(/uuid-interno|medicamentoId|novoMedicamento|\[object|tipoMovimentacao/i)
  })
  it('saída não mostra dados de compra', async () => {
    const { formatarRegistroComoTexto } = await import('./shareUtils')
    const texto = formatarRegistroComoTexto({ ...entrada, tipoMovimentacao: 'baixa', observacao: 'Uso na fazenda' } as any, 'saida-farmacia')
    expect(texto).toContain('SAÍDA DE ESTOQUE - FARMÁCIA')
    expect(texto).toContain('OBSERVAÇÃO: *Uso na fazenda*')
    expect(texto).not.toMatch(/CUSTO|NOTA FISCAL|VALIDADE/)
  })
})

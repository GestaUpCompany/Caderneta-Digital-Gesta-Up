import { describe, expect, it } from 'vitest'
import {
  avisoFrascoNoFim,
  baixaPorMedicamento,
  dosesDesdeUltimaBaixa,
  escolherMedicamentoPorNome,
  frascosValidos,
  medicamentosNovosCitados,
  trocarIdsMedicamentos,
} from './doseMedicamento'

const draxxin = { id: 'd', controla_estoque: true }
const exceller = { id: 'e', controla_estoque: true }
const penicilina = { id: 'p', controla_estoque: false }

describe('frascosValidos', () => {
  it('aceita só inteiros positivos', () => {
    expect(frascosValidos(2)).toBe(2)
    expect(frascosValidos('3')).toBe(3)
  })

  it('fração, zero, vazio e texto valem 0', () => {
    expect(frascosValidos(0.5)).toBe(0)
    expect(frascosValidos('1,5')).toBe(0)
    expect(frascosValidos(0)).toBe(0)
    expect(frascosValidos('')).toBe(0)
    expect(frascosValidos(null)).toBe(0)
    expect(frascosValidos(undefined)).toBe(0)
    expect(frascosValidos('abc')).toBe(0)
    expect(frascosValidos(-1)).toBe(0)
  })
})

describe('baixaPorMedicamento', () => {
  const meds = [draxxin, exceller, penicilina]

  it('soma os frascos do mesmo medicamento, como o trigger', () => {
    const r = baixaPorMedicamento(
      [
        { medicamentoId: 'd', frascosUsados: 1 },
        { medicamentoId: 'd', frascosUsados: 2 },
      ],
      meds,
    )
    expect(r).toEqual([{ medicamentoId: 'd', quantidade: 3 }])
  })

  it('ignora item sem frascos e medicamentos que não controlam estoque', () => {
    const r = baixaPorMedicamento(
      [
        { medicamentoId: 'e', frascosUsados: 0 },
        { medicamentoId: 'e' },
        { medicamentoId: 'p', frascosUsados: 1 },
        { medicamentoId: 'd', frascosUsados: 1 },
        { medicamentoId: 'x', frascosUsados: 1 },
      ],
      meds,
    )
    expect(r).toEqual([{ medicamentoId: 'd', quantidade: 1 }])
  })

  it('não gera baixa para lista vazia', () => {
    expect(baixaPorMedicamento([], meds)).toEqual([])
  })
})

describe('medicamento criado offline', () => {
  const entradas = [
    { fazendaId: 'f1', novoMedicamento: { id: 'local', nome_comercial: 'A' } },
    { fazendaId: 'f2', novoMedicamento: { id: 'outra', nome_comercial: 'B' } },
    { fazendaId: 'f1', isTestRecord: true, novoMedicamento: { id: 'teste', nome_comercial: 'C' } },
    { fazendaId: 'f1' },
  ]

  it('só devolve o novo citado, da fazenda e fora do modo teste', () => {
    const itens = [{ medicamentoId: 'local' }, { medicamentoId: 'outra' }, { medicamentoId: 'teste' }, { medicamentoId: 'x' }]
    expect(medicamentosNovosCitados(itens, entradas, 'f1').map((n) => n.id)).toEqual(['local'])
  })

  it('troca só os ids mapeados e preserva o item', () => {
    const r = trocarIdsMedicamentos([{ medicamentoId: 'local', frascosUsados: 2 }, { medicamentoId: 'x', frascosUsados: 1 }], { local: 'real' })
    expect(r).toEqual([{ medicamentoId: 'real', frascosUsados: 2 }, { medicamentoId: 'x', frascosUsados: 1 }])
  })
})

describe('aviso de frasco no fim', () => {
  const med = { id: 'm', conteudo_por_unidade: 500, conteudo_unidade: 'mL' }
  const reg = (id: string, em: string, doseAplicada: string, frascosUsados = 0, medicamentoId = 'm') => ({
    id, em, medicamentos: [{ medicamentoId, doseAplicada, frascosUsados }],
  })

  it('soma só o que veio depois da última baixa no registro', () => {
    const registros = [reg('a', '2026-11-05T10:00:00Z', '100 ml'), reg('b', '2026-11-06T10:00:00Z', '20 ml', 1), reg('c', '2026-11-07T10:00:00Z', '30 ml')]
    expect(dosesDesdeUltimaBaixa({ registros, baixas: [] }, med)).toBe(30)
  })

  it('baixa manual também zera a conta', () => {
    const registros = [reg('a', '2026-11-05T10:00:00Z', '100 ml'), reg('c', '2026-11-08T10:00:00Z', '30 ml')]
    expect(dosesDesdeUltimaBaixa({ registros, baixas: [{ medicamentoId: 'm', em: '2026-11-07' }] }, med)).toBe(30)
  })

  it('ignora doses antes dos frascos inteiros, outra unidade, outro medicamento, texto livre e registro repetido', () => {
    const registros = [
      reg('velho', '2026-10-01T10:00:00Z', '100 ml'),
      reg('mg', '2026-11-05T10:00:00Z', '100 mg'),
      reg('outro', '2026-11-05T10:00:00Z', '100 ml', 0, 'z'),
      reg('livre', '2026-11-05T10:00:00Z', '15ml IV'),
      reg('r', '2026-11-05T10:00:00Z', '1,5'),
      reg('r', '2026-11-05T10:00:00Z', '1,5'),
    ]
    expect(dosesDesdeUltimaBaixa({ registros, baixas: [] }, med)).toBe(1.5)
  })

  it('avisa a partir de 80% e só com conteúdo cadastrado', () => {
    expect(avisoFrascoNoFim(399, med)).toBeNull()
    expect(avisoFrascoNoFim(400, med)).toContain('400 mL')
    expect(avisoFrascoNoFim(1000, { id: 'm' })).toBeNull()
  })
})

describe('escolherMedicamentoPorNome', () => {
  const lista = [
    { id: 'velho', nome_comercial: 'P', tipo: 'A', controla_estoque: false },
    { id: 'novo', nome_comercial: 'P', tipo: 'A', controla_estoque: true },
    { id: 'outro', nome_comercial: 'Q', tipo: 'A', controla_estoque: false },
  ]

  it('prefere o controlado entre nomes iguais', () => {
    expect(escolherMedicamentoPorNome(lista, 'P', 'A')?.id).toBe('novo')
  })

  it('sem controlado devolve o existente; nome ou tipo diferente não acha', () => {
    expect(escolherMedicamentoPorNome(lista, 'Q', 'A')?.id).toBe('outro')
    expect(escolherMedicamentoPorNome(lista, 'P', 'B')).toBeUndefined()
    expect(escolherMedicamentoPorNome(lista, 'X')).toBeUndefined()
  })
})

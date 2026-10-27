import { describe, it, expect, vi } from 'vitest'
import {
  limparNomeProduto,
  chaveNomeProduto,
  encontrarProdutoPorNome,
  nomesParaSeletor,
  itemTemProduto,
  validarItensEntrada,
  montarNovoProduto,
  garantirProdutoNoServidor,
  agruparItensPorEntrada,
  MSG_SEM_ITEM,
  MSG_LOTE_OBRIGATORIO,
  MSG_ITEM_INCOMPLETO,
  type ItemValidavel,
  type ProdutoComId,
  type DependenciasProduto,
} from './entradaInsumos'

const item = (parcial: Partial<ItemValidavel> = {}): ItemValidavel => ({
  tipoItem: 'insumo',
  insumoId: '',
  formulacaoId: '',
  produtoNovo: false,
  produto: '',
  quantidade: '',
  valorUnitario: '',
  lote: '',
  ...parcial,
})

describe('nomes de produto', () => {
  it('limpa espaços das pontas e repetidos', () => {
    expect(limparNomeProduto('  Milho   moído ')).toBe('Milho moído')
    expect(limparNomeProduto('')).toBe('')
  })

  it('chave ignora maiúsculas, acentos e espaços extras', () => {
    expect(chaveNomeProduto('  Milho  GRÃO Moído')).toBe('milho grao moido')
    expect(chaveNomeProduto('Ureia Pecuária')).toBe(chaveNomeProduto('ureia pecuaria'))
  })

  it('encontra produto sem diferenciar caixa e acento', () => {
    const lista = [{ id: '1', nome: 'Milho Grão Moído' }, { id: '2', nome: 'Sal Mineral' }]
    expect(encontrarProdutoPorNome(lista, 'milho grao moido')?.id).toBe('1')
    expect(encontrarProdutoPorNome(lista, '  SAL   mineral ')?.id).toBe('2')
    expect(encontrarProdutoPorNome(lista, 'Farelo')).toBeUndefined()
  })

  it('nome vazio não encontra nada', () => {
    expect(encontrarProdutoPorNome([{ id: '1', nome: 'X' }], '   ')).toBeUndefined()
  })
})

describe('nomesParaSeletor', () => {
  const lista = [{ nome: 'Milho' }, { nome: 'Sal Mineral' }]

  it('acrescenta os produtos novos do tipo certo no fim', () => {
    const novos = [
      { tipo: 'insumo' as const, nome: 'Farelo de Trigo' },
      { tipo: 'formulacao' as const, nome: 'Creep Novo' },
    ]
    expect(nomesParaSeletor(lista, novos, 'insumo')).toEqual(['Milho', 'Sal Mineral', 'Farelo de Trigo'])
    expect(nomesParaSeletor(lista, novos, 'formulacao')).toEqual(['Milho', 'Sal Mineral', 'Creep Novo'])
  })

  it('não repete produto novo que já está na lista (mesmo com outra grafia)', () => {
    const novos = [{ tipo: 'insumo' as const, nome: 'milho' }]
    expect(nomesParaSeletor(lista, novos, 'insumo')).toEqual(['Milho', 'Sal Mineral'])
  })

  it('não repete o mesmo produto novo duas vezes', () => {
    const novos = [
      { tipo: 'insumo' as const, nome: 'Farelo' },
      { tipo: 'insumo' as const, nome: 'FARELO ' },
    ]
    expect(nomesParaSeletor(lista, novos, 'insumo')).toEqual(['Milho', 'Sal Mineral', 'Farelo'])
  })

  it('sem produtos novos devolve só a lista', () => {
    expect(nomesParaSeletor(lista, [], 'insumo')).toEqual(['Milho', 'Sal Mineral'])
  })
})

describe('itemTemProduto', () => {
  it('aceita insumo, formulação ou produto novo', () => {
    expect(itemTemProduto({ insumoId: 'a', formulacaoId: '', produtoNovo: false })).toBe(true)
    expect(itemTemProduto({ insumoId: '', formulacaoId: 'b', produtoNovo: false })).toBe(true)
    expect(itemTemProduto({ insumoId: '', formulacaoId: '', produtoNovo: true })).toBe(true)
  })
  it('recusa item sem produto', () => {
    expect(itemTemProduto({ insumoId: '', formulacaoId: '', produtoNovo: false })).toBe(false)
  })
})

describe('validarItensEntrada', () => {
  it('um item completo é válido e não gera mensagem', () => {
    const r = validarItensEntrada([item({ insumoId: 'a', produto: 'Milho', quantidade: '10' })])
    expect(r.validos).toEqual([0])
    expect(r.geral).toEqual([])
    expect(r.campos).toEqual({})
  })

  it('formulário vazio pede ao menos um item', () => {
    const r = validarItensEntrada([item()])
    expect(r.validos).toEqual([])
    expect(r.geral).toEqual([MSG_SEM_ITEM])
    expect(r.campos).toEqual({})
  })

  it('lista sem itens pede ao menos um item', () => {
    expect(validarItensEntrada([]).geral).toEqual([MSG_SEM_ITEM])
  })

  it('item em branco extra é ignorado e não impede salvar', () => {
    const r = validarItensEntrada([item({ insumoId: 'a', produto: 'Milho', quantidade: '10' }), item()])
    expect(r.validos).toEqual([0])
    expect(r.geral).toEqual([])
  })

  it('item com produto e sem quantidade bloqueia e marca o campo', () => {
    const r = validarItensEntrada([item({ insumoId: 'a', produto: 'Milho' })])
    expect(r.validos).toEqual([])
    expect(r.campos['item_0_quantidade']).toBeDefined()
    expect(r.geral).toEqual([MSG_ITEM_INCOMPLETO])
    expect(r.primeiroCampoComErro).toBe('item_0_quantidade')
  })

  it('item com quantidade e sem produto bloqueia e marca o campo', () => {
    const r = validarItensEntrada([item({ quantidade: '5' })])
    expect(r.campos['item_0_produto']).toBeDefined()
    expect(r.geral).toEqual([MSG_ITEM_INCOMPLETO])
  })

  it('item incompleto não é descartado em silêncio quando há outro completo', () => {
    const r = validarItensEntrada([
      item({ insumoId: 'a', produto: 'Milho', quantidade: '10' }),
      item({ insumoId: 'b', produto: 'Sal' }),
    ])
    expect(r.validos).toEqual([0])
    expect(r.geral).toEqual([MSG_ITEM_INCOMPLETO])
    expect(r.campos['item_1_quantidade']).toBeDefined()
  })

  it('produto final sem lote bloqueia com a mensagem e o campo do item certo', () => {
    const r = validarItensEntrada([
      item({ insumoId: 'a', produto: 'Milho', quantidade: '10' }),
      item({ tipoItem: 'formulacao', formulacaoId: 'f', produto: 'Creep', quantidade: '5' }),
    ])
    expect(r.geral).toEqual([MSG_LOTE_OBRIGATORIO])
    expect(r.campos['item_1_lote']).toBeDefined()
    expect(r.primeiroCampoComErro).toBe('item_1_lote')
  })

  it('lote só com espaços não vale', () => {
    const r = validarItensEntrada([
      item({ tipoItem: 'formulacao', formulacaoId: 'f', produto: 'Creep', quantidade: '5', lote: '   ' }),
    ])
    expect(r.geral).toContain(MSG_LOTE_OBRIGATORIO)
  })

  it('produto final com lote é válido', () => {
    const r = validarItensEntrada([
      item({ tipoItem: 'formulacao', formulacaoId: 'f', produto: 'Creep', quantidade: '5', lote: 'L1' }),
    ])
    expect(r.validos).toEqual([0])
    expect(r.geral).toEqual([])
  })

  it('insumo não exige lote', () => {
    const r = validarItensEntrada([item({ insumoId: 'a', produto: 'Milho', quantidade: '1' })])
    expect(r.validos).toEqual([0])
  })

  it('produto novo (sem id) com quantidade é válido', () => {
    const r = validarItensEntrada([item({ produtoNovo: true, produto: 'Farelo Novo', quantidade: '3' })])
    expect(r.validos).toEqual([0])
    expect(r.geral).toEqual([])
  })

  it('produto novo do tipo produto final também exige lote', () => {
    const r = validarItensEntrada([
      item({ tipoItem: 'formulacao', produtoNovo: true, produto: 'Creep Novo', quantidade: '3' }),
    ])
    expect(r.geral).toEqual([MSG_LOTE_OBRIGATORIO])
  })

  it('o primeiro campo com erro é o do item de menor índice', () => {
    const r = validarItensEntrada([
      item({ insumoId: 'a', produto: 'M', quantidade: '1' }),
      item({ insumoId: 'b', produto: 'S' }),
      item({ quantidade: '2' }),
    ])
    expect(r.primeiroCampoComErro).toBe('item_1_quantidade')
  })

  it('quantidade zero conta como preenchida (comportamento anterior)', () => {
    const r = validarItensEntrada([item({ insumoId: 'a', produto: 'Milho', quantidade: '0' })])
    expect(r.validos).toEqual([0])
  })
})

describe('montarNovoProduto', () => {
  it('monta o produto novo com nome limpo', () => {
    expect(
      montarNovoProduto({ tipoItem: 'insumo', insumoId: '', formulacaoId: '', produtoNovo: true, produto: '  Farelo   Novo ' })
    ).toEqual({ tipo: 'insumo', nome: 'Farelo Novo' })
    expect(
      montarNovoProduto({ tipoItem: 'formulacao', insumoId: '', formulacaoId: '', produtoNovo: true, produto: 'Creep X' })
    ).toEqual({ tipo: 'formulacao', nome: 'Creep X' })
  })

  it('item do servidor não vira produto novo', () => {
    expect(
      montarNovoProduto({ tipoItem: 'insumo', insumoId: 'abc', formulacaoId: '', produtoNovo: false, produto: 'Milho' })
    ).toBeUndefined()
  })

  it('se já tem id, ignora a marca de produto novo', () => {
    expect(
      montarNovoProduto({ tipoItem: 'insumo', insumoId: 'abc', formulacaoId: '', produtoNovo: true, produto: 'Milho' })
    ).toBeUndefined()
  })

  it('nome vazio não gera produto novo', () => {
    expect(
      montarNovoProduto({ tipoItem: 'insumo', insumoId: '', formulacaoId: '', produtoNovo: true, produto: '   ' })
    ).toBeUndefined()
  })
})

describe('garantirProdutoNoServidor', () => {
  const montarDeps = (existentes: ProdutoComId[] = []) => {
    const base = [...existentes]
    const deps = {
      listar: vi.fn(async () => [...base]),
      criar: vi.fn(async (_tipo: string, nome: string) => {
        const criado = { id: `novo-${base.length + 1}`, nome }
        base.push(criado)
        return criado
      }),
    }
    return { deps: deps as unknown as DependenciasProduto & typeof deps, base }
  }

  it('usa o produto que já existe, sem criar', async () => {
    const { deps } = montarDeps([{ id: 'x1', nome: 'Milho Grão Moído' }])
    const id = await garantirProdutoNoServidor(deps, { tipo: 'insumo', nome: 'milho grao moido' })
    expect(id).toBe('x1')
    expect(deps.criar).not.toHaveBeenCalled()
  })

  it('cria quando não existe e devolve o id novo', async () => {
    const { deps } = montarDeps([{ id: 'x1', nome: 'Sal' }])
    const id = await garantirProdutoNoServidor(deps, { tipo: 'insumo', nome: '  Farelo   Novo ' })
    expect(id).toBe('novo-2')
    expect(deps.criar).toHaveBeenCalledWith('insumo', 'Farelo Novo')
  })

  it('dois itens com o mesmo produto novo criam um cadastro só', async () => {
    const { deps, base } = montarDeps()
    const a = await garantirProdutoNoServidor(deps, { tipo: 'insumo', nome: 'Farelo Novo' })
    const b = await garantirProdutoNoServidor(deps, { tipo: 'insumo', nome: 'FARELO novo' })
    expect(a).toBe(b)
    expect(deps.criar).toHaveBeenCalledTimes(1)
    expect(base).toHaveLength(1)
  })

  it('reenviar o mesmo item não duplica o cadastro', async () => {
    const { deps } = montarDeps()
    await garantirProdutoNoServidor(deps, { tipo: 'formulacao', nome: 'Creep Novo' })
    await garantirProdutoNoServidor(deps, { tipo: 'formulacao', nome: 'Creep Novo' })
    expect(deps.criar).toHaveBeenCalledTimes(1)
  })

  it('se a criação falha mas outro aparelho criou no meio, usa o que apareceu', async () => {
    const lista: ProdutoComId[] = []
    const deps = {
      listar: vi.fn(async () => [...lista]),
      criar: vi.fn(async () => {
        lista.push({ id: 'de-outro', nome: 'Farelo Novo' })
        throw new Error('duplicado')
      }),
    }
    const id = await garantirProdutoNoServidor(deps as unknown as DependenciasProduto, { tipo: 'insumo', nome: 'Farelo Novo' })
    expect(id).toBe('de-outro')
  })

  it('se a criação falha e o produto continua inexistente, propaga o erro', async () => {
    const deps = {
      listar: vi.fn(async () => [] as ProdutoComId[]),
      criar: vi.fn(async () => {
        throw new Error('sem permissão')
      }),
    }
    await expect(
      garantirProdutoNoServidor(deps as unknown as DependenciasProduto, { tipo: 'insumo', nome: 'X' })
    ).rejects.toThrow('sem permissão')
  })

  it('falha ao listar (sem rede) propaga o erro e não cria nada', async () => {
    const deps = {
      listar: vi.fn(async () => {
        throw new Error('Failed to fetch')
      }),
      criar: vi.fn(),
    }
    await expect(
      garantirProdutoNoServidor(deps as unknown as DependenciasProduto, { tipo: 'insumo', nome: 'X' })
    ).rejects.toThrow('Failed to fetch')
    expect(deps.criar).not.toHaveBeenCalled()
  })

  it('servidor que não devolve id é tratado como falha', async () => {
    const deps = {
      listar: vi.fn(async () => [] as ProdutoComId[]),
      criar: vi.fn(async () => ({ id: '', nome: 'X' })),
    }
    await expect(
      garantirProdutoNoServidor(deps as unknown as DependenciasProduto, { tipo: 'insumo', nome: 'X' })
    ).rejects.toThrow()
  })
})

describe('agruparItensPorEntrada', () => {
  it('agrupa pelo id local da entrada', () => {
    const r = agruparItensPorEntrada(
      [{ id: 'L1' }, { id: 'L2' }],
      [
        { entradaId: 'L1', produto: 'a' },
        { entradaId: 'L2', produto: 'b' },
        { entradaId: 'L1', produto: 'c' },
      ]
    )
    expect(r['L1'].map((i) => i.produto)).toEqual(['a', 'c'])
    expect(r['L2'].map((i) => i.produto)).toEqual(['b'])
  })

  it('casa também pelo id do servidor (registros antigos tiveram o entradaId trocado)', () => {
    const r = agruparItensPorEntrada(
      [{ id: 'L1', supabaseId: 'S1' }],
      [
        { entradaId: 'S1', produto: 'antigo' },
        { entradaId: 'L1', produto: 'novo' },
      ]
    )
    expect(r['L1'].map((i) => i.produto)).toEqual(['antigo', 'novo'])
  })

  it('o resultado é indexado sempre pelo id local', () => {
    const r = agruparItensPorEntrada([{ id: 'L1', supabaseId: 'S1' }], [{ entradaId: 'S1' }])
    expect(Object.keys(r)).toEqual(['L1'])
  })

  it('item de entrada que não existe neste aparelho não aparece', () => {
    const r = agruparItensPorEntrada([{ id: 'L1' }], [{ entradaId: 'OUTRA' }, { entradaId: undefined }, { entradaId: 5 }])
    expect(r).toEqual({})
  })

  it('entrada sem itens fica fora do resultado', () => {
    expect(agruparItensPorEntrada([{ id: 'L1' }], [])).toEqual({})
  })

  it('supabaseId vazio ou não textual é ignorado', () => {
    const r = agruparItensPorEntrada(
      [{ id: 'L1', supabaseId: '' }, { id: 'L2', supabaseId: null }],
      [{ entradaId: '' }, { entradaId: 'L2' }]
    )
    expect(r).toEqual({ L2: [{ entradaId: 'L2' }] })
  })
})

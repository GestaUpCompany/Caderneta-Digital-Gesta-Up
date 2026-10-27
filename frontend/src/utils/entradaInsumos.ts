// Regras puras da Entrada de Insumos: validação dos itens, produtos criados no campo (sem rede),
// resolução do produto novo no servidor e vínculo cabeçalho x itens. Sem acesso a rede nem IndexedDB,
// para poder ser testado isoladamente.

export type TipoProduto = 'insumo' | 'formulacao'

/** Produto digitado no campo que ainda não existe no servidor; é criado ao sincronizar o item. */
export interface ProdutoNovo {
  tipo: TipoProduto
  nome: string
}

export interface ProdutoComId {
  id: string
  nome: string
}

/** Tira espaços das pontas e junta espaços repetidos ("  Milho   moído " -> "Milho moído"). */
export function limparNomeProduto(nome: string): string {
  return String(nome ?? '').trim().replace(/\s+/g, ' ')
}

/** Chave para comparar nomes sem diferenciar maiúsculas, acentos e espaços extras. */
export function chaveNomeProduto(nome: string): string {
  return limparNomeProduto(nome)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function encontrarProdutoPorNome<T extends { nome: string }>(lista: T[], nome: string): T | undefined {
  const chave = chaveNomeProduto(nome)
  if (!chave) return undefined
  return lista.find((p) => chaveNomeProduto(p.nome) === chave)
}

/** Nomes para o seletor: os produtos do servidor mais os criados no campo que ainda não subiram. */
export function nomesParaSeletor(lista: { nome: string }[], novos: ProdutoNovo[], tipo: TipoProduto): string[] {
  const nomes = lista.map((p) => p.nome)
  for (const novo of novos) {
    if (novo.tipo !== tipo) continue
    if (encontrarProdutoPorNome(lista, novo.nome)) continue
    if (nomes.some((n) => chaveNomeProduto(n) === chaveNomeProduto(novo.nome))) continue
    nomes.push(novo.nome)
  }
  return nomes
}

export interface ItemValidavel {
  tipoItem: TipoProduto
  insumoId: string
  formulacaoId: string
  produtoNovo: boolean
  produto: string
  quantidade: string
  valorUnitario: string
  lote: string
}

export const MSG_SEM_ITEM = 'Adicione pelo menos um item com produto e quantidade'
export const MSG_LOTE_OBRIGATORIO = 'Lote é obrigatório para produtos finais (formulações)'
export const MSG_ITEM_INCOMPLETO = 'Há itens incompletos. Preencha produto e quantidade ou remova o item.'

/** O item aponta para um produto: do servidor (id) ou criado no campo (aguardando sync). */
export function itemTemProduto(item: Pick<ItemValidavel, 'insumoId' | 'formulacaoId' | 'produtoNovo'>): boolean {
  return Boolean(item.insumoId || item.formulacaoId || item.produtoNovo)
}

export interface ResultadoValidacaoItens {
  /** Mensagens gerais, mostradas no topo. */
  geral: string[]
  /** Erro por campo, na chave `item_<índice>_<campo>`. */
  campos: Record<string, string>
  /** Índices dos itens completos, que serão salvos. */
  validos: number[]
  /** Chave do primeiro campo com erro (para rolar até ele), se houver. */
  primeiroCampoComErro?: string
}

/**
 * Item totalmente em branco é ignorado (o botão "adicionar outro item" deixa um item vazio). Item preenchido pela
 * metade bloqueia o salvamento: antes ele era descartado em silêncio e a entrada era gravada sem ele.
 */
export function validarItensEntrada(itens: ItemValidavel[]): ResultadoValidacaoItens {
  const campos: Record<string, string> = {}
  const validos: number[] = []
  let temIncompleto = false
  let semLote = false

  itens.forEach((item, i) => {
    const temProduto = itemTemProduto(item)
    const temQuantidade = String(item.quantidade ?? '').trim() !== ''
    const emBranco = !temProduto && !temQuantidade && !String(item.valorUnitario ?? '').trim() && !String(item.lote ?? '').trim()
    if (emBranco) return

    if (!temProduto) {
      campos[`item_${i}_produto`] = 'Selecione o produto'
      temIncompleto = true
    }
    if (!temQuantidade) {
      campos[`item_${i}_quantidade`] = 'Informe a quantidade'
      temIncompleto = true
    }
    if (!temProduto || !temQuantidade) return

    if (item.tipoItem === 'formulacao' && !String(item.lote ?? '').trim()) {
      campos[`item_${i}_lote`] = 'Informe o lote'
      semLote = true
      return
    }
    validos.push(i)
  })

  const geral: string[] = []
  if (temIncompleto) geral.push(MSG_ITEM_INCOMPLETO)
  if (semLote) geral.push(MSG_LOTE_OBRIGATORIO)
  if (validos.length === 0 && geral.length === 0) geral.push(MSG_SEM_ITEM)

  const primeiroCampoComErro = Object.keys(campos).sort((a, b) => {
    const ia = Number(a.split('_')[1])
    const ib = Number(b.split('_')[1])
    return ia - ib
  })[0]

  return { geral, campos, validos, primeiroCampoComErro }
}

/** Produto novo a gravar no item, ou undefined quando o item já aponta para um produto do servidor. */
export function montarNovoProduto(
  item: Pick<ItemValidavel, 'tipoItem' | 'insumoId' | 'formulacaoId' | 'produtoNovo' | 'produto'>
): ProdutoNovo | undefined {
  if (!item.produtoNovo || item.insumoId || item.formulacaoId) return undefined
  const nome = limparNomeProduto(item.produto)
  if (!nome) return undefined
  return { tipo: item.tipoItem, nome }
}

export interface DependenciasProduto {
  listar: (tipo: TipoProduto) => Promise<ProdutoComId[]>
  criar: (tipo: TipoProduto, nome: string) => Promise<ProdutoComId>
}

/**
 * Devolve o id do produto no servidor, criando-o só se não existir (comparando o nome sem diferenciar maiúsculas
 * e acentos). Reenviar o mesmo item, ou dois itens com o mesmo produto novo, não duplica o cadastro. Se a criação
 * falhar (ex.: outro aparelho criou no mesmo instante), consulta de novo antes de desistir.
 */
export async function garantirProdutoNoServidor(deps: DependenciasProduto, novo: ProdutoNovo): Promise<string> {
  const nome = limparNomeProduto(novo.nome)
  const existente = encontrarProdutoPorNome(await deps.listar(novo.tipo), nome)
  if (existente?.id) return existente.id
  try {
    const criado = await deps.criar(novo.tipo, nome)
    if (criado?.id) return criado.id
    throw new Error('O servidor não devolveu o id do produto criado.')
  } catch (error) {
    const aposFalha = encontrarProdutoPorNome(await deps.listar(novo.tipo), nome)
    if (aposFalha?.id) return aposFalha.id
    throw error
  }
}

/**
 * Agrupa os itens pela entrada a que pertencem, indexando pelo id LOCAL da entrada. O item guarda o id local do
 * cabeçalho; registros sincronizados por versões antigas tiveram o `entradaId` trocado pelo id do servidor,
 * então casa também pelo `supabaseId` para não esconder os itens deles.
 */
export function agruparItensPorEntrada<I extends object>(
  entradas: { id: string; supabaseId?: unknown }[],
  itens: I[]
): Record<string, I[]> {
  const idLocalPorChave = new Map<string, string>()
  for (const entrada of entradas) {
    idLocalPorChave.set(entrada.id, entrada.id)
    if (typeof entrada.supabaseId === 'string' && entrada.supabaseId) {
      idLocalPorChave.set(entrada.supabaseId, entrada.id)
    }
  }
  const grupos: Record<string, I[]> = {}
  for (const item of itens) {
    const entradaId = (item as { entradaId?: unknown }).entradaId
    const idLocal = typeof entradaId === 'string' ? idLocalPorChave.get(entradaId) : undefined
    if (!idLocal) continue
    if (!grupos[idLocal]) grupos[idLocal] = []
    grupos[idLocal].push(item)
  }
  return grupos
}

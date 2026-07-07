import { supabase, getSupabaseClient, getSupabaseClientWithRefresh } from './supabaseClient'
import type { TablesInsert, TablesUpdate } from '../types/supabase'

// Função para fazer upload de logo de fazenda
export async function uploadFazendaLogo(file: File, fazendaId: string): Promise<string | null> {
  try {
    const fileExt = file.name.split('.').pop()
    const fileName = `${fazendaId}/logo.${fileExt}`
    const filePath = `${fileName}`

    const { error } = await supabase.storage
      .from('logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
      console.error('Erro ao fazer upload do logo:', error)
      return null
    }

    // Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from('logos')
      .getPublicUrl(filePath)

    // Atualizar fazenda com a URL do logo
    const client = await getSupabaseClientWithRefresh() as any
    const { error: updateError } = await client
      .from('fazendas')
      .update({ logo_url: publicUrl })
      .eq('id', fazendaId)

    if (updateError) {
      console.error('Erro ao atualizar URL do logo na fazenda:', updateError)
    }

    return publicUrl
  } catch (error) {
    console.error('Erro ao fazer upload do logo:', error)
    return null
  }
}

// Função para deletar logo de fazenda
export async function deleteFazendaLogo(fazendaId: string): Promise<boolean> {
  try {
    // Listar arquivos no bucket para encontrar o logo
    const { data: files } = await supabase.storage
      .from('logos')
      .list(fazendaId, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      })

    if (!files || files.length === 0) {
      return true
    }

    // Deletar todos os arquivos (deveria ter apenas o logo)
    const filesToDelete = files.map(file => `${fazendaId}/${file.name}`)
    const { error } = await supabase.storage
      .from('logos')
      .remove(filesToDelete)

    if (error) {
      console.error('Erro ao deletar logo:', error)
      return false
    }

    // Atualizar fazenda removendo a URL do logo
    const client = await getSupabaseClientWithRefresh() as any
    const { error: updateError } = await client
      .from('fazendas')
      .update({ logo_url: null })
      .eq('id', fazendaId)

    if (updateError) {
      console.error('Erro ao atualizar fazenda:', updateError)
    }

    return true
  } catch (error) {
    console.error('Erro ao deletar logo:', error)
    return false
  }
}

// ==================== FAZENDAS ====================

export async function getFazendaByAcessoId(acessoId: string) {
  // Converter para minúsculas para validação case-insensitive
  const acessoIdNormalizado = acessoId.toLowerCase()
  
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('fazendas')
    .select('*')
    .ilike('acesso_id', acessoIdNormalizado)
    .eq('ativo', true)
    .single()

  if (error) throw error
  return data
}

export async function createFazenda(fazenda: TablesInsert<'fazendas'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('fazendas')
    .insert(fazenda)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateFazenda(id: string, fazenda: TablesUpdate<'fazendas'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('fazendas')
    .update(fazenda)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== PASTOS ====================

export async function getPastos(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('pastos')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function createPasto(pasto: TablesInsert<'pastos'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('pastos')
    .insert(pasto)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePasto(id: string, pasto: TablesUpdate<'pastos'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('pastos')
    .update(pasto)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePasto(id: string) {
  const client = await getSupabaseClientWithRefresh() as any
  const { error } = await client
    .from('pastos')
    .update({ ativo: false })
    .eq('id', id)

  if (error) throw error
}

// ==================== LOTES ====================

export async function getLotes(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('lotes')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function getLotesByPastoId(fazendaId: string, pastoId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('lotes')
    .select('*, pastos(nome), meta_intervalo_rodeio_dias, data_proximo_rodeio')
    .eq('fazenda_id', fazendaId)
    .eq('pasto_id', pastoId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

// ==================== SETORES ====================

export async function getSetores(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('setores')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function getImplementos(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('implementos')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .order('nome')

  if (error) throw error
  return data
}

export async function getTratamentos(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('tratamentos')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

// ==================== RAÇAS ====================

export async function getRacas(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('racas')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

// ==================== LOCAIS ====================

export async function getLocais(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('locais')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function getLoteByNome(fazendaId: string, nome: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('lotes')
    .select('*, pastos(nome), meta_intervalo_rodeio_dias, data_proximo_rodeio')
    .eq('fazenda_id', fazendaId)
    .eq('nome', nome)
    .eq('ativo', true)
    .single()

  if (error) throw error
  return data
}

export async function getLoteById(loteId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('lotes')
    .select('*, pastos(nome), meta_intervalo_rodeio_dias, data_proximo_rodeio')
    .eq('id', loteId)
    .eq('ativo', true)
    .single()

  if (error) throw error
  return data
}

export async function getLastRodeioDate(loteId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('registros_rodeio')
    .select('data')
    .eq('lote_id', loteId)
    .is('deleted_at', null)
    .order('data', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data?.data || null
}

export async function getMaquinasVeiculos(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('maquinas_veiculos')
    .select('id, nome, tipo, categoria, modelo, placa, ano, tipo_combustivel, capacidade, horimetro, quilometragem, custo_hora, custo_km, operador_padrao, status')
    .eq('fazenda_id', fazendaId)
    .order('nome')

  if (error) throw error
  return data
}

export async function getMaquinaVeiculoByNome(fazendaId: string, nome: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('maquinas_veiculos')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('nome', nome)
    .single()

  if (error) throw error
  return data
}

export async function createLote(lote: TablesInsert<'lotes'>) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('lotes')
    .insert(lote)
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== LOTE CATEGORIAS ====================

export async function getLoteCategorias(loteId: string) {
  const client = getSupabaseClient()
  const { data, error } = await (client as any)
    .from('lote_categorias')
    .select('*')
    .eq('lote_id', loteId)
    .eq('ativo', true)
    .order('categoria')

  if (error) throw error
  return data as any[]
}

export async function getLoteDetalhesComCategorias(loteId: string) {
  const categorias = await getLoteCategorias(loteId)
  
  if (!categorias || categorias.length === 0) {
    return {
      categorias: '-',
      quant_atual: 0,
      peso_vivo_kg: 0,
      qtd_bezerros: 0,
      total_cabeças: 0,
      categorias_raw: []
    }
  }
  
  // Calcular agregações
  const totalCabeças = categorias.reduce((sum, cat) => sum + (cat.quant_atual || 0), 0)
  const totalBezerros = categorias.reduce((sum, cat) => sum + (cat.qtd_bezerros || 0), 0)
  
  // Calcular peso vivo médio ponderado
  let pesoVivoTotal = 0
  let pesoVivoPonderado = 0
  categorias.forEach(cat => {
    const quant = cat.quant_atual || 0
    const peso = cat.peso_vivo_atual_kg_cab || 0
    pesoVivoTotal += peso * quant
  })
  pesoVivoPonderado = totalCabeças > 0 ? pesoVivoTotal / totalCabeças : 0
  
  const categoriasNomes = categorias.map(cat => cat.categoria).join(', ')
  
  return {
    categorias: categoriasNomes,
    quant_atual: totalCabeças,
    peso_vivo_kg: pesoVivoPonderado,
    qtd_bezerros: totalBezerros,
    total_cabeças: totalCabeças,
    categorias_raw: categorias
  }
}

export async function updateLote(id: string, lote: TablesUpdate<'lotes'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('lotes')
    .update(lote)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteLote(id: string) {
  const client = await getSupabaseClientWithRefresh() as any
  const { error } = await client
    .from('lotes')
    .update({ ativo: false })
    .eq('id', id)

  if (error) throw error
}

// ==================== CATEGORIAS ====================

export async function getCategorias(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('categorias')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function createCategoria(categoria: TablesInsert<'categorias'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('categorias')
    .insert(categoria)
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== INDIVIDUOS ====================

export async function getIndividuos(fazendaId: string, limit = 100) {
  const client = await getSupabaseClientWithRefresh() as any
  console.log('[getIndividuos] fazendaId:', fazendaId, 'client:', client === supabase ? 'anon' : 'token')
  const { data, error } = await client
    .from('individuos')
    .select('id, id_manejo, id_brinco, id_chip, id_provisorio_cria, sexo, raca, categoria, classificacao_matriz, numero_partos, status, data_nascimento, lote_atual')
    .eq('fazenda_id', fazendaId)
    .eq('status', 'Vivo')
    .order('id_manejo')
    .limit(limit)

  console.log('[getIndividuos] data:', data, 'error:', error)
  if (error) throw error
  return data
}

export async function getIndividuoPorCampo(
  fazendaId: string,
  campo: 'id_manejo' | 'id_brinco' | 'id_chip',
  valor: string
) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('individuos')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq(campo, valor)
    .limit(1)

  if (error) throw error
  return data?.[0] || null
}

export async function buscarIndividuoPorIdGenerico(fazendaId: string, idDigitado: string) {
  const client = await getSupabaseClientWithRefresh() as any
  console.log('[buscarIndividuoPorIdGenerico] fazendaId:', fazendaId, 'idDigitado:', idDigitado)
  const { data, error } = await client
    .from('individuos')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .or(`id_manejo.eq.${idDigitado},id_brinco.eq.${idDigitado},id_chip.eq.${idDigitado}`)
    .limit(1)

  console.log('[buscarIndividuoPorIdGenerico] data:', data, 'error:', error)
  if (error) throw error
  return data?.[0] || null
}

export async function createIndividuo(individuo: any) {
  const client = getSupabaseClient() as any
  const { data, error } = await client
    .from('individuos')
    .insert(individuo)
    .select()
    .single()

  if (error) throw error
  return data as any
}

// ==================== CAUSAS DE MORTE ====================

export async function getCausasMorte(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('causas_morte')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

// ==================== MEDICAMENTOS ====================

export async function getMedicamentos(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('medicamentos')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('tipo')
    .order('nome_comercial')

  if (error) throw error
  return data
}

// ==================== INSUMOS ====================

export async function getInsumos(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('insumos')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function getInsumosNomes(fazendaId: string): Promise<string[]> {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('insumos')
    .select('nome')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data?.map(item => item.nome) || []
}

export async function createInsumo(insumo: TablesInsert<'insumos'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('insumos')
    .insert(insumo)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateInsumo(id: string, insumo: TablesUpdate<'insumos'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('insumos')
    .update(insumo)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getInsumoByNome(fazendaId: string, nome: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('insumos')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('nome', nome)
    .eq('ativo', true)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getEspacamentoIdealCocho(fazendaId: string, produtoTipo: string, produtoNome: string): Promise<number | null> {
  let produto: any
  switch (produtoTipo) {
    case 'Mineral':
      produto = await getMineralByNome(fazendaId, produtoNome)
      break
    case 'Proteinado':
      produto = await getProteinadoByNome(fazendaId, produtoNome)
      break
    case 'Ração':
      produto = await getRacaoByNome(fazendaId, produtoNome)
      break
    case 'Insumos':
      produto = await getInsumoByNome(fazendaId, produtoNome)
      break
    default:
      return null
  }
  return produto?.espacamento_ideal_cocho || null
}


// ==================== FORMULAÇÕES ====================

export async function getFormulacoes(fazendaId: string): Promise<any[]> {
  const client = getSupabaseClient()
  const { data, error } = await (client as any)
    .from('formulacoes')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return (data as any[]) || []
}

export async function getFormulacaoByNome(fazendaId: string, nome: string): Promise<any | null> {
  const client = getSupabaseClient()
  const { data, error } = await (client as any)
    .from('formulacoes')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('nome', nome)
    .eq('ativo', true)
    .maybeSingle()

  if (error) throw error
  return (data as any) || null
}

export async function createEntradaInsumosItem(item: TablesInsert<'entrada_insumos_itens'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('entrada_insumos_itens')
    .insert(item)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateEntradaInsumosItem(id: string, item: TablesUpdate<'entrada_insumos_itens'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('entrada_insumos_itens')
    .update(item)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== MINERAL ====================

export async function getMineral(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('mineral')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function getMineralNomes(fazendaId: string): Promise<string[]> {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('mineral')
    .select('nome')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data?.map(item => item.nome) || []
}

export async function createMineral(mineral: any) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('mineral')
    .insert(mineral)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getMineralByNome(fazendaId: string, nome: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('mineral')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('nome', nome)
    .eq('ativo', true)
    .maybeSingle()

  if (error) throw error
  return data
}

// ==================== PROTEINADO ====================

export async function getProteinado(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('proteinado')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function getProteinadoNomes(fazendaId: string): Promise<string[]> {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('proteinado')
    .select('nome')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data?.map(item => item.nome) || []
}

export async function createProteinado(proteinado: any) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('proteinado')
    .insert(proteinado)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getProteinadoByNome(fazendaId: string, nome: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('proteinado')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('nome', nome)
    .eq('ativo', true)
    .maybeSingle()

  if (error) throw error
  return data
}

// ==================== RACAO ====================

export async function getRacao(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('racao')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function getRacaoNomes(fazendaId: string): Promise<string[]> {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('racao')
    .select('nome')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data?.map(item => item.nome) || []
}

export async function createRacao(racao: any) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('racao')
    .insert(racao)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getRacaoByNome(fazendaId: string, nome: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('racao')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('nome', nome)
    .eq('ativo', true)
    .maybeSingle()

  if (error) throw error
  return data
}

// ==================== FORMULAÇÕES (antes: DIETAS) ====================

export async function getFormulacoesDietas(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await (client as any)
    .from('formulacoes')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function getDietasNomes(fazendaId: string): Promise<string[]> {
  const client = getSupabaseClient()
  const { data, error } = await (client as any)
    .from('formulacoes')
    .select('nome')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return (data as any[])?.map((item: any) => item.nome) || []
}

export async function createFormulacao(formulacao: any) {
  const { data, error } = await (supabase as any)
    .from('formulacoes')
    .insert(formulacao)
    .select()
    .single()

  if (error) throw error
  return data
}

/** @deprecated Use getFormulacoesDietas */
export const getDietas = getFormulacoesDietas
/** @deprecated Use createFormulacao */
export const createDieta = createFormulacao

// ==================== FUNCIONARIOS ====================

export async function getFuncionarios(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('funcionarios')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function createFuncionario(funcionario: TablesInsert<'funcionarios'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('funcionarios')
    .insert(funcionario)
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== ITENS ALMOXARIFADO ====================

export async function getItensAlmoxarifado(fazendaId: string, classificacao?: string) {
  const client = getSupabaseClient()
  let query = client
    .from('itens_almoxarifado')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)

  if (classificacao) {
    query = query.eq('classificacao', classificacao)
  }

  query = query.order('nome')

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function getClassificacoesAlmoxarifado(fazendaId: string): Promise<string[]> {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('itens_almoxarifado')
    .select('classificacao')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)

  if (error) throw error

  // Get unique classificacoes
  const classificacoes = [...new Set(data?.map((item: any) => item.classificacao))]
  return classificacoes
}

// ==================== FRIGORIFICOS ====================

export async function getFrigorificos(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('frigorificos')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function getFornecedores(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('fornecedores')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function getUltimaDataPastoEntrada(fazendaId: string, nomePasto: string): Promise<string | null> {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('registros_pastagens')
    .select('created_at')
    .eq('fazenda_id', fazendaId)
    .eq('pasto_entrada', nomePasto)
    .not('created_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw error
  }
  
  return data?.created_at || null
}

export async function getUltimaDataPastoSaida(fazendaId: string, nomePasto: string): Promise<string | null> {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('registros_pastagens')
    .select('created_at')
    .eq('fazenda_id', fazendaId)
    .eq('pasto_saida', nomePasto)
    .not('created_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw error
  }
  
  return data?.created_at || null
}

export async function getUltimoStatusPasto(fazendaId: string, nomePasto: string): Promise<'entrada' | 'saida' | null> {
  const client = getSupabaseClient()
  
  // Buscar o último registro onde o pasto aparece como entrada
  const { data: entradaData, error: entradaError } = await client
    .from('registros_pastagens')
    .select('created_at')
    .eq('fazenda_id', fazendaId)
    .eq('pasto_entrada', nomePasto)
    .not('created_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (entradaError && entradaError.code !== 'PGRST116') {
    throw entradaError
  }
  
  // Buscar o último registro onde o pasto aparece como saída
  const { data: saidaData, error: saidaError } = await client
    .from('registros_pastagens')
    .select('created_at')
    .eq('fazenda_id', fazendaId)
    .eq('pasto_saida', nomePasto)
    .not('created_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (saidaError && saidaError.code !== 'PGRST116') {
    throw saidaError
  }
  
  // Comparar as datas para determinar qual foi o último registro
  if (!entradaData && !saidaData) {
    return null // Primeira vez que o pasto é usado
  }
  
  if (!entradaData) {
    return 'saida' // Só tem registro de saída
  }
  
  if (!saidaData) {
    return 'entrada' // Só tem registro de entrada
  }
  
  // Comparar timestamps
  const entradaTimestamp = new Date(entradaData.created_at).getTime()
  const saidaTimestamp = new Date(saidaData.created_at).getTime()
  
  return entradaTimestamp > saidaTimestamp ? 'entrada' : 'saida'
}

export async function getOcupacaoAtualPorLotePasto(loteId: string, pastoId: string) {
  const client = getSupabaseClient()
  const { data, error } = await (client as any)
    .from('v_lote_pasto_ocupacao_atual')
    .select('*')
    .eq('lote_id', loteId)
    .eq('pasto_id', pastoId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getOcupacaoAtualPorLoteModulo(loteId: string, moduloId: string) {
  const client = getSupabaseClient()
  const { data, error } = await (client as any)
    .from('v_lote_modulo_ocupacao_atual')
    .select('*')
    .eq('lote_id', loteId)
    .eq('modulo_id', moduloId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getPastoByNome(fazendaId: string, nome: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('pastos')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('nome', nome)
    .eq('ativo', true)
    .single()

  if (error) throw error
  return data
}

// ==================== BEBEDOUROS ====================

export async function getBebedouros(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('bebedouros')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function getBebedouroByNome(fazendaId: string, nome: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('bebedouros')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('nome', nome)
    .eq('ativo', true)
    .single()

  if (error) throw error
  return data
}

export async function getUltimaDataLimpezaBebedouro(fazendaId: string, bebedouroId: string): Promise<string | null> {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('historico_limpezas_bebedouros')
    .select('data_limpeza')
    .eq('fazenda_id', fazendaId)
    .eq('bebedouro_id', bebedouroId)
    .order('data_limpeza', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  return data?.data_limpeza || null
}

export async function getIntervaloMedioLimpezas(fazendaId: string, bebedouroId: string): Promise<number> {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('historico_limpezas_bebedouros')
    .select('data_limpeza')
    .eq('fazenda_id', fazendaId)
    .eq('bebedouro_id', bebedouroId)
    .order('data_limpeza', { ascending: true })

  if (error) throw error

  if (!data || data.length < 2) {
    return 0
  }

  // Calcular intervalos entre limpezas consecutivas
  let totalDias = 0
  for (let i = 1; i < data.length; i++) {
    const dataAnterior = new Date(data[i - 1].data_limpeza)
    const dataAtual = new Date(data[i].data_limpeza)
    const diffMs = dataAtual.getTime() - dataAnterior.getTime()
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    totalDias += diffDias
  }

  return Math.round(totalDias / (data.length - 1))
}

export async function createHistoricoLimpeza(
  fazendaId: string,
  bebedouroId: string,
  dataLimpeza: string,
  responsavel?: string,
  observacao?: string
) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('historico_limpezas_bebedouros')
    .insert({
      fazenda_id: fazendaId,
      bebedouro_id: bebedouroId,
      data_limpeza: dataLimpeza,
      responsavel: responsavel || null,
      observacao: observacao || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== REGISTROS MATERNIDADE ====================

export async function getRegistrosMaternidade(fazendaId: string, dataInicio?: string, dataFim?: string) {
  let query = supabase
    .from('registros_maternidade')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .is('deleted_at', null)
    .order('data', { ascending: false })

  if (dataInicio) {
    query = query.gte('data', dataInicio)
  }
  if (dataFim) {
    query = query.lte('data', dataFim)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createRegistroMaternidade(registro: any) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_maternidade')
    .insert(registro as any)
    .select()
    .single()

  if (error) throw error
  return data as any
}

export async function updateRegistroMaternidade(id: string, registro: TablesUpdate<'registros_maternidade'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_maternidade')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroMaternidade(id: string) {
  const client = await getSupabaseClientWithRefresh() as any
  const { error } = await client
    .from('registros_maternidade')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function getContagemPartosVaca(fazendaId: string, idBrincoMae?: string, idChipMae?: string, idManejoMae?: string): Promise<number> {
  const client = getSupabaseClient()

  let query = client
    .from('registros_maternidade')
    .select('id')
    .eq('fazenda_id', fazendaId)
    .is('deleted_at', null)

  if (idBrincoMae) {
    query = (query as any).eq('id_brinco_mae', idBrincoMae)
  } else if (idChipMae) {
    query = (query as any).eq('id_chip_mae', idChipMae)
  } else if (idManejoMae) {
    query = (query as any).eq('id_manejo_mae', idManejoMae)
  } else {
    return 0
  }

  const { data, error } = await query
  if (error) throw error
  return data?.length || 0
}

// ==================== REGISTROS PASTAGENS ====================

export async function getRegistrosPastagens(fazendaId: string, dataInicio?: string, dataFim?: string) {
  let query = supabase
    .from('registros_pastagens')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .is('deleted_at', null)
    .order('data', { ascending: false })

  if (dataInicio) {
    query = query.gte('data', dataInicio)
  }
  if (dataFim) {
    query = query.lte('data', dataFim)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createRegistroPastagens(registro: TablesInsert<'registros_pastagens'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_pastagens')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroPastagens(id: string, registro: TablesUpdate<'registros_pastagens'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_pastagens')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroPastagens(id: string) {
  const client = await getSupabaseClientWithRefresh() as any
  const { error } = await client
    .from('registros_pastagens')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// ==================== REGISTROS RODEIO ====================

export async function getRegistrosRodeio(fazendaId: string, dataInicio?: string, dataFim?: string) {
  let query = supabase
    .from('registros_rodeio')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .is('deleted_at', null)
    .order('data', { ascending: false })

  if (dataInicio) {
    query = query.gte('data', dataInicio)
  }
  if (dataFim) {
    query = query.lte('data', dataFim)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createRegistroRodeio(registro: TablesInsert<'registros_rodeio'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_rodeio')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroRodeio(id: string, registro: TablesUpdate<'registros_rodeio'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_rodeio')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroRodeio(id: string) {
  const client = await getSupabaseClientWithRefresh() as any
  const { error } = await client
    .from('registros_rodeio')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// ==================== REGISTROS SUPLEMENTACAO ====================

export async function getRegistrosSuplementacao(fazendaId: string, dataInicio?: string, dataFim?: string) {
  const client = getSupabaseClient()
  let query = client
    .from('registros_suplementacao')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .is('deleted_at', null)
    .order('data', { ascending: false })

  if (dataInicio) {
    query = query.gte('data', dataInicio)
  }
  if (dataFim) {
    query = query.lte('data', dataFim)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getRegistrosSuplementacaoByLote(fazendaId: string, loteId: string, dataInicio?: string, dataFim?: string) {
  const client = getSupabaseClient()
  let query = client
    .from('registros_suplementacao')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('lote_id', loteId)
    .is('deleted_at', null)
    .order('data', { ascending: false })

  if (dataInicio) {
    query = query.gte('data', dataInicio)
  }
  if (dataFim) {
    query = query.lte('data', dataFim)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createRegistroSuplementacao(registro: TablesInsert<'registros_suplementacao'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_suplementacao')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroSuplementacao(id: string, registro: TablesUpdate<'registros_suplementacao'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_suplementacao')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroSuplementacao(id: string) {
  const client = await getSupabaseClientWithRefresh() as any
  const { error } = await client
    .from('registros_suplementacao')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// ==================== REGISTROS BEBEDOUROS ====================

export async function getRegistrosBebedouros(fazendaId: string, dataInicio?: string, dataFim?: string) {
  let query = supabase
    .from('registros_bebedouros')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .is('deleted_at', null)
    .order('data', { ascending: false })

  if (dataInicio) {
    query = query.gte('data', dataInicio)
  }
  if (dataFim) {
    query = query.lte('data', dataFim)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createRegistroBebedouros(registro: TablesInsert<'registros_bebedouros'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_bebedouros')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroBebedouros(id: string, registro: TablesUpdate<'registros_bebedouros'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_bebedouros')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroBebedouros(id: string) {
  const client = await getSupabaseClientWithRefresh() as any
  const { error } = await client
    .from('registros_bebedouros')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// ==================== REGISTROS MOVIMENTACAO ====================

export async function getRegistrosMovimentacao(fazendaId: string, dataInicio?: string, dataFim?: string) {
  let query = supabase
    .from('registros_movimentacao')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .is('deleted_at', null)
    .order('data', { ascending: false })

  if (dataInicio) {
    query = query.gte('data', dataInicio)
  }
  if (dataFim) {
    query = query.lte('data', dataFim)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createRegistroMovimentacao(registro: TablesInsert<'registros_movimentacao'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_movimentacao')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroMovimentacao(id: string, registro: TablesUpdate<'registros_movimentacao'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_movimentacao')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroMovimentacao(id: string) {
  const client = await getSupabaseClientWithRefresh() as any
  const { error } = await client
    .from('registros_movimentacao')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// ==================== REGISTROS ENFERMARIA ====================

export async function getRegistrosEnfermaria(fazendaId: string, dataInicio?: string, dataFim?: string) {
  let query = supabase
    .from('registros_enfermaria')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .is('deleted_at', null)
    .order('data', { ascending: false })

  if (dataInicio) {
    query = query.gte('data', dataInicio)
  }
  if (dataFim) {
    query = query.lte('data', dataFim)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createRegistroEnfermaria(registro: TablesInsert<'registros_enfermaria'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_enfermaria')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroEnfermaria(id: string, registro: TablesUpdate<'registros_enfermaria'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_enfermaria')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroEnfermaria(id: string) {
  const client = await getSupabaseClientWithRefresh() as any
  const { error } = await client
    .from('registros_enfermaria')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// ==================== REGISTROS CLIMA ====================

export async function createRegistroClima(registro: TablesInsert<'registros_clima'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_clima')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroClima(id: string, registro: TablesUpdate<'registros_clima'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_clima')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== REGISTROS PROBLEMAS ====================

export async function createRegistroProblemas(registro: TablesInsert<'registros_problemas'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_problemas')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroProblemas(id: string, registro: TablesUpdate<'registros_problemas'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_problemas')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== REGISTROS ABASTECIMENTO ====================

export async function createRegistroAbastecimento(registro: TablesInsert<'registros_abastecimento'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_abastecimento')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroAbastecimento(id: string, registro: TablesUpdate<'registros_abastecimento'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_abastecimento')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== REGISTROS CANTINA ====================

export async function createRegistroCantina(registro: TablesInsert<'registros_cantina'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_cantina')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroCantina(id: string, registro: TablesUpdate<'registros_cantina'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_cantina')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== REGISTROS MORTE ====================

export async function createRegistroMorte(registro: TablesInsert<'registros_morte'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_morte')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroMorte(id: string, registro: TablesUpdate<'registros_morte'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_morte')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== REGISTROS LIMPEZA ====================

export async function getRegistrosLimpeza(fazendaId: string, dataInicio?: string, dataFim?: string) {
  let query = supabase
    .from('registros_limpeza')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .is('deleted_at', null)
    .order('data', { ascending: false })

  if (dataInicio) {
    query = query.gte('data', dataInicio)
  }
  if (dataFim) {
    query = query.lte('data', dataFim)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createRegistroLimpeza(registro: TablesInsert<'registros_limpeza'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_limpeza')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroLimpeza(id: string, registro: TablesUpdate<'registros_limpeza'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_limpeza')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroLimpeza(id: string) {
  const client = await getSupabaseClientWithRefresh() as any
  const { error } = await client
    .from('registros_limpeza')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// ==================== REGISTROS OPERAÇÕES MÁQUINAS ====================

export async function getRegistrosOperacoesMaquinas(fazendaId: string, dataInicio?: string, dataFim?: string) {
  let query = supabase
    .from('registros_operacoes_maquinas')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .is('deleted_at', null)
    .order('data', { ascending: false })

  if (dataInicio) {
    query = query.gte('data', dataInicio)
  }

  if (dataFim) {
    query = query.lte('data', dataFim)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

// ==================== REGISTROS MANUTENÇÃO MÁQUINAS ====================

export async function getRegistrosManutencaoMaquinas(fazendaId: string, dataInicio?: string, dataFim?: string) {
  let query = supabase
    .from('registros_manutencao_maquinas' as any)
    .select('*')
    .eq('fazenda_id', fazendaId)
    .is('deleted_at', null)
    .order('data', { ascending: false })

  if (dataInicio) {
    query = query.gte('data', dataInicio)
  }

  if (dataFim) {
    query = query.lte('data', dataFim)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function createRegistroManutencaoMaquinas(registro: any) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_manutencao_maquinas' as any)
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroManutencaoMaquinas(id: string, registro: any) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_manutencao_maquinas' as any)
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroManutencaoMaquinas(id: string) {
  const client = await getSupabaseClientWithRefresh() as any
  const { error } = await client
    .from('registros_manutencao_maquinas' as any)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function createRegistroOperacoesMaquinas(registro: any) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_operacoes_maquinas')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroOperacoesMaquinas(id: string, registro: any) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_operacoes_maquinas')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroOperacoesMaquinas(id: string) {
  const client = await getSupabaseClientWithRefresh() as any
  const { error } = await client
    .from('registros_operacoes_maquinas')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function deleteRegistroMorte(id: string) {
  const client = await getSupabaseClientWithRefresh() as any
  const { error } = await client
    .from('registros_morte')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// ==================== REGISTROS ENTRADA INSUMOS ====================

export async function getRegistrosEntradaInsumos(fazendaId: string, dataInicio?: string, dataFim?: string) {
  let query = supabase
    .from('registros_entrada_insumos')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .is('deleted_at', null)
    .order('data_entrada', { ascending: false })

  if (dataInicio) {
    query = query.gte('data_entrada', dataInicio)
  }
  if (dataFim) {
    query = query.lte('data_entrada', dataFim)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createRegistroEntradaInsumos(registro: TablesInsert<'registros_entrada_insumos'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_entrada_insumos')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroEntradaInsumos(id: string, registro: TablesUpdate<'registros_entrada_insumos'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_entrada_insumos')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroEntradaInsumos(id: string) {
  const client = await getSupabaseClientWithRefresh() as any
  const { error } = await client
    .from('registros_entrada_insumos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// ==================== REGISTROS SAIDA INSUMOS ====================

export async function getRegistrosSaidaInsumos(fazendaId: string, dataInicio?: string, dataFim?: string) {
  let query = supabase
    .from('registros_saida_insumos')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .is('deleted_at', null)
    .order('data_producao', { ascending: false })

  if (dataInicio) {
    query = query.gte('data_producao', dataInicio)
  }
  if (dataFim) {
    query = query.lte('data_producao', dataFim)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createRegistroSaidaInsumos(registro: TablesInsert<'registros_saida_insumos'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_saida_insumos')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroSaidaInsumos(id: string, registro: TablesUpdate<'registros_saida_insumos'>) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_saida_insumos')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroSaidaInsumos(id: string) {
  const client = await getSupabaseClientWithRefresh() as any
  const { error } = await client
    .from('registros_saida_insumos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// ==================== REGISTROS ALMOXARIFADO ====================

export async function createRegistroAlmoxarifado(registro: any) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_almoxarifado')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== PLUVIÔMETROS ====================

export async function getPluviometros(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await client
    .from('pluviometros')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

// ==================== ITENS SUPERMERCADO (CANTINA) ====================

export async function getItensSupermercado(fazendaId: string) {
  const client = getSupabaseClient()
  const { data, error } = await (client as any)
    .from('itens_supermercado')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function updateRegistroAlmoxarifado(id: string, registro: any) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_almoxarifado')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== REGISTROS LEITURA DE COCHO ====================

export async function getRegistrosLeituraCochoByLote(
  fazendaId: string,
  loteId: string,
  dataInicio?: string,
  dataFim?: string
) {
  const client = await getSupabaseClientWithRefresh()
  let query = client
    .from('registros_leitura_cocho')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('lote_id', loteId)
    .is('deleted_at', null)
    .order('data', { ascending: false })

  if (dataInicio) {
    query = query.gte('data', dataInicio)
  }
  if (dataFim) {
    query = query.lte('data', dataFim)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createRegistroLeituraCocho(registro: any) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_leitura_cocho')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroLeituraCocho(id: string, registro: any) {
  const client = await getSupabaseClientWithRefresh() as any
  const { data, error } = await client
    .from('registros_leitura_cocho')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroLeituraCocho(id: string) {
  const client = await getSupabaseClientWithRefresh() as any
  const { error } = await client
    .from('registros_leitura_cocho')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

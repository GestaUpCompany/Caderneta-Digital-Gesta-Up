import { supabase } from './supabaseClient'
import type { Database } from '../types/supabase'

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
    const { error: updateError } = await supabase
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
    const { error: updateError } = await supabase
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

type TablesInsert = Database['public']['Tables']
type TablesUpdate = Database['public']['Tables']

// ==================== FAZENDAS ====================

export async function getFazendaByAcessoId(acessoId: string) {
  const { data, error } = await supabase
    .from('fazendas')
    .select('*')
    .eq('acesso_id', acessoId)
    .eq('ativo', true)
    .single()

  if (error) throw error
  return data
}

export async function createFazenda(fazenda: TablesInsert['fazendas']['Insert']) {
  const { data, error } = await supabase
    .from('fazendas')
    .insert(fazenda)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateFazenda(id: string, fazenda: TablesUpdate['fazendas']['Update']) {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
    .from('pastos')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function createPasto(pasto: TablesInsert['pastos']['Insert']) {
  const { data, error } = await supabase
    .from('pastos')
    .insert(pasto)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePasto(id: string, pasto: TablesUpdate['pastos']['Update']) {
  const { data, error } = await supabase
    .from('pastos')
    .update(pasto)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePasto(id: string) {
  const { error } = await supabase
    .from('pastos')
    .update({ ativo: false })
    .eq('id', id)

  if (error) throw error
}

// ==================== LOTES ====================

export async function getLotes(fazendaId: string) {
  const { data, error } = await supabase
    .from('lotes')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function getLoteByNome(fazendaId: string, nome: string) {
  const { data, error } = await supabase
    .from('lotes')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('nome', nome)
    .eq('ativo', true)
    .single()

  if (error) throw error
  return data
}

export async function createLote(lote: TablesInsert['lotes']['Insert']) {
  const { data, error } = await supabase
    .from('lotes')
    .insert(lote)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateLote(id: string, lote: TablesUpdate['lotes']['Update']) {
  const { data, error } = await supabase
    .from('lotes')
    .update(lote)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteLote(id: string) {
  const { error } = await supabase
    .from('lotes')
    .update({ ativo: false })
    .eq('id', id)

  if (error) throw error
}

// ==================== CATEGORIAS ====================

export async function getCategorias(fazendaId: string) {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function createCategoria(categoria: TablesInsert['categorias']['Insert']) {
  const { data, error } = await supabase
    .from('categorias')
    .insert(categoria)
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== INSUMOS ====================

export async function getInsumos(fazendaId: string) {
  const { data, error } = await supabase
    .from('insumos')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function getInsumosNomes(fazendaId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('insumos')
    .select('nome')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data?.map(item => item.nome) || []
}

export async function createInsumo(insumo: TablesInsert['insumos']['Insert']) {
  const { data, error } = await supabase
    .from('insumos')
    .insert(insumo)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateInsumo(id: string, insumo: TablesUpdate['insumos']['Update']) {
  const { data, error } = await supabase
    .from('insumos')
    .update(insumo)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== MINERAL ====================

export async function getMineral(fazendaId: string) {
  const { data, error } = await supabase
    .from('mineral')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function getMineralNomes(fazendaId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('mineral')
    .select('nome')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data?.map(item => item.nome) || []
}

export async function createMineral(mineral: any) {
  const { data, error } = await supabase
    .from('mineral')
    .insert(mineral)
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== PROTEINADO ====================

export async function getProteinado(fazendaId: string) {
  const { data, error } = await supabase
    .from('proteinado')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function getProteinadoNomes(fazendaId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('proteinado')
    .select('nome')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data?.map(item => item.nome) || []
}

export async function createProteinado(proteinado: any) {
  const { data, error } = await supabase
    .from('proteinado')
    .insert(proteinado)
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== RACAO ====================

export async function getRacao(fazendaId: string) {
  const { data, error } = await supabase
    .from('racao')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function getRacaoNomes(fazendaId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('racao')
    .select('nome')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data?.map(item => item.nome) || []
}

export async function createRacao(racao: any) {
  const { data, error } = await supabase
    .from('racao')
    .insert(racao)
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== DIETAS ====================

export async function getDietas(fazendaId: string) {
  const { data, error } = await supabase
    .from('dietas')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function getDietasNomes(fazendaId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('dietas')
    .select('nome')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data?.map(item => item.nome) || []
}

export async function createDieta(dieta: any) {
  const { data, error } = await supabase
    .from('dietas')
    .insert(dieta)
    .select()
    .single()

  if (error) throw error
  return data
}

// ==================== FUNCIONARIOS ====================

export async function getFuncionarios(fazendaId: string) {
  const { data, error } = await supabase
    .from('funcionarios')
    .select('*')
    .eq('fazenda_id', fazendaId)
    .eq('ativo', true)
    .order('nome')

  if (error) throw error
  return data
}

export async function createFuncionario(funcionario: TablesInsert['funcionarios']['Insert']) {
  const { data, error } = await supabase
    .from('funcionarios')
    .insert(funcionario)
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

export async function createRegistroMaternidade(registro: TablesInsert['registros_maternidade']['Insert']) {
  const { data, error } = await supabase
    .from('registros_maternidade')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroMaternidade(id: string, registro: TablesUpdate['registros_maternidade']['Update']) {
  const { data, error } = await supabase
    .from('registros_maternidade')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroMaternidade(id: string) {
  const { error } = await supabase
    .from('registros_maternidade')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
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

export async function createRegistroPastagens(registro: TablesInsert['registros_pastagens']['Insert']) {
  const { data, error } = await supabase
    .from('registros_pastagens')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroPastagens(id: string, registro: TablesUpdate['registros_pastagens']['Update']) {
  const { data, error } = await supabase
    .from('registros_pastagens')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroPastagens(id: string) {
  const { error } = await supabase
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

export async function createRegistroRodeio(registro: TablesInsert['registros_rodeio']['Insert']) {
  const { data, error } = await supabase
    .from('registros_rodeio')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroRodeio(id: string, registro: TablesUpdate['registros_rodeio']['Update']) {
  const { data, error } = await supabase
    .from('registros_rodeio')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroRodeio(id: string) {
  const { error } = await supabase
    .from('registros_rodeio')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// ==================== REGISTROS SUPLEMENTACAO ====================

export async function getRegistrosSuplementacao(fazendaId: string, dataInicio?: string, dataFim?: string) {
  let query = supabase
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

export async function createRegistroSuplementacao(registro: TablesInsert['registros_suplementacao']['Insert']) {
  const { data, error } = await supabase
    .from('registros_suplementacao')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroSuplementacao(id: string, registro: TablesUpdate['registros_suplementacao']['Update']) {
  const { data, error } = await supabase
    .from('registros_suplementacao')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroSuplementacao(id: string) {
  const { error } = await supabase
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

export async function createRegistroBebedouros(registro: TablesInsert['registros_bebedouros']['Insert']) {
  const { data, error } = await supabase
    .from('registros_bebedouros')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroBebedouros(id: string, registro: TablesUpdate['registros_bebedouros']['Update']) {
  const { data, error } = await supabase
    .from('registros_bebedouros')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroBebedouros(id: string) {
  const { error } = await supabase
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

export async function createRegistroMovimentacao(registro: TablesInsert['registros_movimentacao']['Insert']) {
  const { data, error } = await supabase
    .from('registros_movimentacao')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroMovimentacao(id: string, registro: TablesUpdate['registros_movimentacao']['Update']) {
  const { data, error } = await supabase
    .from('registros_movimentacao')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroMovimentacao(id: string) {
  const { error } = await supabase
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

export async function createRegistroEnfermaria(registro: TablesInsert['registros_enfermaria']['Insert']) {
  const { data, error } = await supabase
    .from('registros_enfermaria')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroEnfermaria(id: string, registro: TablesUpdate['registros_enfermaria']['Update']) {
  const { data, error } = await supabase
    .from('registros_enfermaria')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroEnfermaria(id: string) {
  const { error } = await supabase
    .from('registros_enfermaria')
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

export async function createRegistroEntradaInsumos(registro: TablesInsert['registros_entrada_insumos']['Insert']) {
  const { data, error } = await supabase
    .from('registros_entrada_insumos')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroEntradaInsumos(id: string, registro: TablesUpdate['registros_entrada_insumos']['Update']) {
  const { data, error } = await supabase
    .from('registros_entrada_insumos')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroEntradaInsumos(id: string) {
  const { error } = await supabase
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

export async function createRegistroSaidaInsumos(registro: TablesInsert['registros_saida_insumos']['Insert']) {
  const { data, error } = await supabase
    .from('registros_saida_insumos')
    .insert(registro)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRegistroSaidaInsumos(id: string, registro: TablesUpdate['registros_saida_insumos']['Update']) {
  const { data, error } = await supabase
    .from('registros_saida_insumos')
    .update(registro)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRegistroSaidaInsumos(id: string) {
  const { error } = await supabase
    .from('registros_saida_insumos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

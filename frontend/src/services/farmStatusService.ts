import { supabase } from './supabaseClient'

export interface FarmStatusResult {
  active: boolean
  exists: boolean
  nome?: string
  error?: boolean
  offline?: boolean
}

/**
 * Verifica se a fazenda configurada ainda está ativa no Supabase.
 * Diferente de getFazendaByAcessoId, esta função NÃO filtra por ativo=true,
 * permitindo detectar fazendas que foram desativadas.
 */
export async function checkFarmActiveStatus(acessoId: string): Promise<FarmStatusResult> {
  if (!acessoId) {
    return { active: false, exists: false, error: true }
  }

  // Se estiver offline, não é possível verificar; mantém comportamento permissivo
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { active: true, exists: true, offline: true }
  }

  try {
    const acessoIdNormalizado = acessoId.toLowerCase()

    const { data, error } = await supabase
      .from('fazendas')
      .select('id, nome, ativo, acesso_id')
      .ilike('acesso_id', acessoIdNormalizado)
      .single()

    if (error) {
      // PGRST116 = "JSON object requested, multiple (or no) rows returned" - fazenda não encontrada
      if (error.code === 'PGRST116') {
        return { active: false, exists: false }
      }

      console.error('[FarmStatusService] Erro ao verificar status da fazenda:', error)
      return { active: true, exists: true, error: true }
    }

    if (!data) {
      return { active: false, exists: false }
    }

    return {
      active: data.ativo === true,
      exists: true,
      nome: data.nome || undefined,
    }
  } catch (error) {
    console.error('[FarmStatusService] Erro inesperado ao verificar status da fazenda:', error)
    return { active: true, exists: true, error: true }
  }
}

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

    // get_fazenda_por_acesso é SECURITY DEFINER com campos operacionais mínimos:
    // funciona tanto anon (boot sem token do peão) quanto autenticado. O acesso
    // direto à tabela fazendas exige vínculo desde o isolamento de tenant.
    const { data: rows, error } = await (supabase as any).rpc('get_fazenda_por_acesso', {
      p_acesso_id: acessoIdNormalizado,
    })

    if (error) {
      console.error('[FarmStatusService] Erro ao verificar status da fazenda:', error)
      return { active: true, exists: true, error: true }
    }

    const data = Array.isArray(rows) ? rows[0] : rows
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

import { supabase } from './supabaseClient'

export interface FarmStatusResult {
  active: boolean
  exists: boolean
  nome?: string
  error?: boolean
  offline?: boolean
}

const FARM_STATUS_TIMEOUT_MS = 3000

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
    // Esta verificação segura o app inteiro em PageLoader (App.tsx). Com rede travada (Wi-Fi sem internet,
    // sinal fraco) a requisição pode não terminar nunca: depois do timeout segue permissivo, como offline.
    let timer: ReturnType<typeof setTimeout> | undefined
    const timeout = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), FARM_STATUS_TIMEOUT_MS)
    })
    const resposta = await Promise.race([
      (supabase as any).rpc('get_fazenda_por_acesso', { p_acesso_id: acessoIdNormalizado }),
      timeout,
    ])
    clearTimeout(timer)
    if (resposta === 'timeout') {
      console.warn('[FarmStatusService] Verificação demorou demais; seguindo sem confirmar o status da fazenda.')
      return { active: true, exists: true, offline: true }
    }
    const { data: rows, error } = resposta

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

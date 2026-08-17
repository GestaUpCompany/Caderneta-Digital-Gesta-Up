/**
 * Re-authenticates with Supabase using the acessoId from config
 * This is called automatically on app load if tokens are invalid
 *
 * Usa a RPC autenticar_peao_app (SECURITY DEFINER) em vez de ler a tabela peoes
 * diretamente, para nao expor todos os peoes via RLS publica.
 */
export async function reauthenticateFarm(acessoId: string): Promise<{ sucesso: boolean; fazendaId?: string; nome?: string; token?: string; logoUrl?: string }> {
  try {
    console.log('[AuthService] Re-authenticating farm with acessoId:', acessoId)

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[AuthService] Supabase credentials not configured')
      return { sucesso: false }
    }

    // Buscar dados do peao via RPC (SECURITY DEFINER) para um acesso_id especifico.
    // A tabela peoes nao tem mais RLS publica; a RPC e o unico caminho.
    const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/autenticar_peao_app`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ p_acesso_id: acessoId }),
    })

    if (!rpcResponse.ok) {
      console.error('[AuthService] Erro ao chamar RPC autenticar_peao_app:', await rpcResponse.text())
      return { sucesso: false }
    }

    const rpcData = await rpcResponse.json()
    if (!rpcData || rpcData.success !== true || !rpcData.email || !rpcData.password) {
      console.error('[AuthService] Peão não encontrado para esta fazenda')
      return { sucesso: false }
    }

    console.log('[AuthService] Peão encontrado:', rpcData.email)

    // Fazer login no Supabase Auth com email/senha do peão
    const loginResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        email: rpcData.email,
        password: rpcData.password,
      }),
    })

    if (!loginResponse.ok) {
      console.error('[AuthService] Erro ao fazer login:', await loginResponse.text())
      return { sucesso: false }
    }

    const loginData = await loginResponse.json()
    console.log('[AuthService] Login do peão bem-sucedido, token recebido')

    if (rpcData.fazenda_id) {
      // Salvar token JWT e refresh token no localStorage
      localStorage.setItem('supabase_token', loginData.access_token)
      localStorage.setItem('supabase_refresh_token', loginData.refresh_token || '')
      return {
        sucesso: true,
        fazendaId: rpcData.fazenda_id,
        nome: rpcData.fazenda_nome,
        token: loginData.access_token,
        logoUrl: rpcData.logo_url || undefined,
      }
    }
  } catch (error) {
    console.error('[AuthService] Erro ao re-authenticar fazenda:', error)
  }
  return { sucesso: false }
}

/**
 * Checks if the current Supabase token is valid
 */
export function isTokenValid(): boolean {
  const token = localStorage.getItem('supabase_token')
  if (!token) return false
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const now = Math.floor(Date.now() / 1000)
    
    // Token é válido se não expirou (com margem de 5 minutos)
    return payload.exp && payload.exp - now > 300
  } catch (error) {
    console.error('[AuthService] Erro ao validar token:', error)
    return false
  }
}

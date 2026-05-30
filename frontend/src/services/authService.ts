import { getFazendaByAcessoId } from './supabaseService'

/**
 * Re-authenticates with Supabase using the acessoId from config
 * This is called automatically on app load if tokens are invalid
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
    
    // Buscar peão na tabela peoes usando anon key (case-insensitive)
    const peaoResponse = await fetch(`${supabaseUrl}/rest/v1/peoes?fazenda_id=ilike.${acessoId}&ativo=eq.true`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
    })

    if (!peaoResponse.ok) {
      console.error('[AuthService] Erro ao buscar peão:', await peaoResponse.text())
      return { sucesso: false }
    }

    const peaoData = await peaoResponse.json()
    if (!peaoData || peaoData.length === 0) {
      console.error('[AuthService] Peão não encontrado para esta fazenda')
      return { sucesso: false }
    }

    const peao = peaoData[0]
    console.log('[AuthService] Peão encontrado:', peao.email)

    // Fazer login no Supabase Auth com email/senha do peão
    const loginResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        email: peao.email,
        password: peao.password,
      }),
    })

    if (!loginResponse.ok) {
      console.error('[AuthService] Erro ao fazer login:', await loginResponse.text())
      return { sucesso: false }
    }

    const loginData = await loginResponse.json()
    console.log('[AuthService] Login do peão bem-sucedido, token recebido')
    
    // Obter dados da fazenda
    const fazenda = await getFazendaByAcessoId(acessoId)
    console.log('[AuthService] Fazenda encontrada:', fazenda)
    
    if (fazenda) {
      // Salvar token JWT e refresh token no localStorage
      localStorage.setItem('supabase_token', loginData.access_token)
      localStorage.setItem('supabase_refresh_token', loginData.refresh_token || '')
      return { sucesso: true, fazendaId: fazenda.id, nome: fazenda.nome, token: loginData.access_token, logoUrl: fazenda.logo_url || undefined }
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

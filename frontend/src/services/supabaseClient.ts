import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios')
}

// Criar cliente Supabase com anon key
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Criar cliente Supabase com token JWT (para operações autenticadas)
export function createSupabaseClientWithToken(token: string) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: true,
    }
  })
}

// Função para refresh do token
async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem('supabase_refresh_token')
    if (!refreshToken) return null

    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      console.error('Erro ao refresh token:', await response.text())
      return null
    }

    const data = await response.json()
    localStorage.setItem('supabase_token', data.access_token)
    if (data.refresh_token) {
      localStorage.setItem('supabase_refresh_token', data.refresh_token)
    }
    
    return data.access_token
  } catch (error) {
    console.error('Erro ao refresh token:', error)
    return null
  }
}

// Criar cliente Supabase com token do localStorage (se disponível)
export async function getSupabaseClient() {
  const token = localStorage.getItem('supabase_token')
  if (token) {
    // Verificar se o token está expirado ou vai expirar em menos de 5 minutos
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const now = Math.floor(Date.now() / 1000)
      
      // Se o token expirou ou vai expirar em menos de 5 minutos, tentar refresh
      if (payload.exp && payload.exp - now < 300) {
        console.log('[SupabaseClient] Token expirando, tentando refresh')
        const newToken = await refreshAccessToken()
        if (newToken) {
          return createSupabaseClientWithToken(newToken)
        }
        // Se refresh falhar, limpar e usar cliente anon
        console.log('[SupabaseClient] Refresh falhou, usando cliente anon')
        localStorage.removeItem('supabase_token')
        localStorage.removeItem('supabase_refresh_token')
        return supabase
      }
    } catch (error) {
      console.error('[SupabaseClient] Erro ao verificar expiração do token:', error)
      // Se houver erro, limpar token e usar cliente anon
      localStorage.removeItem('supabase_token')
      localStorage.removeItem('supabase_refresh_token')
      return supabase
    }
    
    return createSupabaseClientWithToken(token)
  }
  return supabase
}

// Criar cliente Supabase com auto-refresh de token
export async function getSupabaseClientWithRefresh() {
  let token = localStorage.getItem('supabase_token')
  
  if (!token) {
    return supabase
  }

  // Verificar se o token está expirado (JWT expira em 1 hora por padrão)
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    const now = Math.floor(Date.now() / 1000)
    
    // Se o token expirou ou vai expirar em menos de 5 minutos, fazer refresh
    if (payload.exp && payload.exp - now < 300) {
      console.log('[SupabaseClient] Token expirando, fazendo refresh')
      token = await refreshAccessToken()
      if (!token) {
        // Se refresh falhar, usar cliente anon
        return supabase
      }
    }
  } catch (error) {
    console.error('[SupabaseClient] Erro ao verificar expiração do token:', error)
  }

  if (!token) {
    return supabase
  }

  return createSupabaseClientWithToken(token)
}

// Função para validar acesso à fazenda usando Edge Function
export async function validateFarmAccess(fazendaId: string, acessoId: string): Promise<boolean> {
  try {
    const client = await getSupabaseClientWithRefresh()
    const { data, error } = await client.functions.invoke('validate-farm-access', {
      headers: {
        'x-fazenda-id': fazendaId,
        'x-acesso-id': acessoId,
      },
    })

    if (error) {
      console.error('Erro ao validar acesso:', error)
      return false
    }

    return data?.valid === true
  } catch (error) {
    console.error('Erro ao validar acesso:', error)
    return false
  }
}

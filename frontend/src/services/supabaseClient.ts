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
    }
  })
}

// Criar cliente Supabase com token do localStorage (se disponível)
export function getSupabaseClient() {
  const token = localStorage.getItem('supabase_token')
  if (token) {
    return createSupabaseClientWithToken(token)
  }
  return supabase
}

// Função para validar acesso à fazenda usando Edge Function
export async function validateFarmAccess(fazendaId: string, acessoId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('validate-farm-access', {
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

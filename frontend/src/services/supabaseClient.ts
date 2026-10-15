import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'
import { criarFetchComTimeout } from '../utils/fetchComTimeout'
import { reauthenticateFarm, lerAcessoIdPersistido } from './authService'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios')
}

// Toda requisição ao Supabase tem tempo máximo (ver utils/fetchComTimeout.ts)
const fetchComTimeout = criarFetchComTimeout()

// Criar cliente Supabase com anon key
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchComTimeout },
})

// Criar cliente Supabase com token JWT (para operações autenticadas)
export function createSupabaseClientWithToken(token: string) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: fetchComTimeout,
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

/**
 * Sem sessão válida para gravar. Usa o código PGRST301 (JWT vencido) para que a classificação de sync
 * trate como falha momentânea: o registro fica na fila e nunca é enviado como anônimo (o RLS rejeitaria com 42501).
 */
export class SessaoIndisponivelError extends Error {
  code = 'PGRST301'
  constructor(motivo: string) {
    super(`Sessão indisponível: ${motivo}`)
    this.name = 'SessaoIndisponivelError'
  }
}

/** Segundos até o JWT expirar (negativo se já expirou); null se não for possível ler. */
function segundosParaExpirar(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' ? payload.exp - Math.floor(Date.now() / 1000) : null
  } catch {
    return null
  }
}

// Várias gravações do sync pedem o cliente ao mesmo tempo. Com o refresh token rotativo, dois refreshes
// paralelos invalidam um ao outro (400) e o segundo apagava a sessão: um só refresh em voo por vez.
let refreshEmAndamento: Promise<string | null> | null = null

function refreshAccessToken(): Promise<string | null> {
  if (!refreshEmAndamento) {
    refreshEmAndamento = executarRefresh().finally(() => {
      refreshEmAndamento = null
    })
  }
  return refreshEmAndamento
}

// Refresh token que o servidor já recusou (400/401/403): não adianta insistir, a sessão volta pela reautenticação.
let refreshTokenRecusado: string | null = null

// Reautenticação silenciosa do peão (RPC autenticar_peao_app + login), um voo por vez.
let reautenticacaoEmAndamento: Promise<string | null> | null = null

async function executarReautenticacao(): Promise<string | null> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null
  const acessoId = lerAcessoIdPersistido()
  if (!acessoId) return null
  const resultado = await reauthenticateFarm(acessoId)
  if (!resultado.sucesso) return null
  refreshTokenRecusado = null
  return localStorage.getItem('supabase_token')
}

/**
 * Refaz o login do peão sem tela nem ação dele. Devolve o novo access token, ou null (sem rede,
 * aparelho sem fazenda configurada ou peão recusado pelo servidor).
 */
export function reautenticarEmSilencio(): Promise<string | null> {
  if (!reautenticacaoEmAndamento) {
    reautenticacaoEmAndamento = executarReautenticacao().finally(() => {
      reautenticacaoEmAndamento = null
    })
  }
  return reautenticacaoEmAndamento
}

// Quando maior que zero, todo cliente pedido exige sessão (nunca cai no anônimo). Usado durante o ciclo de sync,
// em que cada gravação e upload precisa sair como o peão e não como anônimo (o RLS recusaria com 42501).
let sessaoObrigatoriaAtiva = 0

export async function comSessaoObrigatoria<T>(fn: () => Promise<T>): Promise<T> {
  sessaoObrigatoriaAtiva++
  try {
    return await fn()
  } finally {
    sessaoObrigatoriaAtiva--
  }
}

// Função para refresh do token
async function executarRefresh(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem('supabase_refresh_token')
    if (!refreshToken || refreshToken === refreshTokenRecusado) return null

    const response = await fetchComTimeout(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
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
      const statusCode = response.status
      console.error('Erro ao refresh token:', statusCode, await response.text())
      // 400/401/403: o servidor recusou este refresh token (revogado ou já usado). Os tokens NÃO são apagados:
      // a sessão volta pela reautenticação silenciosa, e apagar só deixaria o app sem sessão se ela falhar.
      // Erros 5xx, timeout e rede instável são transitórios: nada muda.
      if (statusCode === 400 || statusCode === 401 || statusCode === 403) {
        // Outra aba/ciclo pode ter rotacionado o refresh token enquanto esta chamada estava em voo: usar o novo
        const atual = localStorage.getItem('supabase_refresh_token')
        if (atual && atual !== refreshToken) return localStorage.getItem('supabase_token')
        refreshTokenRecusado = refreshToken
      }
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
export function getSupabaseClient() {
  const token = localStorage.getItem('supabase_token')
  
  if (!token) {
    return supabase
  }

  // Criar cliente com token para autenticação
  return createSupabaseClientWithToken(token)
}

// Iniciar refresh automático do token a cada 30 minutos
let refreshInterval: number | null = null

export function startTokenRefresh() {
  if (refreshInterval) return // Já está rodando
  
  refreshInterval = window.setInterval(async () => {
    const token = localStorage.getItem('supabase_token')
    if (!token) {
      if (refreshInterval) {
        clearInterval(refreshInterval)
        refreshInterval = null
      }
      return
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const now = Math.floor(Date.now() / 1000)
      
      // Se o token vai expirar em menos de 30 minutos, fazer refresh
      if (payload.exp && payload.exp - now < 1800) {
        console.log('[SupabaseClient] Token expirando, fazendo refresh automático')
        const newToken = (await refreshAccessToken()) ?? (await reautenticarEmSilencio())
        if (!newToken) {
          console.error('[SupabaseClient] Falha ao refresh token')
        }
      }
    } catch (error) {
      console.error('[SupabaseClient] Erro ao verificar expiração do token:', error)
    }
  }, 5 * 60 * 1000) // Verificar a cada 5 minutos
}

export function stopTokenRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}

// Criar cliente Supabase com auto-refresh de token
// `exigirSessao`: para GRAVAÇÕES. Nunca cai no cliente anônimo; sem sessão válida tenta renovar e, se preciso,
// reautenticar o peão em silêncio. Só lança SessaoIndisponivelError quando não há como (sem rede, por exemplo):
// o item então espera na fila. Dentro de `comSessaoObrigatoria` toda chamada se comporta assim.
export async function getSupabaseClientWithRefresh(opcoes?: { exigirSessao?: boolean }) {
  const exigirSessao = opcoes?.exigirSessao === true || sessaoObrigatoriaAtiva > 0
  let token = localStorage.getItem('supabase_token')

  if (!token) {
    if (exigirSessao) {
      const reautenticado = await reautenticarEmSilencio()
      if (reautenticado) return createSupabaseClientWithToken(reautenticado)
      throw new SessaoIndisponivelError('sem token de acesso')
    }
    return supabase
  }

  // Se o token expirou ou vai expirar em menos de 5 minutos, fazer refresh (JWT expira em 1 hora por padrão)
  const restante = segundosParaExpirar(token)
  if (restante !== null && restante < 300) {
    console.log('[SupabaseClient] Token expirando, fazendo refresh')
    let renovado = await refreshAccessToken()
    // Expirado e o refresh não deu certo: para gravar, refaz o login do peão em vez de seguir sem sessão
    if (!renovado && restante <= 0 && exigirSessao) renovado = await reautenticarEmSilencio()
    if (renovado) {
      token = renovado
    } else if (restante > 0) {
      // Refresh falhou (rede ruim), mas o token atual ainda vale: usa ele em vez do anônimo
      console.warn('[SupabaseClient] Refresh falhou; mantendo token atual até expirar')
    } else {
      // Expirado e sem renovação: anônimo só serve para leitura
      if (exigirSessao) throw new SessaoIndisponivelError('token expirado e sem como renovar')
      return supabase
    }
  }

  return createSupabaseClientWithToken(token)
}

/** Renova a sessão se estiver perto de vencer, sem apagar nada quando a rede falha. Usado ao abrir o app. */
export async function renovarSessaoSeNecessario(): Promise<void> {
  try {
    await getSupabaseClientWithRefresh()
  } catch (error) {
    console.warn('[SupabaseClient] Não foi possível renovar a sessão agora:', error)
  }
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

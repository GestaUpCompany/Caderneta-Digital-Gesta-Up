// @ts-ignore - jsr imports are valid in Deno runtime but not recognized by local TypeScript
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
// @ts-ignore - jsr imports are valid in Deno runtime but not recognized by local TypeScript
import { createClient } from 'jsr:@supabase/supabase-js@2'

// @ts-ignore - Deno is available in Deno runtime but not in local TypeScript
Deno.serve(async (req: Request) => {
  // Habilitar CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  try {
    const { acesso_id } = await req.json()

    if (!acesso_id) {
      return new Response(JSON.stringify({ error: 'acesso_id é obrigatório' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // Criar cliente Supabase com service role key (tem permissões totais)
    // @ts-ignore - Deno.env is available in Deno runtime but not in local TypeScript
    const supabase = createClient(
      // @ts-ignore - Deno.env is available in Deno runtime but not in local TypeScript
      Deno.env.get('SUPABASE_URL')!,
      // @ts-ignore - Deno.env is available in Deno runtime but not in local TypeScript
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Buscar peão pelo acesso_id da fazenda
    const { data: peao, error: peaoError } = await supabase
      .from('peoes')
      .select('*')
      .eq('fazenda_id', acesso_id)
      .eq('ativo', true)
      .single()

    if (peaoError || !peao) {
      return new Response(JSON.stringify({ error: 'Peão não encontrado para esta fazenda' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // Fazer login no Supabase Auth com email/senha do peão
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: peao.email,
      password: peao.password,
    })

    if (authError) {
      return new Response(JSON.stringify({ error: 'Erro ao fazer login: ' + authError.message }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // Retornar o token JWT e dados da sessão
    return new Response(JSON.stringify({
      success: true,
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      user: authData.user,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })

  } catch (error) {
    // @ts-ignore - error type is unknown in TypeScript but has message property at runtime
    return new Response(JSON.stringify({ error: 'Erro interno: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})

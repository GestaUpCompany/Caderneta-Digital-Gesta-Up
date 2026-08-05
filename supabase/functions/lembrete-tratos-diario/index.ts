// @ts-ignore - jsr imports are valid in Deno runtime but not recognized by local TypeScript
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
// @ts-ignore - jsr imports are valid in Deno runtime but not recognized by local TypeScript
import { createClient } from 'jsr:@supabase/supabase-js@2'
// @ts-ignore - npm imports are valid in Deno runtime but not recognized by local TypeScript
import webPush from 'npm:web-push@3.6.7'

/**
 * Edge Function: lembrete-tratos-diario
 *
 * Deve ser agendada via Supabase Scheduler / pg_cron para rodar a cada hora.
 * A função verifica internamente se são 17:00 em America/Cuiaba antes de
 * disparar as notificações. Isso evita problemas com horário de verão (DST),
 * já que o cron roda em UTC mas a verificação usa o offset dinâmico do Cuiabá.
 *
 * Lógica:
 * 1. Verifica se now() em America/Cuiaba é 17:00 (janela de 1h)
 * 2. Para cada fazenda com notificacoes_config.tratos_ativo = true:
 *    a. Busca programacao_tratos ativa (tipo engorda, ou primeiro tipo disponível)
 *    b. Extrai horários sugeridos dos tratos
 *    c. Busca push_subscriptions da fazenda
 *    d. Envia push com "Lembrete de tratos de amanhã: 4 tratos às 07:00, 10:00, 14:00, 19:00"
 *
 * Variáveis de ambiente necessárias:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - VAPID_PUBLIC_KEY
 * - VAPID_PRIVATE_KEY
 * - VAPID_SUBJECT (ex: mailto:contato@gestaup.com)
 */

// Configurar web-push com as chaves VAPID
function configureWebPush() {
  // @ts-ignore - Deno.env is available in Deno runtime but not in local TypeScript
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
  // @ts-ignore
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
  // @ts-ignore
  const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:contato@gestaup.com'

  if (!publicKey || !privateKey) {
    throw new Error('VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY são obrigatórias')
  }

  webPush.setVapidDetails(subject, publicKey, privateKey)
}

// ==================== LÓGICA PRINCIPAL ====================

/**
 * Verifica se agora é 17:00 em America/Cuiaba (com tolerância de ±59min).
 * Usa Intl.DateTimeFormat para obter a hora no timezone correto,
 * lidando automaticamente com horário de verão.
 */
function is17hCuiaba(): boolean {
  const now = new Date()
  const cuiabaTime = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Cuiaba',
    hour: '2-digit',
    hour12: false,
  }).format(now)

  const hour = parseInt(cuiabaTime, 10)
  return hour === 17
}

/**
 * Busca fazendas com notificações de trato ativas.
 */
async function getFazendasComTratosAtivos(supabase: any): Promise<string[]> {
  const { data: configs, error: configError } = await supabase
    .from('notificacoes_config')
    .select('fazenda_id')
    .eq('tratos_ativo', true)

  if (configError || !configs || configs.length === 0) {
    return []
  }

  return configs.map((c: any) => c.fazenda_id)
}

/**
 * Busca a programação de tratos ativa de uma fazenda e extrai os horários.
 * Prioriza 'engorda'; se não houver, pega o primeiro tipo ativo disponível.
 */
async function getHorariosTratosFazenda(supabase: any, fazendaId: string): Promise<string[] | null> {
  // Busca programação de engorda ativa
  const { data: progEngorda } = await supabase
    .from('programacao_tratos')
    .select(`
      id,
      quantidade_tratos,
      tipo,
      ativo,
      programacao_tratos_percentuais (
        ordem_trato,
        percentual,
        horario_sugerido
      )
    `)
    .eq('fazenda_id', fazendaId)
    .eq('tipo', 'engorda')
    .eq('ativo', true)
    .maybeSingle()

  let prog = progEngorda

  // Se não tem engorda ativa, busca qualquer tipo ativo
  if (!prog) {
    const { data: progAny } = await supabase
      .from('programacao_tratos')
      .select(`
        id,
        quantidade_tratos,
        tipo,
        ativo,
        programacao_tratos_percentuais (
          ordem_trato,
          percentual,
          horario_sugerido
        )
      `)
      .eq('fazenda_id', fazendaId)
      .eq('ativo', true)
      .maybeSingle()
    prog = progAny
  }

  if (!prog || !prog.programacao_tratos_percentuais) {
    return null
  }

  const horarios = prog.programacao_tratos_percentuais
    .filter((p: any) => p.horario_sugerido)
    .sort((a: any, b: any) => a.ordem_trato - b.ordem_trato)
    .map((p: any) => p.horario_sugerido.slice(0, 5)) // HH:mm

  return horarios.length > 0 ? horarios : null
}

/**
 * Busca todas as push subscriptions de uma fazenda.
 */
async function getPushSubscriptions(supabase: any, fazendaId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, keys_p256dh, keys_auth')
    .eq('fazenda_id', fazendaId)

  if (error) {
    console.error(`[push] Erro ao buscar subscriptions de ${fazendaId}:`, error)
    return []
  }

  return data || []
}

/**
 * Remove subscriptions expiradas do banco.
 */
async function removeExpiredSubscription(supabase: any, endpoint: string): Promise<void> {
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
}

// ==================== HANDLER ====================

// @ts-ignore - Deno is available in Deno runtime but not in local TypeScript
Deno.serve(async (_req: Request) => {
  // CORS para chamadas manuais via HTTP (opcional, o scheduler não precisa)
  if (_req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  // Verificar se são 17h em Cuiabá
  if (!is17hCuiaba()) {
    return new Response(JSON.stringify({ message: 'Não é 17h em Cuiabá, pulando.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Carregar variáveis de ambiente e configurar web-push
  try {
    configureWebPush()
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // @ts-ignore
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  // @ts-ignore
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Criar cliente Supabase com service role
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // 1. Buscar fazendas com tratos_ativo = true
  const fazendaIds = await getFazendasComTratosAtivos(supabase)

  if (fazendaIds.length === 0) {
    return new Response(JSON.stringify({ message: 'Nenhuma fazenda com tratos_ativo = true' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let totalEnviadas = 0
  let totalFalhas = 0
  let fazendasComTratos = 0

  // 2. Para cada fazenda, buscar horários e enviar pushes
  for (const fazendaId of fazendaIds) {
    const horarios = await getHorariosTratosFazenda(supabase, fazendaId)

    if (!horarios || horarios.length === 0) {
      continue // Fazenda não tem programação ativa com horários
    }

    fazendasComTratos++

    const subscriptions = await getPushSubscriptions(supabase, fazendaId)

    if (subscriptions.length === 0) {
      continue // Fazenda não tem dispositivos registrados
    }

    const quantidade = horarios.length
    const horariosStr = horarios.join(', ')
    const payload = JSON.stringify({
      title: 'Lembrete de tratos de amanhã',
      body: `${quantidade} tratos programados: ${horariosStr}`,
      url: '/trato-confinamento',
    })

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth,
        },
      }

      try {
        await webPush.sendNotification(pushSubscription, payload, {
          TTL: 86400, // 24 horas
        })
        totalEnviadas++
      } catch (err: any) {
        totalFalhas++
        // 410 Gone ou 404 Not Found: subscription expirou
        if (err.statusCode === 410 || err.statusCode === 404) {
          await removeExpiredSubscription(supabase, sub.endpoint)
        } else {
          console.error(`[push] Erro ${err.statusCode} enviando para ${sub.endpoint}:`, err.message)
        }
      }
    }
  }

  return new Response(JSON.stringify({
    success: true,
    fazendas_com_tratos: fazendasComTratos,
    pushes_enviados: totalEnviadas,
    pushes_falharam: totalFalhas,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})

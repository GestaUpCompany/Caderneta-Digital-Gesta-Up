import { supabase } from './supabaseClient'
import { getDeviceId } from '../utils/deviceId'

// VAPID public key - configurada via env var após gerar as chaves
// Ver docs: https://developer.mozilla.org/en-US/docs/Web/API/PushManager/subscribe
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

/**
 * Verifica se o navegador suporta push notifications e service worker.
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Verifica se o usuário já concedeu permissão de notificação.
 */
export function isPushPermissionGranted(): boolean {
  return Notification.permission === 'granted'
}

/**
 * Pede permissão de notificação ao usuário.
 * Retorna true se concedida, false caso contrário.
 */
export async function requestPushPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false

  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

/**
 * Converte uma VAPID public key base64url em Uint8Array,
 * formato exigido por pushManager.subscribe().
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * Registra a subscription de push do dispositivo no Supabase.
 *
 * Fluxo:
 * 1. Verifica suporte e permissão
 * 2. Obtém o Service Worker registration
 * 3. Cria a subscription via pushManager.subscribe() com a VAPID key
 * 4. Envia a subscription para a RPC registrar_push_subscription no Supabase
 *
 * Retorna true se o registro foi bem-sucedido, false caso contrário.
 * Não lança erro: falhas são logadas e retornam false.
 */
export async function registerPushSubscription(
  fazendaId: string,
  funcionarioId?: string
): Promise<boolean> {
  if (!isPushSupported()) {
    console.log('[push] Push não suportado neste dispositivo')
    return false
  }

  if (!VAPID_PUBLIC_KEY) {
    console.warn('[push] VITE_VAPID_PUBLIC_KEY não configurada. Push notifications desativadas.')
    return false
  }

  if (!isPushPermissionGranted()) {
    const granted = await requestPushPermission()
    if (!granted) {
      console.log('[push] Permissão de notificação negada')
      return false
    }
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const existingSubscription = await registration.pushManager.getSubscription()

    let subscription: PushSubscription

    if (existingSubscription) {
      subscription = existingSubscription
    } else {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    // Enviar para o Supabase via RPC
    const sub = subscription.toJSON()
    const endpoint = sub.endpoint
    const keys = sub.keys as { p256dh: string; auth: string }

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      console.error('[push] Subscription incompleta:', sub)
      return false
    }

    const deviceId = getDeviceId()

    const { error } = await supabase.rpc('registrar_push_subscription', {
      p_fazenda_id: fazendaId,
      p_dispositivo_id: deviceId,
      p_endpoint: endpoint,
      p_keys_p256dh: keys.p256dh,
      p_keys_auth: keys.auth,
      p_funcionario_id: funcionarioId || null,
    })

    if (error) {
      console.error('[push] Erro ao registrar no Supabase:', error)
      return false
    }

    console.log('[push] Subscription registrada com sucesso')
    return true
  } catch (err) {
    console.error('[push] Erro ao registrar subscription:', err)
    return false
  }
}

/**
 * Remove a subscription de push do dispositivo (unsubscribe local + deleta do Supabase).
 * Útil quando o usuário desativa notificações ou troca de fazenda.
 */
export async function unregisterPushSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
    }

    // A limpeza no Supabase é feita via DELETE por dispositivo_id,
    // mas como o PWA usa anon key (sem RLS de DELETE), a remoção
    // do registro no banco fica a cargo da Edge Function ou do Painel Web.
    // O unsubscribe local já impede que o navegador receba novos pushes.

    console.log('[push] Subscription removida localmente')
    return true
  } catch (err) {
    console.error('[push] Erro ao remover subscription:', err)
    return false
  }
}

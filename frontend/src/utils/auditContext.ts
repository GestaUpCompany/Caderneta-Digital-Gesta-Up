import { getDeviceId } from './deviceId'
import { APP_VERSION } from './version'

/**
 * Detecta a plataforma a partir do userAgent.
 * Retorna 'ios', 'android' ou 'web'.
 */
export function detectPlatform(): string {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent || ''
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'web'
}

/**
 * Captura o status de rede no momento da chamada.
 * Combina navigator.onLine com effectiveType quando disponível.
 * Ex.: 'online-4g', 'offline', 'online-slow-2g'.
 */
export function detectNetworkStatus(): string {
  if (typeof navigator === 'undefined') return 'unknown'
  if (!navigator.onLine) return 'offline'
  const conn = (navigator as any).connection
  if (conn?.effectiveType) {
    return `online-${conn.effectiveType}`
  }
  return 'online'
}

export interface AuditContext {
  dispositivo_uuid: string
  app_version: string
  platform: string
  network_status: string
}

/**
 * Coleta o contexto de auditoria para anexar a logs de erro de sync.
 * Dispositivo_uuid é o UUID persistido em localStorage pelo getDeviceId().
 */
export function getAuditContext(): AuditContext {
  return {
    dispositivo_uuid: getDeviceId(),
    app_version: APP_VERSION,
    platform: detectPlatform(),
    network_status: detectNetworkStatus(),
  }
}

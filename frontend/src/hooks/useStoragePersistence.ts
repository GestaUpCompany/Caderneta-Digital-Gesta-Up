import { useEffect, useState, useCallback } from 'react'

interface StoragePersistenceState {
  isPersistent: boolean
  isSupported: boolean
  usage: number | null
  quota: number | null
  requestPersistence: () => Promise<boolean>
}

/**
 * Hook que gerencia a persistência de armazenamento do navegador.
 *
 * Sem navigator.storage.persist(), o navegador pode evictar IndexedDB,
 * Cache API e localStorage sob pressão de espaço. Com persist() concedido,
 * o navegador só limpa se o usuário explicitamente apagar dados do site.
 *
 * Suporte por navegador:
 * - Chrome/Edge desktop: concedido automaticamente para PWA instalado
 * - Chrome Android: concedido para PWA instalado
 * - Safari 17+ (iOS 17+): suportado desde agosto/2023, concedido por heurística
 *   (incluindo se o app é um Home Screen Web App)
 * - Safari < 17: não suportado, mas PWA instalado na Home Screen é isento
 *   da regra de eviction de 7 dias do ITP (tem contador próprio)
 */
export function useStoragePersistence(): StoragePersistenceState {
  const [isPersistent, setIsPersistent] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [usage, setUsage] = useState<number | null>(null)
  const [quota, setQuota] = useState<number | null>(null)

  // Verificar suporte e estado inicial ao montar
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.storage) return

    setIsSupported(true)

    if (navigator.storage.persisted) {
      navigator.storage
        .persisted()
        .then((persisted) => {
          setIsPersistent(persisted)
          if (!persisted && navigator.storage.persist) {
            // Solicitar persistência automaticamente
            navigator.storage.persist().then(setIsPersistent)
          }
        })
        .catch(() => {
          // Alguns navegadores rejeitam persisted() se o usuário não interagiu
        })
    }

    if (navigator.storage.estimate) {
      navigator.storage
        .estimate()
        .then((estimate) => {
          setUsage(estimate.usage ?? null)
          setQuota(estimate.quota ?? null)
        })
        .catch(() => {})
    }
  }, [])

  const requestPersistence = useCallback(async (): Promise<boolean> => {
    if (!navigator.storage?.persist) return false

    try {
      const granted = await navigator.storage.persist()
      setIsPersistent(granted)

      if (navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate()
        setUsage(estimate.usage ?? null)
        setQuota(estimate.quota ?? null)
      }

      return granted
    } catch {
      return false
    }
  }, [])

  return {
    isPersistent,
    isSupported,
    usage,
    quota,
    requestPersistence,
  }
}

/**
 * Detecta se o dispositivo é iOS (iPhone, iPad ou iPod).
 *
 * Usa userAgent + detecção de standalone (PWA instalado) para cobrir
 * os casos onde o iPad relata como Macintosh.
 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false

  const ua = navigator.userAgent.toLowerCase()
  const isIOSDevice = /iphone|ipad|ipod/.test(ua)

  // iPadOS 13+ pode reportar como Macintosh, mas não tem "Mac" no PWA standalone
  const isIPadOnIOS13Plus =
    /macintosh/.test(ua) && 'ontouchend' in document

  return isIOSDevice || isIPadOnIOS13Plus
}

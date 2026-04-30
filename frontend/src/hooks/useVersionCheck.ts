import { useState, useEffect, useCallback } from 'react'
import { APP_VERSION, VERSION_CHECK_URL, VERSION_CHECK_INTERVAL, VersionInfo, VersionResponse } from '../utils/version'
import { BACKEND_URL } from '../utils/constants'

export function useVersionCheck() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<VersionInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const checkForUpdates = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`${BACKEND_URL}${VERSION_CHECK_URL}`)
      const data: VersionResponse = await response.json()
      
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Erro ao verificar versão')
      }
      
      const latestVersion = data.data
      setLastCheck(new Date())
      
      // Comparar versões (simple string comparison para Semantic Versioning)
      if (isNewerVersion(latestVersion.version, APP_VERSION)) {
        setUpdateAvailable(true)
        setUpdateInfo(latestVersion)
      } else {
        setUpdateAvailable(false)
        setUpdateInfo(null)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(errorMessage)
      console.error('Erro ao verificar atualizações:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Verificar se uma versão é mais nova que outra
  const isNewerVersion = (latest: string, current: string): boolean => {
    const latestParts = latest.split('.').map(Number)
    const currentParts = current.split('.').map(Number)
    
    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const latestPart = latestParts[i] || 0
      const currentPart = currentParts[i] || 0
      
      if (latestPart > currentPart) return true
      if (latestPart < currentPart) return false
    }
    
    return false
  }

  // Forçar verificação manual
  const forceCheck = useCallback(() => {
    checkForUpdates()
  }, [checkForUpdates])

  // Dismiss notificação
  const dismissUpdate = useCallback(() => {
    if (!updateInfo?.mandatory) {
      setUpdateAvailable(false)
      setUpdateInfo(null)
    }
  }, [updateInfo])

  // Verificar ao montar o componente (com delay para evitar rate limiting)
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForUpdates()
      
      // Configurar verificação periódica
      const interval = setInterval(checkForUpdates, VERSION_CHECK_INTERVAL)
      
      return () => clearInterval(interval)
    }, 3000) // 3 segundos de delay para evitar rate limiting ao abrir o app
    
    return () => clearTimeout(timer)
  }, [checkForUpdates])

  // Verificar quando o app ganha foco (foreground)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForUpdates()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [checkForUpdates])

  return {
    updateAvailable,
    updateInfo,
    isLoading,
    error,
    lastCheck,
    forceCheck,
    dismissUpdate,
    currentVersion: APP_VERSION
  }
}

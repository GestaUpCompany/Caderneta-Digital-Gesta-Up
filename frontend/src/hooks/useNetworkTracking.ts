import { useEffect, useState } from 'react'

export function useNetworkTracking() {
  const [offlineTime, setOfflineTime] = useState(0)
  const [onlineTime, setOnlineTime] = useState(0)
  const lastStateRef = useState<'online' | 'offline'>('online')

  useEffect(() => {
    const handleOnline = () => {
      lastStateRef[1]('online')
    }

    const handleOffline = () => {
      lastStateRef[1]('offline')
    }

    // Contar tempo online/offline a cada minuto
    const interval = setInterval(() => {
      const isOnline = navigator.onLine
      if (isOnline) {
        setOnlineTime(prev => prev + 1)
      } else {
        setOfflineTime(prev => prev + 1)
      }
    }, 60000) // 1 minuto

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { offlineTime, onlineTime }
}

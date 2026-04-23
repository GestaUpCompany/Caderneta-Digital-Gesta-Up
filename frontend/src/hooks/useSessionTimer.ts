import { useEffect, useRef, useState } from 'react'

export function useSessionTimer() {
  const [sessionTime, setSessionTime] = useState(0)
  const startTimeRef = useRef<number>(Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000 / 60) // em minutos
      setSessionTime(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return sessionTime
}

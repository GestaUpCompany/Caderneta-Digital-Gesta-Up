import { useEffect, useState, useCallback } from 'react'
import { checkFarmActiveStatus, FarmStatusResult } from '../services/farmStatusService'

interface UseFarmStatusOptions {
  acessoId?: string
  configurado: boolean
}

export function useFarmStatus({ acessoId, configurado }: UseFarmStatusOptions) {
  const [status, setStatus] = useState<FarmStatusResult>({ active: true, exists: true })
  const [loading, setLoading] = useState(false)

  const verify = useCallback(async () => {
    if (!configurado || !acessoId) {
      setStatus({ active: true, exists: true })
      return
    }

    setLoading(true)
    try {
      const result = await checkFarmActiveStatus(acessoId)
      setStatus(result)
    } finally {
      setLoading(false)
    }
  }, [acessoId, configurado])

  useEffect(() => {
    verify()
  }, [verify])

  return {
    active: status.active,
    exists: status.exists,
    offline: status.offline,
    error: status.error,
    loading,
    nome: status.nome,
    verify,
  }
}

import { useEffect, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../store/store'
import {
  setStatus,
  setPendingCount,
  setLastSync,
  setSyncProgress,
  setError,
} from '../store/slices/syncSlice'
import { processQueue } from '../services/syncService'
import { getSyncQueue } from '../services/indexedDB'
import { SYNC_INTERVAL_MS } from '../utils/constants'

export function useSync() {
  const dispatch = useDispatch()
  const { planilhaUrl, fazendaId, configurado } = useSelector((state: RootState) => state.config)
  const isRunning = useRef(false)

  const updatePendingCount = useCallback(async () => {
    const queue = await getSyncQueue()
    dispatch(setPendingCount(queue.length))
  }, [dispatch])

  const runSync = useCallback(async () => {
    if (!configurado || (!planilhaUrl && !fazendaId) || isRunning.current) {
      return
    }

    isRunning.current = true
    dispatch(setStatus('syncing'))
    dispatch(setSyncProgress(0))
    dispatch(setError(null))

    try {
      const queue = await getSyncQueue()
      const total = queue.length

      if (total === 0) {
        dispatch(setStatus('online'))
        dispatch(setLastSync(new Date().toISOString()))
        isRunning.current = false
        return
      }

      const { synced, failed } = await processQueue(planilhaUrl, fazendaId)

      if (failed > 0) {
        dispatch(setError(`${failed} registro(s) não sincronizados. Tentando novamente...`))
      }

      if (synced > 0) {
        dispatch(setLastSync(new Date().toISOString()))
      }

      await updatePendingCount()
      dispatch(setSyncProgress(100))
      dispatch(setStatus(failed > 0 ? 'error' : 'online'))
    } catch {
      dispatch(setStatus('error'))
      dispatch(setError('Erro ao sincronizar. Verifique a conexão.'))
    } finally {
      isRunning.current = false
    }
  }, [configurado, planilhaUrl, fazendaId, dispatch, updatePendingCount])

  useEffect(() => {
    const handleOnline = () => {
      dispatch(setStatus('online'))
      runSync()
    }
    const handleOffline = () => {
      dispatch(setStatus('offline'))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if (navigator.onLine) {
      dispatch(setStatus('online'))
      runSync()
    } else {
      dispatch(setStatus('offline'))
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [dispatch, runSync])

  useEffect(() => {
    if (!configurado || (!planilhaUrl && !fazendaId)) return
    const interval = setInterval(() => {
      if (navigator.onLine) runSync()
    }, SYNC_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [configurado, planilhaUrl, fazendaId, runSync])

  useEffect(() => {
    updatePendingCount()
  }, [updatePendingCount])

  return { runSync, updatePendingCount }
}

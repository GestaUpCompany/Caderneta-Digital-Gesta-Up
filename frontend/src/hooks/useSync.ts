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
import { processQueue, pollSolicitacoesNovoLote } from '../services/syncService'
import { getSyncQueue } from '../services/indexedDB'
import { reauthenticateFarm, isTokenValid } from '../services/authService'
import { SYNC_CHECK_INTERVAL_MS } from '../utils/constants'

export function useSync() {
  const dispatch = useDispatch()
  const { fazendaId, acessoId, configurado, testModeAtivo } = useSelector((state: RootState) => state.config)
  const syncRequestId = useSelector((state: RootState) => state.sync.syncRequestId)
  const isRunning = useRef(false)

  const updatePendingCount = useCallback(async () => {
    const queue = await getSyncQueue()
    dispatch(setPendingCount(queue.length))
  }, [dispatch])

  const runSync = useCallback(async () => {
    if (!configurado || !fazendaId || isRunning.current) {
      return
    }

    // Modo teste: pausa totalmente o sync. Nada sobe ao Supabase.
    if (testModeAtivo) {
      return
    }

    isRunning.current = true
    dispatch(setStatus('syncing'))
    dispatch(setSyncProgress(0))
    dispatch(setError(null))

    try {
      // Reautenticar peão se o token não estiver válido
      if (!isTokenValid() && acessoId) {
        console.log('[useSync] Token inválido, tentando reautenticar peão...')
        const authResult = await reauthenticateFarm(acessoId)
        if (!authResult.sucesso) {
          console.error('[useSync] Falha ao reautenticar peão')
        }
      }

      const queue = await getSyncQueue()
      const total = queue.length

      if (total === 0) {
        // Mesmo com fila vazia, fazer polling de solicitações de Novo Lote
        // para capturar aprovações/rejeições do Painel Web
        try {
          await pollSolicitacoesNovoLote(fazendaId)
        } catch (e) {
          console.warn('[useSync] Polling de solicitações Novo Lote falhou:', e)
        }
        dispatch(setStatus('online'))
        dispatch(setLastSync(new Date().toISOString()))
        isRunning.current = false
        return
      }

      const { synced, failed } = await processQueue(fazendaId, (remaining) => {
        dispatch(setPendingCount(remaining))
      })

      if (failed > 0) {
        dispatch(setError(`${failed} registro(s) não sincronizados. Tentando novamente...`))
      }

      if (synced > 0) {
        dispatch(setLastSync(new Date().toISOString()))
      }

      // Polling de solicitações de Novo Lote (aprovações/rejeições)
      try {
        await pollSolicitacoesNovoLote(fazendaId)
      } catch (e) {
        console.warn('[useSync] Polling de solicitações Novo Lote falhou:', e)
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
  }, [configurado, fazendaId, acessoId, dispatch, updatePendingCount, testModeAtivo])

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
    if (!configurado || !fazendaId) return
    const interval = setInterval(() => {
      if (navigator.onLine) runSync()
    }, SYNC_CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [configurado, fazendaId, runSync])

  // Dispara sync imediato quando um componente solicita via requestSyncNow
  // (ex.: botão REENVIAR em um card de registro com erro)
  useEffect(() => {
    if (syncRequestId > 0 && configurado && fazendaId) {
      runSync()
    }
  }, [syncRequestId, configurado, fazendaId, runSync])

  // Listener: SW disparou Background Sync (sync-registros) quando a conexão retornou.
  // O SW envia BG_SYNC_REGISTROS para clients ativos; se o app estiver em background,
  // isso acelera o sync em vez de esperar o próximo tick do polling de 10s.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'BG_SYNC_REGISTROS') {
        console.log('[useSync] BG_SYNC_REGISTROS recebido, disparando sync')
        runSync()
      }
    }
    navigator.serviceWorker.addEventListener('message', handleSWMessage)
    return () => navigator.serviceWorker.removeEventListener('message', handleSWMessage)
  }, [runSync])

  useEffect(() => {
    updatePendingCount()
  }, [updatePendingCount])

  return { runSync, updatePendingCount }
}

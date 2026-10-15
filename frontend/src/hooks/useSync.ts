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
import {
  processQueue,
  pollSolicitacoesNovoLote,
  reconcileOrphanPending,
  reenfileirarErrosRecuperaveis,
} from '../services/syncService'
import { sincronizarExecucoesPendentes } from '../services/execucaoRotinaService'
import { getSyncQueue } from '../services/indexedDB'
import { isTokenValid } from '../services/authService'
import { reautenticarEmSilencio, comSessaoObrigatoria } from '../services/supabaseClient'
import { SYNC_CHECK_INTERVAL_MS } from '../utils/constants'

const LOCK_MAX_MS = 3 * 60 * 1000

export function useSync() {
  const dispatch = useDispatch()
  const { fazendaId, configurado, testModeAtivo } = useSelector((state: RootState) => state.config)
  const syncRequestId = useSelector((state: RootState) => state.sync.syncRequestId)
  // Início do ciclo em andamento (0 = livre). Um ciclo que passa de LOCK_MAX_MS é dado como travado
  // (requisição pendurada, aba suspensa pelo sistema) e o próximo gatilho assume, em vez de parar o sync até reabrir o app.
  const cicloIniciadoEm = useRef(0)

  const updatePendingCount = useCallback(async () => {
    const queue = await getSyncQueue()
    dispatch(setPendingCount(queue.length))
  }, [dispatch])

  const runSync = useCallback(async () => {
    if (!configurado || !fazendaId) {
      return
    }
    if (cicloIniciadoEm.current > 0 && Date.now() - cicloIniciadoEm.current < LOCK_MAX_MS) {
      return
    }

    // Modo teste: pausa totalmente o sync. Nada sobe ao Supabase.
    if (testModeAtivo) {
      return
    }

    const inicioDoCiclo = Date.now()
    cicloIniciadoEm.current = inicioDoCiclo
    dispatch(setError(null))

    try {
      // Sessão do peão: renova/reautentica em silêncio antes de enviar (sem rede, o ciclo só espera)
      if (!isTokenValid()) {
        console.log('[useSync] Token inválido, reautenticando peão em silêncio...')
        await reautenticarEmSilencio()
      }

      // Reconciliação barata (só IndexedDB): órfãos sem item na fila e erros que eram só de rede/servidor
      try {
        await Promise.all([reconcileOrphanPending(), reenfileirarErrosRecuperaveis()])
      } catch (e) {
        console.warn('[useSync] Reconciliação da fila falhou:', e)
      }

      // Execuções de rotina ficam fora da syncQueue (cache de cadastro).
      // Reenvia as que ficaram pendentes no dispositivo (ex.: salvas offline).
      try {
        await comSessaoObrigatoria(() => sincronizarExecucoesPendentes(fazendaId))
      } catch (e) {
        console.warn('[useSync] Falha ao sincronizar execuções de rotina:', e)
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
        return
      }

      // So exibe banner "sincronizando" se houver registros para enviar
      dispatch(setStatus('syncing'))
      dispatch(setSyncProgress(0))

      const { synced, failed, networkFailure } = await processQueue(fazendaId, (remaining) => {
        dispatch(setPendingCount(remaining))
      })

      // Falhas de erro do servidor ficam em 'error' (com REENVIAR). Falha de rede mantém os
      // registros pendentes na fila: são reenviados sozinhos no próximo ciclo ou ao voltar a conexão.
      if (failed > 0) {
        dispatch(setError(`${failed} registro(s) com erro. Abra a lista da caderneta para reenviar.`))
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
      dispatch(setStatus(failed > 0 ? 'error' : networkFailure ? 'offline' : 'online'))
    } catch {
      dispatch(setStatus('error'))
      dispatch(setError('Erro ao sincronizar. Verifique a conexão.'))
    } finally {
      // Só libera se o lock ainda é deste ciclo (um ciclo travado pode ter sido substituído por outro)
      if (cicloIniciadoEm.current === inicioDoCiclo) cicloIniciadoEm.current = 0
    }
  }, [configurado, fazendaId, dispatch, updatePendingCount, testModeAtivo])

  useEffect(() => {
    const handleOnline = () => {
      dispatch(setStatus('online'))
      runSync()
    }
    const handleOffline = () => {
      dispatch(setStatus('offline'))
    }

    // Voltar ao app (iOS/Android em segundo plano congelam os timers): sincroniza na hora, sem esperar o intervalo
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) runSync()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    document.addEventListener('visibilitychange', handleVisibility)

    if (navigator.onLine) {
      dispatch(setStatus('online'))
      runSync()
    } else {
      dispatch(setStatus('offline'))
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      document.removeEventListener('visibilitychange', handleVisibility)
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

  // Reenfileira registros 'pending' órfãos (sem item na syncQueue). Sem isso,
  // um pending sem fila nunca sai do estado e bloqueia o "Atualizar Dados"
  // para sempre via countPending.
  useEffect(() => {
    if (!configurado || !fazendaId || testModeAtivo) return
    Promise.all([reconcileOrphanPending(), reenfileirarErrosRecuperaveis()]).then(([orfaos, recuperaveis]) => {
      if (orfaos + recuperaveis > 0) runSync()
    })
  }, [configurado, fazendaId, testModeAtivo, runSync])

  useEffect(() => {
    updatePendingCount()
  }, [updatePendingCount])

  return { runSync, updatePendingCount }
}

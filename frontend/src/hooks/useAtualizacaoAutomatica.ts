import { useEffect } from 'react'
import { store } from '../store/store'
import { getCadastroCacheTimestamp, getCachedCadastroData } from '../services/cadastroCache'
import { executarAtualizacaoCompleta, atualizacaoCompletaEmAndamento } from '../services/refreshService'
import { setPendingCount } from '../store/slices/syncSlice'
import { getSyncQueue } from '../services/indexedDB'
import { deveAtualizarAgora, lerPrefsAtualizacaoAutomatica } from '../utils/atualizacaoAutomatica'
import { eventBus, CADASTRO_CACHE_UPDATED, REFRESH_CONCLUIDO } from '../utils/eventBus'
import { setStatusAtualizacaoAutomatica } from '../services/atualizacaoAutomaticaStatus'

// Se a atualização falhar (rede caiu, pendências), não insiste em loop: espera este tempo
const INTERVALO_MIN_ENTRE_TENTATIVAS_MS = 5 * 60 * 1000

let ultimaTentativa = 0

/**
 * Atualiza os dados sozinho, em segundo plano e sem bloquear a tela, quando o app abre (ou volta
 * do background / recupera a rede) depois do horário de corte e ainda não houve atualização hoje.
 * Tem o mesmo efeito do botão "Atualizar Dados"; o peão já pode trabalhar com o cache local.
 */
export function useAtualizacaoAutomatica(fazendaId: string | null | undefined, desativado: boolean) {
  useEffect(() => {
    if (!fazendaId || desativado) return

    const tentar = async () => {
      if (atualizacaoCompletaEmAndamento()) return
      if (Date.now() - ultimaTentativa < INTERVALO_MIN_ENTRE_TENTATIVAS_MS) return
      const { testModeAtivo } = store.getState().config
      const deve = deveAtualizarAgora({
        prefs: lerPrefsAtualizacaoAutomatica(),
        agora: new Date(),
        ultimaAtualizacao: getCadastroCacheTimestamp(),
        online: navigator.onLine,
        testModeAtivo,
        fazendaId,
      })
      if (!deve) return

      ultimaTentativa = Date.now()
      console.log('[AtualizacaoAutomatica] Iniciando atualização completa em segundo plano')
      setStatusAtualizacaoAutomatica({ ativa: true, fase: 'listas', current: 0, total: 0, item: 'Preparando...' })
      try {
        const result = await executarAtualizacaoCompleta(fazendaId, (current, total, item, fase) => {
          setStatusAtualizacaoAutomatica({ current, total, item, fase })
        })
        if (result.errors.length === 0) {
          const cache = await getCachedCadastroData().catch(() => null)
          if (cache) eventBus.emit(CADASTRO_CACHE_UPDATED, cache)
          eventBus.emit(REFRESH_CONCLUIDO)
        } else {
          console.warn('[AtualizacaoAutomatica] Concluída com pendências:', result.errors)
        }
        const fila = await getSyncQueue().catch(() => null)
        if (fila) store.dispatch(setPendingCount(fila.length))
      } catch (err) {
        console.warn('[AtualizacaoAutomatica] Falha:', err)
      } finally {
        setStatusAtualizacaoAutomatica({ ativa: false, fase: null, current: 0, total: 0, item: '' })
      }
    }

    const aoVisivel = () => { if (!document.hidden) void tentar() }
    const aoFicarOnline = () => { void tentar() }

    void tentar()
    document.addEventListener('visibilitychange', aoVisivel)
    window.addEventListener('online', aoFicarOnline)
    return () => {
      document.removeEventListener('visibilitychange', aoVisivel)
      window.removeEventListener('online', aoFicarOnline)
    }
  }, [fazendaId, desativado])
}

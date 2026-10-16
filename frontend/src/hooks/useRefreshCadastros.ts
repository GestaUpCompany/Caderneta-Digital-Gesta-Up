import { useEffect, useRef, useState } from 'react'
import { eventBus, CADASTRO_CACHE_UPDATED, REFRESH_CONCLUIDO } from '../utils/eventBus'

/**
 * Chama `recarregar` quando o "puxar para atualizar" termina ou o cache de cadastro muda.
 * Use no loader de OPÇÕES/LISTAS da página; não pode sobrescrever o que o peão já digitou.
 */
export function useRefreshCadastros(recarregar: () => void | Promise<void>) {
  const ref = useRef(recarregar)
  ref.current = recarregar

  useEffect(() => {
    const handler = () => {
      void ref.current()
    }
    const offRefresh = eventBus.on(REFRESH_CONCLUIDO, handler)
    const offCache = eventBus.on(CADASTRO_CACHE_UPDATED, handler)
    return () => {
      offRefresh()
      offCache()
    }
  }, [])
}

/**
 * Contador que sobe a cada "puxar para atualizar" concluído. Basta incluí-lo nas dependências
 * do efeito que carrega as OPÇÕES da tela (seletores, listas) para ele consultar tudo de novo
 * sem remontar a página, preservando o que o peão já digitou.
 */
export function useRefreshTick(): number {
  const [tick, setTick] = useState(0)
  useEffect(() => eventBus.on(REFRESH_CONCLUIDO, () => setTick((t) => t + 1)), [])
  return tick
}


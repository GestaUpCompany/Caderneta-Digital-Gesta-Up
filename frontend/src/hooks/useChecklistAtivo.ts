import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import {
  ChecklistRegra,
  getChecklistRegrasFromCacheOnly,
  getChecklistRegrasOnlineFirst,
  isRegraAtivaParaCaderneta,
  getHojeIso,
  getFarmTimezoneAsync,
} from '../services/checklistRegrasService'

const REVALIDACAO_TIMEOUT_MS = 3000

function comTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

export interface UseChecklistAtivoReturn {
  ativo: boolean
  loading: boolean
  regras: ChecklistRegra[]
  refresh: () => Promise<void>
}

export function useChecklistAtivo(cadernetaId: string): UseChecklistAtivoReturn {
  const { fazendaId } = useSelector((state: RootState) => state.config)
  const [regras, setRegras] = useState<ChecklistRegra[]>([])
  const [loading, setLoading] = useState(true)
  const [timezone, setTimezone] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!fazendaId) {
      setRegras([])
      setLoading(false)
      return
    }

    // Cache local primeiro: a tela libera na hora (sem esperar rede) e a revalidação roda em segundo plano.
    let temCache = false
    try {
      const cached = await getChecklistRegrasFromCacheOnly(fazendaId)
      if (cached) {
        setRegras(cached)
        setLoading(false)
        temCache = true
      }
    } catch (err) {
      console.warn('[useChecklistAtivo] Falha ao ler o cache de regras:', err)
    }
    if (!temCache) setLoading(true)

    try {
      const [regrasData, tz] = await Promise.all([
        comTimeout(getChecklistRegrasOnlineFirst(fazendaId), REVALIDACAO_TIMEOUT_MS).catch((err) => {
          console.warn('[useChecklistAtivo] Regras online indisponíveis:', err)
          return null
        }),
        comTimeout(getFarmTimezoneAsync(), REVALIDACAO_TIMEOUT_MS).catch(() => null),
      ])
      // Se a revalidação falhou e já há regras do cache, mantém; sem cache, segue sem regras (checklist visível)
      if (regrasData) setRegras(regrasData)
      else if (!temCache) setRegras([])
      if (tz) setTimezone(tz)
    } catch (err) {
      console.error('[useChecklistAtivo] Erro ao carregar dados:', err)
      if (!temCache) setRegras([])
    } finally {
      setLoading(false)
    }
  }, [fazendaId])

  useEffect(() => {
    load()
  }, [load])

  const hoje = getHojeIso(timezone || undefined)
  const temRegras = regras.length > 0
  const cobertoPorRegra = isRegraAtivaParaCaderneta(regras, cadernetaId, hoje)

  // A aparição do checklist depende apenas da regra de período (checklist_regras),
  // independente de o usuário ter rotina para a caderneta em questão.
  // - Sem regras cadastradas: checklist sempre visível (comportamento antigo).
  // - Com regras: checklist ativo apenas quando a caderneta está coberta por uma
  //   regra ativa para a data de hoje.
  const ativo = !temRegras || cobertoPorRegra

  return {
    ativo,
    loading,
    regras,
    refresh: load,
  }
}

import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import {
  ChecklistRegra,
  getChecklistRegrasOnlineFirst,
  isRegraAtivaParaCaderneta,
  getHojeIso,
} from '../services/checklistRegrasService'

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

  const load = useCallback(async () => {
    if (!fazendaId) {
      setRegras([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const regrasData = await getChecklistRegrasOnlineFirst(fazendaId).catch((err) => {
        console.error('[useChecklistAtivo] Erro ao carregar regras:', err)
        return []
      })
      setRegras(regrasData || [])
    } catch (err) {
      console.error('[useChecklistAtivo] Erro ao carregar dados:', err)
      setRegras([])
    } finally {
      setLoading(false)
    }
  }, [fazendaId])

  useEffect(() => {
    load()
  }, [load])

  const hoje = getHojeIso()
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

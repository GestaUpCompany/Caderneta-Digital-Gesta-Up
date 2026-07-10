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
      const data = await getChecklistRegrasOnlineFirst(fazendaId)
      setRegras(data || [])
    } catch (err) {
      console.error('[useChecklistAtivo] Erro ao carregar regras:', err)
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
  // Se a fazenda ainda não tem regras cadastradas, mantém o comportamento antigo
  // (checklist sempre visível). Quando existem regras, apenas cadernetas cobertas
  // por regras ativas exibem o checklist.
  const ativo = !temRegras || cobertoPorRegra

  return {
    ativo,
    loading,
    regras,
    refresh: load,
  }
}

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import {
  ChecklistRegra,
  getChecklistRegrasOnlineFirst,
  isRegraAtivaParaCaderneta,
  getHojeIso,
} from '../services/checklistRegrasService'
import { Rotina, getRotinasOnlineFirst } from '../services/rotinasService'
import { getProgramacaoPorFuncionario } from '../utils/rotinas'

export interface UseChecklistAtivoReturn {
  ativo: boolean
  loading: boolean
  regras: ChecklistRegra[]
  rotinas: Rotina[]
  refresh: () => Promise<void>
}

export function useChecklistAtivo(cadernetaId: string): UseChecklistAtivoReturn {
  const { fazendaId, funcionarioId } = useSelector((state: RootState) => state.config)
  const [regras, setRegras] = useState<ChecklistRegra[]>([])
  const [rotinas, setRotinas] = useState<Rotina[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!fazendaId) {
      setRegras([])
      setRotinas([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const [regrasData, rotinasData] = await Promise.all([
        getChecklistRegrasOnlineFirst(fazendaId).catch((err) => {
          console.error('[useChecklistAtivo] Erro ao carregar regras:', err)
          return []
        }),
        getRotinasOnlineFirst(fazendaId).catch((err) => {
          console.warn('[useChecklistAtivo] Erro ao carregar rotinas:', err)
          return []
        }),
      ])
      setRegras(regrasData || [])
      setRotinas(rotinasData || [])
    } catch (err) {
      console.error('[useChecklistAtivo] Erro ao carregar dados:', err)
      setRegras([])
      setRotinas([])
    } finally {
      setLoading(false)
    }
  }, [fazendaId])

  useEffect(() => {
    load()
  }, [load])

  const hoje = getHojeIso()
  const temRegras = regras.length > 0
  const temRotinas = rotinas.length > 0
  const cobertoPorRegra = isRegraAtivaParaCaderneta(regras, cadernetaId, hoje)

  const programacao = useMemo(() => {
    if (!funcionarioId) return []
    return getProgramacaoPorFuncionario(rotinas, funcionarioId, hoje)
  }, [rotinas, funcionarioId, hoje])

  const cadernetaNaProgramacao = programacao.includes(cadernetaId)

  // Regra de negócio corrigida:
  // - Se a fazenda ainda não usa rotinas, mantém comportamento antigo (regras ou sempre visível).
  // - Se há rotinas cadastradas, o checklist só fica ativo quando a caderneta está
  //   na programação do funcionário para hoje E a regra de checklist permite.
  let ativo: boolean
  if (!temRotinas) {
    ativo = !temRegras || cobertoPorRegra
  } else {
    ativo = cadernetaNaProgramacao && cobertoPorRegra
  }

  return {
    ativo,
    loading,
    regras,
    rotinas,
    refresh: load,
  }
}

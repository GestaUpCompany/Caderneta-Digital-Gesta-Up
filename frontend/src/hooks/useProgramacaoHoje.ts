import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { getRotinasOnlineFirst, Rotina } from '../services/rotinasService'
import { getProgramacaoPorFuncionario } from '../utils/rotinas'
import { getHojeIso } from '../services/checklistRegrasService'

export interface UseProgramacaoHojeReturn {
  programacao: string[]
  rotinas: Rotina[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  temRotinasCadastradas: boolean
}

export function useProgramacaoHoje(): UseProgramacaoHojeReturn {
  const { fazendaId, funcionarioId } = useSelector((state: RootState) => state.config)
  const [rotinas, setRotinas] = useState<Rotina[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!fazendaId || !funcionarioId) {
      setRotinas([])
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await getRotinasOnlineFirst(fazendaId)
      setRotinas(data || [])
    } catch (err) {
      console.error('[useProgramacaoHoje] Erro ao carregar rotinas:', err)
      setError('Falha ao carregar rotinas')
      setRotinas([])
    } finally {
      setLoading(false)
    }
  }, [fazendaId, funcionarioId])

  useEffect(() => {
    load()
  }, [load])

  const hoje = getHojeIso()
  const programacao = useMemo(
    () => (funcionarioId ? getProgramacaoPorFuncionario(rotinas, funcionarioId, hoje) : []),
    [rotinas, funcionarioId, hoje]
  )

  const temRotinasCadastradas = rotinas.length > 0

  return {
    programacao,
    rotinas,
    loading,
    error,
    refresh: load,
    temRotinasCadastradas,
  }
}

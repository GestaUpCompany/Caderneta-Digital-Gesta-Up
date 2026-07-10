import { useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { useExecucaoRotina } from './useExecucaoRotina'
import { getFazendaByAcessoId } from '../services/supabaseService'
import { isAtrasoSignificativo, getHorarioAtualHHMMSS, formatarHorario } from '../utils/execucaoRotina'

export interface UseRegistroComExecucaoReturn {
  showObservacaoModal: boolean
  horariosModal: { programado: string; registro: string }
  iniciarSalvamento: () => Promise<boolean>
  confirmarObservacao: (observacao?: string) => Promise<void>
  cancelarObservacao: () => void
}

export function useRegistroComExecucao(cadernetaId: string): UseRegistroComExecucaoReturn {
  const { acessoId } = useSelector((state: RootState) => state.config)
  const {
    isProgramacaoHoje,
    getHorarioProgramado,
    registrarExecucao,
  } = useExecucaoRotina()

  const [showObservacaoModal, setShowObservacaoModal] = useState(false)
  const [horariosModal, setHorariosModal] = useState({ programado: '', registro: '' })

  const iniciarSalvamento = useCallback(async (): Promise<boolean> => {
    if (!isProgramacaoHoje(cadernetaId)) {
      return true
    }

    const horarioProgramado = getHorarioProgramado(cadernetaId)
    const horarioRegistro = getHorarioAtualHHMMSS()

    if (
      horarioProgramado &&
      isAtrasoSignificativo(horarioProgramado, horarioRegistro, await getTolerancia(acessoId))
    ) {
      setHorariosModal({
        programado: formatarHorario(horarioProgramado) || horarioProgramado,
        registro: formatarHorario(horarioRegistro) || horarioRegistro,
      })
      setShowObservacaoModal(true)
      return false
    }

    await registrarExecucao(cadernetaId)
    return true
  }, [cadernetaId, isProgramacaoHoje, getHorarioProgramado, registrarExecucao, acessoId])

  const confirmarObservacao = useCallback(
    async (observacao?: string) => {
      await registrarExecucao(cadernetaId, observacao)
      setShowObservacaoModal(false)
    },
    [cadernetaId, registrarExecucao]
  )

  const cancelarObservacao = useCallback(() => {
    setShowObservacaoModal(false)
  }, [])

  return {
    showObservacaoModal,
    horariosModal,
    iniciarSalvamento,
    confirmarObservacao,
    cancelarObservacao,
  }
}

async function getTolerancia(acessoId: string | undefined): Promise<number> {
  if (!acessoId) return 30
  try {
    const fazenda = await getFazendaByAcessoId(acessoId)
    return fazenda?.tolerancia_rotina_minutos ?? 30
  } catch (err) {
    console.error('[useRegistroComExecucao] Erro ao buscar tolerância:', err)
    return 30
  }
}

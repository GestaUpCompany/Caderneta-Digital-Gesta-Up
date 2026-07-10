import { useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { useExecucaoRotina } from './useExecucaoRotina'
import { getFazendaByAcessoId } from '../services/supabaseService'
import {
  isAtrasoSignificativo,
  getHorarioAtualHHMMSS,
  formatarHorario,
} from '../utils/execucaoRotina'
import { DEFAULT_FARM_TIMEZONE } from '../utils/formatDate'

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

    const config = await getFazendaConfig(acessoId)
    const timezone = config.timezone
    const toleranciaMinutos = config.tolerancia

    const horarioProgramado = getHorarioProgramado(cadernetaId)
    const horarioRegistro = getHorarioAtualHHMMSS(timezone)

    if (
      horarioProgramado &&
      isAtrasoSignificativo(horarioProgramado, horarioRegistro, toleranciaMinutos)
    ) {
      setHorariosModal({
        programado: formatarHorario(horarioProgramado) || horarioProgramado,
        registro: formatarHorario(horarioRegistro) || horarioRegistro,
      })
      setShowObservacaoModal(true)
      return false
    }

    await registrarExecucao(cadernetaId, undefined, timezone)
    return true
  }, [cadernetaId, isProgramacaoHoje, getHorarioProgramado, registrarExecucao, acessoId])

  const confirmarObservacao = useCallback(
    async (observacao?: string) => {
      const config = await getFazendaConfig(acessoId)
      await registrarExecucao(cadernetaId, observacao, config.timezone)
      setShowObservacaoModal(false)
    },
    [cadernetaId, registrarExecucao, acessoId]
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

interface FazendaConfig {
  tolerancia: number
  timezone: string
}

async function getFazendaConfig(acessoId: string | undefined): Promise<FazendaConfig> {
  if (!acessoId) {
    return { tolerancia: 30, timezone: DEFAULT_FARM_TIMEZONE }
  }
  try {
    const fazenda = await getFazendaByAcessoId(acessoId)
    return {
      tolerancia: fazenda?.tolerancia_rotina_minutos ?? 30,
      timezone: fazenda?.timezone ?? DEFAULT_FARM_TIMEZONE,
    }
  } catch (err) {
    console.error('[useRegistroComExecucao] Erro ao buscar config da fazenda:', err)
    return { tolerancia: 30, timezone: DEFAULT_FARM_TIMEZONE }
  }
}

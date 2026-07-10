import { useCallback } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import {
  garantirExecucaoRotina,
  registrarExecucaoRotina,
  ExecucaoRotina,
} from '../services/execucaoRotinaService'
import { useProgramacaoHoje } from './useProgramacaoHoje'

export interface UseExecucaoRotinaReturn {
  garantirExecucao: (cadernetaId: string) => Promise<ExecucaoRotina | null>
  registrarExecucao: (
    cadernetaId: string,
    observacao?: string | null
  ) => Promise<ExecucaoRotina | null>
  isProgramacaoHoje: (cadernetaId: string) => boolean
  getHorarioProgramado: (cadernetaId: string) => string | undefined
}

export function useExecucaoRotina(): UseExecucaoRotinaReturn {
  const { fazendaId, funcionarioId } = useSelector((state: RootState) => state.config)
  const { programacao, horarios } = useProgramacaoHoje()

  const programacaoSet = new Set(programacao)

  const isProgramacaoHoje = useCallback(
    (cadernetaId: string) => programacaoSet.has(cadernetaId),
    [programacaoSet]
  )

  const getHorarioProgramado = useCallback(
    (cadernetaId: string) => horarios[cadernetaId],
    [horarios]
  )

  const garantirExecucao = useCallback(
    async (cadernetaId: string): Promise<ExecucaoRotina | null> => {
      if (!fazendaId || !funcionarioId || !isProgramacaoHoje(cadernetaId)) return null
      return garantirExecucaoRotina({
        fazendaId,
        funcionarioId,
        cadernetaId,
        horarioProgramado: getHorarioProgramado(cadernetaId) || null,
      })
    },
    [fazendaId, funcionarioId, isProgramacaoHoje, getHorarioProgramado]
  )

  const registrarExecucao = useCallback(
    async (
      cadernetaId: string,
      observacao?: string | null
    ): Promise<ExecucaoRotina | null> => {
      if (!fazendaId || !funcionarioId) return null
      return registrarExecucaoRotina({
        fazendaId,
        funcionarioId,
        cadernetaId,
        observacao: observacao || null,
      })
    },
    [fazendaId, funcionarioId]
  )

  return {
    garantirExecucao,
    registrarExecucao,
    isProgramacaoHoje,
    getHorarioProgramado,
  }
}

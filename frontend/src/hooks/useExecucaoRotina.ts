import { useCallback } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import {
  garantirExecucaoRotina,
  registrarExecucaoRotina,
  ExecucaoRotina,
} from '../services/execucaoRotinaService'
import { getFazendaByAcessoId } from '../services/supabaseService'
import { useProgramacaoHoje } from './useProgramacaoHoje'
import { DEFAULT_FARM_TIMEZONE } from '../utils/formatDate'

export interface UseExecucaoRotinaReturn {
  garantirExecucao: (cadernetaId: string) => Promise<ExecucaoRotina | null>
  registrarExecucao: (
    cadernetaId: string,
    observacao?: string | null,
    timezone?: string
  ) => Promise<ExecucaoRotina | null>
  isProgramacaoHoje: (cadernetaId: string) => boolean
  getHorarioProgramado: (cadernetaId: string) => string | undefined
}

export function useExecucaoRotina(): UseExecucaoRotinaReturn {
  const { fazendaId, funcionarioId, acessoId } = useSelector((state: RootState) => state.config)
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
      const timezone = await getFazendaTimezone(acessoId)
      return garantirExecucaoRotina({
        fazendaId,
        funcionarioId,
        cadernetaId,
        horarioProgramado: getHorarioProgramado(cadernetaId) || null,
        timezone,
      })
    },
    [fazendaId, funcionarioId, isProgramacaoHoje, getHorarioProgramado, acessoId]
  )

  const registrarExecucao = useCallback(
    async (
      cadernetaId: string,
      observacao?: string | null,
      timezone?: string
    ): Promise<ExecucaoRotina | null> => {
      if (!fazendaId || !funcionarioId) return null
      const tz = timezone || (await getFazendaTimezone(acessoId))
      return registrarExecucaoRotina({
        fazendaId,
        funcionarioId,
        cadernetaId,
        observacao: observacao || null,
        timezone: tz,
      })
    },
    [fazendaId, funcionarioId, acessoId]
  )

  return {
    garantirExecucao,
    registrarExecucao,
    isProgramacaoHoje,
    getHorarioProgramado,
  }
}

async function getFazendaTimezone(acessoId: string | undefined): Promise<string> {
  if (!acessoId) return DEFAULT_FARM_TIMEZONE
  try {
    const fazenda = await getFazendaByAcessoId(acessoId)
    return fazenda?.timezone ?? DEFAULT_FARM_TIMEZONE
  } catch (err) {
    console.error('[useExecucaoRotina] Erro ao buscar timezone da fazenda:', err)
    return DEFAULT_FARM_TIMEZONE
  }
}

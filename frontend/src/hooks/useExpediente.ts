import { useState, useEffect, useCallback } from 'react'
import type { ExpedienteDias } from '../store/slices/configSlice'

export interface ExpedienteState {
  expedienteAtivo: boolean
  dentroExpediente: boolean
  diaSemana: number
  horaAtual: string
  expedienteDia: { ativo: boolean; inicio: string; fim: string } | null
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
}

function getDiaEHora(timezone: string): { dia: number; hora: string } {
  const now = new Date()

  const weekdayFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
  })
  const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const weekday = weekdayFmt.format(now)
  const timeStr = timeFmt.format(now)

  const dia = WEEKDAY_MAP[weekday] ?? 0
  // hour12:false pode retornar "24:00" em alguns ambientes; normalizar para "00:00"
  const hora = timeStr.replace(/^24:/, '00:')

  return { dia, hora }
}

function isDentroDoTurno(hora: string, inicio: string, fim: string): boolean {
  // Turno normal: inicio <= hora <= fim
  if (inicio <= fim) {
    return hora >= inicio && hora <= fim
  }
  // Turno noturno (cruza meia-noite): hora >= inicio OR hora <= fim
  return hora >= inicio || hora <= fim
}

export function useExpediente(
  expedienteHabilitado: boolean,
  expedienteTimezone: string,
  expedienteDias: ExpedienteDias | null,
  expedienteOverride: ExpedienteDias | null,
  rbacAtivo: boolean,
): ExpedienteState {
  const [state, setState] = useState<ExpedienteState>({
    expedienteAtivo: false,
    dentroExpediente: true,
    diaSemana: 0,
    horaAtual: '00:00',
    expedienteDia: null,
  })

  const verificar = useCallback(() => {
    // So aplica se RBAC ativo e expediente habilitado
    const ativo = rbacAtivo && expedienteHabilitado
    if (!ativo) {
      setState((prev) => ({
        ...prev,
        expedienteAtivo: false,
        dentroExpediente: true,
      }))
      return
    }

    // Override por funcionario tem prioridade; senao usa o padrao da fazenda
    const dias = expedienteOverride ?? expedienteDias
    if (!dias) {
      setState((prev) => ({
        ...prev,
        expedienteAtivo: false,
        dentroExpediente: true,
      }))
      return
    }

    const { dia, hora } = getDiaEHora(expedienteTimezone)
    const diaConfig = dias[dia]

    if (!diaConfig || !diaConfig.ativo) {
      setState({
        expedienteAtivo: true,
        dentroExpediente: false,
        diaSemana: dia,
        horaAtual: hora,
        expedienteDia: diaConfig || null,
      })
      return
    }

    const dentro = isDentroDoTurno(hora, diaConfig.inicio, diaConfig.fim)
    setState({
      expedienteAtivo: true,
      dentroExpediente: dentro,
      diaSemana: dia,
      horaAtual: hora,
      expedienteDia: diaConfig,
    })
  }, [rbacAtivo, expedienteHabilitado, expedienteTimezone, expedienteDias, expedienteOverride])

  // Verifica no mount e quando dependencias mudam
  useEffect(() => {
    verificar()
  }, [verificar])

  // Re-verifica a cada 60 segundos
  useEffect(() => {
    if (!rbacAtivo || !expedienteHabilitado) return
    const interval = setInterval(verificar, 60_000)
    return () => clearInterval(interval)
  }, [rbacAtivo, expedienteHabilitado, verificar])

  // Re-verifica quando o app volta do background
  useEffect(() => {
    if (!rbacAtivo || !expedienteHabilitado) return
    function handleVisibilityChange() {
      if (!document.hidden) verificar()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [rbacAtivo, expedienteHabilitado, verificar])

  return state
}

// Atualização automática dos dados: preferência do usuário e regra de "já é hora de atualizar?"
// A regra é pura (sem DOM) para ser testável.

const CHAVE_PREFS = 'atualizacao-automatica-prefs'

export interface PrefsAtualizacaoAutomatica {
  ativo: boolean
  /** Horário de corte no formato HH:MM (24h). */
  horario: string
}

export const PREFS_PADRAO: PrefsAtualizacaoAutomatica = { ativo: true, horario: '05:00' }

const HORARIO_VALIDO = /^([01]\d|2[0-3]):[0-5]\d$/

export function lerPrefsAtualizacaoAutomatica(): PrefsAtualizacaoAutomatica {
  try {
    const bruto = localStorage.getItem(CHAVE_PREFS)
    if (!bruto) return PREFS_PADRAO
    const p = JSON.parse(bruto)
    return {
      ativo: typeof p?.ativo === 'boolean' ? p.ativo : PREFS_PADRAO.ativo,
      horario: typeof p?.horario === 'string' && HORARIO_VALIDO.test(p.horario) ? p.horario : PREFS_PADRAO.horario,
    }
  } catch {
    return PREFS_PADRAO
  }
}

export function salvarPrefsAtualizacaoAutomatica(prefs: PrefsAtualizacaoAutomatica): void {
  try {
    localStorage.setItem(CHAVE_PREFS, JSON.stringify(prefs))
  } catch {
    // localStorage indisponível: segue com o padrão
  }
}

/** Instante (ms) do corte de hoje: o horário configurado no dia de `agora`. */
export function corteDeHoje(agora: Date, horario: string): number {
  const [h, m] = (HORARIO_VALIDO.test(horario) ? horario : PREFS_PADRAO.horario).split(':').map(Number)
  const corte = new Date(agora)
  corte.setHours(h, m, 0, 0)
  return corte.getTime()
}

export interface EntradaDeveAtualizar {
  prefs: PrefsAtualizacaoAutomatica
  agora: Date
  /** Timestamp (ms) da última atualização completa, ou null se nunca houve. */
  ultimaAtualizacao: number | null
  online: boolean
  testModeAtivo: boolean
  fazendaId: string | null | undefined
}

/**
 * Atualiza quando: ligado, online, com fazenda, fora do modo de teste, já passou do horário de corte
 * de hoje e a última atualização completa foi anterior a esse corte.
 */
export function deveAtualizarAgora(e: EntradaDeveAtualizar): boolean {
  if (!e.prefs.ativo || !e.online || e.testModeAtivo || !e.fazendaId) return false
  const corte = corteDeHoje(e.agora, e.prefs.horario)
  if (e.agora.getTime() < corte) return false
  return e.ultimaAtualizacao === null || e.ultimaAtualizacao < corte
}

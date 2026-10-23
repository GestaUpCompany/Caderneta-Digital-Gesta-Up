// Estado da atualização automática em segundo plano, separado do sync manual.
// O sync manual usa cadastroSyncState, que mostra o overlay bloqueante; este não bloqueia a tela.

/** 'listas' = cadastros base (11 etapas); 'aquecimento' = cache de detalhes (pastos, lotes, rodeio...) */
export type FaseSync = 'listas' | 'aquecimento'

export type StatusAtualizacaoAutomatica = {
  ativa: boolean
  fase: FaseSync | null
  current: number
  total: number
  item: string
}

type Listener = () => void

let estado: StatusAtualizacaoAutomatica = { ativa: false, fase: null, current: 0, total: 0, item: '' }
const listeners = new Set<Listener>()

export function getStatusAtualizacaoAutomatica(): StatusAtualizacaoAutomatica {
  return estado
}

export function setStatusAtualizacaoAutomatica(parcial: Partial<StatusAtualizacaoAutomatica>): void {
  estado = { ...estado, ...parcial }
  listeners.forEach((l) => l())
}

export function subscribeStatusAtualizacaoAutomatica(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Rótulo curto da fase, para mostrar junto do progresso */
export function rotuloFase(fase: FaseSync | null): string {
  if (fase === 'listas') return 'Cadastros'
  if (fase === 'aquecimento') return 'Aquecimento'
  return ''
}

/**
 * Estado global do sync de cadastro (warm cache).
 * Singleton fora do React para que o overlay de bloqueio no App
 * continue visível mesmo se a Home desmontar durante a navegação.
 */

export type SyncState = {
  active: boolean
  current: number
  total: number
  item: string
}

type Listener = (state: SyncState) => void

let currentState: SyncState = {
  active: false,
  current: 0,
  total: 0,
  item: '',
}

const listeners = new Set<Listener>()

export function getCadastroSyncState(): SyncState {
  return currentState
}

export function setCadastroSyncState(state: Partial<SyncState>): void {
  currentState = { ...currentState, ...state }
  listeners.forEach((l) => l(currentState))
}

export function subscribeCadastroSync(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

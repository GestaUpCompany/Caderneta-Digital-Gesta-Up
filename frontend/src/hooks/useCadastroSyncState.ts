import { useSyncExternalStore } from 'react'
import {
  getCadastroSyncState,
  subscribeCadastroSync,
  type SyncState,
} from '../services/cadastroSyncState'

export function useCadastroSyncState(): SyncState {
  return useSyncExternalStore(subscribeCadastroSync, getCadastroSyncState)
}

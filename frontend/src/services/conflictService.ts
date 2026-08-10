import { Registro } from '../types/cadernetas'
import { CadernetaStore, saveRegistro } from './indexedDB'

export type ConflictResolution = 'local' | 'remote' | 'manual'

export interface Conflict {
  id: string
  caderneta: CadernetaStore
  registroId: string
  localVersion: Registro
  remoteVersion: Registro
  detectedAt: string
}

export async function resolveConflict(
  conflict: Conflict,
  resolution: ConflictResolution,
  mergedData?: Registro
): Promise<void> {
  if (resolution === 'local') {
    const updated: Registro = {
      ...conflict.localVersion,
      syncStatus: 'pending',
      version: (conflict.localVersion.version ?? 0) + 1,
      lastModified: new Date().toISOString(),
    }
    await saveRegistro(conflict.caderneta, updated)

  } else if (resolution === 'remote') {
    const updated: Registro = {
      ...conflict.remoteVersion,
      id: conflict.registroId,
      syncStatus: 'synced',
    }
    await saveRegistro(conflict.caderneta, updated)

  } else if (resolution === 'manual' && mergedData) {
    const updated: Registro = {
      ...mergedData,
      id: conflict.registroId,
      syncStatus: 'pending',
      version: (conflict.localVersion.version ?? 0) + 1,
      lastModified: new Date().toISOString(),
    }
    await saveRegistro(conflict.caderneta, updated)
  }
}

const CONFLICT_STORAGE_KEY = 'cadernetas:conflicts'

export function saveConflictLocally(conflict: Conflict): void {
  const existing = loadLocalConflicts()
  const updated = [...existing.filter((c) => c.id !== conflict.id), conflict]
  localStorage.setItem(CONFLICT_STORAGE_KEY, JSON.stringify(updated))
}

export function loadLocalConflicts(): Conflict[] {
  try {
    const raw = localStorage.getItem(CONFLICT_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Conflict[]) : []
  } catch {
    return []
  }
}

export function removeLocalConflict(conflictId: string): void {
  const existing = loadLocalConflicts()
  const updated = existing.filter((c) => c.id !== conflictId)
  localStorage.setItem(CONFLICT_STORAGE_KEY, JSON.stringify(updated))
}

export function clearAllConflicts(): void {
  localStorage.removeItem(CONFLICT_STORAGE_KEY)
}

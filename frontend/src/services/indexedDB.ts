import { openDB, IDBPDatabase } from 'idb'
import { Registro } from '../types/cadernetas'
import { DB_NAME, DB_VERSION } from '../utils/constants'

export type CadernetaStore =
  | 'maternidade'
  | 'pastagens'
  | 'rodeio'
  | 'suplementacao'
  | 'bebedouros'
  | 'movimentacao'
  | 'enfermaria'
  | 'entrada-insumos'
  | 'saida-insumos'
  | 'insumos-por-saida'

const STORES: CadernetaStore[] = [
  'maternidade', 'pastagens', 'rodeio', 'suplementacao', 'bebedouros', 'movimentacao', 'enfermaria',
  'entrada-insumos', 'saida-insumos', 'insumos-por-saida',
]

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          const objStore = db.createObjectStore(store, { keyPath: 'id' })
          objStore.createIndex('syncStatus', 'syncStatus')
          objStore.createIndex('data', 'data')
          objStore.createIndex('lastModified', 'lastModified')
        }
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        const queue = db.createObjectStore('syncQueue', { keyPath: 'id' })
        queue.createIndex('timestamp', 'timestamp')
        queue.createIndex('priority', 'priority')
      }
    },
  })
}

export async function saveRegistro(store: CadernetaStore, registro: Registro): Promise<void> {
  const db = await getDB()
  await db.put(store, registro)
}

export async function getRegistro(store: CadernetaStore, id: string): Promise<Registro | undefined> {
  const db = await getDB()
  return db.get(store, id)
}

export async function getAllRegistros(store: CadernetaStore): Promise<Registro[]> {
  const db = await getDB()
  return db.getAll(store)
}

export async function getRegistrosPendentes(store: CadernetaStore): Promise<Registro[]> {
  const db = await getDB()
  const index = db.transaction(store).store.index('syncStatus')
  return index.getAll('pending')
}

export async function deleteRegistro(store: CadernetaStore, id: string): Promise<void> {
  const db = await getDB()
  await db.delete(store, id)
}

export async function updateSyncStatus(
  store: CadernetaStore,
  id: string,
  syncStatus: Registro['syncStatus'],
  googleRowId?: number
): Promise<void> {
  const db = await getDB()
  const registro = await db.get(store, id)
  if (registro) {
    registro.syncStatus = syncStatus
    if (googleRowId !== undefined) registro.googleRowId = googleRowId
    registro.lastModified = new Date().toISOString()
    await db.put(store, registro)
  }
}

export interface SyncQueueItem {
  id: string
  store: CadernetaStore
  registroId: string
  operation: 'create' | 'update'
  timestamp: number
  retryCount: number
  priority: 'high' | 'normal' | 'low'
}

export async function addToSyncQueue(item: SyncQueueItem): Promise<void> {
  const db = await getDB()
  await db.put('syncQueue', item)
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB()
  const all = await db.getAll('syncQueue')
  const priorityOrder: Record<string, number> = { high: 0, normal: 1, low: 2 }
  return all.sort((a: SyncQueueItem, b: SyncQueueItem) => {
    if (priorityOrder[a.priority] !== priorityOrder[b.priority])
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    return a.timestamp - b.timestamp
  })
}

export async function removeFromSyncQueue(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('syncQueue', id)
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDB()
  await db.clear('syncQueue')
}

export async function countPending(): Promise<number> {
  const db = await getDB()
  let total = 0
  for (const store of STORES) {
    const index = db.transaction(store).store.index('syncStatus')
    const count = await index.count('pending')
    total += count
  }
  return total
}

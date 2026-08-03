import { openDB, IDBPDatabase } from 'idb'
import { Registro } from '../types/cadernetas'
import { DB_NAME } from '../utils/constants'

export type CadernetaStore =
  | 'maternidade'
  | 'pastagens'
  | 'rodeio'
  | 'suplementacao'
  | 'bebedouros'
  | 'movimentacao'
  | 'enfermaria'
  | 'morte'
  | 'clima'
  | 'abastecimento'
  | 'cantina'
  | 'entrada-insumos'
  | 'entrada-insumos-itens'
  | 'saida-insumos'
  | 'insumos-por-saida'
  | 'limpeza'
  | 'operacoes-maquinas'
  | 'manutencao-maquinas'
  | 'problemas'
  | 'almoxarifado'
  | 'leitura-cocho'

const STORES: CadernetaStore[] = [
  'maternidade', 'pastagens', 'rodeio', 'suplementacao', 'bebedouros', 'movimentacao', 'enfermaria', 'morte', 'clima', 'abastecimento', 'cantina',
  'entrada-insumos', 'entrada-insumos-itens', 'saida-insumos', 'insumos-por-saida', 'limpeza', 'operacoes-maquinas', 'manutencao-maquinas', 'problemas', 'almoxarifado', 'leitura-cocho',
]

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 21, {
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
      if (!db.objectStoreNames.contains('cadastroData')) {
        const cache = db.createObjectStore('cadastroData', { keyPath: 'key' })
        cache.createIndex('timestamp', 'timestamp')
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

export async function getRegistrosComErro(store: CadernetaStore): Promise<Registro[]> {
  const db = await getDB()
  const index = db.transaction(store).store.index('syncStatus')
  return index.getAll('error')
}

export async function getAllRegistrosComErro(): Promise<{ store: CadernetaStore; registros: Registro[] }[]> {
  const result: { store: CadernetaStore; registros: Registro[] }[] = []
  for (const store of STORES) {
    const registros = await getRegistrosComErro(store)
    if (registros.length > 0) {
      result.push({ store, registros })
    }
  }
  return result
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

export async function updateRegistro(store: CadernetaStore, id: string, updates: Partial<Registro>): Promise<void> {
  const db = await getDB()
  const registro = await db.get(store, id)
  if (registro) {
    const registroAtualizado = { ...registro, ...updates, lastModified: new Date().toISOString() }
    await db.put(store, registroAtualizado)
  }
}

export interface SyncQueueItem {
  id: string
  store: CadernetaStore
  registroId: string
  operation: 'create' | 'update'
  timestamp: number
  retryCount: number
  nextRetryAt: number
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

export async function removeFromSyncQueueByRegistroId(registroId: string): Promise<void> {
  const db = await getDB()
  const queue = await db.getAll('syncQueue')
  for (const item of queue as SyncQueueItem[]) {
    if (item.registroId === registroId) {
      await db.delete('syncQueue', item.id)
    }
  }
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

export interface CadastroDataCache {
  key: string
  data: any
  timestamp: number
  fazendaId?: string
}

export async function saveCadastroData(key: string, data: any, fazendaId?: string): Promise<void> {
  const db = await getDB()
  const cacheItem: CadastroDataCache = {
    key,
    data,
    timestamp: Date.now(),
    fazendaId,
  }
  await db.put('cadastroData', cacheItem)
}

export async function getCadastroData(key: string): Promise<any | undefined> {
  const db = await getDB()
  const item = await db.get('cadastroData', key)
  return item?.data
}

export async function getAllCadastroData(): Promise<Record<string, any>> {
  const db = await getDB()
  const items = await db.getAll('cadastroData')
  const result: Record<string, any> = {}
  for (const item of items as CadastroDataCache[]) {
    result[item.key] = {
      ...item.data,
      fazendaId: item.fazendaId
    }
  }
  return result
}

export async function clearCadastroData(): Promise<void> {
  const db = await getDB()
  await db.clear('cadastroData')
}

/**
 * Remove todos os registros marcados como teste (isTestRecord === true)
 * de todos os stores de cadernetas. Retorna o total removido.
 */
export async function deleteRegistrosByTestFlag(): Promise<number> {
  const db = await getDB()
  let removidos = 0
  for (const store of STORES) {
    const all = await db.getAll(store) as Registro[]
    const tx = db.transaction(store, 'readwrite')
    for (const registro of all) {
      if (registro.isTestRecord === true) {
        await tx.store.delete(registro.id)
        removidos++
      }
    }
    await tx.done
  }
  return removidos
}

/**
 * Remove da syncQueue qualquer item cujo registro associado esteja marcado
 * como teste. Rede de segurança: em condições normais, registros de teste
 * nunca são enfileirados, mas esta função garante limpeza total ao desativar.
 */
export async function clearTestItemsFromQueue(): Promise<number> {
  const db = await getDB()
  const queue = await db.getAll('syncQueue') as SyncQueueItem[]
  let removidos = 0
  for (const item of queue) {
    const registro = await db.get(item.store, item.registroId) as Registro | undefined
    if (registro?.isTestRecord === true) {
      await db.delete('syncQueue', item.id)
      removidos++
    }
  }
  return removidos
}

/**
 * Conta quantos registros de teste existem atualmente no dispositivo.
 */
export async function countTestRecords(): Promise<number> {
  const db = await getDB()
  let total = 0
  for (const store of STORES) {
    const all = await db.getAll(store) as Registro[]
    total += all.filter(r => r.isTestRecord === true).length
  }
  return total
}

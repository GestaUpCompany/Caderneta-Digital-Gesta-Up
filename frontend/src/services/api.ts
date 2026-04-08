import { Registro } from '../types/cadernetas'
import { CadernetaStore, saveRegistro, getAllRegistros, deleteRegistro } from './indexedDB'
import { enqueueRegistro } from './syncService'
import { generateId, generateVersion, getCurrentTimestamp } from '../utils/generateId'
import { validate, CadernetaType } from '../utils/validation'

export interface SaveResult {
  success: boolean
  id?: string
  errors?: { field: string; message: string }[]
}

export async function salvarRegistro(
  caderneta: CadernetaStore,
  data: Record<string, unknown>
): Promise<SaveResult> {
  const validation = validate(caderneta as CadernetaType, data)
  if (!validation.isValid) {
    return { success: false, errors: validation.errors }
  }

  const registro = {
    ...data,
    id: generateId(),
    version: generateVersion(),
    lastModified: getCurrentTimestamp(),
    syncStatus: 'pending' as const,
  } as Registro

  await saveRegistro(caderneta, registro)
  await enqueueRegistro(caderneta, registro.id, 'create')

  return { success: true, id: registro.id }
}

export async function listarRegistros(caderneta: CadernetaStore): Promise<Registro[]> {
  const registros = await getAllRegistros(caderneta)
  return registros.sort((a, b) => {
    const dateA = new Date(a.lastModified).getTime()
    const dateB = new Date(b.lastModified).getTime()
    return dateB - dateA
  })
}

export async function excluirRegistro(caderneta: CadernetaStore, id: string): Promise<void> {
  await deleteRegistro(caderneta, id)
}

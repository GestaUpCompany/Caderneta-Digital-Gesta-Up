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
  console.log('api: salvarRegistro chamado', { caderneta, data })
  
  const validation = validate(caderneta as CadernetaType, data)
  if (!validation.isValid) {
    console.log('api: Validação falhou', validation.errors)
    return { success: false, errors: validation.errors }
  }

  const registro = {
    ...data,
    id: generateId(),
    version: generateVersion(),
    lastModified: getCurrentTimestamp(),
    syncStatus: 'pending' as const,
  } as Registro

  console.log('api: Registro criado', registro)
  await saveRegistro(caderneta, registro)
  console.log('api: Registro salvo no IndexedDB')
  
  await enqueueRegistro(caderneta, registro.id, 'create')
  console.log('api: Registro enfileirado para sincronização')

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

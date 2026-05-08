import { Registro } from '../types/cadernetas'
import { CadernetaStore, saveRegistro, getAllRegistros, deleteRegistro } from './indexedDB'
import { enqueueRegistro } from './syncService'
import { generateId, generateVersion, getCurrentTimestamp } from '../utils/generateId'
import { validate, CadernetaType } from '../utils/validation'

export interface SaveResult {
  success: boolean
  registro?: Registro
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

  // Capturar hora atual e concatenar com data
  const agora = new Date()
  const hora = agora.getHours().toString().padStart(2, '0')
  const minuto = agora.getMinutes().toString().padStart(2, '0')
  const dataComHora = `${data.data as string} ${hora}:${minuto}`

  const registro = {
    ...data,
    data: dataComHora,
    id: generateId(),
    version: generateVersion(),
    lastModified: getCurrentTimestamp(),
    syncStatus: 'pending' as const,
  } as Registro

  try {
    await saveRegistro(caderneta, registro)

    // Pequeno delay para garantir persistência no IndexedDB (especialmente Android 13)
    await new Promise(resolve => setTimeout(resolve, 100))

    await enqueueRegistro(caderneta, registro.id, 'create')

    return { success: true, registro, id: registro.id }
  } catch (error) {
    console.error('Erro ao salvar registro:', error)
    return { 
      success: false, 
      errors: [{ field: 'general', message: 'Erro ao salvar registro. Tente novamente.' }] 
    }
  }
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

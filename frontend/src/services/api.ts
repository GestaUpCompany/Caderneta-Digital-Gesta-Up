import { Registro } from '../types/cadernetas'
import { CadernetaStore, saveRegistro, getAllRegistros, deleteRegistro, getRegistro, updateSyncStatus } from './indexedDB'
import { enqueueRegistro } from './syncService'
import { generateId, generateVersion, getCurrentTimestamp } from '../utils/generateId'
import { validate, CadernetaType } from '../utils/validation'
import { store } from '../store/store'
import { getFazendaByAcessoId } from './supabaseService'
import { getCurrentTimeInTimezone, DEFAULT_FARM_TIMEZONE } from '../utils/formatDate'

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

  // Capturar hora atual no fuso da fazenda e concatenar com data
  const timezone = await getFarmTimezone()
  const horaAtual = getCurrentTimeInTimezone(timezone)
  const dataComHora = `${data.data as string} ${horaAtual.slice(0, 5)}`

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
  
  // Para entrada-insumos, carregar itens do store separado
  if (caderneta === 'entrada-insumos') {
    const itensStore = 'entrada-insumos-itens' as CadernetaStore
    const todosItens = await getAllRegistros(itensStore)
    
    // Agrupar itens por entrada_id
    const itensPorEntrada = todosItens.reduce((acc, item) => {
      const entradaId = item.entradaId as string
      if (!acc[entradaId]) {
        acc[entradaId] = []
      }
      acc[entradaId].push({
        produto: item.produto,
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
        valorTotal: item.valorTotal,
      })
      return acc
    }, {} as Record<string, any[]>)
    
    // Anexar itens aos registros
    return registros.map(registro => ({
      ...registro,
      itens: itensPorEntrada[registro.id] || []
    })).sort((a, b) => {
      const dateA = new Date(a.lastModified).getTime()
      const dateB = new Date(b.lastModified).getTime()
      return dateB - dateA
    })
  }
  
  return registros.sort((a, b) => {
    const dateA = new Date(a.lastModified).getTime()
    const dateB = new Date(b.lastModified).getTime()
    return dateB - dateA
  })
}

export async function excluirRegistro(caderneta: CadernetaStore, id: string): Promise<void> {
  await deleteRegistro(caderneta, id)
}

export interface ReenviarResult {
  success: boolean
  message?: string
}

export async function reenviarRegistro(
  caderneta: CadernetaStore,
  id: string
): Promise<ReenviarResult> {
  try {
    const registro = await getRegistro(caderneta, id)
    if (!registro) {
      return { success: false, message: 'Registro não encontrado no dispositivo.' }
    }

    await updateSyncStatus(caderneta, id, 'pending')
    await enqueueRegistro(caderneta, id, registro.supabaseId ? 'update' : 'create')

    return { success: true, message: 'Registro reenviado para sincronização.' }
  } catch (error) {
    console.error('Erro ao reenviar registro:', error)
    return { success: false, message: 'Erro ao reenviar registro. Tente novamente.' }
  }
}

async function getFarmTimezone(): Promise<string> {
  const state = store.getState()
  const acessoId = state.config.acessoId
  if (!acessoId) return DEFAULT_FARM_TIMEZONE
  try {
    const fazenda = await getFazendaByAcessoId(acessoId)
    return fazenda?.timezone ?? DEFAULT_FARM_TIMEZONE
  } catch (err) {
    console.error('[api] Erro ao buscar timezone da fazenda:', err)
    return DEFAULT_FARM_TIMEZONE
  }
}

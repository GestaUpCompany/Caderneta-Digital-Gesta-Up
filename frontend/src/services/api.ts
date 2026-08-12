import { Registro } from '../types/cadernetas'
import { CadernetaStore, saveRegistro, getAllRegistros, deleteRegistro, getRegistro, updateSyncStatus, deleteRegistrosByTestFlag, clearTestItemsFromQueue } from './indexedDB'
import { enqueueRegistro } from './syncService'
import { registerBackgroundSync } from '../serviceWorkerRegistration'
import { generateId, generateVersion, getCurrentTimestamp } from '../utils/generateId'
import { validate, CadernetaType } from '../utils/validation'
import { store } from '../store/store'
import { setTestMode } from '../store/slices/configSlice'
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

  // Remover campos de validação que não devem ser persistidos
  const { maxCabecasLote, ...dataSemCamposValidacao } = data

  // Injetar nome_usuario: precedência é campo explicito no payload > config.usuario
  // Telas com searchable modal de responsável já enviam o nome selecionado;
  // telas sem modal contam com config.usuario injetado aqui.
  const configState = store.getState().config
  const usuarioConfigurado = (configState.usuario || '').trim()
  const usuarioPayload = ((dataSemCamposValidacao.usuario as string) || '').trim()
  const responsavelPayload = ((dataSemCamposValidacao.responsavel as string) || '').trim()

  // Determinar nome_usuario final
  let nomeUsuarioFinal = usuarioPayload || responsavelPayload || usuarioConfigurado

  // Se mesmo assim estiver vazio, bloquear o lançamento
  if (!nomeUsuarioFinal) {
    return {
      success: false,
      errors: [{
        field: 'nome_usuario',
        message: 'É necessário configurar seu nome nas Configurações antes de fazer lançamentos.',
      }],
    }
  }

  // Injetar usuario no payload (campo que o syncService lê para nome_usuario)
  const dataComUsuario: Record<string, unknown> = {
    ...dataSemCamposValidacao,
    usuario: nomeUsuarioFinal,
  }

  // Capturar hora atual no fuso da fazenda e concatenar com data
  const timezone = await getFarmTimezone()
  const horaAtual = getCurrentTimeInTimezone(timezone)
  const dataComHora = `${dataComUsuario.data as string} ${horaAtual.slice(0, 5)}`

  const registro = {
    ...dataComUsuario,
    data: dataComHora,
    id: generateId(),
    version: generateVersion(),
    lastModified: getCurrentTimestamp(),
    syncStatus: 'pending' as const,
  } as Registro

  // Modo teste: marca o registro e NÃO enfileira para sync (fica só no dispositivo)
  const testModeAtivo = store.getState().config.testModeAtivo
  if (testModeAtivo) {
    registro.isTestRecord = true
  }

  try {
    await saveRegistro(caderneta, registro)

    // Pequeno delay para garantir persistência no IndexedDB (especialmente Android 13)
    await new Promise(resolve => setTimeout(resolve, 100))

    if (!testModeAtivo) {
      await enqueueRegistro(caderneta, registro.id, 'create')
      // Registrar Background Sync one-shot para sincronizar quando a conexão retornar
      // Android apenas; iOS ignora silenciosamente (feature detection em registerBackgroundSync)
      registerBackgroundSync('sync-registros').catch(() => {})
    }

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
  // No modo teste, registros reais não podem ser tocados
  const testModeAtivo = store.getState().config.testModeAtivo
  if (testModeAtivo) {
    const registro = await getRegistro(caderneta, id)
    if (registro && registro.isTestRecord !== true) {
      throw new Error('Modo teste ativo: não é possível excluir registros reais.')
    }
  }
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

    // No modo teste, registros reais não podem ser reenviados (subiriam ao Supabase)
    const testModeAtivo = store.getState().config.testModeAtivo
    if (testModeAtivo && registro.isTestRecord !== true) {
      return { success: false, message: 'Modo teste ativo: não é possível reenviar registros reais.' }
    }
    // Registros de teste nunca sobem ao Supabase
    if (registro.isTestRecord === true) {
      return { success: false, message: 'Registros de teste não são sincronizados.' }
    }

    await updateSyncStatus(caderneta, id, 'pending')
    await enqueueRegistro(caderneta, id, registro.supabaseId ? 'update' : 'create')

    return { success: true, message: 'Registro reenviado para sincronização.' }
  } catch (error) {
    console.error('Erro ao reenviar registro:', error)
    return { success: false, message: 'Erro ao reenviar registro. Tente novamente.' }
  }
}

/**
 * Aguarda o syncStatus do registro mudar de 'pending' para um estado terminal
 * ('synced' ou 'error'). Retorna o status final, ou 'pending' se o timeout
 * expirar. Usado para atualizar a UI sem precisar recarregar a página.
 */
export async function aguardarSyncConcluido(
  caderneta: CadernetaStore,
  id: string,
  timeoutMs = 30_000,
  intervalMs = 500
): Promise<'synced' | 'error' | 'pending' | 'missing'> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const registro = await getRegistro(caderneta, id)
    if (!registro) return 'missing'
    const status = registro.syncStatus
    if (status === 'synced' || status === 'error') return status
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return 'pending'
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

/**
 * Desativa o modo teste e remove completamente todos os registros marcados
 * como teste do dispositivo (IndexedDB) e da syncQueue. Registros reais
 * pré-existentes não são tocados.
 */
export async function desativarModoTeste(): Promise<{ removidos: number }> {
  const removidos = await deleteRegistrosByTestFlag()
  await clearTestItemsFromQueue()
  store.dispatch(setTestMode(false))
  console.log(`[testMode] Modo teste desativado. ${removidos} registro(s) de teste removidos.`)
  return { removidos }
}

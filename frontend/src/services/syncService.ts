import {
  getSyncQueue,
  getRegistro,
  addToSyncQueue,
  removeFromSyncQueue,
  updateSyncStatus,
  SyncQueueItem,
  CadernetaStore,
} from './indexedDB'
import { generateId } from '../utils/generateId'
import { BACKEND_URL, MAX_RETRY_COUNT } from '../utils/constants'
import { Registro } from '../types/cadernetas'

interface ColumnMapping {
  field: keyof Registro
  defaultValue?: string | number
  transform?: (value: any) => string | number | null
}

interface CadernetaColumnConfig {
  columns: ColumnMapping[]
}

const CADERNETA_COLUMNS_CONFIG: Record<CadernetaStore, CadernetaColumnConfig> = {
  maternidade: {
    columns: [
      { field: 'data' },
      { field: 'pasto' },
      { field: 'lote' },
      { field: 'pesoCria' },
      { field: 'numeroCria' },
      { field: 'tratamento' },
      { field: 'tipoParto' },
      { field: 'sexo' },
      { field: 'raca' },
      { field: 'numeroMae' },
      { field: 'categoriaMae' },
    ],
  },
  pastagens: {
    columns: [
      { field: 'data' },
      { field: 'manejador' },
      { field: 'numeroLote' },
      { field: 'pastoSaida' },
      { field: 'avaliacaoSaida' },
      { field: 'tempoOcupacao', defaultValue: '' },
      { field: 'pastoEntrada' },
      { field: 'avaliacaoEntrada' },
      { field: 'tempoVedacao', defaultValue: '' },
      { field: 'vaca' },
      { field: 'touro' },
      { field: 'boiGordo' },
      { field: 'boiMagro' },
      { field: 'garrote' },
      { field: 'bezerro' },
      { field: 'novilha' },
      { field: 'tropa' },
      { field: 'outros' },
      { field: 'escoreGado', defaultValue: 0 },
    ],
  },
  rodeio: {
    columns: [
      { field: 'data' },
      { field: 'pasto' },
      { field: 'numeroLote' },
      { field: 'vaca', transform: (v) => v || '' },
      { field: 'touro', transform: (v) => v || '' },
      { field: 'boiGordo', transform: (v) => v || '' },
      { field: 'boiMagro', transform: (v) => v || '' },
      { field: 'garrote', transform: (v) => v || '' },
      { field: 'bezerro', transform: (v) => v || '' },
      { field: 'novilha', transform: (v) => v || '' },
      { field: 'tropa', transform: (v) => v || '' },
      { field: 'outros', transform: (v) => v || '' },
      { field: 'totalCabecas' },
      { field: 'escoreGadoIdeal' },
      { field: 'escoreGadoIdealObs', defaultValue: '' },
      { field: 'aguaBoaBebedouro' },
      { field: 'aguaBoaBebedouroObs', defaultValue: '' },
      { field: 'pastagemAdequada' },
      { field: 'pastagemAdequadaObs', defaultValue: '' },
      { field: 'animaisDoentes' },
      { field: 'animaisDoentesObs', defaultValue: '' },
      { field: 'cercasCochos' },
      { field: 'cercasCochosObs', defaultValue: '' },
      { field: 'carrapatosMoscas' },
      { field: 'carrapatosMoscasObs', defaultValue: '' },
      { field: 'animaisEntrevero' },
      { field: 'animaisEntreveroObs', defaultValue: '' },
      { field: 'animalMorto' },
      { field: 'animalMortoObs', defaultValue: '' },
      { field: 'escoreFezes' },
      { field: 'equipe' },
    ],
  },
  suplementacao: {
    columns: [
      { field: 'data' },
      { field: 'tratador' },
      { field: 'pasto' },
      { field: 'numeroLote' },
      { field: 'produto' },
      { field: 'creepKg' },
      { field: 'leituraCocho' },
      { field: 'kgCocho' },
      { field: 'kgDeposito' },
      { field: 'categoriasString' },
    ],
  },
  bebedouros: {
    columns: [
      { field: 'data' },
      { field: 'responsavel' },
      { field: 'pasto' },
      { field: 'numeroLote' },
      { field: 'categoria' },
      { field: 'leituraBebedouro' },
      { field: 'numeroBebedouro' },
      { field: 'observacao' },
    ],
  },
  movimentacao: {
    columns: [
      { field: 'data' },
      { field: 'loteOrigem' },
      { field: 'loteDestino' },
      { field: 'numeroCabecas' },
      { field: 'pesoMedio' },
      { field: 'categoria' },
      { field: 'motivoMovimentacao' },
      { field: 'brincoChip' },
      { field: 'causaObservacao' },
    ],
  },
  enfermaria: {
    columns: [
      { field: 'data' },
      { field: 'pasto' },
      { field: 'lote' },
      { field: 'brincoChip' },
      { field: 'categoria' },
      { field: 'problemaCasco' },
      { field: 'problemaCascoObs' },
      { field: 'sintomasPneumonia' },
      { field: 'sintomasPneumoniaObs' },
      { field: 'picadoCobra' },
      { field: 'picadoCobraObs' },
      { field: 'incoordenacaoTremores' },
      { field: 'incoordenacaoTremoresObs' },
      { field: 'febreAlta' },
      { field: 'febreAltaObs' },
      { field: 'presencaSangue' },
      { field: 'presencaSangueObs' },
      { field: 'fraturas' },
      { field: 'fraturasObs' },
      { field: 'desordensDigestivas' },
      { field: 'desordensDigestivasObs' },
      { field: 'tratamento' },
    ],
  },
  'entrada-insumos': {
    columns: [
      { field: 'dataEntrada' },
      { field: 'horario' },
      { field: 'produto' },
      { field: 'quantidade' },
      { field: 'valorUnitario' },
      { field: 'valorTotal' },
      { field: 'notaFiscal' },
      { field: 'fornecedor' },
      { field: 'placa' },
      { field: 'motorista' },
      { field: 'responsavelRecebimento' },
    ],
  },
  'saida-insumos': {
    columns: [
      { field: 'dataProducao' },
      { field: 'dietaProduzida' },
      { field: 'destinoProducao' },
      { field: 'totalProduzido' },
    ],
  },
  'insumos-por-saida': {
    columns: [
      { field: 'idSaida' },
      { field: 'dataProducao' },
      { field: 'dietaProduzida' },
      { field: 'insumo' },
      { field: 'quantidade' },
    ],
  },
}

function getColumnValues(store: CadernetaStore, registro: Registro): (string | number | null)[] {
  const config = CADERNETA_COLUMNS_CONFIG[store]
  return config.columns.map((mapping) => {
    const value = registro[mapping.field]
    if (mapping.transform) {
      return mapping.transform(value)
    }
    if (value === undefined || value === null || value === '') {
      return mapping.defaultValue ?? ''
    }
    return value as string | number
  })
}

export async function enqueueRegistro(
  store: CadernetaStore,
  registroId: string,
  operation: 'create' | 'update'
): Promise<void> {
  const item: SyncQueueItem = {
    id: generateId(),
    store,
    registroId,
    operation,
    timestamp: Date.now(),
    retryCount: 0,
    priority: 'normal',
  }
  await addToSyncQueue(item)
}

export async function processQueue(planilhaUrl: string): Promise<{ synced: number; failed: number }> {
  const queue = await getSyncQueue()
  let synced = 0
  let failed = 0

  for (const item of queue) {
    if (item.retryCount >= MAX_RETRY_COUNT) {
      await removeFromSyncQueue(item.id)
      await updateSyncStatus(item.store, item.registroId, 'error')
      failed++
      continue
    }

    const registro = await getRegistro(item.store, item.registroId)
    if (!registro) {
      await removeFromSyncQueue(item.id)
      continue
    }

    try {
      const values = getColumnValues(item.store, registro)

      if (item.operation === 'create') {
        const res = await fetch(`${BACKEND_URL}/api/sheets/${item.store}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planilhaUrl, values, id: registro.id }),
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json() as { rowNumber: number }
        await updateSyncStatus(item.store, item.registroId, 'synced', json.rowNumber)

      } else if (item.operation === 'update' && registro.googleRowId) {
        const res = await fetch(`${BACKEND_URL}/api/sheets/${item.store}/${registro.googleRowId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planilhaUrl, values }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        await updateSyncStatus(item.store, item.registroId, 'synced')
      }

      await removeFromSyncQueue(item.id)
      synced++
    } catch {
      item.retryCount++
      await addToSyncQueue(item)
      failed++
    }
  }

  return { synced, failed }
}

export async function validatePlanilha(planilhaUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/sheets/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planilhaUrl }),
    })
    const json = await res.json() as { success: boolean }
    return json.success === true
  } catch {
    return false
  }
}

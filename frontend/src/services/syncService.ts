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

const CADERNETA_COLUMNS: Record<CadernetaStore, (r: Registro) => (string | number | null)[]> = {
  maternidade: (r) => [
    r.data as string, r.pasto as string, r.lote as string, r.pesoCria as number, r.numeroCria as string,
    r.tratamento as string, r.tipoParto as string, r.sexo as string,
    r.raca as string, r.numeroMae as string, r.categoriaMae as string,
  ],
  pastagens: (r) => [
    r.data as string, r.manejador as string, r.numeroLote as string,
    r.pastoSaida as string, r.avaliacaoSaida as string, r.pastoEntrada as string,
    r.avaliacaoEntrada as string, r.vaca as number, r.touro as number,
    r.bezerro as number, r.boiMagro as number, r.garrote as number,
    r.novilha as number,
  ],
  rodeio: (r) => [
    r.data as string, r.pasto as string, r.numeroLote as string,
    r.vaca as number, r.touro as number, r.bezerro as number,
    r.boi as number, r.garrote as number, r.novilha as number,
    r.totalCabecas as number, r.escoreGadoIdeal as string, r.escoreGadoIdealObs as string,
    r.aguaBoaBebedouro as string, r.aguaBoaBebedouroObs as string,
    r.pastagemAdequada as string, r.pastagemAdequadaObs as string,
    r.animaisDoentes as string, r.animaisDoentesObs as string,
    r.cercasCochos as string, r.cercasCochosObs as string,
    r.carrapatosMoscas as string, r.carrapatosMoscasObs as string,
    r.animaisEntreverados as string, r.animaisEntreveradosObs as string,
    r.animalMorto as string, r.animalMortoObs as string,
    r.animaisTratados as number, r.escoreFezes as number, r.equipe as number,
    // 20 pares de colunas para animais tratados
    ...Array.from({ length: 20 }, (_, i) => [
      r[`animal${i + 1}Id`] as string || '',
      r[`animal${i + 1}Tratamentos`] as string || '',
    ]).flat(),
  ],
  suplementacao: (r) => [
    r.data as string, r.tratador as string, r.pasto as string, r.numeroLote as string,
    r.produto as string, r.creepKg as string, r.leituraCocho as number,
    r.kgCocho as number, r.kgDeposito as number, r.gado as string, r.categoriasString as string,
  ],
  bebedouros: (r) => [
    r.data as string, r.responsavel as string, r.pasto as string, r.numeroLote as string,
    r.gado as string, r.categoria as string, r.leituraBebedouro as number,
    r.numeroBebedouro as string, r.observacao as string,
  ],
  movimentacao: (r) => [
    r.data as string, r.loteOrigem as string, r.loteDestino as string,
    r.numeroCabecas as number, r.pesoMedio as number, r.categoria as string,
    r.motivoMovimentacao as string, r.brincoChip as string, r.causaObservacao as string,
  ],
  enfermaria: (r) => [
    r.data as string, r.pasto as string, r.lote as string, r.brincoChip as string, r.categoria as string,
    r.problemaCasco as string, r.problemaCascoObs as string,
    r.sintomasPneumonia as string, r.sintomasPneumoniaObs as string,
    r.picadoCobra as string, r.picadoCobraObs as string,
    r.incoordenacaoTremores as string, r.incoordenacaoTremoresObs as string,
    r.febreAlta as string, r.febreAltaObs as string,
    r.presencaSangue as string, r.presencaSangueObs as string,
    r.fraturas as string, r.fraturasObs as string,
    r.desordensDigestivas as string, r.desordensDigestivasObs as string,
  ],
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
      const values = CADERNETA_COLUMNS[item.store](registro)

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

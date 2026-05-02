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
import * as supabaseService from './supabaseService'

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

const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true'

// Mapeamento de CadernetaStore para tabelas do Supabase
const CADERNETA_TO_SUPABASE_TABLE: Record<CadernetaStore, string> = {
  maternidade: 'registros_maternidade',
  pastagens: 'registros_pastagens',
  rodeio: 'registros_rodeio',
  suplementacao: 'registros_suplementacao',
  bebedouros: 'registros_bebedouros',
  movimentacao: 'registros_movimentacao',
  enfermaria: 'registros_enfermaria',
  'entrada-insumos': 'registros_entrada_insumos',
  'saida-insumos': 'registros_saida_insumos',
  'insumos-por-saida': 'registros_saida_insumos',
}

// Função para converter Registro para formato do Supabase
function registroToSupabase(store: CadernetaStore, registro: Registro, fazendaId: string): any {
  const baseData = {
    fazenda_id: fazendaId,
    dispositivo_id: registro.dispositivoId || null,
    nome_usuario: registro.usuario || null,
    sync_status: 'synced',
    version: registro.version || 1,
  }

  switch (store) {
    case 'maternidade':
      return {
        ...baseData,
        data: registro.data,
        pasto_id: registro.pasto || null,
        lote_id: registro.lote || null,
        peso_cria: registro.pesoCria || null,
        numero_cria: registro.numeroCria || null,
        tratamento: registro.tratamento || null,
        tipo_parto: registro.tipoParto || null,
        sexo: registro.sexo || null,
        raca: registro.raca || null,
        numero_mae: registro.numeroMae || null,
        categoria_mae: registro.categoriaMae || null,
      }
    case 'pastagens':
      return {
        ...baseData,
        data: registro.data,
        manejador: registro.manejador || null,
        lote_id: registro.numeroLote || null,
        pasto_saida_id: registro.pastoSaida || null,
        avaliacao_saida: registro.avaliacaoSaida || null,
        pasto_entrada_id: registro.pastoEntrada || null,
        avaliacao_entrada: registro.avaliacaoEntrada || null,
        vaca: (registro.vaca as number) || false,
        touro: (registro.touro as number) || false,
        bezerro: (registro.bezerro as number) || false,
        boi_gordo: (registro.boiGordo as number) || false,
        boi_magro: (registro.boiMagro as number) || false,
        garrote: (registro.garrote as number) || false,
        novilha: (registro.novilha as number) || false,
        tropa: (registro.tropa as number) || false,
        outros: (registro.outros as number) || false,
        total_animais: ((registro.vaca as number) || 0) + ((registro.touro as number) || 0) + ((registro.bezerro as number) || 0) + ((registro.boiGordo as number) || 0) + ((registro.boiMagro as number) || 0) + ((registro.garrote as number) || 0) + ((registro.novilha as number) || 0) + ((registro.tropa as number) || 0) + ((registro.outros as number) || 0),
      }
    case 'rodeio':
      return {
        ...baseData,
        data: registro.data,
        pasto_id: registro.pasto || null,
        lote_id: registro.numeroLote || null,
        vaca: registro.vaca || 0,
        touro: registro.touro || 0,
        bezerro: registro.bezerro || 0,
        boi: registro.boiGordo || 0,
        garrote: registro.garrote || 0,
        novilha: registro.novilha || 0,
        tropa: registro.tropa || 0,
        outros: registro.outros || 0,
        total_cabecas: registro.totalCabecas || 0,
        escore_gado_ideal: registro.escoreGadoIdeal === 'Sim',
        agua_boa: registro.aguaBoaBebedouro === 'Sim',
        pastagem_adequada: registro.pastagemAdequada === 'Sim',
        animais_doentes: registro.animaisDoentes === 'Sim',
        cercas_cochos: registro.cercasCochos === 'Sim',
        carrapatos_moscas: registro.carrapatosMoscas === 'Sim',
        animais_entrevados: registro.animaisEntrevero === 'Sim',
        animal_morto: registro.animalMorto === 'Sim',
        animais_tratados: registro.animaisTratados || null,
        escore_fezes: registro.escoreFezes || null,
        equipe: registro.equipe || null,
        procedimentos: registro.procedimentos || null,
      }
    case 'suplementacao':
      return {
        ...baseData,
        data: registro.data,
        tratador: registro.tratador || null,
        pasto_id: registro.pasto || null,
        lote_id: registro.numeroLote || null,
        produto: registro.produto || null,
        vaca: (registro.categoriasString as string)?.includes('Vaca') || false,
        touro: (registro.categoriasString as string)?.includes('Touro') || false,
        bezerro: (registro.categoriasString as string)?.includes('Bezerro') || false,
        boi: (registro.categoriasString as string)?.includes('Boi') || false,
        garrote: (registro.categoriasString as string)?.includes('Garrote') || false,
        novilha: (registro.categoriasString as string)?.includes('Novilha') || false,
        leitura: registro.leituraCocho || null,
        sacos: registro.kgCocho || null,
        kg: registro.kgDeposito || null,
        creep: registro.creepKg || null,
      }
    case 'bebedouros':
      return {
        ...baseData,
        data: registro.data,
        responsavel: registro.responsavel || null,
        pasto_id: registro.pasto || null,
        lote_id: registro.numeroLote || null,
        gado: registro.categoria || null,
        categoria: registro.categoria || null,
        leitura: registro.leituraBebedouro || null,
        numero_bebedouro: registro.numeroBebedouro || null,
        observacao: registro.observacao || null,
      }
    case 'movimentacao':
      return {
        ...baseData,
        data: registro.data,
        lote_origem_id: registro.loteOrigem || null,
        lote_destino_id: registro.loteDestino || null,
        numero_cabecas: registro.numeroCabecas || null,
        peso_medio: registro.pesoMedio || null,
        categoria: registro.categoria || null,
        vaca: registro.vaca || false,
        touro: registro.touro || false,
        bezerro: registro.bezerro || false,
        boi_gordo: registro.boiGordo || false,
        boi_magro: registro.boiMagro || false,
        garrote: registro.garrote || false,
        novilha: registro.novilha || false,
        tropa: registro.tropa || false,
        outros: registro.outros || false,
        motivo: registro.motivoMovimentacao || null,
        identificacao: registro.brincoChip || null,
        causa: registro.causaObservacao || null,
      }
    case 'enfermaria':
      return {
        ...baseData,
        data: registro.data,
        pasto_id: registro.pasto || null,
        lote_id: registro.lote || null,
        brinco_chip: registro.brincoChip || null,
        categoria: registro.categoria || null,
        problema_casco: registro.problemaCasco === 'Sim',
        problema_casco_obs: registro.problemaCascoObs || null,
        sintomas_pneumonia: registro.sintomasPneumonia === 'Sim',
        sintomas_pneumonia_obs: registro.sintomasPneumoniaObs || null,
        picado_cobra: registro.picadoCobra === 'Sim',
        picado_cobra_obs: registro.picadoCobraObs || null,
        incoordenacao_tremores: registro.incoordenacaoTremores === 'Sim',
        incoordenacao_tremores_obs: registro.incoordenacaoTremoresObs || null,
        febre_alta: registro.febreAlta === 'Sim',
        febre_alta_obs: registro.febreAltaObs || null,
        presenca_sangue: registro.presencaSangue === 'Sim',
        presenca_sangue_obs: registro.presencaSangueObs || null,
        fraturas: registro.fraturas === 'Sim',
        fraturas_obs: registro.fraturasObs || null,
        desordens_digestivas: registro.desordensDigestivas === 'Sim',
        desordens_digestivas_obs: registro.desordensDigestivasObs || null,
        tratamento: registro.tratamento || null,
      }
    case 'entrada-insumos':
      return {
        ...baseData,
        data_entrada: registro.dataEntrada,
        horario: registro.horario || null,
        produto: registro.produto || null,
        quantidade: registro.quantidade || null,
        valor_unitario: registro.valorUnitario || null,
        valor_total: registro.valorTotal || null,
        nota_fiscal: registro.notaFiscal || null,
        fornecedor: registro.fornecedor || null,
        placa: registro.placa || null,
        motorista: registro.motorista || null,
        responsavel: registro.responsavelRecebimento || null,
      }
    case 'saida-insumos':
      return {
        ...baseData,
        data_producao: registro.dataProducao,
        dieta: registro.dietaProduzida || null,
        destino: registro.destinoProducao || null,
        total: registro.totalProduzido || null,
      }
    default:
      return baseData
  }
}

// Função para gravar no Supabase
async function syncToSupabase(store: CadernetaStore, registro: Registro, fazendaId: string, operation: 'create' | 'update'): Promise<void> {
  try {
    const tableName = CADERNETA_TO_SUPABASE_TABLE[store]
    const data = registroToSupabase(store, registro, fazendaId)

    if (operation === 'create') {
      switch (tableName) {
        case 'registros_maternidade':
          await supabaseService.createRegistroMaternidade(data)
          break
        case 'registros_pastagens':
          await supabaseService.createRegistroPastagens(data)
          break
        case 'registros_rodeio':
          await supabaseService.createRegistroRodeio(data)
          break
        case 'registros_suplementacao':
          await supabaseService.createRegistroSuplementacao(data)
          break
        case 'registros_bebedouros':
          await supabaseService.createRegistroBebedouros(data)
          break
        case 'registros_movimentacao':
          await supabaseService.createRegistroMovimentacao(data)
          break
        case 'registros_enfermaria':
          await supabaseService.createRegistroEnfermaria(data)
          break
        case 'registros_entrada_insumos':
          await supabaseService.createRegistroEntradaInsumos(data)
          break
        case 'registros_saida_insumos':
          await supabaseService.createRegistroSaidaInsumos(data)
          break
      }
      console.log(`[SUPABASE] Registro criado com sucesso em ${tableName}`)
    } else if (operation === 'update' && registro.supabaseId) {
      const supabaseId = registro.supabaseId as string
      switch (tableName) {
        case 'registros_maternidade':
          await supabaseService.updateRegistroMaternidade(supabaseId, data)
          break
        case 'registros_pastagens':
          await supabaseService.updateRegistroPastagens(supabaseId, data)
          break
        case 'registros_rodeio':
          await supabaseService.updateRegistroRodeio(supabaseId, data)
          break
        case 'registros_suplementacao':
          await supabaseService.updateRegistroSuplementacao(supabaseId, data)
          break
        case 'registros_bebedouros':
          await supabaseService.updateRegistroBebedouros(supabaseId, data)
          break
        case 'registros_movimentacao':
          await supabaseService.updateRegistroMovimentacao(supabaseId, data)
          break
        case 'registros_enfermaria':
          await supabaseService.updateRegistroEnfermaria(supabaseId, data)
          break
        case 'registros_entrada_insumos':
          await supabaseService.updateRegistroEntradaInsumos(supabaseId, data)
          break
        case 'registros_saida_insumos':
          await supabaseService.updateRegistroSaidaInsumos(supabaseId, data)
          break
      }
      console.log(`[SUPABASE] Registro atualizado com sucesso em ${tableName}`)
    }
  } catch (error) {
    console.error(`[SUPABASE] Erro ao sincronizar para ${store}:`, error)
    throw error
  }
}

export async function processQueue(planilhaUrl: string, fazendaId?: string): Promise<{ synced: number; failed: number }> {
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

      // Dual-Write: Sempre grava no Google Sheets (atual)
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

      // Dual-Write: Se flag ativada, grava também no Supabase
      if (USE_SUPABASE && fazendaId) {
        try {
          await syncToSupabase(item.store, registro, fazendaId, item.operation)
          // Salvar supabaseId no registro para updates futuros
          if (item.operation === 'create') {
            // Nota: Precisamos obter o ID do Supabase após create
            // Por enquanto, vamos apenas logar sucesso
          }
        } catch (supabaseError) {
          // Se Supabase falhar, não quebra o fluxo
          // O sistema continua funcionando com Google Sheets
          console.error('[DUAL-WRITE] Erro ao gravar no Supabase, continuando com Google Sheets:', supabaseError)
        }
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

import {
  getSyncQueue,
  getRegistro,
  addToSyncQueue,
  removeFromSyncQueue,
  updateSyncStatus,
  SyncQueueItem,
  CadernetaStore,
} from './indexedDB'
import { BACKEND_URL, MAX_RETRY_COUNT } from '../utils/constants'
import { generateId } from '../utils/generateId'
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
    dispositivo_id: null,
    nome_usuario: registro.usuario || null,
    sync_status: 'synced',
    version: registro.version || 1,
  }

  switch (store) {
    case 'maternidade':
      return {
        ...baseData,
        data: registro.data,
        pasto: registro.pasto || null,
        lote: registro.lote || null,
        peso_cria_kg: registro.pesoCria ? Number(registro.pesoCria) : null,
        numero_cria: registro.numeroCria || null,
        tratamento: Array.isArray(registro.tratamento) ? registro.tratamento.join(', ') : (registro.tratamento || null),
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
        lote: registro.numeroLote || null,
        pasto_saida: registro.pastoSaida || null,
        avaliacao_saida: registro.avaliacaoSaida ? Number(registro.avaliacaoSaida) : null,
        pasto_entrada: registro.pastoEntrada || null,
        avaliacao_entrada: registro.avaliacaoEntrada ? Number(registro.avaliacaoEntrada) : null,
        vaca: Number(registro.vaca) || 0,
        touro: Number(registro.touro) || 0,
        bezerro: Number(registro.bezerro) || 0,
        boi_magro: Number(registro.boiMagro) || 0,
        garrote: Number(registro.garrote) || 0,
        novilha: Number(registro.novilha) || 0,
      }
    case 'rodeio':
      return {
        ...baseData,
        data: registro.data,
        pasto: registro.pasto || null,
        lote: registro.numeroLote || null,
        vaca: Number(registro.vaca) || 0,
        touro: Number(registro.touro) || 0,
        bezerro: Number(registro.bezerro) || 0,
        boi: Number(registro.boiGordo) || 0,
        garrote: Number(registro.garrote) || 0,
        novilha: Number(registro.novilha) || 0,
        total_cabecas: Number(registro.totalCabecas) || 0,
        escore_gado_ideal: registro.escoreGadoIdeal === 'S' || registro.escoreGadoIdeal === 'Sim',
        escore_gado_ideal_obs: registro.escoreGadoIdealObs || null,
        agua_boa_bebedouro: registro.aguaBoaBebedouro === 'S' || registro.aguaBoaBebedouro === 'Sim',
        agua_boa_bebedouro_obs: registro.aguaBoaBebedouroObs || null,
        pastagem_adequada: registro.pastagemAdequada === 'S' || registro.pastagemAdequada === 'Sim',
        pastagem_adequada_obs: registro.pastagemAdequadaObs || null,
        animais_doentes: registro.animaisDoentes === 'S' || registro.animaisDoentes === 'Sim',
        animais_doentes_obs: registro.animaisDoentesObs || null,
        cercas_cochos: registro.cercasCochos === 'S' || registro.cercasCochos === 'Sim',
        cercas_cochos_obs: registro.cercasCochosObs || null,
        carrapatos_moscas: registro.carrapatosMoscas === 'S' || registro.carrapatosMoscas === 'Sim',
        carrapatos_moscas_obs: registro.carrapatosMoscasObs || null,
        animais_entrevero: registro.animaisEntrevero === 'S' || registro.animaisEntrevero === 'Sim',
        animais_entrevero_obs: registro.animaisEntreveroObs || null,
        animal_morto: registro.animalMorto === 'S' || registro.animalMorto === 'Sim',
        animal_morto_obs: registro.animalMortoObs || null,
        animais_tratados: Number(registro.animaisTratados) || 0,
        escore_fezes: registro.escoreFezes ? Number(registro.escoreFezes) : null,
        equipe: registro.equipe ? Number(registro.equipe) : null,
        procedimentos: Array.isArray(registro.procedimentos) ? registro.procedimentos : null,
      }
    case 'suplementacao': {
      const supCats = Array.isArray(registro.categorias) ? registro.categorias as string[] : []
      return {
        ...baseData,
        data: registro.data,
        tratador: registro.tratador || null,
        pasto: registro.pasto || null,
        lote: registro.numeroLote || null,
        produto: registro.produto || null,
        gado: (registro.categoriasString as string) || null,
        vaca: supCats.includes('Vaca'),
        touro: supCats.includes('Touro'),
        bezerro: supCats.includes('Bezerro'),
        boi: supCats.includes('Boi'),
        garrote: supCats.includes('Garrote'),
        novilha: supCats.includes('Novilha'),
        leitura: registro.leituraCocho ? Number(registro.leituraCocho) : null,
        sacos: registro.kgCocho ? Number(registro.kgCocho) : 0,
        kg_cocho: registro.kgCocho ? Number(registro.kgCocho) : 0,
        kg_deposito: registro.kgDeposito ? Number(registro.kgDeposito) : 0,
        creep: registro.creepKg ? Number(registro.creepKg) : 0,
      }
    }
    case 'bebedouros':
      return {
        ...baseData,
        data: registro.data,
        responsavel: registro.responsavel || null,
        pasto: registro.pasto || null,
        lote: registro.numeroLote || null,
        gado: registro.categoria || null,
        categoria: registro.categoria || null,
        leitura_bebedouro: registro.leituraBebedouro ? Number(registro.leituraBebedouro) : null,
        numero_bebedouro: registro.numeroBebedouro || null,
        observacao: registro.observacao || null,
      }
    case 'movimentacao': {
      const cats = Array.isArray(registro.categorias) ? registro.categorias as string[] : []
      const catStr = (registro.categoria as string) || ''
      return {
        ...baseData,
        data: registro.data,
        lote_origem: registro.loteOrigem || null,
        lote_destino: registro.loteDestino || null,
        numero_cabecas: registro.numeroCabecas ? Number(registro.numeroCabecas) : null,
        peso_medio_kg: registro.pesoMedio ? Number(registro.pesoMedio) : null,
        vaca: cats.includes('Vaca') || catStr.includes('Vaca'),
        touro: cats.includes('Touro') || catStr.includes('Touro'),
        bezerro: cats.includes('Bezerro') || catStr.includes('Bezerro'),
        boi_gordo: cats.includes('Boi Gordo') || catStr.includes('Boi Gordo'),
        boi_magro: cats.includes('Boi Magro') || catStr.includes('Boi Magro'),
        garrote: cats.includes('Garrote') || catStr.includes('Garrote'),
        novilha: cats.includes('Novilha') || catStr.includes('Novilha'),
        tropa: cats.includes('Tropa') || catStr.includes('Tropa'),
        outros: cats.includes('Outros') || catStr.includes('Outros'),
        motivo_movimentacao: registro.motivoMovimentacao || null,
        brinco_chip: registro.brincoChip || null,
        causa_observacao: registro.causaObservacao || null,
      }
    }
    case 'enfermaria':
      return {
        ...baseData,
        data: registro.data,
        pasto: registro.pasto || null,
        lote: registro.lote || null,
        brinco_chip: registro.brincoChip || null,
        categoria: registro.categoria || null,
        problema_casco: registro.problemaCasco === 'S' || registro.problemaCasco === 'Sim',
        problema_casco_obs: registro.problemaCascoObs || null,
        sintomas_pneumonia: registro.sintomasPneumonia === 'S' || registro.sintomasPneumonia === 'Sim',
        sintomas_pneumonia_obs: registro.sintomasPneumoniaObs || null,
        picado_cobra: registro.picadoCobra === 'S' || registro.picadoCobra === 'Sim',
        picado_cobra_obs: registro.picadoCobraObs || null,
        incoordenacao_tremores: registro.incoordenacaoTremores === 'S' || registro.incoordenacaoTremores === 'Sim',
        incoordenacao_tremores_obs: registro.incoordenacaoTremoresObs || null,
        febre_alta: registro.febreAlta === 'S' || registro.febreAlta === 'Sim',
        febre_alta_obs: registro.febreAltaObs || null,
        presenca_sangue: registro.presencaSangue === 'S' || registro.presencaSangue === 'Sim',
        presenca_sangue_obs: registro.presencaSangueObs || null,
        fraturas: registro.fraturas === 'S' || registro.fraturas === 'Sim',
        fraturas_obs: registro.fraturasObs || null,
        desordens_digestivas: registro.desordensDigestivas === 'S' || registro.desordensDigestivas === 'Sim',
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
        responsavel_recebimento: registro.responsavelRecebimento || null,
      }
    case 'saida-insumos':
      return {
        ...baseData,
        data_producao: registro.dataProducao,
        dieta_produzida: registro.dietaProduzida || null,
        destino_producao: registro.destinoProducao || null,
        total_produzido: registro.totalProduzido ? Number(registro.totalProduzido) : null,
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
      // Se usando Supabase com fazendaId, gravar direto no Supabase
      if (USE_SUPABASE && fazendaId) {
        await syncToSupabase(item.store, registro, fazendaId, item.operation)
        await updateSyncStatus(item.store, item.registroId, 'synced')
        console.log(`[SUPABASE] Registro sincronizado com sucesso: ${item.store}/${item.registroId}`)
      }

      // Se tem planilhaUrl, gravar no Google Sheets
      if (planilhaUrl) {
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
      }

      await removeFromSyncQueue(item.id)
      synced++
    } catch (err) {
      console.error(`[SYNC] Erro ao sincronizar ${item.store}/${item.registroId}:`, err)
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

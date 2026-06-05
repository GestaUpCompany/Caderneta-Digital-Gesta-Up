import {
  getSyncQueue,
  getRegistro,
  addToSyncQueue,
  removeFromSyncQueue,
  updateSyncStatus,
  updateRegistro,
  getAllRegistros,
  SyncQueueItem,
  CadernetaStore,
} from './indexedDB'
import { MAX_RETRY_COUNT } from '../utils/constants'
import { generateId } from '../utils/generateId'
import { Registro } from '../types/cadernetas'
import * as supabaseService from './supabaseService'
import { brWithTimeToIso } from '../utils/formatDate'

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

// Mapeamento de CadernetaStore para tabelas do Supabase
const CADERNETA_TO_SUPABASE_TABLE: Record<CadernetaStore, string | string[]> = {
  maternidade: 'registros_maternidade',
  pastagens: 'registros_pastagens',
  rodeio: 'registros_rodeio',
  suplementacao: 'registros_suplementacao',
  bebedouros: 'registros_bebedouros',
  movimentacao: 'registros_movimentacao',
  enfermaria: 'registros_enfermaria',
  morte: 'registros_morte',
  clima: 'registros_clima',
  abastecimento: 'registros_abastecimento',
  cantina: 'registros_cantina',
  limpeza: 'registros_limpeza',
  'operacoes-maquinas': 'registros_operacoes_maquinas',
  'manutencao-maquinas': 'registros_manutencao_maquinas',
  'entrada-insumos': 'registros_entrada_insumos',
  'entrada-insumos-itens': 'entrada_insumos_itens',
  'saida-insumos': 'registros_saida_insumos',
  'insumos-por-saida': 'insumos_por_saida',
  problemas: 'registros_problemas',
  almoxarifado: 'registros_almoxarifado',
  'leitura-cocho': 'registros_leitura_cocho',
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
        data: brWithTimeToIso(registro.data),
        pasto: registro.pasto || null,
        lote: registro.lote || null,
        lote_id: registro.loteId || null,
        peso_cria_kg: registro.pesoCria ? Number(registro.pesoCria) : null,
        id_provisorio_cria: registro.idProvisorioCria || null,
        id_brinco_cria: registro.idBrincoCria || null,
        id_chip_cria: registro.idChipCria || null,
        tratamento: Array.isArray(registro.tratamento) ? registro.tratamento.join(', ') : (registro.tratamento || null),
        tipo_parto: Array.isArray(registro.tipoParto) ? registro.tipoParto : (registro.tipoParto ? [registro.tipoParto] : []),
        observacao_parto: registro.observacaoParto || null,
        sexo: registro.sexo || null,
        raca: registro.raca || null,
        id_brinco_mae: registro.idBrincoMae || null,
        id_chip_mae: registro.idChipMae || null,
        categoria_mae: registro.categoriaMae || null,
        escore_matriz: registro.escoreMatriz ? Number(registro.escoreMatriz) : null,
        docilidade_matriz: registro.docilidadeMatriz ? Number(registro.docilidadeMatriz) : null,
      }
    case 'pastagens':
      return {
        ...baseData,
        data: brWithTimeToIso(registro.data),
        manejador: registro.manejador || null,
        lote: registro.numeroLote || null,
        pasto_saida: registro.pastoSaida || null,
        pasto_saida_area_util: registro.pastoSaidaAreaUtil || null,
        pasto_saida_especie: registro.pastoSaidaEspecie || null,
        avaliacao_saida: registro.avaliacaoSaida ? Number(registro.avaliacaoSaida) : null,
        pasto_entrada: registro.pastoEntrada || null,
        pasto_entrada_area_util: registro.pastoEntradaAreaUtil || null,
        pasto_entrada_especie: registro.pastoEntradaEspecie || null,
        avaliacao_entrada: registro.avaliacaoEntrada ? Number(registro.avaliacaoEntrada) : null,
        gado_contado: registro.gadoContado || null,
        total_animais: registro.totalAnimais || 0,
        vaca: Number(registro.vaca) || 0,
        touro: Number(registro.touro) || 0,
        bezerro: Number(registro.bezerro) || 0,
        boi_magro: Number(registro.boiMagro) || 0,
        garrote: Number(registro.garrote) || 0,
        novilha: Number(registro.novilha) || 0,
        escore_gado: registro.escoreGado ? Number(registro.escoreGado) : null,
        avaliacao_geral: {
          bebedourosCochos: {
            valor: registro.bebedourosCochos || null,
            observacao: registro.bebedourosCochosObs || null,
          },
          pastagensTaxaLotacao: {
            valor: registro.pastagensTaxaLotacao || null,
            observacao: registro.pastagensTaxaLotacaoObs || null,
          },
          animaisMachucadosDoentesBichados: {
            valor: registro.animaisMachucadosDoentesBichados || null,
            observacao: registro.animaisMachucadosDoentesBichadosObs || null,
          },
          cercasCochosPorteiras: {
            valor: registro.cercasCochosPorteiras || null,
            observacao: registro.cercasCochosPorteirasObs || null,
          },
          carrapatosMoscas: {
            valor: registro.carrapatosMoscas || null,
            observacao: registro.carrapatosMoscasObs || null,
          },
          animaisEntreverados: {
            valor: registro.animaisEntreverados || null,
            observacao: registro.animaisEntreveradosObs || null,
          },
          animalMorto: {
            valor: registro.animalMorto || null,
            observacao: registro.animalMortoObs || null,
          },
        },
        escore_fezes: registro.escoreFezes ? Number(registro.escoreFezes) : null,
        numero_pessoas_manejo: registro.numeroPessoasManejo ? Number(registro.numeroPessoasManejo) : null,
        equipe_nomes: (registro.equipeNomes as any) && (registro.equipeNomes as any).length > 0 ? JSON.stringify(registro.equipeNomes) : null,
      }
    case 'rodeio':
      return {
        ...baseData,
        data: brWithTimeToIso(registro.data),
        pasto: registro.pasto || null,
        lote: registro.numeroLote || null,
        gado_contado: registro.gadoContado || null,
        vaca: Number(registro.vaca) || 0,
        touro: Number(registro.touro) || 0,
        bezerro: Number(registro.bezerro) || 0,
        boi: Number(registro.boiGordo) || 0,
        garrote: Number(registro.garrote) || 0,
        novilha: Number(registro.novilha) || 0,
        total_cabecas: Number(registro.totalCabecas) || 0,
        diagnosticos: registro.diagnosticos || {},
        escore_fezes: registro.escoreFezes ? Number(registro.escoreFezes) : null,
        equipe: registro.equipe ? Number(registro.equipe) : null,
        equipe_nomes: registro.equipeNomes || null,
        escore_gado: registro.escoreGado ? Number(registro.escoreGado) : null,
      }
    case 'suplementacao': {
      // Remove espacamento_cocho_ideal from checklist if it exists (migrated field)
      let cleanedChecklist = registro.checklist ? { ...registro.checklist } as any : null
      if (cleanedChecklist && cleanedChecklist.espacamento_cocho_ideal) {
        delete cleanedChecklist.espacamento_cocho_ideal
      }

      return {
        ...baseData,
        data: brWithTimeToIso(registro.data),
        tratador: registro.tratador || null,
        pasto: registro.pasto || null,
        lote: registro.numeroLote || null,
        produto: registro.produto || null,
        categorias: (registro.categoriasString as string) || null,
        leitura: registro.leituraCocho ? Number(registro.leituraCocho) : null,
        sacos: registro.kgCocho ? Number(registro.kgCocho) : 0,
        kg_cocho: registro.kgCocho ? Number(registro.kgCocho) : 0,
        kg_deposito: registro.kgDeposito ? Number(registro.kgDeposito) : 0,
        escore_fezes: registro.escoreFezes ? Number(registro.escoreFezes) : null,
        espacamento_cocho_detalhes: registro.espacamentoCochoDetalhes || null,
        espacamento_cocho_cm_cab: registro.espacamentoCochoCmCab ? Number(registro.espacamentoCochoCmCab) : null,
        espacamento_cocho_obs: registro.espacamentoCochoObs || null,
        espacamento_cocho_ideal: null, // Temporary field for migration
        checklist: cleanedChecklist || null,
      }
    }
    case 'bebedouros':
      return {
        ...baseData,
        data: brWithTimeToIso(registro.data),
        responsavel: registro.responsavel || null,
        pasto: registro.pasto || null,
        lote: registro.numeroLote || null,
        leitura_bebedouro: registro.leituraBebedouro ? Number(registro.leituraBebedouro) : null,
        numero_bebedouro: registro.numeroBebedouro || null,
        observacao: registro.observacao || null,
        checklist: registro.checklist || null,
      }
    case 'movimentacao': {
      return {
        ...baseData,
        data: brWithTimeToIso(registro.data),
        responsavel: registro.responsavel || null,
        lote_origem: registro.loteOrigem || null,
        lote_origem_id: registro.loteOrigemId || null,
        destino: registro.loteDestino || null,
        lote_destino_id: registro.loteDestinoId || null,
        numero_cabecas: registro.numeroCabecas ? Number(registro.numeroCabecas) : null,
        peso_vivo_atual_kg: registro.pesoVivoAtual ? Number(registro.pesoVivoAtual) : null,
        categoria: registro.categoria || null,
        motivo_movimentacao: registro.motivoMovimentacao || null,
        tipo_saida: registro.tipoSaida || null,
        tipo_entrada: registro.tipoEntrada || null,
        tipo_destino: registro.tipoDestino || null,
        brinco: registro.brinco || null,
        chip: registro.chip || null,
        causa_observacao: registro.causaObservacao || null,
      }
    }
    case 'enfermaria':
      return {
        ...baseData,
        data: brWithTimeToIso(registro.data),
        pasto: registro.pasto || null,
        lote: registro.lote || null,
        brinco: registro.brinco || null,
        chip: registro.chip || null,
        sexo: registro.sexo || null,
        raca: registro.raca || null,
        idade: registro.idade || null,
        categoria: registro.categoria || null,
        diagnosticos: registro.diagnosticos || {},
        medicamentos: registro.medicamentos || [],
        tratamento_obs: registro.observacaoTratamento || null,
      }
    case 'morte':
      return {
        ...baseData,
        nome_usuario: registro.responsavel || null,
        data: brWithTimeToIso(registro.data),
        pasto: registro.pasto || null,
        lote: registro.lote || null,
        lote_id: registro.loteId || null,
        brinco: registro.brinco || null,
        chip: registro.chip || null,
        categoria: registro.categoria || null,
        categoria_outros: registro.categoriaOutros || null,
        sexo: registro.sexo || null,
        raca: registro.raca || null,
        idade: registro.idade || null,
        peso_vivo: registro.pesoVivo ? Number(registro.pesoVivo) : null,
        causa_morte: registro.causaMorte || null,
        escore: registro.escore ? Number(registro.escore) : null,
        nutricao_atual: registro.nutricaoAtual || null,
        nutricao_anterior: registro.nutricaoAnterior || null,
        diagnosticos: registro.diagnosticos || {},
      }
    case 'clima':
      return {
        ...baseData,
        data: brWithTimeToIso(registro.data),
        responsavel: registro.responsavel,
        temperatura_media: registro.temperaturaMedia ? Number(registro.temperaturaMedia) : null,
        umidade_relativa: registro.umidadeRelativa ? Number(registro.umidadeRelativa) : null,
        observacao: registro.observacao || null,
        medicoes: registro.medicoes || [],
      }
    case 'abastecimento':
      return {
        ...baseData,
        data: brWithTimeToIso(registro.data),
        nome_usuario: registro.nomeUsuario || null,
        quem_abasteceu: registro.quemAbasteceu || null,
        operador_motorista: registro.operadorMotorista || null,
        maquina_veiculo: registro.maquinaVeiculo || null,
        maquina_veiculo_id: registro.maquinaVeiculoId || null,
        placa: registro.placa || null,
        total_abastecido: registro.totalAbastecido ? Number(registro.totalAbastecido) : null,
        combustivel: registro.combustivel || null,
        odometro_horimetro: registro.odometro || null,
        tipo_operacao: registro.tipoOperacao || null,
        tipo_operacao_outros: registro.tipoOperacaoOutros || null,
        observacao: registro.observacao || null,
      }
    case 'cantina':
      return {
        ...baseData,
        data: brWithTimeToIso(registro.data),
        nome_usuario: registro.nomeUsuario || null,
        numero_cozinheiras: registro.numeroCozinheiras ? Number(registro.numeroCozinheiras) : null,
        quem_cozinhou: registro.quemCozinhou || null,
        quem_ajudou: registro.quemAjudou || null,
        numero_cafe_manha: registro.numeroCafeManha ? Number(registro.numeroCafeManha) : null,
        numero_lanches: registro.numeroLanches ? Number(registro.numeroLanches) : null,
        numero_refeicoes_almoco: registro.numeroRefeicoesAlmoco ? Number(registro.numeroRefeicoesAlmoco) : null,
        numero_refeicoes_jantar: registro.numeroRefeicoesJantar ? Number(registro.numeroRefeicoesJantar) : null,
        itens: registro.itens || null,
        nome_outros: registro.nomeOutros || null,
        quantidade_outros: registro.quantidadeOutros || null,
        unidade_outros: registro.unidadeOutros || null,
        observacao: registro.observacao || null,
      }
    case 'limpeza':
      return {
        ...baseData,
        data: brWithTimeToIso(registro.data),
        nome_usuario: registro.nomeUsuario || null,
        numero_equipe: registro.numeroEquipe ? Number(registro.numeroEquipe) : null,
        setor: registro.setor || null,
        local: registro.local || null,
        hora_inicio: registro.horaInicio || null,
        hora_final: registro.horaFinal || null,
        limpeza_realizada: {
          limpezaRealizada: registro.limpezaRealizada || null,
          tarefas: registro.tarefas || null,
        },
        observacao: registro.observacao || null,
      }
    case 'operacoes-maquinas':
      return {
        ...baseData,
        data: brWithTimeToIso(registro.data),
        veiculo_trator: registro.maquinaVeiculo || '',
        maquina_veiculo_id: registro.maquinaVeiculoId || null,
        implemento_utilizado: registro.implementoUtilizado || '',
        hora_inicial: registro.horaInicial || null,
        hora_final: registro.horaFinal || null,
        odometro_horimetro_inicial: registro.odometroHorimetroInicial || '',
        odometro_horimetro_final: registro.odometroHorimetroFinal || '',
        total_odometro_horimetro: registro.totalOdometroHorimetro || null,
        tipo_operacao: registro.tipoOperacao || '',
        aplicacoes: registro.aplicacoes || null,
        checklist: registro.checklist || null,
        observacao: registro.observacao || null,
      }
    case 'entrada-insumos':
      return {
        ...baseData,
        data_entrada: brWithTimeToIso(registro.dataEntrada as string),
        horario: registro.horario || null,
        nota_fiscal: registro.notaFiscal || null,
        fornecedor: registro.fornecedor || null,
        placa: registro.placa || null,
        motorista: registro.motorista || null,
        responsavel_recebimento: registro.responsavelRecebimento || null,
      }
    case 'entrada-insumos-itens':
      return {
        entrada_id: registro.entradaId,
        insumo_id: registro.insumoId,
        produto: registro.produto || null,
        quantidade: registro.quantidade || null,
        valor_unitario: registro.valorUnitario || null,
        valor_total: registro.valorTotal || null,
      }
    case 'saida-insumos':
      return {
        ...baseData,
        data_producao: brWithTimeToIso(registro.dataProducao as string),
        dieta_produzida: registro.dietaProduzida || null,
        destino_producao: registro.destinoProducao || null,
        total_produzido: registro.totalProduzido ? Number(registro.totalProduzido) : null,
      }
    case 'manutencao-maquinas':
      return {
        ...baseData,
        data: brWithTimeToIso(registro.data),
        responsavel_checklist: registro.responsavelChecklist || null,
        operador_motorista: registro.operadorMotorista || null,
        maquina_veiculo: registro.maquinaVeiculo || null,
        placa: registro.placa || null,
        odometro_horimetro: registro.odometro || null,
        checklist: registro.checklist || null,
        observacao: registro.observacao || null,
      }
    case 'problemas':
      return {
        ...baseData,
        data: brWithTimeToIso(registro.data),
        setor: registro.setor || null,
        local: registro.local || null,
        descricao_problema: registro.descricaoProblema || null,
        causa_identificada: registro.causaIdentificada === 'S',
        causa_identificada_obs: registro.causaIdentificadaObs || null,
        acao_corretiva_realizada: registro.acaoCorretivaRealizada === 'S',
        acao_corretiva_realizada_obs: registro.acaoCorretivaRealizadaObs || null,
        tipo_ocorrencia: registro.tipoOcorrencia || null,
        tipo_ocorrencia_obs: registro.tipoOcorrenciaObs || null,
        causa_raiz_identificada: registro.causaRaizIdentificada === 'S',
        causa_raiz_identificada_obs: registro.causaRaizIdentificadaObs || null,
        gravidade_impacto: registro.gravidadeImpacto || null,
        gravidade_impacto_obs: registro.gravidadeImpactoObs || null,
        tipo_problema: registro.tipoProblema || null,
        tipo_problema_obs: registro.tipoProblemaObs || null,
        prioridade: registro.prioridade || null,
        setor_resolve: registro.setorResolve || null,
      }
    case 'almoxarifado':
      return {
        ...baseData,
        data: brWithTimeToIso(registro.data),
        quem_entregou: registro.quemEntregou || null,
        quem_pegou: registro.quemPegou || null,
        itens: registro.itens || [],
        observacao: registro.observacao || null,
      }
    case 'leitura-cocho':
      return {
        ...baseData,
        data: brWithTimeToIso(registro.data),
        pasto_curral: registro.pastoCurral || null,
        lote: registro.numeroLote || null,
        quantidade_cabecas: registro.quantidadeCabecas ? Number(registro.quantidadeCabecas) : null,
        media_ms: registro.mediaMS ? Number(registro.mediaMS) : null,
        leitura_cocho: registro.leituraCocho ? Number(registro.leituraCocho) : null,
        observacao: registro.observacao || null,
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
        case 'registros_morte':
          await supabaseService.createRegistroMorte(data)
          break
        case 'registros_clima':
          await supabaseService.createRegistroClima(data)
          break
        case 'registros_abastecimento':
          await supabaseService.createRegistroAbastecimento(data)
          break
        case 'registros_cantina':
          await supabaseService.createRegistroCantina(data)
          break
        case 'registros_limpeza':
          await supabaseService.createRegistroLimpeza(data)
          break
        case 'registros_operacoes_maquinas':
          await supabaseService.createRegistroOperacoesMaquinas(data)
          break
        case 'registros_manutencao_maquinas':
          await supabaseService.createRegistroManutencaoMaquinas(data)
          break
        case 'registros_entrada_insumos':
          const entradaResult = await supabaseService.createRegistroEntradaInsumos(data)
          // Atualizar registro local com ID do Supabase
          await updateRegistro('entrada-insumos', registro.id, {
            ...registro,
            supabaseId: entradaResult.id,
            syncStatus: 'synced'
          })
          // Atualizar itens com o novo ID do Supabase
          const itens = await getAllRegistros('entrada-insumos-itens')
          for (const item of itens) {
            if (item.entradaId === registro.id) {
              await updateRegistro('entrada-insumos-itens', item.id, {
                entradaId: entradaResult.id
              })
            }
          }
          break
        case 'entrada_insumos_itens':
          await supabaseService.createEntradaInsumosItem(data)
          break
        case 'registros_saida_insumos':
          await supabaseService.createRegistroSaidaInsumos(data)
          break
        case 'registros_problemas':
          await supabaseService.createRegistroProblemas(data)
          break
        case 'registros_almoxarifado':
          await supabaseService.createRegistroAlmoxarifado(data)
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
        case 'registros_morte':
          await supabaseService.updateRegistroMorte(supabaseId, data)
          break
        case 'registros_clima':
          await supabaseService.updateRegistroClima(supabaseId, data)
          break
        case 'registros_abastecimento':
          await supabaseService.updateRegistroAbastecimento(supabaseId, data)
          break
        case 'registros_cantina':
          await supabaseService.updateRegistroCantina(supabaseId, data)
          break
        case 'registros_limpeza':
          await supabaseService.updateRegistroLimpeza(supabaseId, data)
          break
        case 'registros_operacoes_maquinas':
          await supabaseService.updateRegistroOperacoesMaquinas(supabaseId, data)
          break
        case 'registros_manutencao_maquinas':
          await supabaseService.updateRegistroManutencaoMaquinas(supabaseId, data)
          break
        case 'registros_entrada_insumos':
          await supabaseService.updateRegistroEntradaInsumos(supabaseId, data)
          break
        case 'entrada_insumos_itens':
          await supabaseService.updateEntradaInsumosItem(supabaseId, data)
          break
        case 'registros_saida_insumos':
          await supabaseService.updateRegistroSaidaInsumos(supabaseId, data)
          break
        case 'registros_problemas':
          await supabaseService.updateRegistroProblemas(supabaseId, data)
          break
        case 'registros_almoxarifado':
          await supabaseService.updateRegistroAlmoxarifado(supabaseId, data)
          break
      }
      console.log(`[SUPABASE] Registro atualizado com sucesso em ${tableName}`)
    }
  } catch (error) {
    console.error(`[SUPABASE] Erro ao sincronizar para ${store}:`, error)
    throw error
  }
}

export async function processQueue(fazendaId?: string): Promise<{ synced: number; failed: number }> {
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
      // Gravar no Supabase
      if (fazendaId) {
        await syncToSupabase(item.store, registro, fazendaId, item.operation)
        await updateSyncStatus(item.store, item.registroId, 'synced')
        console.log(`[SUPABASE] Registro sincronizado com sucesso: ${item.store}/${item.registroId}`)
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

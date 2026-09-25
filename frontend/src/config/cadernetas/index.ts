import { CadernetaDisplayConfig } from '../registroDisplayConfig'
import { CadernetaStore } from '../../services/indexedDB'
import { pastagensConfig } from './pastagens'
import { maternidadeConfig } from './maternidade'
import { rodeioConfig } from './rodeio'
import { suplementacaoConfig } from './suplementacao'
import { bebedourosConfig } from './bebedouros'
import { movimentacaoConfig } from './movimentacao'
import { enfermariaConfig } from './enfermaria'
import { morteConfig } from './morte'
import { climaConfig } from './clima'
import { abastecimentoConfig } from './abastecimento'
import { cantinaConfig } from './cantina'
import { limpezaConfig } from './limpeza'
import { problemasConfig } from './problemas'
import { almoxarifadoConfig } from './almoxarifado'
import { operacoesMaquinasConfig } from './operacoesMaquinas'
import { manutencaoMaquinasConfig } from './manutencaoMaquinas'
import { entradaInsumosConfig } from './entradaInsumos'
import { saidaInsumosConfig } from './saidaInsumos'
import { pesagemConfig } from './pesagem'
import { entradaAlmoxarifadoConfig } from './entradaAlmoxarifado'
import { entradaCantinaConfig } from './entradaCantina'
import { ordensServicoConfig } from './ordensServico'
import { osRecebimentosConfig } from './osRecebimentos'
import { leituraCochoConfig } from './leituraCocho'
import { tratoConfinamentoConfig } from './tratoConfinamento'

export const CADERNETA_DISPLAY_CONFIG: Partial<Record<CadernetaStore, CadernetaDisplayConfig>> = {
  pastagens: pastagensConfig,
  maternidade: maternidadeConfig,
  rodeio: rodeioConfig,
  suplementacao: suplementacaoConfig,
  bebedouros: bebedourosConfig,
  movimentacao: movimentacaoConfig,
  enfermaria: enfermariaConfig,
  morte: morteConfig,
  clima: climaConfig,
  abastecimento: abastecimentoConfig,
  cantina: cantinaConfig,
  limpeza: limpezaConfig,
  problemas: problemasConfig,
  almoxarifado: almoxarifadoConfig,
  'operacoes-maquinas': operacoesMaquinasConfig,
  'manutencao-maquinas': manutencaoMaquinasConfig,
  'entrada-insumos': entradaInsumosConfig,
  'saida-insumos': saidaInsumosConfig,
  pesagem: pesagemConfig,
  'entrada-almoxarifado': entradaAlmoxarifadoConfig,
  'entrada-cantina': entradaCantinaConfig,
  'ordens-servico': ordensServicoConfig,
  'os-recebimentos': osRecebimentosConfig,
  'leitura-cocho': leituraCochoConfig,
  'trato-confinamento': tratoConfinamentoConfig,
}

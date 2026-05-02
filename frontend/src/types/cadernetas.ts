export type SyncStatus = 'pending' | 'synced' | 'conflict' | 'error'

export interface Registro {
  id: string
  googleRowId?: number
  supabaseId?: string
  version: number
  lastModified: string
  syncStatus: SyncStatus
  data: string
  usuario?: string
  dispositivoId?: string
  [key: string]: unknown
}

export interface RegistroMaternidade extends Registro {
  pasto: string
  lote: string
  pesoCria: number | null
  numeroCria: string
  tratamento: string
  tipoParto: string
  sexo: string
  raca: string
  numeroMae: string
  categoriaMae: string
}

export interface RegistroPastagens extends Registro {
  manejador: string
  numeroLote: string
  pastoSaida: string
  avaliacaoSaida: string
  pastoEntrada: string
  avaliacaoEntrada: string
  vaca: number
  touro: number
  bezerro: number
  boiMagro: number
  garrote: number
  novilha: number
}

export interface RegistroRodeio extends Registro {
  pasto: string
  numeroLote: string
  vaca: number
  touro: number
  bezerro: number
  boi: number
  garrote: number
  novilha: number
  totalCabecas: number
  escoreGadoIdeal: 'S' | 'N'
  escoreGadoIdealObs: string
  aguaBoaBebedouro: 'S' | 'N'
  aguaBoaBebedouroObs: string
  pastagemAdequada: 'S' | 'N'
  pastagemAdequadaObs: string
  animaisDoentes: 'S' | 'N'
  animaisDoentesObs: string
  cercasCochos: 'S' | 'N'
  cercasCochosObs: string
  carrapatosMoscas: 'S' | 'N'
  carrapatosMoscasObs: string
  animaisEntrevero: 'S' | 'N'
  animaisEntreveroObs: string
  animalMorto: 'S' | 'N'
  animalMortoObs: string
  animaisTratados: number
  escoreFezes: number | null
  equipe: number | null
  procedimentos: string[]
}

export interface RegistroSuplementacao extends Registro {
  tratador: string
  pasto: string
  numeroLote: string
  produto: string
  gado: string
  vaca: 'S' | 'N'
  touro: 'S' | 'N'
  bezerro: 'S' | 'N'
  boi: 'S' | 'N'
  garrote: 'S' | 'N'
  novilha: 'S' | 'N'
  leitura: number | null
  sacos: number
  kgCocho: number
  kgDeposito: number
  creep: number
}

export interface RegistroBebedouros extends Registro {
  responsavel: string
  pasto: string
  numeroLote: string
  gado: string
  categoria: string
  leituraBebedouro: number | null
  numeroBebedouro: string
  observacao: string
}

export interface RegistroMovimentacao extends Registro {
  loteOrigem: string
  loteDestino: string
  numeroCabecas: number
  pesoMedio: number | null
  vaca: 'S' | 'N'
  touro: 'S' | 'N'
  boiGordo: 'S' | 'N'
  boiMagro: 'S' | 'N'
  garrote: 'S' | 'N'
  bezerro: 'S' | 'N'
  novilha: 'S' | 'N'
  tropa: 'S' | 'N'
  outros: 'S' | 'N'
  motivoMovimentacao: string
  brincoChip: string
  causaObservacao: string
}

export interface RegistroEnfermaria extends Registro {
  pasto: string
  lote: string
  brincoChip: string
  categoria: string
  tratamento: string
  tratamentoOutros: string
  problemaCasco: 'S' | 'N'
  problemaCascoObs: string
  sintomasPneumonia: 'S' | 'N'
  sintomasPneumoniaObs: string
  picadoCobra: 'S' | 'N'
  picadoCobraObs: string
  incoordenacaoTremores: 'S' | 'N'
  incoordenacaoTremoresObs: string
  febreAlta: 'S' | 'N'
  febreAltaObs: string
  presencaSangue: 'S' | 'N'
  presencaSangueObs: string
  fraturas: 'S' | 'N'
  fraturasObs: string
  desordensDigestivas: 'S' | 'N'
  desordensDigestivasObs: string
}

export interface RegistroEntradaInsumos extends Registro {
  dataEntrada: string
  horario: string
  produto: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
  notaFiscal: string
  fornecedor: string
  placa: string
  motorista: string
  responsavelRecebimento: string
}

export interface RegistroSaidaInsumos extends Registro {
  dataProducao: string
  dietaProduzida: string
  destinoProducao: string
  totalProduzido: number
  insumosQuantidades: Record<string, string>
}

export interface RegistroInsumosPorSaida extends Registro {
  idSaida: string
  dataProducao: string
  dietaProduzida: string
  insumo: string
  quantidade: number
}

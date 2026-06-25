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
  idCria: string
  tratamento: string
  tipoParto: string
  sexo: string
  raca: string
  brincoMae: string
  chipMae: string
  categoriaMae: string
}

export interface RegistroPastagens extends Registro {
  manejador: string
  numeroLote: string
  pastoSaida: string
  pastoSaidaId: string
  avaliacaoSaida: string
  pastoEntrada: string
  pastoEntradaId: string
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
  diagnosticos: {
    [key: string]: {
      valor: string | boolean | null
      observacao: string | null
    }
  }
  animaisTratados: number
  escoreFezes: string | null
  equipe: number | null
  procedimentos: string[]
  escoreGado: number | null
}

export interface RegistroSuplementacao extends Registro {
  tratador: string
  pasto: string
  numeroLote: string
  formulacao: string
  gado: string
  vaca: 'S' | 'N'
  touro: 'S' | 'N'
  bezerro: 'S' | 'N'
  boi: 'S' | 'N'
  garrote: 'S' | 'N'
  novilha: 'S' | 'N'
  leitura: string | null
  kgCocho: number
  kgDeposito: number
}

export interface RegistroBebedouros extends Registro {
  responsavel: string
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
  pesoVivoAtual: number | null
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
  lote: string
  brincoChip: string
  sexo: string
  raca: string
  idade: string
  categoria: string
  tratamento: string
  tratamentoOutros: string
  diagnosticos: {
    [key: string]: {
      valor: boolean | null | 'S' | 'N'
      observacao: string | null
    }
  }
  observacao: string
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

export interface RegistroMorte extends Registro {
  pasto: string
  lote: string
  brincoChip: string
  vaca: number
  touro: number
  boiGordo: number
  boiMagro: number
  garrote: number
  bezerro: number
  novilha: number
  tropa: number
  outros: number
  sexo: string
  raca: string
  racaOutros: string
  idade: string
  pesoVivo: number | null
  causaMorte: string
  causaMorteOutros: string
  escore: number | null
  nutricaoAtual: string | null
  nutricaoAnterior: string | null
  diagnosticos: {
    [key: string]: {
      valor: string | null
      observacao: string
    }
  }
}

export interface RegistroProblemas extends Registro {
  setor: string
  local: string
  descricaoProblema: string
  causaIdentificada: 'S' | 'N'
  causaIdentificadaObs: string
  acaoCorretivaRealizada: 'S' | 'N'
  acaoCorretivaRealizadaObs: string
  tipoOcorrencia: string
  tipoOcorrenciaObs: string
  causaRaizIdentificada: 'S' | 'N'
  causaRaizIdentificadaObs: string
  gravidadeImpacto: string
  gravidadeImpactoObs: string
  tipoProblema: string
  tipoProblemaObs: string
  prioridade: string
}

export interface RegistroManutencaoMaquinas extends Registro {
  responsavelChecklist: string
  operadorMotorista: string
  maquinaVeiculo: string
  placa: string
  odometro: string
  abastecimentoRealizado: boolean
  abastecimentoRealizadoObs: string
  lavagemRealizada: boolean
  lavagemRealizadaObs: string
  vidrosPerfeitos: boolean
  vidrosPerfeitosObs: string
  freiosBons: boolean
  freiosBonsObs: string
  bateriaBoa: boolean
  bateriaBoaObs: string
  conferiuEletrica: boolean
  conferiuEletricaObs: string
  maquinaEngraxada: boolean
  maquinaEngraxadaObs: string
  nivelAguaIdeal: boolean
  nivelAguaIdealObs: string
  conferiuNivelOleo: boolean
  conferiuNivelOleoObs: string
  calibrouPneus: boolean
  calibrouPneusObs: string
  limpouRadiador: boolean
  limpouRadiadorObs: string
  tapetesBons: boolean
  tapetesBonsObs: string
  assentoBom: boolean
  assentoBomObs: string
  observacao: string
}

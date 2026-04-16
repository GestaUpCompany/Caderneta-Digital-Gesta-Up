export type SyncStatus = 'pending' | 'synced' | 'conflict' | 'error'

export interface Registro {
  id: string
  googleRowId?: number
  version: number
  lastModified: string
  syncStatus: SyncStatus
  data: string
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
  avaliacaoSaida: number | null
  pastoEntrada: string
  avaliacaoEntrada: number | null
  vaca: number
  touro: number
  bezerro: number
  boiMagro: number
  garrote: number
  novilha: number
  totalAnimais: number
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
  aguaBoaBebedouro: 'S' | 'N'
  pastagemAdequada: 'S' | 'N'
  animaisDoentes: 'S' | 'N'
  cercasCochos: 'S' | 'N'
  carrapatosMoscas: 'S' | 'N'
  animaisEntreverados: 'S' | 'N'
  animalMorto: 'S' | 'N'
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
  kg: number
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

// Labels comuns compartilhados entre cadernetas
const COMMON_LABELS = {
  data: 'DATA',
  pasto: 'PASTO',
  lote: 'LOTE',
  totalAnimais: 'TOTAL ANIMAIS',
  totalCabecas: 'TOTAL CABEÇAS',
}

// Labels específicos por caderneta
const MATERNIDADE_LABELS = {
  ...COMMON_LABELS,
  numeroCria: 'NÚMERO CRIA',
  numeroMae: 'NÚMERO MÃE',
  sexo: 'SEXO',
  tipoParto: 'TIPO DE PARTO',
  raca: 'RAÇA',
  tratamento: 'TRATAMENTO',
  pesoCria: 'PESO CRIA',
  categoriaMae: 'CATEGORIA MÃE',
}

const PASTAGENS_LABELS = {
  ...COMMON_LABELS,
  manejador: 'MANEJADOR',
  numeroLote: 'NÚMERO LOTE',
  pastoSaida: 'PASTO SAÍDA',
  avaliacaoSaida: 'AVALIAÇÃO SAÍDA',
  pastoEntrada: 'PASTO ENTRADA',
  avaliacaoEntrada: 'AVALIAÇÃO ENTRADA',
  vaca: 'VACA',
  touro: 'TOURO',
  bezerro: 'BEZERRO',
  boiMagro: 'BOI MAGRO',
  garrote: 'GARROTE',
  novilha: 'NOVILHA',
}

const RODEIO_LABELS = {
  ...COMMON_LABELS,
  numeroLote: 'NÚMERO LOTE',
  escoreGadoIdeal: 'ESCORE GADO IDEAL',
  escoreGadoIdealObs: 'Observação',
  aguaBoaBebedouro: 'ÁGUA BOA BEBEDOURO',
  aguaBoaBebedouroObs: 'Observação',
  pastagemAdequada: 'PASTAGEM ADEQUADA',
  pastagemAdequadaObs: 'Observação',
  animaisDoentes: 'ANIMAIS DOENTES',
  animaisDoentesObs: 'Observação',
  cercasCochos: 'CERCAS, COCHOS',
  cercasCochosObs: 'Observação',
  carrapatosMoscas: 'CARRAPATOS, MOSCAS',
  carrapatosMoscasObs: 'Observação',
  animaisEntreverados: 'ANIMAIS ENTREVERADOS',
  animaisEntreveradosObs: 'Observação',
  animalMorto: 'ANIMAL MORTO',
  animalMortoObs: 'Observação',
  animaisTratados: 'ANIMAIS TRATADOS',
  escoreFezes: 'ESCORE FEZES',
  equipe: 'EQUIPE',
}

const SUPLEMENTACAO_LABELS = {
  ...COMMON_LABELS,
  tratador: 'TRATADOR',
  numeroLote: 'NÚMERO LOTE',
  produto: 'PRODUTO',
  gado: 'TIPO DE GADO',
  recria: 'CREEP',
  leitura: 'LEITURA DO COCHO',
  kgCocho: 'KG no cocho',
  kgDeposito: 'KG no depósito',
  sacos: 'SACOS',
  subtipoQtd: 'SUBTIPO/QTD',
}

const BEBEDOUROS_LABELS = {
  ...COMMON_LABELS,
  responsavel: 'RESPONSÁVEL',
  numeroLote: 'NÚMERO LOTE',
  leituraBebedouro: 'LEITURA BEBEDOURO',
  numeroBebedouro: 'NÚMERO BEBEDOURO',
  categoria: 'CATEGORIA',
  observacao: 'OBSERVAÇÃO',
}

const MOVIMENTACAO_LABELS = {
  ...COMMON_LABELS,
  loteOrigem: 'LOTE ORIGEM',
  loteDestino: 'LOTE DESTINO',
  numeroCabecas: 'NÚMERO CABEÇAS',
  pesoMedio: 'PESO MÉDIO',
  motivoMovimentacao: 'MOTIVO',
  brincoChip: 'BRINCO/CHIP',
  causaObservacao: 'CAUSA/OBSERVAÇÃO',
}

// Exportar objeto principal
export const LABELS_BY_CADERNETA: Record<string, Record<string, string>> = {
  maternidade: MATERNIDADE_LABELS,
  pastagens: PASTAGENS_LABELS,
  rodeio: RODEIO_LABELS,
  suplementacao: SUPLEMENTACAO_LABELS,
  bebedouros: BEBEDOUROS_LABELS,
  movimentacao: MOVIMENTACAO_LABELS,
}

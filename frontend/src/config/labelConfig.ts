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
  tempoOcupacao: 'TEMPO OCUPAÇÃO',
  pastoEntrada: 'PASTO ENTRADA',
  avaliacaoEntrada: 'AVALIAÇÃO ENTRADA',
  tempoVedacao: 'TEMPO VEDAÇÃO',
  vaca: 'VACA',
  touro: 'TOURO',
  boiGordo: 'BOI GORDO',
  boiMagro: 'BOI MAGRO',
  garrote: 'GARROTE',
  bezerro: 'BEZERRO',
  novilha: 'NOVILHA',
  tropa: 'TROPA',
  outros: 'OUTROS',
  escoreGado: 'ESCORE DO GADO',
}

const RODEIO_LABELS = {
  ...COMMON_LABELS,
  numeroLote: 'NÚMERO LOTE',
  vaca: 'VACA',
  touro: 'TOURO',
  boiGordo: 'BOI GORDO',
  boiMagro: 'BOI MAGRO',
  garrote: 'GARROTE',
  bezerro: 'BEZERRO',
  novilha: 'NOVILHA',
  tropa: 'TROPA',
  outros: 'OUTROS',
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
  leituraCocho: 'LEITURA COCHO',
  creepKg: 'CREEP (KG)',
  kgCocho: 'KG no cocho',
  kgDeposito: 'KG no depósito',
  sacos: 'SACOS',
  suplementoQtd: 'SUPLEMENTO/QTD',
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
  loteDestino: 'DESTINO',
  numeroCabecas: 'NÚMERO CABEÇAS',
  pesoMedio: 'PESO MÉDIO',
  motivoMovimentacao: 'MOTIVO',
  brincoChip: 'BRINCO/CHIP',
  causaObservacao: 'CAUSA/OBSERVAÇÃO',
}

const ENFERMARIA_LABELS = {
  ...COMMON_LABELS,
  pasto: 'PASTO',
  lote: 'LOTE',
  brincoChip: 'BRINCO/CHIP',
  categoria: 'CATEGORIA',
  tratamento: 'TRATAMENTO',
  tratamentoOutros: 'Outros',
  problemaCasco: 'PROBLEMA DE CASCO',
  problemaCascoObs: 'OBSERVAÇÃO',
  sintomasPneumonia: 'SINTOMAS PNEUMONIA',
  sintomasPneumoniaObs: 'OBSERVAÇÃO',
  picadoCobra: 'PICADO POR COBRA',
  picadoCobraObs: 'OBSERVAÇÃO',
  incoordenacaoTremores: 'INCOORDENAÇÃO E TREMORES',
  incoordenacaoTremoresObs: 'OBSERVAÇÃO',
  febreAlta: 'FEBRE ALTA',
  febreAltaObs: 'OBSERVAÇÃO',
  presencaSangue: 'PRESENÇA DE SANGUE',
  presencaSangueObs: 'OBSERVAÇÃO',
  fraturas: 'FRATURAS',
  fraturasObs: 'OBSERVAÇÃO',
  desordensDigestivas: 'DESORDENS DIGESTIVAS',
  desordensDigestivasObs: 'OBSERVAÇÃO',
}

const ENTRADA_INSUMOS_LABELS = {
  dataEntrada: 'DATA DE ENTRADA',
  horario: 'HORÁRIO',
  produto: 'PRODUTO',
  quantidade: 'QUANTIDADE (kg)',
  valorUnitario: 'VALOR UNITÁRIO (R$/kg)',
  valorTotal: 'VALOR TOTAL (R$)',
  notaFiscal: 'N° NOTA FISCAL',
  fornecedor: 'FORNECEDOR',
  placa: 'PLACA',
  motorista: 'MOTORISTA',
  responsavelRecebimento: 'RESPONSÁVEL RECEBIMENTO',
}

const SAIDA_INSUMOS_LABELS = {
  dataProducao: 'DATA DE PRODUÇÃO',
  dietaProduzida: 'DIETA PRODUZIDA',
  destinoProducao: 'DESTINO DA PRODUÇÃO',
  totalProduzido: 'TOTAL PRODUZIDO (kg)',
}

const INSUMOS_POR_SAIDA_LABELS = {
  idSaida: 'ID DA SAÍDA',
  dataProducao: 'DATA DE PRODUÇÃO',
  dietaProduzida: 'DIETA PRODUZIDA',
  insumo: 'INSUMO',
  quantidade: 'QUANTIDADE (kg)',
}

// Exportar objeto principal
export const LABELS_BY_CADERNETA: Record<string, Record<string, string>> = {
  maternidade: MATERNIDADE_LABELS,
  pastagens: PASTAGENS_LABELS,
  rodeio: RODEIO_LABELS,
  suplementacao: SUPLEMENTACAO_LABELS,
  bebedouros: BEBEDOUROS_LABELS,
  movimentacao: MOVIMENTACAO_LABELS,
  enfermaria: ENFERMARIA_LABELS,
  'entrada-insumos': ENTRADA_INSUMOS_LABELS,
  'saida-insumos': SAIDA_INSUMOS_LABELS,
  'insumos-por-saida': INSUMOS_POR_SAIDA_LABELS,
}

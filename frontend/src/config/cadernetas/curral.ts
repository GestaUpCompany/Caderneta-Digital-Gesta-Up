import { CadernetaDisplayConfig, Registro } from '../registroDisplayConfig'

const catQtd = (campo: string) => (r: Registro) => r.gadoContado === 'Sim' && Number(r[campo]) > 0

export const curralConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'IDENTIFICAÇÃO', order: 1, icon: '👤' },
    { title: 'CURRAL SAÍDA', order: 2, icon: '🏠' },
    { title: 'CURRAL ENTRADA', order: 3, icon: '🏠' },
    { title: 'QUANTIDADE DE ANIMAIS', order: 4, icon: '🐄' },
    { title: 'AVALIAÇÃO', order: 5, icon: '⭐' },
  ],
  fieldConfig: {
    manejador: { key: 'manejador', section: 'IDENTIFICAÇÃO', priority: 1, colSpan: 2 },
    numeroLote: { key: 'numeroLote', section: 'IDENTIFICAÇÃO', priority: 2 },

    curralSaida: { key: 'curralSaida', section: 'CURRAL SAÍDA', priority: 1, colSpan: 2 },
    tempoOcupacao: { key: 'tempoOcupacao', section: 'CURRAL SAÍDA', priority: 2 },

    curralEntrada: { key: 'curralEntrada', section: 'CURRAL ENTRADA', priority: 1, colSpan: 2 },

    gadoContado: { key: 'gadoContado', section: 'QUANTIDADE DE ANIMAIS', priority: 1, colSpan: 2 },
    totalAnimais: { key: 'totalAnimais', section: 'QUANTIDADE DE ANIMAIS', priority: 2, colSpan: 2, format: (v) => `${v} animais`, condition: (r) => Number(r.totalAnimais) > 0 },
    vaca: { key: 'vaca', section: 'QUANTIDADE DE ANIMAIS', priority: 3, condition: catQtd('vaca') },
    touro: { key: 'touro', section: 'QUANTIDADE DE ANIMAIS', priority: 4, condition: catQtd('touro') },
    boiGordo: { key: 'boiGordo', section: 'QUANTIDADE DE ANIMAIS', priority: 5, condition: catQtd('boiGordo') },
    boiMagro: { key: 'boiMagro', section: 'QUANTIDADE DE ANIMAIS', priority: 6, condition: catQtd('boiMagro') },
    garrote: { key: 'garrote', section: 'QUANTIDADE DE ANIMAIS', priority: 7, condition: catQtd('garrote') },
    bezerro: { key: 'bezerro', section: 'QUANTIDADE DE ANIMAIS', priority: 8, condition: catQtd('bezerro') },
    novilha: { key: 'novilha', section: 'QUANTIDADE DE ANIMAIS', priority: 9, condition: catQtd('novilha') },
    tropa: { key: 'tropa', section: 'QUANTIDADE DE ANIMAIS', priority: 10, condition: catQtd('tropa') },
    outros: { key: 'outros', section: 'QUANTIDADE DE ANIMAIS', priority: 11, condition: catQtd('outros') },

    escoreGado: { key: 'escoreGado', section: 'AVALIAÇÃO', priority: 1 },
  },
  hiddenFields: ['n_cabecas', 'qtd_bezerros', 'curralSaidaId', 'curralEntradaId', 'movimentacaoErro'],
  // Resultado da troca no servidor (só existe depois do sync)
  cardBadge: {
    key: 'movimentacaoStatus',
    format: (v) => (v === 'recusada' ? 'Troca recusada' : v === 'aplicada' ? 'Troca aplicada' : 'Sem troca'),
    tones: { aplicada: 'success', recusada: 'danger', ignorada: 'neutral' },
  },
}

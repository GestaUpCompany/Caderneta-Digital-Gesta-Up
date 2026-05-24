import { CadernetaDisplayConfig, Registro } from '../registroDisplayConfig'

export const pastagensConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'IDENTIFICAÇÃO', order: 1, icon: '👤' },
    { title: 'PASTO SAÍDA', order: 2, icon: '🌾' },
    { title: 'PASTO ENTRADA', order: 3, icon: '🌿' },
    { title: 'QUANTIDADE DE ANIMAIS', order: 4, icon: '🐄' },
    { title: 'AVALIAÇÃO', order: 5, icon: '⭐' },
  ],
  fieldConfig: {
    manejador: { key: 'manejador', section: 'IDENTIFICAÇÃO', priority: 1, colSpan: 2 },
    numeroLote: { key: 'numeroLote', section: 'IDENTIFICAÇÃO', priority: 2 },

    pastoSaida: { key: 'pastoSaida', section: 'PASTO SAÍDA', priority: 1, colSpan: 2 },
    pastoSaidaAreaUtil: { key: 'pastoSaidaAreaUtil', section: 'PASTO SAÍDA', priority: 2, format: (v) => `${v} ha` },
    pastoSaidaEspecie: { key: 'pastoSaidaEspecie', section: 'PASTO SAÍDA', priority: 3 },
    avaliacaoSaida: { key: 'avaliacaoSaida', section: 'PASTO SAÍDA', priority: 4 },
    tempoOcupacao: { key: 'tempoOcupacao', section: 'PASTO SAÍDA', priority: 5 },

    pastoEntrada: { key: 'pastoEntrada', section: 'PASTO ENTRADA', priority: 1, colSpan: 2 },
    pastoEntradaAreaUtil: { key: 'pastoEntradaAreaUtil', section: 'PASTO ENTRADA', priority: 2, format: (v) => `${v} ha` },
    pastoEntradaEspecie: { key: 'pastoEntradaEspecie', section: 'PASTO ENTRADA', priority: 3 },
    avaliacaoEntrada: { key: 'avaliacaoEntrada', section: 'PASTO ENTRADA', priority: 4 },
    tempoVedacao: { key: 'tempoVedacao', section: 'PASTO ENTRADA', priority: 5 },

    gadoContado: { key: 'gadoContado', section: 'QUANTIDADE DE ANIMAIS', priority: 1, colSpan: 2 },
    totalAnimais: { key: 'totalAnimais', section: 'QUANTIDADE DE ANIMAIS', priority: 2, colSpan: 2, format: (v) => `${v} animais`, condition: (r) => Number(r.totalAnimais) > 0 },
    vaca: { key: 'vaca', section: 'QUANTIDADE DE ANIMAIS', priority: 3, condition: (r: Registro) => r.gadoContado === 'Sim' && Number(r.vaca) > 0 },
    touro: { key: 'touro', section: 'QUANTIDADE DE ANIMAIS', priority: 4, condition: (r: Registro) => r.gadoContado === 'Sim' && Number(r.touro) > 0 },
    boiGordo: { key: 'boiGordo', section: 'QUANTIDADE DE ANIMAIS', priority: 5, condition: (r: Registro) => r.gadoContado === 'Sim' && Number(r.boiGordo) > 0 },
    boiMagro: { key: 'boiMagro', section: 'QUANTIDADE DE ANIMAIS', priority: 6, condition: (r: Registro) => r.gadoContado === 'Sim' && Number(r.boiMagro) > 0 },
    garrote: { key: 'garrote', section: 'QUANTIDADE DE ANIMAIS', priority: 7, condition: (r: Registro) => r.gadoContado === 'Sim' && Number(r.garrote) > 0 },
    bezerro: { key: 'bezerro', section: 'QUANTIDADE DE ANIMAIS', priority: 8, condition: (r: Registro) => r.gadoContado === 'Sim' && Number(r.bezerro) > 0 },
    novilha: { key: 'novilha', section: 'QUANTIDADE DE ANIMAIS', priority: 9, condition: (r: Registro) => r.gadoContado === 'Sim' && Number(r.novilha) > 0 },
    tropa: { key: 'tropa', section: 'QUANTIDADE DE ANIMAIS', priority: 10, condition: (r: Registro) => r.gadoContado === 'Sim' && Number(r.tropa) > 0 },
    outros: { key: 'outros', section: 'QUANTIDADE DE ANIMAIS', priority: 11, condition: (r: Registro) => r.gadoContado === 'Sim' && Number(r.outros) > 0 },

    escoreGado: { key: 'escoreGado', section: 'AVALIAÇÃO', priority: 1 },
  },
  hiddenFields: ['n_cabecas', 'qtd_bezerros', 'pastoSaidaAreaUtil', 'pastoSaidaEspecie', 'pastoEntradaAreaUtil', 'pastoEntradaEspecie'],
}

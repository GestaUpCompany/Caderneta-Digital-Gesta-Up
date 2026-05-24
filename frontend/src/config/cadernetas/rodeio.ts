import { CadernetaDisplayConfig, Registro } from '../registroDisplayConfig'

export const rodeioConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'IDENTIFICAÇÃO', order: 1, icon: '📋' },
    { title: 'CONTAGEM', order: 2, icon: '🐄' },
    { title: 'AVALIAÇÃO GERAL', order: 3, icon: '✅' },
    { title: 'EQUIPE', order: 4, icon: '👷' },
  ],
  fieldConfig: {
    pasto: { key: 'pasto', section: 'IDENTIFICAÇÃO', priority: 1 },
    numeroLote: { key: 'numeroLote', section: 'IDENTIFICAÇÃO', priority: 2 },

    vaca: { key: 'vaca', section: 'CONTAGEM', priority: 1, condition: (r: Registro) => Number(r.vaca) > 0 },
    touro: { key: 'touro', section: 'CONTAGEM', priority: 2, condition: (r: Registro) => Number(r.touro) > 0 },
    boiGordo: { key: 'boiGordo', section: 'CONTAGEM', priority: 3, condition: (r: Registro) => Number(r.boiGordo) > 0 },
    boiMagro: { key: 'boiMagro', section: 'CONTAGEM', priority: 4, condition: (r: Registro) => Number(r.boiMagro) > 0 },
    garrote: { key: 'garrote', section: 'CONTAGEM', priority: 5, condition: (r: Registro) => Number(r.garrote) > 0 },
    bezerro: { key: 'bezerro', section: 'CONTAGEM', priority: 6, condition: (r: Registro) => Number(r.bezerro) > 0 },
    novilha: { key: 'novilha', section: 'CONTAGEM', priority: 7, condition: (r: Registro) => Number(r.novilha) > 0 },
    tropa: { key: 'tropa', section: 'CONTAGEM', priority: 8, condition: (r: Registro) => Number(r.tropa) > 0 },
    outros: { key: 'outros', section: 'CONTAGEM', priority: 9, condition: (r: Registro) => Number(r.outros) > 0 },
    totalCabecas: { key: 'totalCabecas', section: 'CONTAGEM', priority: 10, colSpan: 2, format: (v) => `${v} animais` },

    escoreGadoIdeal: { key: 'escoreGadoIdeal', section: 'AVALIAÇÃO GERAL', priority: 1 },
    escoreFezes: { key: 'escoreFezes', section: 'AVALIAÇÃO GERAL', priority: 2 },
    escoreGado: { key: 'escoreGado', section: 'AVALIAÇÃO GERAL', priority: 3 },

    equipe: { key: 'equipe', section: 'EQUIPE', priority: 1 },
  },
  hiddenFields: ['n_cabecas', 'qtd_bezerros'],
}

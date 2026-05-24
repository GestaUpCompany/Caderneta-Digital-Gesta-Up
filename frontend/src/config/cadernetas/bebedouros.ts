import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const bebedourosConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'IDENTIFICAÇÃO', order: 1, icon: '📋' },
    { title: 'INSPEÇÃO ATUAL', order: 2, icon: '🔍' },
    { title: 'CHECKLIST', order: 3, icon: '✅' },
  ],
  fieldConfig: {
    responsavel: { key: 'responsavel', section: 'IDENTIFICAÇÃO', priority: 1 },
    pasto: { key: 'pasto', section: 'IDENTIFICAÇÃO', priority: 2 },
    numeroLote: { key: 'numeroLote', section: 'IDENTIFICAÇÃO', priority: 3 },
    categoria: { key: 'categoria', section: 'IDENTIFICAÇÃO', priority: 4 },

    numeroBebedouro: { key: 'numeroBebedouro', section: 'INSPEÇÃO ATUAL', priority: 1 },
    leituraBebedouro: { key: 'leituraBebedouro', section: 'INSPEÇÃO ATUAL', priority: 2 },
    observacao: { key: 'observacao', section: 'INSPEÇÃO ATUAL', priority: 3, colSpan: 2 },

    aguaSuficiente: { key: 'aguaSuficiente', section: 'CHECKLIST', priority: 1, format: (v) => v === true || v === 'S' ? 'Sim' : 'Não' },
    vazaoBebedouroIdeal: { key: 'vazaoBebedouroIdeal', section: 'CHECKLIST', priority: 2, format: (v) => v === true || v === 'S' ? 'Sim' : 'Não' },
    aterroAcessoBebedouroIdeal: { key: 'aterroAcessoBebedouroIdeal', section: 'CHECKLIST', priority: 3, format: (v) => v === true || v === 'S' ? 'Sim' : 'Não' },
    espacamentoBebedouroIdeal: { key: 'espacamentoBebedouroIdeal', section: 'CHECKLIST', priority: 4, format: (v) => v === true || v === 'S' ? 'Sim' : 'Não' },
    boiaProtecaoBoasCondicoes: { key: 'boiaProtecaoBoasCondicoes', section: 'CHECKLIST', priority: 5, format: (v) => v === true || v === 'S' ? 'Sim' : 'Não' },
  },
  hiddenFields: [],
}

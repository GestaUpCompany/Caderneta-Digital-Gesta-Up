import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const climaConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'DADOS CLIMÁTICOS', order: 1, icon: '🌡️' },
  ],
  fieldConfig: {
    responsavel: { key: 'responsavel', section: 'DADOS CLIMÁTICOS', priority: 1 },
    temperaturaMedia: { key: 'temperaturaMedia', section: 'DADOS CLIMÁTICOS', priority: 2, format: (v) => `${v} °C` },
    observacao: { key: 'observacao', section: 'DADOS CLIMÁTICOS', priority: 3, colSpan: 2 },
  },
  hiddenFields: ['medicoes'],
}

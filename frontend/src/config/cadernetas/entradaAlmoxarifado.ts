import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const entradaAlmoxarifadoConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'DADOS DA ENTRADA', order: 1, icon: '📦' },
  ],
  fieldConfig: {
    observacao: { key: 'observacao', section: 'DADOS DA ENTRADA', priority: 1, colSpan: 2 },
  },
  hiddenFields: ['itens'],
}

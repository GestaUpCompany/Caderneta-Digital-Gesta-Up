import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const entradaAlmoxarifadoConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'DADOS DA ENTRADA', order: 1, icon: '📦' },
  ],
  fieldConfig: {
    quemRecebeu: { key: 'quemRecebeu', section: 'DADOS DA ENTRADA', priority: 1 },
    observacao: { key: 'observacao', section: 'DADOS DA ENTRADA', priority: 2, colSpan: 2 },
  },
  hiddenFields: ['itens'],
}

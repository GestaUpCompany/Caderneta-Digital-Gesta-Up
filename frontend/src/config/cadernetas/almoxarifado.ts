import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const almoxarifadoConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'DADOS DA RETIRADA', order: 1, icon: '📦' },
  ],
  fieldConfig: {
    quemEntregou: { key: 'quemEntregou', section: 'DADOS DA RETIRADA', priority: 1 },
    quemPegou: { key: 'quemPegou', section: 'DADOS DA RETIRADA', priority: 2 },
    observacao: { key: 'observacao', section: 'DADOS DA RETIRADA', priority: 3, colSpan: 2 },
  },
  hiddenFields: ['itens'],
}

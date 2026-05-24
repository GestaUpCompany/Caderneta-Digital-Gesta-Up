import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const saidaInsumosConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'DADOS DA PRODUÇÃO', order: 1, icon: '📤' },
    { title: 'INSUMOS UTILIZADOS', order: 2, icon: '🧪' },
  ],
  fieldConfig: {
    dataProducao: { key: 'dataProducao', section: 'DADOS DA PRODUÇÃO', priority: 1 },
    dietaProduzida: { key: 'dietaProduzida', section: 'DADOS DA PRODUÇÃO', priority: 2 },
    destinoProducao: { key: 'destinoProducao', section: 'DADOS DA PRODUÇÃO', priority: 3 },
    totalProduzido: { key: 'totalProduzido', section: 'DADOS DA PRODUÇÃO', priority: 4, format: (v) => `${v} kg` },
  },
  hiddenFields: ['insumosQuantidades'],
}

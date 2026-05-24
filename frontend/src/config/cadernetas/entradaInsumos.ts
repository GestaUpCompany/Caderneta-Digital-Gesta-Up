import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const entradaInsumosConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'DADOS DA ENTRADA', order: 1, icon: '📥' },
    { title: 'ITENS', order: 2, icon: '📦' },
  ],
  fieldConfig: {
    notaFiscal: { key: 'notaFiscal', section: 'DADOS DA ENTRADA', priority: 1 },
    fornecedor: { key: 'fornecedor', section: 'DADOS DA ENTRADA', priority: 2 },
    placa: { key: 'placa', section: 'DADOS DA ENTRADA', priority: 3 },
    motorista: { key: 'motorista', section: 'DADOS DA ENTRADA', priority: 4 },
    responsavelRecebimento: { key: 'responsavelRecebimento', section: 'DADOS DA ENTRADA', priority: 5 },
  },
  hiddenFields: ['itens'],
}

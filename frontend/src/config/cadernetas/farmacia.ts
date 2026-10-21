import { CadernetaDisplayConfig } from '../registroDisplayConfig'

const rotuloTipo = (value: unknown) => (value === 'baixa' ? 'SAÍDA' : 'ENTRADA')

export const farmaciaConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'MOVIMENTO', order: 1, icon: '💊' },
    { title: 'DADOS DA COMPRA', order: 2, icon: '🧾' },
  ],
  fieldConfig: {
    tipoMovimentacao: { key: 'tipoMovimentacao', section: 'MOVIMENTO', priority: 1, format: rotuloTipo },
    medicamentoNome: { key: 'medicamentoNome', section: 'MOVIMENTO', priority: 2 },
    quantidade: { key: 'quantidade', section: 'MOVIMENTO', priority: 3 },
    unidade: { key: 'unidade', section: 'MOVIMENTO', priority: 4 },
    loteProduto: { key: 'loteProduto', section: 'MOVIMENTO', priority: 5 },
    observacao: { key: 'observacao', section: 'MOVIMENTO', priority: 6, colSpan: 2 },
    custoUnitario: { key: 'custoUnitario', section: 'DADOS DA COMPRA', priority: 1 },
    validade: { key: 'validade', section: 'DADOS DA COMPRA', priority: 2 },
    fornecedor: { key: 'fornecedor', section: 'DADOS DA COMPRA', priority: 3 },
    notaFiscal: { key: 'notaFiscal', section: 'DADOS DA COMPRA', priority: 4 },
  },
  hiddenFields: ['medicamentoId', 'fazendaId', 'supabaseId', 'isTestRecord'],
}

import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const sanidadeConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'APLICAÇÃO', order: 1, icon: '💉' },
    { title: 'ANIMAL OU LOTE', order: 2, icon: '🐄' },
    { title: 'PRODUTO', order: 3, icon: '💊' },
    { title: 'OBSERVAÇÕES', order: 4, icon: '📝' },
  ],
  fieldConfig: {
    tipo: { key: 'tipo', label: 'TIPO', section: 'APLICAÇÃO', priority: 1 },
    alvo: { key: 'alvo', label: 'APLICADO EM', section: 'APLICAÇÃO', priority: 2, format: (v) => (v === 'lote' ? 'Lote' : 'Animal') },

    loteNome: { key: 'loteNome', label: 'LOTE', section: 'ANIMAL OU LOTE', priority: 1 },
    categoria: { key: 'categoria', label: 'CATEGORIA', section: 'ANIMAL OU LOTE', priority: 2 },
    numeroCabecas: { key: 'numeroCabecas', label: 'CABEÇAS', section: 'ANIMAL OU LOTE', priority: 3 },
    brinco: { key: 'brinco', label: 'BRINCO', section: 'ANIMAL OU LOTE', priority: 4 },
    chip: { key: 'chip', label: 'CHIP', section: 'ANIMAL OU LOTE', priority: 5 },
    idManejo: { key: 'idManejo', label: 'ID MANEJO', section: 'ANIMAL OU LOTE', priority: 6 },

    medicamentoNome: { key: 'medicamentoNome', label: 'PRODUTO', section: 'PRODUTO', priority: 1, colSpan: 2 },
    principioAtivo: { key: 'principioAtivo', label: 'PRINCÍPIO ATIVO', section: 'PRODUTO', priority: 2 },
    dose: { key: 'dose', label: 'DOSE', section: 'PRODUTO', priority: 3 },
    via: { key: 'via', label: 'VIA', section: 'PRODUTO', priority: 4 },
    loteProduto: { key: 'loteProduto', label: 'LOTE DO PRODUTO', section: 'PRODUTO', priority: 5 },
    validadeProduto: { key: 'validadeProduto', label: 'VALIDADE', section: 'PRODUTO', priority: 6 },
    carenciaDias: { key: 'carenciaDias', label: 'CARÊNCIA', section: 'PRODUTO', priority: 7, format: (v) => `${v} dia(s)` },
    intervaloDias: { key: 'intervaloDias', label: 'PRÓXIMA DOSE', section: 'PRODUTO', priority: 8, format: (v) => `em ${v} dia(s)` },

    diagnostico: { key: 'diagnostico', label: 'DIAGNÓSTICO', section: 'OBSERVAÇÕES', priority: 1, colSpan: 2 },
    observacao: { key: 'observacao', label: 'OBSERVAÇÃO', section: 'OBSERVAÇÕES', priority: 2, colSpan: 2 },
  },
}

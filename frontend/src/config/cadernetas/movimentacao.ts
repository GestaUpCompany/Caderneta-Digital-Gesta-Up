import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const movimentacaoConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'ORIGEM', order: 1, icon: '📍' },
    { title: 'QUANTIFICAÇÃO', order: 2, icon: '🔢' },
    { title: 'MOVIMENTAÇÃO', order: 3, icon: '🔀' },
  ],
  fieldConfig: {
    loteOrigem: { key: 'loteOrigem', section: 'ORIGEM', priority: 1 },
    brincoChip: { key: 'brincoChip', section: 'ORIGEM', priority: 2 },

    numeroCabecas: { key: 'numeroCabecas', section: 'QUANTIFICAÇÃO', priority: 1 },
    pesoVivoAtual: { key: 'pesoVivoAtual', section: 'QUANTIFICAÇÃO', priority: 2, format: (v) => `${v} kg` },
    categoria: { key: 'categoria', section: 'QUANTIFICAÇÃO', priority: 3 },

    motivoMovimentacao: { key: 'motivoMovimentacao', section: 'MOVIMENTAÇÃO', priority: 1 },
    subtipo: { key: 'subtipo', section: 'MOVIMENTAÇÃO', priority: 2 },
    loteDestino: { key: 'loteDestino', section: 'MOVIMENTAÇÃO', priority: 3 },
    causaObservacao: { key: 'causaObservacao', section: 'MOVIMENTAÇÃO', priority: 4, colSpan: 2 },
  },
  hiddenFields: ['vaca', 'touro', 'boiGordo', 'boiMagro', 'garrote', 'bezerro', 'novilha', 'tropa', 'outraCategoria'],
}

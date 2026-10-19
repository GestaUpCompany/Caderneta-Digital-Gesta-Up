import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const reproducaoConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'EVENTO', order: 1, icon: '🐄' },
    { title: 'DETALHES', order: 2, icon: '📋' },
  ],
  fieldConfig: {
    tipo: { key: 'tipo', label: 'TIPO', section: 'EVENTO', priority: 1, colSpan: 2 },
    estacaoNome: { key: 'estacaoNome', label: 'ESTAÇÃO DE MONTA', section: 'EVENTO', priority: 2, colSpan: 2 },

    touroNome: { key: 'touroNome', label: 'TOURO', section: 'DETALHES', priority: 1 },
    semenPartida: { key: 'semenPartida', label: 'SÊMEN (PARTIDA)', section: 'DETALHES', priority: 2 },
    tecnico: { key: 'tecnico', label: 'TÉCNICO', section: 'DETALHES', priority: 3 },
    metodo: { key: 'metodo', label: 'MÉTODO', section: 'DETALHES', priority: 4 },
    observacao: { key: 'observacao', label: 'OBSERVAÇÃO', section: 'DETALHES', priority: 5, colSpan: 2 },
  },
  hiddenFields: ['linhas'],
}

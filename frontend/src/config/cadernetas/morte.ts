import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const morteConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'DADOS DO ANIMAL', order: 1, icon: '🐄' },
    { title: 'CAUSA DA MORTE', order: 2, icon: '☠️' },
    { title: 'NUTRIÇÃO', order: 3, icon: '🌿' },
    { title: 'DIAGNÓSTICOS', order: 4, icon: '🩺' },
  ],
  fieldConfig: {
    pasto: { key: 'pasto', section: 'DADOS DO ANIMAL', priority: 1 },
    lote: { key: 'lote', section: 'DADOS DO ANIMAL', priority: 2 },
    brincoChip: { key: 'brincoChip', section: 'DADOS DO ANIMAL', priority: 3 },
    categoria: { key: 'categoria', section: 'DADOS DO ANIMAL', priority: 4 },
    sexo: { key: 'sexo', section: 'DADOS DO ANIMAL', priority: 5 },
    raca: { key: 'raca', section: 'DADOS DO ANIMAL', priority: 6 },
    idade: { key: 'idade', section: 'DADOS DO ANIMAL', priority: 7 },
    pesoVivo: { key: 'pesoVivo', section: 'DADOS DO ANIMAL', priority: 8, format: (v) => `${v} kg` },

    causaMorte: { key: 'causaMorte', section: 'CAUSA DA MORTE', priority: 1, colSpan: 2 },
    escore: { key: 'escore', section: 'CAUSA DA MORTE', priority: 2 },

    nutricaoAtual: { key: 'nutricaoAtual', section: 'NUTRIÇÃO', priority: 1 },
    nutricaoAnterior: { key: 'nutricaoAnterior', section: 'NUTRIÇÃO', priority: 2 },
  },
  hiddenFields: ['diagnosticos'],
}

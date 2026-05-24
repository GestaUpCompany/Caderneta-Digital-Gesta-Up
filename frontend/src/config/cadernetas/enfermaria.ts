import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const enfermariaConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'DADOS DO ANIMAL', order: 1, icon: '🐄' },
    { title: 'DIAGNÓSTICOS', order: 2, icon: '🩺' },
    { title: 'MEDICAMENTOS', order: 3, icon: '💊' },
  ],
  fieldConfig: {
    pasto: { key: 'pasto', section: 'DADOS DO ANIMAL', priority: 1 },
    lote: { key: 'lote', section: 'DADOS DO ANIMAL', priority: 2 },
    brincoChip: { key: 'brincoChip', section: 'DADOS DO ANIMAL', priority: 3 },
    sexo: { key: 'sexo', section: 'DADOS DO ANIMAL', priority: 4 },
    raca: { key: 'raca', section: 'DADOS DO ANIMAL', priority: 5 },
    idade: { key: 'idade', section: 'DADOS DO ANIMAL', priority: 6 },
    categoria: { key: 'categoria', section: 'DADOS DO ANIMAL', priority: 7 },
    tratamento: { key: 'tratamento', section: 'DADOS DO ANIMAL', priority: 8, colSpan: 2 },
    observacaoTratamento: { key: 'observacaoTratamento', section: 'DADOS DO ANIMAL', priority: 9, colSpan: 2 },
  },
  hiddenFields: ['diagnosticos', 'medicamentos'],
}

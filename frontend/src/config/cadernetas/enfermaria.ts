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
    tipoRegistro: { key: 'tipoRegistro', section: 'DADOS DO ANIMAL', priority: 3 },
    idManejo: { key: 'idManejo', section: 'DADOS DO ANIMAL', priority: 4 },
    brinco: { key: 'brinco', section: 'DADOS DO ANIMAL', priority: 5 },
    chip: { key: 'chip', section: 'DADOS DO ANIMAL', priority: 6 },
    brincoChip: { key: 'brincoChip', section: 'DADOS DO ANIMAL', priority: 7 },
    sexo: { key: 'sexo', section: 'DADOS DO ANIMAL', priority: 8 },
    raca: { key: 'raca', section: 'DADOS DO ANIMAL', priority: 9 },
    idade: { key: 'idade', section: 'DADOS DO ANIMAL', priority: 10 },
    categoria: { key: 'categoria', section: 'DADOS DO ANIMAL', priority: 11 },
    tratamento: { key: 'tratamento', section: 'DADOS DO ANIMAL', priority: 12, colSpan: 2 },
    observacaoTratamento: { key: 'observacaoTratamento', section: 'DADOS DO ANIMAL', priority: 13, colSpan: 2 },
  },
  hiddenFields: ['diagnosticos', 'medicamentos'],
}

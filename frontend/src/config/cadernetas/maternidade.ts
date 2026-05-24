import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const maternidadeConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'INFORMAÇÕES BÁSICAS', order: 1, icon: '📋' },
    { title: 'IDENTIFICAÇÃO DA MÃE', order: 2, icon: '🐄' },
    { title: 'IDENTIFICAÇÃO DA CRIA', order: 3, icon: '🐮' },
    { title: 'PARTO E TRATAMENTO', order: 4, icon: '💊' },
  ],
  fieldConfig: {
    pasto: { key: 'pasto', section: 'INFORMAÇÕES BÁSICAS', priority: 1 },
    lote: { key: 'lote', section: 'INFORMAÇÕES BÁSICAS', priority: 2 },

    brincoMae: { key: 'brincoMae', section: 'IDENTIFICAÇÃO DA MÃE', priority: 1 },
    chipMae: { key: 'chipMae', section: 'IDENTIFICAÇÃO DA MÃE', priority: 2 },
    categoriaMae: { key: 'categoriaMae', section: 'IDENTIFICAÇÃO DA MÃE', priority: 3 },
    escoreMatriz: { key: 'escoreMatriz', section: 'IDENTIFICAÇÃO DA MÃE', priority: 4 },

    idCria: { key: 'idCria', section: 'IDENTIFICAÇÃO DA CRIA', priority: 1 },
    pesoCria: { key: 'pesoCria', section: 'IDENTIFICAÇÃO DA CRIA', priority: 2, format: (v) => `${v} kg` },
    sexo: { key: 'sexo', section: 'IDENTIFICAÇÃO DA CRIA', priority: 3 },
    raca: { key: 'raca', section: 'IDENTIFICAÇÃO DA CRIA', priority: 4 },

    tipoParto: { key: 'tipoParto', section: 'PARTO E TRATAMENTO', priority: 1, colSpan: 2 },
    tratamento: { key: 'tratamento', section: 'PARTO E TRATAMENTO', priority: 2, colSpan: 2, format: (v) => Array.isArray(v) ? (v as string[]).join(', ') : String(v) },
  },
  hiddenFields: [],
}

import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const leituraCochoConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'DADOS PRINCIPAIS', order: 1, icon: '📋' },
  ],
  fieldConfig: {
    responsavel: { key: 'responsavel', label: 'RESPONSÁVEL', section: 'DADOS PRINCIPAIS', priority: 1 },
    pastoCurral: { key: 'pastoCurral', label: 'CURRAL', section: 'DADOS PRINCIPAIS', priority: 2 },
    numeroLote: { key: 'numeroLote', label: 'LOTE', section: 'DADOS PRINCIPAIS', priority: 3 },
    leituraCocho: { key: 'leituraCocho', label: 'LEITURA COCHO', section: 'DADOS PRINCIPAIS', priority: 4 },
  },
  hiddenFields: ['pastoId', 'curralId', 'loteId', 'notaConfigId'],
}

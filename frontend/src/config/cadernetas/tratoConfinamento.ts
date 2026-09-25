import { CadernetaDisplayConfig } from '../registroDisplayConfig'
import { formatarNumeroBR } from '../../utils/formatNumber'

export const tratoConfinamentoConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'DADOS DO TRATO', order: 1, icon: '🥣' },
  ],
  fieldConfig: {
    responsavel: { key: 'responsavel', label: 'RESPONSÁVEL', section: 'DADOS DO TRATO', priority: 1 },
    curral: { key: 'curral', label: 'CURRAL', section: 'DADOS DO TRATO', priority: 2 },
    numeroLote: { key: 'numeroLote', label: 'LOTE', section: 'DADOS DO TRATO', priority: 3 },
    ordemTrato: { key: 'ordemTrato', label: 'TRATO', section: 'DADOS DO TRATO', priority: 4 },
    kgPlanejado: { key: 'kgPlanejado', label: 'KG PLANEJADO', section: 'DADOS DO TRATO', priority: 5, format: (v) => `${formatarNumeroBR(v)} kg` },
    kgReal: { key: 'kgReal', label: 'KG FORNECIDO', section: 'DADOS DO TRATO', priority: 6, format: (v) => `${formatarNumeroBR(v)} kg` },
    leituraCochoNota: { key: 'leituraCochoNota', label: 'LEITURA COCHO', section: 'DADOS DO TRATO', priority: 7 },
  },
  hiddenFields: ['curralId', 'loteId', 'programacaoId'],
}

import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const manutencaoMaquinasConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'DADOS PRINCIPAIS', order: 1, icon: '🔧' },
    { title: 'CHECKLIST', order: 2, icon: '✅' },
  ],
  fieldConfig: {
    responsavelChecklist: { key: 'responsavelChecklist', section: 'DADOS PRINCIPAIS', priority: 1 },
    operadorMotorista: { key: 'operadorMotorista', section: 'DADOS PRINCIPAIS', priority: 2 },
    maquinaVeiculo: { key: 'maquinaVeiculo', section: 'DADOS PRINCIPAIS', priority: 3 },
    placa: { key: 'placa', section: 'DADOS PRINCIPAIS', priority: 4 },
    odometro: { key: 'odometro', section: 'DADOS PRINCIPAIS', priority: 5 },
    observacao: { key: 'observacao', section: 'DADOS PRINCIPAIS', priority: 6, colSpan: 2 },
  },
  hiddenFields: ['checklist'],
}

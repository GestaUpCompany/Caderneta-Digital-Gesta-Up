import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const loteProtocoloIatfConfig: CadernetaDisplayConfig = {
  sections: [{ title: 'LOTE DE PROTOCOLO', order: 1, icon: '🗓️' }],
  fieldConfig: {
    nome: { key: 'nome', label: 'LOTE', section: 'LOTE DE PROTOCOLO', priority: 1, colSpan: 2 },
    protocoloNome: { key: 'protocoloNome', label: 'PROTOCOLO', section: 'LOTE DE PROTOCOLO', priority: 2, colSpan: 2 },
    responsavel: { key: 'responsavel', label: 'RESPONSÁVEL', section: 'LOTE DE PROTOCOLO', priority: 3 },
  },
  hiddenFields: ['protocoloId', 'linhas'],
}

export const protocoloIatfConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'PASSO', order: 1, icon: '🗓️' },
    { title: 'DETALHES', order: 2, icon: '📋' },
  ],
  fieldConfig: {
    loteNome: { key: 'loteNome', label: 'LOTE DE PROTOCOLO', section: 'PASSO', priority: 1, colSpan: 2 },
    tarefaRotulo: { key: 'tarefaRotulo', label: 'PASSO', section: 'PASSO', priority: 2, colSpan: 2 },

    touroNome: { key: 'touroNome', label: 'TOURO', section: 'DETALHES', priority: 1 },
    semenPartida: { key: 'semenPartida', label: 'SÊMEN (PARTIDA)', section: 'DETALHES', priority: 2 },
    tecnico: { key: 'tecnico', label: 'TÉCNICO', section: 'DETALHES', priority: 3 },
    femeasAtivas: { key: 'femeasAtivas', label: 'FÊMEAS NO LOTE', section: 'DETALHES', priority: 4 },
    femeaRotulo: { key: 'femeaRotulo', label: 'FÊMEA DESCARTADA', section: 'DETALHES', priority: 5 },
    motivoDescarte: { key: 'motivoDescarte', label: 'MOTIVO', section: 'DETALHES', priority: 6 },
    observacao: { key: 'observacao', label: 'OBSERVAÇÃO', section: 'DETALHES', priority: 7, colSpan: 2 },
  },
  hiddenFields: ['loteProtocoloId', 'tarefaId', 'tarefaTipo', 'tarefaDia', 'acao', 'individuoId', 'femeasSelecionadas', 'femeasDisponiveis', 'loteD0'],
}

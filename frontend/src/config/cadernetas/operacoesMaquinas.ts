import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const operacoesMaquinasConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'DADOS DA OPERAÇÃO', order: 1, icon: '🚜' },
    { title: 'TIPO DE OPERAÇÃO', order: 2, icon: '⚙️' },
    { title: 'DETALHES DA APLICAÇÃO', order: 3, icon: '🧪' },
    { title: 'AVALIAÇÃO', order: 4, icon: '✅' },
  ],
  fieldConfig: {
    veiculoTrator: { key: 'veiculoTrator', section: 'DADOS DA OPERAÇÃO', priority: 1 },
    implementoUtilizado: { key: 'implementoUtilizado', section: 'DADOS DA OPERAÇÃO', priority: 2 },
    horaInicial: { key: 'horaInicial', section: 'DADOS DA OPERAÇÃO', priority: 3 },
    horaFinal: { key: 'horaFinal', section: 'DADOS DA OPERAÇÃO', priority: 4 },
    odometroInicial: { key: 'odometroInicial', section: 'DADOS DA OPERAÇÃO', priority: 5, format: (v) => `${v} km` },
    odometroFinal: { key: 'odometroFinal', section: 'DADOS DA OPERAÇÃO', priority: 6, format: (v) => `${v} km` },
    totalOdometro: { key: 'totalOdometro', section: 'DADOS DA OPERAÇÃO', priority: 7, format: (v) => `${v} km` },

    tipoOperacao: { key: 'tipoOperacao', section: 'TIPO DE OPERAÇÃO', priority: 1, colSpan: 2 },

    produtoAplicado: { key: 'produtoAplicado', section: 'DETALHES DA APLICAÇÃO', priority: 1 },
    quantidadeTotalAplicada: { key: 'quantidadeTotalAplicada', section: 'DETALHES DA APLICAÇÃO', priority: 2 },
    areaTrabalhada: { key: 'areaTrabalhada', section: 'DETALHES DA APLICAÇÃO', priority: 3 },
    doseAplicada: { key: 'doseAplicada', section: 'DETALHES DA APLICAÇÃO', priority: 4 },

    metaDiariaBatida: { key: 'metaDiariaBatida', section: 'AVALIAÇÃO', priority: 1, format: (v) => v === 'S' || v === 'Sim' ? 'Sim' : 'Não' },
    algumImprevisto: { key: 'algumImprevisto', section: 'AVALIAÇÃO', priority: 2, format: (v) => v === 'S' || v === 'Sim' ? 'Sim' : 'Não' },
    observacao: { key: 'observacao', section: 'AVALIAÇÃO', priority: 3, colSpan: 2 },
  },
  hiddenFields: [],
}

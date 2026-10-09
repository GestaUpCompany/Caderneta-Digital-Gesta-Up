import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const abastecimentoConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'DADOS DO ABASTECIMENTO', order: 1, icon: '⛽' },
    { title: 'COMBUSTÍVEL', order: 2, icon: '🛢️' },
  ],
  fieldConfig: {
    quemAbasteceu: { key: 'quemAbasteceu', section: 'DADOS DO ABASTECIMENTO', priority: 1 },
    operadorMotorista: { key: 'operadorMotorista', section: 'DADOS DO ABASTECIMENTO', priority: 2 },
    maquinaVeiculo: { key: 'maquinaVeiculo', section: 'DADOS DO ABASTECIMENTO', priority: 3 },
    placa: { key: 'placa', section: 'DADOS DO ABASTECIMENTO', priority: 4 },
    totalAbastecido: { key: 'totalAbastecido', section: 'DADOS DO ABASTECIMENTO', priority: 5, format: (v) => `${v} L`, colSpan: 2 },

    combustivel: { key: 'combustivel', section: 'COMBUSTÍVEL', priority: 1 },
    tanqueNome: { key: 'tanqueNome', section: 'COMBUSTÍVEL', priority: 2 },
    totalBomba: { key: 'totalBomba', section: 'COMBUSTÍVEL', priority: 3, format: (v) => `${v} L` },
    // Sem unidade: o campo vale para odômetro (km) e horímetro (h)
    odometro: { key: 'odometro', section: 'COMBUSTÍVEL', priority: 4 },
    tipoOperacao: { key: 'tipoOperacao', section: 'COMBUSTÍVEL', priority: 5 },
    tipoOperacaoOutros: { key: 'tipoOperacaoOutros', section: 'COMBUSTÍVEL', priority: 6 },
    observacao: { key: 'observacao', section: 'COMBUSTÍVEL', priority: 7, colSpan: 2 },
  },
  hiddenFields: [],
}

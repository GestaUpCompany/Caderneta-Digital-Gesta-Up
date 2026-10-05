import { CadernetaDisplayConfig } from '../registroDisplayConfig'

const TEMPO_ATUAL_LABELS: Record<string, string> = {
  sol: 'Sol',
  nublado: 'Nublado',
  chuva_fraca: 'Chuva fraca',
  chuva_forte: 'Chuva forte',
  temporal: 'Temporal',
  vento_forte: 'Vento forte',
  frio: 'Frio',
  seco_poeira: 'Seco / poeira',
}

export const climaConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'DADOS CLIMÁTICOS', order: 1, icon: '🌡️' },
  ],
  fieldConfig: {
    responsavel: { key: 'responsavel', section: 'DADOS CLIMÁTICOS', priority: 1 },
    tempoAtual: { key: 'tempoAtual', section: 'DADOS CLIMÁTICOS', priority: 2, format: (v) => TEMPO_ATUAL_LABELS[String(v)] || String(v) },
    esvaziouPluviometros: { key: 'esvaziouPluviometros', section: 'DADOS CLIMÁTICOS', priority: 3, format: (v) => v === true || v === 'sim' ? 'Sim' : 'Não' },
    temperaturaMedia: { key: 'temperaturaMedia', section: 'DADOS CLIMÁTICOS', priority: 4, format: (v) => `${v} °C` },
    umidadeRelativa: { key: 'umidadeRelativa', section: 'DADOS CLIMÁTICOS', priority: 5, format: (v) => `${v}%` },
    observacao: { key: 'observacao', section: 'DADOS CLIMÁTICOS', priority: 6, colSpan: 2 },
  },
  hiddenFields: ['medicoes'],
}

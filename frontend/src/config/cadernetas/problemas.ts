import { CadernetaDisplayConfig } from '../registroDisplayConfig'

const PRIORIDADE_LABELS: Record<string, string> = {
  baixa: 'PODE ESPERAR',
  'média': 'ESTA SEMANA',
  alta: 'AGORA!',
}

export const problemasConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'LOCALIZAÇÃO', order: 1, icon: '📍' },
    { title: 'DESCRIÇÃO', order: 2, icon: '📝' },
    { title: 'SITUAÇÃO', order: 3, icon: '�' },
    { title: 'ANÁLISE', order: 4, icon: '🔍' },
  ],
  fieldConfig: {
    setor: { key: 'setor', section: 'LOCALIZAÇÃO', priority: 1 },
    local: { key: 'local', section: 'LOCALIZAÇÃO', priority: 2 },

    descricaoProblema: { key: 'descricaoProblema', section: 'DESCRIÇÃO', priority: 1, colSpan: 2 },

    prioridade: { key: 'prioridade', section: 'SITUAÇÃO', priority: 1, format: (v) => PRIORIDADE_LABELS[String(v)] || String(v) },
    tipoOcorrencia: { key: 'tipoOcorrencia', section: 'SITUAÇÃO', priority: 2 },
    acaoCorretivaRealizada: { key: 'acaoCorretivaRealizada', section: 'SITUAÇÃO', priority: 3, format: (v) => v === 'S' || v === true ? 'Sim' : 'Não' },

    // Campos da tela antiga: só aparecem em registros históricos (novos ficam null e o filtro os esconde)
    causaIdentificada: { key: 'causaIdentificada', section: 'ANÁLISE', priority: 1, format: (v) => v === 'S' || v === true ? 'Sim' : 'Não' },
    causaIdentificadaObs: { key: 'causaIdentificadaObs', section: 'ANÁLISE', priority: 2, colSpan: 2 },
    acaoCorretivaRealizadaObs: { key: 'acaoCorretivaRealizadaObs', section: 'ANÁLISE', priority: 3, colSpan: 2 },
    causaRaizIdentificada: { key: 'causaRaizIdentificada', section: 'ANÁLISE', priority: 4, format: (v) => v === 'S' || v === true ? 'Sim' : 'Não' },
    gravidadeImpacto: { key: 'gravidadeImpacto', section: 'ANÁLISE', priority: 5 },
    tipoProblema: { key: 'tipoProblema', section: 'ANÁLISE', priority: 6 },
  },
  hiddenFields: [],
  cardBadge: {
    key: 'prioridade',
    format: (v) => PRIORIDADE_LABELS[String(v)] || String(v).toUpperCase(),
    tones: { alta: 'danger', 'média': 'warning', baixa: 'neutral' },
  },
}

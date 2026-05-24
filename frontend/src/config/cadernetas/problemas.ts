import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const problemasConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'LOCALIZAÇÃO', order: 1, icon: '📍' },
    { title: 'DESCRIÇÃO', order: 2, icon: '📝' },
    { title: 'ANÁLISE', order: 3, icon: '🔍' },
    { title: 'CLASSIFICAÇÃO', order: 4, icon: '🏷️' },
  ],
  fieldConfig: {
    setor: { key: 'setor', section: 'LOCALIZAÇÃO', priority: 1 },
    local: { key: 'local', section: 'LOCALIZAÇÃO', priority: 2 },

    descricaoProblema: { key: 'descricaoProblema', section: 'DESCRIÇÃO', priority: 1, colSpan: 2 },

    causaIdentificada: { key: 'causaIdentificada', section: 'ANÁLISE', priority: 1, format: (v) => v === 'S' || v === true ? 'Sim' : 'Não' },
    causaIdentificadaObs: { key: 'causaIdentificadaObs', section: 'ANÁLISE', priority: 2, colSpan: 2 },
    acaoCorretivaRealizada: { key: 'acaoCorretivaRealizada', section: 'ANÁLISE', priority: 3, format: (v) => v === 'S' || v === true ? 'Sim' : 'Não' },
    acaoCorretivaRealizadaObs: { key: 'acaoCorretivaRealizadaObs', section: 'ANÁLISE', priority: 4, colSpan: 2 },

    tipoOcorrencia: { key: 'tipoOcorrencia', section: 'CLASSIFICAÇÃO', priority: 1 },
    causaRaizIdentificada: { key: 'causaRaizIdentificada', section: 'CLASSIFICAÇÃO', priority: 2, format: (v) => v === 'S' || v === true ? 'Sim' : 'Não' },
    gravidadeImpacto: { key: 'gravidadeImpacto', section: 'CLASSIFICAÇÃO', priority: 3 },
    tipoProblema: { key: 'tipoProblema', section: 'CLASSIFICAÇÃO', priority: 4 },
    prioridade: { key: 'prioridade', section: 'CLASSIFICAÇÃO', priority: 5 },
  },
  hiddenFields: [],
}

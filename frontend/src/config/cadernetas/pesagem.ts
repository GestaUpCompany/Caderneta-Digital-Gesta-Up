import { CadernetaDisplayConfig } from '../registroDisplayConfig'

const formatSN = (v: unknown) => (v === 'S' ? 'Sim' : v === 'N' ? 'Não' : '—')
const formatHora = (v: unknown) => {
  if (!v || typeof v !== 'string') return '—'
  const d = new Date(v)
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('pt-BR')
}
const formatMin = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : `${Number(v).toFixed(1).replace('.', ',')} min`)

export const pesagemConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'SESSÃO', order: 1, icon: '⏱️' },
    { title: 'PREPARAÇÃO', order: 2, icon: '📋' },
    { title: 'ANIMAL', order: 3, icon: '🐄' },
    { title: 'AVALIAÇÃO DO MANEJO', order: 4, icon: '✅' },
  ],
  fieldConfig: {
    tipoManejo: { key: 'tipoManejo', section: 'SESSÃO', priority: 1 },
    horarioInicio: { key: 'horarioInicio', section: 'SESSÃO', priority: 2, format: formatHora },
    horarioFim: { key: 'horarioFim', section: 'SESSÃO', priority: 3, format: formatHora },
    tempoTotalMin: { key: 'tempoTotalMin', section: 'SESSÃO', priority: 4, format: formatMin },
    tempoMedioMinCab: { key: 'tempoMedioMinCab', section: 'SESSÃO', priority: 5, format: formatMin },
    numeroOs: { key: 'numeroOs', section: 'SESSÃO', priority: 6 },

    equipeAjustada: { key: 'equipeAjustada', section: 'PREPARAÇÃO', priority: 1, format: formatSN },
    balancaAferida: { key: 'balancaAferida', section: 'PREPARAÇÃO', priority: 2, format: formatSN },
    checklistConferido: { key: 'checklistConferido', section: 'PREPARAÇÃO', priority: 3, format: formatSN },
    curralLimpo: { key: 'curralLimpo', section: 'PREPARAÇÃO', priority: 4, format: formatSN },

    idBrinco: { key: 'idBrinco', section: 'ANIMAL', priority: 1 },
    idChip: { key: 'idChip', section: 'ANIMAL', priority: 2 },
    lote: { key: 'lote', section: 'ANIMAL', priority: 3 },
    categoria: { key: 'categoria', section: 'ANIMAL', priority: 4 },
    sexo: { key: 'sexo', section: 'ANIMAL', priority: 5 },
    pesoKg: { key: 'pesoKg', section: 'ANIMAL', priority: 6, format: (v) => (v ? `${v} kg` : '—') },
    raca: { key: 'raca', section: 'ANIMAL', priority: 7 },
    idadeEra: { key: 'idadeEra', section: 'ANIMAL', priority: 8 },
    idadeDias: { key: 'idadeDias', section: 'ANIMAL', priority: 9 },

    acidente: { key: 'acidente', section: 'AVALIAÇÃO DO MANEJO', priority: 1, format: formatSN },
    manejoCalmo: { key: 'manejoCalmo', section: 'AVALIAÇÃO DO MANEJO', priority: 2, format: formatSN },
    gritaria: { key: 'gritaria', section: 'AVALIAÇÃO DO MANEJO', priority: 3, format: formatSN },
    manejoAgil: { key: 'manejoAgil', section: 'AVALIAÇÃO DO MANEJO', priority: 4, format: formatSN },
    tempoPreenchimentoSeg: { key: 'tempoPreenchimentoSeg', section: 'AVALIAÇÃO DO MANEJO', priority: 5, format: (v) => (v ? `${Number(v).toFixed(0)} s` : '—') },
  },
  hiddenFields: ['loteId', 'individuoId', 'osId'],
}

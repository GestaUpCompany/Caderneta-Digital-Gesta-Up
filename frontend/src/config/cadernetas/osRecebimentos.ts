import { CadernetaDisplayConfig } from '../registroDisplayConfig'
import { formatarNumeroBR } from '../../utils/formatNumber'

const DESTINO_LABEL: Record<string, string> = {
  baia: 'Baia',
  pasto: 'Pasto',
}

export const osRecebimentosConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'RECEBIMENTO', order: 1, icon: '📥' },
    { title: 'DOCUMENTOS E TRANSPORTE', order: 2, icon: '🧾' },
    { title: 'PESAGEM', order: 3, icon: '⚖️' },
    { title: 'QUANTIDADES', order: 4, icon: '🐄' },
    { title: 'ACHADOS', order: 5, icon: '🔍' },
    { title: 'RESPONSÁVEIS', order: 6, icon: '👤' },
  ],
  fieldConfig: {
    numeroOs: { key: 'numeroOs', label: 'Nº OS', section: 'RECEBIMENTO', priority: 1 },
    dataChegada: { key: 'dataChegada', label: 'DATA CHEGADA', section: 'RECEBIMENTO', priority: 2 },
    horaChegada: { key: 'horaChegada', label: 'HORA CHEGADA', section: 'RECEBIMENTO', priority: 3 },
    loteNome: { key: 'loteNome', label: 'LOTE DESTINO', section: 'RECEBIMENTO', priority: 4 },
    destino: {
      key: 'destino',
      label: 'DESTINO',
      section: 'RECEBIMENTO',
      priority: 5,
      format: (v) => DESTINO_LABEL[String(v)] || String(v || '—'),
    },
    numeroGta: { key: 'numeroGta', label: 'Nº GTA', section: 'DOCUMENTOS E TRANSPORTE', priority: 1 },
    numeroNf: { key: 'numeroNf', label: 'Nº NF', section: 'DOCUMENTOS E TRANSPORTE', priority: 2 },
    docOrigem: { key: 'docOrigem', label: 'DOC. ORIGEM', section: 'DOCUMENTOS E TRANSPORTE', priority: 3 },
    transportadora: { key: 'transportadora', section: 'DOCUMENTOS E TRANSPORTE', priority: 4 },
    placaVeiculo: { key: 'placaVeiculo', label: 'PLACA VEÍCULO', section: 'DOCUMENTOS E TRANSPORTE', priority: 5 },
    placaReboque: { key: 'placaReboque', label: 'PLACA REBOQUE', section: 'DOCUMENTOS E TRANSPORTE', priority: 6 },
    motorista: { key: 'motorista', section: 'DOCUMENTOS E TRANSPORTE', priority: 7 },
    pesoMedioBalancao: {
      key: 'pesoMedioBalancao',
      label: 'PESO MÉDIO BALANÇO (KG/CAB)',
      section: 'PESAGEM',
      priority: 1,
      format: (v) => `${formatarNumeroBR(v as any)} kg`,
    },
    pesoOrigem: {
      key: 'pesoOrigem',
      label: 'PESO ORIGEM (KG)',
      section: 'PESAGEM',
      priority: 2,
      format: (v) => `${formatarNumeroBR(v as any)} kg`,
    },
    horaPesagem: { key: 'horaPesagem', label: 'HORA PESAGEM', section: 'PESAGEM', priority: 3 },
    contagens: {
      key: 'contagens',
      label: 'RECEBIDOS POR CATEGORIA',
      section: 'QUANTIDADES',
      priority: 1,
      colSpan: 2,
      format: (v) => {
        if (!Array.isArray(v)) return '—'
        const total = v.reduce((s: number, c: any) => s + (Number(c.femeas) || 0) + (Number(c.machos) || 0), 0)
        const linhas = v.map((c: any) => {
          const partes: string[] = []
          if (c.femeas > 0) partes.push(`${c.femeas} F`)
          if (c.machos > 0) partes.push(`${c.machos} M`)
          return `${c.categoria}: ${partes.join(' + ')}`
        })
        return `${total} cabeças\n${linhas.join('\n')}`
      },
    },
    checklist: {
      key: 'checklist',
      label: 'ACHADOS NO RECEBIMENTO',
      section: 'ACHADOS',
      priority: 1,
      colSpan: 2,
      format: (v) => {
        if (!Array.isArray(v)) return '—'
        const achados = v.filter((c: any) => c.resposta === 'S')
        if (achados.length === 0) return 'Sem achados'
        return achados
          .map((a: any) => `${a.item}${a.observacao ? ` (${a.observacao})` : ''}`)
          .join('\n')
      },
    },
    scoreCorporal: { key: 'scoreCorporal', label: 'ESCORE CORPORAL', section: 'ACHADOS', priority: 2 },
    mortes: { key: 'mortes', label: 'MORTES NO TRANSPORTE', section: 'ACHADOS', priority: 3 },
    responsavel: { key: 'responsavel', section: 'RESPONSÁVEIS', priority: 1 },
    auxiliar: { key: 'auxiliar', section: 'RESPONSÁVEIS', priority: 2 },
    observacao: { key: 'observacao', label: 'OBSERVAÇÃO', section: 'RESPONSÁVEIS', priority: 3, colSpan: 2 },
    videoEnviado: {
      key: 'videoEnviado',
      label: 'VÍDEO',
      section: 'RECEBIMENTO',
      priority: 6,
      format: (v, r) => {
        if (v === true) return 'Enviado'
        if ((r as any).videoBlob || (r as any).videoNome) return 'Pendente de envio'
        return '—'
      },
    },
  },
  hiddenFields: ['osId', 'loteId', 'videoBlob', 'videoNome', 'sessaoId', 'supabaseId', 'syncError'],
}

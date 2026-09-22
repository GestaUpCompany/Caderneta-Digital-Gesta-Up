import { CadernetaDisplayConfig } from '../registroDisplayConfig'
import { formatarNumeroBR } from '../../utils/formatNumber'

const TIPO_VENDA_LABEL: Record<string, string> = {
  abate: 'Abate',
  animal_vivo: 'Animal Vivo',
}

export const ordensServicoConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'ORDEM DE SERVIÇO', order: 1, icon: '📄' },
    { title: 'PARTES', order: 2, icon: '🤝' },
    { title: 'ANIMAIS', order: 3, icon: '🐄' },
    { title: 'DATAS E VALORES', order: 4, icon: '📅' },
    { title: 'OBSERVAÇÃO', order: 5, icon: '📝' },
  ],
  fieldConfig: {
    numeroOs: { key: 'numeroOs', label: 'Nº OS', section: 'ORDEM DE SERVIÇO', priority: 1 },
    tipoVenda: {
      key: 'tipoVenda',
      label: 'TIPO DA VENDA',
      section: 'ORDEM DE SERVIÇO',
      priority: 2,
      format: (v) => TIPO_VENDA_LABEL[String(v)] || String(v),
    },
    statusOs: {
      key: 'statusOs',
      label: 'STATUS',
      section: 'ORDEM DE SERVIÇO',
      priority: 3,
      format: (v) => String(v || 'Aberta').toUpperCase().replace(/_/g, ' '),
    },
    vendedor: { key: 'vendedor', section: 'PARTES', priority: 1 },
    comprador: { key: 'comprador', section: 'PARTES', priority: 2 },
    vendaDireta: {
      key: 'vendaDireta',
      label: 'VENDA DIRETA',
      section: 'PARTES',
      priority: 3,
      format: (v) => (v === false ? 'Não' : 'Sim'),
    },
    corretora: {
      key: 'corretora',
      section: 'PARTES',
      priority: 4,
      condition: (r) => r.vendaDireta === false,
    },
    quantidadePrevista: { key: 'quantidadePrevista', section: 'ANIMAIS', priority: 1 },
    sexo: { key: 'sexo', section: 'ANIMAIS', priority: 2 },
    idadeEra: { key: 'idadeEra', section: 'ANIMAIS', priority: 3 },
    dataPrevistaEmbarque: { key: 'dataPrevistaEmbarque', section: 'DATAS E VALORES', priority: 1 },
    dataPrevistaAbate: {
      key: 'dataPrevistaAbate',
      section: 'DATAS E VALORES',
      priority: 2,
      condition: (r) => r.tipoVenda === 'abate',
    },
    dataPrevistaPagamento: { key: 'dataPrevistaPagamento', section: 'DATAS E VALORES', priority: 3 },
    precoArroba: {
      key: 'precoArroba',
      section: 'DATAS E VALORES',
      priority: 4,
      format: (v) => `R$ ${formatarNumeroBR(v as any)}/@`,
    },
    observacao: { key: 'observacao', section: 'OBSERVAÇÃO', priority: 1, colSpan: 2 },
  },
  hiddenFields: ['tipo', 'osId', 'supabaseId', 'syncError'],
}

import { CadernetaDisplayConfig } from '../registroDisplayConfig'
import { formatarNumeroBR } from '../../utils/formatNumber'

const TIPO_VENDA_LABEL: Record<string, string> = {
  abate: 'Abate',
  animal_vivo: 'Animal Vivo',
}

const MODO_PRECO_LABEL: Record<string, string> = {
  por_kg: 'Por KG',
  por_ua: 'Por UA',
}

const FORMA_PAGAMENTO_LABEL: Record<string, string> = {
  pix: 'PIX',
  boleto: 'Boleto',
  ted: 'TED',
  dinheiro: 'Dinheiro',
}

export const ordensServicoConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'ORDEM DE SERVIÇO', order: 1, icon: '📄' },
    { title: 'PARTES', order: 2, icon: '🤝' },
    { title: 'ORIGEM', order: 2, icon: '📍' },
    { title: 'ANIMAIS', order: 3, icon: '🐄' },
    { title: 'DATAS E VALORES', order: 4, icon: '📅' },
    { title: 'PAGAMENTO E FRETE', order: 5, icon: '💰' },
    { title: 'OBSERVAÇÃO', order: 6, icon: '📝' },
  ],
  fieldConfig: {
    numeroOs: { key: 'numeroOs', label: 'Nº OS', section: 'ORDEM DE SERVIÇO', priority: 1 },
    tipo: {
      key: 'tipo',
      label: 'TIPO',
      section: 'ORDEM DE SERVIÇO',
      priority: 1,
      format: (v) => String(v || 'venda').toUpperCase(),
    },
    tipoVenda: {
      key: 'tipoVenda',
      label: 'TIPO DA VENDA',
      section: 'ORDEM DE SERVIÇO',
      priority: 2,
      condition: (r) => (r.tipo || 'venda') === 'venda',
      format: (v) => TIPO_VENDA_LABEL[String(v)] || String(v),
    },
    // Compra: comprador/empresa (e origem legada quando houver)
    compradorOs: {
      key: 'comprador',
      label: 'COMPRADOR',
      section: 'PARTES',
      priority: 1,
      condition: (r) => r.tipo === 'compra',
    },
    fornecedor: {
      key: 'fornecedor',
      label: 'EMPRESA',
      section: 'PARTES',
      priority: 2,
      condition: (r) => r.tipo === 'compra',
    },
    origemFazenda: {
      key: 'origemFazenda',
      label: 'FAZENDA DE ORIGEM',
      section: 'ORIGEM',
      priority: 1,
      condition: (r) => r.tipo === 'compra' && !!r.origemFazenda,
    },
    origemMunicipioUf: {
      key: 'origemMunicipioUf',
      label: 'MUNICÍPIO/UF',
      section: 'ORIGEM',
      priority: 3,
      condition: (r) => r.tipo === 'compra' && !!r.origemMunicipioUf,
    },
    statusOs: {
      key: 'statusOs',
      label: 'STATUS',
      section: 'ORDEM DE SERVIÇO',
      priority: 3,
      format: (v) => String(v || 'Aberta').toUpperCase().replace(/_/g, ' '),
    },
    vendedor: {
      key: 'vendedor',
      section: 'PARTES',
      priority: 1,
      condition: (r) => (r.tipo || 'venda') === 'venda',
    },
    comprador: {
      key: 'comprador',
      section: 'PARTES',
      priority: 2,
      condition: (r) => (r.tipo || 'venda') === 'venda',
    },
    vendaDireta: {
      key: 'vendaDireta',
      label: 'VENDA DIRETA',
      section: 'PARTES',
      priority: 3,
      condition: (r) => (r.tipo || 'venda') === 'venda',
      format: (v) => (v === false ? 'Não' : 'Sim'),
    },
    corretora: {
      key: 'corretora',
      section: 'PARTES',
      priority: 4,
      condition: (r) => (r.tipo || 'venda') === 'venda' && r.vendaDireta === false,
    },
    // Transferência: solicitante + fazenda de destino (mesmo grupo)
    solicitante: {
      key: 'vendedor',
      label: 'SOLICITANTE',
      section: 'PARTES',
      priority: 1,
      condition: (r) => r.tipo === 'transferencia',
    },
    fazendaDestinoNome: {
      key: 'fazendaDestinoNome',
      label: 'FAZENDA DE DESTINO',
      section: 'PARTES',
      priority: 2,
      condition: (r) => r.tipo === 'transferencia' && !!r.fazendaDestinoNome,
    },
    quantidadePrevista: { key: 'quantidadePrevista', section: 'ANIMAIS', priority: 1 },
    sexo: { key: 'sexo', section: 'ANIMAIS', priority: 2 },
    idadeEra: { key: 'idadeEra', section: 'ANIMAIS', priority: 3 },
    dataPrevistaEmbarque: {
      key: 'dataPrevistaEmbarque',
      label: 'DATA PREVISTA',
      section: 'DATAS E VALORES',
      priority: 1,
      format: (v, r) => `${String(v)}${r.tipo === 'compra' ? ' (chegada)' : ''}`,
    },
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
      condition: (r) => (r.tipo || 'venda') === 'venda',
      format: (v) => `R$ ${formatarNumeroBR(v as any)}/@`,
    },
    // Compra: preço/pagamento/frete (legado — só exibe quando preenchido)
    modoPreco: {
      key: 'modoPreco',
      label: 'MODO DE PREÇO',
      section: 'PAGAMENTO E FRETE',
      priority: 1,
      condition: (r) => r.tipo === 'compra' && !!r.modoPreco,
      format: (v) => MODO_PRECO_LABEL[String(v)] || String(v || '—'),
    },
    valorTotalPrevisto: {
      key: 'valorTotalPrevisto',
      label: 'VALOR TOTAL PREVISTO',
      section: 'PAGAMENTO E FRETE',
      priority: 2,
      condition: (r) => r.tipo === 'compra' && r.valorTotalPrevisto != null,
      format: (v) => `R$ ${formatarNumeroBR(v as any)}`,
    },
    formaPagamento: {
      key: 'formaPagamento',
      label: 'FORMA DE PAGAMENTO',
      section: 'PAGAMENTO E FRETE',
      priority: 3,
      condition: (r) => r.tipo === 'compra' && !!r.formaPagamento,
      format: (v) => FORMA_PAGAMENTO_LABEL[String(v)] || String(v || '—'),
    },
    valorFrete: {
      key: 'valorFrete',
      label: 'VALOR DO FRETE',
      section: 'PAGAMENTO E FRETE',
      priority: 5,
      condition: (r) => r.tipo === 'compra' && r.valorFrete != null,
      format: (v) => `R$ ${formatarNumeroBR(v as any)}`,
    },
    dataSaida: {
      key: 'dataSaida',
      label: 'EMBARQUE',
      section: 'DATAS E VALORES',
      priority: 0,
      condition: (r) => r.tipo === 'compra' || r.tipo === 'transferencia',
    },
    observacao: { key: 'observacao', section: 'OBSERVAÇÃO', priority: 1, colSpan: 2 },
  },
  hiddenFields: ['osId', 'supabaseId', 'syncError', 'compraDetalhes'],
}

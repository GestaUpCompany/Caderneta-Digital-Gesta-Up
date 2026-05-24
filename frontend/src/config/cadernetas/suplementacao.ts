import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const suplementacaoConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'IDENTIFICAÇÃO', order: 1, icon: '📋' },
    { title: 'PRODUTO', order: 2, icon: '🧪' },
    { title: 'LEITURAS E QUANTIDADES', order: 3, icon: '⚖️' },
    { title: 'CHECKLIST COCHOS', order: 4, icon: '✅' },
    { title: 'CHECKLIST DEPÓSITO', order: 5, icon: '🏚️' },
  ],
  fieldConfig: {
    tratador: { key: 'tratador', section: 'IDENTIFICAÇÃO', priority: 1 },
    pasto: { key: 'pasto', section: 'IDENTIFICAÇÃO', priority: 2 },
    numeroLote: { key: 'numeroLote', section: 'IDENTIFICAÇÃO', priority: 3 },
    categorias: { key: 'categorias', section: 'IDENTIFICAÇÃO', priority: 4, colSpan: 2, format: (v) => Array.isArray(v) ? (v as string[]).join(', ') : String(v) },

    produto: { key: 'produto', section: 'PRODUTO', priority: 1, colSpan: 2 },

    leituraCocho: { key: 'leituraCocho', section: 'LEITURAS E QUANTIDADES', priority: 1 },
    kgCocho: { key: 'kgCocho', section: 'LEITURAS E QUANTIDADES', priority: 2 },
    kgDeposito: { key: 'kgDeposito', section: 'LEITURAS E QUANTIDADES', priority: 3 },
    escoreFezes: { key: 'escoreFezes', section: 'LEITURAS E QUANTIDADES', priority: 4 },

    limpezaCocho: { key: 'limpezaCocho', section: 'CHECKLIST COCHOS', priority: 1, format: (v) => v === true || v === 'S' ? 'Sim' : 'Não' },
    cochosCondicoes: { key: 'cochosCondicoes', section: 'CHECKLIST COCHOS', priority: 2, format: (v) => v === true || v === 'S' ? 'Sim' : 'Não' },
    aterroAcessoIdeal: { key: 'aterroAcessoIdeal', section: 'CHECKLIST COCHOS', priority: 3, format: (v) => v === true || v === 'S' ? 'Sim' : 'Não' },

    depositoCondicoes: { key: 'depositoCondicoes', section: 'CHECKLIST DEPÓSITO', priority: 1, format: (v) => v === true || v === 'S' ? 'Sim' : 'Não' },
    estoqueDepositio: { key: 'estoqueDepositio', section: 'CHECKLIST DEPÓSITO', priority: 2, format: (v) => v === true || v === 'S' ? 'Sim' : 'Não' },
  },
  hiddenFields: [],
}

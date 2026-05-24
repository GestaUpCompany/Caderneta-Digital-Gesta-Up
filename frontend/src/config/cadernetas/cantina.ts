import { CadernetaDisplayConfig } from '../registroDisplayConfig'

export const cantinaConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'DADOS DA CANTINA', order: 1, icon: '🍽️' },
    { title: 'QUANTIDADES', order: 2, icon: '🔢' },
    { title: 'ITENS', order: 3, icon: '📦' },
  ],
  fieldConfig: {
    numeroCozinheiras: { key: 'numeroCozinheiras', section: 'DADOS DA CANTINA', priority: 1 },
    quemCozinhou: { key: 'quemCozinhou', section: 'DADOS DA CANTINA', priority: 2 },
    quemAjudou: { key: 'quemAjudou', section: 'DADOS DA CANTINA', priority: 3 },

    numeroCafeManha: { key: 'numeroCafeManha', section: 'QUANTIDADES', priority: 1 },
    numeroLanches: { key: 'numeroLanches', section: 'QUANTIDADES', priority: 2 },
    numeroRefeicoesAlmoco: { key: 'numeroRefeicoesAlmoco', section: 'QUANTIDADES', priority: 3 },
    numeroRefeicoesJantar: { key: 'numeroRefeicoesJantar', section: 'QUANTIDADES', priority: 4 },

    observacao: { key: 'observacao', section: 'DADOS DA CANTINA', priority: 4, colSpan: 2 },
  },
  hiddenFields: ['itens'],
}

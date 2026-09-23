import { CadernetaDisplayConfig } from '../registroDisplayConfig'
import { isCategoriaAoPe } from '../../utils/categorias'

const suplementouAdulto = (r: any) => r.suplementarAdulto !== false
const suplementouCreep = (r: any) => r.suplementarCreep === true

export const suplementacaoConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'IDENTIFICAÇÃO', order: 1, icon: '📋' },
    { title: 'FORMULAÇÃO', order: 2, icon: '🧪' },
    { title: 'LEITURAS E QUANTIDADES', order: 3, icon: '⚖️' },
    { title: 'CREEP FEEDING', order: 4, icon: '🐮' },
    { title: 'CHECKLIST COCHOS', order: 5, icon: '✅' },
    { title: 'CHECKLIST DEPÓSITO', order: 6, icon: '🏚️' },
  ],
  fieldConfig: {
    tratador: { key: 'tratador', section: 'IDENTIFICAÇÃO', priority: 1 },
    pasto: { key: 'pasto', section: 'IDENTIFICAÇÃO', priority: 2 },
    numeroLote: { key: 'numeroLote', section: 'IDENTIFICAÇÃO', priority: 3 },
    categorias: {
      key: 'categorias',
      section: 'IDENTIFICAÇÃO',
      priority: 4,
      colSpan: 2,
      format: (v, r: any) => {
        const arr = Array.isArray(v)
          ? (v as string[])
          : String(v ?? '').split(/[,.;]+\s*/).filter(Boolean)
        // Registro só de creep: mostra as categorias ao pé (em creepCategorias)
        if (!suplementouAdulto(r) && suplementouCreep(r)) {
          return String(r.creepCategorias ?? arr.filter(isCategoriaAoPe).join(', '))
        }
        // Lançamento combinado: a lista principal mostra só as categorias adultas
        if (suplementouCreep(r)) {
          return arr.filter(c => !isCategoriaAoPe(c)).join(', ')
        }
        return arr.join(', ')
      },
    },

    // Bloco genérico carrega o lote adulto; em registro só de creep ele ficaria
    // duplicado com a seção CREEP FEEDING, então é ocultado
    formulacao: { key: 'formulacao', section: 'FORMULAÇÃO', priority: 1, colSpan: 2, condition: suplementouAdulto },

    leituraCocho: { key: 'leituraCocho', section: 'LEITURAS E QUANTIDADES', priority: 1, condition: suplementouAdulto },
    kgCocho: { key: 'kgCocho', section: 'LEITURAS E QUANTIDADES', priority: 2, condition: suplementouAdulto },
    kgDeposito: { key: 'kgDeposito', section: 'LEITURAS E QUANTIDADES', priority: 3, condition: (r: any) => Number(r.kgDeposito) > 0 },
    escoreFezes: { key: 'escoreFezes', section: 'LEITURAS E QUANTIDADES', priority: 4 },

    creepFormulacao: { key: 'creepFormulacao', section: 'CREEP FEEDING', priority: 1, colSpan: 2 },
    creepLeitura: { key: 'creepLeitura', section: 'CREEP FEEDING', priority: 2 },
    creepKgCocho: { key: 'creepKgCocho', section: 'CREEP FEEDING', priority: 3 },
    creepQtdSacos: { key: 'creepQtdSacos', section: 'CREEP FEEDING', priority: 4 },
    creepNCabecas: { key: 'creepNCabecas', section: 'CREEP FEEDING', priority: 5 },

    limpezaCocho: { key: 'limpezaCocho', section: 'CHECKLIST COCHOS', priority: 1, format: (v) => v === true || v === 'S' ? 'Sim' : 'Não' },
    espacamentoCochoAdequado: { key: 'espacamentoCochoAdequado', section: 'CHECKLIST COCHOS', priority: 2, format: (v) => v === true || v === 'S' ? 'Sim' : 'Não' },
    cochosCondicoes: { key: 'cochosCondicoes', section: 'CHECKLIST COCHOS', priority: 3, format: (v) => v === true || v === 'S' ? 'Sim' : 'Não' },
    aterroAcessoIdeal: { key: 'aterroAcessoIdeal', section: 'CHECKLIST COCHOS', priority: 4, format: (v) => v === true || v === 'S' ? 'Sim' : 'Não' },

    depositoCondicoes: { key: 'depositoCondicoes', section: 'CHECKLIST DEPÓSITO', priority: 1, format: (v) => v === true || v === 'S' ? 'Sim' : 'Não' },
  },
  hiddenFields: [],
}

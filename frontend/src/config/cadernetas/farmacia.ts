import { CadernetaDisplayConfig } from '../registroDisplayConfig'
import {
  custoTotalRegistro,
  custoUnitarioRegistro,
  quantidadeRegistro,
  validadeRegistro,
} from '../../utils/farmaciaEstoque'

const rotuloTipo = (value: unknown) => (value === 'baixa' ? 'SAÍDA' : 'ENTRADA')

export const farmaciaConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'MOVIMENTO', order: 1, icon: '💊' },
    { title: 'DADOS DA COMPRA', order: 2, icon: '🧾' },
  ],
  fieldConfig: {
    tipoMovimentacao: { key: 'tipoMovimentacao', section: 'MOVIMENTO', priority: 1, format: rotuloTipo },
    medicamentoNome: { key: 'medicamentoNome', section: 'MOVIMENTO', priority: 2 },
    // A unidade entra junto da quantidade ("2 frascos"), por isso não há campo separado
    quantidade: { key: 'quantidade', section: 'MOVIMENTO', priority: 3, format: (_v, r) => quantidadeRegistro(r) },
    loteProduto: { key: 'loteProduto', section: 'MOVIMENTO', priority: 4 },
    observacao: { key: 'observacao', section: 'MOVIMENTO', priority: 5, colSpan: 2 },
    custoUnitario: { key: 'custoUnitario', section: 'DADOS DA COMPRA', priority: 1, format: (_v, r) => {
        const unitario = custoUnitarioRegistro(r) ?? '—'
        const total = custoTotalRegistro(r)
        return total ? `${unitario} (total ${total})` : unitario
      },
    },
    validade: { key: 'validade', section: 'DADOS DA COMPRA', priority: 2, format: (_v, r) => validadeRegistro(r) ?? '—' },
    fornecedor: { key: 'fornecedor', section: 'DADOS DA COMPRA', priority: 3 },
    notaFiscal: { key: 'notaFiscal', section: 'DADOS DA COMPRA', priority: 4 },
  },
  hiddenFields: ['medicamentoId', 'unidade', 'novoMedicamento', 'fazendaId', 'supabaseId', 'isTestRecord'],
}

import { CadernetaDisplayConfig, Registro } from '../registroDisplayConfig'
import { SECOES_5S, calcularResultado5S } from '../../utils/auditoria5sItens'

const itensDe = (r: Registro) => (r.itens ?? {}) as Record<string, string>

export const auditoria5sConfig: CadernetaDisplayConfig = {
  sections: [
    { title: 'IDENTIFICAÇÃO', order: 1, icon: '👤' },
    { title: 'RESULTADO', order: 2, icon: '✅' },
    { title: 'NÃO CONFORMIDADES', order: 3, icon: '⚠️' },
  ],
  fieldConfig: {
    setor: { key: 'setor', label: 'SETOR', section: 'IDENTIFICAÇÃO', priority: 1 },
    responsavel: { key: 'responsavel', label: 'RESPONSÁVEL', section: 'IDENTIFICAÇÃO', priority: 2 },
    percentualConformidade: {
      key: 'percentualConformidade', label: 'CONFORMIDADE', section: 'RESULTADO', priority: 1,
      format: (v) => (v === null || v === undefined ? '—' : `${v}%`),
    },
    totalConformes: { key: 'totalConformes', label: 'ITENS CONFORMES (C)', section: 'RESULTADO', priority: 2 },
    totalNaoConformes: { key: 'totalNaoConformes', label: 'ITENS NÃO CONFORMES (N)', section: 'RESULTADO', priority: 3 },
    notaGeral: {
      key: 'notaGeral', label: 'NOTA DO SETOR', section: 'RESULTADO', priority: 4,
      format: (v) => (v === null || v === undefined || v === '' ? '—' : `${v}/5`),
    },
    itens: {
      key: 'itens', label: 'ITENS', section: 'NÃO CONFORMIDADES', priority: 1, colSpan: 2,
      format: (_v, r) => {
        const itens = itensDe(r)
        const evidencias = (r.naoConformidades ?? {}) as Record<string, { observacao?: string } | undefined>
        const linhas = SECOES_5S.flatMap((s) =>
          s.itens
            .filter((i) => itens[i.chave] === 'N')
            .map((i) => {
              const obs = String(evidencias[i.chave]?.observacao ?? '').trim()
              return `${s.titulo}: ${i.negativa}${obs ? `\n   ↳ ${obs}` : ''}`
            })
        )
        return linhas.length > 0 ? linhas.join('\n') : 'Nenhuma'
      },
    },
    observacoes: {
      key: 'observacoes', label: 'OBSERVAÇÕES', section: 'NÃO CONFORMIDADES', priority: 2, colSpan: 2,
      format: (v) => {
        const obs = (v ?? {}) as Record<string, string>
        const linhas = SECOES_5S.filter((s) => obs[s.id]).map((s) => `${s.titulo}: ${obs[s.id]}`)
        return linhas.join('\n')
      },
      condition: (r) => Object.values((r.observacoes ?? {}) as Record<string, string>).some(Boolean),
    },
  },
  hiddenFields: ['setorId', 'totalItens', 'naoConformidades', 'pendencias', 'pendenciasAbertas'],
  cardBadge: {
    key: 'percentualConformidade',
    format: (v) => (v === null || v === undefined ? '' : `${v}%`),
  },
}

export const resumoAuditoria5s = (r: Registro) => calcularResultado5S(itensDe(r))

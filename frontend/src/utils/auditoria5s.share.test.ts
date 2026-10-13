import { describe, expect, it } from 'vitest'
import { CHAVES_ITENS_5S, SECOES_5S } from './auditoria5sItens'
import { formatarRegistroComoTexto } from './shareUtils'

const itens = (naoConformes: string[] = []) => Object.fromEntries(CHAVES_ITENS_5S.map((c) => [c, naoConformes.includes(c) ? 'N' : 'C']))

const registro = (extra: Record<string, unknown> = {}) => ({
  id: 'x',
  data: '13/10/2026 10:51',
  setor: 'Serviço Geral',
  responsavel: 'Victor Hugo',
  itens: itens(['limpeza_3', 'limpeza_4', 'disciplina_2']),
  observacoes: null,
  ...extra,
})

describe('texto de compartilhar da Auditoria 5S', () => {
  it('traz cada item N como afirmação negativa, não como a pergunta', () => {
    const texto = formatarRegistroComoTexto(registro(), 'auditoria-5s')
    expect(texto).toContain('NÃO CONFORMIDADES (3)')
    expect(texto).toContain('❌ A rotina de limpeza do local não está sendo cumprida.')
    expect(texto).toContain('❌ Há fontes de sujeira que não foram eliminadas.')
    expect(texto).toContain('❌ As não conformidades anteriores não foram corrigidas.')
    expect(texto).not.toContain('A rotina de limpeza do local está sendo cumprida?')
    expect(texto).not.toContain('?')
  })

  it('agrupa por pilar com percentual e resume os pilares sem problema', () => {
    const texto = formatarRegistroComoTexto(registro(), 'auditoria-5s')
    expect(texto).toContain('*Limpeza* (60%)')
    expect(texto).toContain('*Disciplina* (80%)')
    expect(texto).toContain('Sem não conformidades: Utilização, Organização, Padronização')
    expect(texto).toContain('Conformidade: *88%* (22 C / 3 N)')
  })

  it('tudo conforme: sem seção de não conformidades', () => {
    const texto = formatarRegistroComoTexto(registro({ itens: itens() }), 'auditoria-5s')
    expect(texto).toContain('Nenhuma não conformidade')
    expect(texto).not.toContain('❌')
    expect(texto).not.toContain('Sem não conformidades:')
  })

  it('observação do pilar acompanha as não conformidades; a de pilar sem N vai em Observações', () => {
    const texto = formatarRegistroComoTexto(
      registro({ observacoes: { limpeza: 'Piso sujo na oficina', utilizacao: 'Sobra de material' } }),
      'auditoria-5s'
    )
    expect(texto).toContain('📝 Piso sujo na oficina')
    expect(texto).toContain('📝 *Observações*\nUtilização: Sobra de material')
  })

  it('toda não conformidade tem afirmação própria, diferente da pergunta', () => {
    for (const secao of SECOES_5S) {
      for (const item of secao.itens) {
        expect(item.negativa.length).toBeGreaterThan(0)
        expect(item.negativa).not.toBe(item.texto)
        expect(item.negativa.endsWith('.')).toBe(true)
      }
    }
  })
})

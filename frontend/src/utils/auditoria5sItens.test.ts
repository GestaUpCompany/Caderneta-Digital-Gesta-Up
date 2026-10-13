import { describe, expect, it } from 'vitest'
import { CHAVES_ITENS_5S, TOTAL_ITENS_5S, calcularResultado5S } from './auditoria5sItens'
import { validateAuditoria5s } from './validation'

const todos = (resposta: 'C' | 'N' | 'NA') => Object.fromEntries(CHAVES_ITENS_5S.map((c) => [c, resposta]))

describe('calcularResultado5S', () => {
  it('tem 25 itens com chaves únicas', () => {
    expect(TOTAL_ITENS_5S).toBe(25)
    expect(new Set(CHAVES_ITENS_5S).size).toBe(25)
  })

  it('sem respostas não tem percentual', () => {
    const r = calcularResultado5S({})
    expect(r.respondidos).toBe(0)
    expect(r.percentual).toBeNull()
    expect(r.secoes.every((s) => s.percentual === null)).toBe(true)
  })

  it('tudo conforme = 100%', () => {
    const r = calcularResultado5S(todos('C'))
    expect(r).toMatchObject({ conformes: 25, naoConformes: 0, percentual: 100 })
  })

  it('calcula por seção e geral', () => {
    const itens: Record<string, string> = { ...todos('C'), utilizacao_1: 'N', utilizacao_2: 'N', disciplina_5: 'N' }
    const r = calcularResultado5S(itens)
    expect(r.naoConformes).toBe(3)
    expect(r.percentual).toBe(88)
    expect(r.secoes.find((s) => s.id === 'utilizacao')).toMatchObject({ conformes: 3, naoConformes: 2, percentual: 60 })
    expect(r.secoes.find((s) => s.id === 'disciplina')?.percentual).toBe(80)
  })

  it('ignora valores que não são C/N/NA', () => {
    const r = calcularResultado5S({ utilizacao_1: '-', utilizacao_2: 'C' })
    expect(r.respondidos).toBe(1)
  })

  it('NA conta como respondido mas fica fora do percentual', () => {
    const itens = { ...todos('C'), utilizacao_1: 'NA', utilizacao_2: 'NA', limpeza_1: 'N' }
    const r = calcularResultado5S(itens)
    expect(r).toMatchObject({ respondidos: 25, conformes: 22, naoConformes: 1, naoAplicaveis: 2 })
    // 22 / (22 + 1) = 95,65%
    expect(r.percentual).toBe(95.65)
    expect(r.secoes.find((s) => s.id === 'utilizacao')).toMatchObject({ conformes: 3, naoAplicaveis: 2, percentual: 100 })
  })

  it('tudo NA não tem percentual e pilar todo NA também não', () => {
    expect(calcularResultado5S(todos('NA')).percentual).toBeNull()
    const limpezaNA = Object.fromEntries(CHAVES_ITENS_5S.filter((c) => c.startsWith('limpeza')).map((c) => [c, 'NA']))
    const r = calcularResultado5S({ ...todos('C'), ...limpezaNA })
    expect(r.secoes.find((s) => s.id === 'limpeza')?.percentual).toBeNull()
    expect(r.percentual).toBe(100)
  })
})

describe('validateAuditoria5s', () => {
  const base = (): Record<string, unknown> => ({ data: '09/10/2026', setor: 'Oficina', responsavel: 'João', itens: todos('C') })
  const campos = (extra: Record<string, unknown> = {}) => validateAuditoria5s({ ...base(), ...extra }).errors.map((e) => e.field)

  it('aceita o registro completo', () => {
    expect(validateAuditoria5s(base()).isValid).toBe(true)
  })

  it('exige setor e responsável', () => {
    expect(campos({ setor: '' })).toEqual(['setor'])
    expect(campos({ responsavel: '  ' })).toEqual(['responsavel'])
  })

  it('aceita NA como resposta válida', () => {
    expect(validateAuditoria5s({ ...base(), itens: { ...todos('C'), utilizacao_1: 'NA' } }).isValid).toBe(true)
  })

  it('aponta cada item sem resposta', () => {
    const { utilizacao_3: _omitido, ...resto } = todos('C')
    expect(campos({ itens: resto })).toEqual(['utilizacao_3'])
    expect(campos({ itens: undefined })).toHaveLength(25)
  })
})

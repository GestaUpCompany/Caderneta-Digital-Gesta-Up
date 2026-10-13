import { describe, expect, it } from 'vitest'
import { calcularPendenciasBebedouro, diasEntre, type RegistroChecklistBebedouro } from './pendenciasBebedouro'

const reg = (data: string, checklist: Record<string, any> | null, localId?: string): RegistroChecklistBebedouro => ({ data, checklist, localId })
const ok = (valor: boolean, extra: Record<string, unknown> = {}) => ({ valor, observacao: '', ...extra })

describe('calcularPendenciasBebedouro', () => {
  it('sem registros não há pendência', () => {
    expect(calcularPendenciasBebedouro([])).toEqual({ abertas: [], resolvidas: [] })
  })

  it('item com problema no último registro fica aberto, com desde e observação', () => {
    const r = calcularPendenciasBebedouro([
      reg('2026-10-01T10:00:00Z', { agua_suficiente: ok(false, { observacao: 'Caixa seca', foto_url: 'https://x/a.webp' }) }),
    ])
    expect(r.abertas).toHaveLength(1)
    expect(r.abertas[0]).toMatchObject({
      campo: 'aguaSuficiente',
      chave: 'agua_suficiente',
      desde: '2026-10-01T10:00:00Z',
      observacao: 'Caixa seca',
      fotoUrl: 'https://x/a.webp',
      ocorrencias: 1,
    })
  })

  it('um true posterior resolve e entra nas resolvidas', () => {
    const r = calcularPendenciasBebedouro([
      reg('2026-10-01T10:00:00Z', { agua_suficiente: ok(false) }),
      reg('2026-10-05T10:00:00Z', { agua_suficiente: ok(true) }),
    ])
    expect(r.abertas).toEqual([])
    expect(r.resolvidas).toEqual([
      expect.objectContaining({ campo: 'aguaSuficiente', abertaEm: '2026-10-01T10:00:00Z', resolvidaEm: '2026-10-05T10:00:00Z' }),
    ])
  })

  it('"ainda pendente" sem foto/observação nova mantém a evidência da ocorrência original', () => {
    const r = calcularPendenciasBebedouro([
      reg('2026-10-01T10:00:00Z', { agua_suficiente: ok(false, { observacao: 'Caixa seca', foto_url: 'https://x/a.webp' }) }),
      reg('2026-10-05T10:00:00Z', { agua_suficiente: ok(false) }),
    ])
    expect(r.abertas[0]).toMatchObject({ desde: '2026-10-01T10:00:00Z', observacao: 'Caixa seca', fotoUrl: 'https://x/a.webp', ocorrencias: 2 })
  })

  it('foto ou observação nova substitui a anterior', () => {
    const r = calcularPendenciasBebedouro([
      reg('2026-10-01T10:00:00Z', { agua_suficiente: ok(false, { observacao: 'a', foto_url: 'https://x/a.webp' }) }),
      reg('2026-10-05T10:00:00Z', { agua_suficiente: ok(false, { observacao: 'b', foto_url: 'https://x/b.webp' }) }),
    ])
    expect(r.abertas[0]).toMatchObject({ observacao: 'b', fotoUrl: 'https://x/b.webp' })
  })

  it('vários false seguidos contam como uma pendência desde o primeiro', () => {
    const r = calcularPendenciasBebedouro([
      reg('2026-10-01T10:00:00Z', { agua_suficiente: ok(false, { observacao: 'a' }) }),
      reg('2026-10-03T10:00:00Z', { agua_suficiente: ok(false, { observacao: 'b' }) }),
      reg('2026-10-06T10:00:00Z', { agua_suficiente: ok(false, { observacao: 'c' }) }),
    ])
    expect(r.abertas[0]).toMatchObject({ desde: '2026-10-01T10:00:00Z', ultimaData: '2026-10-06T10:00:00Z', observacao: 'c', ocorrencias: 3 })
  })

  it('reabertura: false, true, false abre uma pendência nova desde o último false', () => {
    const r = calcularPendenciasBebedouro([
      reg('2026-10-01T10:00:00Z', { agua_suficiente: ok(false) }),
      reg('2026-10-03T10:00:00Z', { agua_suficiente: ok(true) }),
      reg('2026-10-08T10:00:00Z', { agua_suficiente: ok(false) }),
    ])
    expect(r.abertas[0]).toMatchObject({ desde: '2026-10-08T10:00:00Z', ocorrencias: 1 })
    expect(r.resolvidas).toHaveLength(1)
  })

  it('registro sem o item (só foto, checklist inativo) não resolve nem abre', () => {
    const r = calcularPendenciasBebedouro([
      reg('2026-10-01T10:00:00Z', { agua_suficiente: ok(false) }),
      reg('2026-10-03T10:00:00Z', { foto_bebedouro: ok(true, { foto_url: 'https://x/f.webp' }) }),
      reg('2026-10-04T10:00:00Z', null),
    ])
    expect(r.abertas).toHaveLength(1)
    expect(r.resolvidas).toEqual([])
  })

  it('limpou_hoje = false não é pendência do bebedouro', () => {
    expect(calcularPendenciasBebedouro([reg('2026-10-01T10:00:00Z', { limpou_hoje: ok(false) })]).abertas).toEqual([])
  })

  it('usa a data do evento, não a ordem de chegada (registro antigo que chega depois não reabre)', () => {
    // Chegou primeiro o registro de 05/10 (resolvido); depois o de 01/10 (problema) sincronizou atrasado.
    const r = calcularPendenciasBebedouro([
      reg('2026-10-05T10:00:00Z', { agua_suficiente: ok(true) }, 'b'),
      reg('2026-10-01T10:00:00Z', { agua_suficiente: ok(false) }, 'a'),
    ])
    expect(r.abertas).toEqual([])
    expect(r.resolvidas).toHaveLength(1)
  })

  it('o mesmo registro vindo do servidor e do aparelho conta uma vez só', () => {
    const r = calcularPendenciasBebedouro([
      reg('2026-10-01T10:00:00Z', { agua_suficiente: ok(false) }, 'x'),
      reg('2026-10-01T10:00:00Z', { agua_suficiente: ok(false) }, 'x'),
    ])
    expect(r.abertas[0].ocorrencias).toBe(1)
  })

  it('itens independentes: um resolvido, outro aberto; abertas da mais antiga para a mais nova', () => {
    const r = calcularPendenciasBebedouro([
      reg('2026-10-01T10:00:00Z', { vazao_bebedouro_ideal: ok(false), agua_suficiente: ok(false) }),
      reg('2026-10-04T10:00:00Z', { vazao_bebedouro_ideal: ok(false), agua_suficiente: ok(true), boia_protecao_boas_condicoes: ok(false) }),
    ])
    expect(r.abertas.map((p) => p.chave)).toEqual(['vazao_bebedouro_ideal', 'boia_protecao_boas_condicoes'])
    expect(r.resolvidas.map((p) => p.chave)).toEqual(['agua_suficiente'])
  })

  it('valor que não é booleano é ignorado', () => {
    expect(calcularPendenciasBebedouro([reg('2026-10-01T10:00:00Z', { agua_suficiente: { valor: 'Não' } })]).abertas).toEqual([])
  })
})

describe('diasEntre', () => {
  it('conta dias inteiros e nunca fica negativo', () => {
    expect(diasEntre('2026-10-01T10:00:00Z', '2026-10-04T09:00:00Z')).toBe(2)
    expect(diasEntre('2026-10-04T10:00:00Z', '2026-10-01T10:00:00Z')).toBe(0)
  })
})

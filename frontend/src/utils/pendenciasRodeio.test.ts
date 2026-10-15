import { describe, expect, it } from 'vitest'
import { calcularPendenciasRodeio, type RegistroDiagnosticoRodeio } from './pendenciasRodeio'

const reg = (data: string, diagnosticos: Record<string, any> | null, localId?: string): RegistroDiagnosticoRodeio => ({ data, diagnosticos, localId })
const item = (valor: string | boolean, extra: Record<string, unknown> = {}) => ({ valor, observacao: '', ...extra })

describe('calcularPendenciasRodeio', () => {
  it('sem registros não há pendência', () => {
    expect(calcularPendenciasRodeio([])).toEqual({ abertas: [], resolvidas: [] })
  })

  it("'N' é problema: fica aberto com desde, observação e foto", () => {
    const r = calcularPendenciasRodeio([
      reg('2026-10-01T10:00:00Z', { cercasCochosPorteiras: item('N', { observacao: 'Arame solto', foto_url: 'https://x/a.webp' }) }),
    ])
    expect(r.abertas).toHaveLength(1)
    expect(r.abertas[0]).toMatchObject({
      campo: 'cercasCochosPorteiras',
      desde: '2026-10-01T10:00:00Z',
      observacao: 'Arame solto',
      fotoUrl: 'https://x/a.webp',
      ocorrencias: 1,
    })
  })

  it("um 'S' posterior resolve e entra nas resolvidas", () => {
    const r = calcularPendenciasRodeio([
      reg('2026-10-01T10:00:00Z', { bebedourosCochos: item('N') }),
      reg('2026-10-05T10:00:00Z', { bebedourosCochos: item('S') }),
    ])
    expect(r.abertas).toEqual([])
    expect(r.resolvidas).toEqual([
      expect.objectContaining({ campo: 'bebedourosCochos', abertaEm: '2026-10-01T10:00:00Z', resolvidaEm: '2026-10-05T10:00:00Z' }),
    ])
  })

  it('"ainda pendente" sem foto/observação nova mantém a evidência original', () => {
    const r = calcularPendenciasRodeio([
      reg('2026-10-01T10:00:00Z', { bebedourosCochos: item('N', { observacao: 'Cocho quebrado', foto_url: 'https://x/a.webp' }) }),
      reg('2026-10-05T10:00:00Z', { bebedourosCochos: item('N') }),
    ])
    expect(r.abertas[0]).toMatchObject({ desde: '2026-10-01T10:00:00Z', observacao: 'Cocho quebrado', fotoUrl: 'https://x/a.webp', ocorrencias: 2 })
  })

  it('foto ou observação nova substitui a anterior', () => {
    const r = calcularPendenciasRodeio([
      reg('2026-10-01T10:00:00Z', { bebedourosCochos: item('N', { observacao: 'a', foto_url: 'https://x/a.webp' }) }),
      reg('2026-10-05T10:00:00Z', { bebedourosCochos: item('N', { observacao: 'b', foto_url: 'https://x/b.webp' }) }),
    ])
    expect(r.abertas[0]).toMatchObject({ observacao: 'b', fotoUrl: 'https://x/b.webp' })
  })

  it('reabertura: N, S, N abre pendência nova desde o último N', () => {
    const r = calcularPendenciasRodeio([
      reg('2026-10-01T10:00:00Z', { bebedourosCochos: item('N') }),
      reg('2026-10-03T10:00:00Z', { bebedourosCochos: item('S') }),
      reg('2026-10-08T10:00:00Z', { bebedourosCochos: item('N') }),
    ])
    expect(r.abertas[0]).toMatchObject({ desde: '2026-10-08T10:00:00Z', ocorrencias: 1 })
    expect(r.resolvidas).toHaveLength(1)
  })

  it("valor vazio, nulo ou ausente não resolve nem abre", () => {
    const r = calcularPendenciasRodeio([
      reg('2026-10-01T10:00:00Z', { bebedourosCochos: item('N') }),
      reg('2026-10-03T10:00:00Z', { bebedourosCochos: item('') }),
      reg('2026-10-04T10:00:00Z', null),
      reg('2026-10-05T10:00:00Z', { pastagensTaxaLotacao: item('S') }),
    ])
    expect(r.abertas).toHaveLength(1)
    expect(r.resolvidas).toEqual([])
  })

  it('itens fora da lista (animal morto, carrapato etc.) não geram pendência', () => {
    const r = calcularPendenciasRodeio([
      reg('2026-10-01T10:00:00Z', { animalMorto: item('S'), carrapatosMoscas: item('S'), animaisEntreverados: item('S') }),
    ])
    expect(r.abertas).toEqual([])
  })

  it('usa a data do evento, não a ordem de chegada', () => {
    const r = calcularPendenciasRodeio([
      reg('2026-10-05T10:00:00Z', { bebedourosCochos: item('S') }, 'b'),
      reg('2026-10-01T10:00:00Z', { bebedourosCochos: item('N') }, 'a'),
    ])
    expect(r.abertas).toEqual([])
    expect(r.resolvidas).toHaveLength(1)
  })

  it('o mesmo rodeio vindo do servidor e do aparelho conta uma vez só', () => {
    const r = calcularPendenciasRodeio([
      reg('2026-10-01T10:00:00Z', { bebedourosCochos: item('N') }, 'x'),
      reg('2026-10-01T10:00:00Z', { bebedourosCochos: item('N') }, 'x'),
    ])
    expect(r.abertas[0].ocorrencias).toBe(1)
  })

  it('itens independentes; abertas da mais antiga para a mais nova', () => {
    const r = calcularPendenciasRodeio([
      reg('2026-10-01T10:00:00Z', { pastagensTaxaLotacao: item('N'), bebedourosCochos: item('N') }),
      reg('2026-10-04T10:00:00Z', { pastagensTaxaLotacao: item('N'), bebedourosCochos: item('S'), cercasCochosPorteiras: item('N') }),
    ])
    expect(r.abertas.map((p) => p.campo)).toEqual(['pastagensTaxaLotacao', 'cercasCochosPorteiras'])
    expect(r.resolvidas.map((p) => p.campo)).toEqual(['bebedourosCochos'])
  })

  it('aceita booleano legado (true = conforme)', () => {
    const r = calcularPendenciasRodeio([
      reg('2026-10-01T10:00:00Z', { bebedourosCochos: item('N') }),
      reg('2026-10-02T10:00:00Z', { bebedourosCochos: item(true) }),
    ])
    expect(r.abertas).toEqual([])
    expect(r.resolvidas).toHaveLength(1)
  })
})

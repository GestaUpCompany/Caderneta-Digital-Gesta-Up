import { describe, expect, it } from 'vitest'
import { calcularPendencias5S, situacaoPlano5S, type RegistroAuditoria5SPendencia } from './pendencias5s'

const reg = (
  data: string,
  itens: Record<string, string>,
  naoConformidades: Record<string, any> | null = null,
  localId?: string
): RegistroAuditoria5SPendencia => ({ data, itens, naoConformidades, localId })

describe('calcularPendencias5S', () => {
  it('sem registros não há pendência', () => {
    expect(calcularPendencias5S([])).toEqual({ abertas: [], resolvidas: [] })
  })

  it('N abre a pendência com desde, observação, foto, texto e pilar', () => {
    const r = calcularPendencias5S([
      reg('2026-10-01T10:00:00Z', { utilizacao_1: 'N' }, { utilizacao_1: { observacao: 'Pneus velhos', foto_url: 'https://x/a.webp' } }),
    ])
    expect(r.abertas).toHaveLength(1)
    expect(r.abertas[0]).toMatchObject({
      chave: 'utilizacao_1',
      label: 'Há material em desuso no local.',
      secao: 'Utilização',
      desde: '2026-10-01T10:00:00Z',
      observacao: 'Pneus velhos',
      fotoUrl: 'https://x/a.webp',
      ocorrencias: 1,
    })
  })

  it('C posterior resolve e entra nas resolvidas', () => {
    const r = calcularPendencias5S([
      reg('2026-10-01T10:00:00Z', { limpeza_1: 'N' }),
      reg('2026-10-05T10:00:00Z', { limpeza_1: 'C' }),
    ])
    expect(r.abertas).toEqual([])
    expect(r.resolvidas).toEqual([
      expect.objectContaining({ chave: 'limpeza_1', abertaEm: '2026-10-01T10:00:00Z', resolvidaEm: '2026-10-05T10:00:00Z' }),
    ])
  })

  it('NA e item ausente não resolvem nem abrem', () => {
    const r = calcularPendencias5S([
      reg('2026-10-01T10:00:00Z', { limpeza_1: 'N' }),
      reg('2026-10-03T10:00:00Z', { limpeza_1: 'NA' }),
      reg('2026-10-05T10:00:00Z', {}),
    ])
    expect(r.abertas).toHaveLength(1)
    expect(r.abertas[0]).toMatchObject({ desde: '2026-10-01T10:00:00Z', ocorrencias: 1 })
    expect(r.resolvidas).toEqual([])
    expect(calcularPendencias5S([reg('2026-10-01T10:00:00Z', { limpeza_1: 'NA' })]).abertas).toEqual([])
  })

  it('"ainda pendente" sem observação/foto nova mantém a evidência original', () => {
    const r = calcularPendencias5S([
      reg('2026-10-01T10:00:00Z', { limpeza_1: 'N' }, { limpeza_1: { observacao: 'Chão sujo', foto_url: 'https://x/a.webp' } }),
      reg('2026-10-05T10:00:00Z', { limpeza_1: 'N' }, { limpeza_1: { observacao: '', pendencia: { situacao: 'mantida', desde: '2026-10-01T10:00:00Z' } } }),
    ])
    expect(r.abertas[0]).toMatchObject({ desde: '2026-10-01T10:00:00Z', observacao: 'Chão sujo', fotoUrl: 'https://x/a.webp', ocorrencias: 2, ultimaData: '2026-10-05T10:00:00Z' })
  })

  it('observação ou foto nova substitui a anterior', () => {
    const r = calcularPendencias5S([
      reg('2026-10-01T10:00:00Z', { limpeza_1: 'N' }, { limpeza_1: { observacao: 'a', foto_url: 'https://x/a.webp' } }),
      reg('2026-10-05T10:00:00Z', { limpeza_1: 'N' }, { limpeza_1: { observacao: 'b', foto_url: 'https://x/b.webp' } }),
    ])
    expect(r.abertas[0]).toMatchObject({ observacao: 'b', fotoUrl: 'https://x/b.webp' })
  })

  it('reabertura: N, C, N abre pendência nova desde o último N', () => {
    const r = calcularPendencias5S([
      reg('2026-10-01T10:00:00Z', { limpeza_1: 'N' }),
      reg('2026-10-03T10:00:00Z', { limpeza_1: 'C' }),
      reg('2026-10-08T10:00:00Z', { limpeza_1: 'N' }),
    ])
    expect(r.abertas[0]).toMatchObject({ desde: '2026-10-08T10:00:00Z', ocorrencias: 1 })
    expect(r.resolvidas).toHaveLength(1)
  })

  it('registros que chegam fora de ordem são ordenados por data', () => {
    const r = calcularPendencias5S([
      reg('2026-10-05T10:00:00Z', { limpeza_1: 'C' }),
      reg('2026-10-01T10:00:00Z', { limpeza_1: 'N' }),
    ])
    expect(r.abertas).toEqual([])
    expect(r.resolvidas).toHaveLength(1)
  })

  it('o mesmo registro vindo do servidor e do aparelho conta uma vez (dedupe por localId)', () => {
    const r = calcularPendencias5S([
      reg('2026-10-01T10:00:00Z', { limpeza_1: 'N' }, null, 'abc'),
      reg('2026-10-01T10:00:00Z', { limpeza_1: 'N' }, null, 'abc'),
    ])
    expect(r.abertas[0].ocorrencias).toBe(1)
  })

  it('legado: N sem naoConformidades abre pendência sem evidência', () => {
    const r = calcularPendencias5S([reg('2026-10-01T10:00:00Z', { disciplina_2: 'N' }, null)])
    expect(r.abertas[0]).toMatchObject({ chave: 'disciplina_2', observacao: '', fotoUrl: null })
  })

  it('itens independentes e ordenação: a mais antiga primeiro', () => {
    const r = calcularPendencias5S([
      reg('2026-10-01T10:00:00Z', { limpeza_1: 'N' }),
      reg('2026-10-02T10:00:00Z', { utilizacao_1: 'N', limpeza_1: 'C' }),
    ])
    expect(r.abertas.map((p) => p.chave)).toEqual(['utilizacao_1'])
    expect(r.resolvidas.map((p) => p.chave)).toEqual(['limpeza_1'])
  })

  describe('plano de ação', () => {
    const plano = (descricao: string, concluida = false) => ({
      medidas: [{ id: 'm1', descricao, responsavel: 'João', prazo: '2026-10-20', concluida, concluida_em: null }],
      criado_em: '2026-10-01T10:00:00Z',
      atualizado_em: '2026-10-01T10:00:00Z',
    })

    it('N com plano abre a pendência com o plano', () => {
      const r = calcularPendencias5S([reg('2026-10-01T10:00:00Z', { limpeza_1: 'N' }, { limpeza_1: { plano_acao: plano('Retirar lixo') } })])
      expect(r.abertas[0].planoAcao).toMatchObject({ medidas: [{ descricao: 'Retirar lixo', responsavel: 'João', prazo: '2026-10-20' }] })
    })

    it('"ainda pendente" sem plano novo herda o plano anterior', () => {
      const r = calcularPendencias5S([
        reg('2026-10-01T10:00:00Z', { limpeza_1: 'N' }, { limpeza_1: { plano_acao: plano('Retirar lixo') } }),
        reg('2026-10-05T10:00:00Z', { limpeza_1: 'N' }, { limpeza_1: { observacao: '' } }),
      ])
      expect(r.abertas[0]).toMatchObject({ ocorrencias: 2, planoAcao: { medidas: [{ descricao: 'Retirar lixo' }] } })
    })

    it('plano novo na reincidência substitui o anterior', () => {
      const r = calcularPendencias5S([
        reg('2026-10-01T10:00:00Z', { limpeza_1: 'N' }, { limpeza_1: { plano_acao: plano('Retirar lixo') } }),
        reg('2026-10-05T10:00:00Z', { limpeza_1: 'N' }, { limpeza_1: { plano_acao: plano('Contratar coleta', true) } }),
      ])
      expect(r.abertas[0].planoAcao?.medidas[0]).toMatchObject({ descricao: 'Contratar coleta', concluida: true })
    })

    it('resolvida leva o último plano da sequência', () => {
      const r = calcularPendencias5S([
        reg('2026-10-01T10:00:00Z', { limpeza_1: 'N' }, { limpeza_1: { plano_acao: plano('Retirar lixo') } }),
        reg('2026-10-05T10:00:00Z', { limpeza_1: 'C' }),
      ])
      expect(r.resolvidas[0].planoAcao?.medidas[0].descricao).toBe('Retirar lixo')
    })

    it('plano inválido ou sem medidas vira null', () => {
      const r = calcularPendencias5S([
        reg('2026-10-01T10:00:00Z', { limpeza_1: 'N' }, { limpeza_1: { plano_acao: { medidas: [{ descricao: '   ' }] } } }),
      ])
      expect(r.abertas[0].planoAcao).toBeNull()
    })
  })
})

describe('situacaoPlano5S', () => {
  const medida = (prazo: string | null, concluida = false) => ({ id: 'x', descricao: 'd', responsavel: null, prazo, concluida, concluida_em: null })
  const hoje = '2026-10-26T12:00:00Z'

  it('sem plano ou plano vazio', () => {
    expect(situacaoPlano5S(null, hoje)).toBe('sem_plano')
    expect(situacaoPlano5S({ medidas: [], criado_em: null, atualizado_em: null }, hoje)).toBe('sem_plano')
  })

  it('todas concluídas é concluído, mesmo com prazo vencido', () => {
    expect(situacaoPlano5S({ medidas: [medida('2026-10-01', true)], criado_em: null, atualizado_em: null }, hoje)).toBe('concluido')
  })

  it('medida aberta com prazo vencido é atrasado; sem prazo ou prazo futuro é em dia', () => {
    expect(situacaoPlano5S({ medidas: [medida('2026-10-20')], criado_em: null, atualizado_em: null }, hoje)).toBe('atrasado')
    expect(situacaoPlano5S({ medidas: [medida(null)], criado_em: null, atualizado_em: null }, hoje)).toBe('em_dia')
    expect(situacaoPlano5S({ medidas: [medida('2026-11-01')], criado_em: null, atualizado_em: null }, hoje)).toBe('em_dia')
  })
})

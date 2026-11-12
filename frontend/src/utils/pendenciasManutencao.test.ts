import { describe, expect, it } from 'vitest'
import { calcularPendenciasManutencao, type RegistroChecklistManutencao } from './pendenciasManutencao'

const reg = (data: string, checklist: Record<string, any> | null, localId?: string): RegistroChecklistManutencao => ({ data, checklist, localId })
const item = (valor: 'S' | 'N', observacao = '') => ({ valor, observacao })

describe('calcularPendenciasManutencao', () => {
  it('sem registros não há pendência', () => {
    expect(calcularPendenciasManutencao([])).toEqual([])
  })

  it('item "não fez" no último registro fica aberto, com desde e motivo', () => {
    const r = calcularPendenciasManutencao([reg('2026-11-12T10:00:00Z', { lavagemRealizada: item('N', 'Sem água') })])
    expect(r).toEqual([{ campo: 'lavagemRealizada', desde: '2026-11-12T10:00:00Z', motivo: 'Sem água', ocorrencias: 1 }])
  })

  it('um "fez" posterior resolve a pendência', () => {
    const r = calcularPendenciasManutencao([
      reg('2026-11-12T10:00:00Z', { lavagemRealizada: item('N', 'Sem água') }),
      reg('2026-11-14T10:00:00Z', { lavagemRealizada: item('S') }),
    ])
    expect(r).toEqual([])
  })

  it('mantém "desde" e conta ocorrências quando continua sem fazer', () => {
    const r = calcularPendenciasManutencao([
      reg('2026-11-12T10:00:00Z', { maquinaEngraxada: item('N', 'Sem graxa') }),
      reg('2026-11-15T10:00:00Z', { maquinaEngraxada: item('N', '') }),
    ])
    expect(r[0]).toMatchObject({ desde: '2026-11-12T10:00:00Z', motivo: 'Sem graxa', ocorrencias: 2 })
  })

  it('usa a ordem da data, não a de chegada', () => {
    const r = calcularPendenciasManutencao([
      reg('2026-11-14T10:00:00Z', { lavagemRealizada: item('S') }),
      reg('2026-11-12T10:00:00Z', { lavagemRealizada: item('N', 'x') }),
    ])
    expect(r).toEqual([])
  })

  it('item ausente no registro não resolve nem abre', () => {
    const r = calcularPendenciasManutencao([
      reg('2026-11-12T10:00:00Z', { lavagemRealizada: item('N', 'x') }),
      reg('2026-11-13T10:00:00Z', { engateBom: item('S') }),
    ])
    expect(r.map((p) => p.campo)).toEqual(['lavagemRealizada'])
  })

  it('ignora registros anteriores à semântica de atividades', () => {
    expect(calcularPendenciasManutencao([reg('2026-10-01T10:00:00Z', { freiosBons: item('N', 'ruim') })])).toEqual([])
  })

  it('deduplica o mesmo registro vindo do servidor e do aparelho', () => {
    const r = calcularPendenciasManutencao([
      reg('2026-11-12T10:00:00Z', { lavagemRealizada: item('N', 'x') }, 'a'),
      reg('2026-11-12T10:00:00Z', { lavagemRealizada: item('N', 'x') }, 'a'),
    ])
    expect(r[0].ocorrencias).toBe(1)
  })
})

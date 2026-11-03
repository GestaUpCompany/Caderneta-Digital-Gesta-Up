import { describe, expect, it } from 'vitest'
import { formatarLoteBebedourosComoTexto } from './shareUtils'

const reg = (extra: Record<string, unknown> = {}) =>
  ({
    data: '03/11/2026 08:10',
    responsavel: 'Victor',
    numeroBebedouro: 'Bebedouro 1',
    pasto: 'Pasto Sede',
    leituraBebedouro: 1,
    participantesLimpeza: { funcionarios: ['João'], diaristas: ['Zé'] },
    checklist: {
      agua_suficiente: { valor: true, observacao: '' },
      vazao_bebedouro_ideal: { valor: true, observacao: '' },
      limpou_hoje: { valor: true, observacao: '' },
    },
    ...extra,
  }) as any

describe('formatarLoteBebedourosComoTexto', () => {
  it('retorna vazio sem registros', () => {
    expect(formatarLoteBebedourosComoTexto([])).toBe('')
  })

  it('cabeçalho comum e uma linha por bebedouro, identificado pelo pasto', () => {
    const t = formatarLoteBebedourosComoTexto([reg(), reg({ numeroBebedouro: 'Bebedouro 2', pasto: 'Pasto Norte' })])
    expect(t).toContain('LIMPEZA DE BEBEDOUROS')
    expect(t).toContain('DATA: *03/11/2026*')
    expect(t).toContain('PARTICIPANTES: *João, Zé*')
    expect(t).toContain('2 bebedouros limpos')
    expect(t).toContain('✅ *Pasto Sede (Bebedouro 1)*')
    expect(t).toContain('✅ *Pasto Norte (Bebedouro 2)*')
    expect(t).toContain('ÁGUA: *Limpa*')
    expect(t).not.toMatch(/ÁGUA: \*\d/)
  })

  it('destaca o bebedouro com problema e mostra a observação', () => {
    const t = formatarLoteBebedourosComoTexto([
      reg({ checklist: { vazao_bebedouro_ideal: { valor: false, observacao: 'vazão baixa' } } }),
    ])
    expect(t).toContain('⚠️ *Pasto Sede (Bebedouro 1)*')
    expect(t).toContain('VAZÃO DA BÓIA FORA DO IDEAL')
    expect(t).toContain('OBSERVAÇÃO: *vazão baixa*')
  })

  it('lista pendências resolvidas', () => {
    const t = formatarLoteBebedourosComoTexto([
      reg({ checklist: { agua_suficiente: { valor: true, pendencia: { situacao: 'resolvida', desde: '2026-10-01' } } } }),
    ])
    expect(t).toContain('Pendência resolvida: ÁGUA INSUFICIENTE')
  })
})

import { describe, it, expect } from 'vitest'
import { aplicarConsumoServidor, diaDaFazendaISO, ConsumoConfinamentoDiaLinha } from './consumoServidor'
import type { CmsJanelas } from './leituraCochoMetrics'

const LOCAL: CmsJanelas = { ontem: 1.1, anteontem: 1.2, tresDiasAtras: 1.3, dezDias: 1.4, geral: 1.5 }
const HOJE = '2026-10-13'

function linha(parcial: Partial<ConsumoConfinamentoDiaLinha>): ConsumoConfinamentoDiaLinha {
  return {
    lote_id: 'L1',
    data: '2026-10-11',
    consumo_percent_pv: 2.4,
    leitura_confirmada: true,
    dia_incompleto: false,
    n_currais: 1,
    ...parcial,
  }
}

describe('aplicarConsumoServidor', () => {
  it('troca só o dia exato fechado e mantém o resto local', () => {
    const r = aplicarConsumoServidor(LOCAL, [linha({ data: '2026-10-11', consumo_percent_pv: 2.4 })], 'L1', HOJE)
    expect(r).toEqual({ ontem: 1.1, anteontem: 2.4, tresDiasAtras: 1.3, dezDias: 1.4, geral: 1.5 })
  })

  it('troca ontem, 2 dias e 3 dias quando todos estão fechados', () => {
    const linhas = [
      linha({ data: '2026-10-12', consumo_percent_pv: 2.1 }),
      linha({ data: '2026-10-11', consumo_percent_pv: 2.2 }),
      linha({ data: '2026-10-10', consumo_percent_pv: 2.3 }),
    ]
    const r = aplicarConsumoServidor(LOCAL, linhas, 'L1', HOJE)
    expect([r.ontem, r.anteontem, r.tresDiasAtras]).toEqual([2.1, 2.2, 2.3])
    expect([r.dezDias, r.geral]).toEqual([1.4, 1.5])
  })

  it('nunca usa o dia de hoje nem dias fora de ontem/2/3 dias', () => {
    const linhas = [
      linha({ data: '2026-10-13', consumo_percent_pv: 9 }),
      linha({ data: '2026-10-09', consumo_percent_pv: 9 }),
    ]
    expect(aplicarConsumoServidor(LOCAL, linhas, 'L1', HOJE)).toEqual(LOCAL)
  })

  it('ignora dia incompleto, sem leitura confirmada, vários currais e sem valor', () => {
    const base = { data: '2026-10-11' }
    expect(aplicarConsumoServidor(LOCAL, [linha({ ...base, dia_incompleto: true })], 'L1', HOJE)).toEqual(LOCAL)
    expect(aplicarConsumoServidor(LOCAL, [linha({ ...base, leitura_confirmada: false })], 'L1', HOJE)).toEqual(LOCAL)
    expect(aplicarConsumoServidor(LOCAL, [linha({ ...base, n_currais: 2 })], 'L1', HOJE)).toEqual(LOCAL)
    expect(aplicarConsumoServidor(LOCAL, [linha({ ...base, consumo_percent_pv: null })], 'L1', HOJE)).toEqual(LOCAL)
  })

  it('só usa linhas do lote pedido', () => {
    const linhas = [linha({ lote_id: 'L2', data: '2026-10-11', consumo_percent_pv: 2.4 })]
    expect(aplicarConsumoServidor(LOCAL, linhas, 'L1', HOJE)).toEqual(LOCAL)
  })

  it('devolve o cálculo local quando não há linhas (offline sem cache, lista vazia ou null)', () => {
    expect(aplicarConsumoServidor(LOCAL, [], 'L1', HOJE)).toEqual(LOCAL)
    expect(aplicarConsumoServidor(LOCAL, null, 'L1', HOJE)).toEqual(LOCAL)
    expect(aplicarConsumoServidor(LOCAL, undefined, 'L1', HOJE)).toEqual(LOCAL)
  })

  it('aceita valor local nulo e preenche com o do Painel', () => {
    const vazio: CmsJanelas = { ontem: null, anteontem: null, tresDiasAtras: null, dezDias: null, geral: null }
    const r = aplicarConsumoServidor(vazio, [linha({ data: '2026-10-12', consumo_percent_pv: 2.5 })], 'L1', HOJE)
    expect(r.ontem).toBe(2.5)
    expect(r.anteontem).toBeNull()
  })

  it('aceita número vindo como texto e arredonda em 4 casas', () => {
    const l = linha({ data: '2026-10-11', consumo_percent_pv: '2.412349' as unknown as number })
    expect(aplicarConsumoServidor(LOCAL, [l], 'L1', HOJE).anteontem).toBe(2.4123)
  })

  it('não altera o objeto de entrada', () => {
    const copia = { ...LOCAL }
    aplicarConsumoServidor(LOCAL, [linha({ data: '2026-10-11' })], 'L1', HOJE)
    expect(LOCAL).toEqual(copia)
  })
})

describe('diaDaFazendaISO', () => {
  it('usa o dia da fazenda (Cuiabá, UTC-4), não o dia UTC, entre 20h e 24h', () => {
    // 2026-10-13 00:30 UTC = 2026-10-12 20:30 em Cuiabá
    expect(diaDaFazendaISO(new Date('2026-10-13T00:30:00Z'))).toBe('2026-10-12')
  })

  it('no meio do dia os dois coincidem', () => {
    expect(diaDaFazendaISO(new Date('2026-10-13T15:00:00Z'))).toBe('2026-10-13')
  })

  it('a janela de "ontem" acompanha o dia da fazenda na borda das 20h', () => {
    const hoje = diaDaFazendaISO(new Date('2026-10-13T00:30:00Z')) // 12/10 na fazenda
    const r = aplicarConsumoServidor(LOCAL, [linha({ data: '2026-10-11', consumo_percent_pv: 2.6 })], 'L1', hoje)
    expect(r.ontem).toBe(2.6)
  })
})

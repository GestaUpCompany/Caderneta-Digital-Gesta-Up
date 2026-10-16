import { describe, expect, it } from 'vitest'
import {
  avisoDeStatus,
  errosReproducao,
  estacaoDaData,
  formVazioReproducao,
  novaLinhaReproducao,
  reproducaoParaServidor,
  resumirReproducao,
  type FormReproducao,
} from './reproducao'

const HOJE = '16/10/2026'
const linha = (uid: string, ind = uid, extra: Partial<ReturnType<typeof novaLinhaReproducao>> = {}) => ({
  ...novaLinhaReproducao(uid, ind, `B-${uid}`),
  ...extra,
})
const base = (extra: Partial<FormReproducao> = {}): FormReproducao => ({ ...formVazioReproducao(HOJE), ...extra })

describe('validação', () => {
  it('exige ao menos uma fêmea', () => {
    expect(errosReproducao(base(), HOJE)[0].field).toBe('linhas')
  })

  it('data inválida ou futura', () => {
    const l = [linha('a', 'a', { resultado: 'Vazia' })]
    expect(errosReproducao(base({ data: '99/99/2026', linhas: l }), HOJE)[0].field).toBe('data')
    expect(errosReproducao(base({ data: '20/10/2026', linhas: l }), HOJE)[0].message).toContain('futura')
  })

  it('animal sem cadastro e fêmea repetida', () => {
    expect(errosReproducao(base({ tipo: 'Cobertura', linhas: [linha('a', '')] }), HOJE)[0].message).toContain('cadastrad')
    expect(errosReproducao(base({ tipo: 'Cobertura', linhas: [linha('a', 'x'), linha('b', 'x')] }), HOJE)[0].message).toContain('repetida')
  })

  it('diagnóstico exige resultado por fêmea e valida os dias de gestação', () => {
    expect(errosReproducao(base({ linhas: [linha('a'), linha('b', 'b', { resultado: 'Prenha' })] }), HOJE)[0].message).toBe('Falta o resultado de 1 fêmea')
    expect(errosReproducao(base({ linhas: [linha('a'), linha('b')] }), HOJE)[0].message).toBe('Faltam os resultados de 2 fêmeas')
    expect(errosReproducao(base({ linhas: [linha('a', 'a', { resultado: 'Prenha', idadeGestacaoDias: '400' })] }), HOJE)[0].field).toBe('idadeGestacaoDias')
    expect(errosReproducao(base({ linhas: [linha('a', 'a', { resultado: 'Prenha', idadeGestacaoDias: '60' })] }), HOJE)).toEqual([])
    // dias só contam para prenha
    expect(errosReproducao(base({ linhas: [linha('a', 'a', { resultado: 'Vazia', idadeGestacaoDias: '999' })] }), HOJE)).toEqual([])
  })

  it('cobertura, inseminação e aborto não exigem touro nem resultado', () => {
    for (const tipo of ['Cobertura', 'Inseminação', 'Aborto'] as const) {
      expect(errosReproducao(base({ tipo, linhas: [linha('a')] }), HOJE)).toEqual([])
    }
  })
})

describe('payload para o servidor', () => {
  const registro = (f: FormReproducao) => ({ ...f, id: 'S1', usuario: 'Victor' }) as unknown as Record<string, unknown>

  it('uma linha por fêmea, local_id estável, origem pwa e data ISO', () => {
    const rows = reproducaoParaServidor(
      registro(base({ linhas: [linha('a', 'ind-a', { resultado: 'Prenha', idadeGestacaoDias: '90' }), linha('b', 'ind-b', { resultado: 'Vazia' })], metodo: 'Ultrassom' })),
      'F1'
    )
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      fazenda_id: 'F1', local_id: 'S1:a', individuo_id: 'ind-a', tipo: 'Diagnóstico de gestação', data: '2026-10-16',
      metodo_diagnostico: 'Ultrassom', resultado: 'Prenha', idade_gestacao_dias: 90, responsavel: 'Victor', origem: 'pwa',
      touro_nome: null, semen_partida: null,
    })
    expect(rows[1]).toMatchObject({ local_id: 'S1:b', resultado: 'Vazia', idade_gestacao_dias: null })
    expect(rows[0].local_id).not.toBe(rows[1].local_id)
  })

  it('inseminação leva touro, partida e técnico; sem resultado nem método', () => {
    const [r] = reproducaoParaServidor(
      registro(base({ tipo: 'Inseminação', touroNome: 'Atlas', semenPartida: 'P-9', tecnico: 'Dr. Paulo', metodo: 'Ultrassom', estacaoId: 'E1', linhas: [linha('a')] })),
      'F1'
    )
    expect(r).toMatchObject({ touro_nome: 'Atlas', semen_partida: 'P-9', tecnico: 'Dr. Paulo', estacao_id: 'E1', metodo_diagnostico: null, resultado: null })
  })

  it('cobertura não leva partida de sêmen; aborto não leva nada de touro nem diagnóstico (constraints do banco)', () => {
    const [c] = reproducaoParaServidor(registro(base({ tipo: 'Cobertura', touroNome: 'Atlas', semenPartida: 'P-9', linhas: [linha('a')] })), 'F1')
    expect(c.semen_partida).toBeNull()
    expect(c.touro_nome).toBe('Atlas')
    const [a] = reproducaoParaServidor(registro(base({ tipo: 'Aborto', touroNome: 'x', tecnico: 'y', linhas: [linha('a')] })), 'F1')
    expect(a).toMatchObject({ touro_nome: null, tecnico: null, resultado: null, idade_gestacao_dias: null })
  })
})

describe('avisos e estação', () => {
  it('avisa, sem bloquear, quando o evento destoa do status', () => {
    expect(avisoDeStatus('Cobertura', 'Prenha')).toContain('prenha')
    expect(avisoDeStatus('Inseminação', 'Vazia')).toBe('')
    expect(avisoDeStatus('Aborto', 'Vazia')).toContain('vazia')
    expect(avisoDeStatus('Aborto', 'Prenha')).toBe('')
    expect(avisoDeStatus('Diagnóstico de gestação', 'Parida')).toBe('')
    expect(avisoDeStatus('Aborto', undefined)).toBe('')
  })

  it('estação que cobre a data; a mais recente se houver sobreposição', () => {
    const e = [
      { id: '1', nome: 'A', data_inicio: '2026-09-01', data_fim: '2026-12-31' },
      { id: '2', nome: 'B', data_inicio: '2026-10-10', data_fim: '2026-11-30' },
    ]
    expect(estacaoDaData(e, '2026-10-16')?.id).toBe('2')
    expect(estacaoDaData(e, '2026-09-05')?.id).toBe('1')
    expect(estacaoDaData(e, '2027-02-01')).toBeNull()
  })

  it('resumo', () => {
    expect(resumirReproducao({ tipo: 'Aborto', linhas: [linha('a')] })).toBe('Aborto: 1 fêmea')
    expect(resumirReproducao({ tipo: 'Cobertura', linhas: [linha('a'), linha('b')] })).toBe('Cobertura: 2 fêmeas')
  })
})

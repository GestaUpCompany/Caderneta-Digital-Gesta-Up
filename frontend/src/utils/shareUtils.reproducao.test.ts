import { describe, expect, it } from 'vitest'
import { formatarRegistroComoTexto } from './shareUtils'

describe('compartilhar reprodução', () => {
  it('diagnóstico em grupo traz contagem e uma linha por fêmea', () => {
    const t = formatarRegistroComoTexto(
      {
        id: 'S1', data: '16/10/2026', usuario: 'Victor', tipo: 'Diagnóstico de gestação', metodo: 'Ultrassom', estacaoNome: 'Monta 2026',
        linhas: [
          { rotulo: 'B-1', resultado: 'Prenha', idadeGestacaoDias: '60' },
          { rotulo: 'B-2', resultado: 'Vazia' },
        ],
      } as never,
      'reproducao'
    )
    expect(t).toContain('REPRODUÇÃO')
    expect(t).toContain('2 fêmeas')
    expect(t).toContain('Prenhas: 1')
    expect(t).toContain('Vazias: 1')
    expect(t).toContain('B-1: Prenha (60 dias)')
    expect(t).toContain('Monta 2026')
  })

  it('cobertura mostra touro e não mostra contagem de diagnóstico', () => {
    const t = formatarRegistroComoTexto({ id: 'S2', data: '16/10/2026', tipo: 'Inseminação', touroNome: 'Atlas', semenPartida: 'P-9', linhas: [{ rotulo: 'B-3' }] } as never, 'reproducao')
    expect(t).toContain('Touro: Atlas')
    expect(t).toContain('Partida do sêmen: P-9')
    expect(t).not.toContain('Prenhas')
  })
})

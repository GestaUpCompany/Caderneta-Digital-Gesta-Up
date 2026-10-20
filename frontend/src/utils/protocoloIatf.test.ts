import { describe, expect, it } from 'vitest'
import {
  errosProtocoloIatf,
  ehDescarteIatf,
  errosDescarteIatf,
  femeasSemIa,
  formVazioDescarteIatf,
  formVazioProtocoloIatf,
  passosAnterioresPendentes,
  protocoloIatfParaServidor,
  resumirProtocoloIatf,
  unirIds,
  situacaoTarefaIatf,
  tarefasPendentes,
  type LoteIatfCache,
} from './protocoloIatf'

const lote: LoteIatfCache = {
  id: 'l1',
  nome: 'Lote 1',
  data_d0: '2026-10-01',
  responsavel: null,
  femeasAtivas: 3,
  tarefas: [
    { id: 't10', dia: 10, ordem: 3, rotulo: 'IA', tipo: 'Inseminacao', medicamento_nome: null, dose: null, data_prevista: '2026-10-11', feita_em: null },
    { id: 't0', dia: 0, ordem: 1, rotulo: 'Implante', tipo: 'Aplicacao', medicamento_nome: null, dose: null, data_prevista: '2026-10-01', feita_em: '2026-10-01' },
    { id: 't8', dia: 8, ordem: 2, rotulo: 'Retirada', tipo: 'Retirada', medicamento_nome: null, dose: null, data_prevista: '2026-10-09', feita_em: null },
  ],
}

describe('tarefasPendentes', () => {
  it('tira as feitas no servidor e as marcadas localmente, em ordem de data', () => {
    expect(tarefasPendentes(lote, new Set()).map((t) => t.id)).toEqual(['t8', 't10'])
    expect(tarefasPendentes(lote, new Set(['t8'])).map((t) => t.id)).toEqual(['t10'])
  })
})

describe('IA por grupos de fêmeas', () => {
  const comFemeas: LoteIatfCache = {
    ...lote,
    femeasAtivas: 3,
    femeas: [
      { individuoId: 'a', rotulo: 'A' },
      { individuoId: 'b', rotulo: 'B' },
      { individuoId: 'c', rotulo: 'C' },
    ],
    inseminadas: ['a'],
  }

  it('femeasSemIa tira as do servidor e as já registradas neste aparelho', () => {
    expect(femeasSemIa(comFemeas).map((f) => f.individuoId)).toEqual(['b', 'c'])
    expect(femeasSemIa(comFemeas, new Set(['b'])).map((f) => f.individuoId)).toEqual(['c'])
  })

  it('o passo de IA continua pendente enquanto sobrar fêmea sem IA, mesmo com registro local', () => {
    const marcadas = new Set(['t10'])
    expect(tarefasPendentes(comFemeas, marcadas, new Map([['t10', new Set(['b'])]])).map((t) => t.id)).toContain('t10')
    expect(tarefasPendentes(comFemeas, marcadas, new Map([['t10', new Set(['b', 'c'])]])).map((t) => t.id)).not.toContain('t10')
  })

  it('cópia antiga do cache (sem lista de fêmeas) mantém o comportamento anterior', () => {
    expect(tarefasPendentes(lote, new Set(['t10'])).map((t) => t.id)).not.toContain('t10')
  })

  it('exige ao menos uma fêmea quando havia lista para escolher', () => {
    const f = { ...formVazioProtocoloIatf('10/10/2026'), loteProtocoloId: 'l1', tarefaId: 't10', tarefaTipo: 'Inseminacao' as const }
    expect(errosProtocoloIatf({ ...f, femeasDisponiveis: 2, femeasSelecionadas: [] }, '10/10/2026').map((e) => e.field)).toEqual(['femeas'])
    expect(errosProtocoloIatf({ ...f, femeasDisponiveis: 2, femeasSelecionadas: ['b'] }, '10/10/2026')).toEqual([])
    expect(errosProtocoloIatf({ ...f, femeasDisponiveis: 0, femeasSelecionadas: [] }, '10/10/2026')).toEqual([])
  })

  it('envia as fêmeas escolhidas em p_individuos', () => {
    const c = protocoloIatfParaServidor(
      { id: 'reg-2', data: '11/10/2026', tarefaId: 't10', tarefaTipo: 'Inseminacao', usuario: 'João', femeasSelecionadas: ['b', 'c'] },
      'faz'
    )
    expect(c.params.p_individuos).toEqual(['b', 'c'])
  })
})

describe('descartar fêmea do lote', () => {
  const base = { ...formVazioDescarteIatf('20/10/2026'), loteProtocoloId: 'l1', loteNome: 'Lote 1', individuoId: 'f1', femeaRotulo: 'BR-1' }

  it('exige lote e fêmea', () => {
    expect(errosDescarteIatf(formVazioDescarteIatf('20/10/2026')).map((e) => e.field)).toEqual(['lote'])
    expect(errosDescarteIatf({ ...formVazioDescarteIatf('20/10/2026'), loteProtocoloId: 'l1' }).map((e) => e.field)).toEqual(['femea'])
    expect(errosDescarteIatf(base)).toEqual([])
  })

  it('vira a RPC descartar_femea_lote_protocolo, com motivo nulo se vazio', () => {
    const c = protocoloIatfParaServidor({ ...base, id: 'r1', motivoDescarte: '  ' }, 'faz')
    expect(c.rpc).toBe('descartar_femea_lote_protocolo')
    expect(c.params).toEqual({ p_fazenda_id: 'faz', p_lote_id: 'l1', p_individuo_id: 'f1', p_motivo: null })
    expect(protocoloIatfParaServidor({ ...base, motivoDescarte: 'Perdeu o implante' }, 'faz').params.p_motivo).toBe('Perdeu o implante')
  })

  it('resume o registro e distingue de marcação de passo', () => {
    expect(ehDescarteIatf(base)).toBe(true)
    expect(ehDescarteIatf({ tarefaId: 't1' })).toBe(false)
    expect(resumirProtocoloIatf(base)).toBe('Descartar BR-1 · Lote 1')
  })

  it('fêmea descartada neste aparelho não conta como "sem IA" e o passo pode fechar', () => {
    const lote2: LoteIatfCache = {
      ...lote,
      femeasAtivas: 2,
      femeas: [
        { individuoId: 'a', rotulo: 'A' },
        { individuoId: 'b', rotulo: 'B' },
      ],
      inseminadas: ['a'],
    }
    expect(tarefasPendentes(lote2, new Set()).map((t) => t.id)).toContain('t10')
    expect(tarefasPendentes(lote2, new Set(), undefined, new Set(['b'])).map((t) => t.id)).not.toContain('t10')
    expect([...unirIds(new Set(['a']), new Set(['b']))].sort()).toEqual(['a', 'b'])
  })
})

describe('data anterior ao D0 e passos anteriores', () => {
  const hoje = '20/10/2026'
  const base = { ...formVazioProtocoloIatf(hoje), loteProtocoloId: 'l1', tarefaId: 't8', loteD0: '2026-10-08' }

  it('recusa data de execução anterior ao D0 do lote, aceita a do próprio D0', () => {
    expect(errosProtocoloIatf({ ...base, data: '07/10/2026' }, hoje)[0].message).toMatch(/anterior ao D0 do lote \(08\/10\/2026\)/)
    expect(errosProtocoloIatf({ ...base, data: '08/10/2026' }, hoje)).toEqual([])
    expect(errosProtocoloIatf({ ...base, data: '15/10/2026' }, hoje)).toEqual([])
  })

  it('rascunho sem D0 não confere a data', () => {
    expect(errosProtocoloIatf({ ...base, loteD0: undefined, data: '01/10/2026' }, hoje)).toEqual([])
  })

  it('lista os passos pendentes de dia anterior ao da IA', () => {
    const pendentes = tarefasPendentes({ ...lote, tarefas: [...lote.tarefas, { id: 't3', dia: 3, ordem: 4, rotulo: 'Reforço', tipo: 'Outro', medicamento_nome: null, dose: null, data_prevista: '2026-10-04', feita_em: null }] }, new Set())
    expect(passosAnterioresPendentes(pendentes, 10).map((t) => t.id)).toEqual(['t3', 't8'])
    expect(passosAnterioresPendentes(pendentes, 0)).toEqual([])
  })
})

describe('situacaoTarefaIatf', () => {
  it('compara a data prevista com hoje', () => {
    expect(situacaoTarefaIatf('2026-10-09', '2026-10-10')).toBe('atrasada')
    expect(situacaoTarefaIatf('2026-10-10', '2026-10-10')).toBe('hoje')
    expect(situacaoTarefaIatf('2026-10-11', '2026-10-10')).toBe('futura')
  })
})

describe('errosProtocoloIatf', () => {
  const hoje = '10/10/2026'
  it('exige lote e passo, e recusa data futura', () => {
    const f = formVazioProtocoloIatf(hoje)
    expect(errosProtocoloIatf(f, hoje).map((e) => e.field)).toEqual(['lote'])
    expect(errosProtocoloIatf({ ...f, loteProtocoloId: 'l1' }, hoje).map((e) => e.field)).toEqual(['tarefa'])
    expect(errosProtocoloIatf({ ...f, loteProtocoloId: 'l1', tarefaId: 't8' }, hoje)).toEqual([])
    expect(errosProtocoloIatf({ ...f, data: '11/10/2026', loteProtocoloId: 'l1', tarefaId: 't8' }, hoje)[0].field).toBe('data')
    expect(errosProtocoloIatf({ ...f, data: '', loteProtocoloId: 'l1', tarefaId: 't8' }, hoje)[0].field).toBe('data')
  })
})

describe('protocoloIatfParaServidor', () => {
  const base = { id: 'reg-1', data: '11/10/2026', loteProtocoloId: 'l1', tarefaId: 't10', usuario: 'João', observacao: ' ok ' }

  it('passo de IA chama registrar_ia_lote_protocolo com o id do registro como local_id', () => {
    const c = protocoloIatfParaServidor({ ...base, tarefaTipo: 'Inseminacao', touroNome: 'Touro X', semenPartida: '', tecnico: '' }, 'faz')
    expect(c.rpc).toBe('registrar_ia_lote_protocolo')
    expect(c.params).toEqual({
      p_fazenda_id: 'faz',
      p_tarefa_id: 't10',
      p_data: '2026-10-11',
      p_touro_nome: 'Touro X',
      p_semen_partida: null,
      p_tecnico: 'João',
      p_individuos: null,
      p_observacao: 'ok',
      p_local_id: 'reg-1',
      p_origem: 'pwa',
    })
  })

  it('outros passos chamam marcar_tarefa_protocolo_iatf', () => {
    const c = protocoloIatfParaServidor({ ...base, tarefaId: 't8', tarefaTipo: 'Retirada' }, 'faz')
    expect(c.rpc).toBe('marcar_tarefa_protocolo_iatf')
    expect(c.params).toEqual({
      p_fazenda_id: 'faz',
      p_tarefa_id: 't8',
      p_feita_em: '2026-10-11',
      p_observacao: 'ok',
      p_responsavel: 'João',
      p_local_id: 'reg-1',
    })
  })
})

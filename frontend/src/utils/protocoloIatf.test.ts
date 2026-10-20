import { describe, expect, it } from 'vitest'
import {
  errosProtocoloIatf,
  formVazioProtocoloIatf,
  protocoloIatfParaServidor,
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

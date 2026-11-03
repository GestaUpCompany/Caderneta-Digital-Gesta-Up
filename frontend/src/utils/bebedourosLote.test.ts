import { describe, expect, it } from 'vitest'
import { erroItemLote, montarPayloadRegistroBebedouro, ordenarPorUrgencia, statusPrazoLimpeza } from './bebedourosLote'

const hoje = new Date('2026-11-03T12:00:00')

const baseParams = () => ({
  data: '03/11/2026',
  usuario: 'Peão',
  numeroBebedouro: 'Bebedouro B1',
  leituraBebedouro: '1',
  pastos: [{ id: 'p1', nome: 'Pasto Sede' }],
  observacao: '',
  participantesLimpeza: null,
  tempoDesdeLimpeza: 'há 3 dias',
  intervaloMedioLimpezas: '4 dias',
  metaIntervaloLimpeza: '4 dias',
  checklistAtivo: true,
  limpouHoje: true,
  fotoBebedouro: '',
  problemas: {},
  observacoes: {},
  fotos: {},
  pendencias: {},
  pendenciasAbertas: [],
})

describe('statusPrazoLimpeza', () => {
  it('sem histórico', () => {
    expect(statusPrazoLimpeza(null, 4, hoje).tone).toBe('warning')
  })
  it('atrasada há mais de 2 dias além da meta é danger', () => {
    const s = statusPrazoLimpeza('2026-10-25T12:00:00', 4, hoje)
    expect(s.atraso).toBe(5)
    expect(s.tone).toBe('danger')
  })
  it('no prazo', () => {
    const s = statusPrazoLimpeza('2026-11-01T12:00:00', 4, hoje)
    expect(s.tone).toBe('success')
    expect(s.texto).toContain('2 dias')
  })
  it('sem meta definida', () => {
    expect(statusPrazoLimpeza('2026-11-01T12:00:00', null, hoje).tone).toBe('neutral')
  })
})

describe('ordenarPorUrgencia', () => {
  it('atrasados primeiro, depois sem histórico, depois os em dia', () => {
    const itens = [
      { nome: 'C', status: statusPrazoLimpeza('2026-11-02T12:00:00', 4, hoje) },
      { nome: 'B', status: statusPrazoLimpeza(null, 4, hoje) },
      { nome: 'A', status: statusPrazoLimpeza('2026-10-20T12:00:00', 4, hoje) },
    ]
    expect(ordenarPorUrgencia(itens).map((i) => i.nome)).toEqual(['B', 'A', 'C'])
  })
})

describe('montarPayloadRegistroBebedouro', () => {
  it('limpeza sem problemas: itens adequados e limpou_hoje verdadeiro', () => {
    const p: any = montarPayloadRegistroBebedouro(baseParams())
    expect(p.checklist.agua_suficiente.valor).toBe(true)
    expect(p.checklist.limpou_hoje.valor).toBe(true)
    expect(p.pasto).toBe('Pasto Sede')
    expect(p.pastoId).toBe('p1')
    expect(p.leituraBebedouro).toBe(1)
  })

  it('problema marcado vira valor false com observação', () => {
    const p: any = montarPayloadRegistroBebedouro({
      ...baseParams(),
      problemas: { vazaoBebedouroIdeal: true },
      observacoes: { vazaoBebedouroIdeal: 'vazão baixa' },
    })
    expect(p.checklist.vazao_bebedouro_ideal).toMatchObject({ valor: false, observacao: 'vazão baixa' })
    expect(p.checklist.agua_suficiente.valor).toBe(true)
  })

  it('registra a resposta da pendência com o desde original', () => {
    const p: any = montarPayloadRegistroBebedouro({
      ...baseParams(),
      pendencias: { aguaSuficiente: 'resolvida' },
      pendenciasAbertas: [
        { campo: 'aguaSuficiente', chave: 'agua_suficiente', label: 'x', desde: '2026-10-01T00:00:00Z', ultimaData: '2026-10-01T00:00:00Z', observacao: '', fotoUrl: null, ocorrencias: 1 },
      ],
    })
    expect(p.checklist.agua_suficiente.pendencia).toEqual({ situacao: 'resolvida', desde: '2026-10-01T00:00:00Z' })
  })

  it('checklist inativo sem foto não envia checklist; com foto envia só foto_bebedouro', () => {
    expect((montarPayloadRegistroBebedouro({ ...baseParams(), checklistAtivo: false }) as any).checklist).toBeNull()
    const comFoto: any = montarPayloadRegistroBebedouro({ ...baseParams(), checklistAtivo: false, fotoBebedouro: 'abc' })
    expect(Object.keys(comFoto.checklist)).toEqual(['foto_bebedouro'])
  })

  it('vários pastos: pasto concatenado e pastoId nulo', () => {
    const p: any = montarPayloadRegistroBebedouro({
      ...baseParams(),
      pastos: [{ id: 'a', nome: 'A' }, { id: 'b', nome: 'B' }],
    })
    expect(p.pasto).toBe('A, B')
    expect(p.pastoId).toBeNull()
  })
})

describe('erroItemLote', () => {
  const pend: any = { campo: 'aguaSuficiente' }
  it('exige leitura', () => {
    expect(erroItemLote('', [], {}, true)).toMatch(/leitura/i)
  })
  it('exige resposta das pendências só com checklist ativo', () => {
    expect(erroItemLote('1', [pend], {}, true)).toMatch(/pendências/i)
    expect(erroItemLote('1', [pend], {}, false)).toBeNull()
    expect(erroItemLote('1', [pend], { aguaSuficiente: 'mantida' }, true)).toBeNull()
  })
})

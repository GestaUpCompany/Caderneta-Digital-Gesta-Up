import { describe, expect, it } from 'vitest'
import {
  aplicarMedicamentoNoForm,
  carenciaDeRegistroLocal,
  carenciaDoAlvo,
  errosSanidade,
  formVazioSanidade,
  pendenciaSanidade,
  resumirSanidade,
  sanidadeParaServidor,
  somarDias,
  textoCarencia,
  type CarenciaLinha,
} from './sanidade'

const HOJE = '16/10/2026'
const base = () => ({ ...formVazioSanidade(HOJE), individuoId: 'ind-1', brinco: 'B-1', medicamentoNome: 'Ivomec' })

describe('validação', () => {
  it('animal cadastrado + produto basta', () => {
    expect(errosSanidade(base(), HOJE)).toEqual([])
    expect(pendenciaSanidade(base(), HOJE)).toBe('')
  })

  it('animal sem cadastro não grava: manda aplicar no lote', () => {
    const e = errosSanidade({ ...base(), individuoId: '' }, HOJE)
    expect(e[0].field).toBe('individuoId')
  })

  it('lote exige lote e número de cabeças', () => {
    const f = { ...base(), alvo: 'lote' as const, individuoId: '' }
    expect(errosSanidade(f, HOJE).map((e) => e.field)).toEqual(['loteId', 'numeroCabecas'])
    expect(errosSanidade({ ...f, loteId: 'L1', numeroCabecas: '80' }, HOJE)).toEqual([])
    expect(errosSanidade({ ...f, loteId: 'L1', numeroCabecas: '0' }, HOJE)).toHaveLength(1)
  })

  it('data futura, produto vazio, carência/intervalo e validade vencida', () => {
    expect(errosSanidade({ ...base(), data: '20/10/2026' }, HOJE)[0].message).toContain('futura')
    expect(errosSanidade({ ...base(), medicamentoNome: ' ' }, HOJE)[0].field).toBe('medicamentoNome')
    expect(errosSanidade({ ...base(), carenciaDias: '-3' }, HOJE)).toHaveLength(1)
    expect(errosSanidade({ ...base(), intervaloDias: '0' }, HOJE)).toHaveLength(1)
    expect(errosSanidade({ ...base(), validadeProduto: '01/10/2026' }, HOJE)[0].field).toBe('validadeProduto')
  })
})

describe('catálogo e payload', () => {
  it('produto do catálogo preenche os campos e preserva a dose digitada', () => {
    const med = { id: 'm1', nome_comercial: 'Ivomec', principio_ativo: 'Ivermectina', dose_recomendada: '1ml/50kg', carencia_abate_dias: 28, intervalo_reaplicacao_dias: 90 }
    expect(aplicarMedicamentoNoForm(formVazioSanidade(HOJE), med)).toMatchObject({ medicamentoId: 'm1', carenciaDias: '28', intervaloDias: '90', dose: '1ml/50kg' })
    expect(aplicarMedicamentoNoForm({ ...formVazioSanidade(HOJE), dose: '2 ml' }, med).dose).toBe('2 ml')
    expect(aplicarMedicamentoNoForm({ ...formVazioSanidade(HOJE), medicamentoId: 'x' }, null).medicamentoId).toBe('')
  })

  it('animal: individuo_id, sem lote/categoria/cabeças; origem pwa', () => {
    const p = sanidadeParaServidor({ ...base(), usuario: 'Victor', carenciaDias: '14', observacao: '' })
    expect(p).toMatchObject({ data: '2026-10-16', individuo_id: 'ind-1', lote_id: null, categoria: null, numero_cabecas: null, carencia_abate_dias: 14, observacao: null, responsavel: 'Victor', origem: 'pwa' })
  })

  it('lote: lote_id, categoria e cabeças, sem individuo_id', () => {
    const p = sanidadeParaServidor({ ...base(), alvo: 'lote', loteId: 'L1', categoria: 'Novilha', numeroCabecas: '80', validadeProduto: '30/12/2026' })
    expect(p).toMatchObject({ individuo_id: null, lote_id: 'L1', categoria: 'Novilha', numero_cabecas: 80, validade_produto: '2026-12-30' })
  })
})

describe('carência', () => {
  const linhas: CarenciaLinha[] = [
    { individuo_id: 'ind-1', lote_id: null, categoria: null, liberacao_abate_em: '2026-10-25', medicamento_nome: 'A' },
    { individuo_id: null, lote_id: 'L1', categoria: null, liberacao_abate_em: '2026-10-30', medicamento_nome: 'B' },
    { individuo_id: null, lote_id: 'L1', categoria: 'Novilha', liberacao_abate_em: '2026-11-05', medicamento_nome: 'C' },
    { individuo_id: 'ind-2', lote_id: null, categoria: null, liberacao_abate_em: '2026-10-10', medicamento_nome: 'vencida' },
  ]

  it('animal: própria e do lote (categoria só da mesma), a mais distante; vencida não conta', () => {
    expect(carenciaDoAlvo(linhas, { individuoId: 'ind-1', loteId: 'L1', categoria: 'Boi Gordo' }, '2026-10-16')).toEqual({ liberadoEm: '2026-10-30', medicamento: 'B' })
    expect(carenciaDoAlvo(linhas, { individuoId: 'ind-1', loteId: 'L1', categoria: 'novilha' }, '2026-10-16')).toEqual({ liberadoEm: '2026-11-05', medicamento: 'C' })
    expect(carenciaDoAlvo(linhas, { individuoId: 'ind-2' }, '2026-10-16')).toBeNull()
  })

  it('lote: aplicação do lote; sem categoria informada vale a mais distante', () => {
    expect(carenciaDoAlvo(linhas, { loteId: 'L1' }, '2026-10-16')?.medicamento).toBe('C')
    expect(carenciaDoAlvo(linhas, { loteId: 'L1', categoria: 'Boi Gordo' }, '2026-10-16')?.medicamento).toBe('B')
    expect(carenciaDoAlvo(linhas, { loteId: 'L9' }, '2026-10-16')).toBeNull()
  })

  it('aplicação ainda não enviada também conta; texto em DD/MM/AAAA', () => {
    const l = carenciaDeRegistroLocal({ ...base(), carenciaDias: '10' })
    expect(l).toMatchObject({ individuo_id: 'ind-1', liberacao_abate_em: '2026-10-26' })
    expect(carenciaDeRegistroLocal({ ...base() })).toBeNull()
    expect(textoCarencia({ liberadoEm: '2026-10-26', medicamento: 'Ivomec' })).toContain('26/10/2026')
    expect(somarDias('2026-12-25', 10)).toBe('2027-01-04')
  })

  it('resumo para lista e compartilhamento', () => {
    expect(resumirSanidade(base())).toBe('B-1: Ivomec')
    expect(resumirSanidade({ ...base(), alvo: 'lote', loteNome: 'Lote A', categoria: 'Novilha', numeroCabecas: '80' })).toBe('Lote A (Novilha) · 80 cab.: Ivomec')
  })
})

import { describe, expect, it } from 'vitest'
import {
  aplicarMedicamentoNoTratamento,
  contarTratados,
  errosTratamento,
  temTratamento,
  tratamentoParaServidor,
  tratamentoVazio,
} from './tratamentoCurral'

const HOJE = '16/10/2026'
const com = (extra = {}) => ({ ...tratamentoVazio(), medicamentoNome: 'Ivomec', ...extra })

describe('tratamento da sessão', () => {
  it('sem produto a sessão não tem tratamento e não gera erro nem coluna', () => {
    expect(temTratamento(tratamentoVazio())).toBe(false)
    expect(temTratamento(undefined)).toBe(false)
    expect(temTratamento(com({ medicamentoNome: '  ' }))).toBe(false)
    expect(errosTratamento(tratamentoVazio(), HOJE)).toEqual([])
    expect(errosTratamento({ ...tratamentoVazio(), carenciaDias: '-5' }, HOJE)).toEqual([])
    const p = tratamentoParaServidor(tratamentoVazio(), HOJE)
    expect(Object.values(p).every((v) => v === null)).toBe(true)
  })

  it('produto basta; carência, intervalo e validade são conferidos', () => {
    expect(errosTratamento(com(), HOJE)).toEqual([])
    expect(errosTratamento(com({ carenciaDias: '-3' }), HOJE).map((e) => e.field)).toEqual(['carenciaDias'])
    expect(errosTratamento(com({ intervaloDias: '0' }), HOJE).map((e) => e.field)).toEqual(['intervaloDias'])
    expect(errosTratamento(com({ validadeProduto: '01/10/2026' }), HOJE).map((e) => e.field)).toEqual(['validadeProduto'])
  })

  it('não cobra animal nem data (é da sessão)', () => {
    const campos = errosTratamento(com({ carenciaDias: 'x' }), HOJE).map((e) => e.field)
    expect(campos).not.toContain('individuoId')
    expect(campos).not.toContain('data')
  })

  it('catálogo preenche produto, dose, carência e intervalo e preserva o tipo', () => {
    const med = { id: 'm1', nome_comercial: 'Ivomec', principio_ativo: 'Ivermectina', dose_recomendada: '1ml/50kg', carencia_abate_dias: 28, intervalo_reaplicacao_dias: 90 }
    const t = aplicarMedicamentoNoTratamento({ ...tratamentoVazio(), tipo: 'Vermifugação' }, med)
    expect(t).toMatchObject({ tipo: 'Vermifugação', medicamentoId: 'm1', medicamentoNome: 'Ivomec', dose: '1ml/50kg', carenciaDias: '28', intervaloDias: '90' })
  })

  it('colunas tratamento_* no formato do banco', () => {
    const p = tratamentoParaServidor(
      com({ tipo: 'Vermifugação', medicamentoId: 'm1', principioAtivo: 'Iver', dose: '5 ml', via: 'SC', loteProduto: 'P1', validadeProduto: '30/12/2026', carenciaDias: '28', intervaloDias: '90', diagnostico: '' }),
      HOJE
    )
    expect(p).toEqual({
      tratamento_tipo: 'Vermifugação', tratamento_medicamento_id: 'm1', tratamento_produto_nome: 'Ivomec', tratamento_principio_ativo: 'Iver',
      tratamento_dose: '5 ml', tratamento_via: 'SC', tratamento_lote_produto: 'P1', tratamento_validade: '2026-12-30',
      tratamento_carencia_dias: 28, tratamento_intervalo_dias: 90, tratamento_diagnostico: null,
    })
  })

  it('conta os animais que recebem (menos os "não recebeu")', () => {
    expect(contarTratados([{}, { semTratamento: true }, { semTratamento: false }])).toBe(2)
    expect(contarTratados([])).toBe(0)
  })
})

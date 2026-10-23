import { describe, it, expect } from 'vitest'
import { deveAtualizarAgora, corteDeHoje, PREFS_PADRAO, type EntradaDeveAtualizar } from './atualizacaoAutomatica'

const base: EntradaDeveAtualizar = {
  prefs: PREFS_PADRAO,
  agora: new Date(2026, 9, 22, 6, 30),
  ultimaAtualizacao: new Date(2026, 9, 21, 17, 0).getTime(),
  online: true,
  testModeAtivo: false,
  fazendaId: 'f1',
}

describe('deveAtualizarAgora', () => {
  it('atualiza depois do corte quando a última atualização foi ontem', () => {
    expect(deveAtualizarAgora(base)).toBe(true)
  })
  it('atualiza quando nunca houve atualização', () => {
    expect(deveAtualizarAgora({ ...base, ultimaAtualizacao: null })).toBe(true)
  })
  it('não atualiza antes do horário de corte', () => {
    expect(deveAtualizarAgora({ ...base, agora: new Date(2026, 9, 22, 4, 59) })).toBe(false)
  })
  it('não atualiza se já atualizou depois do corte de hoje', () => {
    expect(deveAtualizarAgora({ ...base, ultimaAtualizacao: new Date(2026, 9, 22, 5, 10).getTime() })).toBe(false)
  })
  it('respeita o toggle desligado', () => {
    expect(deveAtualizarAgora({ ...base, prefs: { ativo: false, horario: '05:00' } })).toBe(false)
  })
  it('não atualiza offline, em modo de teste ou sem fazenda', () => {
    expect(deveAtualizarAgora({ ...base, online: false })).toBe(false)
    expect(deveAtualizarAgora({ ...base, testModeAtivo: true })).toBe(false)
    expect(deveAtualizarAgora({ ...base, fazendaId: null })).toBe(false)
  })
  it('usa o horário configurado', () => {
    const prefs = { ativo: true, horario: '07:00' }
    expect(deveAtualizarAgora({ ...base, prefs })).toBe(false)
    expect(deveAtualizarAgora({ ...base, prefs, agora: new Date(2026, 9, 22, 7, 0) })).toBe(true)
  })
  it('horário inválido cai para o padrão', () => {
    expect(corteDeHoje(new Date(2026, 9, 22, 12), 'xx')).toBe(new Date(2026, 9, 22, 5, 0).getTime())
  })
})

import { describe, expect, it } from 'vitest'
import {
  errosLoteProtocolo,
  formVazioLoteProtocolo,
  loteProtocoloParaServidor,
  novaLinhaLoteProtocolo,
  previaDatasProtocolo,
  somarDiasIso,
  type FormLoteProtocolo,
  type ProtocoloIatfCache,
} from './loteProtocoloIatf'

const protocolo: ProtocoloIatfCache = {
  id: 'p1',
  nome: 'Clássico',
  passos: [
    { dia: 10, ordem: 3, rotulo: 'IA', tipo: 'Inseminacao' },
    { dia: 0, ordem: 1, rotulo: 'Implante', tipo: 'Aplicacao' },
    { dia: 8, ordem: 2, rotulo: 'Retirada', tipo: 'Retirada' },
  ],
}

const completo = (): FormLoteProtocolo => ({
  ...formVazioLoteProtocolo('12/10/2026'),
  protocoloId: 'p1',
  protocoloNome: 'Clássico',
  nome: ' Lote outubro ',
  responsavel: ' ',
  linhas: [novaLinhaLoteProtocolo('u1', 'f1', 'BR-1'), novaLinhaLoteProtocolo('u2', 'f2', 'BR-2')],
})

describe('somarDiasIso e previaDatasProtocolo', () => {
  it('soma dias atravessando mês e ano', () => {
    expect(somarDiasIso('2026-10-25', 10)).toBe('2026-11-04')
    expect(somarDiasIso('2026-12-28', 8)).toBe('2027-01-05')
  })
  it('mostra os passos em ordem de dia', () => {
    expect(previaDatasProtocolo(protocolo, '2026-10-12')).toBe('D0 12/10 · D8 20/10 · D10 22/10')
    expect(previaDatasProtocolo(undefined, '2026-10-12')).toBe('')
    expect(previaDatasProtocolo(protocolo, null)).toBe('')
  })
})

describe('errosLoteProtocolo', () => {
  it('aceita o formulário completo', () => {
    expect(errosLoteProtocolo(completo())).toEqual([])
  })
  it('exige D0, protocolo, nome e fêmeas, na ordem do preenchimento', () => {
    const vazio = formVazioLoteProtocolo('')
    expect(errosLoteProtocolo(vazio).map((e) => e.field)).toEqual(['data', 'protocolo', 'nome', 'linhas'])
  })
  it('recusa fêmea sem cadastro e fêmea repetida', () => {
    const semId = { ...completo(), linhas: [novaLinhaLoteProtocolo('u1', '', 'X')] }
    expect(errosLoteProtocolo(semId)[0].message).toMatch(/Cadastre o animal/)
    const repetida = { ...completo(), linhas: [novaLinhaLoteProtocolo('u1', 'f1', 'BR-1'), novaLinhaLoteProtocolo('u2', 'f1', 'BR-1')] }
    expect(errosLoteProtocolo(repetida)[0].message).toMatch(/repetida/)
  })
  it('recusa fêmea que já está ativa em outro lote de protocolo em andamento', () => {
    const emOutro = new Map([['f2', 'Lote setembro']])
    const erros = errosLoteProtocolo(completo(), emOutro)
    expect(erros).toHaveLength(1)
    expect(erros[0].message).toMatch(/BR-2 já está no lote de protocolo "Lote setembro" em andamento/)
    expect(errosLoteProtocolo(completo(), new Map([['f1', 'A'], ['f2', 'B']]))[0].message).toMatch(/e mais 1/)
    expect(errosLoteProtocolo(completo(), new Map([['zz', 'A']]))).toEqual([])
  })
})

describe('loteProtocoloParaServidor', () => {
  it('monta a RPC com o id do registro como local_id e origem pwa', () => {
    const c = loteProtocoloParaServidor({ ...completo(), id: 'reg-9', usuario: 'João' } as unknown as Record<string, unknown>, 'faz')
    expect(c.rpc).toBe('criar_lote_protocolo_iatf')
    expect(c.params).toEqual({
      p_fazenda_id: 'faz',
      p_protocolo_id: 'p1',
      p_nome: 'Lote outubro',
      p_data_d0: '2026-10-12',
      p_individuos: ['f1', 'f2'],
      p_estacao_id: null,
      p_responsavel: 'João',
      p_local_id: 'reg-9',
      p_origem: 'pwa',
    })
  })
  it('responsável digitado tem preferência sobre o usuário', () => {
    const c = loteProtocoloParaServidor({ ...completo(), responsavel: 'Vet', id: 'r', usuario: 'João' } as unknown as Record<string, unknown>, 'faz')
    expect(c.params.p_responsavel).toBe('Vet')
  })
})

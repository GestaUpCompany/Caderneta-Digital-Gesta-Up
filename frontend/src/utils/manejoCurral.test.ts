import { describe, expect, it } from 'vitest'
import { dataBRparaIso, faltaParaAnimalNovo, linhasParaServidor, linhaVazia, novaLinha, resumirLinha } from './manejoCurral'

const base = () => novaLinha('u1')

describe('manejoCurral', () => {
  it('linha sem nada é vazia; qualquer dado a torna útil', () => {
    expect(linhaVazia(base())).toBe(true)
    expect(linhaVazia({ ...base(), pesoKg: '320' })).toBe(false)
    expect(linhaVazia({ ...base(), idBrincoNovo: 'B-1' })).toBe(false)
  })

  it('animal novo exige identificação, lote, categoria, sexo e raça; animal existente não exige nada', () => {
    expect(faltaParaAnimalNovo({ ...base(), individuoId: 'x' })).toEqual([])
    expect(faltaParaAnimalNovo(base())).toEqual(['identificação', 'lote', 'categoria', 'sexo', 'raça'])
    expect(
      faltaParaAnimalNovo({ ...base(), idBrincoNovo: 'B', loteDestinoId: 'L', categoria: 'boi gordo', sexo: 'Macho', raca: 'Nelore' })
    ).toEqual([])
  })

  it('converte a data BR (com ou sem hora) e rejeita lixo', () => {
    expect(dataBRparaIso('16/10/2026')).toBe('2026-10-16')
    expect(dataBRparaIso('16/10/2026 14:30')).toBe('2026-10-16')
    expect(dataBRparaIso('2026-10-16')).toBeNull()
    expect(dataBRparaIso(undefined)).toBeNull()
  })

  it('monta as linhas do servidor: ignora vazias, numera, limpa texto e só manda dados de animal novo sem individuoId', () => {
    const r = linhasParaServidor(
      [
        { ...base(), uid: 'a', individuoId: 'ind-1', idBrincoNovo: ' B-9 ', pesoKg: '412,5', sexo: 'Macho', raca: 'Nelore' },
        base(),
        { ...base(), uid: 'c', idChipNovo: 'C-1', sexo: 'Fêmea', categoria: 'novilha', raca: 'Nelore', loteDestinoId: 'L1' },
      ],
      'sess',
      'faz'
    )
    expect(r).toHaveLength(2)
    expect(r[0]).toMatchObject({ id: 'a', sessao_id: 'sess', fazenda_id: 'faz', ordem: 1, individuo_id: 'ind-1', id_brinco_novo: 'B-9', peso_kg: 412.5, sexo: null, raca: null })
    expect(r[1]).toMatchObject({ id: 'c', ordem: 2, individuo_id: null, sexo: 'Fêmea', categoria: 'novilha', lote_destino_id: 'L1' })
  })

  it('animal não encontrado: o ID digitado no seletor vira a identificação do animal novo; animal achado não', () => {
    const novo = { ...base(), uid: 'n', identificadorLido: 'NOVO-77', lidoBrinco: 'NOVO-77', sexo: 'Fêmea' as const, categoria: 'Novilha', raca: 'Nelore', loteDestinoId: 'L1' }
    const achado = { ...base(), uid: 'e', individuoId: 'ind-1', identificadorLido: '22', lidoBrinco: '22', lidoChip: '26' }
    const [rn, re] = linhasParaServidor([novo, achado], 's', 'f')
    expect(rn).toMatchObject({ id_brinco_novo: 'NOVO-77', id_chip_novo: null, id_manejo_novo: null })
    expect(re).toMatchObject({ id_brinco_novo: null, id_chip_novo: null })
  })

  it('identificação nova digitada vale mais que o ID lido', () => {
    const [r] = linhasParaServidor([{ ...base(), idBrincoNovo: 'DEF-1', lidoBrinco: 'PROV-1', identificadorLido: 'PROV-1' }], 's', 'f')
    expect(r).toMatchObject({ id_brinco_novo: 'DEF-1' })
  })

  it('peso inválido ou zero não vai para o servidor', () => {
    const r = linhasParaServidor([{ ...base(), idBrincoNovo: 'B', pesoKg: '0' }, { ...base(), uid: 'z', idBrincoNovo: 'C', pesoKg: 'abc' }], 's', 'f')
    expect(r.map((x) => x.peso_kg)).toEqual([null, null])
  })

  it('resume a linha para a revisão', () => {
    expect(resumirLinha({ ...base(), identificadorLido: 'P-7', idBrincoNovo: 'B-1', loteDestinoNome: 'Lote A', pesoKg: '200' })).toBe('P-7 → brinco B-1 · lote Lote A · 200 kg')
    expect(resumirLinha(base())).toBe('Animal sem ID')
  })
})

describe('sem_tratamento na linha enviada ao servidor', () => {
  it('padrão false; "não recebeu" vira true', () => {
    const a = { ...novaLinha('a'), individuoId: 'x', identificadorLido: 'B-1' }
    const b = { ...novaLinha('b'), individuoId: 'y', identificadorLido: 'B-2', semTratamento: true }
    const rows = linhasParaServidor([a, b], 'S1', 'F1')
    expect(rows.map((r) => r.sem_tratamento)).toEqual([false, true])
  })
})

import { describe, expect, it } from 'vitest'
import { formatarRegistroComoTexto } from './shareUtils'

// Registro no formato que o Rodeio grava no IndexedDB (gado contado = Não)
const base = () =>
  ({
    id: 'r1',
    data: '08/10/2026 10:30',
    pasto: 'P10',
    numeroLote: 'Teste 2',
    gadoContado: 'Não',
    totalCabecas: 46,
    n_cabecas: 46,
    qtd_bezerros: 0,
    escoreFezes: '3',
    escoreGado: 4,
    equipe: 2,
    equipeNomes: ['Victor Hugo', 'Welton Cabral'],
    diagnosticos: {
      bebedourosCochos: { valor: 'S', observacao: '' },
      pastagensTaxaLotacao: { valor: 'S', observacao: '' },
      cercasCochosPorteiras: { valor: 'S', observacao: '' },
      animaisMachucadosDoentesBichados: { valor: 'N', observacao: '' },
      carrapatosMoscas: { valor: 'N', observacao: '' },
      animaisEntreverados: { valor: 'N', observacao: '' },
      animalMorto: { valor: 'N', observacao: '' },
    },
  }) as any

const texto = (extra: Record<string, unknown> = {}) => formatarRegistroComoTexto({ ...base(), ...extra }, 'rodeio')

describe('formatarRegistroComoTexto (rodeio)', () => {
  it('monta o cabeçalho, o lote, o total, os escores e a equipe', () => {
    const t = texto()
    expect(t).toContain('RODEIO GADO')
    expect(t).toContain('LOTE: *Teste 2*')
    expect(t).toContain('TOTAL: *46 animais*')
    expect(t).toContain('ESCORE FEZES: *3 - Ideal*')
    expect(t).toContain('N° PESSOAS NO MANEJO: *2*')
    expect(t).toContain('EQUIPE: *Victor Hugo, Welton Cabral*')
    expect(t).toContain('ESCORE GADO: *4 - Gordo*')
  })

  it('não imprime valores quebrados', () => {
    expect(texto()).not.toMatch(/undefined|NaN|\[object|\bnull\b/)
  })

  it('só lista no checklist o que é problema, respeitando os itens invertidos', () => {
    expect(texto()).not.toContain('AVALIAÇÃO GERAL')
    const t = texto({
      diagnosticos: {
        ...base().diagnosticos,
        bebedourosCochos: { valor: 'N', observacao: 'cocho quebrado' },
        animalMorto: { valor: 'S', observacao: 'brinco 123' },
      },
    })
    expect(t).toContain('AVALIAÇÃO GERAL')
    expect(t).toContain('BEBEDOUROS/COCHOS OK?: *Não*')
    expect(t).toContain('OBSERVAÇÃO: *cocho quebrado*')
    expect(t).toContain('ANIMAL MORTO: *Sim*')
    expect(t).toContain('OBSERVAÇÃO: *brinco 123*')
    expect(t).not.toContain('PASTAGENS/TAXA DE LOTAÇÃO OK?')
  })

  it('inclui a observação do lote', () => {
    expect(texto({ observacao: 'gado calmo' })).toContain('OBSERVAÇÃO DO LOTE: *gado calmo*')
  })

  it('lista a contagem por categoria com o cadastro quando o gado foi contado', () => {
    const t = texto({
      gadoContado: 'Sim',
      totalCabecas: 45,
      categorias_detalhes: [
        { nome: 'boi gordo', quant_atual: 31, quant_informada: 30 },
        { nome: 'garrote', quant_atual: 2, quant_informada: 2 },
      ],
    })
    expect(t).toContain('Boi Gordo: *30* (cadastro: 31)')
    expect(t).toContain('Garrote: *2* (cadastro: 2)')
  })

  describe('meta de rodeio', () => {
    const meta = (m: Record<string, unknown>) => texto({ metaRodeio: m })

    it('primeiro rodeio do lote', () => {
      expect(meta({ metaDias: 7, hasRecord: false })).toContain('Primeiro rodeio · Meta: 7 dias')
    })

    it('em dia, com dias até o próximo', () => {
      expect(meta({ metaDias: 7, hasRecord: true, isDentroMeta: true, diasAteProximo: 7 })).toContain(
        'Em dia · Próximo rodeio em 7 dias'
      )
      expect(meta({ metaDias: 3, hasRecord: true, isDentroMeta: true, diasAteProximo: 1 })).toContain(
        'Próximo rodeio em 1 dia\n'
      )
    })

    it('vence hoje', () => {
      expect(meta({ metaDias: 1, hasRecord: true, isDentroMeta: true, diasAteProximo: 0 })).toContain(
        'Próximo rodeio: HOJE'
      )
    })

    it('atrasado', () => {
      expect(
        meta({ metaDias: 7, hasRecord: true, isDentroMeta: false, diasAteProximo: -6, diasDesdeUltimo: 13 })
      ).toContain('Atrasado há 6 dias · Último há 13 dias')
    })

    it('sem meta definida não imprime a linha', () => {
      expect(meta({ metaDias: 0, hasRecord: true })).not.toContain('META RODEIO')
      expect(texto()).not.toContain('META RODEIO')
    })
  })
})

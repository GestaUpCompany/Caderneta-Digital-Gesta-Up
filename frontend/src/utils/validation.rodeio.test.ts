import { describe, expect, it } from 'vitest'
import { validateRodeio } from './validation'

const diagnosticosOk = {
  bebedourosCochos: { valor: 'S', observacao: '' },
  pastagensTaxaLotacao: { valor: 'S', observacao: '' },
  cercasCochosPorteiras: { valor: 'S', observacao: '' },
  animaisMachucadosDoentesBichados: { valor: 'N', observacao: '' },
  carrapatosMoscas: { valor: 'N', observacao: '' },
  animaisEntreverados: { valor: 'N', observacao: '' },
  animalMorto: { valor: 'N', observacao: '' },
}

// Payload no formato que RodeioPage.executarSalvamento monta (gado contado = Não)
const base = (): Record<string, unknown> => ({
  data: '01/01/2020',
  numeroLote: 'Teste 2',
  gadoContado: 'Não',
  totalCabecas: 46,
  categorias_detalhes: null,
  vaca: 0, touro: 0, boiGordo: 0, boiMagro: 0, garrote: 0, bezerro: 0, novilha: 0, tropa: 0, outros: 0,
  diagnosticos: diagnosticosOk,
  escoreGado: 3,
  escoreFezes: '3',
  equipe: 2,
  equipeNomes: ['Victor Hugo', 'Welton Cabral'],
})

const campos = (data: Record<string, unknown>) => validateRodeio(data).errors.map((e) => e.field)

describe('validateRodeio', () => {
  it('aceita o payload completo com gado contado = Não', () => {
    expect(validateRodeio(base()).isValid).toBe(true)
  })

  it('exige data válida e não futura', () => {
    expect(campos({ ...base(), data: '' })).toContain('data')
    expect(campos({ ...base(), data: '31/02/2020' })).toContain('data')
    expect(campos({ ...base(), data: '01/01/2999' })).toContain('data')
  })

  it('exige lote e resposta de gado contado', () => {
    expect(campos({ ...base(), numeroLote: '' })).toContain('numeroLote')
    expect(campos({ ...base(), gadoContado: '' })).toContain('gadoContado')
  })

  it('exige escore corporal de 1 a 5', () => {
    expect(campos({ ...base(), escoreGado: null })).toContain('escoreGado')
    expect(campos({ ...base(), escoreGado: 0 })).toContain('escoreGado')
    expect(campos({ ...base(), escoreGado: 6 })).toContain('escoreGado')
    expect(campos({ ...base(), escoreGado: 5 })).not.toContain('escoreGado')
  })

  it('exige escore de fezes de 1 a 5', () => {
    expect(campos({ ...base(), escoreFezes: null })).toContain('escoreFezes')
    expect(campos({ ...base(), escoreFezes: '6' })).toContain('escoreFezes')
  })

  it('aceita equipe de 1 a 5 e recusa 0 e 6', () => {
    expect(campos({ ...base(), equipe: null })).toContain('equipe')
    expect(campos({ ...base(), equipe: 6, equipeNomes: ['a', 'b', 'c', 'd', 'e', 'f'] })).toContain('equipe')
    expect(campos({ ...base(), equipe: 5, equipeNomes: ['a', 'b', 'c', 'd', 'e'] })).not.toContain('equipe')
  })

  it('exige o nome de todas as pessoas da equipe', () => {
    expect(campos({ ...base(), equipeNomes: ['Victor Hugo'] })).toContain('equipeNomes')
    expect(campos({ ...base(), equipeNomes: ['Victor Hugo', '  '] })).toContain('equipeNomes')
  })

  it('exige S/N em todos os itens do checklist quando ele está ativo, e ignora quando é null', () => {
    const sem = { ...diagnosticosOk, animalMorto: { valor: '', observacao: '' } }
    expect(campos({ ...base(), diagnosticos: sem })).toContain('animalMorto')
    expect(validateRodeio({ ...base(), diagnosticos: null }).isValid).toBe(true)
  })

  describe('gado contado = Sim', () => {
    it('aceita contagem por categoria do lote (categorias_detalhes) mesmo quando nenhuma mapeia para campo fixo', () => {
      const data = {
        ...base(),
        gadoContado: 'Sim',
        totalCabecas: 12,
        categorias_detalhes: [{ nome: 'categoria nova', quant_atual: 12, quant_informada: 12 }],
      }
      expect(campos(data)).not.toContain('categorias')
    })

    it('aceita contagem pelo campo único de total (lote sem categorias cadastradas)', () => {
      const data = { ...base(), gadoContado: 'Sim', totalCabecas: 45, categorias_detalhes: null }
      expect(campos(data)).not.toContain('categorias')
    })

    it('recusa quando nenhum animal foi contado', () => {
      const data = {
        ...base(),
        gadoContado: 'Sim',
        totalCabecas: 0,
        categorias_detalhes: [{ nome: 'boi gordo', quant_atual: 31, quant_informada: 0 }],
      }
      expect(campos(data)).toContain('categorias')
    })

    it('mantém a compatibilidade com registros antigos que só têm campos fixos', () => {
      const data = { ...base(), gadoContado: 'Sim', totalCabecas: undefined, boiGordo: 10 }
      expect(campos(data)).not.toContain('categorias')
    })
  })
})

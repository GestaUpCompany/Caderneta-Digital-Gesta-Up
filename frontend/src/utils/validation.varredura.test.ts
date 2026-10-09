import { describe, expect, it } from 'vitest'
import {
  validateAbastecimento,
  validateBebedouros,
  validateMaternidade,
  validateRodeio,
  validateSuplementacao,
} from './validation'

type Dados = Record<string, unknown>
type Validador = (d: Dados) => { isValid: boolean; errors: { field: string; message: string }[] }

// Varredura campo a campo das telas que já passaram pela bateria de testes: o payload completo tem de ser
// válido (sem erro de campo obrigatório que não existe) e, esvaziando cada obrigatório sozinho, só aquele
// campo pode reclamar (sem erro de outro campo e sem a tela liberar).
const VAZIOS: unknown[] = ['', '   ', undefined, null]

function varrer(nome: string, validar: Validador, base: () => Dados, obrigatorios: Record<string, string[]>) {
  describe(`${nome}: obrigatórios`, () => {
    it('payload completo é válido', () => {
      expect(validar(base()).errors).toEqual([])
    })

    for (const [campoErro, campos] of Object.entries(obrigatorios)) {
      for (const vazio of VAZIOS) {
        it(`${campoErro} vazio (${JSON.stringify(vazio) ?? 'undefined'}) bloqueia só ele`, () => {
          const dados = base()
          for (const c of campos) dados[c] = vazio
          const r = validar(dados)
          expect(r.isValid).toBe(false)
          expect(r.errors.map((e) => e.field)).toEqual([campoErro])
        })
      }
    }
  })
}

varrer(
  'Maternidade',
  validateMaternidade,
  () => ({
    data: '09/10/2026',
    idProvisorioCria: 'BAT-M1',
    idBrincoCria: '',
    idChipCria: '',
    tratamento: 'Colostro',
    sexo: 'Macho',
    raca: 'Nelore',
    tipoParto: ['Normal'],
    idManejoMae: 'MAE-N1',
    idBrincoMae: '',
    idChipMae: '',
    categoriaMae: 'Primípara',
  }),
  {
    data: ['data'],
    idProvisorioCria: ['idProvisorioCria'],
    tratamento: ['tratamento'],
    sexo: ['sexo'],
    raca: ['raca'],
    idManejoMae: ['idManejoMae', 'idBrincoMae', 'idChipMae'],
    categoriaMae: ['categoriaMae'],
  }
)

varrer(
  'Rodeio',
  validateRodeio,
  () => ({
    data: '09/10/2026',
    numeroLote: 'L1',
    gadoContado: 'Sim',
    totalCabecas: 10,
    escoreGado: 3,
    escoreFezes: 3,
    equipe: 2,
    equipeNomes: ['Ana', 'Beto'],
  }),
  {
    data: ['data'],
    numeroLote: ['numeroLote'],
    gadoContado: ['gadoContado', 'totalCabecas'],
    escoreGado: ['escoreGado'],
    escoreFezes: ['escoreFezes'],
    equipe: ['equipe', 'equipeNomes'],
  }
)

varrer(
  'Suplementação',
  validateSuplementacao,
  () => ({
    data: '09/10/2026',
    tratador: 'João',
    pasto: 'P50',
    formulacao: 'Proteinado',
    leituraCocho: 1,
    kgCocho: 100,
  }),
  {
    data: ['data'],
    tratador: ['tratador'],
    pasto: ['pasto'],
    formulacao: ['formulacao'],
    kgCocho: ['kgCocho'],
  }
)

varrer(
  'Bebedouros',
  validateBebedouros,
  () => ({ data: '09/10/2026', responsavel: 'Maria', numeroBebedouro: '1', leituraBebedouro: 2 }),
  {
    data: ['data'],
    responsavel: ['responsavel'],
    numeroBebedouro: ['numeroBebedouro'],
    leituraBebedouro: ['leituraBebedouro'],
  }
)

varrer(
  'Abastecimento',
  validateAbastecimento,
  () => ({
    data: '09/10/2026',
    quemAbasteceu: 'Zé',
    operadorMotorista: 'Zé',
    maquinaVeiculo: 'Trator 1',
    totalAbastecido: '50',
    combustivel: 'Diesel',
    odometro: '1000',
    tipoOperacao: 'Transporte',
  }),
  {
    data: ['data'],
    quemAbasteceu: ['quemAbasteceu'],
    operadorMotorista: ['operadorMotorista'],
    maquinaVeiculo: ['maquinaVeiculo'],
    totalAbastecido: ['totalAbastecido'],
    combustivel: ['combustivel'],
    odometro: ['odometro'],
    tipoOperacao: ['tipoOperacao'],
  }
)

describe('valores inválidos (não vazios) também bloqueiam', () => {
  const campo = (v: Validador, d: Dados) => v(d).errors.map((e) => e.field)

  it('datas impossíveis e no formato errado', () => {
    for (const data of ['31/02/2026', '2026-10-09', '9/10/26', 'abc']) {
      expect(campo(validateBebedouros, { data, responsavel: 'M', numeroBebedouro: '1', leituraBebedouro: 2 })).toContain('data')
    }
  })

  it('leituras fora da escala', () => {
    const b = { data: '09/10/2026', responsavel: 'M', numeroBebedouro: '1' }
    for (const leituraBebedouro of [0, 4, 'x', -1]) expect(campo(validateBebedouros, { ...b, leituraBebedouro })).toContain('leituraBebedouro')
    for (const leituraBebedouro of [1, 2, 3]) expect(campo(validateBebedouros, { ...b, leituraBebedouro })).toEqual([])
  })

  it('suplementação: kg zero/negativo/texto e leitura fora de -1..3', () => {
    const b = { data: '09/10/2026', tratador: 'J', pasto: 'P', formulacao: 'F', leituraCocho: 1 }
    for (const kgCocho of [0, '0', -5, 'abc']) expect(campo(validateSuplementacao, { ...b, kgCocho })).toContain('kgCocho')
    for (const leituraCocho of [-2, 4, 'x']) expect(campo(validateSuplementacao, { ...b, kgCocho: 10, leituraCocho })).toContain('leituraCocho')
    for (const leituraCocho of [-1, 0, 3]) expect(campo(validateSuplementacao, { ...b, kgCocho: 10, leituraCocho })).toEqual([])
  })

  it('suplementação: creep ativo exige formulação, leitura e kg; sem lote nem creep bloqueia', () => {
    const b = { data: '09/10/2026', tratador: 'J', pasto: 'P' }
    expect(campo(validateSuplementacao, { ...b, suplementarAdulto: false, suplementarCreep: true })).toEqual(['creepFormulacao', 'creepLeitura', 'creepKgCocho'])
    expect(campo(validateSuplementacao, { ...b, suplementarAdulto: false, suplementarCreep: true, creepFormulacao: 'C', creepLeitura: 0, creepKgCocho: 5 })).toEqual([])
    expect(campo(validateSuplementacao, { ...b, suplementarAdulto: false, suplementarCreep: false })).toEqual(['suplementarCreep'])
  })

  it('suplementação: depósito só é exigido quando o pasto tem depósito', () => {
    const b = { data: '09/10/2026', tratador: 'J', pasto: 'P', formulacao: 'F', leituraCocho: 1, kgCocho: 10 }
    expect(campo(validateSuplementacao, { ...b, possuiDeposito: false })).toEqual([])
    expect(campo(validateSuplementacao, { ...b, possuiDeposito: true })).toEqual(['kgDeposito'])
    expect(campo(validateSuplementacao, { ...b, possuiDeposito: true, kgDeposito: 0 })).toEqual(['kgDeposito'])
    expect(campo(validateSuplementacao, { ...b, possuiDeposito: true, kgDeposito: 30 })).toEqual([])
  })

  it('rodeio: gado não contado dispensa contagem; contado exige ao menos uma categoria', () => {
    const b = { data: '09/10/2026', numeroLote: 'L', escoreGado: 3, escoreFezes: 3, equipe: 1, equipeNomes: ['A'] }
    expect(campo(validateRodeio, { ...b, gadoContado: 'Não' })).toEqual([])
    expect(campo(validateRodeio, { ...b, gadoContado: 'Sim' })).toEqual(['categorias'])
    expect(campo(validateRodeio, { ...b, gadoContado: 'Sim', totalCabecas: 0 })).toEqual(['categorias'])
    expect(campo(validateRodeio, { ...b, gadoContado: 'Sim', categorias_detalhes: [{ quant_informada: 4 }] })).toEqual([])
  })

  it('rodeio: escores fora de 1..5 e equipe sem nomes', () => {
    const b = { data: '09/10/2026', numeroLote: 'L', gadoContado: 'Não', escoreFezes: 3, equipe: 1, equipeNomes: ['A'] }
    for (const escoreGado of [0, 6, 'x']) expect(campo(validateRodeio, { ...b, escoreGado })).toEqual(['escoreGado'])
    expect(campo(validateRodeio, { ...b, escoreGado: 3, equipe: 3, equipeNomes: ['A', 'B'] })).toEqual(['equipeNomes'])
    expect(campo(validateRodeio, { ...b, escoreGado: 3, equipe: 2, equipeNomes: ['A', ' '] })).toEqual(['equipeNomes'])
  })

  it('rodeio: checklist ativo exige SIM/NÃO nos sete itens; sem checklist não exige', () => {
    const b = { data: '09/10/2026', numeroLote: 'L', gadoContado: 'Não', escoreGado: 3, escoreFezes: 3, equipe: 1, equipeNomes: ['A'] }
    expect(campo(validateRodeio, b)).toEqual([])
    expect(campo(validateRodeio, { ...b, diagnosticos: {} })).toHaveLength(7)
    const completo = Object.fromEntries(
      ['bebedourosCochos', 'pastagensTaxaLotacao', 'animaisMachucadosDoentesBichados', 'cercasCochosPorteiras', 'carrapatosMoscas', 'animaisEntreverados', 'animalMorto'].map((k) => [k, { valor: 'S' }])
    )
    expect(campo(validateRodeio, { ...b, diagnosticos: completo })).toEqual([])
  })

  it('abastecimento: total zero/negativo/texto, odômetro inválido, "Outros" sem descrição', () => {
    const b = { data: '09/10/2026', quemAbasteceu: 'Z', operadorMotorista: 'Z', maquinaVeiculo: 'T', combustivel: 'Diesel', odometro: '10', tipoOperacao: 'Transporte' }
    for (const totalAbastecido of ['0', '-3', 'abc']) expect(campo(validateAbastecimento, { ...b, totalAbastecido })).toEqual(['totalAbastecido'])
    expect(campo(validateAbastecimento, { ...b, totalAbastecido: '12,5' })).toEqual([])
    expect(campo(validateAbastecimento, { ...b, totalAbastecido: '5', odometro: 'x' })).toEqual(['odometro'])
    expect(campo(validateAbastecimento, { ...b, totalAbastecido: '5', odometro: '', semHorimetro: true })).toEqual([])
    expect(campo(validateAbastecimento, { ...b, totalAbastecido: '5', tipoOperacao: 'Outros' })).toEqual(['tipoOperacaoOutros'])
    expect(campo(validateAbastecimento, { ...b, totalAbastecido: '5', tipoOperacao: 'Outros', tipoOperacaoOutros: 'Reboque' })).toEqual([])
  })

  it('maternidade: aborto e natimorto dispensam os dados da cria, mas não os da mãe', () => {
    const mae = { data: '09/10/2026', idManejoMae: 'M1', categoriaMae: 'Primípara' }
    for (const tipoParto of [['Normal', 'Aborto'], ['Normal', 'Natimorto']]) {
      expect(campo(validateMaternidade, { ...mae, tipoParto })).toEqual([])
      expect(campo(validateMaternidade, { ...mae, tipoParto, idManejoMae: '' })).toEqual(['idManejoMae'])
      expect(campo(validateMaternidade, { ...mae, tipoParto, categoriaMae: '' })).toEqual(['categoriaMae'])
    }
    expect(campo(validateMaternidade, { ...mae, tipoParto: [] })).toContain('tipoParto')
  })

  it('maternidade: guacho exige identificação da mãe adotiva; sem guacho não exige', () => {
    const b = { data: '09/10/2026', idProvisorioCria: 'C1', tratamento: 'Colostro', sexo: 'Macho', raca: 'Nelore', tipoParto: ['Normal'], idManejoMae: 'M1', categoriaMae: 'Primípara' }
    expect(campo(validateMaternidade, { ...b, guachoCria: false })).toEqual([])
    expect(campo(validateMaternidade, { ...b, guachoCria: true })).toEqual(['idManejoMaeAdotiva'])
    expect(campo(validateMaternidade, { ...b, guachoCria: true, idBrincoMaeAdotiva: 'ADOT' })).toEqual([])
  })
})

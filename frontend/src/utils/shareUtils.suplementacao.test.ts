import { describe, expect, it } from 'vitest'
import { formatarRegistroComoTexto } from './shareUtils'

// Registro no formato que a Suplementação grava no IndexedDB (lote adulto em sacaria)
const base = () =>
  ({
    id: 'r1',
    data: '04/10/2026 20:57',
    tratador: 'Victor Hugo',
    pasto: 'P20',
    numeroLote: 'Teste Retroativo Fix',
    nCabecasLote: 10,
    qtdBezerrosLote: 0,
    pesoVivoKgLote: 537.5,
    formulacao: 'Terminação Boi',
    teorMs: 45.09,
    metaConsumo: 1.5,
    leituraCocho: '2',
    kgCocho: 120,
    formaFornecimento: 'sacaria',
    qtdSacos: 2,
    suplementarAdulto: true,
    suplementarCreep: false,
    kgDeposito: 0,
    possuiDeposito: false,
    categoriasString: 'boi gordo',
    escoreFezes: '3',
    checklist: {
      limpeza_cocho: { valor: true, observacao: '' },
      espacamento_cocho_adequado: { valor: true, observacao: '' },
      cochos_condicoes: { valor: true, observacao: '' },
      aterro_acesso_ideal: { valor: true, observacao: '' },
    },
  }) as any

const texto = (extra: Record<string, unknown> = {}) => formatarRegistroComoTexto({ ...base(), ...extra }, 'suplementacao')

describe('formatarRegistroComoTexto (suplementação)', () => {
  it('monta identificação, lote, leitura, sacos e escore de fezes', () => {
    const t = texto()
    expect(t).toContain('SUPLEMENTAÇÃO')
    expect(t).toContain('TRATADOR: *Victor Hugo*')
    expect(t).toContain('LOTE: *Teste Retroativo Fix*')
    expect(t).toContain('*Terminação Boi*')
    expect(t).toContain('LEITURA COCHO: *2*')
    expect(t).toContain('SUPLEMENTO COCHO (KG): *120*')
    expect(t).toContain('FORNECIMENTO: *Sacaria*')
    expect(t).toContain('SACOS: *2*')
    expect(t).toContain('ESCORE FEZES: *3*')
  })

  it('não imprime valores quebrados nem marcadores de foto', () => {
    expect(texto()).not.toMatch(/undefined|NaN|\[object|\bnull\b|\(foto/)
  })

  it('só lista problemas marcados (valor=false), com a observação', () => {
    expect(texto()).not.toContain('PROBLEMAS ENCONTRADOS')
    const t = texto({
      checklist: {
        ...base().checklist,
        espacamento_cocho_adequado: { valor: false, observacao: '' },
        cochos_condicoes: { valor: false, observacao: 'cocho quebrado', fotoBase64: 'AAAA' },
      },
    })
    expect(t).toContain('PROBLEMAS ENCONTRADOS')
    expect(t).toContain('ESPAÇAMENTO DO COCHO INADEQUADO')
    expect(t).toContain('COCHO EM MÁS CONDIÇÕES')
    expect(t).toContain('OBSERVAÇÃO: *cocho quebrado*')
    expect(t).not.toContain('ATERRO/ACESSO INADEQUADO')
    expect(t).not.toContain('FOTO DO COCHO')
  })

  it('limpeza do cocho: Sim e Não', () => {
    expect(texto()).toContain('LIMPEZA DE COCHO FOI REALIZADA?: *Sim*')
    expect(texto({ checklist: { ...base().checklist, limpeza_cocho: { valor: false, observacao: '' } } })).toContain(
      'LIMPEZA DE COCHO FOI REALIZADA?: *Não*'
    )
  })

  it('só creep: mostra o bloco de creep e o depósito', () => {
    const t = texto({
      suplementarAdulto: false,
      suplementarCreep: true,
      formulacao: 'Creep Teste',
      creepFormulacao: 'Creep Teste',
      creepLeitura: '1',
      creepKgCocho: 25,
      creepFormaFornecimento: 'granel',
      creepNCabecas: 13,
      creepMetaConsumo: 2,
      creepPesoVivoKg: 93.23,
      kgCocho: 25,
      leituraCocho: '1',
      formaFornecimento: 'granel',
      qtdSacos: null,
      kgDeposito: 120,
      possuiDeposito: true,
    })
    expect(t).toContain('CREEP FEEDING')
    expect(t).toContain('N° BEZERROS AO PÉ: *13*')
    expect(t).toContain('SUPLEMENTO DEPÓSITO (KG): *120*')
    expect(t).not.toMatch(/undefined|NaN|\[object|\bnull\b/)
  })
})

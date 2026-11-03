import { describe, expect, it } from 'vitest'
import { formatarRegistroComoTexto } from './shareUtils'

const base = () =>
  ({
    id: 'b1',
    data: '05/10/2026 21:22',
    responsavel: 'Victor Hugo',
    numeroBebedouro: 'Bebedouro Pasto B2',
    leituraBebedouro: 2,
    tempoDesdeLimpeza: 'Sem histórico',
    intervaloMedioLimpezas: 'Sem dados suficientes',
    metaIntervaloLimpeza: '4 dias',
    checklist: {
      agua_suficiente: { valor: true, observacao: '' },
      vazao_bebedouro_ideal: { valor: true, observacao: '' },
      boia_protecao_boas_condicoes: { valor: true, observacao: '' },
      aterro_acesso_bebedouro_ideal: { valor: true, observacao: '' },
      espacamento_bebedouro_ideal: { valor: true, observacao: '' },
      limpou_hoje: { valor: true, observacao: '' },
    },
  }) as any

const texto = (extra: Record<string, unknown> = {}) => formatarRegistroComoTexto({ ...base(), ...extra }, 'bebedouros')

describe('formatarRegistroComoTexto (bebedouros)', () => {
  it('monta responsável, bebedouro, leitura, limpeza e histórico', () => {
    const t = texto()
    expect(t).toContain('BEBEDOUROS')
    expect(t).toContain('RESPONSÁVEL: *Victor Hugo*')
    expect(t).toContain('BEBEDOURO: *Bebedouro Pasto B2*')
    expect(t).toContain('LEITURA BEBEDOURO: *2*')
    expect(t).toContain('LIMPOU O BEBEDOURO HOJE?: *Sim*')
    expect(t).toContain('META LIMPEZA: *a cada 4 dias*')
    expect(t).not.toContain('PROBLEMAS ENCONTRADOS')
  })

  it('lista só os problemas marcados, com observação, sem marcadores de foto', () => {
    const t = texto({
      checklist: {
        ...base().checklist,
        agua_suficiente: { valor: false, observacao: 'cocho seco', fotoBase64: 'AAAA' },
        espacamento_bebedouro_ideal: { valor: false, observacao: '' },
      },
    })
    expect(t).toContain('PROBLEMAS ENCONTRADOS')
    expect(t).toContain('ÁGUA INSUFICIENTE')
    expect(t).toContain('OBSERVAÇÃO: *cocho seco*')
    expect(t).toContain('ESPAÇAMENTO INADEQUADO')
    expect(t).not.toContain('ATERRO/ACESSO INADEQUADO')
    expect(t).not.toMatch(/\(foto|undefined|NaN|\[object|\bnull\b/)
  })

  it('a foto principal do bebedouro no checklist não vira item nem linha do texto', () => {
    const comFoto = texto({
      checklist: { ...base().checklist, foto_bebedouro: { valor: true, observacao: '', foto_url: 'https://x/foto_bebedouro.webp' } },
    })
    expect(comFoto).toBe(texto())
    expect(comFoto).not.toMatch(/foto|https?:/i)
  })

  it('checklist só com a foto (fazenda sem checklist) não inventa "limpou hoje"', () => {
    const t = texto({ checklist: { foto_bebedouro: { valor: true, observacao: '', foto_url: 'https://x/f.webp' } } })
    expect(t).not.toContain('LIMPOU O BEBEDOURO HOJE?')
    expect(t).not.toContain('PROBLEMAS ENCONTRADOS')
  })

  it('limpeza: Não', () => {
    expect(texto({ checklist: { ...base().checklist, limpou_hoje: { valor: false, observacao: '' } } })).toContain(
      'LIMPOU O BEBEDOURO HOJE?: *Não*'
    )
  })
})

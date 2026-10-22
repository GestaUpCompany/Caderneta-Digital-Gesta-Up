import { describe, expect, it } from 'vitest'
import { formatarRegistroComoTexto, urlWhatsAppExcedeLimite } from './shareUtils'

const registro = (i: number) =>
  ({
    id: `r${i}`,
    data: '21/10/2026 08:29',
    tratador: 'Jefferson',
    pasto: `Pasto ${i}`,
    numeroLote: `LOTE ${i}`,
    nCabecasLote: 114,
    qtdBezerrosLote: 0,
    pesoVivoKgLote: 442.9,
    formulacao: 'E/A Engorda TIP 1,8%',
    categorias: ['Vaca'],
    leituraCocho: '3',
    kgCocho: 1170,
    suplementarAdulto: true,
  }) as any

describe('limite do link wa.me', () => {
  it('resumo de 10 registros excede o limite e um registro avulso não', () => {
    const textos = Array.from({ length: 10 }, (_, i) => formatarRegistroComoTexto(registro(i + 1), 'suplementacao', []))
    const url = (t: string) => `https://wa.me/?text=${encodeURIComponent(t)}`
    expect(urlWhatsAppExcedeLimite(url(textos[0]))).toBe(false)
    expect(urlWhatsAppExcedeLimite(url(textos.join('\n')))).toBe(true)
  })

  it('o texto de cada registro mantém o total no cocho', () => {
    const t = formatarRegistroComoTexto(registro(10), 'suplementacao', [])
    expect(t).toContain('SUPLEMENTO COCHO (KG): *1170*')
  })
})

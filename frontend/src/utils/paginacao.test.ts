import { describe, expect, it } from 'vitest'
import { buscarTodasAsPaginas } from './paginacao'

const fonte = (total: number) => async (inicio: number, fim: number) =>
  Array.from({ length: Math.max(0, Math.min(fim + 1, total) - inicio) }, (_, i) => inicio + i)

describe('buscarTodasAsPaginas', () => {
  it('junta as páginas até vir uma incompleta', async () => {
    const r = await buscarTodasAsPaginas(fonte(2350), 1000)
    expect(r).toHaveLength(2350)
    expect(r[0]).toBe(0)
    expect(r[2349]).toBe(2349)
  })

  it('total exato de uma página pede mais uma e termina vazia', async () => {
    let chamadas = 0
    const base = fonte(1000)
    const r = await buscarTodasAsPaginas(async (a, b) => {
      chamadas += 1
      return base(a, b)
    }, 1000)
    expect(r).toHaveLength(1000)
    expect(chamadas).toBe(2)
  })

  it('lista vazia termina na primeira chamada', async () => {
    expect(await buscarTodasAsPaginas(fonte(0), 1000)).toEqual([])
  })

  it('respeita o limite máximo se o servidor ignorar o intervalo', async () => {
    const r = await buscarTodasAsPaginas(async () => [1, 2, 3], 3, 9)
    expect(r).toHaveLength(9)
  })
})

import { describe, expect, it } from 'vitest'
import { uuidDeterministico } from './idDeterministico'

describe('uuidDeterministico', () => {
  it('gera UUID v5 válido', async () => {
    expect(await uuidDeterministico('limpeza-bebedouro:abc')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    )
  })

  it('o mesmo texto gera sempre o mesmo UUID e textos diferentes geram UUIDs diferentes', async () => {
    const a = await uuidDeterministico('limpeza-bebedouro:abc')
    expect(await uuidDeterministico('limpeza-bebedouro:abc')).toBe(a)
    expect(await uuidDeterministico('limpeza-bebedouro:abd')).not.toBe(a)
  })
})

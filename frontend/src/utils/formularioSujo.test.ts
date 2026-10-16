import { describe, it, expect } from 'vitest'
import { ehRotaFormulario } from './formularioSujo'

describe('ehRotaFormulario', () => {
  it('reconhece formulários e ignora listas e outras rotas', () => {
    expect(ehRotaFormulario('/caderneta/leitura-cocho')).toBe(true)
    expect(ehRotaFormulario('/caderneta/leitura-cocho/')).toBe(true)
    expect(ehRotaFormulario('/caderneta/leitura-cocho/lista')).toBe(false)
    expect(ehRotaFormulario('/')).toBe(false)
  })
})

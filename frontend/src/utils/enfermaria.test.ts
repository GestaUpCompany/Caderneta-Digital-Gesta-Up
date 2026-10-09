import { describe, expect, it } from 'vitest'
import { validateEnfermaria } from './validation'
import { formatarRegistroComoTexto, rotuloDiagnosticoEnfermaria } from './shareUtils'

const base = (): Record<string, unknown> => ({
  data: '09/10/2026',
  pasto: 'P10',
  lote: 'Teste 2',
  idManejo: 'MAE-N1',
  brinco: '',
  chip: '',
  diagnosticos: ['Pneumonia'],
  tipoRegistro: 'Curativo',
  medicamentos: [{ tipo: 'Antibiotico', nomeComercial: 'Draxxin', doseAplicada: '5 ml' }],
})
const campos = (extra: Record<string, unknown> = {}) => validateEnfermaria({ ...base(), ...extra }).errors.map((e) => e.field)

describe('validateEnfermaria', () => {
  it('aceita o registro completo', () => {
    expect(validateEnfermaria(base()).isValid).toBe(true)
  })

  it.each(['', '   ', undefined, null])('data/pasto/lote vazios (%j) bloqueiam só o campo', (vazio) => {
    expect(campos({ data: vazio })).toEqual(['data'])
    expect(campos({ pasto: vazio })).toEqual(['pasto'])
    expect(campos({ lote: vazio })).toEqual(['lote'])
  })

  it('exige manejo, brinco ou chip; qualquer um basta', () => {
    expect(campos({ idManejo: '' })).toEqual(['idManejo'])
    expect(campos({ idManejo: '', brinco: 'BR-1' })).toEqual([])
    expect(campos({ idManejo: '', chip: '982' })).toEqual([])
  })

  it('exige pelo menos um diagnóstico', () => {
    expect(campos({ diagnosticos: [] })).toEqual(['diagnosticos'])
    expect(campos({ diagnosticos: undefined })).toEqual(['diagnosticos'])
    expect(campos({ diagnosticos: ['Febre', 'Diarreia'] })).toEqual([])
  })

  it('datas impossíveis ou em formato errado', () => {
    for (const data of ['31/02/2026', '2026-10-09', 'abc']) expect(campos({ data })).toContain('data')
  })
})

describe('texto do compartilhar da Enfermaria', () => {
  const texto = (extra: Record<string, unknown> = {}) =>
    formatarRegistroComoTexto({ id: 'e1', ...base(), data: '09/10/2026 15:00', brinco: 'MAE-BR-N1', sexo: 'Fêmea', raca: 'Nelore', ...extra } as any, 'enfermaria')

  it('mostra os diagnósticos marcados com o nome da tela', () => {
    const t = texto({ diagnosticos: ['Pneumonia', 'Tremores Musculares', 'Cobra'] })
    expect(t).toContain('DIAGNÓSTICOS')
    expect(t).toContain('⚠️ PNEUMONIA')
    expect(t).toContain('⚠️ TREMENDO')
    expect(t).toContain('⚠️ PICADA DE COBRA')
  })

  it('nome de diagnóstico desconhecido sai em maiúsculas em vez de sumir', () => {
    expect(texto({ diagnosticos: ['Coisa Nova'] })).toContain('⚠️ COISA NOVA')
  })

  it('mostra o ID manejo, o tipo e os medicamentos', () => {
    const t = texto()
    expect(t).toContain('ID. MANEJO: *MAE-N1*')
    expect(t).toContain('TIPO: *Curativo*')
    expect(t).toContain('Draxxin')
    expect(t).toContain('Dose aplicada: 5 ml')
  })

  it('sem diagnósticos não imprime a seção', () => {
    expect(texto({ diagnosticos: [] })).not.toContain('DIAGNÓSTICOS')
  })
})

describe('rótulo de diagnóstico da Enfermaria', () => {
  it('traduz o nome gravado para o texto da tela e mantém o desconhecido', () => {
    expect(rotuloDiagnosticoEnfermaria('Incoordenação Motora')).toBe('ANDANDO TORTO')
    expect(rotuloDiagnosticoEnfermaria('Inchaço')).toBe('INCHAÇO')
    expect(rotuloDiagnosticoEnfermaria('Novo Mal')).toBe('NOVO MAL')
  })
})

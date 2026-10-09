import { describe, expect, it } from 'vitest'
import { validateMaternidade } from './validation'
import { translateSyncError } from './syncErrorMessages'
import type { SyncError } from '../types/cadernetas'

const base = () => ({
  data: '09/10/2026',
  idProvisorioCria: 'BAT-M1',
  idBrincoCria: '',
  idChipCria: '',
  tratamento: 'Colostro',
  sexo: 'Macho',
  raca: 'Nelore',
  tipoParto: ['Normal'],
  idManejoMae: 'MAE-N1',
  idBrincoMae: 'MAE-BR-N1',
  idChipMae: '',
  categoriaMae: 'Primípara',
})
const campos = (extra: Record<string, unknown> = {}) => validateMaternidade({ ...base(), ...extra }).errors.map((e) => e.field)

describe('validateMaternidade', () => {
  it('aceita o registro completo', () => {
    expect(validateMaternidade(base()).isValid).toBe(true)
  })

  it('barra brinco da cria igual ao da mãe (índice único do servidor)', () => {
    expect(campos({ idBrincoCria: 'MAE-BR-N1' })).toContain('idBrincoCria')
    expect(campos({ idBrincoCria: ' mae-br-n1 ' })).toContain('idBrincoCria')
  })

  it('barra chip da cria igual ao da mãe e brinco igual ao da mãe adotiva', () => {
    expect(campos({ idChipCria: '9', idChipMae: '9' })).toContain('idChipCria')
    expect(campos({ idBrincoCria: '7', idBrincoMaeAdotiva: '7' })).toContain('idBrincoCria')
  })

  it('brincos diferentes e cria sem brinco passam', () => {
    expect(campos({ idBrincoCria: 'CRIA-1' })).toEqual([])
  })

  it('cria morta (aborto/natimorto) não passa pela checagem de identificação', () => {
    expect(campos({ tipoParto: ['Normal', 'Natimorto'], idBrincoCria: 'MAE-BR-N1', idProvisorioCria: '', sexo: '', raca: '', tratamento: '' })).toEqual([])
  })

  it('exige mãe, categoria da mãe e tipo de parto', () => {
    expect(campos({ idManejoMae: '', idBrincoMae: '' })).toContain('idManejoMae')
    expect(campos({ categoriaMae: '' })).toContain('categoriaMae')
    expect(campos({ tipoParto: [] })).toContain('tipoParto')
  })
})

describe('mensagem do erro de sync por brinco duplicado', () => {
  const erro = (extra: Partial<SyncError>): SyncError =>
    ({ code: '23505', message: '', details: '', operation: 'create', retryCount: 1, failedAt: '2026-10-09T00:00:00Z', ...extra }) as SyncError

  it('explica brinco, chip e manejo repetidos', () => {
    expect(translateSyncError(erro({ message: 'duplicate key value violates unique constraint "idx_individuos_fazenda_brinco_unico"' }))).toMatch(/mesmo brinco|este brinco/)
    expect(translateSyncError(erro({ message: 'duplicate key ... "idx_individuos_fazenda_chip_unico"' }))).toMatch(/este chip/)
    expect(translateSyncError(erro({ message: 'duplicate key ... "idx_individuos_fazenda_manejo_unico"' }))).toMatch(/manejo/)
  })
})

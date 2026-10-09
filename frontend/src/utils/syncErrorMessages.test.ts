import { describe, expect, it } from 'vitest'
import { translateSyncError } from './syncErrorMessages'
import type { SyncError } from '../types/cadernetas'

const erro = (parcial: Partial<SyncError>): SyncError => ({
  code: 'unknown',
  message: '',
  retryCount: 1,
  failedAt: '2026-10-08T20:00:00.000Z',
  operation: 'create',
  ...parcial,
})

describe('translateSyncError', () => {
  it('traduz falha de rede gravada antes como "unknown"', () => {
    expect(translateSyncError(erro({ message: 'TypeError: Failed to fetch' }))).toMatch(/Sem conexão/)
  })

  it('traduz o código network', () => {
    expect(translateSyncError(erro({ code: 'network', message: 'x' }))).toMatch(/Sem conexão/)
  })

  it('traduz gateway indisponível que chegou sem código', () => {
    expect(translateSyncError(erro({ message: '<html><title>502 Bad Gateway</title></html>' }))).toMatch(/Servidor indisponível/)
    expect(translateSyncError(erro({ code: '503', message: 'x' }))).toMatch(/Servidor indisponível/)
  })

  it('mantém a mensagem genérica para erro desconhecido que não é de rede', () => {
    expect(translateSyncError(erro({ message: 'Cannot read properties of undefined' }))).toMatch(/Erro desconhecido/)
  })

  it('mantém as traduções do servidor', () => {
    expect(translateSyncError(erro({ code: '42501' }))).toMatch(/Sem permissão/)
  })
})

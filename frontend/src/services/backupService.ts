import { Registro } from '../types/cadernetas'
import { CadernetaStore, getAllRegistros } from './indexedDB'

const BACKUP_KEY_PREFIX = 'cadernetas_backup_'
const LAST_BACKUP_KEY = 'cadernetas_last_backup'
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 horas

interface BackupData {
  timestamp: string
  versao: string
  registros: Record<CadernetaStore, Registro[]>
}

export async function realizarBackup(): Promise<boolean> {
  try {
    const cadernetas: CadernetaStore[] = [
      'maternidade',
      'pastagens',
      'rodeio',
      'suplementacao',
      'bebedouros',
      'movimentacao',
    ]

    const registros: Record<string, Registro[]> = {}

    for (const caderneta of cadernetas) {
      registros[caderneta] = await getAllRegistros(caderneta)
    }

    const backup: BackupData = {
      timestamp: new Date().toISOString(),
      versao: '1.0.0',
      registros: registros as Record<CadernetaStore, Registro[]>,
    }

    localStorage.setItem(BACKUP_KEY_PREFIX + backup.timestamp, JSON.stringify(backup))
    localStorage.setItem(LAST_BACKUP_KEY, backup.timestamp)

    // Limpa backups antigos (mantém últimos 5)
    limparBackupsAntigos()

    console.log('[Backup] Realizado em', backup.timestamp)
    return true
  } catch (error) {
    console.error('[Backup] Erro:', error)
    return false
  }
}

export function limparBackupsAntigos(): void {
  const backups: string[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(BACKUP_KEY_PREFIX)) {
      backups.push(key)
    }
  }

  backups.sort()

  // Remove backups mais antigos, mantendo os 5 mais recentes
  if (backups.length > 5) {
    const toRemove = backups.slice(0, backups.length - 5)
    toRemove.forEach((key) => localStorage.removeItem(key))
  }
}

export function getBackupsDisponiveis(): { data: string; timestamp: string; tamanho: string }[] {
  const backups: { data: string; timestamp: string; tamanho: string }[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(BACKUP_KEY_PREFIX)) {
      const item = localStorage.getItem(key)
      if (item) {
        const data = JSON.parse(item) as BackupData
        const dataHora = new Date(data.timestamp).toLocaleString('pt-BR')
        const tamanhoKB = (item.length / 1024).toFixed(1)

        backups.push({
          data: dataHora,
          timestamp: data.timestamp,
          tamanho: `${tamanhoKB} KB`,
        })
      }
    }
  }

  return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

export function restaurarBackup(timestamp: string): BackupData | null {
  try {
    const key = BACKUP_KEY_PREFIX + timestamp
    const item = localStorage.getItem(key)

    if (!item) {
      console.error('[Backup] Não encontrado:', timestamp)
      return null
    }

    return JSON.parse(item) as BackupData
  } catch (error) {
    console.error('[Backup] Erro ao restaurar:', error)
    return null
  }
}

export function downloadBackup(timestamp: string): void {
  const key = BACKUP_KEY_PREFIX + timestamp
  const item = localStorage.getItem(key)

  if (!item) {
    alert('Backup não encontrado')
    return
  }

  const blob = new Blob([item], { type: 'application/json' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `cadernetas_backup_${timestamp.slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function verificarBackupAutomatico(): void {
  const lastBackup = localStorage.getItem(LAST_BACKUP_KEY)

  if (!lastBackup) {
    realizarBackup()
    return
  }

  const lastTime = new Date(lastBackup).getTime()
  const now = Date.now()

  if (now - lastTime > BACKUP_INTERVAL_MS) {
    realizarBackup()
  }
}

export function excluirBackup(timestamp: string): boolean {
  try {
    const key = BACKUP_KEY_PREFIX + timestamp
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

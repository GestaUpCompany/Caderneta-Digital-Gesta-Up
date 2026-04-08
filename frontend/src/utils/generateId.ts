import { v4 as uuidv4 } from 'uuid'

export function generateId(): string {
  const uuid = uuidv4().replace(/-/g, '').substring(0, 8)
  const timestamp = Date.now()
  return `${uuid}-${timestamp}`
}

export function generateVersion(): number {
  return 1
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

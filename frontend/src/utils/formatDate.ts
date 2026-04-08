export function todayBR(): string {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()
  return `${day}/${month}/${year}`
}

export function isoToBR(iso: string): string {
  if (!iso) return ''
  const date = new Date(iso)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

export function brToIso(br: string): string {
  if (!br) return ''
  const [day, month, year] = br.split('/')
  return `${year}-${month}-${day}`
}

export function todayBR(): string {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()
  return `${day}/${month}/${year}`
}

export function isoToBR(iso: string): string {
  if (!iso) return ''
  const [year, month, day] = iso.split('-')
  if (!year || !month || !day) return ''
  return `${day}/${month}/${year}`
}

export function brToIso(br: string): string {
  if (!br) return ''
  const [day, month, year] = br.split('/')
  return `${year}-${month}-${day}`
}

export function brWithTimeToIso(br: string): string {
  if (!br) return ''
  // Formato esperado: "14/05/2026 09:47" (local time)
  const [datePart, timePart] = br.split(' ')
  const [day, month, year] = datePart.split('/')
  const [hours, minutes] = (timePart || '00:00').split(':')

  // Create Date from local components (browser timezone)
  const localDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes)
  )

  // Convert to ISO 8601 (UTC) for proper storage
  return localDate.toISOString()
}

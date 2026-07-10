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

export const DEFAULT_FARM_TIMEZONE = 'America/Cuiaba'

export function getDateTimePartsInTimezone(
  date: Date,
  timezone: string = DEFAULT_FARM_TIMEZONE
): { year: string; month: string; day: string; hours: string; minutes: string; seconds: string } {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00'
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hours: get('hour'),
    minutes: get('minute'),
    seconds: get('second'),
  }
}

export function getCurrentTimeInTimezone(
  timezone: string = DEFAULT_FARM_TIMEZONE
): string {
  const { hours, minutes, seconds } = getDateTimePartsInTimezone(new Date(), timezone)
  return `${hours}:${minutes}:${seconds}`
}

export function getCurrentDateTimeInTimezone(
  timezone: string = DEFAULT_FARM_TIMEZONE
): string {
  const { year, month, day, hours, minutes, seconds } = getDateTimePartsInTimezone(
    new Date(),
    timezone
  )
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`
}

export function getTimezoneOffsetIso(
  date: Date,
  timezone: string = DEFAULT_FARM_TIMEZONE
): string {
  // Format timezone offset using Intl, e.g. "GMT-04:00" -> "-04:00"
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'longOffset',
  }).formatToParts(date)
  const offsetName = parts.find((p) => p.type === 'timeZoneName')?.value || 'GMT+00:00'
  return offsetName.replace('GMT', '')
}

export function brWithTimeToIso(
  br: string,
  timezone: string = DEFAULT_FARM_TIMEZONE
): string {
  if (!br) return ''
  // Formato esperado: "14/05/2026 09:47" (farm timezone)
  const [datePart, timePart] = br.split(' ')
  const [day, month, year] = datePart.split('/')
  const [hours, minutes] = (timePart || '00:00').split(':')

  const localIso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours
    .padStart(2, '0')}:${minutes.padStart(2, '0')}:00`

  const date = new Date(`${localIso}Z`)
  if (isNaN(date.getTime())) return ''

  const offset = getTimezoneOffsetIso(date, timezone)
  return `${localIso}${offset}`
}


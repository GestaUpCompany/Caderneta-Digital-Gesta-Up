export const DEFAULT_FARM_TIMEZONE = 'America/Cuiaba'

export function todayBR(timezone: string = DEFAULT_FARM_TIMEZONE): string {
  const { day, month, year } = getDateTimePartsInTimezone(new Date(), timezone)
  return `${day}/${month}/${year}`
}

/**
 * Converte datas do banco (ISO ou yyyy-mm) para formato brasileiro.
 * - "2026-08-17" ou "2026-08-17 07:30:00+00" -> "17/08/2026"
 * - "2026-08" -> "08/2026"
 * - null/vazio -> "—"
 */
export function formatarDataBR(data: string | null | undefined): string {
  if (!data) return '—'
  const clean = data.split(' ')[0].split('T')[0]
  const parts = clean.split('-')
  if (parts.length === 3) {
    const [year, month, day] = parts
    if (year && month && day) return `${day}/${month}/${year}`
  }
  if (parts.length === 2) {
    const [year, month] = parts
    if (year && month) return `${month}/${year}`
  }
  return data
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
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

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

/**
 * Indica se uma data BR ("dd/mm/aaaa", com ou sem " HH:mm") é posterior a hoje no fuso da fazenda.
 * Não usa o relógio do aparelho: à noite o dia da fazenda pode diferir do dia do dispositivo.
 */
export function isFutureBR(
  dataBR: string,
  timezone: string = DEFAULT_FARM_TIMEZONE
): boolean {
  const chave = (br: string) => {
    const [dia, mes, ano] = br.split(' ')[0].split('/')
    return `${ano}${(mes || '').padStart(2, '0')}${(dia || '').padStart(2, '0')}`
  }
  return chave(dataBR) > chave(todayBR(timezone))
}

/**
 * Dia ("yyyy-mm-dd") da fazenda em que ocorreu um timestamp vindo do banco.
 * O Supabase devolve `timestamptz` em UTC ("2026-10-09T01:00:00+00:00"); fatiar os 10 primeiros
 * caracteres daria o dia UTC e jogaria lançamentos noturnos (hora local) no dia seguinte.
 * Datas já sem hora ("yyyy-mm-dd") e BR ("dd/mm/aaaa ...") passam direto.
 */
export function toFarmDateISO(
  valor: string | null | undefined,
  timezone: string = DEFAULT_FARM_TIMEZONE
): string {
  if (!valor) return ''
  const texto = String(valor).trim()
  if (/^\d{2}\/\d{2}\/\d{4}/.test(texto)) return brToIso(texto.split(' ')[0])
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto
  // Formato Postgres "2026-08-06 18:24:00+00" -> ISO 8601
  const iso = texto.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00')
  const instante = new Date(iso)
  if (isNaN(instante.getTime())) return texto.slice(0, 10)
  const { year, month, day } = getDateTimePartsInTimezone(instante, timezone)
  return `${year}-${month}-${day}`
}

/** Soma dias a uma data ISO "yyyy-mm-dd" por aritmética de calendário (sem fuso). */
export function addDaysISO(dataISO: string, dias: number): string {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  const d = new Date(Date.UTC(ano, mes - 1, dia + dias))
  return d.toISOString().slice(0, 10)
}

/**
 * Limites [inicio, fim) de um dia da fazenda como timestamptz com offset do fuso.
 * Evita comparar a coluna `data` (timestamptz) com "yyyy-mm-dd" nu, que o banco lê como
 * meia-noite UTC e faz lançamentos feitos à noite (hora local) caírem no dia seguinte.
 */
export function getDayRangeIso(
  dataISO: string,
  timezone: string = DEFAULT_FARM_TIMEZONE
): { inicio: string; fim: string } {
  const proximoDia = addDaysISO(dataISO, 1)
  const offsetInicio = getTimezoneOffsetIso(new Date(`${dataISO}T00:00:00Z`), timezone)
  const offsetFim = getTimezoneOffsetIso(new Date(`${proximoDia}T00:00:00Z`), timezone)
  return {
    inicio: `${dataISO}T00:00:00${offsetInicio}`,
    fim: `${proximoDia}T00:00:00${offsetFim}`,
  }
}

export function brWithTimeToIso(
  br: string,
  timezone: string = DEFAULT_FARM_TIMEZONE
): string | null {
  if (!br) return null
  // Formato esperado: "14/05/2026 09:47" (farm timezone)
  const [datePart, timePart] = br.split(' ')
  const [day, month, year] = datePart.split('/')
  const [hours, minutes] = (timePart || '00:00').split(':')

  const localIso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours
    .padStart(2, '0')}:${minutes.padStart(2, '0')}:00`

  const date = new Date(`${localIso}Z`)
  if (isNaN(date.getTime())) return null

  const offset = getTimezoneOffsetIso(date, timezone)
  return `${localIso}${offset}`
}


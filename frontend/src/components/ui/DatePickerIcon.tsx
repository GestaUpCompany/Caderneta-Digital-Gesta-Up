import { useEffect, useState } from 'react'

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro'
]

const WEEK_DAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

interface DatePickerIconProps {
  value?: string
  onChange: (value: string) => void
  label: string
}

const formatToBR = (date: Date) =>
  date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

export default function DatePickerIcon({ value, onChange, label }: DatePickerIconProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    if (value) {
      const [day, month, year] = value.split('/').map(Number)
      const parsedDate = new Date(year, (month || 1) - 1, day || 1)

      if (!isNaN(parsedDate.getTime())) {
        setSelectedDate(parsedDate)
        setCurrentMonth(new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1))
        return
      }
    }

    const today = new Date()
    setSelectedDate(today)
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
  }, [value])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfWeek = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const firstDayOfWeek = getFirstDayOfWeek(currentMonth)
    const days: Array<Date | null> = []

    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day))
    }

    while (days.length < 42) {
      days.push(null)
    }

    return days
  }

  const handleDateSelection = (date: Date) => {
    setSelectedDate(date)
    const formatted = formatToBR(date)
    onChange(formatted)
    setIsOpen(false)
  }

  const handleToday = () => {
    const today = new Date()
    handleDateSelection(today)
  }

  const changeMonth = (increment: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + increment, 1))
  }

  const calendarDays = generateCalendarDays()
  const today = new Date()

  return (
    <div className="flex flex-col gap-2">
      <label className="block text-xs font-bold text-gray-500 uppercase">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="h-14 w-full rounded-xl border-2 border-gray-300 bg-white px-3 py-2 text-center transition-colors hover:border-gray-400 active:scale-95"
      >
        <svg
          className="h-5 w-5 mx-auto text-gray-700"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="4" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        {value && (
          <span className="mt-1 block text-xs font-semibold text-gray-900">
            {value}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 py-6 sm:items-center"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  aria-label="Mês anterior"
                  onClick={() => changeMonth(-1)}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 text-gray-700 transition-colors hover:border-gray-900"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                </button>
                <div className="text-center">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.5em] text-gray-400">
                    Escolha a data
                  </p>
                  <p className="mt-2 text-2xl font-black text-gray-900">
                    {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Próximo mês"
                  onClick={() => changeMonth(1)}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 text-gray-700 transition-colors hover:border-gray-900"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 pb-6 pt-4">
              <div className="grid grid-cols-7 gap-2 text-center text-[0.6rem] font-black uppercase tracking-[0.25em] text-gray-400">
                {WEEK_DAYS.map(day => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-7 gap-2">
                {calendarDays.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="min-h-[48px]" aria-hidden="true" />
                  }

                  const selected = selectedDate && isSameDay(day, selectedDate)
                  const isCurrentDay = isSameDay(day, today)

                  const baseClasses = 'min-h-[48px] rounded-2xl text-sm font-semibold flex flex-col items-center justify-center transition-all duration-150'
                  const stateClasses = selected
                    ? 'bg-gray-900 text-white shadow-xl shadow-gray-900/20 scale-[1.02]'
                    : 'bg-slate-50 text-gray-900 hover:bg-slate-100 active:scale-95'
                  const todayClasses = !selected && isCurrentDay ? 'ring-2 ring-yellow-300' : ''

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => handleDateSelection(day)}
                      className={`${baseClasses} ${stateClasses} ${todayClasses}`}
                    >
                      <span>{day.getDate()}</span>
                      {isCurrentDay && !selected && (
                        <span className="mt-0.5 text-[0.5rem] font-black uppercase tracking-[0.3em] text-yellow-500">
                          Hoje
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  onClick={handleToday}
                  className="flex-1 rounded-2xl border border-gray-900 py-3 text-sm font-black uppercase tracking-[0.3em] text-gray-900"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 rounded-2xl bg-gray-900 py-3 text-sm font-black uppercase tracking-[0.3em] text-white"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

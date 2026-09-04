import { InputHTMLAttributes, ReactNode, useCallback } from 'react'

interface TimeInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string | ReactNode
  error?: string
  helper?: string
  fullWidth?: boolean
  textSize?: 'sm' | 'base' | 'lg' | 'xl'
  value: string
  onChange: (value: string) => void
}

/**
 * Input de horario que usa type="text" + inputMode="numeric" para evitar
 * o seletor nativo (wheel picker) em Android/iOS. O usuario digita direto:
 * "1430" vira "14:30", "9" vira "09:", etc.
 */
export default function TimeInput({
  label,
  error,
  helper,
  fullWidth = true,
  textSize,
  className = '',
  id,
  value,
  onChange,
  ...props
}: TimeInputProps) {
  const textSizeStyles = textSize === 'sm' ? 'text-sm' : textSize === 'base' ? 'text-base' : textSize === 'lg' ? 'text-lg' : 'text-lg sm:text-xl'
  const baseStyles = `min-h-[60px] ${textSizeStyles} px-3 sm:px-4 py-3 bg-white border border-gray-300 rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1a3a2a]/10 focus:border-[#1a3a2a] transition-all w-full`
  const stateStyles = error
    ? 'border-red-500 focus:border-red-700'
    : 'border-gray-400 focus:border-black'
  const widthStyles = fullWidth ? 'w-full' : ''

  const formatTime = useCallback((raw: string): string => {
    // Remove tudo que nao for digito
    const digits = raw.replace(/\D/g, '').slice(0, 4)
    if (digits.length === 0) return ''
    if (digits.length <= 2) return digits
    return `${digits.slice(0, 2)}:${digits.slice(2)}`
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatTime(e.target.value)
    onChange(formatted)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Completa com zero a esquerda se necessario: "9:30" -> "09:30", "14:3" -> "14:30"
    let v = e.target.value.trim()
    if (!v) return
    if (v.length === 3 && v.includes(':')) {
      // "9:3" -> "09:30"
      v = '0' + v
    }
    if (v.length === 4 && !v.includes(':')) {
      // "1430" -> "14:30"
      v = `${v.slice(0, 2)}:${v.slice(2)}`
    }
    const [h, m] = v.split(':')
    const hh = (h || '').padStart(2, '0')
    const mm = (m || '').padStart(2, '0')
    const hhNum = parseInt(hh, 10)
    const mmNum = parseInt(mm, 10)
    if (isNaN(hhNum) || hhNum > 23 || isNaN(mmNum) || mmNum > 59) return
    onChange(`${hh}:${mm}`)
  }

  return (
    <div className={`${widthStyles} ${className}`}>
      {label && (
        <label className="block text-lg font-bold text-gray-900 mb-2">
          {label}
        </label>
      )}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9:]*"
        placeholder="HH:MM"
        maxLength={5}
        className={`${baseStyles} ${stateStyles}`}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
      {error ? (
        <p className="mt-2 text-base font-semibold text-red-700 flex items-center gap-2">
          <span>⚠️</span> {error}
        </p>
      ) : helper ? (
        <p className="mt-2 text-base text-gray-500">{helper}</p>
      ) : null}
    </div>
  )
}

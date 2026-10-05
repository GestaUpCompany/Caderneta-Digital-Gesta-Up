import { Minus, Plus } from 'lucide-react'

interface StepperInputProps {
  value: string
  onChange: (value: string) => void
  step?: number
  min?: number
  max?: number
  /** Sufixo exibido ao lado do numero, ex: "mm", "kg", "°C" */
  suffix?: string
  placeholder?: string
  /** Permite decimais na digitacao manual */
  allowDecimals?: boolean
  error?: string
}

/**
 * Stepper no padrao de referencia: botao menos delineado,
 * numero grande central editavel, botao mais verde-escuro.
 */
export default function StepperInput({
  value,
  onChange,
  step = 1,
  min,
  max,
  suffix,
  placeholder = '0',
  allowDecimals = true,
  error,
}: StepperInputProps) {
  const num = value === '' ? NaN : Number(value)

  const clamp = (n: number) => {
    if (!isNaN(min ?? NaN)) n = Math.max(min!, n)
    if (!isNaN(max ?? NaN)) n = Math.min(max!, n)
    return n
  }

  const bump = (delta: number) => {
    const base = isNaN(num) ? (min ?? 0) : num
    const next = clamp(base + delta)
    onChange(allowDecimals ? String(Math.round(next * 10) / 10) : String(Math.round(next)))
  }

  const handleType = (raw: string) => {
    const cleaned = allowDecimals ? raw.replace(/[^0-9.,-]/g, '') : raw.replace(/[^0-9-]/g, '')
    onChange(cleaned)
  }

  return (
    <div>
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          onClick={() => bump(-step)}
          className="w-14 min-w-[56px] rounded-xl border-2 border-gray-300 bg-white text-gray-700 flex items-center justify-center transition-colors hover:border-gray-400 active:scale-95"
          aria-label="Diminuir"
        >
          <Minus className="h-5 w-5" strokeWidth={2.5} />
        </button>
        <div className="flex-1 flex items-center justify-center gap-1 rounded-xl border-2 border-gray-300 bg-white px-3">
          <input
            type="text"
            inputMode={allowDecimals ? 'decimal' : 'numeric'}
            value={value}
            onChange={(e) => handleType(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-transparent text-center text-3xl font-extrabold text-gray-900 focus:outline-none min-h-[56px] !min-h-0"
          />
          {suffix && <span className="text-sm font-semibold text-gray-500">{suffix}</span>}
        </div>
        <button
          type="button"
          onClick={() => bump(step)}
          className="w-14 min-w-[56px] rounded-xl bg-brand-900 text-white flex items-center justify-center transition-colors active:scale-95"
          aria-label="Aumentar"
        >
          <Plus className="h-6 w-6" strokeWidth={2.5} />
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  )
}

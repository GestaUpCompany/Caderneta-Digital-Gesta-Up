import { InputHTMLAttributes } from 'react'

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string
  error?: string
}

export default function Checkbox({ label, error, className = '', ...props }: CheckboxProps) {
  return (
    <label className={`flex items-start gap-4 cursor-pointer ${className}`}>
      <div className="relative flex-shrink-0">
        <input
          type="checkbox"
          className="peer sr-only"
          {...props}
        />
        <div className={`
          w-10 h-10 min-w-[40px] min-h-[40px] 
          border-2 rounded-lg bg-white 
          peer-checked:bg-black peer-checked:border-black
          peer-focus:ring-4 peer-focus:ring-yellow-400
          transition-all flex items-center justify-center
          ${error ? 'border-red-500' : 'border-gray-400'}
        `}>
          <svg 
            className="w-6 h-6 text-white opacity-0 peer-checked:opacity-100 transition-opacity" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <div className="flex-1 pt-1">
        <span className="text-lg font-semibold text-gray-900 leading-tight">{label}</span>
        {error && (
          <p className="mt-1 text-base font-semibold text-red-700 flex items-center gap-1">
            <span>⚠️</span> {error}
          </p>
        )}
      </div>
    </label>
  )
}

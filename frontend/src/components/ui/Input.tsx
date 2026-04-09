import { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helper?: string
  icon?: ReactNode
  fullWidth?: boolean
}

export default function Input({
  label,
  error,
  helper,
  icon,
  fullWidth = true,
  className = '',
  ...props
}: InputProps) {
  const baseStyles = 'min-h-[60px] text-lg sm:text-xl px-3 sm:px-4 py-3 bg-white border-2 rounded-xl focus:outline-none transition-colors w-full'
  const stateStyles = error
    ? 'border-red-500 focus:border-red-700'
    : 'border-gray-400 focus:border-black'
  const widthStyles = fullWidth ? 'w-full' : ''

  return (
    <div className={`${widthStyles} ${className}`}>
      {label && (
        <label className="block text-lg font-bold text-gray-900 mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-gray-500 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          className={`${baseStyles} ${stateStyles} ${icon ? 'pl-12 sm:pl-14' : ''}`}
          {...props}
        />
      </div>
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

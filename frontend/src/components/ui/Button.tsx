import { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg' | 'touch'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  icon?: ReactNode
  loading?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-black text-white border-black active:bg-gray-800',
  secondary: 'bg-white text-black border-2 border-black active:bg-gray-100',
  danger: 'bg-red-700 text-white border-red-700 active:bg-red-800',
  success: 'bg-green-800 text-white border-green-800 active:bg-green-900',
  ghost: 'bg-transparent text-black border-2 border-gray-300 active:bg-gray-100',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-[48px] text-base px-4 py-2',
  md: 'min-h-[60px] text-lg px-5 py-3',
  lg: 'min-h-[72px] text-xl px-6 py-4',
  touch: 'min-h-[80px] text-xl px-6 py-4',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'touch',
  fullWidth = true,
  icon,
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'font-bold rounded-xl transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-3'
  const widthStyles = fullWidth ? 'w-full' : ''

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="animate-spin text-2xl">⏳</span>
      ) : icon ? (
        <span className="text-2xl">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  )
}

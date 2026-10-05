import { ReactNode } from 'react'

interface InfoStripProps {
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
  icon?: ReactNode
  children: ReactNode
  className?: string
}

const TONE_CLASSES: Record<NonNullable<InfoStripProps['tone']>, string> = {
  neutral: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-900',
  danger: 'bg-red-100 text-red-800',
}

/**
 * Faixa de feedback calculado dentro dos cards: confirmacoes (verde),
 * alertas (ambar), metadados automaticos (cinza).
 */
export default function InfoStrip({
  tone = 'neutral',
  icon,
  children,
  className = '',
}: InfoStripProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold ${TONE_CLASSES[tone]} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="leading-snug">{children}</span>
    </div>
  )
}

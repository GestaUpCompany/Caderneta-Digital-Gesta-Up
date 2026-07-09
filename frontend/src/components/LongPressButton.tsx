import { useRef, useCallback, ReactNode } from 'react'

interface LongPressButtonProps {
  children: ReactNode
  onLongPress: () => void
  onClick?: () => void
  longPressDuration?: number
  className?: string
  ariaLabel?: string
}

export default function LongPressButton({
  children,
  onLongPress,
  onClick,
  longPressDuration = 800,
  className = '',
  ariaLabel,
}: LongPressButtonProps) {
  const timerRef = useRef<number | null>(null)
  const isLongPress = useRef(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startPress = useCallback(() => {
    isLongPress.current = false
    timerRef.current = window.setTimeout(() => {
      isLongPress.current = true
      onLongPress()
    }, longPressDuration)
  }, [onLongPress, longPressDuration])

  const endPress = useCallback(() => {
    clearTimer()
  }, [clearTimer])

  const handleClick = useCallback(() => {
    if (!isLongPress.current && onClick) {
      onClick()
    }
  }, [onClick])

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={className}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onClick={handleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  )
}

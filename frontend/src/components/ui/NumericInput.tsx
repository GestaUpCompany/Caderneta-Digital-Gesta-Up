import { InputHTMLAttributes, ReactNode, useEffect, useRef, useState } from 'react'
import Input from './Input'
import { normalizarNumero } from '../../utils/formatNumber'

interface NumericInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'inputMode'> {
  label?: string | ReactNode
  error?: string
  helper?: string
  /** Valor canônico: ponto decimal, sem milhar ("9540.5"). Vazio = '' */
  value: string | number | null | undefined
  /** Emite o valor canônico ("9540", "9.54"), pronto para salvar */
  onChange: (canonical: string) => void
  decimalPlaces?: number
}

function groupMilhar(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

// "9540.54" -> "9.540,54"; "9540" -> "9.540"
function toDisplay(canonical: string): string {
  if (!canonical) return ''
  const dot = canonical.indexOf('.')
  if (dot === -1) return groupMilhar(canonical)
  return `${groupMilhar(canonical.slice(0, dot))},${canonical.slice(dot + 1)}`
}

// "9.540" -> "9.54"; "9." -> "9"; "9540" -> "9540"
// Zeros à direita são removidos para o canônico nunca colidir com a
// heurística de milhar pt-BR de quem consumir a string depois.
function trimCanonical(canonical: string): string {
  if (!canonical.includes('.')) return canonical
  return canonical.replace(/0+$/, '').replace(/\.$/, '')
}

export default function NumericInput({
  value,
  onChange,
  decimalPlaces = 3,
  onBlur,
  onPaste,
  ...props
}: NumericInputProps) {
  const [display, setDisplay] = useState(() =>
    toDisplay(value === null || value === undefined ? '' : String(value))
  )
  const isFocusedRef = useRef(false)

  // Atualiza exibição quando o valor externo muda e o campo não está em foco
  useEffect(() => {
    if (!isFocusedRef.current) {
      setDisplay(toDisplay(value === null || value === undefined ? '' : String(value)))
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Ponto nunca é aceito na digitação: no campo ele só existe como
    // separador de milhar visual. Removemos todos antes de interpretar,
    // então "9.540" digitado é sempre nove mil quinhentos e quarenta.
    const cleaned = e.target.value.replace(/\./g, '').replace(/[^\d,]/g, '')
    const commaIdx = cleaned.indexOf(',')
    if (commaIdx === -1 || decimalPlaces === 0) {
      const digits = cleaned.replace(/,/g, '')
      setDisplay(decimalPlaces === 0 ? groupMilhar(digits) : groupMilhar(digits))
      onChange(digits)
      return
    }
    const intPart = cleaned.slice(0, commaIdx) || '0'
    const decPart = cleaned.slice(commaIdx + 1).replace(/,/g, '').slice(0, decimalPlaces)
    setDisplay(`${groupMilhar(intPart)},${decPart}`)
    onChange(trimCanonical(`${intPart}.${decPart}`))
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const num = normalizarNumero(e.clipboardData.getData('text'))
    if (num !== null) {
      const canonical = String(num)
      setDisplay(toDisplay(canonical))
      onChange(canonical)
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false
    setDisplay(toDisplay(value === null || value === undefined ? '' : String(value)))
    onBlur?.(e)
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true
    props.onFocus?.(e)
  }

  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={display}
      onChange={handleChange}
      onPaste={handlePaste}
      onBlur={handleBlur}
      onFocus={handleFocus}
    />
  )
}

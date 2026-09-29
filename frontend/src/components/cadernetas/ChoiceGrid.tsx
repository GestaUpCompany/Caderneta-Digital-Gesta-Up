import { ReactNode } from 'react'

export interface ChoiceOption {
  value: string
  label: string
  icon?: ReactNode
}

interface ChoiceGridProps {
  options: ChoiceOption[]
  /** single: usa value/onChange. multi: usa values/onChangeMulti */
  mode?: 'single' | 'multi'
  value?: string
  values?: string[]
  onChange?: (value: string) => void
  onChangeMulti?: (values: string[]) => void
  cols?: 2 | 3 | 4 | 5 | 6 | 8
  /** sm: fileira compacta de numeros. md: tiles com icone */
  size?: 'sm' | 'md'
  /** Badge verde de check no canto do tile selecionado (padrao multi) */
  showCheck?: boolean
  /** Classes extras no container da grade (ex: limitar largura) */
  className?: string
  id?: string
  dataField?: string
}

const COL_CLASSES: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  8: 'grid-cols-8',
}

/**
 * Grade de tiles selecionaveis no padrao de referencia das cadernetas.
 * Selecionado: verde-escuro solido (escolhas neutras). Nao selecionado:
 * branco com borda cinza. Com showCheck, exibe badge verde no canto.
 */
export default function ChoiceGrid({
  options,
  mode = 'single',
  value,
  values,
  onChange,
  onChangeMulti,
  cols = 3,
  size = 'md',
  showCheck,
  className = '',
  id,
  dataField,
}: ChoiceGridProps) {
  const withCheck = showCheck ?? mode === 'multi'

  const isSelected = (opt: string) =>
    mode === 'multi' ? (values ?? []).includes(opt) : value === opt

  const handleSelect = (opt: string) => {
    if (mode === 'multi') {
      const current = values ?? []
      onChangeMulti?.(
        current.includes(opt)
          ? current.filter((v) => v !== opt)
          : [...current, opt]
      )
    } else {
      onChange?.(opt)
    }
  }

  return (
    <div id={id} data-field={dataField} className={`grid ${COL_CLASSES[cols]} ${size === 'sm' ? 'gap-1.5' : 'gap-2'} ${className}`}>
      {options.map((option) => {
        const selected = isSelected(option.value)
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            className={`
              relative cursor-pointer rounded-xl border-2 transition-all active:scale-95
              flex flex-col items-center justify-center gap-1
              ${size === 'sm' ? 'p-1 min-h-[44px] min-w-0' : 'p-2 min-h-[72px]'}
              ${selected
                ? 'bg-brand-900 text-white border-brand-900'
                : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'
              }
            `}
          >
            {withCheck && selected && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-green-500 border-2 border-white flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
            {option.icon && (
              <span className={size === 'sm' ? 'text-lg' : 'text-2xl'}>{option.icon}</span>
            )}
            <span className="text-sm font-bold text-center leading-tight">
              {option.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

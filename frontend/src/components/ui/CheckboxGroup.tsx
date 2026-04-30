
interface CheckboxOption {
  value: string
  label: string
  icon?: string
}

interface CheckboxGroupProps {
  label?: string
  options: CheckboxOption[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  error?: string
  className?: string
  gridCols?: number
  hideCheckbox?: boolean
  id?: string
  dataField?: string
}

export default function CheckboxGroup({
  label,
  options,
  selectedValues,
  onChange,
  error,
  className = '',
  gridCols,
  hideCheckbox = false,
  id,
  dataField,
}: CheckboxGroupProps) {

  const handleChange = (optionValue: string) => {
    const isSelected = selectedValues.includes(optionValue)

    let newValues: string[]

    if (isSelected) {
      // Remove da seleção
      newValues = selectedValues.filter(v => v !== optionValue)
    } else {
      // Adiciona à seleção
      newValues = [...selectedValues, optionValue]
    }

    onChange(newValues)
  }

  const containerStyles = gridCols
    ? `grid grid-cols-${gridCols} gap-2`
    : 'grid grid-cols-1 gap-3'

  const isCompact = gridCols && gridCols >= 2

  return (
    <div id={id} data-field={dataField} className={`flex flex-col gap-4 ${className}`}>
      {label && (
        <div className="text-lg font-black text-gray-900 tracking-tight">
          {label}
        </div>
      )}

      <div className={containerStyles}>
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value)

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleChange(option.value)}
              className={`
                cursor-pointer rounded-xl border-2
                transition-all active:scale-95
                ${hideCheckbox
                  ? 'flex flex-col items-center justify-center gap-1'
                  : 'relative flex items-center gap-3 p-4'
                }
                ${isCompact ? 'p-2 min-h-[70px]' : hideCheckbox ? 'p-3 sm:p-4 min-h-[70px] sm:min-h-[80px]' : 'min-h-[60px]'}
                ${isSelected
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'
                }
                ${error ? 'border-red-500' : ''}
              `}
            >
              {!hideCheckbox && (
                /* Checkbox visual */
                <div className={`
                  w-6 h-6 min-w-[24px] min-h-[24px]
                  border-2 rounded flex items-center justify-center
                  transition-all
                  ${isSelected
                    ? 'bg-white border-white'
                    : 'border-gray-400'
                  }
                `}>
                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-black"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              )}

              {/* Icon e Label */}
              {hideCheckbox ? (
                <>
                  {option.icon && (
                    <span className={`text-2xl sm:text-3xl ${/^-?\d+$/.test(option.icon) ? 'bg-yellow-400 text-black rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center font-bold border-2 border-black' : ''}`}>
                      {option.icon}
                    </span>
                  )}
                  {(!option.icon || !/^-?\d+$/.test(option.icon)) && (
                    <span className={`${isCompact ? 'text-sm sm:text-base' : 'text-lg sm:text-xl'} font-bold text-center leading-tight`}>
                      {option.label}
                    </span>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  {option.icon && (
                    <span className="text-xl">{option.icon}</span>
                  )}
                  <span className="font-semibold text-base leading-tight">
                    {option.label}
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>
      
      {error && (
        <p className="text-base font-semibold text-red-700 flex items-center gap-1">
          <span>!</span> {error}
        </p>
      )}
    </div>
  )
}

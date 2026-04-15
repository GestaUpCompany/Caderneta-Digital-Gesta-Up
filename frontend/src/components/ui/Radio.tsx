// Radio component for selecting one option from multiple choices

interface RadioOption {
  value: string
  label: string
  icon?: string
}

interface RadioProps {
  name: string
  options: RadioOption[]
  value: string
  onChange: (value: string) => void
  label?: string
  error?: string
  direction?: 'horizontal' | 'vertical'
  gridCols?: number
}

export default function Radio({
  name,
  options,
  value,
  onChange,
  label,
  error,
  direction = 'horizontal',
  gridCols,
}: RadioProps) {
  const containerStyles = direction === 'horizontal'
    ? gridCols
      ? `grid grid-cols-${gridCols} gap-3`
      : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
    : 'flex flex-col gap-3'

  return (
    <div>
      {label && (
        <label className="block text-lg font-bold text-gray-900 mb-3">
          {label}
        </label>
      )}
      <div className={containerStyles}>
        {options.map((option) => {
          const isSelected = value === option.value
          return (
            <label
              key={option.value}
              className={`
                cursor-pointer rounded-xl border-2 p-3 sm:p-4 
                transition-all active:scale-95
                flex flex-col items-center justify-center gap-2
                min-h-[70px] sm:min-h-[80px]
                ${isSelected 
                  ? 'bg-black text-white border-black' 
                  : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'
                }
                ${error && !isSelected ? 'border-red-300' : ''}
              `}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.icon && (
                <span className={`text-2xl sm:text-3xl ${/^-?\d+$/.test(option.icon) ? 'bg-yellow-400 text-black rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center font-bold border-2 border-black' : ''}`}>
                  {option.icon}
                </span>
              )}
              {(!option.icon || !/^-?\d+$/.test(option.icon)) && (
                <span className="text-sm sm:text-base font-bold text-center leading-tight">
                  {option.label}
                </span>
              )}
            </label>
          )
        })}
      </div>
      {error && (
        <p className="mt-3 text-base font-semibold text-red-700 flex items-center gap-2">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  )
}


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
}

export default function CheckboxGroup({ 
  label, 
  options, 
  selectedValues, 
  onChange, 
  error, 
  className = '' 
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

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {label && (
        <div className="text-lg font-black text-gray-900 tracking-tight">
          {label}
        </div>
      )}
      
      <div className="grid grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value)
          
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleChange(option.value)}
              className={`
                relative flex items-center gap-3 p-4 rounded-2xl border-2 
                transition-all cursor-pointer min-h-[60px]
                ${isSelected 
                  ? 'bg-black border-black text-white' 
                  : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'
                }
                ${error ? 'border-red-500' : ''}
              `}
            >
              {/* Checkbox visual */}
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
              
              {/* Icon e Label */}
              <div className="flex items-center gap-2 flex-1">
                {option.icon && (
                  <span className="text-xl">{option.icon}</span>
                )}
                <span className="font-semibold text-sm leading-tight">
                  {option.label}
                </span>
              </div>
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

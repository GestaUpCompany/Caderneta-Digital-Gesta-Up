import { useState, useEffect, useRef } from 'react'

interface SearchableModalProps {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  disabled?: boolean
}

export default function SearchableModal({
  label,
  options,
  value,
  onChange,
  placeholder = 'Buscar...',
  error,
  disabled = false,
}: SearchableModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredOptions, setFilteredOptions] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      const filtered = options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredOptions(filtered)
    }
  }, [searchTerm, options, isOpen])

  const handleOpen = () => {
    setSearchTerm('')
    setFilteredOptions(options)
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleSelect = (option: string) => {
    onChange(option)
    handleClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose()
    }
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold text-gray-700 mb-1">
        {label}
      </label>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={`w-full px-4 py-3 rounded-xl border-2 text-left bg-white transition-colors ${
          error
            ? 'border-red-400 focus:border-red-500'
            : 'border-gray-200 focus:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-300'}`}
      >
        {value || 'Selecione...'}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col"
            onKeyDown={handleKeyDown}
          >
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3">{label}</h3>
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {filteredOptions.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Nenhum resultado encontrado
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={`w-full px-4 py-3 rounded-xl text-left transition-colors ${
                        value === option
                          ? 'bg-green-100 border-2 border-green-500 text-green-900'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-gray-200'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                className="w-full px-4 py-3 rounded-xl bg-gray-600 text-white font-semibold hover:bg-gray-700 transition-colors"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

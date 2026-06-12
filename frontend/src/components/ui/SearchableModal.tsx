import { useState, useEffect, useRef } from 'react'
import { ReactNode } from 'react'

interface SearchableModalProps {
  label?: string | ReactNode
  options: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  disabled?: boolean
  id?: string
  name?: string
  dataField?: string
  onCreateNew?: (searchTerm: string) => void
  onCreateMulti?: (ids: { manejo: string; brinco: string; chip: string }) => void
  createNewLabel?: string
}

export default function SearchableModal({
  label,
  options,
  value,
  onChange,
  placeholder = 'Buscar...',
  error,
  disabled = false,
  id,
  name,
  dataField,
  onCreateNew,
  onCreateMulti,
  createNewLabel = 'Novo',
}: SearchableModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredOptions, setFilteredOptions] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [newManejo, setNewManejo] = useState('')
  const [newBrinco, setNewBrinco] = useState('')
  const [newChip, setNewChip] = useState('')
  const [createError, setCreateError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      const filtered = options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredOptions(filtered)
    }
  }, [searchTerm, options, isOpen])

  // Prevenir navegação para trás quando modal está aberto (botão voltar do celular)
  useEffect(() => {
    if (isOpen) {
      // Adicionar entrada no histórico para poder voltar para fechar o modal
      window.history.pushState({ modalOpen: true }, '', window.location.href)

      const handlePopState = (e: PopStateEvent) => {
        if (e.state?.modalOpen) {
          e.preventDefault()
          handleClose()
        }
      }

      window.addEventListener('popstate', handlePopState)
      return () => {
        window.removeEventListener('popstate', handlePopState)
        // Remover a entrada do histórico se o modal for fechado sem usar o botão voltar
        if (window.history.state?.modalOpen) {
          window.history.back()
        }
      }
    }
  }, [isOpen])

  const handleOpen = () => {
    setSearchTerm('')
    setFilteredOptions(options)
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setSearchTerm('')
    setIsCreating(false)
    setNewManejo('')
    setNewBrinco('')
    setNewChip('')
    setCreateError('')
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

  const handleStartCreate = () => {
    if (onCreateMulti) {
      setIsCreating(true)
      setCreateError('')
    } else if (onCreateNew) {
      handleClose()
      onCreateNew(searchTerm)
    }
  }

  const handleSubmitCreate = () => {
    const manejo = newManejo.trim()
    const brinco = newBrinco.trim()
    const chip = newChip.trim()

    if (!manejo && !brinco && !chip) {
      setCreateError('Informe pelo menos um ID (Manejo, Brinco ou Chip)')
      return
    }

    if (onCreateMulti) {
      onCreateMulti({ manejo, brinco, chip })
    }
    handleClose()
  }

  const handleCancelCreate = () => {
    setIsCreating(false)
    setCreateError('')
  }

  return (
    <div className="w-full">
      <label className="block text-lg font-bold text-gray-900 mb-2">
        {label}
      </label>
      <button
        type="button"
        id={id}
        name={name}
        data-field={dataField}
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
            {!isCreating ? (
              <>
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

                <div className="p-4 border-t border-gray-200 flex flex-col gap-2">
                  {(onCreateNew || onCreateMulti) && (
                    <button
                      type="button"
                      onClick={handleStartCreate}
                      className="w-full px-4 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <span>+</span>
                      <span>{createNewLabel}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClose}
                    className="w-full px-4 py-3 rounded-xl bg-gray-600 text-white font-semibold hover:bg-gray-700 transition-colors"
                  >
                    CANCELAR
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900">Novo Animal</h3>
                  <p className="text-sm text-gray-500 mt-1">Informe pelo menos um identificador</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">ID MANEJO</label>
                    <input
                      type="text"
                      value={newManejo}
                      onChange={(e) => setNewManejo(e.target.value)}
                      placeholder="Ex: M-001"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">ID BRINCO</label>
                    <input
                      type="text"
                      value={newBrinco}
                      onChange={(e) => setNewBrinco(e.target.value)}
                      placeholder="Ex: 2021-089"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">ID CHIP</label>
                    <input
                      type="text"
                      value={newChip}
                      onChange={(e) => setNewChip(e.target.value)}
                      placeholder="Ex: 982000123456789"
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-gray-400 focus:outline-none"
                    />
                  </div>
                  {createError && (
                    <p className="text-sm text-red-600 font-semibold">{createError}</p>
                  )}
                </div>

                <div className="p-4 border-t border-gray-200 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleSubmitCreate}
                    className="w-full px-4 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <span>+</span>
                    <span>ADICIONAR</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelCreate}
                    className="w-full px-4 py-3 rounded-xl bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition-colors"
                  >
                    VOLTAR
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

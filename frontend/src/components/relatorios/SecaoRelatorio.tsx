import { type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface SecaoRelatorioProps {
  icone: string
  titulo: string
  contagem?: number
  expandida: boolean
  onToggle: () => void
  carregando?: boolean
  children: ReactNode
}

export default function SecaoRelatorio({
  icone,
  titulo,
  contagem,
  expandida,
  onToggle,
  carregando = false,
  children,
}: SecaoRelatorioProps) {
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 min-h-[48px] text-left active:bg-gray-100 transition-colors"
        aria-expanded={expandida}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="text-xl flex-shrink-0">{icone}</span>
          <span className="font-bold text-gray-900 text-base truncate">{titulo}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {contagem !== undefined && contagem > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {contagem}
            </span>
          )}
          <ChevronDown
            className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
              expandida ? 'rotate-180' : ''
            }`}
            strokeWidth={2.5}
          />
        </div>
      </button>

      {expandida && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-200">
          {carregando ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  )
}

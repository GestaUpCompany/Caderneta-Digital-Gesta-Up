import { useEffect } from 'react'
import { RefreshCw, X } from 'lucide-react'
import Button from './ui/Button'

interface PWAUpdateModalProps {
  isOpen: boolean
  onRestartNow: () => void
  onLater: () => void
}

export function PWAUpdateModal({ isOpen, onRestartNow, onLater }: PWAUpdateModalProps) {
  const handleLater = () => {
    onLater()
  }

  // Fechar modal com ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onLater()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onLater])

  // Prevenir scroll quando modal está aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onLater}
    >
      <div 
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com ícone de atualização */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
            <RefreshCw className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Nova versão disponível!
          </h2>
          <p className="text-gray-600">
            Reinicie o aplicativo para obter as melhorias mais recentes.
          </p>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={onRestartNow}
            variant="primary"
            fullWidth
            icon=""
            className="bg-[#1a3a2a] text-white hover:bg-[#2a5a4a] font-bold"
            style={{ backgroundColor: '#1a3a2a' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a5a4a'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a3a2a'}
          >
            Reiniciar agora
          </Button>
          <Button
            onClick={handleLater}
            variant="ghost"
            fullWidth
            icon=""
            className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-bold"
          >
            Depois
          </Button>
        </div>

        {/* Botão de fechar */}
        <button
          onClick={handleLater}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface PdfModalProps {
  isOpen: boolean
  onClose: () => void
  images: string[]
}

export default function PdfModal({ isOpen, onClose, images }: PdfModalProps) {
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

  // Fechar modal com ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com título e botão de fechar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 rounded-t-2xl">
          <span className="text-white font-semibold">POP Maternidade</span>
          <button
            onClick={onClose}
            className="text-white hover:bg-gray-700 rounded-full p-2 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* PDF Viewer com imagens */}
        <div className="flex-1 w-full h-full overflow-y-auto p-4 bg-gray-100">
          <div className="flex flex-col gap-4 items-center">
            {images.map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`POP Maternidade - Página ${index + 1}`}
                className="max-w-full h-auto shadow-lg"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { X, ZoomIn, ZoomOut } from 'lucide-react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

interface PdfModalProps {
  isOpen: boolean
  onClose: () => void
  images: string[]
}

export default function PdfModal({ isOpen, onClose, images }: PdfModalProps) {
  const [zoomEnabled, setZoomEnabled] = useState(false)

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
      className="fixed inset-0 bg-black z-50 animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Header com botões */}
      <div
        className="absolute top-0 right-0 p-4 z-20 flex gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setZoomEnabled(!zoomEnabled)}
          className="text-white hover:bg-gray-700 rounded-full p-3 transition-all duration-200 bg-black/50 hover:scale-110"
          aria-label={zoomEnabled ? 'Desativar zoom' : 'Ativar zoom'}
        >
          {zoomEnabled ? <ZoomOut className="w-8 h-8" /> : <ZoomIn className="w-8 h-8" />}
        </button>
        <button
          onClick={onClose}
          className="text-white hover:bg-gray-700 rounded-full p-3 transition-all duration-200 bg-black/50 hover:scale-110"
          aria-label="Fechar"
        >
          <X className="w-8 h-8" />
        </button>
      </div>

      {/* Indicador de modo */}
      {zoomEnabled && (
        <div className="absolute top-4 left-4 z-20 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
          Modo zoom ativo
        </div>
      )}

      {/* Imagens com zoom e pan */}
      <div
        className="w-full h-full overflow-y-auto scroll-smooth"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-4 items-center p-4">
          {images.map((image, index) => (
            <div key={index} className="w-full flex justify-center animate-in zoom-in duration-300" style={{ animationDelay: `${index * 100}ms` }}>
              <TransformWrapper
                initialScale={1}
                minScale={0.5}
                maxScale={4}
                wheel={{ step: 0.1 }}
                doubleClick={{ step: 0.8 }}
                panning={{ disabled: !zoomEnabled }}
                disabled={!zoomEnabled}
              >
                <TransformComponent>
                  <img
                    src={image}
                    alt={`POP Maternidade - Página ${index + 1}`}
                    className="max-w-full h-auto"
                    style={{ maxWidth: '100%', maxHeight: '100%' }}
                  />
                </TransformComponent>
              </TransformWrapper>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

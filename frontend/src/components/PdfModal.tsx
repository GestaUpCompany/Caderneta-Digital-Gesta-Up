import { useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'

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
    <div className="fixed inset-0 bg-black z-50">
      <Lightbox
        open={isOpen}
        close={onClose}
        slides={images.map((src) => ({ src }))}
        plugins={[Zoom]}
        zoom={{
          maxZoomPixelRatio: 3,
          zoomInMultiplier: 2,
          scrollToZoom: true,
        }}
        carousel={{
          finite: true,
          preload: 2,
          spacing: 0,
          padding: 0,
        }}
        render={{
          buttonPrev: () => null,
          buttonNext: () => null,
        }}
      />

      {/* Aviso de navegação discreto */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black/50 text-white/70 px-3 py-1 rounded-full text-xs flex items-center gap-2">
        <ChevronLeft className="w-3 h-3" />
        <span>Arraste para navegar</span>
        <ChevronRight className="w-3 h-3" />
      </div>

      {/* Botão de fechar */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 text-white hover:bg-gray-700 rounded-full p-3 transition-all duration-200 bg-black/50 hover:scale-110"
        aria-label="Fechar"
      >
        <X className="w-8 h-8" />
      </button>
    </div>
  )
}

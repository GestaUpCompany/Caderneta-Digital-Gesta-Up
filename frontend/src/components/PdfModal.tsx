import { useEffect, useState, useRef } from 'react'
import { X } from 'lucide-react'

interface PdfModalProps {
  isOpen: boolean
  onClose: () => void
  images: string[]
}

export default function PdfModal({ isOpen, onClose, images }: PdfModalProps) {
  const [zoom, setZoom] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

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

  // Reset zoom e posição quando modal fecha
  useEffect(() => {
    if (!isOpen) {
      setZoom(1)
      setPosition({ x: 0, y: 0 })
    }
  }, [isOpen])

  // Gesto de pinça para zoom global
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )
      ;(e.currentTarget as HTMLElement).dataset.initialDistance = distance.toString()
      ;(e.currentTarget as HTMLElement).dataset.initialZoom = zoom.toString()
    } else if (e.touches.length === 1 && zoom > 1) {
      // Iniciar arraste (pan) quando há zoom
      setIsDragging(true)
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      })
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )
      const initialDistance = parseFloat((e.currentTarget as HTMLElement).dataset.initialDistance || '0')
      const initialZoom = parseFloat((e.currentTarget as HTMLElement).dataset.initialZoom || '1')

      if (initialDistance > 0) {
        const scale = Math.min(Math.max(distance / initialDistance * initialZoom, 0.5), 4)
        setZoom(scale)
      }
    } else if (e.touches.length === 1 && isDragging && zoom > 1) {
      e.preventDefault()
      const newX = e.touches[0].clientX - dragStart.x
      const newY = e.touches[0].clientY - dragStart.y
      setPosition({ x: newX, y: newY })
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.currentTarget) {
      delete (e.currentTarget as HTMLElement).dataset.initialDistance
      delete (e.currentTarget as HTMLElement).dataset.initialZoom
    }
    setIsDragging(false)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      e.preventDefault()
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y
      setPosition({ x: newX, y: newY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom(prev => Math.min(Math.max(prev + delta, 0.5), 4))
    }
  }

  const handleDoubleClick = () => {
    setZoom(prev => prev === 1 ? 2 : 1)
    setPosition({ x: 0, y: 0 })
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black z-50 animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Header com botão de fechar */}
      <div
        className="absolute top-0 right-0 p-4 z-20"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="text-white hover:bg-gray-700 rounded-full p-3 transition-all duration-200 bg-black/50 hover:scale-110"
          aria-label="Fechar"
        >
          <X className="w-8 h-8" />
        </button>
      </div>

      {/* Indicador de zoom */}
      {zoom > 1 && (
        <div className="absolute top-4 left-4 z-20 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
          Zoom: {zoom.toFixed(1)}x
        </div>
      )}

      {/* Aviso de gesto */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-black/50 text-white/70 px-3 py-1 rounded-full text-xs">
        Pinça para zoom • Arraste para mover • Duplo clique para remover o zoom
      </div>

      {/* Container com zoom global e pan */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        style={{
          overscrollBehavior: 'contain',
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
      >
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            transformOrigin: 'top center',
            transition: isDragging ? 'none' : 'transform 0.1s ease',
          }}
        >
          <div className="flex flex-col gap-4 items-center p-4 pb-32">
            {images.map((image, index) => (
              <div
                key={index}
                className="w-full flex justify-center animate-in zoom-in duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <img
                  src={image}
                  alt={`POP Maternidade - Página ${index + 1}`}
                  className="max-w-full h-auto"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useEffect } from 'react'
import { Check } from 'lucide-react'
import Button from './ui/Button'
import { formatarRegistroComoTexto, compartilharWhatsApp, Registro } from '../utils/shareUtils'

interface SuccessModalProps {
  isOpen: boolean
  onClose: () => void
  onNewRecord: () => void
  onExit: () => void
  cadernetaName: string
  registro?: Registro
  caderneta?: string
}

export default function SuccessModal({
  isOpen,
  onClose,
  onNewRecord,
  onExit,
  cadernetaName,
  registro,
  caderneta
}: SuccessModalProps) {
  const handleShare = async () => {
    if (registro && caderneta) {
      const texto = formatarRegistroComoTexto(registro, caderneta)
      await compartilharWhatsApp(texto)
    }
  }

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
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com ícone de sucesso */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            SALVO COM SUCESSO!
          </h2>
          <p className="text-gray-600">
            {cadernetaName} registrada com sucesso
          </p>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <Button
              onClick={onNewRecord}
              variant="primary"
              fullWidth
              icon=""
              className="flex-1 bg-[#1a3a2a] text-white hover:bg-[#2a5a4a] font-bold"
            >
              Novo Registro
            </Button>
            <Button
              onClick={onExit}
              variant="ghost"
              fullWidth
              icon=""
              className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-bold"
            >
              Voltar para o início
            </Button>
          </div>
          {registro && caderneta && (
            <Button
              onClick={handleShare}
              variant="secondary"
              fullWidth
              icon="🔗"
              className="font-bold"
            >
              COMPARTILHAR
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

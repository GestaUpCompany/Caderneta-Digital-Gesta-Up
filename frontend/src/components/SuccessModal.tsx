import { useEffect } from 'react'
import { CheckCircle2, Share2, Plus } from 'lucide-react'
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
      const foto = (registro as any).fotoBase64 as string | null | undefined
      await compartilharWhatsApp(texto, foto)
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

  // Prevenir navegação para trás quando modal está aberto (botão voltar do celular)
  useEffect(() => {
    if (isOpen) {
      // Adicionar entrada no histórico para poder voltar para fechar o modal
      window.history.pushState({ modalOpen: true }, '', window.location.href)

      const handlePopState = (e: PopStateEvent) => {
        if (e.state?.modalOpen) {
          e.preventDefault()
          onClose()
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
        className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com ícone de sucesso */}
        <CheckCircle2 className="h-12 w-12 text-green-700 mx-auto" />
        <h2 className="text-lg font-black text-gray-900 mt-2">
          Salvo com sucesso
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {cadernetaName} registrada no aparelho. Será enviada ao sincronizar.
        </p>

        {/* Botões de ação */}
        <div className="mt-4 flex flex-col gap-2">
          {registro && caderneta && (
            <button
              onClick={handleShare}
              className="w-full font-bold px-4 py-3 rounded-2xl bg-green-700 text-white active:bg-green-800 flex items-center justify-center gap-2"
            >
              <Share2 className="h-5 w-5" />
              COMPARTILHAR
            </button>
          )}
          <button
            onClick={onNewRecord}
            className="w-full font-bold px-4 py-3 rounded-2xl bg-[#1a3a2a] text-white active:bg-[#245038] flex items-center justify-center gap-2"
          >
            <Plus className="h-5 w-5" />
            NOVO REGISTRO
          </button>
          <button
            onClick={onExit}
            className="w-full font-bold px-4 py-3 rounded-2xl border-2 border-gray-300 text-gray-700 bg-gray-100 active:bg-gray-200"
          >
            VOLTAR PARA O INÍCIO
          </button>
        </div>
      </div>
    </div>
  )
}

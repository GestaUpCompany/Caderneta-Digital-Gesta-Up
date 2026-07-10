import { useState, useEffect } from 'react'
import { AlertTriangle, Clock } from 'lucide-react'

interface ObservacaoAtrasoModalProps {
  isOpen: boolean
  onClose: (observacao?: string) => void
  horarioProgramado: string
  horarioRegistro: string
}

export default function ObservacaoAtrasoModal({
  isOpen,
  onClose,
  horarioProgramado,
  horarioRegistro,
}: ObservacaoAtrasoModalProps) {
  const [observacao, setObservacao] = useState('')

  useEffect(() => {
    if (!isOpen) {
      setObservacao('')
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose(observacao)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, observacao])

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
      onClick={() => onClose(observacao)}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Registro fora do horário programado
          </h2>
          <div className="flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-2 rounded-lg mb-2">
            <Clock size={18} />
            <span className="text-sm font-semibold">
              Programado: {horarioProgramado}
            </span>
            <span className="text-sm font-semibold">
              Registrado: {horarioRegistro}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Você está registrando fora do horário de rotina. Se desejar, informe o motivo do atraso.
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Observação (opcional)
          </label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex: atraso por chuva, manutenção de equipamento..."
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6] focus:ring-opacity-50 outline-none transition-all resize-none"
            rows={4}
          />
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => onClose(observacao)}
            className="w-full bg-[#1a3a2a] hover:bg-[#142b20] text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all"
          >
            Continuar e salvar
          </button>
          <button
            onClick={() => onClose()}
            className="w-full bg-white hover:bg-gray-50 text-gray-700 font-bold py-3 px-4 rounded-xl border-2 border-gray-300 transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

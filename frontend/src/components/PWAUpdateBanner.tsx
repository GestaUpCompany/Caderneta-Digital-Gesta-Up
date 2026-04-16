import { useServiceWorkerUpdate } from '../hooks/useServiceWorkerUpdate'
import { X } from 'lucide-react'

export function PWAUpdateBanner() {
  const { showUpdateBanner, applyUpdate, dismissUpdateBanner } = useServiceWorkerUpdate()

  if (!showUpdateBanner) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-[#1a3a2a] text-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 p-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center">
              <span className="text-lg">🔄</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-base mb-1">
              Nova versão disponível
            </p>
            <p className="text-sm text-gray-300">
              Clique para atualizar e obter as melhorias mais recentes
            </p>
          </div>
          <button
            onClick={dismissUpdateBanner}
            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 pt-0">
          <button
            onClick={dismissUpdateBanner}
            className="flex-1 px-4 py-2 bg-transparent border border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors font-semibold text-sm"
          >
            Agora não
          </button>
          <button
            onClick={applyUpdate}
            className="flex-1 px-4 py-2 bg-yellow-400 text-black rounded-lg hover:bg-yellow-300 transition-colors font-semibold text-sm"
          >
            Atualizar
          </button>
        </div>
      </div>
    </div>
  )
}

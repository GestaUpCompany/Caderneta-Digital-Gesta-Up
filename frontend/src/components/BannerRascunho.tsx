interface BannerRascunhoProps {
  visible: boolean
  onConfirmar: () => void
  onDescartar: () => void
}

/**
 * Banner que aparece no topo de uma caderneta quando um rascunho
 * foi restaurado do cache. Permite ao usuario continuar o preenchimento
 * ou descartar e comecar do zero.
 */
export default function BannerRascunho({ visible, onConfirmar, onDescartar }: BannerRascunhoProps) {
  if (!visible) return null

  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-2xl flex-shrink-0">📝</span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-amber-900">
            Preenchimento em andamento recuperado
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            Continuar de onde parou ou começar novamente?
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onDescartar}
          className="text-sm font-bold text-amber-800 bg-white border-2 border-amber-300 rounded-xl px-3 py-2 min-h-[40px] active:bg-amber-100 transition-colors"
        >
          Descartar
        </button>
        <button
          onClick={onConfirmar}
          className="text-sm font-bold text-white bg-amber-600 rounded-xl px-3 py-2 min-h-[40px] active:bg-amber-700 transition-colors"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}

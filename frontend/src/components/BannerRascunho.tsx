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
    <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 shadow-sm">
      <span className="flex-shrink-0 text-base leading-none">📝</span>
      <p className="min-w-0 flex-1 text-xs font-semibold text-amber-900">
        Rascunho recuperado. Continuar?
      </p>
      <button
        onClick={onDescartar}
        className="flex-shrink-0 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-bold text-amber-800 transition-colors active:bg-amber-100"
      >
        Descartar
      </button>
      <button
        onClick={onConfirmar}
        className="flex-shrink-0 rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-bold text-white transition-colors active:bg-amber-700"
      >
        Continuar
      </button>
    </div>
  )
}

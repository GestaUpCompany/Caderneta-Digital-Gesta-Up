import { ArrowDown, Save } from 'lucide-react'

interface BarraAcao5SProps {
  respondidos: number
  total: number
  naoConformes: number
  /** Auditoria pronta para salvar. */
  valido: boolean
  salvando: boolean
  /** O que ainda falta, em uma frase (mostrado enquanto não está válido). */
  pendenciaTexto?: string
  onSalvar: () => void
  onIrParaPendente: () => void
}

/**
 * Barra fixa inferior da auditoria: progresso sempre à vista e uma única ação principal.
 * Com algo faltando, o botão leva ao próximo ponto pendente; com tudo preenchido, vira SALVAR.
 */
export default function BarraAcao5S({ respondidos, total, naoConformes, valido, salvando, pendenciaTexto, onSalvar, onIrParaPendente }: BarraAcao5SProps) {
  const pct = total > 0 ? Math.round((respondidos / total) * 100) : 0
  return (
    <div className="flex flex-col gap-2.5 pb-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <p role="status" aria-live="polite" className="font-extrabold text-gray-900 tabular-nums">
          {respondidos}/{total} respondidos
          {naoConformes > 0 && (
            <span className="font-bold text-red-700">
              {' '}
              · {naoConformes} {naoConformes === 1 ? 'não conforme' : 'não conformes'}
            </span>
          )}
        </p>
        <span className="font-bold text-gray-500 tabular-nums">{pct}%</span>
      </div>

      <div
        role="progressbar"
        aria-label="Itens respondidos"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={respondidos}
        className="h-2 overflow-hidden rounded-full bg-gray-200"
      >
        <div className="h-full rounded-full bg-green-600 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${pct}%` }} />
      </div>

      {valido ? (
        <button
          type="button"
          onClick={onSalvar}
          disabled={salvando}
          className={`w-full !min-h-[56px] rounded-2xl px-3 py-3.5 text-base font-extrabold transition-colors active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-400/70 ${
            salvando ? 'cursor-not-allowed bg-gray-100 text-gray-400' : 'bg-green-700 text-white hover:bg-green-800'
          }`}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Save className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            {salvando ? 'SALVANDO...' : 'SALVAR AUDITORIA'}
          </span>
        </button>
      ) : (
        <>
          {pendenciaTexto && <p className="text-sm font-semibold leading-snug text-gray-700">{pendenciaTexto}</p>}
          <button
            type="button"
            onClick={onIrParaPendente}
            className="w-full !min-h-[56px] rounded-2xl bg-brand-900 px-3 py-3.5 text-base font-extrabold text-white transition-colors hover:bg-brand-800 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-400/70"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <ArrowDown className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
              IR PARA O QUE FALTA
            </span>
          </button>
        </>
      )}
    </div>
  )
}

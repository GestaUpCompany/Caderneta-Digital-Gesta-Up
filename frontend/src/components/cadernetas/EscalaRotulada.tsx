export interface EscalaOpcao {
  value: string
  label: string
  dot: string
  /** Texto exibido no tile quando difere do value (ex.: value é um id) */
  numero?: string
}

/** Escala com bolinha de cor, número e rótulo (escore corporal e de fezes). */
export default function EscalaRotulada({
  options,
  value,
  onChange,
  dataField,
  disabled = false,
}: {
  options: EscalaOpcao[]
  value: string
  onChange: (v: string) => void
  dataField?: string
  disabled?: boolean
}) {
  return (
    <div className="grid grid-cols-5 gap-1.5" data-field={dataField}>
      {options.map((opt) => {
        const selecionado = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`flex min-h-[72px] min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-2 p-1 transition-all active:scale-95 ${
              selecionado
                ? 'border-brand-900 bg-brand-50 text-gray-900'
                : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'
            } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <span className={`h-3 w-3 rounded-full ${opt.dot}`} />
            <span className="text-lg font-extrabold leading-none">{opt.numero ?? opt.value}</span>
            <span className="text-[10px] font-semibold leading-tight text-gray-500">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

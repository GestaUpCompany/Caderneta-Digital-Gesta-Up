import { Minus, Plus } from 'lucide-react'

const numeroDe = (valor: string | undefined) => {
  const n = Number(String(valor ?? '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

interface StepperProps {
  valor: string
  onChange: (v: string) => void
  nome: string
  decimal?: boolean
  /** Abaixo de 360 px os botões ficam com 44 px (o CSS global dá 60 px a todo button), liberando largura ao rótulo */
  compact?: boolean
}

// Botões −/+ com número editável no meio (mesmo padrão da Entrada Cantina)
export default function Stepper({ valor, onChange, nome, decimal = false, compact = false }: StepperProps) {
  const larguraBotao = compact ? 'w-11 !min-w-0 min-[360px]:!min-w-[60px]' : 'w-9'
  const larguraCampo = compact ? 'w-9 min-[360px]:w-10' : 'w-10'
  const bump = (delta: number) => {
    const prox = Math.max(0, Math.round((numeroDe(valor) + delta) * 1000) / 1000)
    onChange(prox === 0 ? '' : String(prox))
  }
  return (
    <div className="flex shrink-0 items-stretch gap-1">
      <button
        type="button"
        onClick={() => bump(-1)}
        aria-label={`Diminuir ${nome}`}
        className={`flex !min-h-0 h-10 ${larguraBotao} items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-gray-700 active:scale-95`}
      >
        <Minus className="h-4 w-4" strokeWidth={2.5} />
      </button>
      <input
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={valor}
        placeholder="0"
        onChange={(e) =>
          onChange(
            decimal
              ? e.target.value.replace(/[^0-9,.]/g, '').replace(',', '.')
              : e.target.value.replace(/[^0-9]/g, '')
          )
        }
        aria-label={`Quantidade de ${nome}`}
        className={`!min-h-0 h-10 ${larguraCampo} min-w-0 rounded-xl border-2 border-transparent bg-transparent text-center text-xl font-extrabold text-gray-900 focus:border-gray-300 focus:outline-none`}
      />
      <button
        type="button"
        onClick={() => bump(1)}
        aria-label={`Aumentar ${nome}`}
        className={`flex !min-h-0 h-10 ${larguraBotao} items-center justify-center rounded-xl bg-brand-900 text-white active:scale-95`}
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </button>
    </div>
  )
}

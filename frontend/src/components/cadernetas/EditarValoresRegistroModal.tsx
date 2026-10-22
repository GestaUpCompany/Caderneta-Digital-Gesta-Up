import { useState } from 'react'
import NumericInput from '../ui/NumericInput'
import { normalizarNumero } from '../../utils/formatNumber'

export interface ItemEditavel {
  id: string
  label: string
  valor: number
}

interface Props {
  titulo: string
  unidade: string
  itens: ItemEditavel[]
  /** Total exibido a partir dos valores digitados; o padrão é a soma dos itens */
  calcularTotal?: (valores: Record<string, number>) => number
  rotuloTotal?: string
  onSalvar: (valores: Record<string, number>) => Promise<void>
  onFechar: () => void
}

/** Modal genérico para corrigir vários valores numéricos de um registro; a regra de negócio fica em `onSalvar`. */
export default function EditarValoresRegistroModal({ titulo, unidade, itens, calcularTotal, rotuloTotal = 'Total', onSalvar, onFechar }: Props) {
  const [valores, setValores] = useState<Record<string, string>>(() => Object.fromEntries(itens.map((i) => [i.id, String(i.valor)])))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const numeros = Object.fromEntries(itens.map((i) => [i.id, normalizarNumero(valores[i.id])]))
  const validos = itens.every((i) => numeros[i.id] !== null && (numeros[i.id] as number) >= 0)
  const mapa = Object.fromEntries(itens.map((i) => [i.id, numeros[i.id] ?? 0])) as Record<string, number>
  const total = calcularTotal ? calcularTotal(mapa) : Object.values(mapa).reduce((acc, v) => acc + v, 0)
  const podeSalvar = validos && total > 0 && !salvando

  const salvar = async () => {
    if (!podeSalvar) return
    setSalvando(true)
    setErro(null)
    try {
      await onSalvar(mapa)
      onFechar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="app-card flex max-h-[90vh] w-full max-w-sm flex-col gap-4 p-5">
        <h2 className="text-base font-bold uppercase tracking-wide text-gray-900">{titulo}</h2>
        <div className="space-y-3 overflow-y-auto">
          {itens.map((item) => (
            <NumericInput
              key={item.id}
              label={`${item.label} (${unidade})`}
              value={valores[item.id]}
              onChange={(v) => setValores((prev) => ({ ...prev, [item.id]: v }))}
              decimalPlaces={2}
            />
          ))}
        </div>
        <p className="text-sm font-bold text-gray-900">
          {rotuloTotal}: {total.toFixed(2).replace('.', ',')} {unidade}
        </p>
        {erro && <p className="text-sm font-semibold text-red-700">{erro}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onFechar}
            disabled={salvando}
            className="flex-1 rounded-xl border border-gray-300 bg-white py-2.5 text-xs font-bold uppercase tracking-wide text-gray-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={salvar}
            disabled={!podeSalvar}
            className="flex-1 rounded-xl bg-brand-700 py-2.5 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-60"
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

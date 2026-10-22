import { useState } from 'react'
import NumericInput from '../ui/NumericInput'
import { normalizarNumero } from '../../utils/formatNumber'

interface Props {
  titulo: string
  label: string
  unidade: string
  valorAtual: number
  aviso?: (novoValor: number) => string | null
  onSalvar: (novoValor: number) => Promise<void>
  onFechar: () => void
}

/** Modal genérico para corrigir um valor numérico de um registro; a regra de negócio fica em `onSalvar`. */
export default function EditarValorRegistroModal({ titulo, label, unidade, valorAtual, aviso, onSalvar, onFechar }: Props) {
  const [valor, setValor] = useState(String(valorAtual))
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const numero = normalizarNumero(valor)
  const valido = numero !== null && numero > 0
  const textoAviso = valido ? aviso?.(numero) ?? null : null

  const salvar = async () => {
    if (!valido || numero === null) return
    setSalvando(true)
    setErro(null)
    try {
      await onSalvar(numero)
      onFechar()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="app-card w-full max-w-sm space-y-4 p-5">
        <h2 className="text-base font-bold uppercase tracking-wide text-gray-900">{titulo}</h2>
        <NumericInput label={`${label} (${unidade})`} value={valor} onChange={setValor} decimalPlaces={2} />
        {textoAviso && <p className="text-sm font-semibold text-amber-700">{textoAviso}</p>}
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
            disabled={!valido || salvando}
            className="flex-1 rounded-xl bg-brand-700 py-2.5 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-60"
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

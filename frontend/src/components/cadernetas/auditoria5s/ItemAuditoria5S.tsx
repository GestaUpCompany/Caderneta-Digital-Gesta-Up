import { ReactNode, useId } from 'react'
import { Check, Lock, Minus, X } from 'lucide-react'
import SegmentoResposta5S, { type OpcaoSegmento } from './SegmentoResposta5S'

const OPCOES_RESPOSTA: OpcaoSegmento[] = [
  { value: 'C', label: 'Conforme', tom: 'ok', icone: <Check className="h-5 w-5" strokeWidth={3} /> },
  { value: 'N', label: 'Não conforme', tom: 'ruim', icone: <X className="h-5 w-5" strokeWidth={3} /> },
  { value: 'NA', label: 'N/A', descricao: 'Não se aplica', tom: 'neutro', icone: <Minus className="h-5 w-5" strokeWidth={3} /> },
]

// Faixa lateral: o estado do item aparece ao rolar, sem precisar ler os botões
const FAIXA: Record<string, string> = {
  C: 'border-l-green-600',
  N: 'border-l-red-600 bg-red-50/40',
  NA: 'border-l-gray-400',
}

interface ItemAuditoria5SProps {
  numero: number
  texto: string
  /** Chave do item (vai para o banco); também é o data-field usado para rolar até o item. */
  chave: string
  resposta: string
  onResposta: (valor: string) => void
  /** Item decidido pela pergunta de pendência anterior: sem botões, sempre não conforme. */
  pendenciaAnterior?: boolean
  erro?: string
  /** Evidência e plano de ação, quando o item é não conforme. */
  children?: ReactNode
}

/** Uma pergunta da auditoria com resposta Conforme / Não conforme / Não se aplica. */
export default function ItemAuditoria5S({ numero, texto, chave, resposta, onResposta, pendenciaAnterior, erro, children }: ItemAuditoria5SProps) {
  const idTexto = useId()
  return (
    <div
      className={`flex flex-col gap-2.5 rounded-xl border border-gray-200 border-l-4 px-3.5 py-3 ${
        FAIXA[resposta] ?? 'border-l-gray-300 bg-white'
      }`}
    >
      <p id={idTexto} className="flex items-start gap-2.5 text-[17px] font-semibold leading-snug text-gray-900">
        <span
          aria-hidden="true"
          className="mt-0.5 inline-flex h-6 min-w-[1.5rem] flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-xs font-extrabold text-gray-700"
        >
          {numero}
        </span>
        <span>{texto}</span>
      </p>

      {pendenciaAnterior ? (
        <p className="flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 text-sm font-bold text-red-800">
          <Lock className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          Pendência anterior: continua não conforme
        </p>
      ) : (
        <SegmentoResposta5S opcoes={OPCOES_RESPOSTA} value={resposta} onChange={onResposta} ariaLabelledBy={idTexto} dataField={chave} />
      )}

      {erro && (
        <p role="alert" className="text-sm font-semibold text-red-700">
          {erro}
        </p>
      )}
      {children}
    </div>
  )
}

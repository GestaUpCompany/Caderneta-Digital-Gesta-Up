import { Check } from 'lucide-react'
import { SECOES_5S } from '../../../utils/auditoria5sItens'

interface TrilhaPilares5SProps {
  itens: Record<string, string>
  respondidos: number
  total: number
  /** Percentual de conformidade (C sobre C+N), null sem itens avaliados. */
  percentual: number | null
  onIrPara: (secaoId: string) => void
}

const COR_SEGMENTO: Record<string, string> = {
  C: 'bg-green-600',
  N: 'bg-red-600',
  NA: 'bg-gray-400',
}

/**
 * Resumo da auditoria e atalho por pilar. Cada pilar mostra um segmento por item (verde conforme, vermelho
 * não conforme, cinza não se aplica, vazio sem resposta), então dá para ver o que falta sem rolar a tela toda.
 */
export default function TrilhaPilares5S({ itens, respondidos, total, percentual, onIrPara }: TrilhaPilares5SProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wide text-gray-500">Respondidos</p>
          <p className="text-3xl font-extrabold leading-none text-gray-900 tabular-nums">
            {respondidos}
            <span className="text-lg font-bold text-gray-400">/{total}</span>
          </p>
        </div>
        {percentual !== null && (
          <p className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-extrabold text-gray-800 tabular-nums">
            {percentual.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}% conforme
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-1.5">
        {SECOES_5S.map((secao) => {
          const respostas = secao.itens.map((i) => itens[i.chave] ?? '')
          const feitos = respostas.filter(Boolean).length
          const naoConformes = respostas.filter((r) => r === 'N').length
          const completo = feitos === secao.itens.length
          const resumo = `${secao.titulo}: ${feitos} de ${secao.itens.length} respondidos${naoConformes > 0 ? `, ${naoConformes} não conforme` : ''}`
          return (
            <li key={secao.id}>
              <button
                type="button"
                onClick={() => onIrPara(secao.id)}
                aria-label={`${resumo}. Ir para o pilar`}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 !min-h-[48px] text-left transition-colors hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-400/70"
              >
                <span className="w-[6.6rem] flex-shrink-0 text-sm font-bold text-gray-900">{secao.titulo}</span>
                <span aria-hidden="true" className="flex flex-1 gap-1">
                  {respostas.map((r, i) => (
                    <span key={i} className={`h-2.5 flex-1 rounded-full ${COR_SEGMENTO[r] ?? 'bg-gray-200'}`} />
                  ))}
                </span>
                <span className="flex w-9 flex-shrink-0 items-center justify-end gap-0.5 text-sm font-extrabold tabular-nums text-gray-700">
                  {completo ? <Check className="h-4 w-4 text-green-700" strokeWidth={3} aria-hidden="true" /> : null}
                  {completo ? null : `${feitos}/${secao.itens.length}`}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

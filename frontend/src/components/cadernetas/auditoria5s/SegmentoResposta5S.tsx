import { KeyboardEvent, ReactNode, useRef } from 'react'

export type TomSegmento = 'ok' | 'ruim' | 'neutro' | 'alerta'

export interface OpcaoSegmento {
  value: string
  label: string
  icone?: ReactNode
  tom: TomSegmento
  /** Texto para leitores de tela quando o rótulo visual é curto (ex.: "N/A"). */
  descricao?: string
}

interface SegmentoResposta5SProps {
  opcoes: OpcaoSegmento[]
  value: string
  onChange: (value: string) => void
  /** id do elemento que nomeia o grupo (a pergunta). */
  ariaLabelledBy: string
  dataField?: string
  /** Classes da grade; default 1 coluna por opção. */
  colunas?: 2 | 3 | 6
  compacto?: boolean
}

const COLUNAS: Record<number, string> = { 2: 'grid-cols-2', 3: 'grid-cols-3', 6: 'grid-cols-6' }

// Selecionado: preenchimento sólido (cor + ícone + palavra, nunca só cor). Não selecionado: branco, com o ícone já tingido.
const SELECIONADO: Record<TomSegmento, string> = {
  ok: 'border-green-700 bg-green-700 text-white',
  ruim: 'border-red-600 bg-red-600 text-white',
  neutro: 'border-gray-600 bg-gray-600 text-white',
  alerta: 'border-amber-500 bg-amber-400 text-gray-900',
}
const ICONE_LIVRE: Record<TomSegmento, string> = {
  ok: 'text-green-700',
  ruim: 'text-red-600',
  neutro: 'text-gray-500',
  alerta: 'text-amber-600',
}

/**
 * Grupo de opções exclusivas (radiogroup): uma opção por vez, navegação por setas, foco visível.
 * Usado nas respostas Conforme / Não conforme / Não se aplica, na pendência e na nota do setor.
 */
export default function SegmentoResposta5S({
  opcoes,
  value,
  onChange,
  ariaLabelledBy,
  dataField,
  colunas,
  compacto = false,
}: SegmentoResposta5SProps) {
  const botoes = useRef<(HTMLButtonElement | null)[]>([])
  // Roving tabindex: só a opção marcada (ou a primeira, sem resposta) entra na ordem do Tab
  const indiceTab = Math.max(0, opcoes.findIndex((o) => o.value === value))

  const aoTeclar = (e: KeyboardEvent<HTMLButtonElement>, indice: number) => {
    const passo = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (passo === 0) return
    e.preventDefault()
    const proximo = (indice + passo + opcoes.length) % opcoes.length
    onChange(opcoes[proximo].value)
    botoes.current[proximo]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={ariaLabelledBy}
      data-field={dataField}
      className={`grid ${COLUNAS[colunas ?? opcoes.length] ?? 'grid-cols-3'} ${compacto ? 'gap-1.5' : 'gap-2'}`}
    >
      {opcoes.map((opcao, i) => {
        const marcada = opcao.value === value
        return (
          <button
            key={opcao.value}
            ref={(el) => {
              botoes.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={marcada}
            aria-label={opcao.descricao}
            tabIndex={i === indiceTab ? 0 : -1}
            onClick={() => onChange(opcao.value)}
            onKeyDown={(e) => aoTeclar(e, i)}
            className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl border-2 px-1.5 text-center leading-tight transition-colors active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-400/70 ${
              compacto ? '!min-h-[48px] !min-w-0' : '!min-h-[52px] !min-w-0 flex-col sm:flex-row'
            } ${
              marcada ? SELECIONADO[opcao.tom] : 'border-gray-400 bg-white text-gray-800 hover:bg-gray-50'
            }`}
          >
            {opcao.icone && (
              <span aria-hidden="true" className={`flex-shrink-0 ${marcada ? '' : ICONE_LIVRE[opcao.tom]}`}>
                {opcao.icone}
              </span>
            )}
            <span className={`${compacto ? 'text-base' : 'text-[13px]'} font-extrabold tracking-tight`}>{opcao.label}</span>
          </button>
        )
      })}
    </div>
  )
}

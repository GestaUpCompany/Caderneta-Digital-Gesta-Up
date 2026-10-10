import { useSearchParams } from 'react-router-dom'
import PastagensPastoForm from './PastagensPastoForm'
import PastagensCurralForm from './PastagensCurralForm'

type Modo = 'pasto' | 'curral'

const OPCOES: { value: Modo; label: string }[] = [
  { value: 'pasto', label: 'Pastos' },
  { value: 'curral', label: 'Currais' },
]

/**
 * Manejo de lotes: a mesma tela atende pastos e currais. O seletor no topo escolhe o modo;
 * cada modo tem formulário, rascunho e store próprios, então trocar de modo não perde o que
 * foi digitado no outro (o rascunho volta com o banner de confirmação).
 */
export default function PastagensPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const modo: Modo = searchParams.get('modo') === 'curral' ? 'curral' : 'pasto'

  const trocarModo = (novo: Modo) => {
    if (novo === modo) return
    setSearchParams(novo === 'curral' ? { modo: 'curral' } : {}, { replace: true })
    window.scrollTo({ top: 0 })
  }

  const seletor = (
    <div role="tablist" aria-label="O que você vai manejar?" className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-gray-200 p-1">
      {OPCOES.map((op) => {
        const ativo = op.value === modo
        return (
          <button
            key={op.value}
            type="button"
            role="tab"
            aria-selected={ativo}
            data-field={`modo-${op.value}`}
            onClick={() => trocarModo(op.value)}
            className={`min-h-[48px] rounded-xl text-sm font-extrabold uppercase tracking-wide transition-colors active:scale-[0.99] ${
              ativo ? 'bg-brand-900 text-white shadow' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {op.label}
          </button>
        )
      })}
    </div>
  )

  return modo === 'curral' ? <PastagensCurralForm seletor={seletor} /> : <PastagensPastoForm seletor={seletor} />
}

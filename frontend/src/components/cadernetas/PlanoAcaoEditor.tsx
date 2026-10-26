import { ClipboardList, Plus, Trash2 } from 'lucide-react'
import type { MedidaPlano5S } from '../../utils/pendencias5s'

interface PlanoAcaoEditorProps {
  medidas: MedidaPlano5S[]
  onChange: (medidas: MedidaPlano5S[]) => void
  onRemover: () => void
  dataField: string
}

export const novaMedida = (): MedidaPlano5S => ({
  id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
  descricao: '',
  responsavel: null,
  prazo: null,
  concluida: false,
  concluida_em: null,
})

const CAMPO =
  '!min-h-[48px] w-full rounded-lg border-2 border-gray-400 bg-white px-3 text-base text-gray-900 placeholder:text-gray-400 focus-visible:border-blue-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300/60'
const ROTULO = 'mb-1 block text-sm font-bold text-gray-800'

// Plano de ação de um item não conforme: medidas para resolver o problema, com responsável, prazo e conclusão.
export default function PlanoAcaoEditor({ medidas, onChange, onRemover, dataField }: PlanoAcaoEditorProps) {
  const atualizar = (id: string, parcial: Partial<MedidaPlano5S>) =>
    onChange(medidas.map((m) => (m.id === id ? { ...m, ...parcial } : m)))

  const alternarConclusao = (medida: MedidaPlano5S) =>
    atualizar(medida.id, {
      concluida: !medida.concluida,
      concluida_em: medida.concluida ? null : new Date().toISOString(),
    })

  const concluidas = medidas.filter((m) => m.concluida).length

  return (
    <section data-field={dataField} aria-label="Plano de ação" className="flex flex-col gap-3 rounded-xl border-2 border-blue-200 bg-blue-50/60 p-3">
      <div>
        <h3 className="flex items-center gap-2 text-base font-extrabold text-blue-950">
          <ClipboardList className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          Plano de ação
        </h3>
        <p className="mt-0.5 text-sm text-gray-700">
          O que será feito para resolver. {concluidas}/{medidas.length} {medidas.length === 1 ? 'medida concluída' : 'medidas concluídas'}.
        </p>
      </div>

      {medidas.map((m, i) => (
        <div
          key={m.id}
          className={`flex flex-col gap-2.5 rounded-xl border-2 p-3 ${m.concluida ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white'}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wide text-gray-600">Medida {i + 1}</span>
            <button
              type="button"
              onClick={() => onChange(medidas.filter((x) => x.id !== m.id))}
              aria-label={`Remover a medida ${i + 1}`}
              className="flex !min-h-[44px] !min-w-[44px] items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gray-300"
            >
              <Trash2 className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <label>
            <span className={ROTULO}>O que fazer</span>
            <input
              type="text"
              placeholder="Ex.: retirar os pneus"
              value={m.descricao}
              onChange={(e) => atualizar(m.id, { descricao: e.target.value })}
              className={CAMPO}
            />
          </label>

          <div className="grid grid-cols-1 gap-2.5 min-[420px]:grid-cols-2">
            <label>
              <span className={ROTULO}>Quem</span>
              <input
                type="text"
                placeholder="Responsável"
                value={m.responsavel ?? ''}
                onChange={(e) => atualizar(m.id, { responsavel: e.target.value || null })}
                className={CAMPO}
              />
            </label>
            <label>
              <span className={ROTULO}>Até quando</span>
              <input type="date" value={m.prazo ?? ''} onChange={(e) => atualizar(m.id, { prazo: e.target.value || null })} className={CAMPO} />
            </label>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-gray-50 px-3 !min-h-[48px]">
            <input type="checkbox" checked={m.concluida} onChange={() => alternarConclusao(m)} className="h-6 w-6 !min-h-0 accent-green-700" />
            <span className="text-sm font-bold text-gray-900">Medida concluída</span>
          </label>
        </div>
      ))}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange([...medidas, novaMedida()])}
          aria-label="Adicionar outra medida ao plano"
          className="flex !min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-blue-400 bg-white px-3 text-sm font-extrabold text-blue-900 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-300/70"
        >
          <Plus className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
          Nova medida
        </button>
        <button
          type="button"
          onClick={onRemover}
          className="flex !min-h-[48px] items-center justify-center rounded-xl border-2 border-red-300 bg-white px-3 text-sm font-extrabold text-red-700 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300/70"
        >
          Remover plano
        </button>
      </div>
    </section>
  )
}

import { Plus, Trash2 } from 'lucide-react'
import { Input } from '../ui'
import Stepper from './Stepper'
import InfoStrip from './InfoStrip'
import {
  REFEICOES_MARMITA,
  empresaVazia,
  paraDetalhe,
  totaisDetalhe,
  type CampoRefeicaoMarmita,
  type GradeMarmitasForm,
} from '../../utils/cantinaMarmitas'

interface GradeMarmitasProps {
  grade: GradeMarmitasForm
  onChange: (grade: GradeMarmitasForm) => void
  /** Empresas já usadas nesta fazenda (sugestões do campo de empresa) */
  sugestoes: string[]
  error?: string
}

const LISTA_SUGESTOES_ID = 'empresas-terceirizadas-marmita'

// Quantidades de marmita por refeição: uma parte para funcionários (interna) e uma parte por
// empresa terceirizada. Cartões em vez de tabela para caber em 320 px.
export default function GradeMarmitas({ grade, onChange, sugestoes, error }: GradeMarmitasProps) {
  const totais = totaisDetalhe(paraDetalhe(grade))

  const setInterna = (campo: CampoRefeicaoMarmita, valor: string) =>
    onChange({ ...grade, interna: { ...grade.interna, [campo]: valor } })

  const setEmpresa = (id: string, patch: Partial<GradeMarmitasForm['terceirizadas'][number]>) =>
    onChange({ ...grade, terceirizadas: grade.terceirizadas.map((t) => (t.id === id ? { ...t, ...patch } : t)) })

  const adicionarEmpresa = () => onChange({ ...grade, terceirizadas: [...grade.terceirizadas, empresaVazia()] })
  const removerEmpresa = (id: string) => onChange({ ...grade, terceirizadas: grade.terceirizadas.filter((t) => t.id !== id) })

  return (
    <div className="flex flex-col gap-4" data-field="marmitasDetalhe" id="marmitasDetalhe">
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-2 min-[360px]:p-3">
        <p className="mb-1 text-sm font-extrabold uppercase text-gray-900">🧑‍🌾 Funcionários (interna)</p>
        {REFEICOES_MARMITA.map(({ campo, label, icone }) => (
          <div key={campo} className="flex items-center gap-2 border-b border-gray-100 py-2 last:border-b-0">
            <span className="hidden h-9 w-9 shrink-0 items-center justify-center text-2xl leading-none min-[360px]:flex">{icone}</span>
            <p className="min-w-0 flex-1 text-[15px] font-bold leading-tight text-gray-900 min-[360px]:text-base">{label}</p>
            <Stepper compact valor={grade.interna[campo]} onChange={(v) => setInterna(campo, v)} nome={`${label} (interna)`} />
          </div>
        ))}
      </div>

      {grade.terceirizadas.map((linha, indice) => (
        <div key={linha.id} className="rounded-2xl border-2 border-amber-200 bg-amber-50/40 p-2 min-[360px]:p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-extrabold uppercase text-gray-900">🏗️ Terceirizada {indice + 1}</p>
            <button
              type="button"
              onClick={() => removerEmpresa(linha.id)}
              aria-label={`Remover empresa terceirizada ${indice + 1}`}
              className="flex !min-h-0 h-9 w-9 items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-gray-600 active:scale-95"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <Input
            label={<span>EMPRESA <span className="text-red-500">*</span></span>}
            placeholder="Nome da empresa terceirizada"
            value={linha.empresa}
            list={LISTA_SUGESTOES_ID}
            autoComplete="off"
            onChange={(e) => setEmpresa(linha.id, { empresa: e.target.value })}
          />
          {REFEICOES_MARMITA.map(({ campo, label, icone }) => (
            <div key={campo} className="flex items-center gap-2 border-b border-amber-100 py-2 last:border-b-0">
              <span className="hidden h-9 w-9 shrink-0 items-center justify-center text-2xl leading-none min-[360px]:flex">{icone}</span>
              <p className="min-w-0 flex-1 text-[15px] font-bold leading-tight text-gray-900 min-[360px]:text-base">{label}</p>
              <Stepper
                compact
                valor={linha[campo]}
                onChange={(v) => setEmpresa(linha.id, { [campo]: v })}
                nome={`${label} (terceirizada ${indice + 1})`}
              />
            </div>
          ))}
        </div>
      ))}

      <datalist id={LISTA_SUGESTOES_ID}>
        {sugestoes.map((nome) => (
          <option key={nome} value={nome} />
        ))}
      </datalist>

      <button
        type="button"
        onClick={adicionarEmpresa}
        className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-sm font-extrabold uppercase tracking-wide text-gray-800 transition-colors hover:bg-gray-100 active:scale-[0.99]"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        Adicionar empresa terceirizada
      </button>

      {error && <p className="text-base font-semibold text-red-700">{error}</p>}

      {totais.geral > 0 && (
        <InfoStrip tone="success">
          {totais.internas} {totais.internas === 1 ? 'interna' : 'internas'} · {totais.terceirizadas}{' '}
          {totais.terceirizadas === 1 ? 'terceirizada' : 'terceirizadas'} · total {totais.geral}
        </InfoStrip>
      )}
    </div>
  )
}

import { BarChart3 } from 'lucide-react'
import { IntervaloTrato, dataSemHoraUTC } from '../../utils/supplementMetrics'

interface RegistroHistorico {
  id?: string
  data: string
  kg_cocho: number | null
  leitura?: string | null
  escore_fezes?: string | null
  escopo?: string | null
}

interface HistoricoSuplementacaoModalProps {
  aberto: boolean
  onFechar: () => void
  nomeLote: string
  /** tratos do lote, mais recente primeiro */
  registros: RegistroHistorico[]
  /** intervalos da serie adulta (kg/cab por dia de cada trato) */
  intervalos: IntervaloTrato[]
}

const fmtKg = (v: number) =>
  v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })

const fmtKgCab = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const fmtData = (data: string) => {
  const d = dataSemHoraUTC(data)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * Modal com o historico de tratos do lote (ultimos registros): data, kg
 * fornecido, kg/cab do intervalo aberto por aquele trato, leitura do cocho
 * e escore de fezes. Dados vem do cache offline do lote.
 */
export default function HistoricoSuplementacaoModal({
  aberto,
  onFechar,
  nomeLote,
  registros,
  intervalos,
}: HistoricoSuplementacaoModalProps) {
  if (!aberto) return null

  const kgCabDoTrato = (reg: RegistroHistorico): number | null => {
    if ((reg.escopo || 'lote') === 'creep' || reg.kg_cocho == null) return null
    const inicio = dataSemHoraUTC(reg.data).getTime()
    const intervalo = intervalos.find((i) => i.inicio.getTime() === inicio)
    return intervalo ? intervalo.consumoDiarioPorAnimal : null
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onFechar}
    >
      <div
        className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <BarChart3 className="h-10 w-10 text-brand-700 mx-auto shrink-0" />
        <h3 className="text-lg font-black text-gray-900 mt-2 text-center">
          Histórico do lote
        </h3>
        <p className="text-sm text-gray-600 mt-1 text-center">
          {nomeLote} · últimos tratos registrados
        </p>

        <div className="mt-4 flex-1 overflow-y-auto flex flex-col gap-2 min-h-0">
          {registros.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-500">
              Nenhum trato registrado para este lote.
            </p>
          )}
          {registros.map((reg, idx) => {
            const kgCab = kgCabDoTrato(reg)
            const isCreep = (reg.escopo || 'lote') === 'creep'
            return (
              <div
                key={reg.id ?? idx}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-extrabold text-gray-900">{fmtData(reg.data)}</span>
                  {isCreep && (
                    <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-800">
                      Creep
                    </span>
                  )}
                  <span className="text-sm font-extrabold text-brand-700">
                    {reg.kg_cocho != null ? `${fmtKg(reg.kg_cocho)} kg` : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
                  {kgCab != null && <span>{fmtKgCab(kgCab)} kg/cab/dia</span>}
                  {reg.leitura != null && reg.leitura !== '' && <span>Cocho {reg.leitura}</span>}
                  {reg.escore_fezes != null && reg.escore_fezes !== '' && <span>Fezes {reg.escore_fezes}</span>}
                </div>
              </div>
            )
          })}
        </div>

        <button
          onClick={onFechar}
          className="mt-4 w-full shrink-0 font-bold px-4 py-3 rounded-2xl border-2 border-gray-300 text-gray-700 bg-gray-100 active:bg-gray-200"
        >
          FECHAR
        </button>
      </div>
    </div>
  )
}

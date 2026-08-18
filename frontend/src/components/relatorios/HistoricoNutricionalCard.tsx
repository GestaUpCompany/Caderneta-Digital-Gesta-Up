import type { PlanoNutricional } from '../../types/relatorioLote'
import { formatarDataBR } from '../../utils/formatDate'

interface Props {
  historico: PlanoNutricional[]
}

export default function HistoricoNutricionalCard({ historico }: Props) {
  if (!historico || historico.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-gray-500 font-semibold">Sem plano nutricional registrado</p>
      </div>
    )
  }

  return (
    <div className="py-2 flex flex-col gap-2">
      {historico.map((plano, i) => (
        <div key={i} className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-900 font-bold">{plano.nome || 'Plano sem nome'}</p>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                plano.ativo
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {plano.ativo ? 'Ativo' : 'Encerrado'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Formulação: </span>
              <span className="text-gray-900 font-bold">{plano.formulacao_nome || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">Período: </span>
              <span className="text-gray-900 font-bold">
                {plano.periodo_dias ? `${plano.periodo_dias} dias` : '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Início: </span>
              <span className="text-gray-900 font-bold">{formatarDataBR(plano.data_inicio)}</span>
            </div>
            <div>
              <span className="text-gray-500">Fim: </span>
              <span className="text-gray-900 font-bold">{formatarDataBR(plano.data_fim)}</span>
            </div>
            <div>
              <span className="text-gray-500">Peso meta: </span>
              <span className="text-gray-900 font-bold">
                {plano.peso_meta_kg ? `${plano.peso_meta_kg} kg` : '—'}
              </span>
            </div>
          </div>

          {plano.snapshots && plano.snapshots.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-gray-500 font-semibold text-xs uppercase mb-2">Avaliações</p>
              {plano.snapshots.map((s, j) => (
                <div key={j} className="text-sm mb-2 last:mb-0">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-500">GMD realizado: </span>
                      <span className="text-gray-900 font-bold">
                        {s.gmd_realizado !== null ? `${s.gmd_realizado} kg/dia` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">GMD planejado: </span>
                      <span className="text-gray-900 font-bold">
                        {s.gmd_planejado !== null ? `${s.gmd_planejado} kg/dia` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Ganho total: </span>
                      <span className="text-gray-900 font-bold">
                        {s.ganho_peso_total_kg_cab !== null ? `${s.ganho_peso_total_kg_cab} kg/cab` : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Produção: </span>
                      <span className="text-gray-900 font-bold">
                        {s.producao_arroba_lote !== null ? `${s.producao_arroba_lote} @` : '—'}
                      </span>
                    </div>
                  </div>
                  {s.motivo_migracao && (
                    <p className="text-xs text-gray-500 mt-1">Migração: {s.motivo_migracao}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

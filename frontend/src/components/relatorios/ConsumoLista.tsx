import type { ConsumoSuplementacao } from '../../types/relatorioLote'

interface Props {
  consumo: ConsumoSuplementacao[]
}

export default function ConsumoLista({ consumo }: Props) {
  if (!consumo || consumo.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-gray-500 font-semibold">Sem registro de consumo</p>
      </div>
    )
  }

  return (
    <div className="py-2 flex flex-col gap-2">
      {consumo.map((c, i) => (
        <div key={i} className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-500 text-xs">{c.data}</span>
            {c.formulacao && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold truncate max-w-[60%]">
                {c.formulacao}
              </span>
            )}
          </div>
          <div className="text-sm grid grid-cols-2 gap-1">
            <div>
              <span className="text-gray-500">Leitura: </span>
              <span className="text-gray-900 font-bold">{c.leitura ?? '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">KG cocho: </span>
              <span className="text-gray-900 font-bold">{c.kg_cocho ?? '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">Cabeças: </span>
              <span className="text-gray-900 font-bold">{c.n_cabecas ?? '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">Peso vivo: </span>
              <span className="text-gray-900 font-bold">
                {c.peso_vivo_kg !== null ? `${c.peso_vivo_kg} kg` : '—'}
              </span>
            </div>
            {c.consumo_medio_geral_percent_pv !== null && (
              <div>
                <span className="text-gray-500">Consumo %PV: </span>
                <span className="text-gray-900 font-bold">
                  {c.consumo_medio_geral_percent_pv.toFixed(2)}%
                </span>
              </div>
            )}
            {c.consumo_medio_geral_kg_ms !== null && (
              <div>
                <span className="text-gray-500">Consumo/dia: </span>
                <span className="text-gray-900 font-bold">
                  {c.consumo_medio_geral_kg_ms.toFixed(2)} kg MS
                </span>
              </div>
            )}
            {c.custo_medio_reais_cab_dia !== null && (
              <div>
                <span className="text-gray-500">Custo/dia: </span>
                <span className="text-gray-900 font-bold">
                  R$ {c.custo_medio_reais_cab_dia.toFixed(2)}
                </span>
              </div>
            )}
            {c.escore_fezes && (
              <div>
                <span className="text-gray-500">Escore fezes: </span>
                <span className="text-gray-900 font-bold">{c.escore_fezes}</span>
              </div>
            )}
            {c.tratador && (
              <div className="col-span-2">
                <span className="text-gray-500">Tratador: </span>
                <span className="text-gray-900 font-bold">{c.tratador}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

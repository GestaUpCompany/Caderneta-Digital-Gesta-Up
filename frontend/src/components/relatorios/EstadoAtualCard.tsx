import type { EstadoAtualLote } from '../../types/relatorioLote'
import { formatarDataBR } from '../../utils/formatDate'

interface Props {
  estado: EstadoAtualLote
}

export default function EstadoAtualCard({ estado }: Props) {
  if (!estado.categorias_ativas || estado.categorias_ativas.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-gray-500 font-semibold">Nenhuma categoria ativa</p>
      </div>
    )
  }

  return (
    <div className="py-2 flex flex-col gap-2">
      <div className="bg-white rounded-lg p-3 border border-gray-200">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-gray-500 font-semibold text-sm uppercase">Cabeças totais</p>
            <p className="text-[#3b82f6] font-bold text-lg">{estado.cabecas_totais} animais</p>
          </div>
          <div>
            <p className="text-gray-500 font-semibold text-sm uppercase">Peso médio</p>
            <p className="text-gray-900 font-bold text-lg">
              {estado.peso_medio_ponderado ? `${estado.peso_medio_ponderado.toFixed(1)} kg` : '—'}
            </p>
          </div>
        </div>
      </div>

      {estado.categorias_ativas.map((cat, i) => (
        <div key={i} className="bg-white rounded-lg p-3 border border-gray-200">
          <p className="text-gray-900 font-bold capitalize mb-2">{cat.categoria}</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Cabeças: </span>
              <span className="text-gray-900 font-bold">{cat.quant_atual ?? '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">GMD: </span>
              <span className="text-gray-900 font-bold">{cat.gmd ? `${cat.gmd} kg/dia` : '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">Peso atual: </span>
              <span className="text-gray-900 font-bold">
                {cat.peso_vivo_atual_kg ? `${cat.peso_vivo_atual_kg} kg` : '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Peso entrada: </span>
              <span className="text-gray-900 font-bold">
                {cat.peso_entrada_kg ? `${cat.peso_entrada_kg} kg` : '—'}
              </span>
            </div>
            {cat.data_meta_projetada && (
              <div className="col-span-2">
                <span className="text-gray-500">Meta projetada: </span>
                <span className="text-gray-900 font-bold">{formatarDataBR(cat.data_meta_projetada)}</span>
                {cat.dias_restantes_meta !== null && (
                  <span className="text-gray-500 ml-1">({cat.dias_restantes_meta} dias)</span>
                )}
              </div>
            )}
            {((cat.morte ?? 0) > 0 || (cat.abate ?? 0) > 0 || (cat.transf_entrada ?? 0) > 0 || (cat.transf_saida ?? 0) > 0) && (
              <div className="col-span-2 flex flex-wrap gap-2 mt-1">
                {(cat.morte ?? 0) > 0 && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                    ⚰️ {cat.morte} mortes
                  </span>
                )}
                {(cat.abate ?? 0) > 0 && (
                  <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                    🐄 {cat.abate} abates
                  </span>
                )}
                {(cat.transf_entrada ?? 0) > 0 && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                    ↗️ {cat.transf_entrada} entradas
                  </span>
                )}
                {(cat.transf_saida ?? 0) > 0 && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">
                    ↘️ {cat.transf_saida} saídas
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

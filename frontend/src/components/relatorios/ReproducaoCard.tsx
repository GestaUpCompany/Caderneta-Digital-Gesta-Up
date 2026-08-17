import type { ReproducaoLote } from '../../types/relatorioLote'

interface Props {
  reproducao: ReproducaoLote
}

export default function ReproducaoCard({ reproducao }: Props) {
  if (!reproducao || reproducao.total_partos === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-gray-500 font-semibold">Nenhum nascimento registrado</p>
      </div>
    )
  }

  return (
    <div className="py-2 flex flex-col gap-2">
      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
        <p className="text-gray-500 font-semibold text-xs uppercase">Total de partos</p>
        <p className="text-blue-700 font-bold text-xl">{reproducao.total_partos}</p>
      </div>

      {reproducao.linhas.map((p, i) => (
        <div key={i} className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-500 text-xs">{p.data}</span>
            {p.tipo_parto && p.tipo_parto.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {p.tipo_parto.map((tp, j) => (
                  <span
                    key={j}
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      tp === 'Normal'
                        ? 'bg-green-100 text-green-700'
                        : tp === 'Cesárea'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {tp}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="text-sm grid grid-cols-2 gap-1">
            <div>
              <span className="text-gray-500">Sexo da cria: </span>
              <span className="text-gray-900 font-bold">{p.sexo_cria || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">Raça: </span>
              <span className="text-gray-900 font-bold">{p.raca || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">Peso: </span>
              <span className="text-gray-900 font-bold">
                {p.peso_cria_kg !== null ? `${p.peso_cria_kg} kg` : '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Escore matriz: </span>
              <span className="text-gray-900 font-bold">{p.escore_matriz || '—'}</span>
            </div>
            {p.id_brinco_mae && (
              <div>
                <span className="text-gray-500">Brinco mãe: </span>
                <span className="text-gray-900 font-bold">{p.id_brinco_mae}</span>
              </div>
            )}
            {p.id_brinco_cria && (
              <div>
                <span className="text-gray-500">Brinco cria: </span>
                <span className="text-gray-900 font-bold">{p.id_brinco_cria}</span>
              </div>
            )}
            {p.nome_usuario && (
              <div className="col-span-2">
                <span className="text-gray-500">Por: </span>
                <span className="text-gray-900 font-bold">{p.nome_usuario}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

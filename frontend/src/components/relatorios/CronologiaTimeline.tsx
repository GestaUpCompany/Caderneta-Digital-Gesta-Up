import type { CronologiaCategorias } from '../../types/relatorioLote'

interface Props {
  cronologia: CronologiaCategorias
}

export default function CronologiaTimeline({ cronologia }: Props) {
  const { transicoes, categorias_encerradas } = cronologia
  const temDados = (transicoes && transicoes.length > 0) || (categorias_encerradas && categorias_encerradas.length > 0)

  if (!temDados) {
    return (
      <div className="py-4 text-center">
        <p className="text-gray-500 font-semibold">Nenhuma troca de categoria registrada</p>
      </div>
    )
  }

  return (
    <div className="py-2 flex flex-col gap-3">
      {transicoes && transicoes.length > 0 && (
        <div>
          <p className="text-gray-500 font-semibold text-xs uppercase mb-2">Trocas de categoria</p>
          <div className="relative pl-6">
            <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-green-300" />
            {transicoes.map((t, i) => (
              <div key={i} className="relative mb-4 last:mb-0">
                <div className="absolute -left-4 top-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                <div className="bg-white rounded-lg p-3 border border-gray-200">
                  <p className="text-gray-500 text-xs">{t.data_transicao}</p>
                  <p className="text-gray-900 font-bold mt-1">
                    <span className="capitalize">{t.categoria_origem || '?'}</span>
                    <span className="text-gray-400 mx-1">→</span>
                    <span className="capitalize text-green-700">{t.categoria_destino || '?'}</span>
                  </p>
                  {t.peso_na_transicao_kg !== null && (
                    <p className="text-sm text-gray-600 mt-1">
                      Peso na transição: <span className="font-bold">{t.peso_na_transicao_kg} kg</span>
                    </p>
                  )}
                  {t.motivo && (
                    <p className="text-xs text-gray-500 mt-1">Motivo: {t.motivo}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {categorias_encerradas && categorias_encerradas.length > 0 && (
        <div>
          <p className="text-gray-500 font-semibold text-xs uppercase mb-2">Categorias encerradas</p>
          {categorias_encerradas.map((c, i) => (
            <div key={i} className="bg-white rounded-lg p-3 border border-gray-200 mb-2">
              <p className="text-gray-900 font-bold capitalize">{c.categoria}</p>
              <div className="grid grid-cols-2 gap-2 text-sm mt-1">
                <div>
                  <span className="text-gray-500">Início: </span>
                  <span className="text-gray-900 font-bold">{c.data_inicio}</span>
                </div>
                <div>
                  <span className="text-gray-500">Fim: </span>
                  <span className="text-gray-900 font-bold">{c.data_fim}</span>
                </div>
                <div>
                  <span className="text-gray-500">Cabeças inicial: </span>
                  <span className="text-gray-900 font-bold">{c.quant_inicial ?? '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Cabeças final: </span>
                  <span className="text-gray-900 font-bold">{c.quant_atual ?? '—'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

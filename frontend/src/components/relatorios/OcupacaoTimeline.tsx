import type { OcupacaoHistorico } from '../../types/relatorioLote'

interface Props {
  ocupacao: OcupacaoHistorico[]
}

function calcularDias(entrada: string | null, saida: string | null): number | null {
  if (!entrada) return null
  const dEntrada = new Date(entrada)
  const dSaida = saida ? new Date(saida) : new Date()
  const diff = Math.floor((dSaida.getTime() - dEntrada.getTime()) / (1000 * 60 * 60 * 24))
  return diff >= 0 ? diff : null
}

export default function OcupacaoTimeline({ ocupacao }: Props) {
  if (!ocupacao || ocupacao.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-gray-500 font-semibold">Sem registro de ocupação de pastos</p>
      </div>
    )
  }

  return (
    <div className="py-2 flex flex-col gap-2">
      {ocupacao.map((item, i) => {
        const dias = calcularDias(item.data_entrada, item.data_saida)
        const isOcupado = !item.data_saida
        return (
          <div
            key={i}
            className={`bg-white rounded-lg p-3 border ${
              isOcupado ? 'border-green-300' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-gray-900 font-bold flex items-center gap-1.5">
                📍 {item.pasto_nome || '—'}
              </p>
              {isOcupado && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                  Ocupado agora
                </span>
              )}
            </div>
            <div className="text-sm grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-500">Entrada: </span>
                <span className="text-gray-900 font-bold">
                  {item.data_entrada ? item.data_entrada.split(' ')[0] : '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Saída: </span>
                <span className="text-gray-900 font-bold">
                  {item.data_saida ? item.data_saida.split(' ')[0] : '—'}
                </span>
              </div>
              {dias !== null && (
                <div className="col-span-2">
                  <span className="text-gray-500">Tempo: </span>
                  <span className="text-gray-900 font-bold">{dias} dias</span>
                </div>
              )}
              {item.area_util_ha !== null && (
                <div>
                  <span className="text-gray-500">Área: </span>
                  <span className="text-gray-900 font-bold">{item.area_util_ha} ha</span>
                </div>
              )}
              {item.taxa_lotacao_ua_ha !== null && (
                <div>
                  <span className="text-gray-500">Lotação: </span>
                  <span className="text-gray-900 font-bold">
                    {item.taxa_lotacao_ua_ha.toFixed(2)} UA/ha
                  </span>
                </div>
              )}
              {item.cabecas_entrada !== null && (
                <div>
                  <span className="text-gray-500">Cab. entrada: </span>
                  <span className="text-gray-900 font-bold">{item.cabecas_entrada}</span>
                </div>
              )}
              {item.cabecas_saida !== null && (
                <div>
                  <span className="text-gray-500">Cab. saída: </span>
                  <span className="text-gray-900 font-bold">{item.cabecas_saida}</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

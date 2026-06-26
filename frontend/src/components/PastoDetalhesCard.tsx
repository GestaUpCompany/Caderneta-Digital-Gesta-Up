interface OcupacaoMetrics {
  metaDias?: number | null
  periodoDias?: number | null
  periodoHoras?: number | null
  desvioPercentual?: number | null
  diasAcimaMeta?: number | null
  taxaLotacao?: number | null
  metaExcedida?: boolean | null
}

interface PastoDetalhesCardProps {
  detalhes: {
    areaUtil: string
    especie: string
    alturaSaida?: string
    alturaEntrada?: string
  }
  tipo?: 'saida' | 'entrada'
  tempo?: string
  ocupacao?: OcupacaoMetrics | null
}

export default function PastoDetalhesCard({ detalhes, tipo, tempo, ocupacao }: PastoDetalhesCardProps) {
  const altura = tipo === 'saida' ? detalhes.alturaSaida : detalhes.alturaEntrada
  const alturaLabel = tipo === 'saida' ? 'ALTURA SAÍDA' : tipo === 'entrada' ? 'ALTURA ENTRADA' : 'ALTURA'
  const tempoLabel = tipo === 'saida' ? 'TEMPO OCUPAÇÃO' : tipo === 'entrada' ? 'TEMPO VEDAÇÃO' : 'TEMPO'

  const formatDiasHoras = (dias?: number | null, horas?: number | null) => {
    if (dias == null || horas == null) return '—'
    const d = Math.floor(dias)
    const h = Math.round(horas % 24)
    return `${d} dias${h > 0 ? `/${h} horas` : ''}`
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="grid grid-cols-2 gap-2 text-base">
        <div>
          <p className="text-gray-500 font-semibold">ÁREA ÚTIL</p>
          <p className="text-gray-900 font-bold">{detalhes.areaUtil} ha</p>
        </div>
        <div>
          <p className="text-gray-500 font-semibold">{alturaLabel}</p>
          <p className="text-gray-900 font-bold">{altura} cm</p>
        </div>
        <div className="col-span-2">
          <p className="text-gray-500 font-semibold">ESPÉCIE</p>
          <p className="text-gray-900 font-bold">{detalhes.especie}</p>
        </div>
        {tempo && (
          <div className="col-span-2">
            <p className="text-gray-500 font-semibold">{tempoLabel}</p>
            <p className="text-[#3b82f6] font-bold">{tempo}</p>
          </div>
        )}
        {ocupacao && (
          <>
            {ocupacao.metaDias != null ? (
              <>
                <div>
                  <p className="text-gray-500 font-semibold">META OCUPAÇÃO</p>
                  <p className="text-gray-900 font-bold">{ocupacao.metaDias} dias</p>
                </div>
                <div>
                  <p className="text-gray-500 font-semibold">PERÍODO OCUPAÇÃO</p>
                  <p className="text-gray-900 font-bold">{formatDiasHoras(ocupacao.periodoDias, ocupacao.periodoHoras)}</p>
                </div>
                {ocupacao.metaExcedida && ocupacao.desvioPercentual != null && (
                  <div>
                    <p className="text-gray-500 font-semibold">DESVIO</p>
                    <p className="text-red-600 font-bold">
                      {`+${ocupacao.desvioPercentual}%`}
                    </p>
                  </div>
                )}
                {ocupacao.diasAcimaMeta != null && ocupacao.diasAcimaMeta > 0 && (
                  <div>
                    <p className="text-gray-500 font-semibold">DIAS ACIMA META</p>
                    <p className="text-red-600 font-bold">{ocupacao.diasAcimaMeta} dias</p>
                  </div>
                )}
                {ocupacao.taxaLotacao != null && (
                  <div className="col-span-2">
                    <p className="text-gray-500 font-semibold">TAXA LOTAÇÃO</p>
                    <p className="text-gray-900 font-bold">{ocupacao.taxaLotacao} UA/ha</p>
                  </div>
                )}
              </>
            ) : (
              <div className="col-span-2">
                <p className="text-gray-500 font-semibold">META OCUPAÇÃO</p>
                <p className="text-amber-600 font-bold">Não há meta definida para calcular métricas</p>
                {ocupacao.taxaLotacao != null && (
                  <>
                    <p className="text-gray-500 font-semibold mt-1">TAXA LOTAÇÃO</p>
                    <p className="text-gray-900 font-bold">{ocupacao.taxaLotacao} UA/ha</p>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

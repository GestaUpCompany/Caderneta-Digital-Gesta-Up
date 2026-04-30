interface PastoDetalhesCardProps {
  detalhes: {
    areaUtil: string
    especie: string
    alturaSaida?: string
    alturaEntrada?: string
  }
  tipo?: 'saida' | 'entrada'
  tempo?: string
}

export default function PastoDetalhesCard({ detalhes, tipo, tempo }: PastoDetalhesCardProps) {
  const altura = detalhes.alturaSaida || detalhes.alturaEntrada
  const alturaLabel = tipo === 'saida' ? 'ALTURA SAÍDA' : tipo === 'entrada' ? 'ALTURA ENTRADA' : 'ALTURA'
  const tempoLabel = tipo === 'saida' ? 'TEMPO OCUPAÇÃO' : tipo === 'entrada' ? 'TEMPO VEDAÇÃO' : 'TEMPO'

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="grid grid-cols-2 gap-2 text-base">
        <div>
          <p className="text-gray-500 font-semibold">ÁREA ÚTIL</p>
          <p className="text-gray-900 font-bold">{detalhes.areaUtil} ha</p>
        </div>
        <div>
          <p className="text-gray-500 font-semibold">ESPÉCIE</p>
          <p className="text-gray-900 font-bold">{detalhes.especie}</p>
        </div>
        <div className="col-span-2">
          <p className="text-gray-500 font-semibold">{alturaLabel}</p>
          <p className="text-gray-900 font-bold">{altura} cm</p>
        </div>
        {tempo && (
          <div className="col-span-2">
            <p className="text-gray-500 font-semibold">{tempoLabel}</p>
            <p className="text-[#3b82f6] font-bold">{tempo}</p>
          </div>
        )}
      </div>
    </div>
  )
}

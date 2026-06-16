interface FormulacaoDetalhesCardProps {
  detalhes: {
    teorMs?: number | null
    metaConsumo?: number | null
  }
}

export default function FormulacaoDetalhesCard({ detalhes }: FormulacaoDetalhesCardProps) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col gap-3 text-base">
      <div>
        <p className="text-gray-500 font-semibold">TEOR MS (%)</p>
        <p className="text-gray-900 font-bold">
          {detalhes.teorMs !== null && detalhes.teorMs !== undefined
            ? `${detalhes.teorMs}%`
            : '-'}
        </p>
      </div>
      <div>
        <p className="text-gray-500 font-semibold">META CONSUMO (%/PV)</p>
        <p className="text-gray-900 font-bold">
          {detalhes.metaConsumo !== null && detalhes.metaConsumo !== undefined
            ? `${detalhes.metaConsumo}%`
            : '-'}
        </p>
      </div>
    </div>
  )
}

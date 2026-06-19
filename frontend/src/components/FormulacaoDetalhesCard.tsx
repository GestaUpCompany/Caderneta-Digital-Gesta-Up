interface FormulacaoDetalhesCardProps {
  detalhes: {
    teorMs?: number | null
    metaConsumo?: number | null
    consumoMedioGeralPercentPV?: number | null
    consumoMedio30DiasPercentPV?: number | null
    consumoMedioGeralKgMN?: number | null
    consumoMedio30DiasKgMN?: number | null
    custoMedioReaisCabDia?: number | null
  }
}

export default function FormulacaoDetalhesCard({ detalhes }: FormulacaoDetalhesCardProps) {
  const formatNumber = (value: number | null | undefined, decimals: number = 2) => {
    if (value === null || value === undefined) return '-'
    return value.toFixed(decimals).replace('.', ',')
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col gap-3 text-base">
      <div>
        <p className="text-gray-500 font-semibold">TEOR MS (%)</p>
        <p className="text-gray-900 font-bold">
          {formatNumber(detalhes.teorMs, 2)}%
        </p>
      </div>
      <div>
        <p className="text-gray-500 font-semibold">META CONSUMO (%PV)</p>
        <p className="text-gray-900 font-bold">
          {formatNumber(detalhes.metaConsumo, 2)}%
        </p>
      </div>
      <div>
        <p className="text-gray-500 font-semibold">CONSUMO MÉDIO GERAL (%PV)</p>
        <p className="text-gray-900 font-bold">
          {formatNumber(detalhes.consumoMedioGeralPercentPV, 2)}%
        </p>
      </div>
      <div>
        <p className="text-gray-500 font-semibold">CONSUMO MÉDIO 30 DIAS (%PV)</p>
        <p className="text-gray-900 font-bold">
          {formatNumber(detalhes.consumoMedio30DiasPercentPV, 2)}%
        </p>
      </div>
      <div>
        <p className="text-gray-500 font-semibold">CONSUMO MÉDIO GERAL (kg/MN)</p>
        <p className="text-gray-900 font-bold">
          {formatNumber(detalhes.consumoMedioGeralKgMN, 3)} kg
        </p>
      </div>
      <div>
        <p className="text-gray-500 font-semibold">CONSUMO MÉDIO 30 DIAS (kg/MN)</p>
        <p className="text-gray-900 font-bold">
          {formatNumber(detalhes.consumoMedio30DiasKgMN, 3)} kg
        </p>
      </div>
      <div>
        <p className="text-gray-500 font-semibold">CUSTO MÉDIO (R$/cab/dia)</p>
        <p className="text-gray-900 font-bold">
          R$ {formatNumber(detalhes.custoMedioReaisCabDia, 2)}
        </p>
      </div>
    </div>
  )
}

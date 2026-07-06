interface FormulacaoDetalhesCardProps {
  detalhes: {
    teorMs?: number | null
    metaConsumo?: number | null
    consumoMedioGeralPercentPV?: number | null
    consumoMedio30DiasPercentPV?: number | null
    consumoMedioGeralKgMN?: number | null
    consumoMedio30DiasKgMN?: number | null
    custoMedioReaisCabDia?: number | null
    motivoFalha?: string
    categoriasNaoElegiveis?: string[]
  }
  nomeLote?: string
}

export default function FormulacaoDetalhesCard({ detalhes, nomeLote }: FormulacaoDetalhesCardProps) {
  const formatNumber = (value: number | null | undefined, decimals: number = 2) => {
    if (value === null || value === undefined) return null
    return value.toFixed(decimals).replace('.', ',')
  }

  // Verifica se não há dados de consumo histórico
  const semDadosHistoricos = 
    detalhes.consumoMedioGeralPercentPV === null &&
    detalhes.consumoMedio30DiasPercentPV === null &&
    detalhes.consumoMedioGeralKgMN === null &&
    detalhes.consumoMedio30DiasKgMN === null &&
    detalhes.custoMedioReaisCabDia === null

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col gap-3 text-base">
      <div>
        <p className="text-gray-500 font-semibold">TEOR MS (%)</p>
        <p className="text-gray-900 font-bold">
          {formatNumber(detalhes.teorMs, 2)}{formatNumber(detalhes.teorMs, 2) !== null && '%'}
        </p>
      </div>
      <div>
        <p className="text-gray-500 font-semibold">META CONSUMO (%PV)</p>
        <p className="text-gray-900 font-bold">
          {formatNumber(detalhes.metaConsumo, 2)}{formatNumber(detalhes.metaConsumo, 2) !== null && '%'}
        </p>
      </div>
      {semDadosHistoricos ? (
        <div className="col-span-2 text-sm text-gray-600 italic">
          {detalhes.motivoFalha ? (
            <>
              <p>Não é possível calcular dados históricos de consumo:</p>
              <p className="mt-1">{detalhes.motivoFalha}</p>
              {detalhes.categoriasNaoElegiveis && detalhes.categoriasNaoElegiveis.length > 0 && (
                <p className="mt-1">
                  Categorias não elegíveis: {detalhes.categoriasNaoElegiveis.join(', ')}
                </p>
              )}
            </>
          ) : nomeLote ? (
            `Não é possível calcular dados históricos de consumo pois não há registros de trato no lote ${nomeLote} com esta formulação`
          ) : (
            'Não é possível calcular dados históricos de consumo pois não há registros de trato com esta formulação'
          )}
        </div>
      ) : (
        <>
          <div>
            <p className="text-gray-500 font-semibold">CONSUMO MÉDIO GERAL (%PV)</p>
            <p className="text-gray-900 font-bold">
              {formatNumber(detalhes.consumoMedioGeralPercentPV, 2)}{formatNumber(detalhes.consumoMedioGeralPercentPV, 2) !== null && '%'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 font-semibold">CONSUMO MÉDIO 30 DIAS (%PV)</p>
            <p className="text-gray-900 font-bold">
              {formatNumber(detalhes.consumoMedio30DiasPercentPV, 2)}{formatNumber(detalhes.consumoMedio30DiasPercentPV, 2) !== null && '%'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 font-semibold">CONSUMO MÉDIO GERAL (kg/MN)</p>
            <p className="text-gray-900 font-bold">
              {formatNumber(detalhes.consumoMedioGeralKgMN, 3)}{formatNumber(detalhes.consumoMedioGeralKgMN, 3) !== null && ' kg'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 font-semibold">CONSUMO MÉDIO 30 DIAS (kg/MN)</p>
            <p className="text-gray-900 font-bold">
              {formatNumber(detalhes.consumoMedio30DiasKgMN, 3)}{formatNumber(detalhes.consumoMedio30DiasKgMN, 3) !== null && ' kg'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 font-semibold">CUSTO MÉDIO (R$/cab/dia)</p>
            <p className="text-gray-900 font-bold">
              {formatNumber(detalhes.custoMedioReaisCabDia, 2) !== null ? `R$ ${formatNumber(detalhes.custoMedioReaisCabDia, 2)}` : 'Sem dados'}
            </p>
          </div>
          {detalhes.categoriasNaoElegiveis && detalhes.categoriasNaoElegiveis.length > 0 && (
            <div className="text-sm text-amber-600 italic mt-2 pt-2 border-t border-amber-200">
              <p>⚠️ Categorias desconsideradas no cálculo: {detalhes.categoriasNaoElegiveis.join(', ')}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

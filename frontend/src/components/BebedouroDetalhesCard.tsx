interface BebedouroDetalhesCardProps {
  tempoDesdeLimpeza: string
  intervaloMedioLimpezas: string
  metaIntervaloLimpeza: string
}

export default function BebedouroDetalhesCard({
  tempoDesdeLimpeza,
  intervaloMedioLimpezas,
  metaIntervaloLimpeza,
}: BebedouroDetalhesCardProps) {
  // Determinar se o intervalo médio está adequado comparado com a meta
  const isAdequado = () => {
    if (!intervaloMedioLimpezas || intervaloMedioLimpezas === 'Sem dados suficientes' || !metaIntervaloLimpeza || metaIntervaloLimpeza === 'Não definida') {
      return null
    }
    
    const intervaloMedio = parseInt(intervaloMedioLimpezas.replace(' dias', ''))
    const metaDias = parseInt(metaIntervaloLimpeza.replace(' dias', ''))
    
    if (isNaN(intervaloMedio) || isNaN(metaDias)) {
      return null
    }
    
    // Adequado se o intervalo médio for menor ou igual à meta (ou próximo da meta)
    // Intervalo médio menor que a meta significa limpezas mais frequentes (bom)
    return intervaloMedio <= metaDias + 1
  }

  const adequado = isAdequado()

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="grid grid-cols-1 gap-3 text-base">
        <div>
          <p className="text-gray-500 font-semibold">TEMPO DESDE ÚLTIMA LIMPEZA</p>
          <p className="text-gray-900 font-bold">{tempoDesdeLimpeza || '-'}</p>
        </div>
        <div>
          <p className="text-gray-500 font-semibold">INTERVALO MÉDIO DE LIMPEZAS</p>
          <p className="text-gray-900 font-bold">{intervaloMedioLimpezas || '-'}</p>
        </div>
        <div>
          <p className="text-gray-500 font-semibold">META DE INTERVALO</p>
          <p className="text-gray-900 font-bold">{metaIntervaloLimpeza || '-'}</p>
        </div>
        {adequado !== null && (
          <div>
            <p className="text-gray-500 font-semibold">STATUS DO INTERVALO</p>
            <p className={`font-bold ${adequado ? 'text-green-600' : 'text-orange-600'}`}>
              {adequado ? '✅ Adequado' : '⚠️ Exige atenção'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

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
  // Determinar se o intervalo atual está adequado comparado com a meta
  const isAdequado = () => {
    if (!tempoDesdeLimpeza || tempoDesdeLimpeza === 'Sem histórico' || !metaIntervaloLimpeza || metaIntervaloLimpeza === 'Não definida') {
      return null
    }
    
    const diasDesde = parseInt(tempoDesdeLimpeza.replace(' dias', ''))
    const metaDias = parseInt(metaIntervaloLimpeza.replace(' dias', ''))
    
    if (isNaN(diasDesde) || isNaN(metaDias)) {
      return null
    }
    
    // Adequado se estiver dentro de ±1 dia da meta
    const diff = Math.abs(diasDesde - metaDias)
    return diff <= 1
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

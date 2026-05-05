interface EspacamentoCochoCardProps {
  espacamentoInformado: string
}

export default function EspacamentoCochoCard({ espacamentoInformado }: EspacamentoCochoCardProps) {
  const ESPACAMENTO_IDEAL = 40 // cm/cab
  const TOLERANCIA_PERCENTUAL = 5 // 5%

  const espacamentoNum = parseFloat(espacamentoInformado)
  
  const calcularStatus = () => {
    if (!espacamentoInformado || isNaN(espacamentoNum)) {
      return null
    }

    const diferenca = Math.abs(espacamentoNum - ESPACAMENTO_IDEAL)
    const diferencaPercentual = (diferenca / ESPACAMENTO_IDEAL) * 100
    
    return {
      diferencaPercentual: diferencaPercentual.toFixed(1),
      adequado: diferencaPercentual <= TOLERANCIA_PERCENTUAL
    }
  }

  const status = calcularStatus()

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="grid grid-cols-1 gap-3 text-base">
        <div>
          <p className="text-gray-500 font-semibold">ESPAÇAMENTO IDEAL</p>
          <p className="text-gray-900 font-bold">{ESPACAMENTO_IDEAL} cm/cab</p>
        </div>
        <div>
          <p className="text-gray-500 font-semibold">TOLERÂNCIA</p>
          <p className="text-gray-900 font-bold">±{TOLERANCIA_PERCENTUAL}%</p>
        </div>
        {status && (
          <div>
            <p className="text-gray-500 font-semibold">DIFERENÇA</p>
            <p className="text-gray-900 font-bold">{status.diferencaPercentual}%</p>
          </div>
        )}
        {status && (
          <div>
            <p className="text-gray-500 font-semibold">STATUS</p>
            <p className={`font-bold ${status.adequado ? 'text-green-600' : 'text-orange-600'}`}>
              {status.adequado ? '✅ Adequado' : '⚠️ Exige atenção'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

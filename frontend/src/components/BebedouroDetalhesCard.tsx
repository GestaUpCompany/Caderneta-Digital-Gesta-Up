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
  // STATUS DO INTERVALO: baseado no intervalo médio vs meta
  // (reflete a qualidade da manutenção — o KPI principal)
  const statusIntervalo = () => {
    if (!intervaloMedioLimpezas || intervaloMedioLimpezas === 'Sem dados suficientes' || !metaIntervaloLimpeza || metaIntervaloLimpeza === 'Não definida') {
      return null
    }

    const mediaDias = parseInt(intervaloMedioLimpezas.replace(' dias', ''))
    const metaDias = parseInt(metaIntervaloLimpeza.replace(' dias', ''))

    if (isNaN(mediaDias) || isNaN(metaDias) || metaDias === 0) {
      return null
    }

    if (mediaDias <= metaDias + 1) {
      return { label: '✅ Adequado', cor: 'text-green-600' }
    }
    if (mediaDias <= metaDias * 2) {
      const diff = mediaDias - metaDias
      return { label: `⚠️ Acima da meta em ${diff} dia${diff > 1 ? 's' : ''}`, cor: 'text-orange-600' }
    }
    const diff = mediaDias - metaDias
    return { label: `🚨 Acima da meta em ${diff} dia${diff > 1 ? 's' : ''}`, cor: 'text-red-600' }
  }

  // PRÓXIMA LIMPEZA: baseado no tempo desde última limpeza vs meta
  // (reflete urgência imediata — informação operacional)
  const proximaLimpeza = () => {
    if (!tempoDesdeLimpeza || tempoDesdeLimpeza === 'Sem histórico' || !metaIntervaloLimpeza || metaIntervaloLimpeza === 'Não definida') {
      return null
    }

    const tempoDias = parseInt(tempoDesdeLimpeza.replace(' dias', ''))
    const metaDias = parseInt(metaIntervaloLimpeza.replace(' dias', ''))

    if (isNaN(tempoDias) || isNaN(metaDias) || metaDias === 0) {
      return null
    }

    const diasAtraso = tempoDias - metaDias

    if (diasAtraso <= 0) {
      return { label: 'Dentro do prazo', cor: 'text-green-600' }
    }
    if (diasAtraso <= 2) {
      return { label: '⚠️ Próximo do limite', cor: 'text-orange-600' }
    }
    return { label: `🚨 Atrasado há ${diasAtraso} dia${diasAtraso > 1 ? 's' : ''}`, cor: 'text-red-600' }
  }

  const status = statusIntervalo()
  const proxima = proximaLimpeza()

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
        {status && (
          <div>
            <p className="text-gray-500 font-semibold">STATUS DO INTERVALO</p>
            <p className={`font-bold ${status.cor}`}>{status.label}</p>
          </div>
        )}
        {proxima && (
          <div>
            <p className="text-gray-500 font-semibold">PRÓXIMA LIMPEZA</p>
            <p className={`font-bold ${proxima.cor}`}>{proxima.label}</p>
          </div>
        )}
      </div>
    </div>
  )
}

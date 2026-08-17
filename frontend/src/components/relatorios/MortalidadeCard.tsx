import type { MortalidadeLote } from '../../types/relatorioLote'

interface Props {
  mortalidade: MortalidadeLote
}

export default function MortalidadeCard({ mortalidade }: Props) {
  if (!mortalidade || mortalidade.total === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-green-600 font-bold text-lg">✅ Nenhuma morte registrada</p>
      </div>
    )
  }

  // Causa mais frequente
  const causas = mortalidade.linhas
    .filter((l) => l.causa_morte)
    .reduce<Record<string, number>>((acc, l) => {
      const c = l.causa_morte!
      acc[c] = (acc[c] || 0) + 1
      return acc
    }, {})
  const causaMaisFreq = Object.entries(causas).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="py-2 flex flex-col gap-2">
      <div className="bg-red-50 rounded-lg p-3 border border-red-200">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-gray-500 font-semibold text-xs uppercase">Total de mortes</p>
            <p className="text-red-600 font-bold text-xl">{mortalidade.total}</p>
          </div>
          {causaMaisFreq && (
            <div>
              <p className="text-gray-500 font-semibold text-xs uppercase">Causa mais frequente</p>
              <p className="text-gray-900 font-bold text-sm">{causaMaisFreq[0]}</p>
              <p className="text-gray-500 text-xs">{causaMaisFreq[1]} ocorrências</p>
            </div>
          )}
        </div>
      </div>

      {mortalidade.linhas.map((m, i) => (
        <div key={i} className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-500 text-xs">{m.data}</span>
            {m.causa_morte && (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                {m.causa_morte}
              </span>
            )}
          </div>
          <div className="text-sm grid grid-cols-2 gap-1">
            <div>
              <span className="text-gray-500">Categoria: </span>
              <span className="text-gray-900 font-bold capitalize">{m.categoria || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">Sexo: </span>
              <span className="text-gray-900 font-bold">{m.sexo || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">Raça: </span>
              <span className="text-gray-900 font-bold">{m.raca || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">Peso: </span>
              <span className="text-gray-900 font-bold">
                {m.peso_vivo !== null ? `${m.peso_vivo} kg` : '—'}
              </span>
            </div>
            {m.brinco && (
              <div>
                <span className="text-gray-500">Brinco: </span>
                <span className="text-gray-900 font-bold">{m.brinco}</span>
              </div>
            )}
            {m.chip && (
              <div>
                <span className="text-gray-500">Chip: </span>
                <span className="text-gray-900 font-bold">{m.chip}</span>
              </div>
            )}
            {m.nome_usuario && (
              <div className="col-span-2">
                <span className="text-gray-500">Por: </span>
                <span className="text-gray-900 font-bold">{m.nome_usuario}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

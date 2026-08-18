import type { IndividuoLote } from '../../types/relatorioLote'
import { formatarDataBR } from '../../utils/formatDate'

interface Props {
  individuos: IndividuoLote[]
}

export default function IndividuosLista({ individuos }: Props) {
  if (!individuos || individuos.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-gray-500 font-semibold">Lote sem rastreabilidade individual</p>
      </div>
    )
  }

  return (
    <div className="py-2 flex flex-col gap-2">
      <p className="text-gray-500 text-xs">{individuos.length} animais neste lote</p>
      {individuos.map((ind, i) => (
        <div key={i} className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <p className="text-gray-900 font-bold">
              {ind.id_brinco ? `Brinco ${ind.id_brinco}` : 'Sem brinco'}
            </p>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                ind.status === 'Vivo'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {ind.status || '—'}
            </span>
          </div>
          <div className="text-sm grid grid-cols-2 gap-1">
            <div>
              <span className="text-gray-500">Categoria: </span>
              <span className="text-gray-900 font-bold capitalize">{ind.categoria || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">Sexo: </span>
              <span className="text-gray-900 font-bold">{ind.sexo || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">Raça: </span>
              <span className="text-gray-900 font-bold">{ind.raca || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500">Peso: </span>
              <span className="text-gray-900 font-bold">
                {ind.peso_atual_kg !== null ? `${ind.peso_atual_kg} kg` : '—'}
              </span>
            </div>
            {ind.data_nascimento && (
              <div>
                <span className="text-gray-500">Nascimento: </span>
                <span className="text-gray-900 font-bold">{formatarDataBR(ind.data_nascimento)}</span>
              </div>
            )}
            {ind.peso_meta_kg !== null && (
              <div>
                <span className="text-gray-500">Peso meta: </span>
                <span className="text-gray-900 font-bold">{ind.peso_meta_kg} kg</span>
              </div>
            )}
            {ind.id_chip && (
              <div>
                <span className="text-gray-500">Chip: </span>
                <span className="text-gray-900 font-bold">{ind.id_chip}</span>
              </div>
            )}
            {ind.id_manejo && (
              <div>
                <span className="text-gray-500">Manejo: </span>
                <span className="text-gray-900 font-bold">{ind.id_manejo}</span>
              </div>
            )}
            {ind.numero_partos !== null && ind.numero_partos > 0 && (
              <div>
                <span className="text-gray-500">Partos: </span>
                <span className="text-gray-900 font-bold">{ind.numero_partos}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

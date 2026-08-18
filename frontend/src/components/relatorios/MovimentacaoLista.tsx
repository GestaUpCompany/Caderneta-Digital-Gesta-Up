import type { MovimentacaoLote } from '../../types/relatorioLote'
import { formatarDataBR } from '../../utils/formatDate'

interface Props {
  movimentacoes: MovimentacaoLote[]
}

export default function MovimentacaoLista({ movimentacoes }: Props) {
  if (!movimentacoes || movimentacoes.length === 0) {
    return (
      <div className="py-4 text-center">
        <p className="text-gray-500 font-semibold">Nenhuma movimentação registrada</p>
      </div>
    )
  }

  return (
    <div className="py-2 flex flex-col gap-2">
      {movimentacoes.map((mov, i) => {
        const isEntrada = mov.tipo === 'entrada'
        return (
          <div
            key={i}
            className={`bg-white rounded-lg p-3 border-l-4 border ${
              isEntrada ? 'border-l-green-500 border-gray-200' : 'border-l-red-500 border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  isEntrada ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {isEntrada ? '↗️ ENTRADA' : '↘️ SAÍDA'}
              </span>
              <span className="text-gray-500 text-sm">{formatarDataBR(mov.data)}</span>
            </div>
            <div className="text-sm grid grid-cols-2 gap-1">
              <div>
                <span className="text-gray-500">Cabeças: </span>
                <span className="text-gray-900 font-bold">{mov.numero_cabecas ?? '—'}</span>
              </div>
              <div>
                <span className="text-gray-500">Categoria: </span>
                <span className="text-gray-900 font-bold capitalize">{mov.categoria || '—'}</span>
              </div>
              <div>
                <span className="text-gray-500">Motivo: </span>
                <span className="text-gray-900 font-bold">{mov.motivo_movimentacao || '—'}</span>
              </div>
              {mov.subtipo && (
                <div>
                  <span className="text-gray-500">Subtipo: </span>
                  <span className="text-gray-900 font-bold">{mov.subtipo}</span>
                </div>
              )}
              {isEntrada && mov.lote_origem_nome && (
                <div className="col-span-2">
                  <span className="text-gray-500">De: </span>
                  <span className="text-gray-900 font-bold">{mov.lote_origem_nome}</span>
                </div>
              )}
              {!isEntrada && mov.lote_destino_nome && (
                <div className="col-span-2">
                  <span className="text-gray-500">Para: </span>
                  <span className="text-gray-900 font-bold">{mov.lote_destino_nome}</span>
                </div>
              )}
              {mov.fazenda_destino_nome && (
                <div className="col-span-2">
                  <span className="text-gray-500">Fazenda destino: </span>
                  <span className="text-gray-900 font-bold">{mov.fazenda_destino_nome}</span>
                </div>
              )}
              {mov.responsavel && (
                <div className="col-span-2">
                  <span className="text-gray-500">Responsável: </span>
                  <span className="text-gray-900 font-bold">{mov.responsavel}</span>
                </div>
              )}
              {mov.causa_observacao && (
                <div className="col-span-2 text-gray-600 italic text-xs mt-1">
                  {mov.causa_observacao}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

import { useState } from 'react'
import { Conflict, resolveConflict, removeLocalConflict } from '../services/conflictService'
import { isoToBR } from '../utils/formatDate'

interface Props {
  conflict: Conflict
  onResolved: () => void
}

const FIELD_LABELS: Record<string, string> = {
  data: 'Data', pasto: 'Pasto', numeroLote: 'Nº Lote', manejador: 'Manejador',
  pastoSaida: 'Pasto Saída', pastoEntrada: 'Pasto Entrada', vaca: 'Vaca',
  touro: 'Touro', bezerro: 'Bezerro', boiMagro: 'Boi Magro', garrote: 'Garrote',
  novilha: 'Novilha', totalAnimais: 'Total', responsavel: 'Responsável',
  tratador: 'Tratador', produto: 'Produto', gado: 'Tipo Gado', kg: 'KG',
  loteOrigem: 'Lote Origem', loteDestino: 'Lote Destino', numeroCabecas: 'Nº Cabeças',
  motivoMovimentacao: 'Motivo', numeroCria: 'Nº Cria', tipoParto: 'Tipo Parto',
  sexo: 'Sexo', raca: 'Raça', numeroMae: 'Nº Mãe', categoriaMae: 'Categoria Mãe',
}

const SKIP_FIELDS = new Set([
  'id', 'googleRowId', 'version', 'lastModified', 'syncStatus',
])

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (key === 'lastModified') return isoToBR(String(value))
  return String(value)
}

export default function ConflictModal({ conflict, onResolved }: Props) {
  const [loading, setLoading] = useState(false)

  const local = conflict.localVersion
  const remote = conflict.remoteVersion

  const diffKeys = Object.keys(local).filter((key) => {
    if (SKIP_FIELDS.has(key)) return false
    return String(local[key] ?? '') !== String(remote[key] ?? '')
  })

  async function handleResolve(resolution: 'local' | 'remote') {
    setLoading(true)
    await resolveConflict(conflict, resolution)
    removeLocalConflict(conflict.id)
    setLoading(false)
    onResolved()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">

        <div className="bg-yellow-400 rounded-t-2xl px-5 py-4 flex items-center gap-3">
          <span className="text-3xl">⚠️</span>
          <div>
            <h2 className="text-xl font-bold text-black">CONFLITO DETECTADO</h2>
            <p className="text-sm font-semibold text-black opacity-75">
              Este registro foi alterado em outro lugar
            </p>
          </div>
        </div>

        <div className="p-4">
          <p className="text-base text-gray-700 mb-4 text-center">
            Qual versão você quer manter?
          </p>

          {diffKeys.length > 0 ? (
            <div className="mb-4">
              <p className="text-sm font-bold text-gray-500 uppercase mb-2">Campos diferentes:</p>
              <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-3 bg-gray-100 px-3 py-2 text-xs font-bold text-gray-600 uppercase">
                  <span>Campo</span>
                  <span className="text-center">Seu celular</span>
                  <span className="text-center">Planilha</span>
                </div>
                {diffKeys.map((key) => (
                  <div
                    key={key}
                    className="grid grid-cols-3 px-3 py-3 border-t border-gray-100 text-base"
                  >
                    <span className="font-semibold text-gray-700 text-sm">
                      {FIELD_LABELS[key] ?? key}
                    </span>
                    <span className="text-center bg-blue-50 rounded px-1 text-sm break-all">
                      {formatValue(key, local[key])}
                    </span>
                    <span className="text-center bg-orange-50 rounded px-1 text-sm break-all">
                      {formatValue(key, remote[key])}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 mb-4">
              Os dados são iguais mas há versões diferentes.
            </p>
          )}

          <div className="flex flex-col gap-3 mt-4">
            <button
              className="btn-primary bg-blue-700"
              disabled={loading}
              onClick={() => handleResolve('local')}
            >
              📱 MANTER MEU CELULAR
            </button>

            <button
              className="btn-secondary border-orange-500 text-orange-600"
              disabled={loading}
              onClick={() => handleResolve('remote')}
            >
              ☁️ MANTER DA PLANILHA
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-3">
            Detectado em: {isoToBR(conflict.detectedAt)}
          </p>
        </div>
      </div>
    </div>
  )
}

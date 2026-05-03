import { useState, useEffect } from 'react'
import { getAllRegistrosComErro, deleteRegistro, removeFromSyncQueueByRegistroId, CadernetaStore } from '../services/indexedDB'

interface ErrorRecord {
  store: CadernetaStore
  registros: any[]
}

const STORE_NAMES: Record<CadernetaStore, string> = {
  maternidade: 'Maternidade',
  pastagens: 'Troca de Pastos',
  rodeio: 'Rodeio',
  suplementacao: 'Suplementação',
  bebedouros: 'Bebedouros',
  movimentacao: 'Movimentação',
  enfermaria: 'Enfermaria',
  'entrada-insumos': 'Entrada de Insumos',
  'saida-insumos': 'Saída de Insumos',
  'insumos-por-saida': 'Insumos por Saída',
}

interface SyncErrorModalProps {
  isOpen: boolean
  onClose: () => void
  onRecordsDeleted: () => void
}

export default function SyncErrorModal({ isOpen, onClose, onRecordsDeleted }: SyncErrorModalProps) {
  const [errorRecords, setErrorRecords] = useState<ErrorRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen) {
      loadErrorRecords()
    }
  }, [isOpen])

  const loadErrorRecords = async () => {
    setLoading(true)
    try {
      const records = await getAllRegistrosComErro()
      setErrorRecords(records)
    } catch (error) {
      console.error('Erro ao carregar registros com erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    const allIds = new Set<string>()
    errorRecords.forEach(({ registros }) => {
      registros.forEach(reg => allIds.add(reg.id))
    })
    if (selectedIds.size === allIds.size) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(allIds)
    }
  }

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return

    setLoading(true)
    try {
      for (const { store, registros } of errorRecords) {
        for (const registro of registros) {
          if (selectedIds.has(registro.id)) {
            await deleteRegistro(store, registro.id)
            await removeFromSyncQueueByRegistroId(registro.id)
          }
        }
      }
      await loadErrorRecords()
      setSelectedIds(new Set())
      onRecordsDeleted()
    } catch (error) {
      console.error('Erro ao deletar registros:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteAll = async () => {
    if (!confirm('Tem certeza que deseja deletar TODOS os registros com erro? Esta ação não pode ser desfeita.')) {
      return
    }

    setLoading(true)
    try {
      for (const { store, registros } of errorRecords) {
        for (const registro of registros) {
          await deleteRegistro(store, registro.id)
          await removeFromSyncQueueByRegistroId(registro.id)
        }
      }
      await loadErrorRecords()
      onRecordsDeleted()
    } catch (error) {
      console.error('Erro ao deletar todos os registros:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const totalRecords = errorRecords.reduce((sum, { registros }) => sum + registros.length, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-red-600 text-white p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Registros com Erro de Sincronização</h2>
              <p className="text-sm opacity-90 mt-1">
                {totalRecords} registro{totalRecords !== 1 ? 's' : ''} com erro
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">🔄</div>
              <p className="text-gray-600">Carregando...</p>
            </div>
          ) : errorRecords.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-gray-600 font-medium">Nenhum registro com erro encontrado</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Select All */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <input
                  type="checkbox"
                  checked={selectedIds.size > 0}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  {selectedIds.size > 0 ? `Selecionados: ${selectedIds.size}` : 'Selecionar todos'}
                </span>
              </div>

              {/* Error Records List */}
              {errorRecords.map(({ store, registros }) => (
                <div key={store} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-100 p-3 font-bold text-gray-800">
                    {STORE_NAMES[store]}
                  </div>
                  {registros.map(registro => (
                    <div
                      key={registro.id}
                      className={`p-3 border-t border-gray-200 flex items-start gap-3 ${
                        selectedIds.has(registro.id) ? 'bg-red-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(registro.id)}
                        onChange={() => toggleSelection(registro.id)}
                        className="w-5 h-5 rounded mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          ID: {registro.id}
                        </p>
                        <p className="text-xs text-gray-600">
                          Data: {registro.data}
                        </p>
                        {registro.dataRegistro && (
                          <p className="text-xs text-gray-500">
                            Registrado em: {new Date(registro.dataRegistro).toLocaleString('pt-BR')}
                          </p>
                        )}
                        {registro.errorMessage && (
                          <p className="text-xs text-red-600 mt-1 truncate">
                            Erro: {registro.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {errorRecords.length > 0 && (
          <div className="p-6 border-t border-gray-200 flex flex-col gap-3">
            <button
              onClick={deleteSelected}
              disabled={selectedIds.size === 0 || loading}
              className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Deletar {selectedIds.size} registro{selectedIds.size !== 1 ? 's' : ''} selecionado{selectedIds.size !== 1 ? 's' : ''}
            </button>
            <button
              onClick={deleteAll}
              disabled={loading}
              className="w-full py-3 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Deletar TODOS os registros com erro
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Registro } from '../../types/cadernetas'
import { CadernetaStore } from '../../services/indexedDB'
import { listarRegistros, excluirRegistro } from '../../services/api'
import { useSearchFiltros } from '../../hooks/useSearchFiltros'
import { exportToCSV, exportToJSON, copyToClipboard } from '../../utils/exportToCSV'
import { Input, Button } from '../ui'

interface ColunaDef {
  campo: string
  label: string
  formatador?: (val: unknown) => string
}

interface Props {
  caderneta: CadernetaStore
  titulo: string
  colunas: ColunaDef[]
  rotaForm: string
}

const statusLabel: Record<string, string> = {
  pending: '⏳',
  synced: '✅',
  conflict: '⚠️',
  error: '❌',
}

export default function ListaRegistros({ caderneta, titulo, colunas, rotaForm }: Props) {
  const navigate = useNavigate()
  const [registros, setRegistros] = useState<Registro[]>([])
  const [carregando, setCarregando] = useState(true)
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null)
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [mostrarExportar, setMostrarExportar] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const lista = await listarRegistros(caderneta)
    setRegistros(lista)
    setCarregando(false)
  }, [caderneta])

  useEffect(() => {
    carregar()
  }, [carregar])

  const {
    filtros,
    registrosFiltrados,
    setBusca,
    setDataInicio,
    setDataFim,
    setOrdenacao,
    limparFiltros,
    temFiltrosAtivos,
    totalOriginal,
    totalFiltrado,
  } = useSearchFiltros(registros)

  const handleExcluir = async (id: string) => {
    if (confirmandoId !== id) {
      setConfirmandoId(id)
      return
    }
    await excluirRegistro(caderneta, id)
    setConfirmandoId(null)
    carregar()
  }

  const handleExportCSV = () => exportToCSV(registrosFiltrados, `${caderneta}_export`, colunas)
  const handleExportJSON = () => exportToJSON(registrosFiltrados, `${caderneta}_export`)
  const handleCopy = () => copyToClipboard(registrosFiltrados)

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-black text-white flex items-center px-4 py-5">
        <button
          onClick={() => navigate(-1)}
          className="text-yellow-400 font-bold text-xl mr-4 min-h-[48px] px-2"
        >
          ← VOLTAR
        </button>
        <h1 className="text-xl font-bold flex-1">{titulo}</h1>
        <span className="text-yellow-400 font-bold">
          {totalFiltrado}/{totalOriginal} reg.
        </span>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-3 pb-8">
        {/* Ações principais */}
        <Button onClick={() => navigate(rotaForm)} variant="primary" icon="➕">
          NOVO REGISTRO
        </Button>

        {/* Busca rápida */}
        <Input
          placeholder="🔍 Buscar em todos os campos..."
          value={filtros.busca}
          onChange={(e) => setBusca(e.target.value)}
          fullWidth
        />

        {/* Botões de filtros e exportar */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            variant={temFiltrosAtivos ? 'secondary' : 'ghost'}
            size="sm"
            icon="🔎"
          >
            {temFiltrosAtivos ? 'FILTROS ATIVOS' : 'FILTROS'}
          </Button>
          <Button
            onClick={() => setMostrarExportar(!mostrarExportar)}
            variant="ghost"
            size="sm"
            icon="📥"
          >
            EXPORTAR
          </Button>
        </div>

        {/* Painel de filtros avançados */}
        {mostrarFiltros && (
          <div className="bg-white rounded-2xl p-4 border-2 border-gray-200 flex flex-col gap-3">
            <h3 className="font-bold text-gray-800">🔎 Filtros Avançados</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Data Início"
                placeholder="DD/MM/AAAA"
                value={filtros.dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
              <Input
                label="Data Fim"
                placeholder="DD/MM/AAAA"
                value={filtros.dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-base font-bold text-gray-800 mb-2">ORDENAÇÃO</label>
              <select
                value={filtros.ordenacao}
                onChange={(e) => setOrdenacao(e.target.value as any)}
                className="w-full min-h-[60px] text-xl px-4 py-3 bg-white border-2 border-gray-400 rounded-xl"
              >
                <option value="data_desc">📅 Data (mais recente)</option>
                <option value="data_asc">📅 Data (mais antiga)</option>
                <option value="id_desc">🆔 ID (decrescente)</option>
                <option value="id_asc">🆔 ID (crescente)</option>
              </select>
            </div>
            {temFiltrosAtivos && (
              <Button onClick={limparFiltros} variant="ghost" size="sm">
                🧹 LIMPAR FILTROS
              </Button>
            )}
          </div>
        )}

        {/* Painel de exportação */}
        {mostrarExportar && (
          <div className="bg-white rounded-2xl p-4 border-2 border-gray-200 flex flex-col gap-3">
            <h3 className="font-bold text-gray-800">📥 Exportar Registros ({totalFiltrado})</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleExportCSV} variant="secondary" size="sm" icon="📊">
                CSV (Excel)
              </Button>
              <Button onClick={handleExportJSON} variant="secondary" size="sm" icon="🗂️">
                JSON
              </Button>
            </div>
            <Button onClick={handleCopy} variant="ghost" size="sm" icon="📋">
              COPIAR TEXTO
            </Button>
          </div>
        )}

        {/* Lista de registros */}
        {carregando ? (
          <div className="flex items-center justify-center py-16">
            <span className="text-2xl animate-spin">⏳</span>
            <span className="ml-3 text-lg font-semibold text-gray-600">Carregando...</span>
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border-2 border-gray-200">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-xl font-bold text-gray-700">
              {registros.length === 0 ? 'Nenhum registro ainda' : 'Nenhum resultado encontrado'}
            </p>
            <p className="text-base text-gray-500 mt-2">
              {registros.length === 0
                ? 'Toque em "NOVO REGISTRO" para começar'
                : 'Ajuste os filtros ou limpe a busca'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {registrosFiltrados.map((registro) => (
              <div
                key={registro.id}
                className="bg-white rounded-2xl p-4 border-2 border-gray-200 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{statusLabel[registro.syncStatus] ?? '⏳'}</span>
                    <span className="text-base font-bold text-gray-800">{registro.data as string}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{(registro.id as string).slice(0, 8)}</span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-3">
                  {colunas.map((col) => (
                    <div key={col.campo}>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{col.label}</p>
                      <p className="text-base font-semibold text-gray-900 truncate">
                        {col.formatador
                          ? col.formatador(registro[col.campo])
                          : String(registro[col.campo] ?? '—')}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 border-t border-gray-100 pt-3">
                  {confirmandoId === registro.id ? (
                    <>
                      <Button
                        onClick={() => handleExcluir(registro.id)}
                        variant="danger"
                        size="sm"
                        icon="🗑️"
                      >
                        CONFIRMAR EXCLUSÃO
                      </Button>
                      <Button
                        onClick={() => setConfirmandoId(null)}
                        variant="secondary"
                        size="sm"
                      >
                        CANCELAR
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => handleExcluir(registro.id)}
                      variant="ghost"
                      size="sm"
                      icon="🗑️"
                    >
                      EXCLUIR
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

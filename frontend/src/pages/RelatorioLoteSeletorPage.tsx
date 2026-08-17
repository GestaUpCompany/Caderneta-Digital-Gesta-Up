import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { ChevronLeft } from 'lucide-react'
import { RootState } from '../store/store'
import { useLotesParaRelatorio } from '../hooks/useRelatorioLote'
import PageLoader from '../components/PageLoader'
import { Input } from '../components/ui'

export default function RelatorioLoteSeletorPage() {
  const navigate = useNavigate()
  const { fazendaId } = useSelector((state: RootState) => state.config)
  const { lotes, loading, erro } = useLotesParaRelatorio(fazendaId)
  const [busca, setBusca] = useState('')
  const [filtroAtivo, setFiltroAtivo] = useState<'ativos' | 'todos'>('todos')

  const lotesFiltrados = useMemo(() => {
    let resultado = lotes
    if (filtroAtivo === 'ativos') {
      resultado = resultado.filter((l) => l.ativo)
    }
    if (busca.trim()) {
      const termo = busca.toLowerCase().trim()
      resultado = resultado.filter(
        (l) =>
          l.nome.toLowerCase().includes(termo) ||
          (l.pasto_nome?.toLowerCase().includes(termo) ?? false)
      )
    }
    return resultado
  }, [lotes, busca, filtroAtivo])

  if (loading) return <PageLoader />

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="sticky top-0 z-20 bg-gradient-to-b from-[#23503a] via-[#1d4030] to-[#1a3a2a] text-white shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
        <div className="px-3 py-3 desktop-container">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/20 active:bg-white/25 transition-colors text-white text-xs font-semibold pl-2 pr-3 py-2 min-h-[40px] backdrop-blur-sm"
              aria-label="Voltar"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
              <span>Voltar</span>
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400/15 text-yellow-200 px-2.5 py-1.5 text-xs font-semibold">
              {lotesFiltrados.length} lotes
            </span>
          </div>
          <h1 className="mt-3 text-lg font-bold leading-tight tracking-tight text-center truncate">
            Relatório de Lote
          </h1>
        </div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-3 pb-8 desktop-container">
        <Input
          placeholder="🔍 Buscar lote por nome ou pasto..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          fullWidth
          textSize="base"
        />

        <div className="flex gap-2">
          <button
            onClick={() => setFiltroAtivo('todos')}
            className={`flex-1 rounded-xl py-2 text-sm font-bold transition-colors min-h-[40px] ${
              filtroAtivo === 'todos'
                ? 'bg-[#23503a] text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltroAtivo('ativos')}
            className={`flex-1 rounded-xl py-2 text-sm font-bold transition-colors min-h-[40px] ${
              filtroAtivo === 'ativos'
                ? 'bg-[#23503a] text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            Ativos
          </button>
        </div>

        {erro && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-center">
            <p className="text-yellow-800 font-semibold text-sm">{erro}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 text-yellow-700 font-bold text-sm underline"
            >
              Tentar de novo
            </button>
          </div>
        )}

        {!erro && lotesFiltrados.length === 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-6 text-center">
            <span className="text-4xl block mb-2">🐄</span>
            <p className="text-purple-800 font-bold">Nenhum lote encontrado</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {lotesFiltrados.map((lote) => (
            <button
              key={lote.lote_id}
              onClick={() => navigate(`/modulos/relatorios/lote/${lote.lote_id}`)}
              className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-left active:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-gray-900 font-bold text-lg">{lote.nome}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    lote.ativo
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {lote.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm mb-2">
                <span className="text-[#3b82f6] font-bold">
                  {lote.n_cabecas} animais
                </span>
                {lote.pasto_nome && (
                  <span className="text-gray-500">📍 {lote.pasto_nome}</span>
                )}
              </div>
              {lote.categorias && (
                <p className="text-gray-500 text-xs capitalize truncate mb-2">
                  {lote.categorias}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {lote.tem_movimentacao && (
                  <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">
                    🔄 Movs
                  </span>
                )}
                {lote.tem_morte && (
                  <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-semibold">
                    ⚰️ Mortes
                  </span>
                )}
                {lote.tem_consumo && (
                  <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-semibold">
                    🌿 Consumo
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  )
}

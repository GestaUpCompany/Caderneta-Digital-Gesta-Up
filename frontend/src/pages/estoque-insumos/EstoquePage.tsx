import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { Button } from '../../components/ui'
import { loadCadastroData, CadastroData } from '../../services/cadastroData'
import { BACKEND_URL } from '../../utils/constants'
import { DATABASE_URL } from '../../utils/constants'

interface EstoqueRow {
  dataInicial: string
  dataFinal: string
  insumo: string
  qtdEntrada: number
  qtdSaida: number
  estoque: number
  previsao: number
}

export default function EstoquePage() {
  const navigate = useNavigate()
  const { fazenda, fazendaId, cadastroSheetUrl } = useSelector((state: RootState) => state.config)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [estoqueData, setEstoqueData] = useState<EstoqueRow[]>([])
  const [cadastroData, setCadastroData] = useState<CadastroData | null>(null)
  const [showInicializar, setShowInicializar] = useState(false)
  const [estoquesIniciais, setEstoquesIniciais] = useState<Record<string, string>>({})
  const [atualizando, setAtualizando] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!cadastroSheetUrl) {
        throw new Error('URL da planilha de cadastro não configurada')
      }

      // Carregar dados de cadastro
      const cadastro = await loadCadastroData(cadastroSheetUrl)
      setCadastroData(cadastro)

      // Carregar dados de estoque
      const validateRes = await fetch(`${BACKEND_URL}/api/sheets/validate-farm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planilhaUrl: DATABASE_URL, farmId: fazendaId || fazenda, linkPosition: 2 }),
      })

      const validateData = await validateRes.json()
      if (!validateData.success || !validateData.farmSheetUrl) {
        throw new Error('Não foi possível obter a URL da planilha de insumos')
      }

      const estoqueRes = await fetch(`${BACKEND_URL}/api/insumos/estoque?insumosSheetUrl=${validateData.farmSheetUrl}`)
      const estoqueData = await estoqueRes.json()

      if (estoqueData.success && estoqueData.rows) {
        const rows = estoqueData.rows.map((row: any) => ({
          dataInicial: row[0],
          dataFinal: row[1],
          insumo: row[2],
          qtdEntrada: parseFloat(row[3]) || 0,
          qtdSaida: parseFloat(row[4]) || 0,
          estoque: parseFloat(row[5]) || 0,
          previsao: parseFloat(row[6]) || 0,
        }))
        setEstoqueData(rows)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados de estoque')
    } finally {
      setLoading(false)
    }
  }

  const handleInicializar = async () => {
    try {
      const validateRes = await fetch(`${BACKEND_URL}/api/sheets/validate-farm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planilhaUrl: DATABASE_URL, farmId: fazendaId || fazenda, linkPosition: 2 }),
      })

      const validateData = await validateRes.json()
      if (!validateData.success || !validateData.farmSheetUrl) {
        setError('Não foi possível obter a URL da planilha de insumos')
        return
      }

      // Converter estoquesIniciais para números
      const estoquesNumericos: Record<string, number> = {}
      for (const [key, value] of Object.entries(estoquesIniciais)) {
        estoquesNumericos[key] = parseFloat(value) || 0
      }

      const res = await fetch(`${BACKEND_URL}/api/insumos/estoque/inicializar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insumosSheetUrl: validateData.farmSheetUrl,
          cadastroSheetUrl: cadastroSheetUrl,
          estoquesIniciais: estoquesNumericos,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setShowInicializar(false)
        setEstoquesIniciais({})
        await loadData()
      } else {
        setError('Erro ao inicializar estoque')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao inicializar estoque')
    }
  }

  const handleAtualizarTodos = async () => {
    try {
      setAtualizando(true)
      const validateRes = await fetch(`${BACKEND_URL}/api/sheets/validate-farm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planilhaUrl: DATABASE_URL, farmId: fazendaId || fazenda, linkPosition: 2 }),
      })

      const validateData = await validateRes.json()
      if (!validateData.success || !validateData.farmSheetUrl) {
        setError('Não foi possível obter a URL da planilha de insumos')
        return
      }

      // Atualizar cada insumo
      for (const row of estoqueData) {
        await fetch(`${BACKEND_URL}/api/insumos/estoque/atualizar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            insumosSheetUrl: validateData.farmSheetUrl,
            insumoName: row.insumo,
          }),
        })
      }

      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar estoques')
    } finally {
      setAtualizando(false)
    }
  }

  const getIndicador = (previsao: number) => {
    if (previsao > 30) return '🟢'
    if (previsao >= 10) return '🟡'
    return '🔴'
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-[#1a3a2a] text-white py-6 border-b-4 border-yellow-400 relative">
        <div className="flex flex-col items-center gap-3 px-4">
          <div className="flex items-center justify-between w-full">
            <FarmLogo
              farmName={fazenda}
              type="both"
              size="medium"
              className="justify-between w-full"
            />
          </div>
          {fazenda && (
            <h1 className="text-2xl font-bold text-white">{fazenda.toUpperCase()}</h1>
          )}
          <div className="flex items-center gap-3 w-full relative">
            <button
              onClick={() => navigate('/modulos/insumos')}
              className="text-yellow-400 font-bold text-sm min-h-[40px] px-3 absolute left-0"
            >
              VOLTAR
            </button>
            <p className="text-white text-base font-semibold flex-1 text-center">ESTOQUE DE INSUMOS</p>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-4xl animate-spin">⏳</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-6 text-center">
            <p className="text-xl font-bold text-red-800 mb-4">
              ERRO
            </p>
            <p className="text-lg text-gray-700">{error}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Botões de ação */}
            <div className="flex gap-4">
              <Button
                onClick={() => setShowInicializar(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                INICIALIZAR ESTOQUE
              </Button>
              <Button
                onClick={handleAtualizarTodos}
                disabled={atualizando}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {atualizando ? 'ATUALIZANDO...' : 'ATUALIZAR ESTOQUE'}
              </Button>
            </div>

            {/* Modal de inicialização */}
            {showInicializar && cadastroData && (
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-4">DEFINIR ESTOQUE INICIAL</h2>
                <div className="space-y-4">
                  {cadastroData.insumos.map((insumo) => (
                    <div key={insumo}>
                      <label className="block text-sm font-bold text-gray-900 mb-2">
                        {insumo}
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={estoquesIniciais[insumo] || ''}
                        onChange={(e) => setEstoquesIniciais({ ...estoquesIniciais, [insumo]: e.target.value })}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-6">
                  <Button
                    onClick={handleInicializar}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    SALVAR
                  </Button>
                  <Button
                    onClick={() => {
                      setShowInicializar(false)
                      setEstoquesIniciais({})
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700"
                  >
                    CANCELAR
                  </Button>
                </div>
              </div>
            )}

            {/* Tabela de estoque */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                ESTOQUE ATUAL
              </h2>
              {estoqueData.length === 0 ? (
                <p className="text-gray-500 italic">Nenhum estoque inicializado. Clique em "INICIALIZAR ESTOQUE" para começar.</p>
              ) : (
                <div className="space-y-3">
                  {estoqueData.map((row, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4 border-l-4 border-yellow-500">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-gray-900">{row.insumo}</span>
                        <span className="text-2xl">{getIndicador(row.previsao)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-semibold text-gray-600">Estoque Atual:</span>{' '}
                          <span className="text-gray-900">{row.estoque.toFixed(2)} kg</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">Previsão 30 dias:</span>{' '}
                          <span className="text-gray-900">{row.previsao.toFixed(2)} kg</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">Qtd Entrada:</span>{' '}
                          <span className="text-gray-900">{row.qtdEntrada.toFixed(2)} kg</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-600">Qtd Saída:</span>{' '}
                          <span className="text-gray-900">{row.qtdSaida.toFixed(2)} kg</span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Período: {row.dataInicial} a {row.dataFinal}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Legenda */}
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <h3 className="text-sm font-bold text-gray-900 mb-2">LEGENDA</h3>
              <div className="flex gap-4 text-sm">
                <span>🟢 Estoque saudável ({'> 30 dias'})</span>
                <span>🟡 Estoque baixo (10-30 dias)</span>
                <span>🔴 Estoque crítico ({'< 10 dias'})</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

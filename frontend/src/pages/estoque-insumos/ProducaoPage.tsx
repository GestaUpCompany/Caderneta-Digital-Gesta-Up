import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LOGO_URL, DATABASE_URL } from '../../utils/constants'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { BACKEND_URL } from '../../utils/constants'

interface CadastroData {
  insumos: string[]
  dietas: string[]
}

// Mapeamento dieta → insumos (será definido na planilha base)
// Por enquanto, usando um mapeamento estático como exemplo
const DIETA_INSUMOS_MAP: Record<string, string[]> = {
  // Exemplo: cada dieta usa todos os insumos
  // Isso será ajustado quando tiver o formato exato da planilha
}

interface FormData {
  dataProducao: string
  dietaProduzida: string
  destinoProducao: string
  totalProduzido: string
  insumosQuantidades: Record<string, string>
}

export default function ProducaoPage() {
  const navigate = useNavigate()
  const { fazenda, fazendaId, planilhaUrl } = useSelector((state: RootState) => state.config)
  const [cadastroData, setCadastroData] = useState<CadastroData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState<FormData>({
    dataProducao: '',
    dietaProduzida: '',
    destinoProducao: '',
    totalProduzido: '',
    insumosQuantidades: {},
  })

  const DESTINOS = ['Cria', 'Recria', 'Engorda', 'Tropa', 'Outros Animais']

  useEffect(() => {
    const loadCadastroData = async () => {
      if (!planilhaUrl) {
        setError('URL da planilha não configurada')
        setLoading(false)
        return
      }

      try {
        const validateRes = await fetch(`${BACKEND_URL}/api/sheets/validate-farm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planilhaUrl: DATABASE_URL, farmId: fazendaId || fazenda, prefix: 'Insumo' }),
        })

        const validateData = await validateRes.json()
        if (!validateData.success || !validateData.farmSheetUrl) {
          setError('Não foi possível obter a URL da planilha de insumos')
          setLoading(false)
          return
        }

        const readRes = await fetch(`${BACKEND_URL}/api/insumos/cadastro`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ insumosSheetUrl: validateData.farmSheetUrl }),
        })

        const readData = await readRes.json()
        if (!readData.success || !readData.rows) {
          setError('Não foi possível ler os dados de cadastro')
          setLoading(false)
          return
        }

        const rows = readData.rows as (string | number | null)[][]
        const data: CadastroData = {
          insumos: [],
          dietas: [],
        }

        for (const row of rows) {
          if (row[0]) data.insumos.push(String(row[0]))
          if (row[1]) data.dietas.push(String(row[1]))
        }

        // Inicializar quantidades de insumos como vazio
        const insumosQuantidades: Record<string, string> = {}
        data.insumos.forEach(insumo => {
          insumosQuantidades[insumo] = ''
        })

        setCadastroData(data)
        setForm(prev => ({ ...prev, insumosQuantidades }))
        setLoading(false)
      } catch (err) {
        setError('Erro ao carregar dados de cadastro')
        setLoading(false)
      }
    }

    loadCadastroData()
  }, [planilhaUrl, fazenda])

  useEffect(() => {
    // Calcular total produzido (soma das quantidades de insumos)
    const total = Object.values(form.insumosQuantidades).reduce((sum, qty) => {
      return sum + (parseFloat(qty) || 0)
    }, 0)
    setForm(prev => ({ ...prev, totalProduzido: total.toFixed(2) }))
  }, [form.insumosQuantidades])

  // Obter insumos relevantes para a dieta selecionada
  const getInsumosPorDieta = (): string[] => {
    if (!cadastroData) return []
    if (!form.dietaProduzida) return cadastroData.insumos

    // Se tiver mapeamento específico, usar. Senão, mostrar todos os insumos
    const insumosMapeados = DIETA_INSUMOS_MAP[form.dietaProduzida]
    if (insumosMapeados && insumosMapeados.length > 0) {
      return insumosMapeados
    }

    // Por padrão, mostrar todos os insumos
    return cadastroData.insumos
  }

  const insumosRelevantes = getInsumosPorDieta()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const validateRes = await fetch(`${BACKEND_URL}/api/sheets/validate-farm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planilhaUrl: DATABASE_URL, farmId: fazendaId || fazenda, prefix: 'Insumo' }),
      })

      const validateData = await validateRes.json()
      if (!validateData.success || !validateData.farmSheetUrl) {
        setError('Não foi possível obter a URL da planilha de insumos')
        setSaving(false)
        return
      }

      // Salvar registro principal na página Saída (sem os insumos individuais)
      const mainValues = [
        form.dataProducao,
        form.dietaProduzida,
        form.destinoProducao,
        form.totalProduzido,
      ]

      const saveRes = await fetch(`${BACKEND_URL}/api/insumos/producao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insumosSheetUrl: validateData.farmSheetUrl,
          values: mainValues,
        }),
      })

      const saveData = await saveRes.json()
      if (!saveData.success || !saveData.id) {
        setError('Erro ao salvar produção')
        setSaving(false)
        return
      }

      const saidaId = saveData.id

      // Salvar cada insumo na página Dieta Insumos
      for (const insumo of cadastroData!.insumos) {
        const quantidade = form.insumosQuantidades[insumo]
        if (quantidade && parseFloat(quantidade) > 0) {
          const dietaInsumoValues = [saidaId, form.dataProducao, form.dietaProduzida, insumo, quantidade]
          await fetch(`${BACKEND_URL}/api/insumos/dieta-insumos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              insumosSheetUrl: validateData.farmSheetUrl,
              values: dietaInsumoValues,
            }),
          })
        }
      }

      setSuccess(true)
      setSaving(false)
      setTimeout(() => {
        navigate('/modulos/insumos')
      }, 2000)
    } catch (err) {
      setError('Erro ao salvar produção')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-[#1a3a2a] text-white py-6 border-b-4 border-yellow-400 relative">
        <button
          onClick={() => navigate('/modulos/insumos')}
          className="absolute top-0 left-4 flex items-center justify-center text-white hover:text-yellow-400 transition-colors z-10"
        >
          <span className="text-2xl">←</span>
        </button>
        <div className="flex flex-col items-center gap-3 px-4">
          <div className="flex items-center justify-between w-full">
            <img src={LOGO_URL} alt="Logo GestaUp" className="w-16 h-auto object-contain rounded-[22px] ml-7" />
            {fazenda && (
              <img src={LOGO_URL} alt="Logo Fazenda" className="h-[58px] w-auto object-contain rounded-[22px] mr-7" />
            )}
          </div>
          {fazenda && (
            <h1 className="text-2xl font-bold text-white">{fazenda.toUpperCase()}</h1>
          )}
          <p className="text-white text-base font-semibold">PRODUÇÃO FÁBRICA</p>
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
            <p className="text-xl font-bold text-red-800 mb-4">ERRO</p>
            <p className="text-lg text-gray-700">{error}</p>
          </div>
        ) : success ? (
          <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-6 text-center">
            <p className="text-xl font-bold text-green-800 mb-4">SUCESSO</p>
            <p className="text-lg text-gray-700">Produção salva com sucesso!</p>
            <p className="text-sm text-gray-600 mt-2">Redirecionando...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Data de Produção */}
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Data de Produção *
              </label>
              <input
                type="date"
                value={form.dataProducao}
                onChange={(e) => setForm({ ...form, dataProducao: e.target.value })}
                required
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Dieta Produzida */}
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Dieta Produzida *
              </label>
              <select
                value={form.dietaProduzida}
                onChange={(e) => setForm({ ...form, dietaProduzida: e.target.value })}
                required
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="">Selecione uma dieta</option>
                {cadastroData?.dietas.map((dieta, index) => (
                  <option key={index} value={dieta}>{dieta}</option>
                ))}
              </select>
            </div>

            {/* Destino da Produção */}
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Destino da Produção *
              </label>
              <select
                value={form.destinoProducao}
                onChange={(e) => setForm({ ...form, destinoProducao: e.target.value })}
                required
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="">Selecione um destino</option>
                {DESTINOS.map((destino, index) => (
                  <option key={index} value={destino}>{destino}</option>
                ))}
              </select>
            </div>

            {/* Total Produzido */}
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Total Produzido (kg)
              </label>
              <input
                type="text"
                value={form.totalProduzido}
                readOnly
                className="w-full p-3 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-900"
              />
            </div>

            {/* Lista de Insumos */}
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quantidade por Insumo (kg)</h3>
              <div className="space-y-3">
                {insumosRelevantes.map((insumo, index) => (
                  <div key={index}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {insumo}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.insumosQuantidades[insumo] || ''}
                      onChange={(e) => setForm({
                        ...form,
                        insumosQuantidades: {
                          ...form.insumosQuantidades,
                          [insumo]: e.target.value,
                        },
                      })}
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/modulos/insumos')}
                className="flex-1 bg-gray-500 text-white py-3 rounded-xl font-bold hover:bg-gray-600 transition-colors"
              >
                CANCELAR
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-[#f59e0b] text-white py-3 rounded-xl font-bold hover:bg-[#d97706] transition-colors disabled:opacity-50"
              >
                {saving ? 'SALVANDO...' : 'SALVAR'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}

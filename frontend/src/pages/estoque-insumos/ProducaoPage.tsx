import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { Input, Select, DatePicker, Button } from '../../components/ui'
import { loadCadastroData } from '../../services/cadastroData'
import { BACKEND_URL } from '../../utils/constants'
import { DATABASE_URL } from '../../utils/constants'

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
  const { fazenda, fazendaId, cadastroSheetUrl } = useSelector((state: RootState) => state.config)
  // const [cadastroData, setCadastroData] = useState<CadastroData | null>(null)
  const [suplementacaoData, setSuplementacaoData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState<FormData>({
    dataProducao: new Date().toLocaleDateString('pt-BR'),
    dietaProduzida: '',
    destinoProducao: '',
    totalProduzido: '',
    insumosQuantidades: {},
  })

  const DESTINOS = ['Cria', 'Recria', 'Engorda', 'Tropa', 'Outros Animais']

  useEffect(() => {
    const loadData = async () => {
      if (!cadastroSheetUrl) {
        setError('URL da planilha de cadastro não configurada')
        setLoading(false)
        return
      }

      try {
        await loadCadastroData(cadastroSheetUrl)
        setLoading(false)
      } catch (err) {
        setError('Erro ao carregar dados de cadastro')
        setLoading(false)
      }
    }

    loadData()
  }, [cadastroSheetUrl])

  // Carregar dados de suplementação (insumos e dietas)
  useEffect(() => {
    async function carregarSuplementacaoData() {
      if (!cadastroSheetUrl) {
        setSuplementacaoData(null)
        return
      }

      try {
        const res = await fetch(`${BACKEND_URL}/api/insumos/suplementacao`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl }),
        })
        const data = await res.json()
        if (data.success) {
          setSuplementacaoData(data)

          // Inicializar quantidades de insumos como vazio
          const insumosQuantidades: Record<string, string> = {}
          data.insumos.forEach((insumo: string) => {
            insumosQuantidades[insumo] = ''
          })
          setForm(prev => ({ ...prev, insumosQuantidades }))
        }
      } catch (error) {
        console.error('Erro ao carregar dados de suplementação:', error)
      }
    }

    carregarSuplementacaoData()
  }, [cadastroSheetUrl])

  useEffect(() => {
    // Calcular total produzido (soma das quantidades de insumos)
    const total = Object.values(form.insumosQuantidades).reduce((sum, qty) => {
      return sum + (parseFloat(qty) || 0)
    }, 0)
    setForm(prev => ({ ...prev, totalProduzido: total.toFixed(2) }))
  }, [form.insumosQuantidades])

  // Obter insumos relevantes para a dieta selecionada
  const getInsumosPorDieta = (): string[] => {
    if (!suplementacaoData) return []
    if (!form.dietaProduzida) return suplementacaoData.insumos

    // Se tiver mapeamento específico, usar. Senão, mostrar todos os insumos
    const insumosMapeados = DIETA_INSUMOS_MAP[form.dietaProduzida]
    if (insumosMapeados && insumosMapeados.length > 0) {
      return insumosMapeados
    }

    // Por padrão, mostrar todos os insumos
    return suplementacaoData.insumos
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
        body: JSON.stringify({ planilhaUrl: DATABASE_URL, farmId: fazendaId || fazenda, linkPosition: 2 }),
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

      // Identificar insumos usados
      const insumosUsados = suplementacaoData!.insumos.filter(
        (insumo: string) => form.insumosQuantidades[insumo] && parseFloat(form.insumosQuantidades[insumo]) > 0
      )

      const saveRes = await fetch(`${BACKEND_URL}/api/insumos/producao`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insumosSheetUrl: validateData.farmSheetUrl,
          values: mainValues,
          insumosUsados,
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
      for (const insumo of suplementacaoData!.insumos) {
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
            <p className="text-white text-base font-semibold flex-1 text-center">PRODUÇÃO FÁBRICA</p>
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
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-8">
            {/* Seção 1: Dados da Produção */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS DA PRODUÇÃO</h2>
              <DatePicker
                label="DATA DE PRODUÇÃO"
                value={form.dataProducao}
                onChange={(val) => setForm({ ...form, dataProducao: val })}
              />
              <Select
                label="DIETA PRODUZIDA *"
                value={form.dietaProduzida}
                onChange={(e) => setForm({ ...form, dietaProduzida: e.target.value })}
                options={[{ value: '', label: 'Selecione uma dieta' }, ...(suplementacaoData?.dietas.map((d: string) => ({ value: d, label: d })) || [])]}
              />
              <Select
                label="DESTINO DA PRODUÇÃO *"
                value={form.destinoProducao}
                onChange={(e) => setForm({ ...form, destinoProducao: e.target.value })}
                options={[{ value: '', label: 'Selecione um destino' }, ...DESTINOS.map(d => ({ value: d, label: d }))]}
              />
              <Input
                label="TOTAL PRODUZIDO (kg)"
                value={form.totalProduzido}
                readOnly
              />
            </div>

            {/* Seção 2: Insumos Utilizados */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">2. INSUMOS UTILIZADOS (kg)</h2>
              <div className="grid grid-cols-1 gap-4">
                {insumosRelevantes.map((insumo, index) => (
                  <Input
                    key={index}
                    label={insumo}
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
                    inputMode="decimal"
                    placeholder="0.00"
                  />
                ))}
              </div>
            </div>

            {/* Botões */}
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Button onClick={() => navigate('/modulos/insumos')} variant="secondary" icon="🚫">
                CANCELAR
              </Button>
              <Button type="submit" variant="success" loading={saving} icon="💾">
                SALVAR
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}

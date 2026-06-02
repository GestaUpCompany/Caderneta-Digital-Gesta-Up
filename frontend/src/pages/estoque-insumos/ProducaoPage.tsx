import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { Input, Select, DatePicker, Button } from '../../components/ui'

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
  const { fazenda, fazendaId, logoUrl } = useSelector((state: RootState) => state.config)
  // const [cadastroData, setCadastroData] = useState<CadastroData | null>(null)
  const [suplementacaoData, setSuplementacaoData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      // TODO: Load data from Supabase instead of Google Sheets
      setError('Funcionalidade em migração para Supabase')
      setLoading(false)
    }

    loadData()
  }, [fazendaId])

  // Carregar dados de suplementação (insumos e dietas)
  useEffect(() => {
    async function carregarSuplementacaoData() {
      // TODO: Load data from Supabase instead of Google Sheets
      setSuplementacaoData(null)
    }

    carregarSuplementacaoData()
  }, [])

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
      // TODO: Save to Supabase instead of Google Sheets
      setError('Funcionalidade em migração para Supabase')
      setSaving(false)
      return
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
              logoUrl={logoUrl}
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

import { useEffect, useState } from 'react'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { scrollToFirstError } from '../../utils/scrollToError'
import { Input, DatePicker, Button, ValidationMessage, SearchableModal } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import { loadCadastroData } from '../../services/cadastroData'
import { BACKEND_URL } from '../../utils/constants'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

interface FormState {
  dataProducao: string
  dietaProduzida: string
  destinoProducao: string
  totalProduzido: string
  insumosQuantidades: Record<string, string>
}

const makeInitial = (): FormState => ({
  dataProducao: todayBR(),
  dietaProduzida: '',
  destinoProducao: '',
  totalProduzido: '',
  insumosQuantidades: {},
})

export default function SaidaInsumosPage() {
  const navigate = useNavigate()
  const { fazenda, cadastroSheetUrl } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  // const [cadastroData, setCadastroData] = useState<CadastroData | null>(null)
  const [suplementacaoData, setSuplementacaoData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadingSuplementacao, setLoadingSuplementacao] = useState(false)

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const DESTINOS = ['Cria', 'Recria', 'Engorda', 'Tropa', 'Outros Animais']

  useEffect(() => {
    const loadData = async () => {
      if (!cadastroSheetUrl) {
        setLoading(false)
        return
      }

      try {
        await loadCadastroData(cadastroSheetUrl)
        // setCadastroData(data)
        setLoading(false)
      } catch (err) {
        console.error('Erro ao carregar dados de cadastro:', err)
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
        setLoadingSuplementacao(false)
        return
      }

      setLoadingSuplementacao(true)
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
      } finally {
        setLoadingSuplementacao(false)
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

  const insumosRelevantes = suplementacaoData?.insumos || []

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    try {
      // Primeiro, salvar registro principal na aba Saída Insumos
      const result = await salvarRegistro('saida-insumos', {
        dataProducao: form.dataProducao,
        dietaProduzida: form.dietaProduzida,
        destinoProducao: form.destinoProducao,
        totalProduzido: form.totalProduzido ? Number(form.totalProduzido) : 0,
      })

      if (!result.success && result.errors) {
        setErrors(result.errors)
        scrollToFirstError(result.errors)
        setSalvando(false)
        return
      }

      // Obter o ID da saída gerada
      const saidaId = result.id

      // Salvar cada insumo na aba Insumos por Saída
      for (const insumo of suplementacaoData!.insumos) {
        const quantidade = form.insumosQuantidades[insumo]
        if (quantidade && parseFloat(quantidade) > 0) {
          await salvarRegistro('insumos-por-saida', {
            idSaida: saidaId,
            dataProducao: form.dataProducao,
            dietaProduzida: form.dietaProduzida,
            insumo: insumo,
            quantidade: Number(quantidade),
          })
        }
      }

      const dadosRegistro = {
        dataProducao: form.dataProducao,
        dietaProduzida: form.dietaProduzida,
        destinoProducao: form.destinoProducao,
        totalProduzido: form.totalProduzido ? Number(form.totalProduzido) : 0,
        insumosQuantidades: form.insumosQuantidades,
      }
      setRegistroSalvo(dadosRegistro)
      setShowSuccessModal(true)
      setForm(makeInitial())
    } catch (err) {
      console.error('Erro ao salvar saída de insumos:', err)
      setErrors([{ field: 'geral', message: 'Erro ao salvar saída de insumos' }])
    } finally {
      setSalvando(false)
    }
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/modulos/cadernetas')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header sticky com botões e título */}
      <div className="sticky top-0 z-10 bg-[#1a3a2a] text-white px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-yellow-400 font-bold text-sm min-h-[40px] px-3"
          >
            VOLTAR
          </button>
          <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2">SAÍDA DE INSUMOS</h1>
          <button
            onClick={() => navigate('/caderneta/saida-insumos/lista')}
            className="text-yellow-400 font-bold text-sm min-h-[40px] px-3 -mr-2"
          >
            REGISTROS
          </button>
        </div>
      </div>

      {/* Logos não sticky */}
      <div className="bg-[#1a3a2a] text-white px-4 py-5">
        <div className="flex items-center justify-center gap-8">
          <FarmLogo
            farmName={fazenda}
            type="both"
            size="medium"
          />
        </div>
      </div>

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8">
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-4xl animate-spin">⏳</div>
          </div>
        ) : (
          <>
            {/* Seção 1: Dados da Produção */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS DA PRODUÇÃO</h2>
              <DatePicker
                label="DATA DE PRODUÇÃO"
                value={form.dataProducao}
                onChange={set('dataProducao')}
                error={getError('dataProducao')}
              />
              {suplementacaoData?.dietas && suplementacaoData.dietas.length > 0 ? (
                <SearchableModal
                  label="DIETA PRODUZIDA *"
                  value={form.dietaProduzida}
                  onChange={set('dietaProduzida')}
                  error={getError('dietaProduzida')}
                  options={suplementacaoData.dietas}
                  placeholder="Buscar dieta..."
                  disabled={loadingSuplementacao}
                  id="dietaProduzida"
                  name="dietaProduzida"
                />
              ) : (
                <Input
                  label="DIETA PRODUZIDA *"
                  placeholder={loadingSuplementacao ? 'Carregando...' : 'Digite a dieta'}
                  value={form.dietaProduzida}
                  onChange={(e) => set('dietaProduzida')(e.target.value)}
                  error={getError('dietaProduzida')}
                  disabled={loadingSuplementacao}
                  id="dietaProduzida"
                />
              )}
              <SearchableModal
                label="DESTINO DA PRODUÇÃO *"
                value={form.destinoProducao}
                onChange={set('destinoProducao')}
                error={getError('destinoProducao')}
                options={DESTINOS}
                placeholder="Buscar destino..."
                id="destinoProducao"
                name="destinoProducao"
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
                {insumosRelevantes.map((insumo: string, index: number) => (
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

            <div className="flex flex-col gap-3">
              <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾">
                SALVAR
              </Button>
              <Button onClick={() => { setForm(makeInitial()); setErrors([]) }} variant="secondary" icon="🧹">
                LIMPAR
              </Button>
            </div>
          </>
        )}
      </main>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Saída de Insumos"
        registro={registroSalvo}
        caderneta="saida-insumos"
      />
    </div>
  )
}

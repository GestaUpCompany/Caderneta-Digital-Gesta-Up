import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { Input, DatePicker, Button, ValidationMessage, SearchableModal } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { loadCadastroData, CadastroData } from '../../services/cadastroData'
import { BACKEND_URL } from '../../utils/constants'

interface FormState {
  dataEntrada: string
  horario: string
  produto: string
  quantidade: string
  valorUnitario: string
  valorTotal: string
  notaFiscal: string
  fornecedor: string
  placa: string
  motorista: string
  responsavelRecebimento: string
}

const makeInitial = (): FormState => ({
  dataEntrada: todayBR(),
  horario: '',
  produto: '',
  quantidade: '',
  valorUnitario: '',
  valorTotal: '',
  notaFiscal: '',
  fornecedor: '',
  placa: '',
  motorista: '',
  responsavelRecebimento: '',
})

export default function EntradaInsumosPage() {
  const navigate = useNavigate()
  const { fazenda, cadastroSheetUrl } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [cadastroData, setCadastroData] = useState<CadastroData | null>(null)
  const [suplementacaoData, setSuplementacaoData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [loadingInsumos, setLoadingInsumos] = useState(false)
  const [isHorarioManual, setIsHorarioManual] = useState(false)

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  useEffect(() => {
    const loadData = async () => {
      if (!cadastroSheetUrl) {
        setLoading(false)
        return
      }

      try {
        const data = await loadCadastroData(cadastroSheetUrl)
        setCadastroData(data)
        setLoading(false)
      } catch (err) {
        console.error('Erro ao carregar dados de cadastro:', err)
        setLoading(false)
      }
    }

    loadData()
  }, [cadastroSheetUrl])

  // Carregar dados de suplementação (insumos)
  useEffect(() => {
    async function carregarSuplementacaoData() {
      if (!cadastroSheetUrl) {
        setSuplementacaoData(null)
        setLoadingInsumos(false)
        return
      }

      setLoadingInsumos(true)
      try {
        const res = await fetch(`${BACKEND_URL}/api/insumos/suplementacao`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl }),
        })
        const data = await res.json()
        if (data.success) {
          setSuplementacaoData(data)
        }
      } catch (error) {
        console.error('Erro ao carregar dados de suplementação:', error)
      } finally {
        setLoadingInsumos(false)
      }
    }

    carregarSuplementacaoData()
  }, [cadastroSheetUrl])

  useEffect(() => {
    const quantidade = parseFloat(form.quantidade) || 0
    const valorUnitario = parseFloat(form.valorUnitario) || 0
    const total = quantidade * valorUnitario
    setForm(prev => ({ ...prev, valorTotal: total.toFixed(2) }))
  }, [form.quantidade, form.valorUnitario])

  // Atualiza horário automaticamente a cada minuto se não foi editado pelo usuário
  useEffect(() => {
    if (isHorarioManual) return

    // Inicializa com hora atual
    const agora = new Date()
    const horaAtual = agora.toTimeString().slice(0, 5) // HH:MM
    setForm(prev => ({ ...prev, horario: horaAtual }))

    // Atualiza a cada minuto
    const interval = setInterval(() => {
      const novoAgora = new Date()
      const novaHora = novoAgora.toTimeString().slice(0, 5)
      setForm(prev => ({ ...prev, horario: novaHora }))
    }, 60000) // 1 minuto

    return () => clearInterval(interval)
  }, [isHorarioManual])

  // Marca horário como manual quando usuário altera
  const handleHorarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsHorarioManual(true)
    setForm({ ...form, horario: e.target.value })
  }

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const result = await salvarRegistro('entrada-insumos', {
      dataEntrada: form.dataEntrada,
      horario: form.horario,
      produto: form.produto,
      quantidade: form.quantidade ? Number(form.quantidade) : 0,
      valorUnitario: form.valorUnitario ? Number(form.valorUnitario) : 0,
      valorTotal: form.valorTotal ? Number(form.valorTotal) : 0,
      notaFiscal: form.notaFiscal,
      fornecedor: form.fornecedor,
      placa: form.placa,
      motorista: form.motorista,
      responsavelRecebimento: form.responsavelRecebimento,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
    } else {
      const dadosRegistro = {
        dataEntrada: form.dataEntrada,
        horario: form.horario,
        produto: form.produto,
        quantidade: form.quantidade ? Number(form.quantidade) : 0,
        valorUnitario: form.valorUnitario ? Number(form.valorUnitario) : 0,
        valorTotal: form.valorTotal ? Number(form.valorTotal) : 0,
        notaFiscal: form.notaFiscal,
        fornecedor: form.fornecedor,
        placa: form.placa,
        motorista: form.motorista,
        responsavelRecebimento: form.responsavelRecebimento,
      }
      setRegistroSalvo(dadosRegistro)
      setShowSuccessModal(true)
      setForm(makeInitial())
      setIsHorarioManual(false)
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
          <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2">ENTRADA DE INSUMOS</h1>
          <button
            onClick={() => navigate('/caderneta/entrada-insumos/lista')}
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
            {/* Seção 1: Dados da Entrada */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS DA ENTRADA</h2>
              <DatePicker label="DATA DE ENTRADA" value={form.dataEntrada} onChange={set('dataEntrada')} error={getError('dataEntrada')} />
              
              {/* Horário */}
              <div>
                <label className="block text-lg font-bold text-gray-900 mb-2">
                  HORÁRIO *
                </label>
                <input
                  type="time"
                  value={form.horario}
                  onChange={handleHorarioChange}
                  required
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
                {!isHorarioManual && (
                  <p className="mt-1 text-sm text-gray-500">Atualiza automaticamente</p>
                )}
              </div>
            </div>

            {/* Seção 2: Produto e Quantidade */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">2. PRODUTO E QUANTIDADE</h2>
              {suplementacaoData?.insumos && suplementacaoData.insumos.length > 0 ? (
                <SearchableModal
                  label="PRODUTO *"
                  value={form.produto}
                  onChange={set('produto')}
                  error={getError('produto')}
                  options={suplementacaoData.insumos}
                  placeholder="Buscar insumo..."
                  disabled={loadingInsumos}
                />
              ) : (
                <Input
                  label="PRODUTO *"
                  placeholder={loadingInsumos ? 'Carregando...' : 'Digite o produto'}
                  value={form.produto}
                  onChange={setInput('produto')}
                  error={getError('produto')}
                  disabled={loadingInsumos}
                />
              )}
              <Input
                label="QUANTIDADE (kg) *"
                type="number"
                step="0.01"
                min="0"
                value={form.quantidade}
                onChange={setInput('quantidade')}
                error={getError('quantidade')}
                inputMode="decimal"
              />
              <Input
                label="VALOR UNITÁRIO (R$/kg) *"
                type="number"
                step="0.01"
                min="0"
                value={form.valorUnitario}
                onChange={setInput('valorUnitario')}
                error={getError('valorUnitario')}
                inputMode="decimal"
              />
              <Input
                label="VALOR TOTAL (R$)"
                value={form.valorTotal}
                readOnly
              />
            </div>

            {/* Seção 3: Documentação */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">3. DOCUMENTAÇÃO</h2>
              <Input
                label="N° NOTA FISCAL *"
                value={form.notaFiscal}
                onChange={setInput('notaFiscal')}
                error={getError('notaFiscal')}
              />
              {cadastroData?.fornecedores && cadastroData.fornecedores.length > 0 ? (
                <SearchableModal
                  label="FORNECEDOR *"
                  value={form.fornecedor}
                  onChange={set('fornecedor')}
                  error={getError('fornecedor')}
                  options={cadastroData.fornecedores}
                  placeholder="Buscar fornecedor..."
                  disabled={loading}
                />
              ) : (
                <Input
                  label="FORNECEDOR *"
                  placeholder={loading ? 'Carregando...' : 'Digite o fornecedor'}
                  value={form.fornecedor}
                  onChange={setInput('fornecedor')}
                  error={getError('fornecedor')}
                  disabled={loading}
                />
              )}
            </div>

            {/* Seção 4: Transporte */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">4. TRANSPORTE</h2>
              <Input
                label="PLACA *"
                value={form.placa}
                onChange={setInput('placa')}
                error={getError('placa')}
              />
              <Input
                label="MOTORISTA *"
                value={form.motorista}
                onChange={setInput('motorista')}
                error={getError('motorista')}
              />
              {cadastroData?.funcionarios && cadastroData.funcionarios.length > 0 ? (
                <SearchableModal
                  label="RESPONSÁVEL RECEBIMENTO *"
                  value={form.responsavelRecebimento}
                  onChange={set('responsavelRecebimento')}
                  error={getError('responsavelRecebimento')}
                  options={cadastroData.funcionarios}
                  placeholder="Buscar funcionário..."
                  disabled={loading}
                />
              ) : (
                <Input
                  label="RESPONSÁVEL RECEBIMENTO *"
                  placeholder={loading ? 'Carregando...' : 'Digite o funcionário'}
                  value={form.responsavelRecebimento}
                  onChange={setInput('responsavelRecebimento')}
                  error={getError('responsavelRecebimento')}
                  disabled={loading}
                />
              )}
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾">
                SALVAR
              </Button>
              <Button onClick={() => { setForm(makeInitial()); setErrors([]); setIsHorarioManual(false) }} variant="secondary" icon="🧹">
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
        cadernetaName="Entrada de Insumos"
        registro={registroSalvo}
        caderneta="entrada-insumos"
      />
    </div>
  )
}

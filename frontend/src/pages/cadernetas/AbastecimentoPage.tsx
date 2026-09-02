import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, Radio, ValidationMessage, SearchableModal } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import BannerRascunho from '../../components/BannerRascunho'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { normalizarNumeroString } from '../../utils/formatNumber'
import { scrollToFirstError } from '../../utils/scrollToError'
import { getCachedCadastroData, getMaquinasVeiculosCached } from '../../services/cadastroCache'
import { getFuncionarios } from '../../services/supabaseService'
import { RootState } from '../../store/store'
import { useFormValidation } from '../../hooks/useFormValidation'
import { atualizarNomeUsuarioConfig } from '../../utils/nomeUsuario'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { Brush, Save } from 'lucide-react'

const COMBUSTIVEL_OPTIONS = [
  { value: 'Álcool', label: 'ÁLCOOL' },
  { value: 'Gasolina', label: 'GASOLINA' },
  { value: 'Diesel S10', label: 'DIESEL S10' },
  { value: 'Diesel Comum', label: 'DIESEL COMUM' },
]

const OPERACAO_OPTIONS = [
  { value: 'Nutrição', label: 'NUTRIÇÃO' },
  { value: 'Pulverização', label: 'PULVERIZAÇÃO' },
  { value: 'Gradagem', label: 'GRADAGEM' },
  { value: 'Fertilização/Correção', label: 'FERT./CORRET.' },
  { value: 'Limpeza', label: 'LIMPEZA' },
  { value: 'Niveladora', label: 'NIVELADORA' },
  { value: 'Rodagem', label: 'RODAGEM' },
  { value: 'Manutenção', label: 'MANUTENÇÃO' },
  { value: 'Plantio', label: 'PLANTIO' },
  { value: 'Esterco', label: 'ESTERCO' },
  { value: 'Colheita', label: 'COLHEITA' },
  { value: 'Compactação', label: 'COMPACTAÇÃO' },
  { value: 'Roçada', label: 'ROÇADA' },
  { value: 'Serviços Gerais', label: 'SERVIÇOS GERAIS' },
  { value: 'Terraplanagem', label: 'TERRAPLANAGEM' },
  { value: 'Outros', label: 'OUTROS' },
]

interface FormState {
  data: string
  quemAbasteceu: string
  operadorMotorista: string
  maquinaVeiculo: string
  maquinaVeiculoId: string
  placa: string
  totalAbastecido: string
  totalBomba: string
  combustivel: string
  odometro: string
  tipoOperacao: string
  tipoOperacaoOutros: string
  observacao: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  quemAbasteceu: '',
  operadorMotorista: '',
  maquinaVeiculo: '',
  maquinaVeiculoId: '',
  placa: '',
  totalAbastecido: '',
  totalBomba: '',
  combustivel: '',
  odometro: '',
  tipoOperacao: '',
  tipoOperacaoOutros: '',
  observacao: '',
})

export default function AbastecimentoPage() {
  const navigate = useNavigate()
  const { fazendaId } = useSelector((state: RootState) => state.config)
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'abastecimento', makeInitial })
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [funcionariosDisponiveis, setFuncionariosDisponiveis] = useState<string[]>([])
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(false)
  const [maquinasVeiculosDisponiveis, setMaquinasVeiculosDisponiveis] = useState<any[]>([])
  const [maquinaVeiculoSelecionada, setMaquinaVeiculoSelecionada] = useState<any>(null)


  // Carregar funcionários do cache, com fallback para Supabase
  useEffect(() => {
    const loadFuncionarios = async () => {
      const cachedData = await getCachedCadastroData()
      if (cachedData?.funcionarios && cachedData.funcionarios.length > 0) {
        setFuncionariosDisponiveis(cachedData.funcionarios)
        return
      }
      if (!fazendaId) {
        setFuncionariosDisponiveis([])
        return
      }
      setLoadingFuncionarios(true)
      try {
        const funcionarios = await getFuncionarios(fazendaId)
        setFuncionariosDisponiveis(funcionarios.map(f => f.nome))
      } catch (error) {
        console.error('Erro ao carregar funcionários:', error)
        setFuncionariosDisponiveis([])
      } finally {
        setLoadingFuncionarios(false)
      }
    }
    loadFuncionarios()
  }, [fazendaId])

  // Carregar máquinas/veículos (com cache lazy para offline)
  useEffect(() => {
    async function carregarMaquinasVeiculos() {
      if (!fazendaId) return
      try {
        const maquinas = await getMaquinasVeiculosCached(fazendaId)
        setMaquinasVeiculosDisponiveis(maquinas || [])
      } catch (error) {
        console.error('Erro ao carregar máquinas/veículos:', error)
      }
    }
    carregarMaquinasVeiculos()
  }, [fazendaId])

  // Buscar detalhes da máquina/veículo quando selecionada
  useEffect(() => {
    async function carregarDetalhesMaquinaVeiculo() {
      if (!form.maquinaVeiculo || !fazendaId) {
        setMaquinaVeiculoSelecionada(null)
        setForm(prev => ({ ...prev, maquinaVeiculoId: '', placa: '' }))
        return
      }
      try {
        const lista = await getMaquinasVeiculosCached(fazendaId)
        if (!lista || lista.length === 0) {
          // Cache ainda nao carregou: manter valores existentes (rascunho pode ter restaurado)
          return
        }
        const maquina = lista.find((m: any) => m.nome === form.maquinaVeiculo) || null
        if (maquina) {
          setMaquinaVeiculoSelecionada(maquina)
          setForm(prev => ({ ...prev, maquinaVeiculoId: maquina.id, placa: maquina.placa || '' }))
        } else {
          setMaquinaVeiculoSelecionada(null)
          setForm(prev => ({ ...prev, maquinaVeiculoId: '', placa: '' }))
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes da máquina/veículo:', error)
        setMaquinaVeiculoSelecionada(null)
        setForm(prev => ({ ...prev, maquinaVeiculoId: '', placa: '' }))
      }
    }
    carregarDetalhesMaquinaVeiculo()
  }, [form.maquinaVeiculo, fazendaId])

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Validation rules
  const validationRules: any = {
    data: { required: true },
    quemAbasteceu: { required: true },
    operadorMotorista: { required: true },
    maquinaVeiculo: { required: true },
    totalAbastecido: { required: true },
    combustivel: { required: true },
    odometro: { required: true },
    tipoOperacao: { required: true },
  }

  // Add validation for tipoOperacaoOutros when tipoOperacao is 'Outros'
  if (form.tipoOperacao === 'Outros') {
    validationRules.tipoOperacaoOutros = { required: true }
  }

  const { isValid } = useFormValidation(form, validationRules)

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const result = await salvarRegistro('abastecimento', {
      data: form.data,
      quemAbasteceu: form.quemAbasteceu,
      operadorMotorista: form.operadorMotorista,
      maquinaVeiculo: form.maquinaVeiculo,
      maquinaVeiculoId: form.maquinaVeiculoId,
      placa: form.placa,
      totalAbastecido: form.totalAbastecido,
      totalBomba: form.totalBomba,
      combustivel: form.combustivel,
      odometro: normalizarNumeroString(form.odometro),
      tipoOperacao: form.tipoOperacao,
      tipoOperacaoOutros: form.tipoOperacaoOutros,
      observacao: form.observacao,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
    }
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    limparRascunho()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/')
  }

  return (
    <CadernetaLayout
      title="ABASTECIMENTO"
      cadernetaId="abastecimento"
      dateContent={<DatePicker value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} variant="header" compact inline />}
    >
      <BannerRascunho
        visible={rascunhoRestaurado}
        onConfirmar={confirmarRascunho}
        onDescartar={descartarRascunho}
      />
      {errors.length > 0 && <ValidationMessage errors={errors} />}
      {/* Seção 1: Dados Principais */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS DO ABASTECIMENTO</h2>

        </div>
        <>
          <SearchableModal
            label={<span>QUEM ABASTECEU? <span className="text-red-500">*</span></span>}
            value={form.quemAbasteceu}
            onChange={(val) => { set('quemAbasteceu')(val); atualizarNomeUsuarioConfig(val) }}
            error={getError('quemAbasteceu')}
            options={funcionariosDisponiveis}
            placeholder={loadingFuncionarios ? 'Carregando funcionários...' : 'Buscar funcionário...'}
            disabled={loadingFuncionarios}
            id="quemAbasteceu"
            name="quemAbasteceu"
          />
        </>
        <>
          <SearchableModal
            label={<span>OPERADOR/MOTORISTA? <span className="text-red-500">*</span></span>}
            value={form.operadorMotorista}
            onChange={set('operadorMotorista')}
            error={getError('operadorMotorista')}
            options={funcionariosDisponiveis}
            placeholder={loadingFuncionarios ? 'Carregando funcionários...' : 'Buscar funcionário...'}
            disabled={loadingFuncionarios}
            id="operadorMotorista"
            name="operadorMotorista"
          />
        </>
        <>
          {maquinasVeiculosDisponiveis.length > 0 ? (
            <SearchableModal
              label={<span>MÁQUINA/VEÍCULO? <span className="text-red-500">*</span></span>}
              value={form.maquinaVeiculo}
              onChange={set('maquinaVeiculo')}
              error={getError('maquinaVeiculo')}
              options={maquinasVeiculosDisponiveis.map(m => m.nome)}
              placeholder="Buscar máquina/veículo..."
              id="maquinaVeiculo"
              name="maquinaVeiculo"
            />
          ) : (
            <Input
              label={<span>MÁQUINA/VEÍCULO? <span className="text-red-500">*</span></span>}
              placeholder="Modelo da máquina/veículo"
              value={form.maquinaVeiculo}
              onChange={setInput('maquinaVeiculo')}
              error={getError('maquinaVeiculo')}
            />
          )}
        </>
        {form.maquinaVeiculo && (
          <Input
            label="PLACA"
            placeholder="Placa do veículo"
            value={form.placa}
            onChange={setInput('placa')}
            disabled={!!maquinaVeiculoSelecionada?.placa}
          />
        )}
        <Input label={<span>TOTAL ABASTECIDO (L) <span className="text-red-500">*</span></span>} placeholder="Quantidade abastecida" value={form.totalAbastecido} onChange={setInput('totalAbastecido')} error={getError('totalAbastecido')} inputMode="decimal" />
        <Input label="TOTAL DA BOMBA (L)" placeholder="Total acumulado da bomba" value={form.totalBomba} onChange={setInput('totalBomba')} inputMode="decimal" />
      </div>

      {/* Seção 2: Combustível e Operação */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">2. COMBUSTÍVEL E OPERAÇÃO</h2>
        <Radio
          name="combustivel"
          label={<span>COMBUSTÍVEL? <span className="text-red-500">*</span></span>}
          options={COMBUSTIVEL_OPTIONS}
          value={form.combustivel}
          onChange={(val) => setForm((prev) => ({ ...prev, combustivel: val }))}
          error={getError('combustivel')}
          gridCols={2}
        />
        <Input label={<span>ODÔMETRO/HORÍMETRO? <span className="text-red-500">*</span></span>} placeholder="Leitura do odômetro/horímetro" value={form.odometro} onChange={setInput('odometro')} error={getError('odometro')} inputMode="decimal" />
        <Radio
          name="tipoOperacao"
          label={<span>TIPO DE OPERAÇÃO? <span className="text-red-500">*</span></span>}
          options={OPERACAO_OPTIONS}
          value={form.tipoOperacao}
          onChange={(val) => setForm((prev) => ({ ...prev, tipoOperacao: val }))}
          error={getError('tipoOperacao')}
          gridCols={2}
        />
        {form.tipoOperacao === 'Outros' && (
          <Input
            label={<span>ESPECIFICAR <span className="text-red-500">*</span></span>}
            placeholder="Especifique o tipo de operação"
            value={form.tipoOperacaoOutros}
            onChange={setInput('tipoOperacaoOutros')}
            error={getError('tipoOperacaoOutros')}
          />
        )}
      </div>

      {/* Seção 3: Observação */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">3. OBSERVAÇÃO</h2>
        <Input
          placeholder="Detalhes adicionais (opcional)"
          value={form.observacao}
          onChange={setInput('observacao')}
        />
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleSalvar}
          disabled={salvando || !isValid}
          className={`w-full !min-h-0 rounded-2xl border-2 px-3 py-4 text-base font-bold transition-colors active:scale-[0.99] ${
            salvando || !isValid
              ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
              : 'border-green-600 bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Save className="h-5 w-5" strokeWidth={2.5} />
            {salvando ? 'SALVANDO...' : 'SALVAR'}
          </span>
        </button>
        <button
          type="button"
          onClick={() => limparRascunho()}
          className="w-full !min-h-0 rounded-2xl border-2 border-gray-300 bg-gray-200 px-3 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-300 active:scale-95"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Brush className="h-4 w-4" strokeWidth={2.5} />
            LIMPAR
          </span>
        </button>
      </div>
      {!isValid && (
        <p className="text-base text-gray-600 text-center">
          <span className="text-red-500">*</span> Preencha todos os campos obrigatórios para salvar
        </p>
      )}

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Abastecimento"
        registro={registroSalvo}
        caderneta="abastecimento"
      />
    </CadernetaLayout>
  )
}

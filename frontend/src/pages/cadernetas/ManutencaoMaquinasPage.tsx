import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, Radio, ValidationMessage } from '../../components/ui'
import SearchableModal from '../../components/ui/SearchableModal'
import SuccessModal from '../../components/SuccessModal'
import BannerRascunho from '../../components/BannerRascunho'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import CadernetaHeader from '../../components/CadernetaHeader'
import { getCachedCadastroData, getMaquinasVeiculosCached } from '../../services/cadastroCache'
import { getFuncionarios } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import { useFormValidation } from '../../hooks/useFormValidation'
import { atualizarNomeUsuarioConfig } from '../../utils/nomeUsuario'
import { normalizarNumeroString } from '../../utils/formatNumber'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { Brush, Save } from 'lucide-react'

const SN_OPTIONS = [
  { value: 'S', label: 'SIM', icon: '✅' },
  { value: 'N', label: 'NÃO', icon: '❌' },
]

const CHECKLIST_PERGUNTAS = [
  { campo: 'abastecimentoRealizado', label: 'ABASTECIMENTO REALIZADO?' },
  { campo: 'lavagemRealizada', label: 'LAVAGEM REALIZADA?' },
  { campo: 'vidrosPerfeitos', label: 'VIDROS ESTÃO PERFEITOS?' },
  { campo: 'freiosBons', label: 'FREIOS ESTÃO BONS?' },
  { campo: 'bateriaBoa', label: 'BATERIA ESTÁ BOA?' },
  { campo: 'conferiuEletrica', label: 'CONFERIU ELÉTRICA?' },
  { campo: 'maquinaEngraxada', label: 'MÁQUINA ENGRAXADA?' },
  { campo: 'nivelAguaIdeal', label: 'NÍVEL DE ÁGUA IDEAL?' },
  { campo: 'conferiuNivelOleo', label: 'CONFERIU NÍVEL DO ÓLEO?' },
  { campo: 'calibrouPneus', label: 'CALIBROU OS PNEUS?' },
  { campo: 'limpouRadiador', label: 'LIMPOU O RADIADOR?' },
  { campo: 'tapetesBons', label: 'TAPETES ESTÃO BONS?' },
  { campo: 'assentoBom', label: 'ASSENTO ESTÁ BOM?' },
]

interface FormState {
  data: string
  responsavelChecklist: string
  operadorMotorista: string
  maquinaVeiculo: string
  placa: string
  odometro: string
  checklist: {
    [key: string]: {
      valor: string | null
      observacao: string
    }
  }
  observacao: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  responsavelChecklist: '',
  operadorMotorista: '',
  maquinaVeiculo: '',
  placa: '',
  odometro: '',
  checklist: CHECKLIST_PERGUNTAS.reduce((acc, { campo }) => {
    acc[campo] = { valor: '', observacao: '' }
    return acc
  }, {} as FormState['checklist']),
  observacao: '',
})

export default function ManutencaoMaquinasPage() {
  const navigate = useNavigate()
  const fazendaId = useSelector((state: RootState) => state.config.fazendaId)

  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'manutencao-maquinas', makeInitial })
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [funcionariosDisponiveis, setFuncionariosDisponiveis] = useState<string[]>([])
  const [maquinasVeiculosDisponiveis, setMaquinasVeiculosDisponiveis] = useState<any[]>([])

  const set = (key: keyof FormState) => (value: string) => setForm(prev => ({ ...prev, [key]: value }))
  const setInput = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const setChecklistValor = (campo: string) => (val: string) =>
    setForm((p) => ({
      ...p,
      checklist: {
        ...p.checklist,
        [campo]: { ...p.checklist[campo], valor: val }
      }
    }))

  const setChecklistObs = (campo: string) => (val: string) =>
    setForm((p) => ({
      ...p,
      checklist: {
        ...p.checklist,
        [campo]: { ...p.checklist[campo], observacao: val }
      }
    }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Validation rules
  const validationRules: any = {
    data: { required: true },
    responsavelChecklist: { required: true },
    operadorMotorista: { required: true },
    maquinaVeiculo: { required: true },
    odometro: { required: true },
  }

  // Add validation for checklist fields
  CHECKLIST_PERGUNTAS.forEach(({ campo }) => {
    validationRules[campo] = { required: true }
  })

  const { isValid } = useFormValidation(form, validationRules)

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const result = await salvarRegistro('manutencao-maquinas', {
      data: form.data,
      responsavelChecklist: form.responsavelChecklist,
      operadorMotorista: form.operadorMotorista,
      maquinaVeiculo: form.maquinaVeiculo,
      placa: form.placa,
      odometro: normalizarNumeroString(form.odometro),
      checklist: form.checklist,
      observacao: form.observacao || '',
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      limparRascunho()
    }
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  // Carregar funcionários do cache
  useEffect(() => {
    const loadData = async () => {
      const cache = await getCachedCadastroData()
      if (cache && cache.funcionarios && cache.funcionarios.length > 0) {
        setFuncionariosDisponiveis(cache.funcionarios)
      } else if (fazendaId) {
        try {
          const funcionariosData = await getFuncionarios(fazendaId)
          setFuncionariosDisponiveis(funcionariosData?.map((f: any) => f.nome) || [])
        } catch (error) {
          console.error('Erro ao carregar funcionários do Supabase:', error)
        }
      }
    }
    loadData()
  }, [fazendaId])

  // Carregar máquinas/veículos (com cache lazy para offline)
  useEffect(() => {
    const loadData = async () => {
      if (fazendaId) {
        try {
          const maquinasData = await getMaquinasVeiculosCached(fazendaId)
          const filtered = (maquinasData || []).filter((m: any) => m.status?.toLowerCase() === 'ativo')
          setMaquinasVeiculosDisponiveis(filtered)
        } catch (error) {
          console.error('Erro ao carregar máquinas/veículos:', error)
        }
      }
    }
    loadData()
  }, [fazendaId])

  // Buscar detalhes da máquina/veículo quando selecionada
  useEffect(() => {
    async function carregarDetalhesMaquinaVeiculo() {
      if (!form.maquinaVeiculo || !fazendaId) {
        setForm(prev => ({ ...prev, placa: '' }))
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
          setForm(prev => ({ ...prev, placa: maquina.placa || '' }))
        } else {
          setForm(prev => ({ ...prev, placa: '' }))
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes da máquina/veículo:', error)
        setForm(prev => ({ ...prev, placa: '' }))
      }
    }
    carregarDetalhesMaquinaVeiculo()
  }, [form.maquinaVeiculo, fazendaId])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <CadernetaHeader
        title="MANUT. MÁQUINAS"
        cadernetaId="manutencao-maquinas"
        dateContent={<DatePicker value={form.data} onChange={set('data')} variant="header" compact inline />}
      />

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8 desktop-form-container">
        <BannerRascunho
          visible={rascunhoRestaurado}
          onConfirmar={confirmarRascunho}
          onDescartar={descartarRascunho}
        />
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: Dados Principais */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS PRINCIPAIS</h2>

          </div>
          <div className="flex flex-col gap-3">
            {funcionariosDisponiveis.length > 0 ? (
              <SearchableModal
                label={<span>RESPONSÁVEL <span className="text-red-500">*</span></span>}
                value={form.responsavelChecklist}
                onChange={(val) => { set('responsavelChecklist')(val); atualizarNomeUsuarioConfig(val) }}
                error={getError('responsavelChecklist')}
                options={funcionariosDisponiveis}
                placeholder="Buscar funcionário..."
                id="responsavelChecklist"
                name="responsavelChecklist"
              />
            ) : (
              <Input
                label={<span>RESPONSÁVEL <span className="text-red-500">*</span></span>}
                placeholder="Carregando..."
                value={form.responsavelChecklist}
                onChange={(e) => { setInput('responsavelChecklist')(e); atualizarNomeUsuarioConfig(e.target.value) }}
                error={getError('responsavelChecklist')}
                disabled
                id="responsavelChecklist"
              />
            )}
            {funcionariosDisponiveis.length > 0 ? (
              <SearchableModal
                label={<span>OPERADOR/MOTORISTA <span className="text-red-500">*</span></span>}
                value={form.operadorMotorista}
                onChange={set('operadorMotorista')}
                error={getError('operadorMotorista')}
                options={funcionariosDisponiveis}
                placeholder="Buscar funcionário..."
                id="operadorMotorista"
                name="operadorMotorista"
              />
            ) : (
              <Input
                label={<span>OPERADOR/MOTORISTA <span className="text-red-500">*</span></span>}
                placeholder="Carregando..."
                value={form.operadorMotorista}
                onChange={setInput('operadorMotorista')}
                error={getError('operadorMotorista')}
                disabled
                id="operadorMotorista"
              />
            )}
          </div>
          {maquinasVeiculosDisponiveis.length > 0 ? (
            <SearchableModal
              label={<span>MÁQUINA/VEÍCULO <span className="text-red-500">*</span></span>}
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
              label={<span>MÁQUINA/VEÍCULO <span className="text-red-500">*</span></span>}
              placeholder="Carregando..."
              value={form.maquinaVeiculo}
              onChange={setInput('maquinaVeiculo')}
              error={getError('maquinaVeiculo')}
              disabled
            />
          )}
          {form.placa && (
            <Input
              label="PLACA"
              placeholder="Informe a placa"
              value={form.placa}
              onChange={setInput('placa')}
              error={getError('placa')}
              readOnly
            />
          )}
          <Input
            label={<span>ODÔMETRO/HORÍMETRO (km) <span className="text-red-500">*</span></span>}
            placeholder="Informe a quilometragem/horímetro"
            value={form.odometro}
            onChange={setInput('odometro')}
            error={getError('odometro')}
            inputMode="decimal"
          />
        </div>

        {/* Seção 2: Checklist */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. CHECKLIST <span className="text-red-500">*</span></h2>
          {CHECKLIST_PERGUNTAS.map(({ campo, label }) => (
            <div key={campo}>
              <Radio
                name={campo}
                label={label}
                options={SN_OPTIONS}
                value={form.checklist[campo]?.valor || ''}
                onChange={setChecklistValor(campo)}
                error={getError(campo)}
                gridCols={2}
              />
              {form.checklist[campo]?.valor === 'N' && (
                <Input
                  placeholder="Adicionar observação (opcional)"
                  value={form.checklist[campo]?.observacao || ''}
                  onChange={(e) => setChecklistObs(campo)(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>
          ))}
        </div>

        {/* Seção 3: Observação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. OBSERVAÇÃO</h2>
          <Input
            label=""
            placeholder="Adicione observações adicionais (opcional)"
            value={form.observacao}
            onChange={setInput('observacao')}
            error={getError('observacao')}
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
      </main>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleNewRecord}
        onNewRecord={handleNewRecord}
        onExit={() => navigate(-1)}
        cadernetaName="MANUTENÇÃO DE MÁQUINAS"
        registro={registroSalvo}
        caderneta="manutencao-maquinas"
      />
    </div>
  )
}

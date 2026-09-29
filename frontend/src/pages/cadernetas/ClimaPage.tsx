import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, ValidationMessage, TimeInput } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import ChoiceGrid from '../../components/cadernetas/ChoiceGrid'
import StepperInput from '../../components/cadernetas/StepperInput'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import FormFooter from '../../components/cadernetas/FormFooter'
import BannerRascunho from '../../components/BannerRascunho'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import { getPluviometrosCached } from '../../services/cadastroCache'
import { scrollToFirstError } from '../../utils/scrollToError'
import { useFormValidation } from '../../hooks/useFormValidation'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'

interface Pluviometro {
  id: string
  nome: string
  localizacao: string
  ativo: boolean | null
}

interface MedicaoPluviometro {
  pluviometroId: string
  pluviometroNome: string
  pluviometroLocalizacao: string
  medicao: string
  temperatura: string
  horario: string
}

const TEMPO_OPTIONS = [
  { value: 'sol', label: 'Sol', icon: '☀️' },
  { value: 'nublado', label: 'Nublado', icon: '⛅' },
  { value: 'chuva_fraca', label: 'Chuva fraca', icon: '🌦️' },
  { value: 'chuva_forte', label: 'Chuva forte', icon: '🌧️' },
  { value: 'temporal', label: 'Temporal', icon: '⛈️' },
  { value: 'vento_forte', label: 'Vento forte', icon: '💨' },
  { value: 'frio', label: 'Frio', icon: '🥶' },
  { value: 'seco_poeira', label: 'Seco / poeira', icon: '🌵' },
]

interface FormState {
  data: string
  choveu: string
  esvaziouPluviometros: string
  tempoAtual: string
  temperaturaMediaCalculada: string
  umidadeRelativa: string
  observacao: string
  medicoes: MedicaoPluviometro[]
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  choveu: '',
  esvaziouPluviometros: '',
  tempoAtual: '',
  temperaturaMediaCalculada: '',
  umidadeRelativa: '',
  observacao: '',
  medicoes: [],
})

export default function ClimaPage() {
  const navigate = useNavigate()
  const { usuario, fazendaId } = useSelector((state: RootState) => state.config)
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'clima', makeInitial })
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [pluviometrosDisponiveis, setPluviometrosDisponiveis] = useState<Pluviometro[]>([])

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Validation rules
  const validationRules: any = {
    data: { required: true },
    choveu: { required: true },
    esvaziouPluviometros: { required: true },
    _responsavel: {
      custom: () => (!usuario || usuario.trim() === '') ? 'Responsável é obrigatório' : null
    },
    _medicoes_min: {
      custom: () => form.medicoes.length === 0 ? 'Selecione pelo menos 1 pluviômetro' : null
    }
  }

  // Add validation for selected pluviometer measurements only
  form.medicoes?.forEach((medicao) => {
    validationRules[`medicao_${medicao.pluviometroId}`] = { required: true }
    validationRules[`horario_${medicao.pluviometroId}`] = { required: true }
  })

  const { isValid } = useFormValidation(form, validationRules)

  // Buscar pluviômetros (com cache lazy para offline)
  useEffect(() => {
    async function carregarPluviometros() {
      if (!fazendaId) return
      try {
        const data = await getPluviometrosCached(fazendaId)
        if (data) {
          setPluviometrosDisponiveis(data as Pluviometro[])
        }
      } catch (error) {
        console.error('Erro ao carregar pluviômetros:', error)
      }
    }
    carregarPluviometros()
  }, [fazendaId])

  // Pluviômetros disponíveis para seleção (excluir os já selecionados)
  const pluviometrosParaSelecionar = pluviometrosDisponiveis.filter(
    p => !form.medicoes.some(m => m.pluviometroId === p.id)
  )

  const handleAddPluviometro = (pluviometroId: string) => {
    if (!pluviometroId) return
    const pluviometro = pluviometrosDisponiveis.find(p => p.id === pluviometroId)
    if (!pluviometro) return
    const agora = new Date()
    const horarioAtual = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`
    setForm(prev => ({
      ...prev,
      medicoes: [...prev.medicoes, {
        pluviometroId: pluviometro.id,
        pluviometroNome: pluviometro.nome,
        pluviometroLocalizacao: pluviometro.localizacao,
        medicao: '',
        temperatura: '',
        horario: horarioAtual,
      }]
    }))
  }

  const handleRemovePluviometro = (pluviometroId: string) => {
    setForm(prev => ({
      ...prev,
      medicoes: prev.medicoes.filter(m => m.pluviometroId !== pluviometroId)
    }))
  }

  const handleMedicaoChange = (pluviometroId: string, value: string) => {
    setForm(prev => ({
      ...prev,
      medicoes: prev.medicoes.map(m =>
        m.pluviometroId === pluviometroId ? { ...m, medicao: value } : m
      )
    }))
  }

  const handleTemperaturaChange = (pluviometroId: string, value: string) => {
    setForm(prev => ({
      ...prev,
      medicoes: prev.medicoes.map(m =>
        m.pluviometroId === pluviometroId ? { ...m, temperatura: value } : m
      )
    }))
  }

  const handleHorarioChange = (pluviometroId: string, value: string) => {
    setForm(prev => ({
      ...prev,
      medicoes: prev.medicoes.map(m =>
        m.pluviometroId === pluviometroId ? { ...m, horario: value } : m
      )
    }))
  }

  // Calcular temperatura média automaticamente a partir das temperaturas dos pluviômetros
  useEffect(() => {
    const temperaturasPreenchidas = form.medicoes
      .map(m => m.temperatura)
      .filter(t => t !== '')
      .map(t => Number(t))
      .filter(t => !isNaN(t))

    if (temperaturasPreenchidas.length > 0) {
      const media = temperaturasPreenchidas.reduce((a, b) => a + b, 0) / temperaturasPreenchidas.length
      setForm(prev => ({ ...prev, temperaturaMediaCalculada: media.toFixed(1) }))
    } else {
      setForm(prev => ({ ...prev, temperaturaMediaCalculada: '' }))
    }
  }, [form.medicoes])

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const medicoesParaSalvar = form.medicoes
      .filter(m => m.medicao !== '')
      .map(m => ({
        pluviometro_id: m.pluviometroId,
        pluviometro_nome: m.pluviometroNome,
        pluviometro_localizacao: m.pluviometroLocalizacao,
        medicao: Number(m.medicao),
        temperatura: m.temperatura ? Number(m.temperatura) : null,
        horario: m.horario || null,
      }))

    const temperaturasPreenchidas = form.medicoes
      .map(m => m.temperatura)
      .filter(t => t !== '')
      .map(t => Number(t))
      .filter(t => !isNaN(t))

    const temperaturaMedia = temperaturasPreenchidas.length > 0
      ? temperaturasPreenchidas.reduce((a, b) => a + b, 0) / temperaturasPreenchidas.length
      : null

    const result = await salvarRegistro('clima', {
      data: form.data,
      responsavel: usuario,
      usuario: usuario,
      choveu: form.choveu === '' ? null : form.choveu === 'sim',
      esvaziouPluviometros: form.esvaziouPluviometros === '' ? null : form.esvaziouPluviometros === 'sim',
      tempoAtual: form.tempoAtual || null,
      temperaturaMedia: temperaturaMedia,
      umidadeRelativa: form.umidadeRelativa ? Number(form.umidadeRelativa) : null,
      observacao: form.observacao,
      medicoes: medicoesParaSalvar,
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/')
  }

  return (
    <>
      <CadernetaLayout
        title="CLIMA"
        cadernetaId="clima"
        dateContent={<DatePicker value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} variant="header" compact inline />}
      >
        <BannerRascunho
          visible={rascunhoRestaurado}
          onConfirmar={confirmarRascunho}
          onDescartar={descartarRascunho}
        />
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        <CadernetaSection numero={1} titulo="Chuva">
          <div>
            <label className="block text-[15px] font-bold text-gray-900 mb-2">
              CHOVEU DESDE A ÚLTIMA LEITURA? <span className="text-red-500">*</span>
            </label>
            <ChoiceGrid
              options={[
                { value: 'nao', label: 'NÃO CHOVEU', icon: '☀️' },
                { value: 'sim', label: 'CHOVEU', icon: '🌧️' },
              ]}
              value={form.choveu}
              onChange={(v) => setForm((prev) => ({ ...prev, choveu: v }))}
              cols={2}
              dataField="choveu"
            />
          </div>
          {pluviometrosDisponiveis.length === 0 ? (
            <p className="text-gray-500 text-center py-2 text-sm">Nenhum pluviômetro cadastrado para esta fazenda.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {pluviometrosParaSelecionar.length > 0 && (
                <select
                  className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 text-[16px] font-semibold text-gray-600 bg-white focus:outline-none focus:border-brand-700"
                  value=""
                  onChange={(e) => handleAddPluviometro(e.target.value)}
                >
                  <option value="">+ Adicionar pluviômetro...</option>
                  {pluviometrosParaSelecionar.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome}{p.localizacao ? ` (${p.localizacao})` : ''}
                    </option>
                  ))}
                </select>
              )}

              {form.medicoes.length === 0 ? (
                <p className="text-gray-400 text-center py-2 text-sm">
                  Nenhum pluviômetro selecionado. Use o seletor acima para adicionar.
                </p>
              ) : (
                form.medicoes.map((medicao) => (
                  <div key={medicao.pluviometroId} className="flex flex-col gap-3 pb-4 border-b border-gray-100 last:border-b-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 leading-tight">
                          🌧️ {medicao.pluviometroNome}
                        </p>
                        {medicao.pluviometroLocalizacao && (
                          <p className="text-sm text-gray-500 mt-0.5">{medicao.pluviometroLocalizacao}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePluviometro(medicao.pluviometroId)}
                        className="!min-w-0 !min-h-0 w-8 h-8 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors text-lg leading-none flex items-center justify-center flex-shrink-0"
                        aria-label="Remover pluviômetro"
                      >
                        ✕
                      </button>
                    </div>
                    <StepperInput
                      value={medicao.medicao}
                      onChange={(v) => handleMedicaoChange(medicao.pluviometroId, v)}
                      suffix="mm"
                      error={getError(`medicao_${medicao.pluviometroId}`)}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <TimeInput
                        label={<span>HORÁRIO <span className="text-red-500">*</span></span>}
                        value={medicao.horario}
                        onChange={(v) => handleHorarioChange(medicao.pluviometroId, v)}
                        error={getError(`horario_${medicao.pluviometroId}`)}
                      />
                      <Input
                        label="TEMPERATURA (°C)"
                        placeholder="Ex: 25.5"
                        value={medicao.temperatura}
                        onChange={(e) => handleTemperaturaChange(medicao.pluviometroId, e.target.value)}
                        type="number"
                        step="0.1"
                        textSize="base"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          <div>
            <label className="block text-[15px] font-bold text-gray-900 mb-2">
              ESVAZIOU OS PLUVIÔMETROS? <span className="text-red-500">*</span>
            </label>
            <ChoiceGrid
              options={[
                { value: 'sim', label: 'SIM', icon: '✓', tone: 'success' },
                { value: 'nao', label: 'NÃO', icon: '✗', tone: 'danger' },
              ]}
              value={form.esvaziouPluviometros}
              onChange={(v) => setForm((prev) => ({ ...prev, esvaziouPluviometros: v }))}
              cols={2}
              showCheck={false}
              dataField="esvaziouPluviometros"
            />
          </div>
        </CadernetaSection>

        <CadernetaSection numero={2} titulo="Tempo agora">
          <ChoiceGrid
            options={TEMPO_OPTIONS}
            value={form.tempoAtual}
            onChange={(v) => setForm((prev) => ({ ...prev, tempoAtual: v }))}
            cols={4}
            dataField="tempoAtual"
          />
          <Input
            label="UMIDADE DO AR (SE TIVER APARELHO)"
            placeholder="Ex: 75"
            value={form.umidadeRelativa}
            onChange={setInput('umidadeRelativa')}
            error={getError('umidadeRelativa')}
            type="number"
            step="0.1"
            suffix="%"
          />
          {form.temperaturaMediaCalculada !== '' && (
            <InfoStrip tone="success" icon="🌡️">
              Temperatura média dos pluviômetros: {form.temperaturaMediaCalculada} °C
            </InfoStrip>
          )}
        </CadernetaSection>

        <CadernetaSection numero={3} titulo="Observação">
          <Input
            placeholder="Detalhes adicionais (opcional)"
            value={form.observacao}
            onChange={setInput('observacao')}
            error={getError('observacao')}
          />
        </CadernetaSection>

        <FormFooter
          onSalvar={handleSalvar}
          onLimpar={() => limparRascunho()}
          salvando={salvando}
          disabled={!isValid}
          formValido={isValid}
        />
      </CadernetaLayout>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Clima"
        registro={registroSalvo}
        caderneta="clima"
      />
    </>
  )
}

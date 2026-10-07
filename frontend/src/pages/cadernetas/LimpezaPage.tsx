import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, ValidationMessage, SearchableModal, TimeInput } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import ChoiceGrid from '../../components/cadernetas/ChoiceGrid'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import FormFooter from '../../components/cadernetas/FormFooter'
import BannerRascunho from '../../components/BannerRascunho'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { scrollToFirstError } from '../../utils/scrollToError'
import { useFormValidation } from '../../hooks/useFormValidation'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { usePhotoGps } from '../../hooks/usePhotoGps'
import FotoSection from '../../components/cadernetas/FotoSection'
import { RootState } from '../../store/store'
import { getSetoresCached, getLocaisCached } from '../../services/cadastroCache'

const LIMPEZA_OPTIONS = [
  { value: 'capina', label: 'Capina', icon: '⛏️' },
  { value: 'grama', label: 'Grama', icon: '🌱' },
  { value: 'herbicida', label: 'Herbicida', icon: '💉' },
  { value: 'aceiros', label: 'Aceiros', icon: '🔥' },
  { value: 'poda_arvores', label: 'Poda Árvores', icon: '🌳' },
  { value: 'lixo_recolhido', label: 'Lixo Recolhido', icon: '🗑️' },
  { value: 'rocada', label: 'Roçada', icon: '🌾' },
  { value: 'lavagem', label: 'Lavagem', icon: '🚿' },
  { value: 'organizacao', label: 'Organização', icon: '📦' },
  { value: 'polimento', label: 'Polimento', icon: '✨' },
]

const PESSOAS_OPTIONS = ['1', '2', '3', '4', '5', '6', '7', '8+'].map((n) => ({
  value: n,
  label: n,
}))

interface FormState {
  data: string
  numeroEquipe: string
  setor: string
  local: string
  horaInicio: string
  horaFinal: string
  limpezaRealizada: string[]
  observacao: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  numeroEquipe: '',
  setor: '',
  local: '',
  horaInicio: '',
  horaFinal: '',
  limpezaRealizada: [],
  observacao: '',
})

const horaAgora = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const tempoDecorrido = (inicio: string, fim: string) => {
  const [h1, m1] = inicio.split(':').map(Number)
  const [h2, m2] = fim.split(':').map(Number)
  const diff = h2 * 60 + m2 - (h1 * 60 + m1)
  if (diff < 0) return null
  return `${Math.floor(diff / 60)}h ${String(diff % 60).padStart(2, '0')} min`
}

export default function LimpezaPage() {
  const navigate = useNavigate()
  const { fazendaId, usuario } = useSelector((state: RootState) => state.config)
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'limpeza', makeInitial })
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [setoresDisponiveis, setSetoresDisponiveis] = useState<string[]>([])
  const [locaisDisponiveis, setLocaisDisponiveis] = useState<string[]>([])
  const [horarioManual, setHorarioManual] = useState(false)
  const [, setTick] = useState(0)

  // Hook reutilizavel de foto (sem GPS nesta caderneta)
  const {
    fotoBase64,
    capturandoFoto,
    fotoErro,
    capturarFoto,
    limpar: limparFoto,
    fotoInputRef,
    handleFileInputChange,
  } = usePhotoGps({ comGps: false })

  // Carregar setores e locais (com cache lazy para offline)
  useEffect(() => {
    const loadData = async () => {
      if (fazendaId) {
        try {
          const [setoresData, locaisData] = await Promise.all([
            getSetoresCached(fazendaId),
            getLocaisCached(fazendaId)
          ])
          setSetoresDisponiveis(setoresData?.map((s: any) => s.nome) || [])
          setLocaisDisponiveis(locaisData?.map((l: any) => l.nome) || [])
        } catch (error) {
          console.error('Erro ao carregar dados:', error)
        }
      }
    }
    loadData()
  }, [fazendaId])

  // Atualiza o tempo decorrido enquanto a atividade esta em andamento
  useEffect(() => {
    if (!form.horaInicio || form.horaFinal) return
    const t = setInterval(() => setTick((v) => v + 1), 30000)
    return () => clearInterval(t)
  }, [form.horaInicio, form.horaFinal])

  // Validation rules
  const validationRules: any = {
    data: { required: true },
    numeroEquipe: { required: true },
    setor: { required: true },
    local: { required: true },
    horaInicio: { required: true },
    horaFinal: { required: true },
    limpezaRealizada: {
      required: true,
      custom: (value: string[]) => {
        if (value.length === 0) return 'Selecione pelo menos um tipo de limpeza'
        return null
      }
    }
  }

  const { isValid } = useFormValidation(form, validationRules)

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const setTimeInput = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const result = await salvarRegistro('limpeza', {
      data: form.data,
      numeroEquipe: form.numeroEquipe,
      setor: form.setor,
      local: form.local,
      horaInicio: form.horaInicio,
      horaFinal: form.horaFinal,
      limpezaRealizada: form.limpezaRealizada,
      tarefas: {},
      observacao: form.observacao,
      usuario: usuario,
      fotoBase64: fotoBase64 || null,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      limparFoto()
    }
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    limparRascunho()
    limparFoto()
    setHorarioManual(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/')
  }

  const handleLimpar = () => {
    limparRascunho()
    limparFoto()
    setErrors([])
    setHorarioManual(false)
  }

  const duracao = form.horaInicio
    ? tempoDecorrido(form.horaInicio, form.horaFinal || horaAgora())
    : null

  return (
    <CadernetaLayout
      title="LIMPEZA"
      cadernetaId="limpeza"
      dateContent={<DatePicker value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} variant="header" compact inline />}
    >
      <BannerRascunho
        visible={rascunhoRestaurado}
        onConfirmar={confirmarRascunho}
        onDescartar={descartarRascunho}
      />
      {errors.length > 0 && <ValidationMessage errors={errors} />}

      <CadernetaSection numero={1} titulo="Dados da limpeza">
        <div>
          <label className="block text-[15px] font-bold text-gray-900 mb-2">
            QUANTAS PESSOAS? <span className="text-red-500">*</span>
          </label>
          <ChoiceGrid
            options={PESSOAS_OPTIONS}
            value={form.numeroEquipe}
            onChange={(v) => setForm((prev) => ({ ...prev, numeroEquipe: v }))}
            cols={8}
            size="sm"
            showCheck={false}
            className="max-w-[300px]"
            dataField="numeroEquipe"
          />
        </div>
        {setoresDisponiveis.length > 0 ? (
          <SearchableModal
            label={<span>QUAL SETOR? <span className="text-red-500">*</span></span>}
            value={form.setor}
            onChange={(val) => setForm((prev) => ({ ...prev, setor: val }))}
            error={getError('setor')}
            options={setoresDisponiveis}
            placeholder="Buscar setor..."
            id="setor"
            name="setor"
          />
        ) : (
          <Input label={<span>QUAL SETOR? <span className="text-red-500">*</span></span>} placeholder="Carregando..." value={form.setor} onChange={setInput('setor')} error={getError('setor')} disabled />
        )}
        {locaisDisponiveis.length > 0 ? (
          <SearchableModal
            label={<span>QUAL LOCAL? <span className="text-red-500">*</span></span>}
            value={form.local}
            onChange={(val) => setForm((prev) => ({ ...prev, local: val }))}
            error={getError('local')}
            options={locaisDisponiveis}
            placeholder="Buscar local..."
            id="local"
            name="local"
          />
        ) : (
          <Input label={<span>QUAL LOCAL? <span className="text-red-500">*</span></span>} placeholder="Carregando..." value={form.local} onChange={setInput('local')} error={getError('local')} disabled />
        )}
        <div>
          <label className="block text-[15px] font-bold text-gray-900 mb-2">
            HORÁRIO <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, horaInicio: horaAgora() }))}
              className={`rounded-xl border-2 px-3 py-3 text-sm font-bold transition-colors active:scale-[0.98] ${
                form.horaInicio
                  ? 'border-green-600 bg-green-50 text-green-800'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              ▶ {form.horaInicio ? `Começou ${form.horaInicio}` : 'COMEÇAR AGORA'}
            </button>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, horaFinal: horaAgora() }))}
              className={`rounded-xl border-2 px-3 py-3 text-sm font-bold transition-colors active:scale-[0.98] ${
                form.horaFinal
                  ? 'border-green-600 bg-green-50 text-green-800'
                  : 'border-brand-900 bg-brand-900 text-white'
              }`}
            >
              ⏹ {form.horaFinal ? `Terminou ${form.horaFinal}` : 'TERMINEI AGORA'}
            </button>
          </div>
          {duracao && (
            <InfoStrip icon="🕐" className="mt-2">
              {form.horaFinal ? 'Tempo total' : 'Tempo até agora'}: {duracao}
            </InfoStrip>
          )}
          <button
            type="button"
            onClick={() => setHorarioManual((v) => !v)}
            className="mt-2 text-sm font-semibold text-gray-500 underline underline-offset-2"
          >
            {horarioManual ? 'Ocultar horário manual' : 'Definir horário manualmente'}
          </button>
          {horarioManual && (
            <div className="mt-3 flex flex-col gap-4">
              <TimeInput label={<span>HORA DE INÍCIO? <span className="text-red-500">*</span></span>} value={form.horaInicio} onChange={setTimeInput('horaInicio')} error={getError('horaInicio')} />
              <TimeInput label={<span>HORA FINAL? <span className="text-red-500">*</span></span>} value={form.horaFinal} onChange={setTimeInput('horaFinal')} error={getError('horaFinal')} />
            </div>
          )}
        </div>
      </CadernetaSection>

      <CadernetaSection numero={2} titulo="O que foi feito? (marque todos)" required>
        <ChoiceGrid
          options={LIMPEZA_OPTIONS}
          mode="multi"
          values={form.limpezaRealizada}
          onChangeMulti={(selected) => setForm((prev) => ({ ...prev, limpezaRealizada: selected }))}
          cols={3}
          dataField="limpezaRealizada"
        />
        {getError('limpezaRealizada') && (
          <p className="text-sm font-semibold text-red-700">{getError('limpezaRealizada')}</p>
        )}
      </CadernetaSection>

      <CadernetaSection numero={3} titulo="Observação">
        <Input placeholder="Detalhes adicionais (opcional)" value={form.observacao} onChange={setInput('observacao')} error={getError('observacao')} />
      </CadernetaSection>

      <FotoSection
        titulo="4. FOTO"
        fotoBase64={fotoBase64}
        capturando={capturandoFoto}
        erro={fotoErro}
        onTirar={capturarFoto}
        onRemover={limparFoto}
        fotoInputRef={fotoInputRef}
        onFileChange={handleFileInputChange}
      />

      <FormFooter
        onSalvar={handleSalvar}
        onLimpar={handleLimpar}
        salvando={salvando}
        disabled={!isValid}
        formValido={isValid}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Limpeza"
        registro={registroSalvo}
        caderneta="limpeza"
      />
    </CadernetaLayout>
  )
}

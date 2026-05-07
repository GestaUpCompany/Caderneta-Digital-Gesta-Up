import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, DatePicker, ValidationMessage, CheckboxGroup } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { scrollToFirstError } from '../../utils/scrollToError'

const LIMPEZA_OPTIONS = [
  { value: 'capina', label: 'Capina' },
  { value: 'grama', label: 'Grama' },
  { value: 'herbicida', label: 'Herbicida' },
  { value: 'veiculo', label: 'Veículo' },
  { value: 'moto', label: 'Moto' },
  { value: 'trator', label: 'Trator' },
  { value: 'implemento', label: 'Implemento' },
  { value: 'barracao', label: 'Barracão' },
  { value: 'curral', label: 'Curral' },
  { value: 'banheiros', label: 'Banheiros' },
  { value: 'sede', label: 'Sede' },
  { value: 'alojamento', label: 'Alojamento' },
  { value: 'pocilga', label: 'Pocilga' },
  { value: 'galinheiro', label: 'Galinheiro' },
  { value: 'aprisco', label: 'Aprisco' },
  { value: 'baias', label: 'Baias' },
  { value: 'tanque', label: 'Tanque' },
  { value: 'jardins', label: 'Jardins' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'corredores', label: 'Corredores' },
  { value: 'aceiros', label: 'Aceiros' },
  { value: 'entrada', label: 'Entrada' },
  { value: 'pista', label: 'Pista' },
  { value: 'reservatorio', label: 'Reservatório' },
  { value: 'poda_arvores', label: 'Poda Árvores' },
  { value: 'lixo_recolhido', label: 'Lixo Recolhido' },
  { value: 'patio', label: 'Pátio' },
  { value: 'rocada', label: 'Roçada' },
  { value: 'horta', label: 'Horta' },
]

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

export default function LimpezaPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(() => makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

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
    setForm(makeInitial())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/')
  }

  const handleLimpar = () => {
    setForm(makeInitial())
    setErrors([])
  }

  return (
    <CadernetaLayout title="LIMPEZA" cadernetaId="limpeza">
      {errors.length > 0 && <ValidationMessage errors={errors} />}

      {/* Seção 1: Dados Principais */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS DA LIMPEZA</h2>
        <DatePicker label="DATA" value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} error={getError('data')} />
        <Input label="N° EQUIPE" type="number" placeholder="Número da equipe" value={form.numeroEquipe} onChange={setInput('numeroEquipe')} error={getError('numeroEquipe')} />
        <Input label="QUAL SETOR?" placeholder="Setor" value={form.setor} onChange={setInput('setor')} error={getError('setor')} />
        <Input label="QUAL LOCAL?" placeholder="Local" value={form.local} onChange={setInput('local')} error={getError('local')} />
        <Input label="HORA DE INÍCIO?" type="time" value={form.horaInicio} onChange={setInput('horaInicio')} error={getError('horaInicio')} />
        <Input label="HORA FINAL?" type="time" value={form.horaFinal} onChange={setInput('horaFinal')} error={getError('horaFinal')} />
      </div>

      {/* Seção 2: Limpeza Realizada */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">2. ESPECIFICAÇÕES DA LIMPEZA</h2>
        <CheckboxGroup
          label="Selecione os tipos de limpeza realizados:"
          options={LIMPEZA_OPTIONS}
          selectedValues={form.limpezaRealizada}
          onChange={(selected) => setForm((prev) => ({ ...prev, limpezaRealizada: selected }))}
          error={getError('limpezaRealizada')}
        />
      </div>

      {/* Seção 3: Observações */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">3. OBSERVAÇÕES</h2>
        <Input placeholder="Observações adicionais" value={form.observacao} onChange={setInput('observacao')} error={getError('observacao')} />
      </div>

      {/* Ações */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾" fullWidth>
          SALVAR
        </Button>
        <Button onClick={handleLimpar} variant="secondary" icon="🧹" fullWidth>
          LIMPAR
        </Button>
      </div>

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

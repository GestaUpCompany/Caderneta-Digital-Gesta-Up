import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, DatePicker, ValidationMessage, CheckboxGroup, TextArea } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { scrollToFirstError } from '../../utils/scrollToError'
import { useFormValidation } from '../../hooks/useFormValidation'

const LIMPEZA_OPTIONS = [
  { value: 'capina', label: 'Capina' },
  { value: 'grama', label: 'Grama' },
  { value: 'herbicida', label: 'Herbicida' },
  { value: 'aceiros', label: 'Aceiros' },
  { value: 'poda_arvores', label: 'Poda Árvores' },
  { value: 'lixo_recolhido', label: 'Lixo Recolhido' },
  { value: 'rocada', label: 'Roçada' },
  { value: 'lavagem', label: 'Lavagem' },
  { value: 'organizacao', label: 'Organização' },
  { value: 'polimento', label: 'Polimento' },
]

interface FormState {
  data: string
  numeroEquipe: string
  setor: string
  local: string
  horaInicio: string
  horaFinal: string
  limpezaRealizada: string[]
  tarefas: { [key: string]: string }
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
  tarefas: {},
  observacao: '',
})

export default function LimpezaPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(() => makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)

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

  // Add dynamic validation for tarefas based on selected limpeza
  form.limpezaRealizada.forEach((limpeza) => {
    validationRules[`tarefa_${limpeza}`] = {
      required: true,
      custom: (value: string) => {
        if (!value || value.trim() === '') return 'Especifique a tarefa realizada'
        return null
      }
    }
  })

  const { isValid } = useFormValidation(form, validationRules)

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const setTarefa = (optionValue: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({
      ...prev,
      tarefas: { ...prev.tarefas, [optionValue]: e.target.value }
    }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    // Validate that each selected limpeza has a tarefa filled
    const tarefaErrors: { field: string; message: string }[] = []
    form.limpezaRealizada.forEach((limpeza) => {
      if (!form.tarefas[limpeza] || form.tarefas[limpeza].trim() === '') {
        tarefaErrors.push({ field: `tarefa_${limpeza}`, message: `Especifique a tarefa para ${LIMPEZA_OPTIONS.find(o => o.value === limpeza)?.label}` })
      }
    })

    if (tarefaErrors.length > 0) {
      setErrors(tarefaErrors)
      setSalvando(false)
      return
    }

    const result = await salvarRegistro('limpeza', {
      data: form.data,
      numeroEquipe: form.numeroEquipe,
      setor: form.setor,
      local: form.local,
      horaInicio: form.horaInicio,
      horaFinal: form.horaFinal,
      limpezaRealizada: form.limpezaRealizada,
      tarefas: form.tarefas,
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
        <DatePicker label={<span>DATA <span className="text-red-500">*</span></span>} value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} error={getError('data')} />
        <div>
          <label className="block text-lg font-bold text-gray-900 mb-3 whitespace-pre-wrap">N° EQUIPE <span className="text-red-500">*</span></label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <label key={num} className={`
                cursor-pointer rounded-xl border-2
                transition-all active:scale-95
                flex flex-col items-center justify-center gap-1
                p-2 min-h-[70px]
                ${form.numeroEquipe === String(num) ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]' : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
              `}>
                <input type="radio" name="numeroEquipe" className="sr-only" value={num} checked={form.numeroEquipe === String(num)} onChange={(e) => setInput('numeroEquipe')(e)} />
                <span className="text-base sm:text-lg font-bold text-center leading-tight">{num}</span>
              </label>
            ))}
          </div>
        </div>
        <Input label={<span>QUAL SETOR? <span className="text-red-500">*</span></span>} placeholder="Setor" value={form.setor} onChange={setInput('setor')} error={getError('setor')} />
        <Input label={<span>QUAL LOCAL? <span className="text-red-500">*</span></span>} placeholder="Local" value={form.local} onChange={setInput('local')} error={getError('local')} />
        <Input label={<span>HORA DE INÍCIO? <span className="text-red-500">*</span></span>} type="time" value={form.horaInicio} onChange={setInput('horaInicio')} error={getError('horaInicio')} />
        <Input label={<span>HORA FINAL? <span className="text-red-500">*</span></span>} type="time" value={form.horaFinal} onChange={setInput('horaFinal')} error={getError('horaFinal')} />
      </div>

      {/* Seção 2: Limpeza Realizada */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">2. ESPECIFICAÇÕES DA LIMPEZA</h2>
        <CheckboxGroup
          label={<span>Selecione os tipos de limpeza realizados: <span className="text-red-500">*</span></span>}
          options={LIMPEZA_OPTIONS}
          selectedValues={form.limpezaRealizada}
          onChange={(selected) => setForm((prev) => ({ ...prev, limpezaRealizada: selected }))}
          error={getError('limpezaRealizada')}
        />
        {form.limpezaRealizada.map((limpeza) => {
          const option = LIMPEZA_OPTIONS.find(o => o.value === limpeza)
          return (
            <div key={limpeza} className="mt-2">
              <TextArea
                label={<span>Tarefa Realizada - {option?.label} <span className="text-red-500">*</span></span>}
                placeholder="Especifique a(s) tarefa(s) realizada(s)"
                value={form.tarefas[limpeza] ?? ''}
                onChange={setTarefa(limpeza)}
                error={getError(`tarefa_${limpeza}`)}
                rows={5}
              />
            </div>
          )
        })}
      </div>

      {/* Seção 3: Observações */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">3. OBSERVAÇÕES</h2>
        <Input placeholder="Observações adicionais" value={form.observacao} onChange={setInput('observacao')} error={getError('observacao')} />
      </div>

      {/* Ações */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾" fullWidth disabled={!isValid}>
          SALVAR
        </Button>
        <Button onClick={handleLimpar} variant="secondary" icon="🧹" fullWidth>
          LIMPAR
        </Button>
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
        cadernetaName="Limpeza"
        registro={registroSalvo}
        caderneta="limpeza"
      />
    </CadernetaLayout>
  )
}

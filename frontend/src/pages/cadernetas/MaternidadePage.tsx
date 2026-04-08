import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, DatePicker, Radio, ValidationMessage } from '../../components/ui'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'

const TRATAMENTOS = [
  { value: 'Colostro', label: 'COLOSTRO', icon: '🍼' },
  { value: 'Antibiótico', label: 'ANTIBIÓTICO', icon: '💊' },
  { value: 'Vitaminas', label: 'VITAMINAS', icon: '💉' },
  { value: 'Soro', label: 'SORO', icon: '🧪' },
  { value: 'Outros', label: 'OUTROS', icon: '➕' },
]

const TIPOS_PARTO = [
  { value: 'Normal', label: 'NORMAL', icon: '✅' },
  { value: 'Auxiliado', label: 'AUXILIADO', icon: '🤝' },
  { value: 'Cesárea', label: 'CESÁREA', icon: '🏥' },
  { value: 'Aborto', label: 'ABORTO', icon: '❌' },
]

const SEXO = [
  { value: 'Macho', label: 'MACHO', icon: '♂️' },
  { value: 'Fêmea', label: 'FÊMEA', icon: '♀️' },
]

const RACAS = [
  { value: 'Nelore', label: 'NELORE' },
  { value: 'Angus', label: 'ANGUS' },
  { value: 'Leiteiro', label: 'LEITEIRO' },
  { value: 'Outros', label: 'OUTROS' },
]

const CATEGORIAS_MAE = [
  { value: 'Nulípara', label: 'NULÍPARA' },
  { value: 'Primípara', label: 'PRIMÍPARA' },
  { value: 'Multípara', label: 'MULTÍPARA' },
  { value: 'Leiteira', label: 'LEITEIRA' },
]

interface FormState {
  data: string
  pasto: string
  pesoCria: string
  numeroCria: string
  tratamento: string
  tipoParto: string
  sexo: string
  raca: string
  numeroMae: string
  categoriaMae: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  pasto: '',
  pesoCria: '',
  numeroCria: '',
  tratamento: '',
  tipoParto: '',
  sexo: '',
  raca: '',
  numeroMae: '',
  categoriaMae: '',
})

export default function MaternidadePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(makeInitial)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInputEvent = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])
    setSucesso(false)

    const result = await salvarRegistro('maternidade', {
      data: form.data,
      pasto: form.pasto,
      pesoCria: form.pesoCria ? Number(form.pesoCria) : null,
      numeroCria: form.numeroCria,
      tratamento: form.tratamento,
      tipoParto: form.tipoParto,
      sexo: form.sexo,
      raca: form.raca,
      numeroMae: form.numeroMae,
      categoriaMae: form.categoriaMae,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
    } else {
      setSucesso(true)
      setForm(makeInitial())
      setTimeout(() => setSucesso(false), 2500)
    }
  }

  const handleLimpar = () => {
    setForm(makeInitial())
    setErrors([])
    setSucesso(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-black text-white flex items-center px-4 py-5">
        <button
          onClick={() => navigate(-1)}
          className="text-yellow-400 font-bold text-xl mr-4 min-h-[48px] px-2"
        >
          ← VOLTAR
        </button>
        <h1 className="text-xl font-bold flex-1">🐄 MATERNIDADE CRIA</h1>
        <button
          onClick={() => navigate('/caderneta/maternidade/lista')}
          className="text-yellow-400 font-bold text-base min-h-[48px] px-2"
        >
          LISTA
        </button>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8">
        {sucesso && (
          <div className="bg-green-100 border-2 border-green-500 rounded-2xl p-4 text-center">
            <p className="text-xl font-bold text-green-800">✅ REGISTRO SALVO!</p>
          </div>
        )}

        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: Dados Principais */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">1. DADOS PRINCIPAIS</h2>
          <DatePicker label="DATA" value={form.data} onChange={set('data')} error={getError('data')} />
          <Input
            label="PASTO"
            placeholder="Ex: 15"
            value={form.pasto}
            onChange={setInputEvent('pasto')}
            error={getError('pasto')}
            inputMode="text"
          />
          <Input
            label="PESO DA CRIA (kg)"
            placeholder="Ex: 32"
            value={form.pesoCria}
            onChange={setInputEvent('pesoCria')}
            inputMode="decimal"
            type="number"
          />
        </div>

        {/* Seção 2: Identificação */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">2. IDENTIFICAÇÃO</h2>
          <Input
            label="NÚMERO DA CRIA"
            placeholder="Ex: 2023-145"
            value={form.numeroCria}
            onChange={setInputEvent('numeroCria')}
            error={getError('numeroCria')}
          />
          <Radio
            name="tratamento"
            label="TRATAMENTO"
            options={TRATAMENTOS}
            value={form.tratamento}
            onChange={set('tratamento')}
            error={getError('tratamento')}
          />
        </div>

        {/* Seção 3: Parto */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">3. TIPO DE PARTO</h2>
          <Radio
            name="tipoParto"
            options={TIPOS_PARTO}
            value={form.tipoParto}
            onChange={set('tipoParto')}
            error={getError('tipoParto')}
          />
        </div>

        {/* Seção 4: Sexo e Raça */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">4. SEXO E RAÇA</h2>
          <Radio
            name="sexo"
            label="SEXO"
            options={SEXO}
            value={form.sexo}
            onChange={set('sexo')}
            error={getError('sexo')}
          />
          <Radio
            name="raca"
            label="RAÇA"
            options={RACAS}
            value={form.raca}
            onChange={set('raca')}
            error={getError('raca')}
          />
        </div>

        {/* Seção 5: Dados da Mãe */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">5. DADOS DA MÃE</h2>
          <Input
            label="NÚMERO DA MÃE"
            placeholder="Ex: 2021-089"
            value={form.numeroMae}
            onChange={setInputEvent('numeroMae')}
            error={getError('numeroMae')}
          />
          <Radio
            name="categoriaMae"
            label="CATEGORIA DA MÃE"
            options={CATEGORIAS_MAE}
            value={form.categoriaMae}
            onChange={set('categoriaMae')}
            error={getError('categoriaMae')}
            direction="vertical"
          />
        </div>

        {/* Ações */}
        <div className="flex flex-col gap-3">
          <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾">
            SALVAR
          </Button>
          <Button onClick={handleLimpar} variant="secondary" icon="🧹">
            LIMPAR
          </Button>
        </div>
      </main>
    </div>
  )
}

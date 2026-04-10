import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, DatePicker, Radio, ValidationMessage } from '../../components/ui'
import CheckboxGroup from '../../components/ui/CheckboxGroup'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'

const TRATAMENTOS = [
  { value: 'Colostro', label: 'COLOSTRO', icon: '🍼' },
  { value: 'Antibiótico', label: 'ANTIBIÓTICO', icon: '💊' },
  { value: 'Probiótico', label: 'PROBIÓTICO', icon: '💉' },
  { value: 'Soro', label: 'SORO', icon: '🧪' },
  { value: 'Vermífugo', label: 'VERMÍFUGO', icon: '🪱' },
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
  tratamentos: string[]
  tratamentoOutros: string
  tipoParto: string
  sexo: string
  raca: string
  racaOutros: string
  numeroMae: string
  categoriaMae: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  pasto: '',
  pesoCria: '',
  numeroCria: '',
  tratamentos: [],
  tratamentoOutros: '',
  tipoParto: '',
  sexo: '',
  raca: '',
  racaOutros: '',
  numeroMae: '',
  categoriaMae: '',
})

export default function MaternidadePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(makeInitial)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInputEvent = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleTratamentosChange = (newTratamentos: string[]) => {
    // Se "Outros" foi deselecionado, limpa o campo de texto
    if (!newTratamentos.includes('Outros')) {
      setForm(prev => ({
        ...prev,
        tratamentos: newTratamentos,
        tratamentoOutros: ''
      }))
    } else {
      setForm(prev => ({
        ...prev,
        tratamentos: newTratamentos
      }))
    }
  }

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    // Construir string final de tratamentos
    const tratamentosFinais = form.tratamentos.map(t => 
      t === 'Outros' ? form.tratamentoOutros : t
    ).filter(Boolean) // remove strings vazias

    const tratamentoFinal = tratamentosFinais.join(', ')
    const racaFinal = form.raca === 'Outros' ? form.racaOutros : form.raca
    const result = await salvarRegistro('maternidade', {
      data: form.data,
      pasto: form.pasto,
      pesoCria: form.pesoCria ? Number(form.pesoCria) : null,
      numeroCria: form.numeroCria,
      tratamento: tratamentoFinal,
      tipoParto: form.tipoParto,
      sexo: form.sexo,
      raca: racaFinal,
      numeroMae: form.numeroMae,
      categoriaMae: form.categoriaMae,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
    } else {
      setShowSuccessModal(true)
      setForm(makeInitial())
    }
  }

  const handleLimpar = () => {
    setForm(makeInitial())
    setErrors([])
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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-black text-white flex items-center justify-between px-4 py-4">
        <button
          onClick={() => navigate(-1)}
          className="text-yellow-400 font-bold text-sm flex items-center gap-2 min-h-[48px] px-3 rounded-2xl hover:bg-white/10 transition-colors"
        >
          <span className="text-xl">←</span>
          VOLTAR
        </button>
        <h1 className="text-base font-bold flex items-center gap-2">
          <span className="text-lg">🐄</span>
          MATERNIDADE CRIA
        </h1>
        <button
          onClick={() => navigate('/caderneta/maternidade/lista')}
          className="text-yellow-400 font-bold text-sm min-h-[48px] px-3 rounded-2xl hover:bg-white/10 transition-colors"
        >
          LISTA
        </button>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8">
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: Dados Principais */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS PRINCIPAIS</h2>
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
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. IDENTIFICAÇÃO</h2>
          <Input
            label="NÚMERO DA CRIA"
            placeholder="Ex: 2023-145"
            value={form.numeroCria}
            onChange={setInputEvent('numeroCria')}
            error={getError('numeroCria')}
          />
          <CheckboxGroup
            label="TRATAMENTO"
            options={TRATAMENTOS}
            selectedValues={form.tratamentos}
            onChange={handleTratamentosChange}
            error={getError('tratamentos')}
          />
          {form.tratamentos.includes('Outros') && (
            <Input
              label="DESCREVA O TRATAMENTO"
              placeholder="Ex: Anti-inflamatório..."
              value={form.tratamentoOutros}
              onChange={setInputEvent('tratamentoOutros')}
              error={getError('tratamentoOutros')}
            />
          )}
        </div>

        {/* Seção 3: Parto */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. TIPO DE PARTO</h2>
          <Radio
            name="tipoParto"
            options={TIPOS_PARTO}
            value={form.tipoParto}
            onChange={set('tipoParto')}
            error={getError('tipoParto')}
          />
        </div>

        {/* Seção 4: Sexo e Raça */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. SEXO E RAÇA</h2>
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
          {form.raca === 'Outros' && (
            <Input
              label="QUAL RAÇA?"
              placeholder="Ex: Brahman, Hereford, Simmental..."
              value={form.racaOutros}
              onChange={setInputEvent('racaOutros')}
              error={getError('racaOutros')}
            />
          )}
        </div>

        {/* Seção 5: Dados da Mãe */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">5. DADOS DA MÃE</h2>
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
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾" fullWidth>
            SALVAR
          </Button>
          <Button onClick={handleLimpar} variant="secondary" icon="🧹" fullWidth>
            LIMPAR
          </Button>
        </div>
      </main>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Maternidade Cria"
      />
    </div>
  )
}

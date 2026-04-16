import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, ValidationMessage } from '../../components/ui'
import CheckboxGroup from '../../components/ui/CheckboxGroup'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { LOGO_URL, getFarmLogo } from '../../utils/constants'
import { RootState } from '../../store/store'

const TRATAMENTOS = [
  { value: 'Colostro', label: 'COLOSTRO', icon: '🍼' },
  { value: 'Antibiótico', label: 'ANTIBIÓTICO', icon: '💉' },
  { value: 'Probiótico', label: 'PROBIÓTICO', icon: '💊' },
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
  lote: string
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
  lote: '',
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
  const { usuario, fazenda } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const farmLogoUrl = fazenda ? getFarmLogo(fazenda) : LOGO_URL

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
      lote: form.lote,
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
      {/* Header sticky com botões e título */}
      <div className="sticky top-0 z-10 bg-[#1a3a2a] text-white px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-yellow-400 font-bold text-sm min-h-[40px] px-3"
          >
            VOLTAR
          </button>
          <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2">MATERNIDADE</h1>
          <button
            onClick={() => navigate('/caderneta/maternidade/lista')}
            className="text-yellow-400 font-bold text-sm min-h-[40px] px-3 -mr-2"
          >
            REGISTROS
          </button>
        </div>
      </div>

      {/* Logos não sticky */}
      <div className="bg-[#1a3a2a] text-white px-4 py-5">
        <div className="flex items-center justify-center gap-8">
          <img src={LOGO_URL} alt="Gesta'Up" className="w-16 h-auto object-contain rounded-[22px]" />
          <img src={farmLogoUrl} alt="Fazenda" className="h-[58px] w-auto object-contain rounded-[22px]" />
        </div>
      </div>

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8">
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: Dados Principais */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          {usuario && (
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <span className="text-xl">👤</span>
              <p className="text-gray-700 font-semibold">{usuario}</p>
            </div>
          )}
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
            label="LOTE"
            placeholder="Ex: 10"
            value={form.lote}
            onChange={setInputEvent('lote')}
            error={getError('lote')}
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
            gridCols={2}
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
            gridCols={2}
          />
          <Radio
            name="raca"
            label="RAÇA"
            options={RACAS}
            value={form.raca}
            onChange={set('raca')}
            error={getError('raca')}
            gridCols={2}
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
            gridCols={2}
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

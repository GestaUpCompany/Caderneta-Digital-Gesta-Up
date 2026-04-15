import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, DatePicker, Radio, Checkbox, ValidationMessage } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'

const PRODUTOS = [
  { value: 'Mineral', label: 'MINERAL', icon: '🥄' },
  { value: 'Proteinado', label: 'PROTEINADO', icon: '🥩' },
  { value: 'Ração', label: 'RAÇÃO', icon: '🌽' },
]

const TIPOS_GADO = [
  { value: 'Cria', label: 'CRIA', icon: '🍼' },
  { value: 'Recria', label: 'RECRIA', icon: '🌿' },
  { value: 'Engorda', label: 'ENGORDA', icon: '🥩' },
]

const LEITURAS = [
  { value: '-1', label: '-1' },
  { value: '0', label: '0' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
]

const CATEGORIAS = [
  'Vaca', 'Touro', 'Bezerro', 'Boi', 'Garrote', 'Novilha',
]

interface FormState {
  data: string
  tratador: string
  pasto: string
  numeroLote: string
  produto: string
  gado: string
  leitura: string
  sacos: string
  kg: string
  recria: string
  categorias: string[]
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  tratador: '',
  pasto: '',
  numeroLote: '',
  produto: '',
  gado: '',
  leitura: '',
  sacos: '',
  kg: '',
  recria: '',
  categorias: [],
})

export default function SuplementacaoPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(makeInitial)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const toggleCategoria = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      categorias: prev.categorias.includes(cat)
        ? prev.categorias.filter((c) => c !== cat)
        : [...prev.categorias, cat],
    }))
  }

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const result = await salvarRegistro('suplementacao', {
      data: form.data,
      tratador: form.tratador,
      pasto: form.pasto,
      numeroLote: form.numeroLote,
      produto: form.produto,
      gado: form.gado,
      leitura: form.leitura ? Number(form.leitura) : null,
      sacos: form.sacos ? Number(form.sacos) : 0,
      kg: form.kg ? Number(form.kg) : 0,
      recria: form.recria ? Number(form.recria) : 0,
      categorias: form.categorias,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
    } else {
      setShowSuccessModal(true)
      setForm(makeInitial())
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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-[#1a3a2a] text-white flex items-center px-4 py-4">
        <button
          onClick={() => navigate(-1)}
          className="text-yellow-400 font-bold text-sm min-h-[40px] px-3"
        >
          ← VOLTAR
        </button>
        <h1 className="text-base font-bold flex-1 text-center">
          SUPLEMENTAÇÃO
        </h1>
        <button
          onClick={() => navigate('/caderneta/suplementacao/lista')}
          className="text-yellow-400 font-bold text-sm min-h-[40px] px-3"
        >
          LISTA
        </button>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8">
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: Dados Principais */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">1. DADOS PRINCIPAIS</h2>
          <DatePicker label="DATA" value={form.data} onChange={set('data')} error={getError('data')} />
          <Input
            label="TRATADOR"
            placeholder="Nome do responsável"
            value={form.tratador}
            onChange={setInput('tratador')}
            error={getError('tratador')}
          />
          <Input
            label="PASTO"
            placeholder="Ex: Pasto 12"
            value={form.pasto}
            onChange={setInput('pasto')}
            error={getError('pasto')}
          />
          <Input
            label="NÚMERO DO LOTE"
            placeholder="Ex: 03"
            value={form.numeroLote}
            onChange={setInput('numeroLote')}
            error={getError('numeroLote')}
            inputMode="numeric"
          />
        </div>

        {/* Seção 2: Tipo de Suplementação */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">2. TIPO DE SUPLEMENTAÇÃO</h2>
          <Radio
            name="produto"
            label="PRODUTO"
            options={PRODUTOS}
            value={form.produto}
            onChange={set('produto')}
            error={getError('produto')}
          />
        </div>

        {/* Seção 3: Gado e Categorias */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">3. CLASSIFICAÇÃO DO GADO</h2>
          <Radio
            name="gado"
            label="TIPO DE GADO"
            options={TIPOS_GADO}
            value={form.gado}
            onChange={set('gado')}
            error={getError('gado')}
          />
          {getError('categorias') && (
            <p className="text-base font-semibold text-red-700">⚠️ {getError('categorias')}</p>
          )}
          <p className="text-lg font-bold text-gray-800">CATEGORIAS:</p>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIAS.map((cat) => (
              <Checkbox
                key={cat}
                label={cat}
                checked={form.categorias.includes(cat)}
                onChange={() => toggleCategoria(cat)}
              />
            ))}
          </div>
        </div>

        {/* Seção 4: Leitura e Quantidade */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">4. LEITURA E QUANTIDADE</h2>
          <Radio
            name="leitura"
            label="LEITURA DO COCHO (-1 a 3)"
            options={LEITURAS}
            value={form.leitura}
            onChange={set('leitura')}
            error={getError('leitura')}
            gridCols={5}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="SACOS"
              placeholder="0"
              value={form.sacos}
              onChange={setInput('sacos')}
              inputMode="numeric"
              type="number"
              min="0"
            />
            <Input
              label="KG"
              placeholder="0"
              value={form.kg}
              onChange={setInput('kg')}
              inputMode="decimal"
              type="number"
              min="0"
            />
            <Input
              label="CREEP"
              placeholder="0"
              value={form.recria}
              onChange={setInput('recria')}
              inputMode="decimal"
              type="number"
              min="0"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾">
            SALVAR
          </Button>
          <Button onClick={() => setForm(makeInitial())} variant="secondary" icon="🧹">
            LIMPAR
          </Button>
        </div>
      </main>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Suplementação"
      />
    </div>
  )
}

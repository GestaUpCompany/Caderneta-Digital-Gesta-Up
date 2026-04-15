import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, ValidationMessage } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'

const AVALIACOES = [
  { value: '1', label: '1', icon: '🔴' },
  { value: '2', label: '2', icon: '🟢' },
  { value: '3', label: '3', icon: '🟡' },
  { value: '4', label: '4', icon: '🟢' },
  { value: '5', label: '5', icon: '🔴' },
]

interface FormState {
  data: string
  manejador: string
  numeroLote: string
  pastoSaida: string
  avaliacaoSaida: string
  pastoEntrada: string
  avaliacaoEntrada: string
  vaca: string
  touro: string
  bezerro: string
  boiMagro: string
  garrote: string
  novilha: string
}

const makeInitial = (usuario?: string): FormState => ({
  data: todayBR(),
  manejador: usuario || '',
  numeroLote: '',
  pastoSaida: '',
  avaliacaoSaida: '',
  pastoEntrada: '',
  avaliacaoEntrada: '',
  vaca: '',
  touro: '',
  bezerro: '',
  boiMagro: '',
  garrote: '',
  novilha: '',
})

const CATEGORIAS: { campo: keyof FormState; label: string }[] = [
  { campo: 'vaca', label: 'VACA' },
  { campo: 'touro', label: 'TOURO' },
  { campo: 'bezerro', label: 'BEZERRO' },
  { campo: 'boiMagro', label: 'BOI MAGRO' },
  { campo: 'garrote', label: 'GARROTE' },
  { campo: 'novilha', label: 'NOVILHA' },
]

export default function PastagensPage() {
  const navigate = useNavigate()
  const { usuario } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(() => makeInitial(usuario))
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [editandoManejador, setEditandoManejador] = useState(false)

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const total = ['vaca', 'touro', 'bezerro', 'boiMagro', 'garrote', 'novilha'].reduce(
    (acc, c) => acc + (Number(form[c as keyof FormState]) || 0), 0
  )

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const result = await salvarRegistro('pastagens', {
      ...form,
      vaca: form.vaca ? Number(form.vaca) : null,
      touro: form.touro ? Number(form.touro) : null,
      bezerro: form.bezerro ? Number(form.bezerro) : null,
      boiMagro: form.boiMagro ? Number(form.boiMagro) : null,
      garrote: form.garrote ? Number(form.garrote) : null,
      novilha: form.novilha ? Number(form.novilha) : null,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
    } else {
      setShowSuccessModal(true)
      setForm(makeInitial(usuario))
      setEditandoManejador(false)
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
          TROCA DE PASTOS
        </h1>
        <button
          onClick={() => navigate('/caderneta/pastagens/lista')}
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
          <div>
            <label className="block text-base font-bold text-gray-700 mb-2">MANEJADOR</label>
            {editandoManejador ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do responsável"
                  value={form.manejador}
                  onChange={setInput('manejador')}
                  error={getError('manejador')}
                  className="flex-1"
                />
                <Button
                  onClick={() => setEditandoManejador(false)}
                  variant="success"
                  icon="✓"
                  fullWidth={false}
                  className="min-h-[38px] px-2"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 border-2 border-gray-300 rounded-lg px-4 py-3 min-h-[44px] flex items-center">
                  <span className="text-base font-semibold text-black">
                    {form.manejador || 'Não definido'}
                  </span>
                </div>
                <Button
                  onClick={() => setEditandoManejador(true)}
                  variant="secondary"
                  icon="✏️"
                  fullWidth={false}
                  className="min-h-[38px] px-2"
                />
              </div>
            )}
          </div>
          <Input
            label="NÚMERO DO LOTE"
            placeholder="Ex: 03"
            value={form.numeroLote}
            onChange={setInput('numeroLote')}
            error={getError('numeroLote')}
            inputMode="numeric"
          />
        </div>

        {/* Seção 2: Pasto de Saída */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">2. PASTO DE SAÍDA</h2>
          <Input
            label="PASTO DE SAÍDA"
            placeholder="Ex: Pasto 12"
            value={form.pastoSaida}
            onChange={setInput('pastoSaida')}
            error={getError('pastoSaida')}
          />
          <Radio
            name="avaliacaoSaida"
            label="AVALIAÇÃO DO PASTO DE SAÍDA"
            options={AVALIACOES}
            value={form.avaliacaoSaida}
            onChange={set('avaliacaoSaida')}
            gridCols={5}
            error={getError('avaliacaoSaida')}
          />
        </div>

        {/* Seção 3: Pasto de Entrada */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">3. PASTO DE ENTRADA</h2>
          <Input
            label="PASTO DE ENTRADA"
            placeholder="Ex: Pasto 07"
            value={form.pastoEntrada}
            onChange={setInput('pastoEntrada')}
            error={getError('pastoEntrada')}
          />
          <Radio
            name="avaliacaoEntrada"
            label="AVALIAÇÃO DO PASTO DE ENTRADA"
            options={AVALIACOES}
            value={form.avaliacaoEntrada}
            onChange={set('avaliacaoEntrada')}
            gridCols={5}
            error={getError('avaliacaoEntrada')}
          />
        </div>

        {/* Seção 4: Categorias */}
        <div className="bg-white rounded-2xl p-4 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">4. QUANTIDADE DE ANIMAIS</h2>
          {getError('categorias') && (
            <p className="text-base font-semibold text-red-700">⚠️ {getError('categorias')}</p>
          )}
          <div className="grid grid-cols-2 gap-3 overflow-hidden">
            {CATEGORIAS.map(({ campo, label }) => (
              <Input
                key={campo}
                label={label}
                placeholder="0"
                value={form[campo]}
                onChange={setInput(campo)}
                inputMode="numeric"
                type="number"
                min="0"
              />
            ))}
          </div>
          {total > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-3 flex items-center justify-between">
              <span className="text-lg font-bold text-gray-700">TOTAL</span>
              <span className="text-2xl font-bold text-black">{total} animais</span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾">
            SALVAR
          </Button>
          <Button onClick={() => { setForm(makeInitial()); setErrors([]) }} variant="secondary" icon="🧹">
            LIMPAR
          </Button>
        </div>
      </main>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Troca de Pastos"
      />
    </div>
  )
}

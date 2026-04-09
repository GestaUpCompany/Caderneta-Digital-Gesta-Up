import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, DatePicker, Radio, ValidationMessage } from '../../components/ui'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'

const AVALIACOES = [
  { value: '1', label: '1 — EXCELENTE', icon: '🟢' },
  { value: '2', label: '2 — ÓTIMO', icon: '🟡' },
  { value: '3', label: '3 — MÉDIO', icon: '🟠' },
  { value: '4', label: '4 — RUIM', icon: '🔴' },
  { value: '5', label: '5 — PÉSSIMO', icon: '⛔' },
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

const makeInitial = (): FormState => ({
  data: todayBR(),
  manejador: '',
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
  const [form, setForm] = useState<FormState>(makeInitial)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

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
    setSucesso(false)

    const result = await salvarRegistro('pastagens', {
      data: form.data,
      manejador: form.manejador,
      numeroLote: form.numeroLote,
      pastoSaida: form.pastoSaida,
      avaliacaoSaida: form.avaliacaoSaida ? Number(form.avaliacaoSaida) : null,
      pastoEntrada: form.pastoEntrada,
      avaliacaoEntrada: form.avaliacaoEntrada ? Number(form.avaliacaoEntrada) : null,
      vaca: form.vaca ? Number(form.vaca) : 0,
      touro: form.touro ? Number(form.touro) : 0,
      bezerro: form.bezerro ? Number(form.bezerro) : 0,
      boiMagro: form.boiMagro ? Number(form.boiMagro) : 0,
      garrote: form.garrote ? Number(form.garrote) : 0,
      novilha: form.novilha ? Number(form.novilha) : 0,
      totalAnimais: total,
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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-black text-white flex items-center px-4 py-5">
        <button
          onClick={() => navigate(-1)}
          className="text-yellow-400 font-bold text-xl mr-4 min-h-[48px] px-2"
        >
          ← VOLTAR
        </button>
        <h1 className="text-xl font-bold flex-1">🌾 TROCA DE PASTOS</h1>
        <button
          onClick={() => navigate('/caderneta/pastagens/lista')}
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
            label="MANEJADOR"
            placeholder="Nome do responsável"
            value={form.manejador}
            onChange={setInput('manejador')}
            error={getError('manejador')}
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
            direction="vertical"
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
            direction="vertical"
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
          <Button onClick={() => setForm(makeInitial())} variant="secondary" icon="🧹">
            LIMPAR
          </Button>
        </div>
      </main>
    </div>
  )
}

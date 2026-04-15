import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, ValidationMessage } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'

const TIPOS_GADO = [
  { value: 'Cria', label: 'CRIA', icon: '🍼' },
  { value: 'Recria', label: 'RECRIA', icon: '🌱' },
  { value: 'Engorda', label: 'ENGORDA', icon: '🥩' },
]

const CATEGORIAS = [
  { value: 'Vaca', label: 'VACA' },
  { value: 'Touro', label: 'TOURO' },
  { value: 'Boi', label: 'BOI' },
  { value: 'Bezerro', label: 'BEZERRO' },
  { value: 'Garrote', label: 'GARROTE' },
  { value: 'Novilha', label: 'NOVILHA' },
]

const LEITURAS_BEBEDOURO = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
]

interface FormState {
  data: string
  responsavel: string
  pasto: string
  numeroLote: string
  gado: string
  categoria: string
  leituraBebedouro: string
  numeroBebedouro: string
  observacao: string
}

const makeInitial = (usuario?: string): FormState => ({
  data: todayBR(),
  responsavel: usuario || '',
  pasto: '',
  numeroLote: '',
  gado: '',
  categoria: '',
  leituraBebedouro: '',
  numeroBebedouro: '',
  observacao: '',
})

export default function BebedourosPage() {
  const navigate = useNavigate()
  const { usuario } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(() => makeInitial(usuario))
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [editandoResponsavel, setEditandoResponsavel] = useState(false)

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const result = await salvarRegistro('bebedouros', {
      data: form.data,
      responsavel: form.responsavel,
      pasto: form.pasto,
      numeroLote: form.numeroLote,
      gado: form.gado,
      categoria: form.categoria,
      leituraBebedouro: form.leituraBebedouro ? Number(form.leituraBebedouro) : null,
      numeroBebedouro: form.numeroBebedouro,
      observacao: form.observacao,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
    } else {
      setShowSuccessModal(true)
      setForm(makeInitial(usuario))
      setEditandoResponsavel(false)
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
          BEBEDOUROS
        </h1>
        <button
          onClick={() => navigate('/caderneta/bebedouros/lista')}
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
            <label className="block text-base font-bold text-gray-700 mb-2">RESPONSÁVEL</label>
            {editandoResponsavel ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do responsável"
                  value={form.responsavel}
                  onChange={setInput('responsavel')}
                  error={getError('responsavel')}
                  className="flex-1"
                />
                <Button
                  onClick={() => setEditandoResponsavel(false)}
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
                    {form.responsavel || 'Não definido'}
                  </span>
                </div>
                <Button
                  onClick={() => setEditandoResponsavel(true)}
                  variant="secondary"
                  icon="✏️"
                  fullWidth={false}
                  className="min-h-[38px] px-2"
                />
              </div>
            )}
          </div>
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

        {/* Seção 2: Classificação */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">2. CLASSIFICAÇÃO DO GADO</h2>
          <Radio
            name="gado"
            label="TIPO DE GADO"
            options={TIPOS_GADO}
            value={form.gado}
            onChange={set('gado')}
            error={getError('gado')}
            gridCols={3}
          />
          <Radio
            name="categoria"
            label="CATEGORIA"
            options={CATEGORIAS}
            value={form.categoria}
            onChange={set('categoria')}
            error={getError('categoria')}
            gridCols={2}
          />
        </div>

        {/* Seção 3: Bebedouro */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">3. BEBEDOURO</h2>
          <Radio
            name="leituraBebedouro"
            label="LEITURA DE BEBEDOURO (1 a 3)"
            options={LEITURAS_BEBEDOURO}
            value={form.leituraBebedouro}
            onChange={set('leituraBebedouro')}
            error={getError('leituraBebedouro')}
            gridCols={3}
          />
          <Input
            label="NÚMERO DO BEBEDOURO"
            placeholder="Ex: 5"
            value={form.numeroBebedouro}
            onChange={setInput('numeroBebedouro')}
            error={getError('numeroBebedouro')}
            inputMode="numeric"
            type="number"
            min="0"
          />
        </div>

        {/* Seção 4: Observação */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">4. OBSERVAÇÃO</h2>
          <Input
            label="OBSERVAÇÃO"
            placeholder="Detalhes adicionais (opcional)"
            value={form.observacao}
            onChange={setInput('observacao')}
          />
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
        cadernetaName="Bebedouros"
      />
    </div>
  )
}

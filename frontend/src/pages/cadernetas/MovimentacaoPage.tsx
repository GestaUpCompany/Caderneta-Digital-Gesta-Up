import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, DatePicker, Radio, Checkbox, ValidationMessage } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'

const MOTIVOS = [
  { value: 'Morte', label: 'MORTE', icon: '⚰️' },
  { value: 'Consumo', label: 'CONSUMO', icon: '🍖' },
  { value: 'Transferência', label: 'TRANSFERÊNCIA', icon: '🚚' },
  { value: 'Abate', label: 'ABATE', icon: '🏭' },
  { value: 'Entrada', label: 'ENTRADA', icon: '📥' },
  { value: 'Entreverado', label: 'ENTREVERADO', icon: '🔀' },
]

const CATEGORIAS = [
  { campo: 'vaca', label: 'VACA' },
  { campo: 'touro', label: 'TOURO' },
  { campo: 'boiGordo', label: 'BOI GORDO' },
  { campo: 'boiMagro', label: 'BOI MAGRO' },
  { campo: 'garrote', label: 'GARROTE' },
  { campo: 'bezerro', label: 'BEZERRO' },
  { campo: 'novilha', label: 'NOVILHA' },
  { campo: 'tropa', label: 'TROPA' },
  { campo: 'outros', label: 'OUTROS' },
]

interface FormState {
  data: string
  loteOrigem: string
  loteDestino: string
  numeroCabecas: string
  pesoMedio: string
  motivoMovimentacao: string
  brincoChip: string
  causaObservacao: string
  vaca: boolean
  touro: boolean
  boiGordo: boolean
  boiMagro: boolean
  garrote: boolean
  bezerro: boolean
  novilha: boolean
  tropa: boolean
  outros: boolean
  outrosTexto: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  loteOrigem: '',
  loteDestino: '',
  numeroCabecas: '',
  pesoMedio: '',
  motivoMovimentacao: '',
  brincoChip: '',
  causaObservacao: '',
  vaca: false,
  touro: false,
  boiGordo: false,
  boiMagro: false,
  garrote: false,
  bezerro: false,
  novilha: false,
  tropa: false,
  outros: false,
  outrosTexto: '',
})

export default function MovimentacaoPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(makeInitial)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [field]: val } as FormState))
  }

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    // Montar dados corretamente
    const tropaValor = form.tropa ? 'S' : 'N'
    const outraCategoria = form.outros && form.outrosTexto.trim() ? form.outrosTexto.trim() : ''

    const result = await salvarRegistro('movimentacao', {
      data: form.data,
      loteOrigem: form.loteOrigem,
      loteDestino: form.loteDestino,
      numeroCabecas: form.numeroCabecas ? Number(form.numeroCabecas) : 0,
      pesoMedio: form.pesoMedio ? Number(form.pesoMedio) : null,
      motivoMovimentacao: form.motivoMovimentacao,
      brincoChip: form.brincoChip,
      causaObservacao: form.causaObservacao,
      vaca: form.vaca ? 'S' : 'N',
      touro: form.touro ? 'S' : 'N',
      boiGordo: form.boiGordo ? 'S' : 'N',
      boiMagro: form.boiMagro ? 'S' : 'N',
      garrote: form.garrote ? 'S' : 'N',
      bezerro: form.bezerro ? 'S' : 'N',
      novilha: form.novilha ? 'S' : 'N',
      tropa: tropaValor, // S ou N
      outraCategoria, // Texto digitado ou vazio
      categoriasMarcadas: [],
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

  const algumaCategoria = CATEGORIAS.some(({ campo }) => form[campo as keyof FormState])

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
          MOVIMENTAÇÃO
        </h1>
        <button
          onClick={() => navigate('/caderneta/movimentacao/lista')}
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
          <DatePicker label="DATA" value={form.data} onChange={(val) => setForm((p) => ({ ...p, data: val }))} error={getError('data')} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="LOTE ORIGEM"
              placeholder="Ex: 03"
              value={form.loteOrigem}
              onChange={setInput('loteOrigem')}
              error={getError('loteOrigem')}
              inputMode="numeric"
            />
            <Input
              label="LOTE DESTINO"
              placeholder="Ex: 07"
              value={form.loteDestino}
              onChange={setInput('loteDestino')}
              error={getError('loteDestino')}
              inputMode="numeric"
            />
          </div>
        </div>

        {/* Seção 2: Quantificação */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">2. QUANTIFICAÇÃO</h2>
          <Input
            label="NÚMERO DE CABEÇAS"
            placeholder="Ex: 25"
            value={form.numeroCabecas}
            onChange={setInput('numeroCabecas')}
            error={getError('numeroCabecas')}
            inputMode="numeric"
            type="number"
            min="0"
          />
          <Input
            label="PESO MÉDIO (kg)"
            placeholder="Ex: 450"
            value={form.pesoMedio}
            onChange={setInput('pesoMedio')}
            inputMode="decimal"
            type="number"
            min="0"
          />
        </div>

        {/* Seção 3: Categorias */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">3. CATEGORIA DOS ANIMAIS</h2>
          {getError('categorias') && (
            <p className="text-base font-semibold text-red-700">⚠️ {getError('categorias')}</p>
          )}
          {algumaCategoria && (
            <p className="text-lg font-bold text-green-700">✅ {CATEGORIAS.filter(c => form[c.campo as keyof FormState]).length} categoria(s) selecionada(s)</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIAS.map(({ campo, label }) => (
              <Checkbox
                key={campo}
                label={label}
                checked={form[campo as keyof FormState] as boolean}
                onChange={() => setForm((p) => ({ ...p, [campo]: !p[campo as keyof FormState] }))}
              />
            ))}
          </div>
          {form.outros && (
            <Input
              label="OUTROS (descreva a categoria)"
              placeholder="Ex: Reprodutor, Matriz, etc."
              value={form.outrosTexto}
              onChange={(e) => setForm((p) => ({ ...p, outrosTexto: e.target.value }))}
              error={getError('outrosTexto')}
            />
          )}
        </div>

        {/* Seção 4: Motivo */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">4. MOTIVO DA MOVIMENTAÇÃO</h2>
          <Radio
            name="motivoMovimentacao"
            options={MOTIVOS}
            value={form.motivoMovimentacao}
            onChange={(val) => setForm((p) => ({ ...p, motivoMovimentacao: val }))}
            error={getError('motivoMovimentacao')}
            gridCols={2}
          />
        </div>

        {/* Seção 5: Identificação e Observação */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">5. IDENTIFICAÇÃO E OBSERVAÇÃO</h2>
          <Input
            label="BRINCO / CHIP"
            placeholder="Ex: 2023-145"
            value={form.brincoChip}
            onChange={setInput('brincoChip')}
          />
          <Input
            label="CAUSA / OBSERVAÇÃO"
            placeholder="Descreva detalhes da movimentação"
            value={form.causaObservacao}
            onChange={setInput('causaObservacao')}
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
        cadernetaName="Movimentação"
      />
    </div>
  )
}

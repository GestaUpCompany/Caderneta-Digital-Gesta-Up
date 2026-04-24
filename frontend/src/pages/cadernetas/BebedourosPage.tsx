import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, ValidationMessage, Select, CheckboxGroup } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import PdfModal from '../../components/PdfModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { LOGO_URL, getFarmLogo, BACKEND_URL } from '../../utils/constants'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'

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
  { value: '1', label: '1', icon: '🟢' },
  { value: '2', label: '2', icon: '🟡' },
  { value: '3', label: '3', icon: '🔴' },
]

interface FormState {
  data: string
  responsavel: string
  pasto: string
  numeroLote: string
  gado: string
  categorias: string[]
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
  categorias: [],
  leituraBebedouro: '',
  numeroBebedouro: '',
  observacao: '',
})

export default function BebedourosPage() {
  const navigate = useNavigate()
  const { usuario, fazenda } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(() => makeInitial(usuario))
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [pastosDisponiveis, setPastosDisponiveis] = useState<string[]>([])
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [carregandoPastosLotes, setCarregandoPastosLotes] = useState(false)

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

  // Carregar pastos e lotes quando fazenda mudar
  useEffect(() => {
    async function carregarPastosELotes() {
      if (!fazenda) return

      setCarregandoPastosLotes(true)
      try {
        const response = await fetch(`${BACKEND_URL}/api/suplementacao/pastos-lotes?fazenda=${encodeURIComponent(fazenda)}`)
        const data = await response.json()

        if (data.success) {
          setPastosDisponiveis(data.pastos || [])
          setLotesDisponiveis(data.lotes || [])
        }
      } catch (error) {
        console.error('Erro ao carregar pastos e lotes:', error)
      } finally {
        setCarregandoPastosLotes(false)
      }
    }

    carregarPastosELotes()

    // Polling a cada 3 minutos
    const interval = setInterval(carregarPastosELotes, 180000) // 3 minutos

    return () => clearInterval(interval)
  }, [fazenda])

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const result = await salvarRegistro('bebedouros', {
      data: form.data,
      responsavel: form.responsavel,
      pasto: form.pasto,
      numeroLote: form.numeroLote,
      gado: form.gado,
      categoria: form.categorias.join(', '),
      leituraBebedouro: form.leituraBebedouro ? Number(form.leituraBebedouro) : null,
      numeroBebedouro: form.numeroBebedouro,
      observacao: form.observacao,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
    } else {
      // Armazenar o registro salvo para compartilhamento
      const dadosRegistro = {
        data: form.data,
        responsavel: form.responsavel,
        pasto: form.pasto,
        numeroLote: form.numeroLote,
        gado: form.gado,
        categoria: form.categorias.join(', '),
        leituraBebedouro: form.leituraBebedouro ? Number(form.leituraBebedouro) : null,
        numeroBebedouro: form.numeroBebedouro,
        observacao: form.observacao,
      }
      setRegistroSalvo(dadosRegistro)
      setShowSuccessModal(true)
      setForm(makeInitial(usuario))
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
      {/* Header sticky com botões e título */}
      <div className="sticky top-0 z-10 bg-[#1a3a2a] text-white px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-yellow-400 font-bold text-sm min-h-[40px] px-3"
          >
            VOLTAR
          </button>
          <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2">BEBEDOUROS</h1>
          <button
            onClick={() => navigate('/caderneta/bebedouros/lista')}
            className="text-yellow-400 font-bold text-sm min-h-[40px] px-3 -mr-2"
          >
            REGISTROS
          </button>
        </div>
      </div>

      {/* Logos não sticky */}
      <div className="bg-[#1a3a2a] text-white px-4 py-5">
        <div className="flex items-center justify-center gap-8">
          <FarmLogo
            farmName={fazenda}
            type="both"
            size="medium"
          />
        </div>
      </div>

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8">
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: Dados Principais */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          {usuario && (
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <span className="text-xl">👤</span>
              <p className="text-gray-700 font-semibold">{usuario}</p>
            </div>
          )}
          <h2 className="section-title">1. DADOS PRINCIPAIS</h2>
          <DatePicker label="DATA" value={form.data} onChange={set('data')} error={getError('data')} />
          <Input
            label="RESPONSÁVEL"
            placeholder="Nome do responsável"
            value={form.responsavel}
            onChange={setInput('responsavel')}
            error={getError('responsavel')}
            readOnly
          />
          <div className="grid grid-cols-2 gap-3">
            {pastosDisponiveis.length > 0 ? (
              <Select
                label="PASTO"
                value={form.pasto}
                onChange={(e) => set('pasto')(e.target.value)}
                error={getError('pasto')}
                options={pastosDisponiveis.map(p => ({ value: p, label: p }))}
              />
            ) : (
              <Input
                label="PASTO"
                placeholder="Carregando..."
                value={form.pasto}
                onChange={setInput('pasto')}
                error={getError('pasto')}
              />
            )}
            {lotesDisponiveis.length > 0 ? (
              <Select
                label="NÚMERO LOTE"
                value={form.numeroLote}
                onChange={(e) => set('numeroLote')(e.target.value)}
                error={getError('numeroLote')}
                options={lotesDisponiveis.map(l => ({ value: l, label: l }))}
              />
            ) : (
              <Input
                label="NÚMERO LOTE"
                placeholder="Carregando..."
                value={form.numeroLote}
                onChange={setInput('numeroLote')}
                error={getError('numeroLote')}
                inputMode="numeric"
              />
            )}
          </div>
          {carregandoPastosLotes && (
            <div className="text-sm text-gray-500">Carregando pastos e lotes...</div>
          )}
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
          {getError('categorias') && (
            <p className="text-base font-semibold text-red-700">⚠️ {getError('categorias')}</p>
          )}
          <p className="text-lg font-bold text-gray-800">CATEGORIAS:</p>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIAS.map((cat) => (
              <Checkbox
                key={cat.value}
                label={cat.label}
                checked={form.categorias.includes(cat.value)}
                onChange={() => toggleCategoria(cat.value)}
              />
            ))}
          </div>
        </div>

        {/* Seção 3: Bebedouro */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">3. BEBEDOURO</h2>
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
          <Radio
            name="leituraBebedouro"
            label={"LEITURA DE BEBEDOURO" + "\n" + "(1 a 3)"}
            options={LEITURAS_BEBEDOURO}
            value={form.leituraBebedouro}
            onChange={set('leituraBebedouro')}
            error={getError('leituraBebedouro')}
            gridCols={3}
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
        registro={registroSalvo}
        caderneta="bebedouros"
      />
    </div>
  )
}

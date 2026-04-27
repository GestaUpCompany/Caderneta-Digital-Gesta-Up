import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, ValidationMessage, Select } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { loadCadastroData } from '../../services/cadastroData'

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
  boiGordo: string
  boiMagro: string
  garrote: string
  novilha: string
  tropa: string
  outros: string
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
  boiGordo: '',
  boiMagro: '',
  garrote: '',
  novilha: '',
  tropa: '',
  outros: '',
})

const CATEGORIAS: { campo: keyof FormState; label: string }[] = [
  { campo: 'vaca', label: 'VACAS' },
  { campo: 'touro', label: 'TOUROS' },
  { campo: 'boiGordo', label: 'BOIS GORDOS' },
  { campo: 'boiMagro', label: 'BOIS MAGROS' },
  { campo: 'garrote', label: 'GARROTES' },
  { campo: 'bezerro', label: 'BEZERROS(AS)' },
  { campo: 'novilha', label: 'NOVILHAS' },
  { campo: 'tropa', label: 'TROPAS' },
  { campo: 'outros', label: 'OUTROS' },
]

export default function PastagensPage() {
  const navigate = useNavigate()
  const { usuario, fazenda, cadastroSheetUrl } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(() => makeInitial(usuario))
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [editandoManejador, setEditandoManejador] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [pastosDisponiveis, setPastosDisponiveis] = useState<string[]>([])
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [carregandoPastosLotes, setCarregandoPastosLotes] = useState(false)

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Carregar pastos e lotes quando fazenda mudar
  useEffect(() => {
    async function carregarPastosELotes() {
      if (!cadastroSheetUrl) {
        setCarregandoPastosLotes(false)
        return
      }

      setCarregandoPastosLotes(true)
      try {
        const data = await loadCadastroData(cadastroSheetUrl)
        setPastosDisponiveis(data.pastos || [])
        setLotesDisponiveis(data.lotes || [])
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
  }, [cadastroSheetUrl])

  const total = ['vaca', 'touro', 'bezerro', 'boiGordo', 'boiMagro', 'garrote', 'novilha', 'tropa', 'outros'].reduce(
    (acc, c) => acc + (Number(form[c as keyof FormState]) || 0), 0
  )

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    // Validar que pasto de saída e entrada não são iguais
    if (form.pastoSaida && form.pastoEntrada && form.pastoSaida === form.pastoEntrada) {
      setErrors([{ field: 'pastoEntrada', message: 'O pasto de entrada não pode ser igual ao pasto de saída' }])
      setSalvando(false)
      return
    }

    const result = await salvarRegistro('pastagens', {
      data: form.data,
      manejador: form.manejador,
      numeroLote: form.numeroLote,
      pastoSaida: form.pastoSaida,
      avaliacaoSaida: form.avaliacaoSaida ? Number(form.avaliacaoSaida) : 0,
      pastoEntrada: form.pastoEntrada,
      avaliacaoEntrada: form.avaliacaoEntrada ? Number(form.avaliacaoEntrada) : 0,
      vaca: form.vaca ? Number(form.vaca) : 0,
      touro: form.touro ? Number(form.touro) : 0,
      boiGordo: form.boiGordo ? Number(form.boiGordo) : 0,
      boiMagro: form.boiMagro ? Number(form.boiMagro) : 0,
      garrote: form.garrote ? Number(form.garrote) : 0,
      bezerro: form.bezerro ? Number(form.bezerro) : 0,
      novilha: form.novilha ? Number(form.novilha) : 0,
      tropa: form.tropa ? Number(form.tropa) : 0,
      outros: form.outros ? Number(form.outros) : 0,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
    } else {
      // Armazenar o registro salvo para compartilhamento
      const dadosRegistro = {
        data: form.data,
        manejador: form.manejador,
        numeroLote: form.numeroLote,
        pastoSaida: form.pastoSaida,
        avaliacaoSaida: form.avaliacaoSaida ? Number(form.avaliacaoSaida) : 0,
        pastoEntrada: form.pastoEntrada,
        avaliacaoEntrada: form.avaliacaoEntrada ? Number(form.avaliacaoEntrada) : 0,
        vaca: form.vaca ? Number(form.vaca) : 0,
        touro: form.touro ? Number(form.touro) : 0,
        boiGordo: form.boiGordo ? Number(form.boiGordo) : 0,
        boiMagro: form.boiMagro ? Number(form.boiMagro) : 0,
        garrote: form.garrote ? Number(form.garrote) : 0,
        bezerro: form.bezerro ? Number(form.bezerro) : 0,
        novilha: form.novilha ? Number(form.novilha) : 0,
        tropa: form.tropa ? Number(form.tropa) : 0,
        outros: form.outros ? Number(form.outros) : 0,
      }
      setRegistroSalvo(dadosRegistro)
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
      {/* Header sticky com botões e título */}
      <div className="sticky top-0 z-10 bg-[#1a3a2a] text-white px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-yellow-400 font-bold text-sm min-h-[40px] px-3"
          >
            VOLTAR
          </button>
          <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2">TROCA DE PASTOS</h1>
          <button
            onClick={() => navigate('/caderneta/pastagens/lista')}
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
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          {usuario && (
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <span className="text-xl">👤</span>
              <p className="text-gray-700 font-semibold">{usuario}</p>
            </div>
          )}
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS PRINCIPAIS</h2>
          <DatePicker label="DATA" value={form.data} onChange={set('data')} error={getError('data')} />
          <div>
            <label className="block text-base font-bold text-gray-700 mb-2">MANEJADOR</label>
            <Input
              placeholder="Nome do responsável"
              value={form.manejador}
              onChange={setInput('manejador')}
              error={getError('manejador')}
              readOnly={!editandoManejador}
            />
          </div>
          {lotesDisponiveis.length > 0 ? (
            <Select
              label="NÚMERO DO LOTE"
              value={form.numeroLote}
              onChange={(e) => set('numeroLote')(e.target.value)}
              error={getError('numeroLote')}
              options={[{ value: '', label: 'Selecione...' }, ...lotesDisponiveis.map(l => ({ value: l, label: l }))]}
            />
          ) : (
            <Input
              label="NÚMERO DO LOTE"
              placeholder="Carregando..."
              value={form.numeroLote}
              onChange={setInput('numeroLote')}
              error={getError('numeroLote')}
              inputMode="numeric"
            />
          )}
          {carregandoPastosLotes && (
            <div className="text-sm text-gray-500">Carregando pastos e lotes...</div>
          )}
        </div>

        {/* Seção 2: Pasto de Saída */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. PASTO DE SAÍDA</h2>
          {pastosDisponiveis.length > 0 ? (
            <Select
              label="PASTO DE SAÍDA"
              value={form.pastoSaida}
              onChange={(e) => set('pastoSaida')(e.target.value)}
              error={getError('pastoSaida')}
              options={[{ value: '', label: 'Selecione...' }, ...pastosDisponiveis.map(p => ({ value: p, label: p }))]}
            />
          ) : (
            <Input
              label="PASTO DE SAÍDA"
              placeholder="Carregando..."
              value={form.pastoSaida}
              onChange={setInput('pastoSaida')}
              error={getError('pastoSaida')}
            />
          )}
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
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. PASTO DE ENTRADA</h2>
          {pastosDisponiveis.length > 0 ? (
            <Select
              label="PASTO DE ENTRADA"
              value={form.pastoEntrada}
              onChange={(e) => set('pastoEntrada')(e.target.value)}
              error={getError('pastoEntrada')}
              options={[{ value: '', label: 'Selecione...' }, ...pastosDisponiveis
                .filter(p => p !== form.pastoSaida)
                .map(p => ({ value: p, label: p }))]}
            />
          ) : (
            <Input
              label="PASTO DE ENTRADA"
              placeholder="Carregando..."
              value={form.pastoEntrada}
              onChange={setInput('pastoEntrada')}
              error={getError('pastoEntrada')}
            />
          )}
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

        {/* Seção 4: Quantidade de Animais */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. QUANTIDADE DE ANIMAIS</h2>
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
        registro={registroSalvo}
        caderneta="pastagens"
      />
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, ValidationMessage, Select } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import PdfModal from '../../components/PdfModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { loadCadastroData } from '../../services/cadastroData'

const BASE = import.meta.env.BASE_URL

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

// Função para processar categorias com diferentes delimitadores
function processarCategorias(categorias: string): string[] {
  if (!categorias) return []
  // Separar por: vírgula+espaço, vírgula, ponto+espaço, ponto, ponto e vírgula+espaço, ponto e vírgula
  const regex = /[,.;]+\s*/
  return categorias
    .split(regex)
    .map(c => c.trim())
    .filter(c => c.length > 0)
}

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
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [detalhesPastoSaida, setDetalhesPastoSaida] = useState<any>(null)
  const [detalhesPastoEntrada, setDetalhesPastoEntrada] = useState<any>(null)
  const [detalhesLote, setDetalhesLote] = useState<any>(null)

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

  // Buscar detalhes do pasto de saída quando selecionado
  useEffect(() => {
    async function carregarDetalhesPastoSaida() {
      if (!form.pastoSaida || !cadastroSheetUrl) {
        setDetalhesPastoSaida(null)
        return
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/insumos/pasto-detalhes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl, pasto: form.pastoSaida }),
        })
        const data = await res.json()
        if (data.success) {
          setDetalhesPastoSaida(data.detalhes)
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do pasto de saída:', error)
      }
    }

    carregarDetalhesPastoSaida()
  }, [form.pastoSaida, cadastroSheetUrl])

  // Buscar detalhes do pasto de entrada quando selecionado
  useEffect(() => {
    async function carregarDetalhesPastoEntrada() {
      if (!form.pastoEntrada || !cadastroSheetUrl) {
        setDetalhesPastoEntrada(null)
        return
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/insumos/pasto-detalhes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl, pasto: form.pastoEntrada }),
        })
        const data = await res.json()
        if (data.success) {
          setDetalhesPastoEntrada(data.detalhes)
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do pasto de entrada:', error)
      }
    }

    carregarDetalhesPastoEntrada()
  }, [form.pastoEntrada, cadastroSheetUrl])

  // Buscar detalhes do lote quando selecionado
  useEffect(() => {
    async function carregarDetalhesLote() {
      if (!form.numeroLote || !cadastroSheetUrl) {
        setDetalhesLote(null)
        return
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/insumos/lote-detalhes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl, lote: form.numeroLote }),
        })
        const data = await res.json()
        if (data.success) {
          setDetalhesLote(data.detalhes)
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do lote:', error)
      }
    }

    carregarDetalhesLote()
  }, [form.numeroLote, cadastroSheetUrl])

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
            className="text-yellow-400 font-bold text-sm min-h-[40px] px-3"
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
          {detalhesLote && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="col-span-2">
                  <p className="text-gray-500 font-semibold">CATEGORIAS</p>
                  <p className="text-gray-900 font-bold break-words">{processarCategorias(detalhesLote.categorias).join(', ')}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-semibold">N° CABEÇAS</p>
                  <p className="text-gray-900 font-bold">{detalhesLote.nCabecas}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-semibold">PESO VIVO</p>
                  <p className="text-gray-900 font-bold">{detalhesLote.pesoVivo} kg</p>
                </div>
                <div>
                  <p className="text-gray-500 font-semibold">QTD. BEZERROS</p>
                  <p className="text-gray-900 font-bold">{detalhesLote.qtdBezerros}</p>
                </div>
              </div>
            </div>
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
          {detalhesPastoSaida && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-gray-500 font-semibold">ÁREA ÚTIL</p>
                  <p className="text-gray-900 font-bold">{detalhesPastoSaida.areaUtil} ha</p>
                </div>
                <div>
                  <p className="text-gray-500 font-semibold">ESPÉCIE</p>
                  <p className="text-gray-900 font-bold">{detalhesPastoSaida.especie}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-semibold">ALTURA</p>
                  <p className="text-gray-900 font-bold">{detalhesPastoSaida.alturaSaida} cm</p>
                </div>
              </div>
            </div>
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

        {/* Botão de PDF POP */}
        <button
          onClick={() => setShowPdfModal(true)}
          className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors"
        >
          <span className="text-xl">📄</span>
          <span>VER POP MANEJO DE PASTAGENS</span>
        </button>

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
          {detalhesPastoEntrada && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-gray-500 font-semibold">ÁREA ÚTIL</p>
                  <p className="text-gray-900 font-bold">{detalhesPastoEntrada.areaUtil} ha</p>
                </div>
                <div>
                  <p className="text-gray-500 font-semibold">ESPÉCIE</p>
                  <p className="text-gray-900 font-bold">{detalhesPastoEntrada.especie}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-semibold">ALTURA</p>
                  <p className="text-gray-900 font-bold">{detalhesPastoEntrada.alturaEntrada} cm</p>
                </div>
              </div>
            </div>
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

      <PdfModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        images={[
          `${BASE}docs/pastagens/POP_Pastagens_01.jpg`,
          `${BASE}docs/pastagens/POP_Pastagens_02.jpg`,
          `${BASE}docs/pastagens/POP_Pastagens_03.jpg`
        ]}
      />
    </div>
  )
}

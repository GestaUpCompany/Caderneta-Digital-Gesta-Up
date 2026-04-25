import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, Checkbox, ValidationMessage, Select } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { BACKEND_URL } from '../../utils/constants'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { loadCadastroData } from '../../services/cadastroData'

const PRODUTOS = [
  { value: 'Mineral', label: 'MINERAL', icon: '' },
  { value: 'Proteinado', label: 'PROTEINADO', icon: '' },
  { value: 'Ração', label: 'RAÇÃO', icon: '' },
  { value: 'Creep', label: 'CREEP', icon: '' },
]

const TIPOS_GADO = [
  { value: 'Cria', label: 'CRIA', icon: '🍼' },
  { value: 'Recria', label: 'RECRIA', icon: '🌿' },
  { value: 'Engorda', label: 'ENGORDA', icon: '🥩' },
]

const LEITURAS = [
  { value: '-1', label: '-1', icon: '🔴' },
  { value: '0', label: '0', icon: '🟡' },
  { value: '1', label: '1', icon: '🟢' },
  { value: '2', label: '2', icon: '🟡' },
  { value: '3', label: '3', icon: '🔴' },
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
  kgCocho: string
  kgDeposito: string
  categorias: string[]
}

const makeInitial = (usuario?: string): FormState => ({
  data: todayBR(),
  tratador: usuario || '',
  pasto: '',
  numeroLote: '',
  produto: '',
  gado: '',
  leitura: '',
  kgCocho: '',
  kgDeposito: '',
  categorias: [],
})

export default function SuplementacaoPage() {
  const navigate = useNavigate()
  const { usuario, fazenda, cadastroSheetUrl } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(() => makeInitial(usuario))
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [suplementos, setSuplementos] = useState<string[]>([])
  const [suplemento, setSuplemento] = useState('')
  const [quantidadeCreep, setQuantidadeCreep] = useState('')
  const [kgDeposito, setKgDeposito] = useState('')
  const [carregandoSuplementos, setCarregandoSuplementos] = useState(false)
  const [pastosDisponiveis, setPastosDisponiveis] = useState<string[]>([])
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [carregandoPastosLotes, setCarregandoPastosLotes] = useState(false)

  // Carregar suplementos quando tipo principal muda (exceto Creep)
  useEffect(() => {
    const carregarSuplementos = async () => {
      if (!form.produto || form.produto === 'Creep') {
        setSuplementos([])
        setSuplemento('')
        return
      }

      if (!fazenda) {
        return
      }

      setCarregandoSuplementos(true)
      try {
        if (!cadastroSheetUrl) {
          setSuplementos([])
          return
        }
        const response = await fetch(`${BACKEND_URL}/api/suplementacao/subtipos?tipo=${form.produto}&cadastroSheetUrl=${cadastroSheetUrl}`)
        const data = await response.json()
        if (data.success) {
          setSuplementos(data.subtipos || [])
          setSuplemento('')
        }
      } catch (error) {
        console.error('Erro ao carregar suplementos:', error)
        setSuplementos([])
      } finally {
        setCarregandoSuplementos(false)
      }
    }

    carregarSuplementos()

    // Polling a cada 3 minutos
    const interval = setInterval(carregarSuplementos, 180000) // 3 minutos

    return () => clearInterval(interval)
  }, [form.produto, fazenda])

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

    // Se tipo é Creep: salvar quantidade, senão salvar suplemento
    const suplementoQtd = form.produto === 'Creep' ? quantidadeCreep : suplemento

    const result = await salvarRegistro('suplementacao', {
      data: form.data,
      tratador: form.tratador,
      pasto: form.pasto,
      numeroLote: form.numeroLote,
      produto: form.produto,
      suplementoQtd,
      gado: form.gado,
      leitura: form.leitura ? Number(form.leitura) : null,
      kgCocho: form.kgCocho ? Number(form.kgCocho) : 0,
      kgDeposito: kgDeposito ? Number(kgDeposito) : 0,
      categorias: form.categorias,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
    } else {
      // Armazenar o registro salvo para compartilhamento
      const dadosRegistro = {
        data: form.data,
        tratador: form.tratador,
        pasto: form.pasto,
        numeroLote: form.numeroLote,
        produto: form.produto,
        suplementoQtd,
        gado: form.gado,
        leitura: form.leitura ? Number(form.leitura) : null,
        kgCocho: form.kgCocho ? Number(form.kgCocho) : 0,
        kgDeposito: kgDeposito ? Number(kgDeposito) : 0,
        categorias: form.categorias,
      }
      setRegistroSalvo(dadosRegistro)
      setShowSuccessModal(true)
      setForm(makeInitial(usuario))
      setSuplemento('')
      setQuantidadeCreep('')
      setKgDeposito('')
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
          <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2">SUPLEMENTAÇÃO</h1>
          <button
            onClick={() => navigate('/caderneta/suplementacao/lista')}
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
            label="TRATADOR"
            placeholder="Nome do responsável"
            value={form.tratador}
            onChange={setInput('tratador')}
            error={getError('tratador')}
            readOnly
          />
          <div className="grid grid-cols-2 gap-3">
            {pastosDisponiveis.length > 0 ? (
              <Select
                label="PASTO"
                value={form.pasto}
                onChange={(e) => set('pasto')(e.target.value)}
                error={getError('pasto')}
                options={[{ value: '', label: 'Selecione...' }, ...pastosDisponiveis.map(p => ({ value: p, label: p }))]}
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
                options={[{ value: '', label: 'Selecione...' }, ...lotesDisponiveis.map(l => ({ value: l, label: l }))]}
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
            gridCols={2}
          />

          {/* Lista suspensa para suplemento (Mineral/Proteinado/Ração) */}
          {form.produto && form.produto !== 'Creep' && (
            <div className="mt-2">
              {carregandoSuplementos ? (
                <p className="text-gray-500">Carregando suplementos...</p>
              ) : suplementos.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-gray-700">Suplemento:</label>
                  <select
                    value={suplemento}
                    onChange={(e) => setSuplemento(e.target.value)}
                    className="w-full p-3 border-2 border-gray-300 rounded-xl text-lg focus:border-[#3b82f6] focus:outline-none"
                  >
                    <option value="">Selecione o suplemento...</option>
                    {suplementos.map((sup) => (
                      <option key={sup} value={sup}>
                        {sup}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-gray-500">Nenhum suplemento disponível</p>
              )}
            </div>
          )}

          {/* Campo numérico para Creep */}
          {form.produto === 'Creep' && (
            <div className="mt-2">
              <Input
                label="QUANTIDADE"
                placeholder="0"
                value={quantidadeCreep}
                onChange={(e) => setQuantidadeCreep(e.target.value)}
                inputMode="decimal"
                type="number"
                min="0"
              />
            </div>
          )}
        </div>

        {/* Seção 3: Leitura e Quantidade */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">3. LEITURA E QUANTIDADE</h2>
          <Radio
            name="leitura"
            label="LEITURA DO COCHO (-1 a 3)"
            options={LEITURAS}
            value={form.leitura}
            onChange={set('leitura')}
            error={getError('leitura')}
            gridCols={5}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Kg no cocho"
              placeholder="0"
              value={form.kgCocho}
              onChange={setInput('kgCocho')}
              inputMode="decimal"
              type="number"
              min="0"
            />
            <Input
              label="Kg no depósito"
              placeholder="0"
              value={kgDeposito}
              onChange={(e) => setKgDeposito(e.target.value)}
              inputMode="decimal"
              type="number"
              min="0"
            />
          </div>
        </div>

        {/* Seção 4: Gado e Categorias */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">4. CLASSIFICAÇÃO DO GADO</h2>
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
                key={cat}
                label={cat}
                checked={form.categorias.includes(cat)}
                onChange={() => toggleCategoria(cat)}
              />
            ))}
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
        registro={registroSalvo}
        caderneta="suplementacao"
      />
    </div>
  )
}

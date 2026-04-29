import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, CheckboxGroup, ValidationMessage, Select } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import PdfModal from '../../components/PdfModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { BACKEND_URL } from '../../utils/constants'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { loadCadastroData } from '../../services/cadastroData'

const BASE = import.meta.env.BASE_URL

const PRODUTOS = [
  { value: 'Mineral', label: 'MINERAL', icon: '' },
  { value: 'Proteinado', label: 'PROTEINADO', icon: '' },
  { value: 'Ração', label: 'RAÇÃO', icon: '' },
  { value: 'Insumos', label: 'INSUMOS', icon: '' },
  { value: 'Dietas', label: 'DIETAS', icon: '' },
  { value: 'Creep', label: 'CREEP', icon: '' },
]

const CATEGORIAS = [
  { value: 'Vaca', label: 'VACA' },
  { value: 'Touro', label: 'TOURO' },
  { value: 'Boi Gordo', label: 'BOI GORDO' },
  { value: 'Boi Magro', label: 'BOI MAGRO' },
  { value: 'Garrote', label: 'GARROTE' },
  { value: 'Bezerro', label: 'BEZERRO' },
  { value: 'Novilha', label: 'NOVILHA' },
  { value: 'Tropa', label: 'TROPA' },
  { value: 'Outros', label: 'OUTROS' },
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

const LEITURAS = [
  { value: '-1', label: '-1', icon: '🔴' },
  { value: '0', label: '0', icon: '🟡' },
  { value: '1', label: '1', icon: '🟢' },
  { value: '2', label: '2', icon: '🟡' },
  { value: '3', label: '3', icon: '🔴' },
]

interface FormState {
  data: string
  tratador: string
  pasto: string
  numeroLote: string
  produto: string
  leitura: string
  kgCocho: string
  kgDeposito: string
  categorias: string[]
  outrosTexto: string
}

const makeInitial = (usuario?: string): FormState => ({
  data: todayBR(),
  tratador: usuario || '',
  pasto: '',
  numeroLote: '',
  produto: '',
  leitura: '',
  kgCocho: '',
  kgDeposito: '',
  categorias: [],
  outrosTexto: '',
})

export default function SuplementacaoPage() {
  const navigate = useNavigate()
  const { usuario, fazenda, cadastroSheetUrl } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(() => makeInitial(usuario))
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showFezesModal, setShowFezesModal] = useState(false)
  const [suplementos, setSuplementos] = useState<string[]>([])
  const [suplemento, setSuplemento] = useState('')
  const [quantidadeCreep, setQuantidadeCreep] = useState('')
  const [kgDeposito, setKgDeposito] = useState('')
  const [carregandoSuplementos, setCarregandoSuplementos] = useState(false)
  const [pastosDisponiveis, setPastosDisponiveis] = useState<string[]>([])
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [carregandoPastosLotes, setCarregandoPastosLotes] = useState(false)
  const [detalhesLote, setDetalhesLote] = useState<any>(null)
  const [suplementacaoData, setSuplementacaoData] = useState<any>(null)

  // Carregar dados de suplementação quando cadastroSheetUrl mudar
  useEffect(() => {
    async function carregarSuplementacaoData() {
      if (!cadastroSheetUrl) {
        setSuplementacaoData(null)
        return
      }

      try {
        const res = await fetch(`${BACKEND_URL}/api/insumos/suplementacao`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl }),
        })
        const data = await res.json()
        if (data.success) {
          setSuplementacaoData(data)
        }
      } catch (error) {
        console.error('Erro ao carregar dados de suplementação:', error)
      }
    }

    carregarSuplementacaoData()

    // Polling a cada 3 minutos
    const interval = setInterval(carregarSuplementacaoData, 180000) // 3 minutos

    return () => clearInterval(interval)
  }, [cadastroSheetUrl])

  // Carregar suplementos quando tipo principal muda (exceto Creep)
  useEffect(() => {
    const carregarSuplementos = async () => {
      if (!form.produto || form.produto === 'Creep') {
        setSuplementos([])
        setSuplemento('')
        return
      }

      if (!suplementacaoData) {
        setSuplementos([])
        return
      }

      // Mapear tipo de produto para a coluna correspondente
      let suplementosArray: string[] = []
      switch (form.produto) {
        case 'Mineral':
          suplementosArray = suplementacaoData.mineral || []
          break
        case 'Proteinado':
          suplementosArray = suplementacaoData.proteinado || []
          break
        case 'Ração':
          suplementosArray = suplementacaoData.racao || []
          break
        case 'Insumos':
          suplementosArray = suplementacaoData.insumos || []
          break
        case 'Dietas':
          suplementosArray = suplementacaoData.dietas || []
          break
        default:
          suplementosArray = []
      }

      setSuplementos(suplementosArray)
      setSuplemento('')
    }

    carregarSuplementos()
  }, [form.produto, suplementacaoData])

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

  // Buscar detalhes do lote quando selecionado
  useEffect(() => {
    async function carregarDetalhesLote() {
      if (!form.numeroLote || !cadastroSheetUrl) {
        setDetalhesLote(null)
        return
      }

      try {
        const res = await fetch(`${BACKEND_URL}/api/insumos/lote-detalhes`, {
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

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const handleCategoriasChange = (newCategorias: string[]) => {
    setForm((prev) => ({ ...prev, categorias: newCategorias }))
  }

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    // Lógica do Creep
    const produtoFinal = form.produto === 'Creep' ? 'Creep' : suplemento
    const creepKgFinal = form.produto === 'Creep' ? quantidadeCreep : ''
    
    // Montar categorias como string separada por vírgula
    let categoriasArray = form.categorias.filter(c => c !== 'Outros')
    
    // Se "Outros" estiver selecionado e houver texto, adicionar no final
    if (form.categorias.includes('Outros') && form.outrosTexto.trim()) {
      categoriasArray.push(`Outros: ${form.outrosTexto.trim()}`)
    } else if (form.categorias.includes('Outros')) {
      categoriasArray.push('Outros')
    }
    
    const categoriasString = categoriasArray.join(', ')

    const result = await salvarRegistro('suplementacao', {
      data: form.data,
      tratador: form.tratador,
      pasto: form.pasto,
      numeroLote: form.numeroLote,
      produto: produtoFinal,
      creepKg: creepKgFinal,
      leituraCocho: form.leitura ? Number(form.leitura) : null,
      kgCocho: form.kgCocho ? Number(form.kgCocho) : 0,
      kgDeposito: kgDeposito ? Number(kgDeposito) : 0,
      categorias: form.categorias,
      categoriasString: categoriasString,
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
        produto: produtoFinal,
        creepKg: creepKgFinal,
        leituraCocho: form.leitura ? Number(form.leitura) : null,
        kgCocho: form.kgCocho ? Number(form.kgCocho) : 0,
        kgDeposito: kgDeposito ? Number(kgDeposito) : 0,
        categorias: categoriasString,
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
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS PRINCIPAIS</h2>
          {usuario && (
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <span className="text-xl">👤</span>
              <p className="text-gray-700 font-semibold">{usuario}</p>
            </div>
          )}
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

        {/* Seção 2: Tipo de Suplementação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. TIPO DE SUPLEMENTAÇÃO</h2>
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
                label="QUANTIDADE (kg)"
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
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. LEITURA E QUANTIDADE</h2>
          <button
            onClick={() => setShowPdfModal(true)}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors"
          >
            <span className="text-xl">📄</span>
            <span>VER POP LEITURA DE COCHO</span>
          </button>
          <button
            onClick={() => setShowFezesModal(true)}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors"
          >
            <span className="text-xl">📄</span>
            <span>VER POP FEZES</span>
          </button>
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
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. CLASSIFICAÇÃO DO GADO</h2>
          <CheckboxGroup
            label="CATEGORIAS:"
            options={CATEGORIAS}
            selectedValues={form.categorias}
            onChange={handleCategoriasChange}
            error={getError('categorias')}
            gridCols={2}
            hideCheckbox={true}
          />
          {form.categorias.includes('Outros') && (
            <Input
              label="ESPECIFICAR OUTROS:"
              placeholder="Descreva a categoria"
              value={form.outrosTexto}
              onChange={setInput('outrosTexto')}
              error={getError('outrosTexto')}
            />
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

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Suplementação"
        registro={registroSalvo}
        caderneta="suplementacao"
      />

      <PdfModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        images={[
          `${BASE}docs/cocho/POP_Cocho_01.jpg`,
          `${BASE}docs/cocho/POP_Cocho_02.jpg`
        ]}
      />

      <PdfModal
        isOpen={showFezesModal}
        onClose={() => setShowFezesModal(false)}
        images={[
          `${BASE}docs/fezes/POP_Fezes_01.jpg`
        ]}
      />
    </div>
  )
}

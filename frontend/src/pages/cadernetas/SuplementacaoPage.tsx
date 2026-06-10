import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, ValidationMessage } from '../../components/ui'
import SearchableModal from '../../components/ui/SearchableModal'
import SuccessModal from '../../components/SuccessModal'
import PdfModal from '../../components/PdfModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { getCachedCadastroData } from '../../services/cadastroCache'
import { getLoteByNome, getLoteDetalhesComCategorias, getPastoByNome, getEspacamentoIdealCocho, getPastos, getLotes, getMineral, getProteinado, getRacao, getInsumos } from '../../services/supabaseService'
import LoteDetalhesCard from '../../components/LoteDetalhesCard'
// import EspacamentoCochoCard from '../../components/EspacamentoCochoCard' // Temporariamente desabilitado
import { scrollToFirstError } from '../../utils/scrollToError'
import { useFormValidation } from '../../hooks/useFormValidation'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'

const BASE = import.meta.env.BASE_URL

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

const PRODUTOS = [
  { value: 'Mineral', label: 'MINERAL', icon: '' },
  { value: 'Proteinado', label: 'PROTEINADO', icon: '' },
  { value: 'Ração', label: 'RAÇÃO', icon: '' },
  { value: 'Insumos', label: 'INSUMOS', icon: '' },
]

const LEITURAS = [
  { value: '-1', label: '-1', icon: '🔴' },
  { value: '0', label: '0', icon: '🟡' },
  { value: '1', label: '1', icon: '🟢' },
  { value: '2', label: '2', icon: '🟡' },
  { value: '3', label: '3', icon: '🔴' },
]

const ESCALA_5 = [
  { value: '1', label: '1', icon: '🔴' },
  { value: '2', label: '2', icon: '🟡' },
  { value: '3', label: '3', icon: '🟢' },
  { value: '4', label: '4', icon: '🟡' },
  { value: '5', label: '5', icon: '🔴' },
]

const SN_OPTIONS = [
  { value: 'Sim', label: 'SIM', icon: '✅' },
  { value: 'Não', label: 'NÃO', icon: '❌' },
]

const CHECKLIST_PERGUNTAS = [
  { campo: 'limpezaCocho', label: 'LIMPEZA DE COCHO FOI REALIZADA?' },
  { campo: 'cochosCondicoes', label: 'COCHOS ESTÃO EM BOAS CONDIÇÕES?' },
  { campo: 'aterroAcessoIdeal', label: 'ATERRO / ACESSO DE COCHO ESTÁ IDEAL?' },
  // { campo: 'espacamentoCocho', label: 'ESPAÇAMENTO DO COCHO (cm/cab):' }, // Temporariamente desabilitado
  { campo: 'depositoCondicoes', label: 'DEPÓSITO ESTÁ EM BOAS CONDIÇÕES?' },
  { campo: 'estoqueDepositio', label: 'TEM ESTOQUE NO DEPÓSITO?' },
]

interface FormState {
  data: string
  tratador: string
  pasto: string
  numeroLote: string
  loteId: string
  pastoId: string
  produto: string
  leitura: string
  kgCocho: string
  kgDeposito: string
  escoreFezes: string
  // Checklist fields (for UI)
  limpezaCocho: string
  limpezaCochoObs: string
  cochosCondicoes: string
  cochosCondicoesObs: string
  aterroAcessoIdeal: string
  aterroAcessoIdealObs: string
  espacamentoCochoCmCab: string
  espacamentoCochoObs: string
  depositoCondicoes: string
  depositoCondicoesObs: string
  estoqueDepositio: string
  estoqueDepositioObs: string
  checklist?: {
    limpeza_cocho: {
      valor: boolean
      observacao: string
    }
    cochos_condicoes: {
      valor: boolean
      observacao: string
    }
    aterro_acesso_ideal: {
      valor: boolean
      observacao: string
    }
    deposito_condicoes: {
      valor: boolean
      observacao: string
    }
    estoque_deposito: {
      valor: boolean
      observacao: string
    }
  }
}

const makeInitial = (usuario?: string): FormState => ({
  data: todayBR(),
  tratador: usuario || '',
  pasto: '',
  numeroLote: '',
  loteId: '',
  pastoId: '',
  produto: '',
  leitura: '',
  kgCocho: '',
  kgDeposito: '',
  escoreFezes: '',
  // Checklist fields
  limpezaCocho: '',
  limpezaCochoObs: '',
  cochosCondicoes: '',
  cochosCondicoesObs: '',
  aterroAcessoIdeal: '',
  aterroAcessoIdealObs: '',
  espacamentoCochoCmCab: '',
  espacamentoCochoObs: '',
  depositoCondicoes: '',
  depositoCondicoesObs: '',
  estoqueDepositio: '',
  estoqueDepositioObs: '',
})

export default function SuplementacaoPage() {
  const navigate = useNavigate()
  const { usuario, fazenda, fazendaId, logoUrl } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(() => makeInitial(usuario))
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showFezesModal, setShowFezesModal] = useState(false)
  const [mineralDisponiveis, setMineralDisponiveis] = useState<string[]>([])
  const [proteinadoDisponiveis, setProteinadoDisponiveis] = useState<string[]>([])
  const [racaoDisponiveis, setRacaoDisponiveis] = useState<string[]>([])
  const [insumosDisponiveis, setInsumosDisponiveis] = useState<string[]>([])
  const [suplemento, setSuplemento] = useState('')
  const [kgDeposito, setKgDeposito] = useState('')
  const [pastosDisponiveis, setPastosDisponiveis] = useState<string[]>([])
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [detalhesLote, setDetalhesLote] = useState<any>(null)
  const [possuiDeposito, setPossuiDeposito] = useState<boolean>(false)
  const [dadosPasto, setDadosPasto] = useState<any>(null)
  const [espacamentoCochoDetalhes, setEspacamentoCochoDetalhes] = useState<any>(null)

  // Carregar todos os suplementos ao abrir a página, com fallback para Supabase
  useEffect(() => {
    const loadData = async () => {
      const cache = getCachedCadastroData()
      if (cache && cache.mineral && cache.mineral.length > 0) {
        setMineralDisponiveis(cache.mineral || [])
        setProteinadoDisponiveis(cache.proteinado || [])
        setRacaoDisponiveis(cache.racao || [])
        setInsumosDisponiveis(cache.insumos || [])
        setPastosDisponiveis(cache.pastos || [])
        setLotesDisponiveis(cache.lotes || [])
      } else if (fazendaId) {
        try {
          const [mineralData, proteinadoData, racaoData, insumosData] = await Promise.all([
            getMineral(fazendaId),
            getProteinado(fazendaId),
            getRacao(fazendaId),
            getInsumos(fazendaId)
          ])
          setMineralDisponiveis(mineralData?.map((m: any) => m.nome) || [])
          setProteinadoDisponiveis(proteinadoData?.map((p: any) => p.nome) || [])
          setRacaoDisponiveis(racaoData?.map((r: any) => r.nome) || [])
          setInsumosDisponiveis(insumosData?.map((i: any) => i.nome) || [])
        } catch (error) {
          console.error('Erro ao carregar suplementos do Supabase:', error)
        }
      }
    }
    loadData()
  }, [fazendaId])

  useEffect(() => {
    setSuplemento('')
  }, [form.produto])

  // Obter opções de suplemento baseado no produto selecionado
  const getSuplementoOptions = (): string[] => {
    switch (form.produto) {
      case 'Mineral':
        return mineralDisponiveis
      case 'Proteinado':
        return proteinadoDisponiveis
      case 'Ração':
        return racaoDisponiveis
      case 'Insumos':
        return insumosDisponiveis
      default:
        return []
    }
  }

  // Carregar pastos e lotes do cache global, com fallback para Supabase
  useEffect(() => {
    const loadData = async () => {
      const cache = getCachedCadastroData()
      if (cache && cache.pastos && cache.pastos.length > 0) {
        setPastosDisponiveis(cache.pastos || [])
        setLotesDisponiveis(cache.lotes || [])
      } else if (fazendaId) {
        try {
          const [pastosData, lotesData] = await Promise.all([
            getPastos(fazendaId),
            getLotes(fazendaId)
          ])
          setPastosDisponiveis(pastosData?.map((p: any) => p.nome) || [])
          setLotesDisponiveis(lotesData?.map((l: any) => l.nome) || [])
        } catch (error) {
          console.error('Erro ao carregar dados do Supabase:', error)
        }
      }
    }
    loadData()
  }, [fazendaId])

  // Escutar atualizações do cache de cadastro
  useEffect(() => {
    const unsubscribe = eventBus.on(CADASTRO_CACHE_UPDATED, (data: any) => {
      console.log('[SuplementacaoPage] Cache atualizado, recarregando dados')
      if (data) {
        setMineralDisponiveis(data.mineral || [])
        setProteinadoDisponiveis(data.proteinado || [])
        setRacaoDisponiveis(data.racao || [])
        setInsumosDisponiveis(data.insumos || [])
        setPastosDisponiveis(data.pastos || [])
        setLotesDisponiveis(data.lotes || [])
      }
    })

    return unsubscribe
  }, [])

  // Buscar detalhes do lote quando selecionado e auto-derivar pasto
  useEffect(() => {
    async function carregarDetalhesLote() {
      if (!form.numeroLote || !fazendaId) {
        setDetalhesLote(null)
        setForm(prev => ({ ...prev, pasto: '', loteId: '', pastoId: '' }))
        return
      }

      try {
        const lote = await getLoteByNome(fazendaId, form.numeroLote)
        if (lote) {
          // Buscar detalhes de categorias do lote
          const categoriasDetalhes = await getLoteDetalhesComCategorias(lote.id)
          
          // Combinar dados do lote com dados de categorias
          setDetalhesLote({
            ...lote,
            categorias: categoriasDetalhes.categorias,
            n_cabecas: categoriasDetalhes.quant_atual,
            peso_vivo_kg: categoriasDetalhes.peso_vivo_kg,
            qtd_bezerros: categoriasDetalhes.qtd_bezerros,
            categorias_raw: categoriasDetalhes.categorias_raw
          })
          
          // Auto-derivar pasto do lote
          const pastoNome = (lote as any).pastos?.nome || ''
          setForm(prev => ({
            ...prev,
            pasto: pastoNome,
            loteId: lote.id,
            pastoId: (lote as any).pasto_id || ''
          }))
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do lote:', error)
        setDetalhesLote(null)
        setForm(prev => ({ ...prev, pasto: '', loteId: '', pastoId: '' }))
      }
    }

    carregarDetalhesLote()
  }, [form.numeroLote, fazendaId])

  // Buscar dados do pasto quando selecionado para verificar possui_deposito
  useEffect(() => {
    async function carregarDadosPasto() {
      if (!form.pasto || !fazendaId) {
        setPossuiDeposito(false)
        setDadosPasto(null)
        return
      }

      try {
        const pasto = await getPastoByNome(fazendaId, form.pasto)
        if (pasto) {
          setPossuiDeposito(pasto.possui_deposito || false)
          setDadosPasto(pasto)
        } else {
          setPossuiDeposito(false)
          setDadosPasto(null)
        }
      } catch (error) {
        console.error('Erro ao carregar dados do pasto:', error)
        setPossuiDeposito(false)
        setDadosPasto(null)
      }
    }

    carregarDadosPasto()
  }, [form.pasto, fazendaId])

  // Calcular espacamento do cocho quando dados mudarem
  useEffect(() => {
    async function calcularEspacamentoCocho() {
      if (!dadosPasto || !detalhesLote || !form.produto || !suplemento || !fazendaId) {
        setEspacamentoCochoDetalhes(null)
        return
      }

      try {
        const metragemCochoM = dadosPasto.metragem_cocho_m
        if (!metragemCochoM) {
          setEspacamentoCochoDetalhes(null)
          return
        }

        // Filtrar categorias adultas (excluir bezerro, garrote, novilha)
        const categoriasExcluidas = ['bezerro', 'garrote', 'novilha']
        const categoriasRaw = detalhesLote.categorias_raw || []
        const categoriasAdultas = categoriasRaw.filter(
          (cat: any) => !categoriasExcluidas.includes(cat.categoria.toLowerCase())
        )

        const cabecasAdultas = categoriasAdultas.reduce((sum: number, cat: any) => sum + (cat.quant_atual || 0), 0)

        if (cabecasAdultas <= 0) {
          setEspacamentoCochoDetalhes({
            erro: 'Não é possível calcular: não há gado adulto no lote'
          })
          return
        }

        const espacamentoCalculado = metragemCochoM / cabecasAdultas
        const espacamentoIdeal = await getEspacamentoIdealCocho(fazendaId, form.produto, suplemento)

        if (!espacamentoIdeal) {
          setEspacamentoCochoDetalhes({
            espacamento_calculado_m_cab: espacamentoCalculado,
            espacamento_ideal_m_cab: null,
            desvio_percentual: null,
            metragem_cocho_m: metragemCochoM,
            cabecas_adultas: cabecasAdultas
          })
          return
        }

        const desvioPercentual = ((espacamentoCalculado - espacamentoIdeal) / espacamentoIdeal) * 100

        setEspacamentoCochoDetalhes({
          espacamento_calculado_m_cab: espacamentoCalculado,
          espacamento_ideal_m_cab: espacamentoIdeal,
          desvio_percentual: desvioPercentual,
          metragem_cocho_m: metragemCochoM,
          cabecas_adultas: cabecasAdultas
        })
      } catch (error) {
        console.error('Erro ao calcular espacamento do cocho:', error)
        setEspacamentoCochoDetalhes(null)
      }
    }

    calcularEspacamentoCocho()
  }, [dadosPasto, detalhesLote, form.produto, suplemento, fazendaId])

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Validation rules (dynamic: skip deposito fields when pasto has no deposito)
  const validationRules = useMemo(() => {
    const base: any = {
      data: { required: true },
      tratador: { required: true },
      numeroLote: { required: true },
      produto: { required: true },
      leitura: { required: true },
      limpezaCocho: { required: true },
      cochosCondicoes: { required: true },
      aterroAcessoIdeal: { required: true },
    }
    if (possuiDeposito) {
      base.depositoCondicoes = { required: true }
      base.estoqueDepositio = { required: true }
    }
    return base
  }, [possuiDeposito])

  const { isValid } = useFormValidation(form, validationRules)

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    // Validate form using the validation hook
    if (!isValid) {
      setSalvando(false)
      return
    }

    const produtoFinal = suplemento
    
    // Buscar categorias do lote selecionado
    let categoriasString = ''
    let categoriasArray: string[] = []
    if (detalhesLote && detalhesLote.categorias) {
      categoriasString = detalhesLote.categorias
      categoriasArray = processarCategorias(detalhesLote.categorias)
    }

    const result = await salvarRegistro('suplementacao', {
      data: form.data,
      tratador: form.tratador,
      pasto: form.pasto,
      pastoId: form.pastoId,
      numeroLote: form.numeroLote,
      loteId: form.loteId,
      produto: produtoFinal,
      leituraCocho: form.leitura ? Number(form.leitura) : null,
      kgCocho: form.kgCocho ? Number(form.kgCocho) : 0,
      kgDeposito: kgDeposito ? Number(kgDeposito) : 0,
      categorias: categoriasArray,
      categoriasString: categoriasString,
      escoreFezes: form.escoreFezes ? Number(form.escoreFezes) : null,
      espacamentoCochoDetalhes: espacamentoCochoDetalhes,
      espacamentoCochoCmCab: form.espacamentoCochoCmCab ? Number(form.espacamentoCochoCmCab) : null,
      espacamentoCochoObs: form.espacamentoCochoObs || '',
      checklist: {
        limpeza_cocho: {
          valor: form.limpezaCocho === 'Sim',
          observacao: form.limpezaCochoObs || ''
        },
        cochos_condicoes: {
          valor: form.cochosCondicoes === 'Sim',
          observacao: form.cochosCondicoesObs || ''
        },
        aterro_acesso_ideal: {
          valor: form.aterroAcessoIdeal === 'Sim',
          observacao: form.aterroAcessoIdealObs || ''
        },
        ...(possuiDeposito ? {
          deposito_condicoes: {
            valor: form.depositoCondicoes === 'Sim',
            observacao: form.depositoCondicoesObs || ''
          },
          estoque_deposito: {
            valor: form.estoqueDepositio === 'Sim',
            observacao: form.estoqueDepositioObs || ''
          }
        } : {})
      },
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      setForm(makeInitial(usuario))
      setSuplemento('')
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
            logoUrl={logoUrl}
            type="both"
            size="medium"
          />
        </div>
      </div>

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8">
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: Dados Principais */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS PRINCIPAIS <span className="text-red-500">*</span></h2>
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
          />
          {lotesDisponiveis.length > 0 ? (
            <SearchableModal
              label="LOTE"
              value={form.numeroLote}
              onChange={set('numeroLote')}
              error={getError('numeroLote')}
              options={lotesDisponiveis}
              placeholder="Buscar lote..."
              id="numeroLote"
              name="numeroLote"
            />
          ) : (
            <Input
              label="NÚMERO LOTE"
              placeholder="Carregando..."
              value={form.numeroLote}
              onChange={setInput('numeroLote')}
              error={getError('numeroLote')}
              inputMode="numeric"
              disabled
            />
          )}
          {detalhesLote && (
            <LoteDetalhesCard detalhes={detalhesLote} processarCategorias={processarCategorias} />
          )}
        </div>

        {/* Seção 2: Tipo de Suplementação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. TIPO DE SUPLEMENTAÇÃO <span className="text-red-500">*</span></h2>
          <Radio
            name="produto"
            label="PRODUTO"
            options={PRODUTOS}
            value={form.produto}
            onChange={set('produto')}
            error={getError('produto')}
            gridCols={2}
          />

          {/* SearchableModal para suplemento (Mineral/Proteinado/Ração) */}
          {form.produto && form.produto !== 'Creep' && (
            <SearchableModal
              label="SUPLEMENTO"
              value={suplemento}
              onChange={setSuplemento}
              options={getSuplementoOptions()}
              placeholder="Buscar suplemento..."
              id="suplemento"
              name="suplemento"
            />
          )}
        </div>

        {/* Seção 3: Leitura e Quantidade */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. LEITURA E QUANTIDADE <span className="text-red-500">*</span></h2>
          <button
            onClick={() => setShowPdfModal(true)}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors"
          >
            <span className="text-xl">📄</span>
            <span>POP LEITURA DE COCHO</span>
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
          <Input
            label="Total Suplementado no Cocho (kg)"
            placeholder="0"
            value={form.kgCocho}
            onChange={setInput('kgCocho')}
            inputMode="decimal"
            type="number"
            min="0"
          />
          {possuiDeposito && (
            <Input
              label="Total Suplementado no Depósito (kg)"
              placeholder="0"
              value={kgDeposito}
              onChange={(e) => setKgDeposito(e.target.value)}
              inputMode="decimal"
              type="number"
              min="0"
            />
          )}
          <button
            onClick={() => setShowFezesModal(true)}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors"
          >
            <span className="text-xl">📄</span>
            <span>POP FEZES</span>
          </button>
          <Radio
            name="escoreFezes"
            label="ESCORE DE FEZES (1 a 5)"
            options={ESCALA_5}
            value={form.escoreFezes}
            onChange={set('escoreFezes')}
            error={getError('escoreFezes')}
            gridCols={5}
          />
        </div>

        {/* Seção 4: Checklist */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. CHECKLIST <span className="text-red-500">*</span></h2>
          
          {/* Espaçamento do cocho - display calculado */}
          {espacamentoCochoDetalhes && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h3 className="text-base font-bold text-gray-900 mb-3">ESPAÇAMENTO DO COCHO</h3>
              {espacamentoCochoDetalhes.erro ? (
                <div className="text-base text-red-600 font-medium">
                  {espacamentoCochoDetalhes.erro}
                </div>
              ) : (
                <div className="space-y-2 text-base">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Espaçamento calculado:</span>
                    <span className="font-semibold text-gray-900">{espacamentoCochoDetalhes.espacamento_calculado_m_cab?.toFixed(2)} m/cab</span>
                  </div>
                  {espacamentoCochoDetalhes.espacamento_ideal_m_cab && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Espaçamento ideal:</span>
                        <span className="font-semibold text-gray-900">{espacamentoCochoDetalhes.espacamento_ideal_m_cab?.toFixed(2)} m/cab</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Desvio:</span>
                        <span className={`font-semibold ${espacamentoCochoDetalhes.desvio_percentual < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {espacamentoCochoDetalhes.desvio_percentual?.toFixed(1)}%
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex flex-col gap-1 text-sm text-gray-500 pt-2 border-t border-gray-200">
                    <span>Metragem cocho: {espacamentoCochoDetalhes.metragem_cocho_m}m</span>
                    <span>Cabeças adultas: {espacamentoCochoDetalhes.cabecas_adultas}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {CHECKLIST_PERGUNTAS
            .filter(({ campo }) => 
              (campo !== 'estoqueDepositio' && campo !== 'depositoCondicoes') || possuiDeposito
            )
            .map(({ campo, label }) => (
            <div key={campo}>
              <Radio
                name={campo}
                label={label}
                options={SN_OPTIONS}
                value={(form as any)[campo]}
                onChange={set(campo as keyof FormState)}
                error={getError(campo)}
                gridCols={2}
              />
              {(form as any)[campo] === 'Não' && (
                <Input
                  placeholder="Adicionar observação (opcional)"
                  value={(form as any)[`${campo}Obs`] || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, [`${campo}Obs`]: e.target.value }))}
                  className="mt-2"
                />
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾" disabled={!isValid}>
            SALVAR
          </Button>
          <Button onClick={() => setForm(makeInitial())} variant="secondary" icon="🧹" fullWidth>
            LIMPAR
          </Button>
        </div>
        {!isValid && (
          <p className="text-base text-gray-600 text-center">
            <span className="text-red-500">*</span> Preencha todos os campos obrigatórios para salvar
          </p>
        )}
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

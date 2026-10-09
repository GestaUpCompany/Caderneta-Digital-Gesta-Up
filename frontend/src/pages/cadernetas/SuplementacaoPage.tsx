import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, ValidationMessage, SearchableModal } from '../../components/ui'
import { Beef, FileText } from 'lucide-react'
import SuccessModal from '../../components/SuccessModal'
import { calcularPeriodoTrato } from '../../utils/shareUtils'
import PdfModal from '../../components/PdfModal'
import { salvarRegistro, listarRegistros } from '../../services/api'
import { getRegistrosSuplementacaoByLote } from '../../services/supabaseService'
import { getFarmTimezoneAsync } from '../../services/checklistRegrasService'
import { redeInstavelRecentemente, registrarRespostaDeRede } from '../../utils/fetchComTimeout'
import { todayBR, brToIso, getDateTimePartsInTimezone, DEFAULT_FARM_TIMEZONE } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import FormFooter from '../../components/cadernetas/FormFooter'
import InfoCard, { InfoCardStatus } from '../../components/cadernetas/InfoCard'
import HistoricoSuplementacaoModal from '../../components/cadernetas/HistoricoSuplementacaoModal'
import BannerRascunho from '../../components/BannerRascunho'
import {
  getPastoByNomeCached,
  getPastoByNomeFromCacheOnly,
  getLoteByNomeCached,
  getLoteByNomeFromCacheOnly,
  getLoteDetalhesComCategoriasCached,
  getLoteDetalhesFromCacheOnly,
  getFormulacaoByNomeCached,
  getFormulacaoByNomeFromCacheOnly,
  getFormulacaoByIdCached,
  getFormulacaoByIdFromCacheOnly,
  getRegistrosSuplementacaoByLoteCached,
  getPlanoNutricionalAtivoByLoteIdCached,
  getPlanoNutricionalAtivoFromCacheOnly,
  getPlanoNutricionalAtivoStatus,
  getNotasLeituraCochoConfigCached,
  getLotesAtivosCached,
  getCachedCadastroData,
  withTimeout,
} from '../../services/cadastroCache'
import {
  calcularMetricasSuplementacao,
  calcularIntervalosTratos,
  calcularMediaPorDiasCobertos,
  dataSemHoraUTC,
} from '../../utils/supplementMetrics'
import { calcularPesoProjetado } from '../../utils/pesoProjetado'
import { isCategoriaAoPe, processarCategorias, capitalizarCategoria } from '../../utils/categorias'
import { scrollToFirstError } from '../../utils/scrollToError'
import { useFormValidation } from '../../hooks/useFormValidation'
import { useChecklistAtivo } from '../../hooks/useChecklistAtivo'
import { useSalvarRegistro } from '../../hooks/useSalvarRegistro'
import { useExecucaoRotina } from '../../hooks/useExecucaoRotina'
import { usePhotoGps } from '../../hooks/usePhotoGps'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import ObservacaoAtrasoModal from '../../components/ObservacaoAtrasoModal'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { base64ToDataUrl } from '../../utils/photoCompress'

const BASE = import.meta.env.BASE_URL

// Leitura do cocho (-1 a 3): descricao padrao por nota. Quando a fazenda
// configura notas proprias, a descricao aparece na faixa de KG previsto.
const LEITURA_OPTIONS = [
  { value: '-1', numero: '-1', label: 'Lambido', dot: 'bg-red-500', selecionado: 'bg-red-50 border-red-500 text-red-800' },
  { value: '0', numero: '0', label: 'Limpo', dot: 'bg-amber-400', selecionado: 'bg-amber-50 border-amber-400 text-amber-900' },
  { value: '1', numero: '1', label: 'Ideal', dot: 'bg-green-500', selecionado: 'bg-green-50 border-green-500 text-green-800' },
  { value: '2', numero: '2', label: 'Sobra', dot: 'bg-amber-400', selecionado: 'bg-amber-50 border-amber-400 text-amber-900' },
  { value: '3', numero: '3', label: 'Muita sobra', dot: 'bg-red-500', selecionado: 'bg-red-50 border-red-500 text-red-800' },
]

const FEZES_OPTIONS = [
  { value: '1', numero: '1', label: 'Líquida', dot: 'bg-red-500', selecionado: 'bg-red-50 border-red-500 text-red-800' },
  { value: '2', numero: '2', label: 'Mole', dot: 'bg-amber-400', selecionado: 'bg-amber-50 border-amber-400 text-amber-900' },
  { value: '3', numero: '3', label: 'Ideal', dot: 'bg-green-500', selecionado: 'bg-green-50 border-green-500 text-green-800' },
  { value: '4', numero: '4', label: 'Firme', dot: 'bg-amber-400', selecionado: 'bg-amber-50 border-amber-400 text-amber-900' },
  { value: '5', numero: '5', label: 'Seca', dot: 'bg-red-500', selecionado: 'bg-red-50 border-red-500 text-red-800' },
]

// Checklist vira lista de problemas: clicar marca "o problema existe".
// O payload mantem as chaves positivas (espacamento_cocho_adequado etc.):
// valor=true significa "condicao adequada". Mesmo modelo dos bebedouros.
const CHECKLIST_PROBLEMAS = [
  { campo: 'espacamentoCochoAdequado', checklistKey: 'espacamento_cocho_adequado', label: 'ESPAÇAMENTO DO COCHO INADEQUADO', aviso: 'Espaçamento inadequado: mostre e conte' },
  { campo: 'cochosCondicoes', checklistKey: 'cochos_condicoes', label: 'COCHO EM MÁS CONDIÇÕES', aviso: 'Cocho com problema: mostre e conte' },
  { campo: 'aterroAcessoIdeal', checklistKey: 'aterro_acesso_ideal', label: 'ATERRO/ACESSO INADEQUADO', aviso: 'Acesso inadequado: mostre e conte' },
  { campo: 'depositoCondicoes', checklistKey: 'deposito_condicoes', label: 'DEPÓSITO EM MÁS CONDIÇÕES', aviso: 'Depósito com problema: mostre e conte' },
] as const

type CampoChecklist = typeof CHECKLIST_PROBLEMAS[number]['campo']

interface FormState {
  data: string
  pasto: string
  numeroLote: string
  loteId: string
  pastoId: string
  formulacao: string
  leitura: string
  kgCocho: string
  kgDeposito: string
  fotoCocho: string
  escoreFezes: string
  // Creep feeding: campos do bezerro(a) ao pé (exibidos quando o lote tem a categoria)
  creepLeitura: string
  creepKgCocho: string
  // Checklist: itens negativos ('' = adequado, 'Não' = problema marcado)
  // mais a pergunta de acao "limpeza de cocho foi realizada?" (Sim/Não)
  limpezaCocho: string
  limpezaCochoObs: string
  espacamentoCochoAdequado: string
  espacamentoCochoAdequadoObs: string
  espacamentoCochoAdequadoFoto: string
  cochosCondicoes: string
  cochosCondicoesObs: string
  cochosCondicoesFoto: string
  aterroAcessoIdeal: string
  aterroAcessoIdealObs: string
  aterroAcessoIdealFoto: string
  depositoCondicoes: string
  depositoCondicoesObs: string
  depositoCondicoesFoto: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  pasto: '',
  numeroLote: '',
  loteId: '',
  pastoId: '',
  formulacao: '',
  leitura: '',
  kgCocho: '',
  kgDeposito: '',
  fotoCocho: '',
  escoreFezes: '',
  creepLeitura: '',
  creepKgCocho: '',
  limpezaCocho: '',
  limpezaCochoObs: '',
  espacamentoCochoAdequado: '',
  espacamentoCochoAdequadoObs: '',
  espacamentoCochoAdequadoFoto: '',
  cochosCondicoes: '',
  cochosCondicoesObs: '',
  cochosCondicoesFoto: '',
  aterroAcessoIdeal: '',
  aterroAcessoIdealObs: '',
  aterroAcessoIdealFoto: '',
  depositoCondicoes: '',
  depositoCondicoesObs: '',
  depositoCondicoesFoto: '',
})

export default function SuplementacaoPage() {
  const navigate = useNavigate()
  const { usuario, fazendaId, travaSuplementacao } = useSelector((state: RootState) => state.config)
  const { ativo: checklistAtivo, loading: loadingChecklistRegras } = useChecklistAtivo('suplementacao')
  const { garantirExecucao } = useExecucaoRotina()
  const {
    salvando,
    salvar,
    showObservacaoModal,
    horariosModal,
    onConfirmarObservacao,
    onCancelarObservacao,
  } = useSalvarRegistro('suplementacao')
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: `suplementacao:${fazendaId || 'sem-fazenda'}`, makeInitial })

  useEffect(() => {
    garantirExecucao('suplementacao')
  }, [garantirExecucao])

  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showFezesModal, setShowFezesModal] = useState(false)
  const [showHistoricoModal, setShowHistoricoModal] = useState(false)
  const [semPlanoAtivo, setSemPlanoAtivo] = useState<boolean>(false)
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [lotesPastoMap, setLotesPastoMap] = useState<Record<string, string>>({})
  const [detalhesLote, setDetalhesLote] = useState<any>(null)
  const [loteSemPasto, setLoteSemPasto] = useState<boolean>(false)
  const [loteNaoEncontrado, setLoteNaoEncontrado] = useState<boolean>(false)
  // Salvar antes dos dados chegarem gravaria registro incompleto (sem loteId, plano, pasto ou formulação):
  // cada leitura abaixo bloqueia o SALVAR enquanto não resolve.
  const [carregandoLote, setCarregandoLote] = useState(false)
  const [carregandoPlano, setCarregandoPlano] = useState(false)
  const [planoIndisponivel, setPlanoIndisponivel] = useState(false)
  const [carregandoPasto, setCarregandoPasto] = useState(false)
  const [pastoIndisponivel, setPastoIndisponivel] = useState(false)
  const [lotesCarregados, setLotesCarregados] = useState(false)
  // Incrementa quando a internet volta com dados do lote indisponíveis: refaz a leitura sozinho
  const [recarga, setRecarga] = useState(0)
  const dadosIndisponiveisRef = useRef(false)
  const lotesPastoMapRef = useRef<Record<string, string>>({})
  const [possuiDeposito, setPossuiDeposito] = useState<boolean>(false)
  const [dadosPasto, setDadosPasto] = useState<any>(null)
  const [espacamentoCochoDetalhes, setEspacamentoCochoDetalhes] = useState<any>(null)
  const [formulacaoDetalhes, setFormulacaoDetalhes] = useState<{ id: string | null; nome: string; teorMs: number | null; metaConsumo: number | null; custoDietaReaisCabDia: number | null; custoMnTonelada: number | null; formaFornecimento: string | null; kgPorSaco: number | null } | null>(null)
  const [registrosSuplementacao, setRegistrosSuplementacao] = useState<any[]>([])
  const [metricasSuplementacao, setMetricasSuplementacao] = useState<any>(null)
  const [notasConfig, setNotasConfig] = useState<any[]>([])
  const [creepFormulacaoDetalhes, setCreepFormulacaoDetalhes] = useState<{ id: string | null; nome: string; teorMs: number | null; metaConsumo: number | null; custoDietaReaisCabDia: number | null; custoMnTonelada: number | null; formaFornecimento: string | null; kgPorSaco: number | null } | null>(null)
  const [creepFormulacaoCarregada, setCreepFormulacaoCarregada] = useState(false)
  const [formulacaoCarregada, setFormulacaoCarregada] = useState(true)
  const [campoFotoAtual, setCampoFotoAtual] = useState<string | null>(null)
  const [campoVozAtual, setCampoVozAtual] = useState<string | null>(null)
  const baseVozRef = useRef('')

  const {
    capturandoFoto,
    fotoErro,
    capturarFoto,
    fotoInputRef,
    handleFileInputChange,
  } = usePhotoGps({ comGps: false })

  const {
    ouvindo: ouvindoVoz,
    erro: vozErro,
    toggle: toggleVoz,
    parar: pararVoz,
  } = useVoiceInput()

  // Categorias de bezerro(a) ao pé do lote selecionado (creep feeding)
  const categoriasAoPe = useMemo(() => {
    const raw = detalhesLote?.categorias_raw || []
    return raw.filter((c: any) => isCategoriaAoPe(c.categoria) && (c.quant_atual || 0) > 0)
  }, [detalhesLote])
  // Creep só aparece quando há dieta creep vinculada a uma categoria ao pé
  // (lote_categorias.formulacao_id → formulação e_creep). Animal ao pé sem
  // dieta não deve exibir nada de creep na tela.
  const temCreepDisponivel = categoriasAoPe.some((c: any) => c.formulacao_id)
  const creepNCabecas = categoriasAoPe.reduce((s: number, c: any) => s + (c.quant_atual || 0), 0)
  const creepCategoriasStr = categoriasAoPe.map((c: any) => c.categoria).join(', ')
  const creepPesoVivoKg = useMemo(() => {
    let pesoTotal = 0
    let quantTotal = 0
    categoriasAoPe.forEach((c: any) => {
      if (c.quant_atual && c.peso_vivo_atual_kg_cab) {
        pesoTotal += c.peso_vivo_atual_kg_cab * c.quant_atual
        quantTotal += c.quant_atual
      }
    })
    return quantTotal > 0 ? pesoTotal / quantTotal : null
  }, [categoriasAoPe])

  // Buscar detalhes da formulação quando selecionada (cache primeiro; falha não derruba o restante)
  useEffect(() => {
    let cancelado = false
    setFormulacaoDetalhes(null)
    setFormulacaoCarregada(!form.formulacao)
    if (!form.formulacao || !fazendaId) return

    const aplicarFormulacao = (formulacao: any) =>
      setFormulacaoDetalhes({
        id: formulacao.id ?? null,
        nome: formulacao.nome,
        teorMs: formulacao.teor_ms_dieta ?? null,
        metaConsumo: formulacao.consumo_ms_percent_pv ?? null,
        custoDietaReaisCabDia: formulacao.custo_dieta_reais_cab_dia ?? null,
        custoMnTonelada: formulacao.custo_mn_tonelada ?? null,
        formaFornecimento: formulacao.forma_fornecimento ?? 'granel',
        kgPorSaco: formulacao.kg_por_saco != null ? Number(formulacao.kg_por_saco) : null,
      })

    async function carregarDetalhesFormulacao() {
      try {
        // Cache primeiro: libera o formulário na hora; a revalidação online roda depois
        const cache = await getFormulacaoByNomeFromCacheOnly(fazendaId!, form.formulacao)
        if (cancelado) return
        if (cache) {
          aplicarFormulacao(cache)
          setFormulacaoCarregada(true)
        }
        const formulacao = await getFormulacaoByNomeCached(fazendaId!, form.formulacao)
        if (cancelado) return
        if (formulacao) aplicarFormulacao(formulacao)
      } catch (error) {
        if (cancelado) return
        console.error('Erro ao carregar detalhes da formulação:', error)
      } finally {
        if (!cancelado) setFormulacaoCarregada(true)
      }
    }
    carregarDetalhesFormulacao()
    return () => {
      cancelado = true
    }
  }, [form.formulacao, fazendaId])

  // Buscar formulação creep vinculada à categoria bezerro(a) ao pé do lote.
  // A dieta creep mora em lote_categorias.formulacao_id (independente do plano do lote).
  useEffect(() => {
    let cancelado = false
    async function carregarFormulacaoCreep() {
      if (!temCreepDisponivel || !fazendaId) {
        setCreepFormulacaoDetalhes(null)
        setCreepFormulacaoCarregada(false)
        return
      }
      setCreepFormulacaoCarregada(false)
      const catComCreep = [...categoriasAoPe]
        .sort((a: any, b: any) => (b.quant_atual || 0) - (a.quant_atual || 0))
        .find((c: any) => c.formulacao_id)
      const formId = catComCreep?.formulacao_id
      if (!formId) {
        setCreepFormulacaoDetalhes(null)
        setCreepFormulacaoCarregada(true)
        return
      }
      const aplicar = (formulacao: any) => {
        if (formulacao && formulacao.e_creep) {
          setCreepFormulacaoDetalhes({
            id: formulacao.id ?? null,
            nome: formulacao.nome,
            teorMs: formulacao.teor_ms_dieta ?? null,
            metaConsumo: formulacao.consumo_ms_percent_pv ?? null,
            custoDietaReaisCabDia: formulacao.custo_dieta_reais_cab_dia ?? null,
            custoMnTonelada: formulacao.custo_mn_tonelada ?? null,
            formaFornecimento: formulacao.forma_fornecimento ?? 'granel',
            kgPorSaco: formulacao.kg_por_saco != null ? Number(formulacao.kg_por_saco) : null,
          })
          return true
        }
        return false
      }
      try {
        // Cache primeiro (libera na hora); depois revalida online
        const cache = await getFormulacaoByIdFromCacheOnly(fazendaId, formId)
        if (cancelado) return
        if (cache && aplicar(cache)) setCreepFormulacaoCarregada(true)
        else setCreepFormulacaoDetalhes(null)
        const formulacao = await getFormulacaoByIdCached(fazendaId, formId)
        if (cancelado) return
        if (formulacao) {
          if (!aplicar(formulacao)) setCreepFormulacaoDetalhes(null)
        }
      } catch (error) {
        if (cancelado) return
        console.error('Erro ao carregar formulação creep:', error)
      }
      if (cancelado) return
      setCreepFormulacaoCarregada(true)
    }
    carregarFormulacaoCreep()
    return () => {
      cancelado = true
    }
  }, [categoriasAoPe, fazendaId, temCreepDisponivel])

  lotesPastoMapRef.current = lotesPastoMap

  // Lotes: cache local primeiro (a lista aparece na hora, mesmo com rede ruim), depois revalida
  // no Supabase com timeout sem apagar o que já está na tela.
  useEffect(() => {
    if (!fazendaId) return
    let cancelado = false
    const loadData = async () => {
      try {
        const cache = await getCachedCadastroData()
        if (cancelado) return
        if (cache?.lotes?.length) {
          setLotesDisponiveis(cache.lotes)
          setLotesPastoMap(cache.lotesPastoMap || {})
        }
        try {
          const { lotes, lotesPastoMap: mapa } = await withTimeout(getLotesAtivosCached(fazendaId), 3000)
          if (cancelado) return
          setLotesDisponiveis(lotes)
          setLotesPastoMap(mapa)
        } catch (error) {
          console.warn('[SuplementacaoPage] Lotes online indisponíveis, mantendo o cache local:', error)
        }
      } catch (error) {
        console.error('[SuplementacaoPage] Erro ao carregar lotes:', error)
      } finally {
        if (!cancelado) setLotesCarregados(true)
      }
    }
    loadData()
    return () => {
      cancelado = true
    }
  }, [fazendaId])

  // Escutar atualizações do cache de cadastro
  useEffect(() => {
    const unsubscribe = eventBus.on(CADASTRO_CACHE_UPDATED, (data: any) => {
      // Só aplica o que veio no evento: um payload parcial não pode zerar a lista da tela.
      if (data && Array.isArray(data.lotes)) {
        setLotesDisponiveis(data.lotes)
        setLotesPastoMap(data.lotesPastoMap || {})
      }
    })

    return unsubscribe
  }, [])

  // Detalhes do lote e pasto derivado. Cache local primeiro (libera o formulário na hora, mesmo com
  // rede travada ou aparelho offline) e revalidação online em segundo plano.
  useEffect(() => {
    let cancelado = false

    // Sempre começa limpo: nada do lote anterior pode vazar para o registro (loteId, pasto, categorias).
    setDetalhesLote(null)
    setLoteSemPasto(false)
    setLoteNaoEncontrado(false)
    setForm((prev) => (prev.loteId || prev.pastoId || prev.pasto ? { ...prev, pasto: '', pastoId: '', loteId: '' } : prev))

    const nomeLote = form.numeroLote
    if (!nomeLote || !fazendaId) {
      setCarregandoLote(false)
      return
    }
    setCarregandoLote(true)

    const aplicarLote = (lote: any, det: any) => {
      setLoteNaoEncontrado(false)
      const pastoNome = lote.pastos?.nome || lotesPastoMapRef.current[nomeLote] || ''
      setLoteSemPasto(!lote.pasto_id)
      setForm((prev) => ({ ...prev, pasto: pastoNome, pastoId: lote.pasto_id || '', loteId: lote.id }))
      setDetalhesLote({
        ...lote,
        categorias: det.categorias,
        n_cabecas: det.quant_atual,
        peso_vivo_kg: det.peso_vivo_kg,
        qtd_bezerros: det.qtd_bezerros,
        categorias_raw: det.categorias_raw,
      })
    }

    async function carregarDetalhesLoteEPasto() {
      try {
        // 1) Cache local: instantâneo
        const loteCache = await getLoteByNomeFromCacheOnly(fazendaId!, nomeLote)
        const detCache = loteCache ? await getLoteDetalhesFromCacheOnly(loteCache.id) : null
        if (cancelado) return
        let resolvido = false
        if (loteCache && detCache) {
          aplicarLote(loteCache, detCache)
          setCarregandoLote(false)
          resolvido = true
        }

        // 2) Online: com cache só revalida (leituras em paralelo); sem cache é o único caminho
        try {
          if (resolvido) {
            const [loteOn, detOn] = await Promise.all([
              getLoteByNomeCached(fazendaId!, nomeLote),
              getLoteDetalhesComCategoriasCached(loteCache.id),
            ])
            if (cancelado) return
            if (loteOn && detOn) aplicarLote(loteOn, detOn)
          } else {
            const loteOn = await getLoteByNomeCached(fazendaId!, nomeLote)
            if (cancelado) return
            const detOn = loteOn ? await getLoteDetalhesComCategoriasCached(loteOn.id) : null
            if (cancelado) return
            if (loteOn && detOn) {
              aplicarLote(loteOn, detOn)
              resolvido = true
            }
          }
        } catch (error) {
          console.warn('[SuplementacaoPage] Revalidação do lote falhou, usando o que está no aparelho:', error)
        }
        if (cancelado) return
        setCarregandoLote(false)
        // Sem cache e sem rede (ou lote removido): o SALVAR fica bloqueado com a mensagem do lote
        if (!resolvido) setLoteNaoEncontrado(true)
      } catch (error) {
        if (cancelado) return
        console.error('Erro ao carregar detalhes do lote:', error)
        setCarregandoLote(false)
        setLoteNaoEncontrado(true)
      }
    }

    carregarDetalhesLoteEPasto()
    return () => {
      cancelado = true
    }
  }, [form.numeroLote, fazendaId, recarga])

  // Plano nutricional ativo do lote (define a formulação). Cache primeiro e revalidação com timeout.
  // Falha de rede sem cache NÃO é "sem plano": vira "plano indisponível neste aparelho".
  useEffect(() => {
    let cancelado = false
    setSemPlanoAtivo(false)
    setPlanoIndisponivel(false)

    if (!form.loteId) {
      setCarregandoPlano(false)
      setForm((prev) => (prev.formulacao ? { ...prev, formulacao: '' } : prev))
      return
    }
    setCarregandoPlano(true)
    const loteId = form.loteId

    const aplicarPlano = (plano: any) => {
      if (plano && plano.formulacaoNome) {
        setSemPlanoAtivo(false)
        setForm((prev) => ({ ...prev, formulacao: plano.formulacaoNome }))
      } else {
        setSemPlanoAtivo(true)
        setForm((prev) => ({ ...prev, formulacao: '' }))
      }
    }

    async function carregarFormulacaoDoPlanoAtivo() {
      try {
        const cache = await getPlanoNutricionalAtivoFromCacheOnly(loteId)
        if (cancelado) return
        const temCache = !!cache?.formulacaoNome
        if (temCache) {
          aplicarPlano(cache)
          setCarregandoPlano(false)
        }
        const { plano, confiavel } = await getPlanoNutricionalAtivoStatus(loteId)
        if (cancelado) return
        if (confiavel) aplicarPlano(plano)
        else if (!temCache) {
          setPlanoIndisponivel(true)
          setForm((prev) => ({ ...prev, formulacao: '' }))
        }
      } catch (error) {
        if (cancelado) return
        console.error('Erro ao carregar formulação do plano ativo:', error)
        setPlanoIndisponivel(true)
        setForm((prev) => ({ ...prev, formulacao: '' }))
      } finally {
        if (!cancelado) setCarregandoPlano(false)
      }
    }

    carregarFormulacaoDoPlanoAtivo()
    return () => {
      cancelado = true
    }
  }, [form.loteId])

  // Dados do pasto (possui_deposito define se o KG do depósito é obrigatório). Sem eles o registro
  // sairia sem o depósito, então o SALVAR fica bloqueado enquanto não resolve.
  useEffect(() => {
    let cancelado = false
    setPastoIndisponivel(false)

    if (!form.pasto || !fazendaId) {
      setCarregandoPasto(false)
      setPossuiDeposito(false)
      setDadosPasto(null)
      return
    }
    setCarregandoPasto(true)
    const nomePasto = form.pasto

    const aplicarPasto = (pasto: any) => {
      setPossuiDeposito(pasto.possui_deposito || false)
      setDadosPasto(pasto)
    }

    async function carregarDadosPasto() {
      try {
        const cache = await getPastoByNomeFromCacheOnly(fazendaId!, nomePasto)
        if (cancelado) return
        if (cache) {
          aplicarPasto(cache)
          setCarregandoPasto(false)
        } else {
          setPossuiDeposito(false)
          setDadosPasto(null)
        }
        const pasto = await getPastoByNomeCached(fazendaId!, nomePasto)
        if (cancelado) return
        if (pasto) aplicarPasto(pasto)
        else if (!cache) setPastoIndisponivel(true)
      } catch (error) {
        if (cancelado) return
        console.error('Erro ao carregar dados do pasto:', error)
        setPastoIndisponivel(true)
      } finally {
        if (!cancelado) setCarregandoPasto(false)
      }
    }

    carregarDadosPasto()
    return () => {
      cancelado = true
    }
  }, [form.pasto, fazendaId])

  // Calcular espacamento do cocho quando dados mudarem
  useEffect(() => {
    async function calcularEspacamentoCocho() {
      if (!dadosPasto || !detalhesLote || !form.formulacao || !fazendaId) {
        setEspacamentoCochoDetalhes(null)
        return
      }

      try {
        const metragemCochoM = dadosPasto.metragem_cocho_m
        if (!metragemCochoM) {
          setEspacamentoCochoDetalhes(null)
          return
        }

        // Filtrar categorias adultas (excluir bezerro ao pé, garrote, novilha)
        const categoriasExcluidas = ['bezerro', 'garrote', 'novilha']
        const categoriasRaw = detalhesLote.categorias_raw || []
        const categoriasAdultas = categoriasRaw.filter(
          (cat: any) => !categoriasExcluidas.includes(cat.categoria.toLowerCase()) && !isCategoriaAoPe(cat.categoria)
        )

        const cabecasAdultas = categoriasAdultas.reduce((sum: number, cat: any) => sum + (cat.quant_atual || 0), 0)

        if (cabecasAdultas <= 0) {
          setEspacamentoCochoDetalhes({
            erro: 'Não é possível calcular: não há gado adulto no lote'
          })
          return
        }

        const espacamentoCalculado = metragemCochoM / cabecasAdultas

        setEspacamentoCochoDetalhes({
          espacamento_calculado_m_cab: espacamentoCalculado,
          espacamento_ideal_m_cab: null,
          desvio_percentual: null,
          metragem_cocho_m: metragemCochoM,
          cabecas_adultas: cabecasAdultas
        })
      } catch (error) {
        console.error('Erro ao calcular espacamento do cocho:', error)
        setEspacamentoCochoDetalhes(null)
      }
    }

    calcularEspacamentoCocho()
  }, [dadosPasto, detalhesLote, form.formulacao, fazendaId])

  // Carregar registros de suplementação e calcular métricas quando lote é selecionado
  useEffect(() => {
    async function carregarRegistrosSuplementacao() {
      if (!form.loteId || !fazendaId) {
        setRegistrosSuplementacao([])
        return
      }

      try {
        const registros = await getRegistrosSuplementacaoByLoteCached(fazendaId, form.loteId)
        setRegistrosSuplementacao(registros || [])
      } catch (error) {
        console.error('Erro ao carregar registros de suplementação:', error)
        setRegistrosSuplementacao([])
      }
    }

    carregarRegistrosSuplementacao()
  }, [form.loteId, fazendaId])

  // Carregar configuração de notas de leitura de cocho da fazenda
  useEffect(() => {
    async function carregarNotasConfig() {
      if (!fazendaId) {
        setNotasConfig([])
        return
      }
      try {
        const notas = await getNotasLeituraCochoConfigCached(fazendaId)
        setNotasConfig(notas || [])
      } catch (error) {
        console.error('Erro ao carregar config de notas de leitura de cocho:', error)
        setNotasConfig([])
      }
    }
    carregarNotasConfig()
  }, [fazendaId])

  // Calcular métricas de suplementação quando dados mudarem
  // Série adulta (escopo 'lote'): exclui registros creep e categorias ao pé,
  // que são suplementadas à parte.
  useEffect(() => {
    if (!detalhesLote || !registrosSuplementacao || !formulacaoDetalhes) {
      setMetricasSuplementacao(null)
      return
    }

    try {
      const categorias = (detalhesLote.categorias_raw || [])
        .filter((c: any) => !isCategoriaAoPe(c.categoria))
      const registrosAdulto = registrosSuplementacao.filter(
        (r: any) => (r.escopo || 'lote') !== 'creep'
      )
      const formulacao = {
        nome: formulacaoDetalhes.nome,
        teor_ms_dieta: formulacaoDetalhes.teorMs,
        meta_consumo_ms_percent_pv: formulacaoDetalhes.metaConsumo,
        custo_dieta_reais_cab_dia: formulacaoDetalhes.custoDietaReaisCabDia,
        custo_mn_tonelada: formulacaoDetalhes.custoMnTonelada,
        consumo_mn_kg_cab_dia: null,
        consumo_ms_kg_cab_dia: null,
        custo_ms_tonelada: null
      }

      const metricas = calcularMetricasSuplementacao(categorias, registrosAdulto, formulacao)
      setMetricasSuplementacao(metricas)
    } catch (error) {
      console.error('Erro ao calcular métricas de suplementação:', error)
      setMetricasSuplementacao(null)
    }
  }, [detalhesLote, registrosSuplementacao, formulacaoDetalhes])

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const toggleProblema = (campo: CampoChecklist) =>
    setForm((prev) => ({ ...prev, [campo]: prev[campo] === 'Não' ? '' : 'Não' }))

  // Foto: 'fotoCocho' (evidencia da leitura) ou item do checklist.
  const campoFotoDestino = (campo: string) =>
    campo === 'fotoCocho' ? 'fotoCocho' : `${campo}Foto`

  const handleTirarFotoItem = async (campo: string) => {
    setCampoFotoAtual(campo)
    const base64 = await capturarFoto()
    // Nativo retorna a foto aqui; no web o retorno vem pelo input file hidden
    if (base64) {
      setForm((prev) => ({ ...prev, [campoFotoDestino(campo)]: base64 }))
    }
  }

  const handleFotoInputItem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const result = await handleFileInputChange(e)
    if (result?.fotoBase64 && campoFotoAtual) {
      setForm((prev) => ({ ...prev, [campoFotoDestino(campoFotoAtual)]: result.fotoBase64 }))
    }
  }

  const removerFotoItem = (campo: string) =>
    setForm((prev) => ({ ...prev, [campoFotoDestino(campo)]: '' }))

  // Ditado para a observacao do item: o texto parcial e acrescentado ao que
  // ja existia quando a gravacao comecou (da para falar mais de uma vez).
  const handleFalarItem = async (campo: string) => {
    if (ouvindoVoz) {
      await pararVoz()
      if (campoVozAtual === campo) return
    }
    setCampoVozAtual(campo)
    baseVozRef.current = (((form as any)[`${campo}Obs`]) || '').trim()
    await toggleVoz((parcial) => {
      setForm((prev) => ({
        ...prev,
        [`${campo}Obs`]: baseVozRef.current ? `${baseVozRef.current} ${parcial}` : parcial,
      }))
    })
  }

  // Calcular kg previsto com base no último kg_cocho do lote + percentual da nota selecionada
  // Série adulta apenas: registros creep têm cocho/formulação próprios
  const kgPrevisto = useMemo(() => {
    const registrosAdulto = registrosSuplementacao.filter((r: any) => (r.escopo || 'lote') !== 'creep')
    if (!form.leitura || registrosAdulto.length === 0 || notasConfig.length === 0) return null
    const ultimoRegistro = registrosAdulto[0]
    const ultimoKgCocho = Number(ultimoRegistro?.kg_cocho)
    if (!ultimoKgCocho || isNaN(ultimoKgCocho) || ultimoKgCocho <= 0) return null
    const notaConfig = notasConfig.find((n: any) => Number(n.nota) === Number(form.leitura))
    if (!notaConfig) return null
    const percentual = Number(notaConfig.percentual_ajuste)
    if (isNaN(percentual)) return null
    const previsto = ultimoKgCocho * (1 + percentual / 100)
    return Math.round(previsto * 100) / 100
  }, [form.leitura, registrosSuplementacao, notasConfig])

  // Formulação em sacaria: o input passa a ser nº de sacos e converte para kg no save
  const kgPorSaco = formulacaoDetalhes?.kgPorSaco ?? null
  const isSacaria = formulacaoDetalhes?.formaFornecimento === 'sacaria' && kgPorSaco !== null && kgPorSaco > 0
  const kgCochoConvertido = useMemo(() => {
    const sacos = Number(form.kgCocho)
    if (!isSacaria || !kgPorSaco || !sacos || sacos <= 0) return null
    return sacos * kgPorSaco
  }, [isSacaria, kgPorSaco, form.kgCocho])

  // Grupos da suplementação: adulto (escopo 'lote') e creep (escopo 'creep').
  // Sem toggles: um grupo fica ativo quando o usuário preenche qualquer campo da sua seção.
  const adultoPreenchido = (form.kgCocho !== '' && Number(form.kgCocho) > 0) || form.leitura !== ''
  const creepPreenchido = (form.creepKgCocho !== '' && Number(form.creepKgCocho) > 0) || form.creepLeitura !== ''
  const adultoAtivo = !temCreepDisponivel || adultoPreenchido
  const creepAtivo = temCreepDisponivel && creepPreenchido

  // Formulação creep em sacaria (mesmo padrão da formulação do lote)
  const kgDepositoConvertido = useMemo(() => {
    const sacos = Number(form.kgDeposito)
    if (!isSacaria || !kgPorSaco || !sacos || sacos <= 0) return null
    return sacos * kgPorSaco
  }, [isSacaria, kgPorSaco, form.kgDeposito])
  const kgPorSacoCreep = creepFormulacaoDetalhes?.kgPorSaco ?? null
  const isSacariaCreep = creepFormulacaoDetalhes?.formaFornecimento === 'sacaria' && kgPorSacoCreep !== null && kgPorSacoCreep > 0

  // Cabeças adultas do lote (denominador de consumo por cabeça)
  const cabecasAdultas = useMemo(() => {
    const total = detalhesLote?.n_cabecas ?? 0
    const adultas = total - creepNCabecas
    return adultas > 0 ? adultas : 0
  }, [detalhesLote, creepNCabecas])

  // Consumo do lote: série diária kg MN/cab por intervalo de trato.
  // Intervalo de um trato cobre da data do trato até o próximo trato.
  const intervalosAdulto = useMemo(() => {
    if (!detalhesLote || registrosSuplementacao.length === 0) return []
    const registrosAdulto = registrosSuplementacao.filter(
      (r: any) => (r.escopo || 'lote') !== 'creep'
    )
    return calcularIntervalosTratos(registrosAdulto, cabecasAdultas || 1)
  }, [detalhesLote, registrosSuplementacao, cabecasAdultas])

  // Janela de 7 dias ancorada na data do registro (funciona para trato retroativo)
  const dataReferencia = useMemo(() => dataSemHoraUTC(form.data || todayBR()), [form.data])

  // Intervalo aberto do ultimo trato: calcularIntervalosTratos so gera
  // intervalos fechados entre dois tratos, entao o trato mais recente nunca
  // apareceria na serie. O kg fornecido nele segue em consumo ate o proximo
  // trato; ate la, rateia pelos dias decorridos ate a data do registro.
  const intervalosComAberto = useMemo(() => {
    if (intervalosAdulto.length === 0 && registrosSuplementacao.length === 0) return intervalosAdulto
    const registrosAdulto = registrosSuplementacao.filter(
      (r: any) => (r.escopo || 'lote') !== 'creep'
    )
    const ultimo = [...registrosAdulto].sort(
      (a: any, b: any) => dataSemHoraUTC(b.data).getTime() - dataSemHoraUTC(a.data).getTime()
    )[0]
    if (!ultimo || !ultimo.kg_cocho) return intervalosAdulto

    const inicio = dataSemHoraUTC(ultimo.data)
    if (inicio > dataReferencia) return intervalosAdulto
    const nCab = ultimo.n_cabecas && ultimo.n_cabecas > 0
      ? ultimo.n_cabecas - (ultimo.qtd_bezerros || 0)
      : (cabecasAdultas || 1)
    if (nCab <= 0) return intervalosAdulto

    const dias = Math.max(1, Math.round((dataReferencia.getTime() - inicio.getTime()) / 86400000))
    const fim = new Date(dataReferencia)
    fim.setUTCDate(fim.getUTCDate() + 1)
    const consumoDiarioMN = ultimo.kg_cocho / dias
    return [
      ...intervalosAdulto,
      { inicio, fim, dias, kgCocho: ultimo.kg_cocho, nCabecas: nCab, consumoDiarioMN, consumoDiarioPorAnimal: consumoDiarioMN / nCab },
    ]
  }, [intervalosAdulto, registrosSuplementacao, cabecasAdultas, dataReferencia])
  const serie7Dias = useMemo(() => {
    const dias: { data: Date; kgCab: number | null }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(dataReferencia)
      d.setUTCDate(d.getUTCDate() - i)
      const intervalo = intervalosComAberto.find((int) => d >= int.inicio && d < int.fim)
      dias.push({ data: d, kgCab: intervalo ? intervalo.consumoDiarioPorAnimal : null })
    }
    return dias
  }, [intervalosComAberto, dataReferencia])

  const media7Dias = useMemo(() => {
    const inicio = new Date(dataReferencia)
    inicio.setUTCDate(inicio.getUTCDate() - 6)
    return calcularMediaPorDiasCobertos(intervalosComAberto, inicio, dataReferencia)
  }, [intervalosComAberto, dataReferencia])

  const pesoVivoLote = detalhesLote?.peso_vivo_kg ?? null
  const teorMsLote = formulacaoDetalhes?.teorMs ?? null
  const metaConsumoLote = formulacaoDetalhes?.metaConsumo ?? null

  const media7DiasPctPV =
    media7Dias != null && teorMsLote && pesoVivoLote
      ? (media7Dias * (teorMsLote / 100)) / pesoVivoLote * 100
      : null

  // Meta em kg MN/cab para comparar a série diária (meta do banco é %PV em MS)
  const metaKgCabMN =
    metaConsumoLote && pesoVivoLote && teorMsLote
      ? (metaConsumoLote / 100) * pesoVivoLote / (teorMsLote / 100)
      : null

  const maxKgCabSerie = useMemo(
    () => Math.max(...serie7Dias.map((d) => d.kgCab ?? 0), metaKgCabMN ?? 0),
    [serie7Dias, metaKgCabMN]
  )

  // Historico completo (modal): tratos do lote nos ultimos 30 dias da data do registro
  const registrosHistorico = useMemo(() => {
    const inicio = new Date(dataReferencia)
    inicio.setUTCDate(inicio.getUTCDate() - 30)
    return registrosSuplementacao.filter((r: any) => {
      const d = dataSemHoraUTC(r.data)
      return d >= inicio && d <= dataReferencia
    })
  }, [registrosSuplementacao, dataReferencia])

  // Consumo do registro atual vs meta (faixa de feedback do input de kg)
  const consumoAtual = useMemo(() => {
    const kg = isSacaria ? kgCochoConvertido : (form.kgCocho ? Number(form.kgCocho) : null)
    if (!kg || kg <= 0 || cabecasAdultas <= 0) return null
    const kgCab = kg / cabecasAdultas
    const pctPV = teorMsLote && pesoVivoLote
      ? (kgCab * (teorMsLote / 100)) / pesoVivoLote * 100
      : null
    let status: 'success' | 'warning' | 'neutral' = 'success'
    let statusTexto = 'dentro da meta'
    if (pctPV != null && metaConsumoLote != null) {
      if (pctPV > metaConsumoLote * 1.05) {
        status = 'warning'
        statusTexto = 'acima da meta'
      } else if (pctPV < metaConsumoLote * 0.85) {
        status = 'neutral'
        statusTexto = 'abaixo da meta'
      }
    }
    return { kgCab, pctPV, status, statusTexto }
  }, [form.kgCocho, isSacaria, kgCochoConvertido, cabecasAdultas, teorMsLote, pesoVivoLote, metaConsumoLote])

  // Validation rules (dynamic: skip deposito fields when pasto has no deposito)
  const validationRules = useMemo(() => {
    const base: any = {
      data: { required: true },
      numeroLote: {
        required: true,
        custom: () => {
          if (loteNaoEncontrado) return 'Lote sem dados neste aparelho ou não encontrado nesta fazenda. Conecte à internet e atualize os dados, ou selecione outro lote.'
          if (loteSemPasto) return 'Este lote não possui pasto vinculado. Vincule um pasto ao lote antes de lançar suplementação.'
          return null
        },
      },
      // O serviço exige o pasto: lote sem nome de pasto resolvido neste aparelho não pode ser salvo
      pasto: { required: true },
      formulacao: {
        required: adultoAtivo,
        custom: () => {
          if (adultoAtivo && semPlanoAtivo) return 'Não há plano nutricional ativo para este lote. Vincule um plano no Painel Web antes de lançar suplementação.'
          if (adultoAtivo && planoIndisponivel) return 'Plano nutricional indisponível neste aparelho. Conecte à internet e atualize os dados.'
          return null
        },
      },
      leitura: { required: adultoAtivo },
      kgCocho: {
        required: adultoAtivo,
        custom: (value: any) => {
          if (adultoAtivo && value && Number(value) <= 0) return isSacaria ? 'Número de sacos deve ser maior que zero' : 'KG no cocho deve ser maior que zero'
          return null
        },
      },
    }
    if (temCreepDisponivel) {
      base._alvos = {
        custom: () => {
          if (!adultoPreenchido && !creepPreenchido) {
            return 'Preencha a suplementação do lote e/ou do creep feeding'
          }
          return null
        }
      }
      if (creepAtivo) {
        base._creepFormulacao = {
          custom: () => {
            if (!creepFormulacaoDetalhes) {
              return 'Bezerro(a) ao pé sem formulação creep vinculada. Vincule uma formulação creep no Painel Web (cadastro do lote) antes de lançar.'
            }
            return null
          }
        }
        base.creepLeitura = { required: true }
        base.creepKgCocho = {
          required: true,
          custom: (value: any) => {
            if (value && Number(value) <= 0) return isSacariaCreep ? 'Número de sacos deve ser maior que zero' : 'KG no cocho creep deve ser maior que zero'
            return null
          },
        }
      }
    }
    if (possuiDeposito) {
      // required: sem isso o hook pula a regra com o campo vazio e o botão liberava sem o depósito
      base.kgDeposito = {
        required: true,
        custom: () => {
          if (!form.kgDeposito || form.kgDeposito.trim() === '' || Number(form.kgDeposito) <= 0) {
            return isSacaria
              ? 'Número de sacos no depósito é obrigatório e deve ser maior que zero'
              : 'KG no depósito é obrigatório e deve ser maior que zero'
          }
          return null
        }
      }
    }
    // Modelo novo: itens do checklist nao sao obrigatorios porque "nao
    // marcado" ja significa "condicao adequada". A unica resposta exigida e
    // a pergunta de acao "limpeza de cocho foi realizada?".
    if (checklistAtivo) {
      base.limpezaCocho = { required: true }
    }
    return base
  }, [possuiDeposito, checklistAtivo, form.kgDeposito, loteSemPasto, loteNaoEncontrado, semPlanoAtivo, planoIndisponivel, isSacaria, adultoAtivo, creepAtivo, adultoPreenchido, creepPreenchido, temCreepDisponivel, creepFormulacaoDetalhes, isSacariaCreep])

  const { isValid } = useFormValidation(form, validationRules)

  // Erro de salvamento anterior (ex.: trato duplicado) não vale para outra data/lote
  useEffect(() => {
    setErrors([])
  }, [form.data, form.numeroLote])
  const verificandoTravaRef = useRef(false)

  // Dados do lote em carga, ou que não chegaram: salvar gravaria registro incompleto
  // (sem loteId/categorias/peso, sem formulação, sem saber se o pasto tem depósito ou se a dieta é em sacos)
  const formulacaoIndisponivel = adultoAtivo && !!form.formulacao && formulacaoCarregada && !formulacaoDetalhes
  const dadosCarregando =
    carregandoLote || carregandoPlano || carregandoPasto || loadingChecklistRegras || (!formulacaoCarregada && adultoAtivo) ||
    (temCreepDisponivel && !creepFormulacaoCarregada)
  const dadosIndisponiveis =
    (!!form.numeroLote && !detalhesLote) || pastoIndisponivel || formulacaoIndisponivel || (adultoAtivo && planoIndisponivel)
  const loteBloqueado = dadosCarregando || dadosIndisponiveis
  dadosIndisponiveisRef.current = dadosIndisponiveis && !dadosCarregando

  useEffect(() => {
    const aoVoltarInternet = () => {
      if (dadosIndisponiveisRef.current) {
        // O sistema avisou que a internet voltou: o sinal de rede instável não vale mais
        registrarRespostaDeRede()
        setRecarga((n) => n + 1)
      }
    }
    window.addEventListener('online', aoVoltarInternet)
    // Wi-Fi sem internet que volta não dispara 'online': tenta de novo de tempos em tempos enquanto indisponível
    const tentativa = setInterval(() => {
      if (dadosIndisponiveisRef.current) setRecarga((n) => n + 1)
    }, 25_000)
    return () => {
      window.removeEventListener('online', aoVoltarInternet)
      clearInterval(tentativa)
    }
  }, [])

  const verificarTratoDuplicado = async (): Promise<any | null> => {
    if (!travaSuplementacao || !fazendaId || !form.loteId || !form.data) return null
    const diaBR = form.data
    const tz = redeInstavelRecentemente()
      ? DEFAULT_FARM_TIMEZONE
      : await withTimeout(getFarmTimezoneAsync(), 3000).catch(() => DEFAULT_FARM_TIMEZONE)
    const mesmoDia = (iso: unknown): boolean => {
      const d = new Date(String(iso))
      if (isNaN(d.getTime())) return false
      const p = getDateTimePartsInTimezone(d, tz)
      return `${p.day}/${p.month}/${p.year}` === diaBR
    }

    try {
      const locais = await listarRegistros('suplementacao')
      const dup = locais.find(
        (r) => !r.isTestRecord && r.loteId === form.loteId && String(r.data || '').split(' ')[0] === diaBR
      )
      if (dup) return dup
    } catch (error) {
      console.warn('[SuplementacaoPage] Trava: falha ao ler IndexedDB:', error)
    }

    const dupPuxado = (registrosSuplementacao || []).find(
      (r: any) => r.lote_id === form.loteId && !r.deleted_at && mesmoDia(r.data)
    )
    if (dupPuxado) return dupPuxado

    if (navigator.onLine && !redeInstavelRecentemente()) {
      try {
        const frescos = await Promise.race([
          getRegistrosSuplementacaoByLote(fazendaId, form.loteId),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
        ])
        const dupOnline = (frescos || []).find((r: any) => !r.deleted_at && mesmoDia(r.data))
        if (dupOnline) return dupOnline
      } catch (error) {
        console.warn('[SuplementacaoPage] Trava: consulta online falhou, seguindo com verificação local:', error)
      }
    }
    return null
  }

  const handleSalvarClick = async () => {
    if (loteBloqueado || verificandoTravaRef.current) return
    verificandoTravaRef.current = true
    try {
      const dup = await verificarTratoDuplicado()
      if (dup) {
        const quem = dup.tratador || dup.usuario || dup.nome_usuario
        const novosErros = [{
          field: 'numeroLote',
          message: `Já existe um trato lançado nesta data para este lote${quem ? ` (por ${quem})` : ''}. Para corrigir, solicite ao administrativo no painel.`,
        }]
        setErrors(novosErros)
        scrollToFirstError(novosErros)
        return
      }
      salvar(executarSalvamento)
    } finally {
      verificandoTravaRef.current = false
    }
  }

  const executarSalvamento = async () => {
    setErrors([])

    // Validate form using the validation hook
    if (!isValid || loteBloqueado) {
      return
    }

    // Buscar categorias do lote selecionado
    let categoriasArray: string[] = []
    if (detalhesLote && detalhesLote.categorias) {
      categoriasArray = processarCategorias(detalhesLote.categorias)
    }

    // Calcular peso vivo projetado para a data do registro (não a data de hoje)
    // Se não houver plano ativo ou dados suficientes, usar o peso atual do lote
    let pesoVivoKgLote = detalhesLote?.peso_vivo_kg ?? null
    if (form.loteId && form.data) {
      try {
        // O plano acabou de ser lido/revalidado ao escolher o lote: usa o cache e evita ~5 idas ao servidor no SALVAR
        const planoParams =
          (await getPlanoNutricionalAtivoFromCacheOnly(form.loteId)) ?? (await getPlanoNutricionalAtivoByLoteIdCached(form.loteId))
        if (planoParams) {
          const pesoProjetado = calcularPesoProjetado(form.data, planoParams)
          if (pesoProjetado != null) {
            pesoVivoKgLote = Number(pesoProjetado.toFixed(2))
          }
        }
      } catch (error) {
        console.error('[SuplementacaoPage] Erro ao calcular peso projetado:', error)
      }
    }

    const result = await salvarRegistro('suplementacao', {
      data: form.data,
      dataLocal: travaSuplementacao ? brToIso(form.data) : null,
      tratador: usuario,
      usuario: usuario,
      pasto: form.pasto,
      pastoId: form.pastoId,
      numeroLote: form.numeroLote,
      loteId: form.loteId,
      nCabecasLote: detalhesLote?.n_cabecas != null
        ? (adultoAtivo
          ? (temCreepDisponivel ? detalhesLote.n_cabecas - creepNCabecas : detalhesLote.n_cabecas)
          : creepNCabecas)
        : null,
      // O denominador de consumo do banco é (n_cabecas - qtd_bezerros) e o
      // consumo adulto nunca pode incluir cabeças de bezerro. Com dieta creep,
      // a linha 'lote' já carrega só adultos em n_cabecas, então qtd vai 0.
      // Sem dieta, n_cabecas vai total e qtd recebe as cabeças ao pé reais
      // (creepNCabecas): o campo legado lote_categorias.qtd_bezerros não é
      // confiável (pode vir null ou replicado por linha), e com ele null o
      // denominador incluiria os bezerros.
      qtdBezerrosLote: adultoAtivo
        ? (temCreepDisponivel ? 0 : creepNCabecas)
        : 0,
      pesoVivoKgLote: adultoAtivo ? pesoVivoKgLote : creepPesoVivoKg,
      formulacao: adultoAtivo ? form.formulacao : (creepFormulacaoDetalhes?.nome ?? null),
      formulacaoId: adultoAtivo ? (formulacaoDetalhes?.id ?? null) : (creepFormulacaoDetalhes?.id ?? null),
      teorMs: adultoAtivo ? (formulacaoDetalhes?.teorMs ?? null) : (creepFormulacaoDetalhes?.teorMs ?? null),
      metaConsumo: adultoAtivo ? (formulacaoDetalhes?.metaConsumo ?? null) : (creepFormulacaoDetalhes?.metaConsumo ?? null),
      leituraCocho: adultoAtivo ? (form.leitura || null) : (form.creepLeitura || null),
      kgCocho: adultoAtivo
        ? (isSacaria && kgPorSaco
          ? (Number(form.kgCocho) || 0) * kgPorSaco
          : (form.kgCocho ? Number(form.kgCocho) : null))
        : (isSacariaCreep && kgPorSacoCreep
          ? (Number(form.creepKgCocho) || 0) * kgPorSacoCreep
          : (form.creepKgCocho ? Number(form.creepKgCocho) : null)),
      formaFornecimento: adultoAtivo
        ? (isSacaria ? 'sacaria' : 'granel')
        : (isSacariaCreep ? 'sacaria' : 'granel'),
      qtdSacos: adultoAtivo
        ? (isSacaria && form.kgCocho ? Number(form.kgCocho) : null)
        : (isSacariaCreep && form.creepKgCocho ? Number(form.creepKgCocho) : null),
      // Creep feeding (bezerro(a) ao pé): gera linha escopo 'creep' no sync
      suplementarAdulto: adultoAtivo,
      suplementarCreep: creepAtivo,
      creepFormulacao: creepAtivo ? (creepFormulacaoDetalhes?.nome ?? null) : null,
      creepFormulacaoId: creepAtivo ? (creepFormulacaoDetalhes?.id ?? null) : null,
      creepLeitura: creepAtivo ? (form.creepLeitura || null) : null,
      creepKgCocho: creepAtivo
        ? (isSacariaCreep && kgPorSacoCreep
          ? (Number(form.creepKgCocho) || 0) * kgPorSacoCreep
          : (form.creepKgCocho ? Number(form.creepKgCocho) : null))
        : null,
      creepFormaFornecimento: creepAtivo ? (isSacariaCreep ? 'sacaria' : 'granel') : null,
      creepQtdSacos: creepAtivo && isSacariaCreep && form.creepKgCocho ? Number(form.creepKgCocho) : null,
      creepNCabecas: creepAtivo ? creepNCabecas : null,
      creepCategorias: creepAtivo ? creepCategoriasStr : null,
      creepMetaConsumo: creepAtivo ? (creepFormulacaoDetalhes?.metaConsumo ?? null) : null,
      creepTeorMs: creepAtivo ? (creepFormulacaoDetalhes?.teorMs ?? null) : null,
      creepPesoVivoKg: creepAtivo ? creepPesoVivoKg : null,
      kgDeposito: form.kgDeposito
        ? (isSacaria && kgPorSaco ? Number(form.kgDeposito) * kgPorSaco : Number(form.kgDeposito))
        : 0,
      possuiDeposito,
      // categorias por escopo: com dieta creep a linha 'lote' não lista as
      // categorias ao pé (elas ficam em creepCategorias); sem dieta, grava
      // todas como antes. Quando só o creep é suplementado, só as ao pé.
      categorias: adultoAtivo
        ? categoriasArray.filter((c) => !temCreepDisponivel || !isCategoriaAoPe(c))
        : categoriasArray.filter((c) => isCategoriaAoPe(c)),
      categoriasString: adultoAtivo
        ? categoriasArray.filter((c) => !temCreepDisponivel || !isCategoriaAoPe(c)).join(', ')
        : creepCategoriasStr,
      escoreFezes: form.escoreFezes || null,
      espacamentoCochoDetalhes: espacamentoCochoDetalhes,
      espacamentoCochoCmCab: null,
      espacamentoCochoObs: '',
      // valor = "a condicao esta adequada" (true) ou "problema marcado"
      // (false). A afirmacao negativa existe so na UI; a chave e a proposicao
      // positiva. foto_cocho carrega a evidencia da leitura e independe do
      // checklist estar ativo para a fazenda.
      checklist: (checklistAtivo || form.fotoCocho) ? {
        ...(checklistAtivo ? {
          limpeza_cocho: {
            valor: form.limpezaCocho === 'Sim',
            observacao: form.limpezaCochoObs || ''
          },
          ...Object.fromEntries(
            CHECKLIST_PROBLEMAS
              .filter(({ campo }) => campo !== 'depositoCondicoes' || possuiDeposito)
              .map(({ campo, checklistKey }) => [
                checklistKey,
                {
                  valor: form[campo] !== 'Não',
                  observacao: (form as any)[`${campo}Obs`] || '',
                  fotoBase64: (form as any)[`${campo}Foto`] || undefined,
                },
              ])
          ),
        } : {}),
        ...(form.fotoCocho ? {
          foto_cocho: {
            valor: true,
            observacao: '',
            fotoBase64: form.fotoCocho,
          },
        } : {}),
      } : null,
    })

    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      const registroComPeriodo = result.registro
        ? { ...result.registro }
        : null
      if (registroComPeriodo) {
        const periodoTrato = calcularPeriodoTrato(registroComPeriodo, registrosSuplementacao)
        if (periodoTrato) {
          registroComPeriodo.periodoTratoDias = periodoTrato
        }
        if (metricasSuplementacao) {
          registroComPeriodo.consumoMedioGeralPercentPV = metricasSuplementacao.consumoMedioGeralPercentPV
          registroComPeriodo.consumoMedio30DiasPercentPV = metricasSuplementacao.consumoMedio30DiasPercentPV
          registroComPeriodo.consumoMedioGeralKgMN = metricasSuplementacao.consumoMedioGeralKgMN
          registroComPeriodo.consumoMedio30DiasKgMN = metricasSuplementacao.consumoMedio30DiasKgMN
          registroComPeriodo.consumoMedioGeralKgMS = metricasSuplementacao.consumoMedioGeralKgMS
          registroComPeriodo.consumoMedio30DiasKgMS = metricasSuplementacao.consumoMedio30DiasKgMS
          registroComPeriodo.custoMedioReaisCabDia = metricasSuplementacao.custoMedioReaisCabDia
        }
      }
      setRegistroSalvo(registroComPeriodo)
      setShowSuccessModal(true)
      limparRascunho()
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

  const pendenciaTexto = (() => {
    if (!form.numeroLote) return 'Falta escolher o pasto/lote'
    if (carregandoLote) return 'Carregando dados do lote...'
    if (!detalhesLote) return 'Lote sem dados neste aparelho: conecte à internet e atualize os dados'
    if (loteSemPasto) return 'Este lote não tem pasto vinculado'
    if (!form.pasto) return 'Pasto do lote não identificado neste aparelho: conecte à internet e atualize os dados'
    if (carregandoPlano) return 'Carregando plano nutricional...'
    if (carregandoPasto) return 'Carregando dados do pasto...'
    if (loadingChecklistRegras) return 'Carregando regras do checklist...'
    if (pastoIndisponivel) return 'Dados do pasto indisponíveis neste aparelho: conecte à internet e atualize os dados'
    if (adultoAtivo && planoIndisponivel) return 'Plano nutricional indisponível neste aparelho: conecte à internet e atualize os dados'
    if (adultoAtivo && semPlanoAtivo) return 'Lote sem plano nutricional ativo'
    if ((adultoAtivo && !formulacaoCarregada) || (temCreepDisponivel && !creepFormulacaoCarregada)) return 'Carregando formulação...'
    if (formulacaoIndisponivel) return 'Formulação indisponível neste aparelho: conecte à internet e atualize os dados'
    if (temCreepDisponivel && !adultoPreenchido && !creepPreenchido) return 'Preencha a suplementação do lote e/ou do creep'
    if (adultoAtivo && !form.leitura) return 'Falta a leitura do cocho'
    if (adultoAtivo && !(Number(form.kgCocho) > 0)) return isSacaria ? 'Falta o número de sacos no cocho' : 'Falta o total suplementado no cocho'
    if (creepAtivo && !creepFormulacaoDetalhes) return 'Bezerro(a) ao pé sem formulação creep vinculada'
    if (creepAtivo && !form.creepLeitura) return 'Falta a leitura do cocho do creep'
    if (creepAtivo && !(Number(form.creepKgCocho) > 0)) return 'Falta o total suplementado do creep'
    if (possuiDeposito && !(Number(form.kgDeposito) > 0)) return isSacaria ? 'Falta o número de sacos no depósito' : 'Falta o total no depósito'
    if (checklistAtivo && !form.limpezaCocho) return 'Falta informar se a limpeza do cocho foi realizada'
    return undefined
  })()

  const categoriasLoteStr = detalhesLote?.categorias
    ? processarCategorias(detalhesLote.categorias).map(capitalizarCategoria).join(', ')
    : ''

  const loteStatus: InfoCardStatus | undefined = (() => {
    if (!detalhesLote) return undefined
    if (loteSemPasto) return { tone: 'danger', text: 'Sem pasto vinculado: vincule um pasto ao lote no Painel Web' }
    if (semPlanoAtivo) return { tone: 'danger', text: 'Sem plano nutricional ativo: vincule um plano no Painel Web' }
    if (temCreepDisponivel) return { tone: 'warning', text: `Este lote tem bezerro(a) ao pé: ${creepNCabecas} cab em creep` }
    return undefined
  })()

  const metaKgCabDia =
    metaConsumoLote != null && pesoVivoLote != null && pesoVivoLote > 0
      ? (metaConsumoLote / 100) * pesoVivoLote
      : null

  // Tiles de escala (leitura do cocho, escore de fezes)
  const renderEscala = (
    options: typeof LEITURA_OPTIONS,
    value: string,
    field: keyof FormState,
  ) => (
    <div className="grid grid-cols-5 gap-1.5" data-field={field}>
      {options.map((opt) => {
        const selecionado = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => set(field)(opt.value)}
            className={`flex min-h-[64px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-2 p-1.5 transition-all active:scale-95 ${
              selecionado ? opt.selecionado : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'
            }`}
          >
            <span className="flex items-center gap-1">
              <span className={`h-2.5 w-2.5 rounded-full ${opt.dot}`} />
              <span className="text-base font-extrabold leading-none">{opt.numero}</span>
            </span>
            <span className="text-[10px] font-bold leading-tight text-center">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )

  const chipPop = (onClick: () => void, label: string) => (
    <button
      type="button"
      onClick={onClick}
      className="flex !min-h-0 shrink-0 items-center gap-1.5 rounded-lg bg-yellow-400 px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-black transition-colors hover:bg-yellow-300 active:scale-[0.98]"
    >
      <FileText className="h-3.5 w-3.5" strokeWidth={2.5} />
      {label}
    </button>
  )

  // Bloco leitura + quantidade de um grupo (lote adulto ou creep)
  const blocoLeituraQuantidade = (
    leituraField: 'leitura' | 'creepLeitura',
    kgField: 'kgCocho' | 'creepKgCocho',
    sacaria: boolean,
    kgSaco: number | null,
    mostrarPrevisto: boolean,
  ) => (
    <>
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <label className="block text-[15px] font-bold text-gray-900">
            LEITURA DO COCHO <span className="text-red-500">*</span>
          </label>
          {chipPop(() => setShowPdfModal(true), 'POP Cocho')}
        </div>
        {renderEscala(LEITURA_OPTIONS, form[leituraField], leituraField)}
        {getError(leituraField) && (
          <p className="mt-2 text-base font-semibold text-red-700">{getError(leituraField)}</p>
        )}
      </div>

      {mostrarPrevisto && kgPrevisto != null && (
        <InfoStrip tone="neutral" icon="📊">
          KG previsto: <strong>{kgPrevisto.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg</strong>
          {(() => {
            const notaConfig = notasConfig.find((n: any) => Number(n.nota) === Number(form.leitura))
            return notaConfig?.descricao ? ` — ${notaConfig.descricao}` : ''
          })()}
        </InfoStrip>
      )}

      <div>
        <Input
          label={sacaria ? 'Quantidade de Sacos' : 'Total Suplementado no Cocho (kg)'}
          placeholder="0"
          value={form[kgField]}
          onChange={(e) => {
            const apenasDigitos = e.target.value.replace(/[^0-9]/g, '')
            setForm((prev) => ({ ...prev, [kgField]: apenasDigitos }))
          }}
          error={getError(kgField)}
          inputMode="numeric"
          type="text"
          pattern="[0-9]*"
        />
      </div>

      {sacaria && kgSaco && (
        <InfoStrip tone="warning">
          Sacaria de {kgSaco.toLocaleString('pt-BR')} kg
          {kgField === 'kgCocho' && kgCochoConvertido !== null &&
            ` = ${kgCochoConvertido.toLocaleString('pt-BR')} kg no cocho`}
          {kgField === 'creepKgCocho' && form.creepKgCocho && Number(form.creepKgCocho) > 0 &&
            ` = ${(Number(form.creepKgCocho) * kgSaco).toLocaleString('pt-BR')} kg no cocho`}
        </InfoStrip>
      )}

      {kgField === 'kgCocho' && consumoAtual && !sacaria && (
        <InfoStrip tone={consumoAtual.status} icon="⚖️">
          = {consumoAtual.kgCab.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg/cab
          {consumoAtual.pctPV != null &&
            ` · ${consumoAtual.pctPV.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% PV`}
          {metaConsumoLote != null && ` — ${consumoAtual.statusTexto}`}
        </InfoStrip>
      )}
    </>
  )

  const numeroChecklist = temCreepDisponivel ? 3 : 2
  const numeroConsumo = numeroChecklist + 1

  return (
    <>
      <CadernetaLayout
        title="SUPLEMENTAÇÃO"
        cadernetaId="suplementacao"
        dateContent={
          <DatePicker value={form.data} onChange={set('data')} variant="header" compact inline maxDate={todayBR()} />
        }
      >
        <BannerRascunho
          visible={rascunhoRestaurado}
          onConfirmar={confirmarRascunho}
          onDescartar={descartarRascunho}
        />
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        <CadernetaSection titulo="Pasto/Lote" required>
          {lotesDisponiveis.length > 0 ? (
            <SearchableModal
              label=""
              value={form.numeroLote}
              onChange={set('numeroLote')}
              error={getError('numeroLote')}
              options={lotesDisponiveis}
              secondaryText={(lote) => lotesPastoMap[lote] || ''}
              placeholder="Buscar pasto ou lote..."
              id="numeroLote"
              name="numeroLote"
            />
          ) : (
            <Input
              label="PASTO/LOTE"
              placeholder={lotesCarregados ? 'Nenhum lote neste aparelho. Conecte à internet e atualize os dados' : 'Carregando...'}
              value={form.numeroLote}
              onChange={setInput('numeroLote')}
              error={getError('numeroLote')}
              disabled
            />
          )}

          {loteNaoEncontrado && (
            <InfoStrip tone="danger">
              Lote "{form.numeroLote}" sem dados neste aparelho ou não encontrado nesta fazenda. Conecte à internet e atualize os dados, ou selecione outro lote.
            </InfoStrip>
          )}

          {detalhesLote && (
            <InfoCard
              icon={Beef}
              title={detalhesLote.nome || form.numeroLote}
              subtitle={form.pasto || 'Sem pasto vinculado'}
              stats={[
                { label: 'Cabeças', value: detalhesLote.n_cabecas != null ? String(detalhesLote.n_cabecas) : '-' },
                {
                  label: 'PV médio',
                  value: detalhesLote.peso_vivo_kg != null
                    ? `${Number(detalhesLote.peso_vivo_kg).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`
                    : '-',
                },
                ...(categoriasLoteStr ? [{ label: 'Categorias', value: categoriasLoteStr, span: 2 }] : []),
              ]}
              status={loteStatus}
            >
              {formulacaoDetalhes && (
                <InfoStrip tone="warning" icon="📌" className="mt-3">
                  Formulação do plano: <strong>{formulacaoDetalhes.nome}</strong>
                  {metaConsumoLote != null &&
                    ` · meta ${metaConsumoLote.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% PV`}
                  {metaKgCabDia != null &&
                    ` (~${metaKgCabDia.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg/cab)`}
                </InfoStrip>
              )}
            </InfoCard>
          )}
        </CadernetaSection>

        {/* Leitura e quantidade — lote (categorias adultas) */}
        <CadernetaSection
          numero={1}
          titulo={temCreepDisponivel ? 'Leitura e Quantidade — Lote' : 'Leitura e Quantidade'}
          required={adultoAtivo}
        >
          {getError('_alvos') && (
            <InfoStrip tone="danger">{getError('_alvos')}</InfoStrip>
          )}

          {planoIndisponivel && form.loteId && adultoAtivo && (
            <InfoStrip tone="danger" icon="⚠️">
              Plano nutricional indisponível neste aparelho. Conecte à internet e atualize os dados.
            </InfoStrip>
          )}

          {semPlanoAtivo && form.loteId && adultoAtivo && (
            <InfoStrip tone="danger" icon="⚠️">
              Sem plano nutricional ativo. Vincule um plano no Painel Web antes de lançar suplementação.
            </InfoStrip>
          )}

          {!adultoAtivo && (
            <InfoStrip tone="neutral">
              Lote em creep feeding: preencha só se houver trato para as categorias adultas.
            </InfoStrip>
          )}

          {/* Sempre visível: em lote com creep o grupo adulto só "ativa" ao preencher estes campos */}
          {blocoLeituraQuantidade('leitura', 'kgCocho', isSacaria, kgPorSaco, true)}

          {/* Foto do cocho: evidencia da leitura, opcional */}
          <div>
            <label className="mb-2 block text-[15px] font-bold text-gray-900">FOTO DO COCHO</label>
            {form.fotoCocho ? (
              <div className="flex items-start gap-3">
                <img
                  src={base64ToDataUrl(form.fotoCocho)}
                  alt="Foto do cocho"
                  className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removerFotoItem('fotoCocho')}
                  className="flex-1 rounded-xl bg-gray-200 px-3 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-300 active:scale-[0.99]"
                >
                  🗑️ REMOVER FOTO
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleTirarFotoItem('fotoCocho')}
                disabled={capturandoFoto}
                className="flex w-full min-h-[56px] items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-3 py-2.5 text-gray-700 transition-colors hover:border-gray-400 active:scale-[0.99] disabled:opacity-60"
              >
                <span className="text-lg leading-none">📷</span>
                <span className="text-xs font-extrabold uppercase tracking-wide">
                  {capturandoFoto && campoFotoAtual === 'fotoCocho' ? 'Capturando...' : 'Foto do cocho'}
                </span>
              </button>
            )}
            {fotoErro && campoFotoAtual === 'fotoCocho' && (
              <InfoStrip tone="danger" className="mt-2">{fotoErro}</InfoStrip>
            )}
          </div>

          {possuiDeposito && (
            <Input
              label={<span>{isSacaria ? 'Quantidade de Sacos no Depósito' : 'Total Suplementado no Depósito (kg)'} <span className="text-red-500">*</span></span>}
              placeholder="0"
              value={form.kgDeposito}
              onChange={isSacaria
                ? (e) => {
                    const apenasDigitos = e.target.value.replace(/[^0-9]/g, '')
                    setForm((prev) => ({ ...prev, kgDeposito: apenasDigitos }))
                  }
                : setInput('kgDeposito')}
              inputMode={isSacaria ? 'numeric' : 'decimal'}
              type={isSacaria ? 'text' : 'number'}
              pattern={isSacaria ? '[0-9]*' : undefined}
              min={isSacaria ? undefined : '0'}
              error={getError('kgDeposito')}
            />
          )}

          {possuiDeposito && isSacaria && kgPorSaco && (
            <InfoStrip tone="warning">
              Sacaria de {kgPorSaco.toLocaleString('pt-BR')} kg
              {kgDepositoConvertido !== null &&
                ` = ${kgDepositoConvertido.toLocaleString('pt-BR')} kg no depósito`}
            </InfoStrip>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="block text-[15px] font-bold text-gray-900">ESCORE DE FEZES</label>
              {chipPop(() => setShowFezesModal(true), 'POP Fezes')}
            </div>
            {renderEscala(FEZES_OPTIONS, form.escoreFezes, 'escoreFezes')}
            {getError('escoreFezes') && (
              <p className="mt-2 text-base font-semibold text-red-700">{getError('escoreFezes')}</p>
            )}
          </div>
        </CadernetaSection>

        {/* Creep feeding — bezerro(a) ao pé */}
        {temCreepDisponivel && (
          <CadernetaSection
            numero={2}
            titulo={`Creep Feeding — Bezerro(a) ao pé (${creepNCabecas} cab)`}
            className="!border-amber-200"
          >
            {creepFormulacaoDetalhes ? (
              <InfoStrip tone="warning" icon="📌">
                Formulação creep: <strong>{creepFormulacaoDetalhes.nome}</strong>
                {creepFormulacaoDetalhes.metaConsumo != null &&
                  ` · meta ${creepFormulacaoDetalhes.metaConsumo.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% PV`}
              </InfoStrip>
            ) : creepFormulacaoCarregada ? (
              <InfoStrip tone="danger" icon="⚠️">
                Formulação creep indisponível. A formulação vinculada à categoria ao pé não é creep ou está inativa. Corrija no cadastro do lote no Painel Web.
              </InfoStrip>
            ) : null}
            {getError('_creepFormulacao') && (
              <p className="text-sm font-semibold text-red-600">{getError('_creepFormulacao')}</p>
            )}

            {blocoLeituraQuantidade('creepLeitura', 'creepKgCocho', isSacariaCreep, kgPorSacoCreep, false)}
          </CadernetaSection>
        )}

        {loadingChecklistRegras ? (
          <CadernetaSection numero={numeroChecklist} titulo="Checklist">
            <p className="py-4 text-center text-sm text-gray-500">Carregando regras do checklist...</p>
          </CadernetaSection>
        ) : checklistAtivo ? (
          <CadernetaSection numero={numeroChecklist} titulo="Checklist" required>
            <p className="-mt-2 text-sm text-gray-500">
              Toque em um item se encontrar o problema. Não tocar significa que está tudo certo.
            </p>
            {CHECKLIST_PROBLEMAS
              .filter(({ campo }) => campo !== 'depositoCondicoes' || possuiDeposito)
              .map(({ campo, label, aviso }) => {
              const marcado = form[campo] === 'Não'
              const foto = (form as any)[`${campo}Foto`] as string
              return (
                <div key={campo} className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => toggleProblema(campo)}
                    data-field={campo}
                    className={`flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all active:scale-[0.99] ${
                      marcado
                        ? 'border-red-500 bg-red-50 text-red-800'
                        : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'
                    }`}
                  >
                    <span className="text-sm font-bold leading-tight">{label}</span>
                    {marcado && <span className="text-lg leading-none">⚠️</span>}
                  </button>

                  {marcado && (
                    <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50/60 p-3">
                      <InfoStrip tone="danger" icon="⚠️">{aviso}</InfoStrip>

                      {campo === 'espacamentoCochoAdequado' && espacamentoCochoDetalhes && !espacamentoCochoDetalhes.erro && (
                        <InfoStrip tone="neutral">
                          Espaçamento calculado: <strong>{espacamentoCochoDetalhes.espacamento_calculado_m_cab?.toFixed(2)} m/cab</strong>
                          {` (cocho ${espacamentoCochoDetalhes.metragem_cocho_m}m · ${espacamentoCochoDetalhes.cabecas_adultas} cab)`}
                        </InfoStrip>
                      )}

                      {foto && (
                        <div className="flex items-start gap-3">
                          <img
                            src={base64ToDataUrl(foto)}
                            alt={`Foto de ${label}`}
                            className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removerFotoItem(campo)}
                            className="flex-1 rounded-xl bg-gray-200 px-3 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-300 active:scale-[0.99]"
                          >
                            🗑️ REMOVER FOTO
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        {!foto && (
                          <button
                            type="button"
                            onClick={() => handleTirarFotoItem(campo)}
                            disabled={capturandoFoto}
                            className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl bg-brand-900 px-3 py-2.5 text-white transition-colors hover:bg-brand-800 active:scale-[0.99] disabled:opacity-60"
                          >
                            <span className="text-lg leading-none">📷</span>
                            <span className="text-xs font-extrabold uppercase tracking-wide">
                              {capturandoFoto && campoFotoAtual === campo ? 'Capturando...' : 'Foto'}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleFalarItem(campo)}
                          className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-white transition-colors active:scale-[0.99] ${
                            foto ? 'col-span-2' : ''
                          } ${
                            ouvindoVoz && campoVozAtual === campo
                              ? 'animate-pulse bg-red-600'
                              : 'bg-gray-600 hover:bg-gray-700'
                          }`}
                        >
                          <span className="text-lg leading-none">🎤</span>
                          <span className="text-xs font-extrabold uppercase tracking-wide">
                            {ouvindoVoz && campoVozAtual === campo ? 'Ouvindo...' : 'Falar'}
                          </span>
                        </button>
                      </div>
                      {fotoErro && campoFotoAtual === campo && (
                        <InfoStrip tone="danger">{fotoErro}</InfoStrip>
                      )}
                      {vozErro && campoVozAtual === campo && (
                        <InfoStrip tone="danger">{vozErro}</InfoStrip>
                      )}

                      <Input
                        placeholder="Adicionar observação (opcional)"
                        value={(form as any)[`${campo}Obs`] || ''}
                        onChange={(e) => setForm((prev) => ({ ...prev, [`${campo}Obs`]: e.target.value }))}
                      />
                    </div>
                  )}
                </div>
              )
            })}

            <div className="mt-1">
              <label className="mb-2 block text-[15px] font-bold text-gray-900">
                LIMPEZA DE COCHO FOI REALIZADA? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2" data-field="limpezaCocho">
                {[
                  { value: 'Sim', label: 'SIM', icon: '✓', sel: 'bg-green-100 text-green-800 border-green-500', iconColor: 'text-green-600' },
                  { value: 'Não', label: 'NÃO', icon: '✗', sel: 'bg-red-50 text-red-700 border-red-400', iconColor: 'text-red-500' },
                ].map((opt) => {
                  const selecionado = form.limpezaCocho === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set('limpezaCocho')(opt.value)}
                      className={`flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-xl border-2 transition-all active:scale-95 ${
                        selecionado ? opt.sel : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <span className={`text-lg leading-none ${selecionado ? '' : opt.iconColor}`}>{opt.icon}</span>
                      <span className="text-sm font-bold">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
              {getError('limpezaCocho') && (
                <p className="mt-2 text-base font-semibold text-red-700">{getError('limpezaCocho')}</p>
              )}
              {form.limpezaCocho === 'Não' && (
                <Input
                  placeholder="Adicionar observação (opcional)"
                  value={form.limpezaCochoObs}
                  onChange={setInput('limpezaCochoObs')}
                  className="mt-2"
                />
              )}
            </div>
          </CadernetaSection>
        ) : null}

        {/* Consumo do lote: média 7 dias + série diária + histórico completo */}
        {detalhesLote && (
          <CadernetaSection numero={numeroConsumo} titulo="Consumo do Lote">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-gray-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Média 7 dias</p>
                <p className="mt-0.5 text-base font-extrabold text-gray-900">
                  {media7Dias != null
                    ? `${media7Dias.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg/cab`
                    : '-'}
                </p>
              </div>
              <div className="rounded-xl bg-gray-50 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-500">% do peso vivo</p>
                <p className="mt-0.5 text-base font-extrabold text-gray-900">
                  {media7DiasPctPV != null
                    ? `${media7DiasPctPV.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                    : '-'}
                </p>
              </div>
            </div>

            {intervalosComAberto.length === 0 ? (
              <InfoStrip tone="neutral">
                Sem histórico de tratos para este lote.
              </InfoStrip>
            ) : serie7Dias.every((d) => d.kgCab == null) ? (
              <InfoStrip tone="neutral">
                Nenhum trato coberto na janela dos últimos 7 dias.
              </InfoStrip>
            ) : (
              <div className="flex items-end gap-1.5 pt-1">
                {serie7Dias.map((d, i) => {
                  const altura = d.kgCab != null && maxKgCabSerie > 0
                    ? Math.max((d.kgCab / maxKgCabSerie) * 100, 8)
                    : 0
                  const acimaMeta = d.kgCab != null && metaKgCabMN != null && d.kgCab > metaKgCabMN * 1.05
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex h-16 w-full items-end rounded-md bg-gray-100">
                        {d.kgCab != null && (
                          <div
                            className={`w-full rounded-md ${acimaMeta ? 'bg-amber-400' : 'bg-brand-500'}`}
                            style={{ height: `${altura}%` }}
                            title={`${d.kgCab.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg/cab`}
                          />
                        )}
                      </div>
                      <span className="text-[10px] font-semibold text-gray-400">
                        {d.data.getUTCDate()}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowHistoricoModal(true)}
              className="w-full rounded-xl border-2 border-brand-200 bg-brand-50 px-3 py-3 text-sm font-bold text-brand-700 transition-colors hover:bg-brand-100 active:scale-[0.99]"
            >
              Ver histórico completo do lote →
            </button>
          </CadernetaSection>
        )}

        <FormFooter
          onSalvar={handleSalvarClick}
          onLimpar={() => {
            limparRascunho()
            setErrors([])
          }}
          salvando={salvando}
          disabled={!isValid || loteBloqueado}
          formValido={isValid && !loteBloqueado}
          pendenciaTexto={pendenciaTexto}
        />

        <input
          ref={fotoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFotoInputItem}
          className="hidden"
        />
      </CadernetaLayout>

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

      <HistoricoSuplementacaoModal
        aberto={showHistoricoModal}
        onFechar={() => setShowHistoricoModal(false)}
        nomeLote={detalhesLote?.nome || form.numeroLote}
        registros={registrosHistorico}
        intervalos={intervalosComAberto}
      />

      <ObservacaoAtrasoModal
        isOpen={showObservacaoModal}
        onClose={async (observacao) => {
          if (observacao !== undefined) {
            await onConfirmarObservacao(observacao)
          } else {
            onCancelarObservacao()
          }
        }}
        horarioProgramado={horariosModal.programado}
        horarioRegistro={horariosModal.registro}
      />
    </>
  )
}

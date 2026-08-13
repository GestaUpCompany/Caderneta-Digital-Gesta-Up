import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, ValidationMessage } from '../../components/ui'
import SearchableModal from '../../components/ui/SearchableModal'
import SuccessModal from '../../components/SuccessModal'
import { calcularPeriodoTrato } from '../../utils/shareUtils'
import PdfModal from '../../components/PdfModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import CadernetaHeader from '../../components/CadernetaHeader'
import {
  getCachedCadastroData,
  getPastoByNomeCached,
  getLoteByNomeCached,
  getLoteDetalhesComCategoriasCached,
  getFormulacaoByNomeCached,
  getRegistrosSuplementacaoByLoteCached,
  getPlanoNutricionalAtivoByLoteIdCached,
  getNotasLeituraCochoConfigCached,
  ensureLotesPastoMap,
} from '../../services/cadastroCache'
import { getLotes, getPastos, getFormulacoes } from '../../services/supabaseService'
import LoteOcupandoPastoCard from '../../components/LoteOcupandoPastoCard'
import FormulacaoDetalhesCard from '../../components/FormulacaoDetalhesCard'
import { calcularMetricasSuplementacao } from '../../utils/supplementMetrics'
import { calcularPesoProjetado } from '../../utils/pesoProjetado'
// import EspacamentoCochoCard from '../../components/EspacamentoCochoCard' // Temporariamente desabilitado
import { scrollToFirstError } from '../../utils/scrollToError'
import { useFormValidation } from '../../hooks/useFormValidation'
import { useChecklistAtivo } from '../../hooks/useChecklistAtivo'
import { useRegistroComExecucao } from '../../hooks/useRegistroComExecucao'
import { useExecucaoRotina } from '../../hooks/useExecucaoRotina'
import ObservacaoAtrasoModal from '../../components/ObservacaoAtrasoModal'
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
  { campo: 'espacamentoCochoAdequado', label: 'ESPAÇAMENTO DE COCHO ESTÁ ADEQUADO?' },
  { campo: 'cochosCondicoes', label: 'COCHOS ESTÃO EM BOAS CONDIÇÕES?' },
  { campo: 'aterroAcessoIdeal', label: 'ATERRO / ACESSO DE COCHO ESTÁ IDEAL?' },
  // { campo: 'espacamentoCocho', label: 'ESPAÇAMENTO DO COCHO (cm/cab):' }, // Temporariamente desabilitado
  { campo: 'depositoCondicoes', label: 'DEPÓSITO ESTÁ EM BOAS CONDIÇÕES?' },
]

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
  espacamentoCochoAdequado: string
  espacamentoCochoAdequadoObs: string
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
    espacamento_cocho_adequado: {
      valor: boolean
      observacao: string
    }
  }
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
  espacamentoCochoAdequado: '',
  espacamentoCochoAdequadoObs: '',
})

export default function SuplementacaoPage() {
  const navigate = useNavigate()
  const { usuario, fazenda, fazendaId, logoUrl } = useSelector((state: RootState) => state.config)
  const { ativo: checklistAtivo, loading: loadingChecklistRegras } = useChecklistAtivo('suplementacao')
  const { garantirExecucao } = useExecucaoRotina()
  const {
    showObservacaoModal,
    horariosModal,
    iniciarSalvamento,
    confirmarObservacao,
    cancelarObservacao,
  } = useRegistroComExecucao('suplementacao')

  useEffect(() => {
    garantirExecucao('suplementacao')
  }, [garantirExecucao])

  const [form, setForm] = useState<FormState>(() => makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showFezesModal, setShowFezesModal] = useState(false)
  const [formulacoesDisponiveis, setFormulacoesDisponiveis] = useState<string[]>([])
  const [kgDeposito, setKgDeposito] = useState('')
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [lotesPastoMap, setLotesPastoMap] = useState<Record<string, string>>({})
  const [detalhesLote, setDetalhesLote] = useState<any>(null)
  const [loteSemPasto, setLoteSemPasto] = useState<boolean>(false)
  const [possuiDeposito, setPossuiDeposito] = useState<boolean>(false)
  const [dadosPasto, setDadosPasto] = useState<any>(null)
  const [espacamentoCochoDetalhes, setEspacamentoCochoDetalhes] = useState<any>(null)
  const [formulacaoDetalhes, setFormulacaoDetalhes] = useState<{ nome: string; teorMs: number | null; metaConsumo: number | null; custoDietaReaisCabDia: number | null; custoMnTonelada: number | null } | null>(null)
  const [registrosSuplementacao, setRegistrosSuplementacao] = useState<any[]>([])
  const [metricasSuplementacao, setMetricasSuplementacao] = useState<any>(null)
  const [notasConfig, setNotasConfig] = useState<any[]>([])

  // Buscar detalhes da formulação quando selecionada (usa cache para offline)
  useEffect(() => {
    async function carregarDetalhesFormulacao() {
      if (!form.formulacao || !fazendaId) {
        setFormulacaoDetalhes(null)
        return
      }
      try {
        const formulacao = await getFormulacaoByNomeCached(fazendaId, form.formulacao)
        if (formulacao) {
          setFormulacaoDetalhes({
            nome: formulacao.nome,
            teorMs: formulacao.teor_ms_dieta ?? null,
            metaConsumo: formulacao.consumo_ms_percent_pv ?? null,
            custoDietaReaisCabDia: formulacao.custo_dieta_reais_cab_dia ?? null,
            custoMnTonelada: formulacao.custo_mn_tonelada ?? null,
          })
        } else {
          setFormulacaoDetalhes(null)
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes da formulação:', error)
        setFormulacaoDetalhes(null)
      }
    }
    carregarDetalhesFormulacao()
  }, [form.formulacao, fazendaId])

  // Carregar formulações ao abrir a página
  useEffect(() => {
    const loadData = async () => {
      const cache = await getCachedCadastroData()
      // Preenche imediatamente com o cache para não bloquear o modal
      if (cache && cache.formulacoes && cache.formulacoes.length > 0) {
        setFormulacoesDisponiveis(cache.formulacoes)
      }

      if (!fazendaId) return

      // Atualiza em background sem bloquear a UI com loading
      if (navigator.onLine) {
        try {
          const formulacoesData = await getFormulacoes(fazendaId)
          if (formulacoesData && formulacoesData.length > 0) {
            setFormulacoesDisponiveis(formulacoesData.map((f: any) => f.nome))
          }
        } catch (error) {
          console.error('Erro ao atualizar formulações do Supabase:', error)
        }
      }
    }
    loadData()
  }, [fazendaId])

  // Carregar lotes do cache global, com fallback para Supabase
  useEffect(() => {
    const loadData = async () => {
      const cache = await getCachedCadastroData()
      if (cache && cache.lotes && cache.lotes.length > 0) {
        setLotesDisponiveis(cache.lotes || [])
        setLotesPastoMap(await ensureLotesPastoMap(cache, fazendaId))
      } else if (fazendaId) {
        try {
          const [lotesData, pastosData] = await Promise.all([
            getLotes(fazendaId),
            getPastos(fazendaId),
          ])
          setLotesDisponiveis(Array.from(new Set(lotesData?.map((l: any) => l.nome) || [])))
          const pastoNomeById: Record<string, string> = {}
          pastosData?.forEach((p: any) => { pastoNomeById[p.id] = p.nome })
          const mapa: Record<string, string> = {}
          lotesData?.forEach((l: any) => { mapa[l.nome] = pastoNomeById[l.pasto_id] || '' })
          setLotesPastoMap(mapa)
        } catch (error) {
          console.error('Erro ao carregar lotes do Supabase:', error)
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
        setLotesDisponiveis(data.lotes || [])
        setLotesPastoMap(data.lotesPastoMap || {})
        setFormulacoesDisponiveis(data.formulacoes || [])
      }
    })

    return unsubscribe
  }, [])

  // Buscar detalhes do lote e derivar o pasto quando o lote é selecionado
  useEffect(() => {
    async function carregarDetalhesLoteEPasto() {
      if (!form.numeroLote || !fazendaId) {
        setDetalhesLote(null)
        setLoteSemPasto(false)
        setForm(prev => ({ ...prev, pasto: '', pastoId: '', loteId: '' }))
        return
      }

      try {
        const lote = await getLoteByNomeCached(fazendaId, form.numeroLote)
        if (!lote) {
          setDetalhesLote(null)
          setLoteSemPasto(false)
          setForm(prev => ({ ...prev, pasto: '', pastoId: '', loteId: '' }))
          return
        }

        const pastoNome = lote.pastos?.nome || ''
        setLoteSemPasto(!lote.pasto_id)
        setForm(prev => ({ ...prev, pasto: pastoNome, pastoId: lote.pasto_id || '', loteId: lote.id }))

        // Buscar detalhes de categorias do lote
        const categoriasDetalhes = await getLoteDetalhesComCategoriasCached(lote.id)

        // Combinar dados do lote com dados de categorias
        setDetalhesLote({
          ...lote,
          categorias: categoriasDetalhes.categorias,
          n_cabecas: categoriasDetalhes.quant_atual,
          peso_vivo_kg: categoriasDetalhes.peso_vivo_kg,
          qtd_bezerros: categoriasDetalhes.qtd_bezerros,
          categorias_raw: categoriasDetalhes.categorias_raw
        })
      } catch (error) {
        console.error('Erro ao carregar detalhes do lote:', error)
        setDetalhesLote(null)
        setLoteSemPasto(false)
        setForm(prev => ({ ...prev, pasto: '', pastoId: '', loteId: '' }))
      }
    }

    carregarDetalhesLoteEPasto()
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
        const pasto = await getPastoByNomeCached(fazendaId, form.pasto)
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
  useEffect(() => {
    if (!detalhesLote || !registrosSuplementacao || !formulacaoDetalhes) {
      setMetricasSuplementacao(null)
      return
    }

    try {
      const categorias = detalhesLote.categorias_raw || []
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

      const metricas = calcularMetricasSuplementacao(categorias, registrosSuplementacao, formulacao)
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

  // Handler específico para kgCocho: aceita apenas inteiros (sem ponto, vírgula ou decimais)
  const setKgCochoInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const apenasDigitos = e.target.value.replace(/[^0-9]/g, '')
    setForm((prev) => ({ ...prev, kgCocho: apenasDigitos }))
  }

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Calcular kg previsto com base no último kg_cocho do lote + percentual da nota selecionada
  const kgPrevisto = useMemo(() => {
    if (!form.leitura || registrosSuplementacao.length === 0 || notasConfig.length === 0) return null
    const ultimoRegistro = registrosSuplementacao[0]
    const ultimoKgCocho = Number(ultimoRegistro?.kg_cocho)
    if (!ultimoKgCocho || isNaN(ultimoKgCocho) || ultimoKgCocho <= 0) return null
    const notaConfig = notasConfig.find((n: any) => Number(n.nota) === Number(form.leitura))
    if (!notaConfig) return null
    const percentual = Number(notaConfig.percentual_ajuste)
    if (isNaN(percentual)) return null
    const previsto = ultimoKgCocho * (1 + percentual / 100)
    return Math.round(previsto * 100) / 100
  }, [form.leitura, registrosSuplementacao, notasConfig])

  // Validation rules (dynamic: skip deposito fields when pasto has no deposito)
  const validationRules = useMemo(() => {
    const base: any = {
      data: { required: true },
      numeroLote: {
        required: true,
        custom: () => {
          if (loteSemPasto) return 'Este lote não possui pasto vinculado. Vincule um pasto ao lote antes de lançar suplementação.'
          return null
        },
      },
      formulacao: { required: true },
      leitura: { required: true },
      kgCocho: {
        required: true,
        custom: (value: any) => {
          if (value && Number(value) <= 0) return 'KG no cocho deve ser maior que zero'
          return null
        },
      },
    }
    if (possuiDeposito) {
      base._kgDeposito = {
        custom: () => {
          if (!kgDeposito || kgDeposito.trim() === '' || Number(kgDeposito) <= 0) {
            return 'KG no depósito é obrigatório e deve ser maior que zero'
          }
          return null
        }
      }
    }
    if (checklistAtivo) {
      CHECKLIST_PERGUNTAS.forEach(({ campo }) => {
        if (campo !== 'depositoCondicoes') {
          base[campo] = { required: true }
        }
      })
      if (possuiDeposito) {
        base.depositoCondicoes = { required: true }
      }
    }
    return base
  }, [possuiDeposito, checklistAtivo, kgDeposito, loteSemPasto])

  const { isValid } = useFormValidation(form, validationRules)

  const executarSalvamento = async () => {
    setSalvando(true)
    setErrors([])

    // Validate form using the validation hook
    if (!isValid) {
      setSalvando(false)
      return
    }

    // Buscar categorias do lote selecionado
    let categoriasString = ''
    let categoriasArray: string[] = []
    if (detalhesLote && detalhesLote.categorias) {
      categoriasString = detalhesLote.categorias
      categoriasArray = processarCategorias(detalhesLote.categorias)
    }

    // Calcular peso vivo projetado para a data do registro (não a data de hoje)
    // Se não houver plano ativo ou dados suficientes, usar o peso atual do lote
    let pesoVivoKgLote = detalhesLote?.peso_vivo_kg ?? null
    if (form.loteId && form.data) {
      try {
        const planoParams = await getPlanoNutricionalAtivoByLoteIdCached(form.loteId)
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
      tratador: usuario,
      usuario: usuario,
      pasto: form.pasto,
      pastoId: form.pastoId,
      numeroLote: form.numeroLote,
      loteId: form.loteId,
      nCabecasLote: detalhesLote?.n_cabecas ?? null,
      qtdBezerrosLote: detalhesLote?.qtd_bezerros ?? null,
      pesoVivoKgLote,
      formulacao: form.formulacao,
      teorMs: formulacaoDetalhes?.teorMs ?? null,
      metaConsumo: formulacaoDetalhes?.metaConsumo ?? null,
      leituraCocho: form.leitura || null,
      kgCocho: form.kgCocho ? Number(form.kgCocho) : null,
      kgDeposito: kgDeposito ? Number(kgDeposito) : 0,
      possuiDeposito,
      categorias: categoriasArray,
      categoriasString: categoriasString,
      escoreFezes: form.escoreFezes || null,
      espacamentoCochoDetalhes: espacamentoCochoDetalhes,
      espacamentoCochoCmCab: form.espacamentoCochoCmCab ? Number(form.espacamentoCochoCmCab) : null,
      espacamentoCochoObs: form.espacamentoCochoObs || '',
      checklist: checklistAtivo ? {
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
        espacamento_cocho_adequado: {
          valor: form.espacamentoCochoAdequado === 'Sim',
          observacao: form.espacamentoCochoAdequadoObs || ''
        },
        ...(possuiDeposito ? {
          deposito_condicoes: {
            valor: form.depositoCondicoes === 'Sim',
            observacao: form.depositoCondicoesObs || ''
          }
        } : {})
      } : null,
    })

    setSalvando(false)
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
      setForm(makeInitial())
      setKgDeposito('')
    }
  }

  const handleSalvar = async () => {
    const podeContinuar = await iniciarSalvamento()
    if (!podeContinuar) {
      setSalvando(false)
      return
    }
    await executarSalvamento()
  }

  const handleSalvarContinuar = async () => {
    await executarSalvamento()
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
      <CadernetaHeader title="SUPLEMENTAÇÃO" cadernetaId="suplementacao" />

      {/* Logos não sticky */}
      <div className="bg-[#1a3a2a] text-white px-4 py-5">
        <div className="flex items-center justify-center gap-8 desktop-form-container">
          <FarmLogo
            farmName={fazenda}
            logoUrl={logoUrl}
            type="both"
            size="medium"
          />
        </div>
      </div>

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8 desktop-form-container">
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: Dados Principais */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="section-title">1. DADOS PRINCIPAIS</h2>
            <div className="flex items-center gap-2 shrink-0">
              {usuario && (
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 font-semibold bg-gray-100 rounded-full px-3 py-1 whitespace-nowrap">
                  <span>👤</span>
                  <span>{usuario}</span>
                </span>
              )}
              <DatePicker value={form.data} onChange={set('data')} error={getError('data')} compact inline />
            </div>
          </div>
          {lotesDisponiveis.length > 0 ? (
            <SearchableModal
              label="PASTO/LOTE"
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
              placeholder="Carregando..."
              value={form.numeroLote}
              onChange={setInput('numeroLote')}
              error={getError('numeroLote')}
              disabled
            />
          )}
          {detalhesLote && (
            <LoteOcupandoPastoCard
              detalhes={{
                nome: detalhesLote.nome || form.numeroLote,
                categorias: detalhesLote.categorias,
                n_cabecas: detalhesLote.n_cabecas,
                peso_vivo_kg: detalhesLote.peso_vivo_kg,
              }}
              processarCategorias={processarCategorias}
            />
          )}
        </div>

        {/* Seção 2: Tipo de Suplementação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. TIPO DE SUPLEMENTAÇÃO <span className="text-red-500">*</span></h2>
          <SearchableModal
            label="FORMULAÇÃO"
            value={form.formulacao}
            onChange={set('formulacao')}
            error={getError('formulacao')}
            options={formulacoesDisponiveis}
            placeholder='Buscar formulação...'
            id="formulacao"
            name="formulacao"
          />
          {formulacaoDetalhes && (
            <FormulacaoDetalhesCard
              detalhes={{
                teorMs: formulacaoDetalhes.teorMs,
                metaConsumo: formulacaoDetalhes.metaConsumo,
                pesoVivoKg: detalhesLote?.peso_vivo_kg ?? null,
                consumoMedioGeralPercentPV: metricasSuplementacao?.consumoMedioGeralPercentPV,
                consumoMedio30DiasPercentPV: metricasSuplementacao?.consumoMedio30DiasPercentPV,
                consumoMedioGeralKgMN: metricasSuplementacao?.consumoMedioGeralKgMN,
                consumoMedio30DiasKgMN: metricasSuplementacao?.consumoMedio30DiasKgMN,
                consumoMedioGeralKgMS: metricasSuplementacao?.consumoMedioGeralKgMS,
                consumoMedio30DiasKgMS: metricasSuplementacao?.consumoMedio30DiasKgMS,
                custoMedioReaisCabDia: metricasSuplementacao?.custoMedioReaisCabDia,
                motivoFalha: metricasSuplementacao?.motivoFalha,
                categoriasNaoElegiveis: metricasSuplementacao?.categoriasNaoElegiveis,
              }}
              nomeLote={form.numeroLote}
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
          {kgPrevisto != null && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <span className="text-xl">📊</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">KG Previsto</span>
                <span className="text-lg font-black text-blue-900">
                  {kgPrevisto.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kg
                </span>
              </div>
              <span className="text-xs text-blue-600 ml-auto text-right max-w-[50%]">
                {(() => {
                  const notaConfig = notasConfig.find((n: any) => Number(n.nota) === Number(form.leitura))
                  return notaConfig?.descricao || ''
                })()}
              </span>
            </div>
          )}
          <Input
            label={<span>Total Suplementado no Cocho (kg) <span className="text-red-500">*</span></span>}
            placeholder="0"
            value={form.kgCocho}
            onChange={setKgCochoInput}
            error={getError('kgCocho')}
            inputMode="numeric"
            type="text"
            pattern="[0-9]*"
          />
          {possuiDeposito && (
            <Input
              label={<span>Total Suplementado no Depósito (kg) <span className="text-red-500">*</span></span>}
              placeholder="0"
              value={kgDeposito}
              onChange={(e) => setKgDeposito(e.target.value)}
              inputMode="decimal"
              type="number"
              min="0"
              error={getError('_kgDeposito')}
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
        {loadingChecklistRegras ? (
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
            <h2 className="text-lg font-black text-gray-900 tracking-tight">4. CHECKLIST</h2>
            <p className="text-gray-500 text-center py-4">Carregando regras do checklist...</p>
          </div>
        ) : checklistAtivo ? (
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
            <h2 className="text-lg font-black text-gray-900 tracking-tight">4. CHECKLIST <span className="text-red-500">*</span></h2>

            {CHECKLIST_PERGUNTAS
              .filter(({ campo }) => campo !== 'depositoCondicoes' || possuiDeposito)
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
                {campo === 'espacamentoCochoAdequado' && espacamentoCochoDetalhes && (
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mt-2">
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
              </div>
            ))}
          </div>
        ) : null}

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

      <ObservacaoAtrasoModal
        isOpen={showObservacaoModal}
        onClose={async (observacao) => {
          if (observacao !== undefined) {
            setSalvando(true)
            await confirmarObservacao(observacao)
            await handleSalvarContinuar()
          } else {
            cancelarObservacao()
            setSalvando(false)
          }
        }}
        horarioProgramado={horariosModal.programado}
        horarioRegistro={horariosModal.registro}
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

import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, ValidationMessage } from '../../components/ui'
import { FileText, MapPin } from 'lucide-react'
import SearchableModal from '../../components/ui/SearchableModal'
import SuccessModal from '../../components/SuccessModal'
import PdfModal from '../../components/PdfModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import ChoiceGrid from '../../components/cadernetas/ChoiceGrid'
import InfoCard, { InfoCardStatus } from '../../components/cadernetas/InfoCard'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import StepperInput from '../../components/cadernetas/StepperInput'
import FormFooter from '../../components/cadernetas/FormFooter'
import EscalaRotulada from '../../components/cadernetas/EscalaRotulada'
import BannerRascunho from '../../components/BannerRascunho'
import { salvarRegistro } from '../../services/api'
import { todayBR, getCurrentTimeInTimezone } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import {
  getCachedCadastroData,
  getPastoByNomeCached,
  getLotesByPastoIdCached,
  getLoteDetalhesComCategoriasCached,
  getUltimaDataPastoEntradaCached,
  getUltimaDataPastoSaidaCached,
  getOcupacaoAtualPorLotePastoCached,
  getOcupacaoAtualPorLoteModuloCached,
} from '../../services/cadastroCache'
import { getPastos, getFuncionarios } from '../../services/supabaseService'
import { calcularDiferencaTempo } from '../../utils/calcularTempo'
import { scrollToFirstError } from '../../utils/scrollToError'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { base64ToDataUrl } from '../../utils/photoCompress'
import { processarCategorias, capitalizarCategoria } from '../../utils/categorias'
import { useFormValidation } from '../../hooks/useFormValidation'
import { useChecklistAtivo } from '../../hooks/useChecklistAtivo'
import { useSalvarRegistro } from '../../hooks/useSalvarRegistro'
import { useExecucaoRotina } from '../../hooks/useExecucaoRotina'
import { usePhotoGps } from '../../hooks/usePhotoGps'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import ObservacaoAtrasoModal from '../../components/ObservacaoAtrasoModal'
import { normalizeCategoriaToField } from '../../utils/categoriasRebanho'

import { ESCORES_CORPORAIS, ESCORES_FEZES, EQUIPE_OPTIONS, CONTADO_OPTIONS, CHAVE_TOTAL } from '../../utils/pastagensManejo'

const BASE = import.meta.env.BASE_URL

const AVALIACOES_PASTO = [
  { value: '1', label: 'Rapado', dot: 'bg-red-500' },
  { value: '2', label: 'Ideal p/ sair', dot: 'bg-green-500' },
  { value: '3', label: 'Médio', dot: 'bg-yellow-400' },
  { value: '4', label: 'Ideal p/ entrar', dot: 'bg-green-500' },
  { value: '5', label: 'Passado', dot: 'bg-red-500' },
]

// Checklist de problemas: tocar no item = a afirmação negativa se aplica; não tocar = conforme.
// O payload mantém o formato histórico: itens "invertidos" guardam S = problema; os demais guardam N = problema.
const DIAGNOSTICOS = [
  { campo: 'bebedourosCochos', label: 'BEBEDOUROS / COCHOS COM PROBLEMA', invertido: false, aviso: 'Bebedouros/cochos com problema: mostre e conte' },
  { campo: 'pastagensTaxaLotacao', label: 'PASTAGEM / LOTAÇÃO INADEQUADA', invertido: false, aviso: 'Pastagem/lotação inadequada: mostre e conte' },
  { campo: 'cercasCochosPorteiras', label: 'CERCAS / PORTEIRAS COM PROBLEMA', invertido: false, aviso: 'Cercas/porteiras com problema: mostre e conte' },
  { campo: 'animaisMachucadosDoentesBichados', label: 'ANIMAL MACHUCADO / DOENTE / BICHADO', invertido: true, aviso: 'Animal com problema: foto do animal e do brinco' },
  { campo: 'carrapatosMoscas', label: 'CARRAPATO / MOSCA', invertido: true, aviso: 'Carrapato/mosca: mostre e conte' },
  { campo: 'animaisEntreverados', label: 'ANIMAL ENTREVERADO', invertido: true, aviso: 'Animal entreverado: mostre e conte' },
  { campo: 'animalMorto', label: 'ANIMAL MORTO', invertido: true, aviso: 'Animal morto: foto do animal e do brinco' },
] as const

interface DiagnosticoItem {
  valor: string | null
  observacao: string
  fotoBase64?: string
}

interface FormState {
  data: string
  horarioManejo: string
  numeroLote: string
  loteId: string
  pastoSaida: string
  pastoSaidaId: string
  pastoSaidaAreaUtil: string
  pastoSaidaEspecie: string
  avaliacaoSaida: string
  tempoOcupacao: string
  pastoEntrada: string
  pastoEntradaId: string
  pastoEntradaAreaUtil: string
  pastoEntradaEspecie: string
  avaliacaoEntrada: string
  tempoVedacao: string
  gadoContado: string
  escoreGado: string
  escoreFezes: string
  numeroPessoasManejo: string
  equipeNomes: string[]
  categoriasQuantidades: Record<string, string>
  diagnosticos: Record<string, DiagnosticoItem>
  fotoSaidaEm: string
  fotoEntradaEm: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  horarioManejo: getCurrentTimeInTimezone().slice(0, 5),
  numeroLote: '',
  loteId: '',
  pastoSaida: '',
  pastoSaidaId: '',
  pastoSaidaAreaUtil: '',
  pastoSaidaEspecie: '',
  avaliacaoSaida: '',
  tempoOcupacao: '',
  pastoEntrada: '',
  pastoEntradaId: '',
  pastoEntradaAreaUtil: '',
  pastoEntradaEspecie: '',
  avaliacaoEntrada: '',
  tempoVedacao: '',
  gadoContado: '',
  escoreGado: '',
  escoreFezes: '',
  numeroPessoasManejo: '',
  equipeNomes: [],
  categoriasQuantidades: {},
  diagnosticos: DIAGNOSTICOS.reduce((acc, { campo }) => {
    acc[campo] = { valor: '', observacao: '' }
    return acc
  }, {} as Record<string, DiagnosticoItem>),
  fotoSaidaEm: '',
  fotoEntradaEm: '',
})

type AlvoVoz = { campo: string }

interface PastagensPastoFormProps {
  /** Seletor Pastos | Currais, renderizado no topo da tela */
  seletor?: ReactNode
}

export default function PastagensPastoForm({ seletor }: PastagensPastoFormProps) {
  const navigate = useNavigate()
  const { usuario, fazendaId } = useSelector((state: RootState) => state.config)
  const { ativo: checklistAtivo, loading: loadingChecklistRegras } = useChecklistAtivo('pastagens')
  const { garantirExecucao } = useExecucaoRotina()
  const {
    salvando,
    salvar,
    showObservacaoModal,
    horariosModal,
    onConfirmarObservacao,
    onCancelarObservacao,
  } = useSalvarRegistro('pastagens')

  useEffect(() => {
    garantirExecucao('pastagens')
  }, [garantirExecucao])

  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'pastagens', makeInitial })
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [pastosDisponiveis, setPastosDisponiveis] = useState<string[]>([])
  const [funcionariosDisponiveis, setFuncionariosDisponiveis] = useState<string[]>([])
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showEscoreModal, setShowEscoreModal] = useState(false)
  const [showFezesModal, setShowFezesModal] = useState(false)
  const [detalhesPastoSaida, setDetalhesPastoSaida] = useState<any>(null)
  const [detalhesPastoEntrada, setDetalhesPastoEntrada] = useState<any>(null)
  const [ocupacaoSaida, setOcupacaoSaida] = useState<any>(null)
  const [ocupacaoModuloSaida, setOcupacaoModuloSaida] = useState<any>(null)
  const [detalhesLote, setDetalhesLote] = useState<any>(null)
  const [campoFotoAtual, setCampoFotoAtual] = useState<string | null>(null)
  const [alvoVoz, setAlvoVoz] = useState<AlvoVoz | null>(null)
  const baseVozRef = useRef('')

  // Fotos opcionais dos pastos (com GPS, não obrigatório): saída e entrada
  const fotoSaida = usePhotoGps({ comGps: true })
  const fotoEntrada = usePhotoGps({ comGps: true })

  // Foto por item do checklist (animal doente, morto etc.)
  const {
    capturandoFoto: capturandoFotoItem,
    fotoErro: fotoErroItem,
    capturarFoto: capturarFotoItem,
    fotoInputRef: fotoItemInputRef,
    handleFileInputChange: handleFileInputItem,
  } = usePhotoGps({ comGps: false })

  const { ouvindo: ouvindoVoz, erro: vozErro, toggle: toggleVoz, parar: pararVoz } = useVoiceInput()

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Categorias dinamicas: apenas as que existem no lote, com nome real e max de cabecas
  const categoriasDoLote = useMemo(() => {
    if (!detalhesLote?.categorias_raw || !Array.isArray(detalhesLote.categorias_raw)) return null
    const cats = detalhesLote.categorias_raw
      .map((cat: any) => ({
        nome: cat.categoria as string,
        maxCabecas: cat.quant_atual || 0,
      }))
      .filter((c: { nome: string; maxCabecas: number }) => c.nome)
    if (cats.length === 0) return null
    return cats as { nome: string; maxCabecas: number }[]
  }, [detalhesLote])

  // Hora do manejo automática (somente leitura); o valor gravado é recalculado no momento de salvar
  const [horaAtual, setHoraAtual] = useState(() => getCurrentTimeInTimezone().slice(0, 5))
  useEffect(() => {
    const id = setInterval(() => setHoraAtual(getCurrentTimeInTimezone().slice(0, 5)), 30000)
    return () => clearInterval(id)
  }, [])

  // Momento em que cada foto de pasto foi tirada ("fotos marcadas com local e hora")
  useEffect(() => {
    const em = fotoSaida.fotoBase64 ? new Date().toISOString() : ''
    setForm((prev) => (!em && !prev.fotoSaidaEm ? prev : { ...prev, fotoSaidaEm: em }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotoSaida.fotoBase64])
  useEffect(() => {
    const em = fotoEntrada.fotoBase64 ? new Date().toISOString() : ''
    setForm((prev) => (!em && !prev.fotoEntradaEm ? prev : { ...prev, fotoEntradaEm: em }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotoEntrada.fotoBase64])

  const setDiagnostico = (campo: string, patch: Partial<DiagnosticoItem>) =>
    setForm((prev) => ({
      ...prev,
      diagnosticos: { ...prev.diagnosticos, [campo]: { ...prev.diagnosticos[campo], ...patch } },
    }))

  // Valor gravado quando o problema está marcado / quando está conforme (padrão, sem toque)
  const valorProblema = (invertido: boolean) => (invertido ? 'S' : 'N')
  const valorConforme = (invertido: boolean) => (invertido ? 'N' : 'S')

  const temProblema = (campo: string, invertido: boolean) =>
    form.diagnosticos[campo]?.valor === valorProblema(invertido)

  const toggleProblema = (campo: string, invertido: boolean) =>
    setDiagnostico(campo, { valor: temProblema(campo, invertido) ? '' : valorProblema(invertido) })

  const handleTirarFotoItem = async (campo: string) => {
    setCampoFotoAtual(campo)
    const base64 = await capturarFotoItem()
    // Nativo retorna a foto aqui; no web o retorno vem pelo input file hidden
    if (base64) setDiagnostico(campo, { fotoBase64: base64 })
  }

  const handleFotoInputItem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const result = await handleFileInputItem(e)
    if (result?.fotoBase64 && campoFotoAtual) setDiagnostico(campoFotoAtual, { fotoBase64: result.fotoBase64 })
  }

  // Ditado: o texto parcial é acrescentado ao que já existia quando a gravação começou.
  const handleFalar = async (campo: string) => {
    if (ouvindoVoz) {
      await pararVoz()
      if (alvoVoz?.campo === campo) return
    }
    setAlvoVoz({ campo })
    baseVozRef.current = (form.diagnosticos[campo]?.observacao || '').trim()
    await toggleVoz((parcial) => {
      const texto = baseVozRef.current ? `${baseVozRef.current} ${parcial}` : parcial
      setDiagnostico(campo, { observacao: texto })
    })
  }

  const ouvindoCampo = (campo: string) => ouvindoVoz && alvoVoz?.campo === campo

  const handleEquipe = (value: string) => {
    const numPessoas = Number(value) || 0
    setForm((prev) => ({
      ...prev,
      numeroPessoasManejo: value,
      equipeNomes: Array.from({ length: numPessoas }, (_, i) => prev.equipeNomes[i] || ''),
    }))
  }

  const setCategoriaQtd = (chave: string) => (val: string) =>
    setForm((prev) => ({ ...prev, categoriasQuantidades: { ...prev.categoriasQuantidades, [chave]: val } }))

  // Carregar pastos e lotes do cache global, com fallback para Supabase
  useEffect(() => {
    const loadData = async () => {
      const cache = await getCachedCadastroData()
      if (cache && cache.pastos && cache.pastos.length > 0) {
        setPastosDisponiveis(cache.pastos || [])
        setFuncionariosDisponiveis(cache.funcionarios || [])
      } else if (fazendaId) {
        // Fallback: carregar do Supabase se cache estiver vazio
        try {
          const [pastosData, funcionariosData] = await Promise.all([
            getPastos(fazendaId),
            getFuncionarios(fazendaId)
          ])
          setPastosDisponiveis(pastosData?.map((p: any) => p.nome) || [])
          setFuncionariosDisponiveis(funcionariosData?.map((f: any) => f.nome) || [])
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
      console.log('[PastagensPage] Cache atualizado, recarregando dados')
      if (data) {
        setPastosDisponiveis(data.pastos || [])
        setFuncionariosDisponiveis(data.funcionarios || [])
      }
    })

    return unsubscribe
  }, [])

  // Buscar detalhes do pasto de saída quando selecionado
  useEffect(() => {
    async function carregarDetalhesPastoSaida() {
      if (!form.pastoSaida || !fazendaId) {
        setDetalhesPastoSaida(null)
        setOcupacaoSaida(null)
        setOcupacaoModuloSaida(null)
        setForm(prev => ({ ...prev, numeroLote: '', loteId: '', pastoSaidaId: '', categoriasQuantidades: {} }))
        setDetalhesLote(null)
        return
      }

      try {
        // Buscar detalhes do pasto
        const pasto = await getPastoByNomeCached(fazendaId, form.pastoSaida)
        if (!pasto) {
          setErrors([{ field: 'pastoSaida', message: 'Pasto não encontrado. Selecione outro pasto.' }])
          set('pastoSaida')('')
          return
        }

        // Verificar se há um lote no pasto de saída (fonte de verdade: tabela lotes)
        const lotes = await getLotesByPastoIdCached(fazendaId, pasto.id)
        if (!lotes || lotes.length === 0) {
          setDetalhesPastoSaida(null)
          setOcupacaoSaida(null)
          setOcupacaoModuloSaida(null)
          setForm(prev => ({ ...prev, numeroLote: '', loteId: '', categoriasQuantidades: {} }))
          setDetalhesLote(null)
          setErrors([{ field: 'pastoSaida', message: 'Este pasto está vazio (não possui lote). Selecione outro pasto.' }])
          set('pastoSaida')('')
          return
        }

        // Buscar última data de entrada para calcular tempo de ocupação
        const ultimaDataEntrada = await getUltimaDataPastoEntradaCached(fazendaId, form.pastoSaida)
        const tempoOcupacao = ultimaDataEntrada ? calcularDiferencaTempo(ultimaDataEntrada) : 'Primeiro uso'

        setDetalhesPastoSaida({
          areaUtil: pasto.area_util_ha?.toString() || '',
          especie: pasto.especie || '',
          alturaEntrada: pasto.altura_entrada_cm?.toString() || '',
          alturaSaida: pasto.altura_saida_cm?.toString() || '',
        })
        // Atualizar o campo tempoOcupação no formulário
        set('tempoOcupacao')(tempoOcupacao)
        // Atualizar campos de detalhes do pasto no formulário
        set('pastoSaidaId')(pasto.id || '')
        set('pastoSaidaAreaUtil')(pasto.area_util_ha?.toString() || '')
        set('pastoSaidaEspecie')(pasto.especie || '')
        // Remover erro se existia
        setErrors(prev => prev.filter(e => e.field !== 'pastoSaida'))

        // Auto-popular com o primeiro lote (único permitido)
        const lotePrincipal = lotes[0]
        const categoriasDetalhes = await getLoteDetalhesComCategoriasCached(lotePrincipal.id)
        setDetalhesLote({
          ...lotePrincipal,
          categorias: categoriasDetalhes.categorias,
          n_cabecas: categoriasDetalhes.quant_atual,
          peso_vivo_kg: categoriasDetalhes.peso_vivo_kg,
          qtd_bezerros: categoriasDetalhes.qtd_bezerros,
          categorias_raw: categoriasDetalhes.categorias_raw
        })
        setForm(prev => ({
          ...prev,
          numeroLote: lotePrincipal.nome || '',
          loteId: lotePrincipal.id,
          categoriasQuantidades: {}
        }))

        // Buscar métricas de ocupação atual
        try {
          const ocupacao = await getOcupacaoAtualPorLotePastoCached(lotePrincipal.id, pasto.id)
          if (ocupacao) {
            setOcupacaoSaida({
              metaDias: ocupacao.meta_intervalo_ocupacao_dias,
              periodoDias: ocupacao.periodo_ocupacao_dias,
              periodoHoras: ocupacao.periodo_ocupacao_horas,
              desvioPercentual: ocupacao.desvio_percentual_atual,
              diasAcimaMeta: ocupacao.dias_acima_meta,
              taxaLotacao: ocupacao.taxa_lotacao_ua_ha,
              metaExcedida: ocupacao.meta_excedida,
            })
          } else {
            setOcupacaoSaida(null)
          }

          // Buscar métricas de ocupação do módulo
          if (pasto.modulo_id) {
            try {
              const ocupacaoModulo = await getOcupacaoAtualPorLoteModuloCached(lotePrincipal.id, pasto.modulo_id)
              if (ocupacaoModulo) {
                setOcupacaoModuloSaida({
                  taxaLotacao: ocupacaoModulo.taxa_lotacao_ua_ha,
                })
              } else {
                setOcupacaoModuloSaida(null)
              }
            } catch (moduloError) {
              console.error('Erro ao carregar ocupação do módulo:', moduloError)
              setOcupacaoModuloSaida(null)
            }
          } else {
            setOcupacaoModuloSaida(null)
          }
        } catch (ocupacaoError) {
          console.error('Erro ao carregar ocupação do pasto:', ocupacaoError)
          setOcupacaoSaida(null)
          setOcupacaoModuloSaida(null)
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do pasto de saída:', error)
        setDetalhesPastoSaida(null)
        setOcupacaoSaida(null)
        setOcupacaoModuloSaida(null)
        setForm(prev => ({ ...prev, numeroLote: '', loteId: '', categoriasQuantidades: {} }))
        setDetalhesLote(null)
      }
    }

    carregarDetalhesPastoSaida()
  }, [form.pastoSaida, fazendaId])

  // Buscar detalhes do pasto de entrada quando selecionado
  useEffect(() => {
    async function carregarDetalhesPastoEntrada() {
      if (!form.pastoEntrada || !fazendaId) {
        setDetalhesPastoEntrada(null)
        set('pastoEntradaId')('')
        return
      }

      try {
        // Buscar o pasto pelo nome para obter o ID
        const pasto = await getPastoByNomeCached(fazendaId, form.pastoEntrada)
        if (!pasto) {
          setDetalhesPastoEntrada(null)
          setErrors([{ field: 'pastoEntrada', message: 'Pasto não encontrado. Selecione outro pasto.' }])
          set('pastoEntrada')('')
          return
        }

        // Verificar se o pasto de entrada já possui um lote (bloquear se sim)
        const lotesEntrada = await getLotesByPastoIdCached(fazendaId, pasto.id)
        if (lotesEntrada && lotesEntrada.length > 0) {
          setDetalhesPastoEntrada(null)
          setErrors([{ field: 'pastoEntrada', message: `Este pasto já possui o lote ${lotesEntrada[0].nome}.` }])
          set('pastoEntrada')('')
          return
        }

        // Buscar última data de saída para calcular tempo de vedação
        const ultimaDataSaida = await getUltimaDataPastoSaidaCached(fazendaId, form.pastoEntrada)
        const tempoVedacao = ultimaDataSaida ? calcularDiferencaTempo(ultimaDataSaida) : 'Primeiro uso'
        
        setDetalhesPastoEntrada({
          areaUtil: pasto.area_util_ha?.toString() || '',
          especie: pasto.especie || '',
          alturaEntrada: pasto.altura_entrada_cm?.toString() || '',
          alturaSaida: pasto.altura_saida_cm?.toString() || '',
        })
        // Atualizar o campo tempoVedação no formulário
        set('tempoVedacao')(tempoVedacao)
        // Atualizar campos de detalhes do pasto no formulário
        set('pastoEntradaId')(pasto.id || '')
        set('pastoEntradaAreaUtil')(pasto.area_util_ha?.toString() || '')
        set('pastoEntradaEspecie')(pasto.especie || '')
        // Remover erro se existia
        setErrors(prev => prev.filter(e => e.field !== 'pastoEntrada'))
      } catch (error) {
        console.error('Erro ao carregar detalhes do pasto de entrada:', error)
        setDetalhesPastoEntrada(null)
      }
    }

    carregarDetalhesPastoEntrada()
  }, [form.pastoEntrada, fazendaId])


  const total = Object.values(form.categoriasQuantidades).reduce(
    (acc, v) => acc + (Number(v) || 0), 0
  )
  const totalLote = detalhesLote?.n_cabecas || 0
  const diferenca = total - totalLote
  const mostrarDivergencia =
    form.gadoContado === 'Sim' && !!detalhesLote && Object.values(form.categoriasQuantidades).some((v) => v !== '')

  // Validation rules
  const validationRules: any = {
    data: { required: true },
    numeroLote: { required: true },
    pastoSaida: { required: true },
    avaliacaoSaida: { required: true },
    pastoEntrada: { required: true },
    avaliacaoEntrada: { required: true },
    gadoContado: { required: true },
    escoreGado: { required: true },
    escoreFezes: { required: true },
    numeroPessoasManejo: { required: true },
  }

  // Add dynamic validation for animal categories when gadoContado is 'Sim'
  if (form.gadoContado === 'Sim') {
    validationRules.categorias = {
      custom: () => {
        const hasAnyValue = Object.values(form.categoriasQuantidades).some(
          (v) => Number(v) > 0
        )
        if (!hasAnyValue) return 'Preencha pelo menos uma categoria de animais'
        return null
      }
    }
    // Validar max de cabecas por categoria quando o lote for conhecido
    if (categoriasDoLote) {
      categoriasDoLote.forEach(({ nome, maxCabecas }) => {
        validationRules[`cat_${nome}`] = {
          custom: () => {
            const val = Number(form.categoriasQuantidades[nome]) || 0
            if (val > maxCabecas) {
              return `Máximo: ${maxCabecas} cabeças`
            }
            return null
          }
        }
      })
    }
  }

  // Add dynamic validation for equipeNomes when numeroPessoasManejo is selected
  if (form.numeroPessoasManejo && Number(form.numeroPessoasManejo) > 0) {
    validationRules.equipeNomes = {
      custom: () => {
        const numPessoas = Number(form.numeroPessoasManejo)
        const nomesPreenchidos = form.equipeNomes.filter((nome) => nome && nome.trim() !== '').length
        if (nomesPreenchidos < numPessoas) {
          return `Preencha o nome de todas as ${numPessoas} pessoas`
        }
        return null
      }
    }
  }

  const { isValid } = useFormValidation(form, validationRules)

  const executarSalvamento = async () => {
    setErrors([])

    // Validar que pasto de saída e entrada não são iguais
    if (form.pastoSaida && form.pastoEntrada && form.pastoSaida === form.pastoEntrada) {
      setErrors([{ field: 'pastoEntrada', message: 'O pasto de entrada não pode ser igual ao pasto de saída' }])
      return
    }

    // Calcular total de animais baseado na resposta de gadoContado
    let totalAnimais = 0
    let categoriasDetalhes: { nome: string; quant_atual: number; quant_informada: number }[] = []
    // Mapa para preencher campos fixos do schema a partir das categorias dinamicas
    const camposFixos: Record<string, number> = {
      vaca: 0, touro: 0, bezerro: 0, boiGordo: 0, boiMagro: 0,
      garrote: 0, novilha: 0, tropa: 0, outros: 0,
    }
    if (form.gadoContado === 'Sim') {
      if (categoriasDoLote) {
        categoriasDetalhes = categoriasDoLote.map(({ nome, maxCabecas }) => ({
          nome,
          quant_atual: maxCabecas,
          quant_informada: Number(form.categoriasQuantidades[nome]) || 0,
        }))
        totalAnimais = categoriasDetalhes.reduce((acc, c) => acc + c.quant_informada, 0)
        // Preencher campos fixos para compatibilidade com schema existente
        for (const c of categoriasDetalhes) {
          const field = normalizeCategoriaToField(c.nome)
          if (field && field in camposFixos) {
            camposFixos[field] += c.quant_informada
          }
        }
      } else {
        totalAnimais = Object.values(form.categoriasQuantidades).reduce(
          (acc, v) => acc + (Number(v) || 0), 0
        )
      }
    } else if (form.gadoContado === 'Não' && detalhesLote) {
      // n_cabecas já inclui as categorias ao pé; não somar qtd_bezerros.
      totalAnimais = detalhesLote.n_cabecas || 0
    }

    // Avaliação geral: sem toque = conforme. Observação/foto só fazem sentido com o problema marcado.
    const avaliacaoGeral: Record<string, { valor: string; observacao: string; fotoBase64?: string }> = {}
    const flat: Record<string, string> = {}
    for (const { campo, invertido } of DIAGNOSTICOS) {
      const d = form.diagnosticos[campo]
      const problema = d?.valor === valorProblema(invertido)
      const valor = problema ? valorProblema(invertido) : valorConforme(invertido)
      const observacao = problema ? d?.observacao || '' : ''
      avaliacaoGeral[campo] = problema && d?.fotoBase64 ? { valor, observacao, fotoBase64: d.fotoBase64 } : { valor, observacao }
      flat[campo] = valor
      flat[`${campo}Obs`] = observacao
    }

    const result = await salvarRegistro('pastagens', {
      data: form.data,
      horarioManejo: getCurrentTimeInTimezone().slice(0, 5),
      manejador: usuario,
      usuario: usuario,
      numeroLote: form.numeroLote,
      loteId: form.loteId,
      pastoSaida: form.pastoSaida,
      pastoSaidaId: form.pastoSaidaId || null,
      pastoSaidaAreaUtil: form.pastoSaidaAreaUtil,
      pastoSaidaEspecie: form.pastoSaidaEspecie,
      avaliacaoSaida: form.avaliacaoSaida ? Number(form.avaliacaoSaida) : 0,
      tempoOcupacao: form.tempoOcupacao || null,
      pastoEntrada: form.pastoEntrada,
      pastoEntradaId: form.pastoEntradaId || null,
      pastoEntradaAreaUtil: form.pastoEntradaAreaUtil,
      pastoEntradaEspecie: form.pastoEntradaEspecie,
      avaliacaoEntrada: form.avaliacaoEntrada ? Number(form.avaliacaoEntrada) : 0,
      tempoVedacao: form.tempoVedacao || null,
      gadoContado: form.gadoContado,
      totalAnimais: totalAnimais,
      vaca: camposFixos.vaca,
      touro: camposFixos.touro,
      boiGordo: camposFixos.boiGordo,
      boiMagro: camposFixos.boiMagro,
      garrote: camposFixos.garrote,
      bezerro: camposFixos.bezerro,
      novilha: camposFixos.novilha,
      tropa: camposFixos.tropa,
      outros: camposFixos.outros,
      categorias_detalhes: categoriasDetalhes.length > 0 ? categoriasDetalhes : null,
      escoreGado: form.escoreGado ? Number(form.escoreGado) : 0,
      ...flat,
      avaliacaoGeral: checklistAtivo ? avaliacaoGeral : null,
      escoreFezes: form.escoreFezes || null,
      numeroPessoasManejo: form.numeroPessoasManejo ? Number(form.numeroPessoasManejo) : 0,
      equipe_nomes: form.equipeNomes || null,
      fotoSaidaBase64: fotoSaida.fotoBase64 || null,
      fotoSaidaLatitude: fotoSaida.latitude,
      fotoSaidaLongitude: fotoSaida.longitude,
      fotoSaidaGpsAccuracy: fotoSaida.gpsAccuracy,
      fotoSaidaEm: form.fotoSaidaEm || null,
      fotoEntradaBase64: fotoEntrada.fotoBase64 || null,
      fotoEntradaLatitude: fotoEntrada.latitude,
      fotoEntradaLongitude: fotoEntrada.longitude,
      fotoEntradaGpsAccuracy: fotoEntrada.gpsAccuracy,
      fotoEntradaEm: form.fotoEntradaEm || null,
    })

    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      resetarTudo()
    }
  }

  const resetarTudo = () => {
    limparRascunho()
    fotoSaida.limpar()
    fotoEntrada.limpar()
    setErrors([])
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/')
  }

  // Status de ocupação do pasto de saída em relação à meta
  const saidaStatus: InfoCardStatus | undefined = (() => {
    if (!ocupacaoSaida) return undefined
    if (ocupacaoSaida.metaDias == null) return { tone: 'neutral', text: 'Sem meta de ocupação definida' }
    if (ocupacaoSaida.metaExcedida) {
      const extra = ocupacaoSaida.desvioPercentual != null ? ` (+${ocupacaoSaida.desvioPercentual}%)` : ''
      return { tone: 'danger', text: `Ocupação acima da meta${extra}` }
    }
    return { tone: 'success', text: `Dentro da meta de ocupação (${ocupacaoSaida.metaDias} dias)` }
  })()
  const saidaProgress =
    ocupacaoSaida?.metaDias && ocupacaoSaida.periodoDias != null ? ocupacaoSaida.periodoDias / ocupacaoSaida.metaDias : null

  const categoriasLoteStr = detalhesLote?.categorias
    ? processarCategorias(detalhesLote.categorias).map(capitalizarCategoria).join(', ')
    : ''

  const pendenciaTexto = (() => {
    if (!form.pastoSaida) return 'Falta escolher o pasto de saída'
    if (!form.avaliacaoSaida) return 'Falta a avaliação do pasto de saída'
    if (!form.pastoEntrada) return 'Falta escolher o pasto de entrada'
    if (!form.avaliacaoEntrada) return 'Falta a avaliação do pasto de entrada'
    if (!form.gadoContado) return 'Falta informar se o gado foi contado'
    if (form.gadoContado === 'Sim' && !Object.values(form.categoriasQuantidades).some((v) => Number(v) > 0)) return 'Falta informar a quantidade de animais'
    if (!form.escoreGado) return 'Falta o escore corporal'
    if (!form.escoreFezes) return 'Falta o escore de fezes'
    if (!form.numeroPessoasManejo) return 'Falta o número de pessoas no manejo'
    if (Number(form.numeroPessoasManejo) > 0 && form.equipeNomes.some((n) => !n || !n.trim())) return 'Falta o nome de todas as pessoas da equipe'
    return undefined
  })()

  const chipPop = (onClick: () => void, texto: string) => (
    <button
      type="button"
      onClick={onClick}
      className="flex !min-h-0 shrink-0 items-center gap-1.5 rounded-lg bg-yellow-400 px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-black transition-colors hover:bg-yellow-300 active:scale-[0.98]"
    >
      <FileText className="h-3.5 w-3.5" strokeWidth={2.5} />
      {texto}
    </button>
  )

  const rotulo = 'text-[13px] font-bold uppercase text-gray-900'

  /** Bloco de foto opcional do pasto (com GPS e hora). */
  const blocoFotoPasto = (tipo: 'saida' | 'entrada') => {
    const h = tipo === 'saida' ? fotoSaida : fotoEntrada
    const nomePasto = tipo === 'saida' ? form.pastoSaida : form.pastoEntrada
    const campo = tipo === 'saida' ? 'fotoSaida' : 'fotoEntrada'
    return (
      <div className="flex flex-col gap-2" data-field={campo}>
        <label className={rotulo}>
          Foto do pasto de {tipo === 'saida' ? 'saída' : 'entrada'} (opcional)
        </label>
        {h.fotoBase64 ? (
          <div className="flex items-stretch gap-2">
            <div className="relative h-24 flex-1 overflow-hidden rounded-xl border-2 border-green-500">
              <img src={base64ToDataUrl(h.fotoBase64)} alt={`Foto do pasto ${nomePasto}`} className="h-full w-full object-cover" />
              <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-sm font-black text-white">✓</span>
              <span className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1 text-center text-xs font-bold text-white">{nomePasto}</span>
            </div>
            <button
              type="button"
              onClick={() => h.capturarFotoComGps()}
              disabled={h.capturandoFoto}
              className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 transition-colors hover:border-gray-400 active:scale-[0.99] disabled:opacity-60"
            >
              <span className="text-lg leading-none">📷</span>
              {h.capturandoFoto ? 'Capturando...' : 'Refazer foto'}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => h.capturarFotoComGps()}
            disabled={h.capturandoFoto || !nomePasto}
            className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-brand-900 px-3 py-2.5 text-white transition-colors hover:bg-brand-800 active:scale-[0.99] disabled:opacity-60"
          >
            <span className="text-lg leading-none">📷</span>
            <span className="text-sm font-extrabold uppercase tracking-wide">
              {h.capturandoFoto ? 'Capturando...' : nomePasto ? `Tirar foto do ${nomePasto}` : 'Escolha o pasto primeiro'}
            </span>
          </button>
        )}
        {h.fotoBase64 && (
          h.latitude != null && h.longitude != null ? (
            <InfoStrip tone="success" icon="📍">
              GPS marcado: {h.latitude.toFixed(5)}, {h.longitude.toFixed(5)}
              {h.gpsAccuracy != null && ` (±${Math.round(h.gpsAccuracy)} m)`}
            </InfoStrip>
          ) : (
            <InfoStrip tone="warning" icon="📍">Foto sem localização: GPS indisponível{h.gpsErro ? ` (${h.gpsErro})` : ''}</InfoStrip>
          )
        )}
        {h.fotoErro && <InfoStrip tone="danger">{h.fotoErro}</InfoStrip>}
        {getError(campo) && <p className="text-base font-semibold text-red-700">{getError(campo)}</p>}
        <input
          ref={h.fotoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={h.handleFileInputChange}
          className="hidden"
        />
      </div>
    )
  }

  return (
    <>
      <CadernetaLayout
        title="MANEJO PASTAGENS"
        cadernetaId="pastagens"
        dateContent={<DatePicker value={form.data} onChange={set('data')} variant="header" compact inline />}
      >
        {seletor}
        <BannerRascunho visible={rascunhoRestaurado} onConfirmar={confirmarRascunho} onDescartar={descartarRascunho} />
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* 1. Entrada e saída */}
        <CadernetaSection numero={1} titulo="Entrada e saída">
          <InfoStrip tone="neutral" icon="🕐">Horário do manejo: {horaAtual} (automático)</InfoStrip>

          {/* Pasto de saída */}
          {pastosDisponiveis.length > 0 ? (
            <SearchableModal
              label={<span>PASTO DE SAÍDA <span className="text-red-500">*</span></span>}
              value={form.pastoSaida}
              onChange={set('pastoSaida')}
              error={getError('pastoSaida')}
              options={pastosDisponiveis.filter(p => p !== form.pastoEntrada)}
              placeholder="Buscar pasto..."
              id="pastoSaida"
              name="pastoSaida"
            />
          ) : (
            <Input
              label={<span>PASTO DE SAÍDA <span className="text-red-500">*</span></span>}
              placeholder="Carregando..."
              value={form.pastoSaida}
              onChange={setInput('pastoSaida')}
              error={getError('pastoSaida')}
              disabled
              id="pastoSaida"
            />
          )}
          {detalhesPastoSaida && (
            <InfoCard
              icon={MapPin}
              title={form.pastoSaida}
              subtitle={form.numeroLote ? `Lote ${form.numeroLote}` : 'Sem lote'}
              stats={[
                { label: 'Área útil', value: detalhesPastoSaida.areaUtil ? `${detalhesPastoSaida.areaUtil} ha` : '-', span: 1 },
                { label: 'Cabeças', value: detalhesLote?.n_cabecas != null ? String(detalhesLote.n_cabecas) : '-', span: 1 },
                { label: 'Ocupação', value: form.tempoOcupacao || '-', span: 1 },
                { label: 'Altura saída', value: detalhesPastoSaida.alturaSaida ? `${detalhesPastoSaida.alturaSaida} cm` : '-', span: 1 },
                ...(ocupacaoSaida?.taxaLotacao != null ? [{ label: 'Lotação', value: `${ocupacaoSaida.taxaLotacao} UA/ha`, span: 1 }] : []),
                { label: 'Espécie', value: detalhesPastoSaida.especie || '-', span: 1 },
                ...(ocupacaoModuloSaida?.taxaLotacao != null ? [{ label: 'Lotação módulo', value: `${ocupacaoModuloSaida.taxaLotacao} UA/ha`, span: 2 }] : []),
                ...(categoriasLoteStr ? [{ label: 'Categorias', value: categoriasLoteStr, span: 2 }] : []),
              ]}
              progress={saidaProgress}
              status={saidaStatus}
            />
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label className={rotulo}>
                Avaliação do pasto de saída <span className="text-red-500">*</span>
              </label>
              {chipPop(() => setShowPdfModal(true), 'POP Pastagens')}
            </div>
            <EscalaRotulada options={AVALIACOES_PASTO} value={form.avaliacaoSaida} onChange={set('avaliacaoSaida')} dataField="avaliacaoSaida" />
            {getError('avaliacaoSaida') && <p className="text-base font-semibold text-red-700">{getError('avaliacaoSaida')}</p>}
          </div>

          {blocoFotoPasto('saida')}

          {/* Pasto de entrada */}
          {pastosDisponiveis.length > 0 ? (
            <SearchableModal
              label={<span>PASTO DE ENTRADA <span className="text-red-500">*</span></span>}
              value={form.pastoEntrada}
              onChange={set('pastoEntrada')}
              error={getError('pastoEntrada')}
              options={pastosDisponiveis.filter(p => p !== form.pastoSaida)}
              placeholder="Buscar pasto de entrada..."
              id="pastoEntrada"
              name="pastoEntrada"
            />
          ) : (
            <Input
              label={<span>PASTO DE ENTRADA <span className="text-red-500">*</span></span>}
              placeholder="Carregando..."
              value={form.pastoEntrada}
              onChange={setInput('pastoEntrada')}
              error={getError('pastoEntrada')}
              disabled
              id="pastoEntrada"
            />
          )}
          {detalhesPastoEntrada && (
            <InfoCard
              icon={MapPin}
              title={form.pastoEntrada}
              subtitle="Pasto vazio, pronto para receber"
              stats={[
                { label: 'Área útil', value: detalhesPastoEntrada.areaUtil ? `${detalhesPastoEntrada.areaUtil} ha` : '-', span: 1 },
                { label: 'Altura entrada', value: detalhesPastoEntrada.alturaEntrada ? `${detalhesPastoEntrada.alturaEntrada} cm` : '-', span: 1 },
                { label: 'Vedação', value: form.tempoVedacao || '-', span: 2 },
                { label: 'Espécie', value: detalhesPastoEntrada.especie || '-', span: 2 },
              ]}
            />
          )}

          <div className="flex flex-col gap-2">
            <label className={rotulo}>
              Avaliação do pasto de entrada <span className="text-red-500">*</span>
            </label>
            <EscalaRotulada options={AVALIACOES_PASTO} value={form.avaliacaoEntrada} onChange={set('avaliacaoEntrada')} dataField="avaliacaoEntrada" />
            {getError('avaliacaoEntrada') && <p className="text-base font-semibold text-red-700">{getError('avaliacaoEntrada')}</p>}
          </div>

          {blocoFotoPasto('entrada')}
          <InfoStrip tone="neutral" icon="📍">As fotos ficam marcadas com o local (GPS) e a hora.</InfoStrip>
        </CadernetaSection>

        {/* 2. Quantidade de animais */}
        <CadernetaSection numero={2} titulo="Quantidade de animais">
          <div>
            <label className="mb-2 block text-[15px] font-bold text-gray-900">
              O GADO FOI CONTADO? <span className="text-red-500">*</span>
            </label>
            <ChoiceGrid
              options={CONTADO_OPTIONS}
              value={form.gadoContado}
              onChange={set('gadoContado')}
              cols={2}
              dataField="gadoContado"
            />
            {getError('gadoContado') && (
              <p className="mt-2 text-base font-semibold text-red-700">{getError('gadoContado')}</p>
            )}
          </div>

          {form.gadoContado === 'Sim' && (
            <>
              {!form.pastoSaida && <InfoStrip tone="warning" icon="⚠️">Escolha o pasto de saída para ver as categorias do lote</InfoStrip>}
              {getError('categorias') && <p className="text-base font-semibold text-red-700">⚠️ {getError('categorias')}</p>}
              {(categoriasDoLote
                ? categoriasDoLote.map((c) => ({ chave: c.nome, nome: c.nome, cadastro: c.maxCabecas }))
                : [{ chave: CHAVE_TOTAL, nome: 'Total de cabeças', cadastro: totalLote }]
              ).map((cat) => (
                <div key={cat.chave} className="flex flex-col gap-2" data-field={`cat_${cat.chave}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[15px] font-bold capitalize text-gray-900">
                      {categoriasDoLote && categoriasDoLote.length === 1 ? 'Quantos passaram?' : cat.nome}
                    </span>
                    {detalhesLote && <span className="text-sm font-semibold text-gray-500">cadastro: {cat.cadastro} cab.</span>}
                  </div>
                  <StepperInput
                    value={form.categoriasQuantidades[cat.chave] ?? ''}
                    onChange={setCategoriaQtd(cat.chave)}
                    min={0}
                    max={categoriasDoLote ? cat.cadastro : undefined}
                    allowDecimals={false}
                    suffix="cabeças"
                    error={getError(`cat_${cat.chave}`)}
                  />
                </div>
              ))}
              {categoriasDoLote && categoriasDoLote.length > 1 && total > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <span className="text-sm font-bold text-gray-600">TOTAL CONTADO</span>
                  <span className="text-xl font-extrabold text-gray-900">{total} cabeças</span>
                </div>
              )}
              {mostrarDivergencia && (
                diferenca === 0 ? (
                  <InfoStrip tone="success" icon="✅">Bateu com o lote ({totalLote})</InfoStrip>
                ) : (
                  <InfoStrip tone="danger" icon="⚠️">
                    {diferenca < 0
                      ? `Faltam ${Math.abs(diferenca)} cabeças (cadastro: ${totalLote})`
                      : `Excedeu ${diferenca} cabeças (cadastro: ${totalLote})`}
                  </InfoStrip>
                )
              )}
            </>
          )}

          {form.gadoContado === 'Não' && detalhesLote && (
            <InfoStrip tone="neutral">Será registrado o cadastro do lote: {totalLote} cabeças manejadas</InfoStrip>
          )}
        </CadernetaSection>

        {/* 3. Avaliação do gado e equipe */}
        <CadernetaSection numero={3} titulo="Avaliação do gado e equipe">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label className={rotulo}>
                Escore corporal <span className="text-red-500">*</span>
              </label>
              {chipPop(() => setShowEscoreModal(true), 'POP Escore')}
            </div>
            <EscalaRotulada options={ESCORES_CORPORAIS} value={form.escoreGado} onChange={set('escoreGado')} dataField="escoreGado" />
            {getError('escoreGado') && <p className="text-base font-semibold text-red-700">{getError('escoreGado')}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label className={rotulo}>
                Escore de fezes <span className="text-red-500">*</span>
              </label>
              {chipPop(() => setShowFezesModal(true), 'POP Fezes')}
            </div>
            <EscalaRotulada options={ESCORES_FEZES} value={form.escoreFezes} onChange={set('escoreFezes')} dataField="escoreFezes" />
            {getError('escoreFezes') && <p className="text-base font-semibold text-red-700">{getError('escoreFezes')}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className={rotulo}>
              Nº pessoas no manejo <span className="text-red-500">*</span>
            </label>
            <ChoiceGrid options={EQUIPE_OPTIONS} value={form.numeroPessoasManejo} onChange={handleEquipe} cols={6} size="sm" dataField="numeroPessoasManejo" />
            {getError('numeroPessoasManejo') && <p className="text-base font-semibold text-red-700">{getError('numeroPessoasManejo')}</p>}
          </div>

          {Number(form.numeroPessoasManejo) > 0 && (
            <div className="flex flex-col gap-3">
              {getError('equipeNomes') && <p className="text-sm font-semibold text-red-600">{getError('equipeNomes')}</p>}
              {Array.from({ length: Number(form.numeroPessoasManejo) }).map((_, index) => (
                funcionariosDisponiveis.length > 0 ? (
                  <SearchableModal
                    key={index}
                    label={<span>Nome da {index + 1}ª pessoa <span className="text-red-500">*</span></span>}
                    value={form.equipeNomes[index] || ''}
                    onChange={(val) =>
                      setForm((prev) => {
                        const nomes = [...prev.equipeNomes]
                        nomes[index] = val
                        return { ...prev, equipeNomes: nomes }
                      })
                    }
                    options={funcionariosDisponiveis}
                    placeholder="Buscar funcionário..."
                    id={`equipeNome-${index}`}
                    name={`equipeNome-${index}`}
                  />
                ) : (
                  <Input
                    key={index}
                    label={<span>Nome da {index + 1}ª pessoa <span className="text-red-500">*</span></span>}
                    placeholder="Nome"
                    value={form.equipeNomes[index] || ''}
                    onChange={(e) =>
                      setForm((prev) => {
                        const nomes = [...prev.equipeNomes]
                        nomes[index] = e.target.value
                        return { ...prev, equipeNomes: nomes }
                      })
                    }
                  />
                )
              ))}
            </div>
          )}
        </CadernetaSection>

        {/* 4. Avaliação geral */}
        {loadingChecklistRegras ? (
          <CadernetaSection numero={4} titulo="Avaliação geral">
            <p className="py-4 text-center text-sm text-gray-500">Carregando regras do checklist...</p>
          </CadernetaSection>
        ) : checklistAtivo ? (
          <CadernetaSection numero={4} titulo="Avaliação geral">
            <p className="-mt-2 text-sm text-gray-500">
              Toque em um item se encontrar o problema. Não tocar significa que está tudo certo.
            </p>
            {DIAGNOSTICOS.map(({ campo, label, invertido, aviso }) => {
              const item = form.diagnosticos[campo]
              const problema = temProblema(campo, invertido)
              return (
                <div key={campo} className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => toggleProblema(campo, invertido)}
                    data-field={campo}
                    className={`flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all active:scale-[0.99] ${
                      problema
                        ? 'border-red-500 bg-red-50 text-red-800'
                        : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'
                    }`}
                  >
                    <span className="text-sm font-bold leading-tight">{label}</span>
                    {problema && <span className="text-lg leading-none">⚠️</span>}
                  </button>

                  {problema && (
                    <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50/60 p-3">
                      <InfoStrip tone="danger" icon="⚠️">{aviso}</InfoStrip>

                      {item?.fotoBase64 && (
                        <div className="flex items-start gap-3">
                          <img
                            src={base64ToDataUrl(item.fotoBase64)}
                            alt={`Foto: ${label}`}
                            className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setDiagnostico(campo, { fotoBase64: '' })}
                            className="flex-1 rounded-xl bg-gray-200 px-3 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-300 active:scale-[0.99]"
                          >
                            🗑️ REMOVER FOTO
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        {!item?.fotoBase64 && (
                          <button
                            type="button"
                            onClick={() => handleTirarFotoItem(campo)}
                            disabled={capturandoFotoItem}
                            className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl bg-brand-900 px-3 py-2.5 text-white transition-colors hover:bg-brand-800 active:scale-[0.99] disabled:opacity-60"
                          >
                            <span className="text-lg leading-none">📷</span>
                            <span className="text-xs font-extrabold uppercase tracking-wide">
                              {capturandoFotoItem && campoFotoAtual === campo ? 'Capturando...' : 'Foto'}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleFalar(campo)}
                          className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-white transition-colors active:scale-[0.99] ${
                            item?.fotoBase64 ? 'col-span-2' : ''
                          } ${ouvindoCampo(campo) ? 'animate-pulse bg-red-600' : 'bg-gray-600 hover:bg-gray-700'}`}
                        >
                          <span className="text-lg leading-none">🎤</span>
                          <span className="text-xs font-extrabold uppercase tracking-wide">
                            {ouvindoCampo(campo) ? 'Ouvindo...' : 'Falar'}
                          </span>
                        </button>
                      </div>
                      {fotoErroItem && campoFotoAtual === campo && <InfoStrip tone="danger">{fotoErroItem}</InfoStrip>}
                      {vozErro && alvoVoz?.campo === campo && <InfoStrip tone="danger">{vozErro}</InfoStrip>}

                      <Input
                        placeholder="Adicionar observação (opcional)"
                        value={item?.observacao || ''}
                        onChange={(e) => setDiagnostico(campo, { observacao: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </CadernetaSection>
        ) : null}

        <FormFooter
          onSalvar={() => salvar(executarSalvamento)}
          onLimpar={resetarTudo}
          salvando={salvando}
          disabled={!isValid}
          formValido={isValid}
          pendenciaTexto={pendenciaTexto}
        />

        <input
          ref={fotoItemInputRef}
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
        cadernetaName="Manejo Pastagens"
        registro={registroSalvo}
        caderneta="pastagens"
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

      <PdfModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        images={[
          `${BASE}docs/pastagens/POP_Pastagens_01.jpg`,
          `${BASE}docs/pastagens/POP_Pastagens_02.jpg`,
          `${BASE}docs/pastagens/POP_Pastagens_03.jpg`
        ]}
      />

      <PdfModal
        isOpen={showEscoreModal}
        onClose={() => setShowEscoreModal(false)}
        images={[`${BASE}docs/ECC/POP_ECC.jpeg`]}
      />

      <PdfModal
        isOpen={showFezesModal}
        onClose={() => setShowFezesModal(false)}
        images={[`${BASE}docs/fezes/POP_Fezes_01.jpg`]}
      />
    </>
  )
}

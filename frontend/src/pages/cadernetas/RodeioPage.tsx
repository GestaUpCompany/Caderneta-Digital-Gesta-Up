import { useState, useEffect, useMemo, useRef } from 'react'
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
import BannerRascunho from '../../components/BannerRascunho'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import {
  getCachedCadastroData,
  getLoteByNomeCached,
  getLoteDetalhesComCategoriasCached,
  getLotesAtivosCached,
} from '../../services/cadastroCache'
import { getLastRodeioDate } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { base64ToDataUrl } from '../../utils/photoCompress'
import { CAMPOS_CATEGORIA_FIXA, normalizeCategoriaToField } from '../../utils/categoriasRebanho'
import { useFormValidation } from '../../hooks/useFormValidation'
import { useChecklistAtivo } from '../../hooks/useChecklistAtivo'
import { useSalvarRegistro } from '../../hooks/useSalvarRegistro'
import { usePhotoGps } from '../../hooks/usePhotoGps'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import ObservacaoAtrasoModal from '../../components/ObservacaoAtrasoModal'

const BASE = import.meta.env.BASE_URL

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

const CONTADO_OPTIONS = [
  { value: 'Sim', label: 'SIM' },
  { value: 'Não', label: 'NÃO' },
]

const ESCORES_CORPORAIS = [
  { value: '1', label: 'Muito magro', dot: 'bg-red-500' },
  { value: '2', label: 'Magro', dot: 'bg-yellow-400' },
  { value: '3', label: 'Bom', dot: 'bg-green-500' },
  { value: '4', label: 'Gordo', dot: 'bg-yellow-400' },
  { value: '5', label: 'Muito gordo', dot: 'bg-red-500' },
]

const ESCORES_FEZES = [
  { value: '1', label: 'Líquida', dot: 'bg-red-500' },
  { value: '2', label: 'Mole', dot: 'bg-yellow-400' },
  { value: '3', label: 'Ideal', dot: 'bg-green-500' },
  { value: '4', label: 'Firme', dot: 'bg-yellow-400' },
  { value: '5', label: 'Seca', dot: 'bg-red-500' },
]

const EQUIPE_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6+' },
]

// Chave usada em categoriasQuantidades quando o lote não tem categorias cadastradas.
const CHAVE_TOTAL = '__total__'

interface DiagnosticoItem {
  valor: string | null
  observacao: string
  fotoBase64?: string
}

interface FormState {
  data: string
  pasto: string
  pastoId: string
  numeroLote: string
  loteId: string
  gadoContado: string
  categoriasQuantidades: Record<string, string>
  escoreFezes: string
  equipe: string
  equipeNomes: string[]
  escoreGado: string
  observacao: string
  diagnosticos: Record<string, DiagnosticoItem>
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  pasto: '',
  pastoId: '',
  numeroLote: '',
  loteId: '',
  gadoContado: '',
  categoriasQuantidades: {},
  escoreFezes: '',
  equipe: '',
  equipeNomes: [],
  escoreGado: '',
  observacao: '',
  diagnosticos: DIAGNOSTICOS.reduce((acc, { campo }) => {
    acc[campo] = { valor: '', observacao: '' }
    return acc
  }, {} as Record<string, DiagnosticoItem>),
})

interface MetaRodeioInfo {
  metaDias: number
  diasDesdeUltimo: number
  diasAteProximo: number
  isDentroMeta: boolean
  hasRecord: boolean
  ultimoRodeio: string | null
}

type AlvoVoz = { tipo: 'item'; campo: string } | { tipo: 'lote' }

/** Escala com bolinha de cor, número e rótulo (escore corporal e de fezes). */
function EscalaRotulada({
  options,
  value,
  onChange,
  dataField,
}: {
  options: { value: string; label: string; dot: string }[]
  value: string
  onChange: (v: string) => void
  dataField?: string
}) {
  return (
    <div className="grid grid-cols-5 gap-1.5" data-field={dataField}>
      {options.map((opt) => {
        const selecionado = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex min-h-[72px] min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-2 p-1 transition-all active:scale-95 ${
              selecionado
                ? 'border-brand-900 bg-brand-50 text-gray-900'
                : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'
            }`}
          >
            <span className={`h-3 w-3 rounded-full ${opt.dot}`} />
            <span className="text-lg font-extrabold leading-none">{opt.value}</span>
            <span className="text-[10px] font-semibold leading-tight text-gray-500">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function RodeioPage() {
  const navigate = useNavigate()
  const { usuario, fazendaId } = useSelector((state: RootState) => state.config)
  const { ativo: checklistAtivo, loading: loadingChecklistRegras } = useChecklistAtivo('rodeio')
  const {
    salvando,
    salvar,
    showObservacaoModal,
    horariosModal,
    onConfirmarObservacao,
    onCancelarObservacao,
  } = useSalvarRegistro('rodeio')
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'rodeio', makeInitial })

  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showEscoreModal, setShowEscoreModal] = useState(false)
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [lotesPastoMap, setLotesPastoMap] = useState<Record<string, string>>({})
  const [detalhesLote, setDetalhesLote] = useState<any>(null)
  const [metaRodeioInfo, setMetaRodeioInfo] = useState<MetaRodeioInfo | null>(null)
  const [funcionariosDisponiveis, setFuncionariosDisponiveis] = useState<string[]>([])
  const [campoFotoAtual, setCampoFotoAtual] = useState<string | null>(null)
  const [alvoVoz, setAlvoVoz] = useState<AlvoVoz | null>(null)
  const baseVozRef = useRef('')

  // Foto do lote (seção 4)
  const {
    fotoBase64,
    capturandoFoto,
    fotoErro,
    capturarFoto,
    limpar: limparFoto,
    fotoInputRef,
    handleFileInputChange,
  } = usePhotoGps({ comGps: false })

  // Foto por item do diagnóstico (animal doente, morto etc.)
  const {
    capturandoFoto: capturandoFotoItem,
    fotoErro: fotoErroItem,
    capturarFoto: capturarFotoItem,
    fotoInputRef: fotoItemInputRef,
    handleFileInputChange: handleFileInputItem,
  } = usePhotoGps({ comGps: false })

  const { ouvindo: ouvindoVoz, erro: vozErro, toggle: toggleVoz, parar: pararVoz } = useVoiceInput()

  // Carregar lotes ativos e funcionários do Supabase (online) ou cache (offline)
  useEffect(() => {
    const loadData = async () => {
      if (fazendaId) {
        const { lotes, lotesPastoMap: mapa } = await getLotesAtivosCached(fazendaId)
        setLotesDisponiveis(lotes)
        setLotesPastoMap(mapa)
      }
      const cache = await getCachedCadastroData()
      if (cache) {
        setFuncionariosDisponiveis(cache.funcionarios || [])
      }
    }
    loadData()
  }, [fazendaId])

  // Escutar atualizações do cache de cadastro
  useEffect(() => {
    const unsubscribe = eventBus.on(CADASTRO_CACHE_UPDATED, (data: any) => {
      console.log('[RodeioPage] Cache atualizado, recarregando dados')
      if (data) {
        setLotesDisponiveis(data.lotes || [])
        setLotesPastoMap(data.lotesPastoMap || {})
        setFuncionariosDisponiveis(data.funcionarios || [])
      }
    })

    return unsubscribe
  }, [])

  // Buscar detalhes do lote quando selecionado
  useEffect(() => {
    async function carregarDetalhesLote() {
      if (!form.numeroLote || !fazendaId) {
        setDetalhesLote(null)
        setMetaRodeioInfo(null)
        setForm(prev => ({ ...prev, loteId: '', pastoId: '', pasto: '' }))
        return
      }

      try {
        const lote = await getLoteByNomeCached(fazendaId, form.numeroLote)
        if (lote) {
          // Buscar detalhes de categorias do lote
          const categoriasDetalhes = await getLoteDetalhesComCategoriasCached(lote.id)

          // Buscar último rodeio e calcular meta
          const lastRodeioDate = await getLastRodeioDate(lote.id)
          const metaDias = lote.meta_intervalo_rodeio_dias || 0
          const hasRecord = !!lastRodeioDate
          let diasDesdeUltimo = 0
          let ultimoRodeio: string | null = null
          if (lastRodeioDate) {
            // Normalize both dates to midnight to avoid timezone issues
            const hoje = new Date()
            hoje.setHours(0, 0, 0, 0)
            const ultimo = new Date(lastRodeioDate)
            ultimo.setHours(0, 0, 0, 0)
            const diffMs = hoje.getTime() - ultimo.getTime()
            diasDesdeUltimo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
            ultimoRodeio = ultimo.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          }
          const diasAteProximo = metaDias - diasDesdeUltimo
          setMetaRodeioInfo({
            metaDias,
            diasDesdeUltimo,
            diasAteProximo,
            isDentroMeta: metaDias > 0 ? diasDesdeUltimo <= metaDias : true,
            hasRecord,
            ultimoRodeio,
          })

          // Combinar dados do lote com dados de categorias
          setDetalhesLote({
            ...lote,
            categorias: categoriasDetalhes.categorias,
            categorias_raw: categoriasDetalhes.categorias_raw,
            n_cabecas: categoriasDetalhes.quant_atual,
            peso_vivo_kg: categoriasDetalhes.peso_vivo_kg,
            qtd_bezerros: categoriasDetalhes.qtd_bezerros
          })
          // Armazenar o ID do lote, pasto_id e nome do pasto
          const pastoNome = (lote.pastos as any)?.nome || ''
          setForm(prev => ({ ...prev, loteId: lote.id, pastoId: lote.pasto_id || '', pasto: pastoNome }))
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do lote:', error)
        setDetalhesLote(null)
        setMetaRodeioInfo(null)
        setForm(prev => ({ ...prev, loteId: '', pastoId: '', pasto: '' }))
      }
    }

    carregarDetalhesLote()
  }, [form.numeroLote, fazendaId])

  // Categorias reais do lote selecionado (um stepper por categoria)
  const categoriasDoLote = useMemo(() => {
    if (!detalhesLote?.categorias_raw || !Array.isArray(detalhesLote.categorias_raw)) return null
    const cats = detalhesLote.categorias_raw
      .map((cat: any) => ({ nome: cat.categoria as string, cadastro: (cat.quant_atual as number) || 0 }))
      .filter((c: { nome: string }) => c.nome)
    return cats.length > 0 ? (cats as { nome: string; cadastro: number }[]) : null
  }, [detalhesLote])

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Troca de lote zera a contagem: as categorias mudam
  const handleSelecionarLote = (lote: string) =>
    setForm((prev) => (prev.numeroLote === lote ? prev : { ...prev, numeroLote: lote, categoriasQuantidades: {} }))

  const setCategoriaQtd = (chave: string) => (val: string) =>
    setForm((prev) => ({ ...prev, categoriasQuantidades: { ...prev.categoriasQuantidades, [chave]: val } }))

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
  const handleFalar = async (alvo: AlvoVoz) => {
    const mesmoAlvo = (a: AlvoVoz | null) =>
      !!a && a.tipo === alvo.tipo && (a.tipo === 'lote' || (alvo.tipo === 'item' && a.campo === alvo.campo))
    if (ouvindoVoz) {
      await pararVoz()
      if (mesmoAlvo(alvoVoz)) return
    }
    setAlvoVoz(alvo)
    baseVozRef.current = (alvo.tipo === 'lote' ? form.observacao : form.diagnosticos[alvo.campo]?.observacao || '').trim()
    await toggleVoz((parcial) => {
      const texto = baseVozRef.current ? `${baseVozRef.current} ${parcial}` : parcial
      if (alvo.tipo === 'lote') setForm((prev) => ({ ...prev, observacao: texto }))
      else setDiagnostico(alvo.campo, { observacao: texto })
    })
  }

  const ouvindoAlvo = (alvo: AlvoVoz) =>
    ouvindoVoz && !!alvoVoz && alvoVoz.tipo === alvo.tipo && (alvo.tipo === 'lote' || (alvoVoz.tipo === 'item' && alvoVoz.campo === alvo.campo))

  const total = Object.values(form.categoriasQuantidades).reduce((acc, v) => acc + (Number(v) || 0), 0)
  const chavesContagem = categoriasDoLote ? categoriasDoLote.map((c) => c.nome) : [CHAVE_TOTAL]
  const contagemCompleta = chavesContagem.every((k) => (form.categoriasQuantidades[k] ?? '') !== '')

  const validationRules = {
    data: { required: true },
    numeroLote: { required: true },
    gadoContado: { required: true },
    categoriasQuantidades: {
      custom: () => (form.gadoContado === 'Sim' && !contagemCompleta ? 'Informe a quantidade de cada categoria' : null),
    },
    escoreFezes: { required: true },
    equipe: { required: true },
    equipeNomes: {
      custom: (value: string[]) => {
        const numPessoas = Number(form.equipe) || 0
        if (numPessoas === 0) return null
        if (!value || value.length < numPessoas || value.some(v => !v || v.trim() === '')) {
          return 'Preencha o nome de todas as pessoas da equipe'
        }
        return null
      }
    },
  }

  const { isValid } = useFormValidation(form, validationRules)

  const executarSalvamento = async () => {
    setErrors([])

    if (!isValid) {
      return
    }

    // Contagem: por categoria real do lote; campos fixos do schema agregados por compatibilidade
    let totalAnimais = 0
    let categoriasDetalhes: { nome: string; quant_atual: number; quant_informada: number }[] = []
    const camposFixos = CAMPOS_CATEGORIA_FIXA.reduce((acc, c) => {
      acc[c] = 0
      return acc
    }, {} as Record<string, number>)

    if (form.gadoContado === 'Sim') {
      if (categoriasDoLote) {
        categoriasDetalhes = categoriasDoLote.map(({ nome, cadastro }) => ({
          nome,
          quant_atual: cadastro,
          quant_informada: Number(form.categoriasQuantidades[nome]) || 0,
        }))
        totalAnimais = categoriasDetalhes.reduce((acc, c) => acc + c.quant_informada, 0)
        for (const c of categoriasDetalhes) {
          const field = normalizeCategoriaToField(c.nome)
          if (field) camposFixos[field] += c.quant_informada
        }
      } else {
        totalAnimais = Number(form.categoriasQuantidades[CHAVE_TOTAL]) || 0
      }
    } else if (form.gadoContado === 'Não' && detalhesLote) {
      // n_cabecas já inclui as categorias ao pé; não somar qtd_bezerros.
      totalAnimais = detalhesLote.n_cabecas || 0
    }

    const diagnosticosPayload = checklistAtivo
      ? Object.fromEntries(
          Object.entries(form.diagnosticos).map(([campo, d]) => {
            const { fotoBase64: foto, ...resto } = d
            const invertido = DIAGNOSTICOS.find((x) => x.campo === campo)?.invertido ?? false
            // Sem toque = conforme. Observação/foto só fazem sentido com o problema marcado.
            const problema = d.valor === valorProblema(invertido)
            const item = { valor: problema ? d.valor : valorConforme(invertido), observacao: problema ? resto.observacao : '' }
            return [campo, problema && foto ? { ...item, fotoBase64: foto } : item]
          })
        )
      : null

    const result = await salvarRegistro('rodeio', {
      data: form.data,
      manejador: usuario,
      usuario: usuario,
      pasto: form.pasto,
      pastoId: form.pastoId,
      numeroLote: form.numeroLote,
      loteId: form.loteId,
      gadoContado: form.gadoContado,
      ...camposFixos,
      categorias_detalhes: categoriasDetalhes.length > 0 ? categoriasDetalhes : null,
      totalCabecas: totalAnimais,
      diagnosticos: diagnosticosPayload,
      escoreFezes: form.escoreFezes || null,
      equipe: form.equipe ? Number(form.equipe) : null,
      equipeNomes: form.equipeNomes,
      escoreGado: form.escoreGado ? Number(form.escoreGado) : null,
      observacao: form.observacao.trim() || null,
      // Campos de divergência
      n_cabecas: detalhesLote?.n_cabecas || 0,
      qtd_bezerros: detalhesLote?.qtd_bezerros || 0,
      fotoBase64: fotoBase64 || null,
    })

    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      // Recalcular metaRodeio considerando o rodeio recém-salvo como o último.
      // O metaRodeioInfo atual foi calculado na seleção do lote, antes do save,
      // e reflete o rodeio anterior, não o de hoje. Sem isso, o texto
      // compartilhado mostra "Próximo rodeio: HOJE" mesmo após registrar hoje.
      const metaDias = detalhesLote?.meta_intervalo_rodeio_dias || 0
      const metaRodeioAtualizado = metaDias > 0
        ? {
            metaDias,
            diasDesdeUltimo: 0,
            diasAteProximo: metaDias,
            isDentroMeta: true,
            hasRecord: true,
          }
        : metaRodeioInfo
      setRegistroSalvo({ ...result.registro, metaRodeio: metaRodeioAtualizado })
      setShowSuccessModal(true)
      limparRascunho()
      limparFoto()
    }
  }

  const handleLimpar = () => {
    limparRascunho()
    setErrors([])
    limparFoto()
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/')
  }

  const handleEquipe = (value: string) => {
    const numPessoas = Number(value) || 0
    setForm((prev) => ({
      ...prev,
      equipe: value,
      equipeNomes: Array.from({ length: numPessoas }, (_, i) => prev.equipeNomes[i] || ''),
    }))
  }

  // Status do rodeio em relação à meta do lote
  const rodeioStatus: InfoCardStatus | undefined = (() => {
    if (!metaRodeioInfo) return undefined
    if (!metaRodeioInfo.hasRecord) return { tone: 'neutral', text: 'Nenhum rodeio registrado neste lote' }
    if (metaRodeioInfo.metaDias <= 0) return { tone: 'neutral', text: 'Meta de rodeio não definida' }
    const atraso = metaRodeioInfo.diasDesdeUltimo - metaRodeioInfo.metaDias
    if (atraso > 0) return { tone: 'danger', text: `Rodeio atrasado há ${atraso} ${atraso === 1 ? 'dia' : 'dias'}` }
    const restam = metaRodeioInfo.diasAteProximo
    return { tone: 'success', text: restam === 0 ? 'Rodeio vence hoje' : `No prazo: próximo rodeio em ${restam} ${restam === 1 ? 'dia' : 'dias'}` }
  })()

  const rodeioProgress =
    metaRodeioInfo && metaRodeioInfo.hasRecord && metaRodeioInfo.metaDias > 0
      ? metaRodeioInfo.diasDesdeUltimo / metaRodeioInfo.metaDias
      : null

  const totalLote = detalhesLote?.n_cabecas || 0
  const diferenca = total - totalLote
  const mostrarDivergencia = form.gadoContado === 'Sim' && !!detalhesLote && Object.values(form.categoriasQuantidades).some((v) => v !== '')

  const pendenciaTexto = (() => {
    if (!form.numeroLote) return 'Falta escolher o pasto/lote'
    if (!form.gadoContado) return 'Falta informar se o gado foi contado'
    if (form.gadoContado === 'Sim' && !contagemCompleta) return 'Falta informar a quantidade de cada categoria'
    if (!form.escoreFezes) return 'Falta o escore de fezes'
    if (!form.equipe) return 'Falta o número de pessoas no manejo'
    if (Number(form.equipe) > 0 && form.equipeNomes.some((n) => !n || !n.trim())) return 'Falta o nome de todas as pessoas da equipe'
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

  return (
    <>
      <CadernetaLayout
        title="RODEIO GADO"
        cadernetaId="rodeio"
        dateContent={<DatePicker value={form.data} onChange={set('data')} variant="header" compact inline />}
      >
        <BannerRascunho
          visible={rascunhoRestaurado}
          onConfirmar={confirmarRascunho}
          onDescartar={descartarRascunho}
        />
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Pasto/Lote */}
        <CadernetaSection titulo="Pasto/Lote" required>
          {lotesDisponiveis.length > 0 ? (
            <SearchableModal
              label=""
              value={form.numeroLote}
              onChange={handleSelecionarLote}
              error={getError('numeroLote')}
              options={lotesDisponiveis}
              secondaryText={(lote) => lotesPastoMap[lote] || ''}
              placeholder="Selecione o pasto/lote..."
              id="numeroLote"
              name="numeroLote"
            />
          ) : (
            <Input label="NÚMERO LOTE" placeholder="Carregando..." value={form.numeroLote} onChange={() => {}} error={getError('numeroLote')} disabled />
          )}
          {detalhesLote && (
            <InfoCard
              icon={MapPin}
              title={form.numeroLote}
              subtitle={form.pasto || 'Sem pasto associado'}
              stats={[
                { label: 'Categoria', value: detalhesLote.categorias || '-' },
                { label: 'Cabeças', value: String(totalLote) },
                { label: 'Último rodeio', value: metaRodeioInfo?.ultimoRodeio || '-' },
              ]}
              progress={rodeioProgress}
              status={rodeioStatus}
            />
          )}
        </CadernetaSection>

        {/* 1. Quantidade de animais */}
        <CadernetaSection numero={1} titulo="Quantidade de animais">
          <div>
            <label className="mb-2 block text-[15px] font-bold text-gray-900">
              QUANTOS FORAM CONTADOS? <span className="text-red-500">*</span>
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
              {!form.numeroLote && <InfoStrip tone="warning" icon="⚠️">Escolha o pasto/lote para ver as categorias</InfoStrip>}
              {(categoriasDoLote || [{ nome: 'Total de cabeças', cadastro: totalLote, chave: CHAVE_TOTAL }]).map((cat: any) => {
                const chave = cat.chave || cat.nome
                return (
                  <div key={chave} className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[15px] font-bold capitalize text-gray-900">{cat.nome}</span>
                      {detalhesLote && <span className="text-sm font-semibold text-gray-500">cadastro: {cat.cadastro} cab.</span>}
                    </div>
                    <StepperInput
                      value={form.categoriasQuantidades[chave] ?? ''}
                      onChange={setCategoriaQtd(chave)}
                      min={0}
                      allowDecimals={false}
                      suffix="cabeças"
                    />
                  </div>
                )
              })}
              {categoriasDoLote && categoriasDoLote.length > 1 && total > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <span className="text-sm font-bold text-gray-600">TOTAL CONTADO</span>
                  <span className="text-xl font-extrabold text-gray-900">{total} cabeças</span>
                </div>
              )}
              {mostrarDivergencia && (
                diferenca === 0 ? (
                  <InfoStrip tone="success" icon="✅">Contagem confere com o cadastro ({totalLote})</InfoStrip>
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

        {/* 2. Avaliação geral */}
        {loadingChecklistRegras ? (
          <CadernetaSection numero={2} titulo="Avaliação geral">
            <p className="py-4 text-center text-sm text-gray-500">Carregando regras do checklist...</p>
          </CadernetaSection>
        ) : checklistAtivo ? (
          <CadernetaSection numero={2} titulo="Avaliação geral">
            <p className="-mt-2 text-sm text-gray-500">
              Toque em um item se encontrar o problema. Não tocar significa que está tudo certo.
            </p>
            {DIAGNOSTICOS.map(({ campo, label, invertido, aviso }) => {
              const item = form.diagnosticos[campo]
              const problema = temProblema(campo, invertido)
              const alvo: AlvoVoz = { tipo: 'item', campo }
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
                          onClick={() => handleFalar(alvo)}
                          className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-white transition-colors active:scale-[0.99] ${
                            item?.fotoBase64 ? 'col-span-2' : ''
                          } ${ouvindoAlvo(alvo) ? 'animate-pulse bg-red-600' : 'bg-gray-600 hover:bg-gray-700'}`}
                        >
                          <span className="text-lg leading-none">🎤</span>
                          <span className="text-xs font-extrabold uppercase tracking-wide">
                            {ouvindoAlvo(alvo) ? 'Ouvindo...' : 'Falar'}
                          </span>
                        </button>
                      </div>
                      {fotoErroItem && campoFotoAtual === campo && <InfoStrip tone="danger">{fotoErroItem}</InfoStrip>}
                      {vozErro && alvoVoz?.tipo === 'item' && alvoVoz.campo === campo && <InfoStrip tone="danger">{vozErro}</InfoStrip>}

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

        {/* 3. Avaliação do gado e equipe */}
        <CadernetaSection numero={3} titulo="Avaliação do gado e equipe">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[13px] font-bold uppercase text-gray-900">Escore corporal</label>
              {chipPop(() => setShowEscoreModal(true), 'POP Escore')}
            </div>
            <EscalaRotulada options={ESCORES_CORPORAIS} value={form.escoreGado} onChange={set('escoreGado')} dataField="escoreGado" />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[13px] font-bold uppercase text-gray-900">
                Escore de fezes <span className="text-red-500">*</span>
              </label>
              {chipPop(() => setShowPdfModal(true), 'POP Fezes')}
            </div>
            <EscalaRotulada options={ESCORES_FEZES} value={form.escoreFezes} onChange={set('escoreFezes')} dataField="escoreFezes" />
            {getError('escoreFezes') && <p className="text-base font-semibold text-red-700">{getError('escoreFezes')}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-bold uppercase text-gray-900">
              Nº pessoas no manejo <span className="text-red-500">*</span>
            </label>
            <ChoiceGrid options={EQUIPE_OPTIONS} value={form.equipe} onChange={handleEquipe} cols={6} size="sm" dataField="equipe" />
            {getError('equipe') && <p className="text-base font-semibold text-red-700">{getError('equipe')}</p>}
          </div>

          {Number(form.equipe) > 0 && (
            <div className="flex flex-col gap-3">
              {getError('equipeNomes') && (
                <p className="text-sm font-semibold text-red-600">{getError('equipeNomes')}</p>
              )}
              {Array.from({ length: Number(form.equipe) }).map((_, index) => (
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
                    label={`Nome da ${index + 1}ª pessoa`}
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

        {/* 4. Foto do lote */}
        <CadernetaSection numero={4} titulo="Foto do lote">
          {fotoBase64 && (
            <div className="flex flex-col gap-3">
              <img
                src={base64ToDataUrl(fotoBase64)}
                alt="Foto do lote"
                className="mx-auto w-full max-w-sm rounded-xl border border-gray-200"
              />
              <button
                type="button"
                onClick={limparFoto}
                className="w-full rounded-xl bg-gray-200 px-3 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-300 active:scale-[0.99]"
              >
                🗑️ REMOVER FOTO
              </button>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {!fotoBase64 && (
              <button
                type="button"
                onClick={capturarFoto}
                disabled={capturandoFoto}
                className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-brand-900 px-3 py-2.5 text-white transition-colors hover:bg-brand-800 active:scale-[0.99] disabled:opacity-60"
              >
                <span className="text-lg leading-none">📷</span>
                <span className="text-sm font-extrabold uppercase tracking-wide">
                  {capturandoFoto ? 'Capturando...' : 'Tirar foto'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleFalar({ tipo: 'lote' })}
              className={`flex min-h-[56px] items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-white transition-colors active:scale-[0.99] ${
                fotoBase64 ? 'col-span-2' : ''
              } ${ouvindoAlvo({ tipo: 'lote' }) ? 'animate-pulse bg-red-600' : 'bg-gray-600 hover:bg-gray-700'}`}
            >
              <span className="text-lg leading-none">🎤</span>
              <span className="text-sm font-extrabold uppercase tracking-wide">
                {ouvindoAlvo({ tipo: 'lote' }) ? 'Ouvindo...' : 'Gravar áudio'}
              </span>
            </button>
          </div>
          {fotoErro && <InfoStrip tone="danger">{fotoErro}</InfoStrip>}
          {vozErro && alvoVoz?.tipo === 'lote' && <InfoStrip tone="danger">{vozErro}</InfoStrip>}
          <Input
            placeholder="Observação do lote (opcional)"
            value={form.observacao}
            onChange={(e) => setForm((prev) => ({ ...prev, observacao: e.target.value }))}
          />
          <input
            ref={fotoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </CadernetaSection>

        <FormFooter
          onSalvar={() => salvar(executarSalvamento)}
          onLimpar={handleLimpar}
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
        cadernetaName="Rodeio Gado"
        registro={registroSalvo}
        caderneta="rodeio"
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
        images={[`${BASE}docs/fezes/POP_Fezes_01.jpg`]}
      />

      <PdfModal
        isOpen={showEscoreModal}
        onClose={() => setShowEscoreModal(false)}
        images={[`${BASE}docs/ECC/POP_ECC.jpeg`]}
      />
    </>
  )
}

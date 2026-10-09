import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, ValidationMessage, SearchableModal } from '../../components/ui'
import { Droplets, FileText } from 'lucide-react'
import SuccessModal from '../../components/SuccessModal'
import PdfModal from '../../components/PdfModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import FormFooter from '../../components/cadernetas/FormFooter'
import BannerRascunho from '../../components/BannerRascunho'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { formatarTempoDesdeLimpeza } from '../../utils/shareUtils'
import { RootState } from '../../store/store'
import {
  getCachedCadastroData,
  getBebedourosCached,
  getBebedouroByNomeCached,
  getBebedouroByNomeFromCacheOnly,
  getUltimaDataLimpezaBebedouroAntesDeCached,
  getIntervaloMedioLimpezasCached,
  getPastosByBebedouroCached,
  getPastosByBebedouroFromCacheOnly,
  withTimeout,
} from '../../services/cadastroCache'
import { scrollToFirstError } from '../../utils/scrollToError'
import { useFormValidation } from '../../hooks/useFormValidation'
import { useChecklistAtivo } from '../../hooks/useChecklistAtivo'
import { useSalvarRegistro } from '../../hooks/useSalvarRegistro'
import { usePhotoGps } from '../../hooks/usePhotoGps'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import ObservacaoAtrasoModal from '../../components/ObservacaoAtrasoModal'
import InfoCard, { InfoCardStatus } from '../../components/cadernetas/InfoCard'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { base64ToDataUrl } from '../../utils/photoCompress'

const BASE = import.meta.env.BASE_URL

const AGUA_OPTIONS = [
  { value: '1', numero: '1', label: 'Limpa', dot: 'bg-green-500', selecionado: 'bg-green-50 border-green-500 text-green-800' },
  { value: '2', numero: '2', label: 'Meio suja', dot: 'bg-amber-400', selecionado: 'bg-amber-50 border-amber-400 text-amber-900' },
  { value: '3', numero: '3', label: 'Suja', dot: 'bg-red-500', selecionado: 'bg-red-50 border-red-500 text-red-800' },
]

// Checklist vira lista de problemas: clicar marca "o problema existe".
// O payload mantem as chaves positivas (agua_suficiente etc.): valor=true
// significa "condicao adequada", false = problema marcado. Isso preserva o
// formato historico e a leitura do Painel Web.
const CHECKLIST_PROBLEMAS = [
  { campo: 'aguaSuficiente', checklistKey: 'agua_suficiente', label: 'ÁGUA INSUFICIENTE', aviso: 'Água insuficiente: mostre e conte' },
  { campo: 'vazaoBebedouroIdeal', checklistKey: 'vazao_bebedouro_ideal', label: 'VAZÃO DA BÓIA FORA DO IDEAL', aviso: 'Vazão fora do ideal: mostre e conte' },
  { campo: 'boiaProtecaoBoasCondicoes', checklistKey: 'boia_protecao_boas_condicoes', label: 'BÓIA/PROTEÇÃO EM MÁS CONDIÇÕES', aviso: 'Bóia com problema: mostre e conte' },
  { campo: 'aterroAcessoBebedouroIdeal', checklistKey: 'aterro_acesso_bebedouro_ideal', label: 'ATERRO/ACESSO INADEQUADO', aviso: 'Acesso inadequado: mostre e conte' },
  { campo: 'espacamentoBebedouroIdeal', checklistKey: 'espacamento_bebedouro_ideal', label: 'ESPAÇAMENTO INADEQUADO', aviso: 'Espaçamento inadequado: mostre e conte' },
] as const

type CampoChecklist = typeof CHECKLIST_PROBLEMAS[number]['campo']

interface FormState {
  data: string
  leituraBebedouro: string
  numeroBebedouro: string
  observacao: string
  limpouHoje: string
  // Itens do checklist: '' = adequado (padrao), 'Não' = problema marcado.
  aguaSuficiente: string
  aguaSuficienteObs: string
  aguaSuficienteFoto: string
  vazaoBebedouroIdeal: string
  vazaoBebedouroIdealObs: string
  vazaoBebedouroIdealFoto: string
  aterroAcessoBebedouroIdeal: string
  aterroAcessoBebedouroIdealObs: string
  aterroAcessoBebedouroIdealFoto: string
  espacamentoBebedouroIdeal: string
  espacamentoBebedouroIdealObs: string
  espacamentoBebedouroIdealFoto: string
  boiaProtecaoBoasCondicoes: string
  boiaProtecaoBoasCondicoesObs: string
  boiaProtecaoBoasCondicoesFoto: string
  // Limpeza info fields (read-only)
  tempoDesdeLimpeza: string
  intervaloMedioLimpezas: string
  metaIntervaloLimpeza: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  leituraBebedouro: '',
  numeroBebedouro: '',
  observacao: '',
  limpouHoje: '',
  aguaSuficiente: '',
  aguaSuficienteObs: '',
  aguaSuficienteFoto: '',
  vazaoBebedouroIdeal: '',
  vazaoBebedouroIdealObs: '',
  vazaoBebedouroIdealFoto: '',
  aterroAcessoBebedouroIdeal: '',
  aterroAcessoBebedouroIdealObs: '',
  aterroAcessoBebedouroIdealFoto: '',
  espacamentoBebedouroIdeal: '',
  espacamentoBebedouroIdealObs: '',
  espacamentoBebedouroIdealFoto: '',
  boiaProtecaoBoasCondicoes: '',
  boiaProtecaoBoasCondicoesObs: '',
  boiaProtecaoBoasCondicoesFoto: '',
  tempoDesdeLimpeza: '',
  intervaloMedioLimpezas: '',
  metaIntervaloLimpeza: '',
})

export default function BebedourosPage() {
  const navigate = useNavigate()
  const { usuario, fazendaId } = useSelector((state: RootState) => state.config)
  const { ativo: checklistAtivo, loading: loadingChecklistRegras } = useChecklistAtivo('bebedouros')
  const {
    salvando,
    salvar,
    showObservacaoModal,
    horariosModal,
    onConfirmarObservacao,
    onCancelarObservacao,
  } = useSalvarRegistro('bebedouros')
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'bebedouros', makeInitial })
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [bebedourosDisponiveis, setBebedourosDisponiveis] = useState<string[]>([])
  const [pastosBebedouro, setPastosBebedouro] = useState<{ id: string; nome: string }[] | null>(null)
  const [loadingPastosBebedouro, setLoadingPastosBebedouro] = useState(false)
  // Salvar antes dos dados do bebedouro chegarem gravaria o registro sem pasto e sem o resumo de limpeza.
  const [carregandoBebedouro, setCarregandoBebedouro] = useState(false)
  const [bebedouroIndisponivel, setBebedouroIndisponivel] = useState(false)
  const [bebedourosCarregados, setBebedourosCarregados] = useState(false)
  // Incrementa quando a internet volta com dados do bebedouro indisponíveis: refaz a leitura sozinho
  const [recarga, setRecarga] = useState(0)
  const bebedouroIndisponivelRef = useRef(false)
  const [campoFotoAtual, setCampoFotoAtual] = useState<CampoChecklist | null>(null)
  const [campoVozAtual, setCampoVozAtual] = useState<CampoChecklist | null>(null)
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

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const toggleProblema = (campo: CampoChecklist) =>
    setForm((prev) => ({ ...prev, [campo]: prev[campo] === 'Não' ? '' : 'Não' }))

  const handleTirarFotoItem = async (campo: CampoChecklist) => {
    setCampoFotoAtual(campo)
    const base64 = await capturarFoto()
    // Nativo retorna a foto aqui; no web o retorno vem pelo input file hidden
    if (base64) {
      setForm((prev) => ({ ...prev, [`${campo}Foto`]: base64 }))
    }
  }

  const handleFotoInputItem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const result = await handleFileInputChange(e)
    if (result?.fotoBase64 && campoFotoAtual) {
      setForm((prev) => ({ ...prev, [`${campoFotoAtual}Foto`]: result.fotoBase64 }))
    }
  }

  const removerFotoItem = (campo: CampoChecklist) =>
    setForm((prev) => ({ ...prev, [`${campo}Foto`]: '' }))

  // Ditado para a observacao do item: o texto parcial e acrescentado ao que
  // ja existia quando a gravacao comecou (da para falar mais de uma vez).
  const handleFalarItem = async (campo: CampoChecklist) => {
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

  // Lista de bebedouros: cache local primeiro (aparece na hora, mesmo com rede ruim) e revalida com timeout
  // sem apagar o que já está na tela.
  useEffect(() => {
    if (!fazendaId) return
    let cancelado = false
    const loadData = async () => {
      try {
        const cache = await getCachedCadastroData()
        if (cancelado) return
        if (cache?.bebedouros?.length) setBebedourosDisponiveis(cache.bebedouros)
        try {
          const bebedourosData = await getBebedourosCached(fazendaId)
          if (cancelado) return
          if (bebedourosData && bebedourosData.length > 0) {
            setBebedourosDisponiveis(bebedourosData.map((b: any) => b.nome))
          }
        } catch (error) {
          console.warn('[BebedourosPage] Bebedouros online indisponíveis, mantendo o cache local:', error)
        }
      } catch (error) {
        console.error('Erro ao carregar bebedouros:', error)
      } finally {
        if (!cancelado) setBebedourosCarregados(true)
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
      if (data && Array.isArray(data.bebedouros)) setBebedourosDisponiveis(data.bebedouros)
    })

    return unsubscribe
  }, [])

  // Dados do bebedouro selecionado (resumo de limpeza e pastos vinculados). Cache primeiro e revalidação
  // com timeout. Os pastos entram no registro: sem eles o SALVAR fica bloqueado.
  useEffect(() => {
    let cancelado = false
    const limpo = { tempoDesdeLimpeza: '', intervaloMedioLimpezas: '', metaIntervaloLimpeza: '' }

    // Sempre começa limpo: nada do bebedouro anterior pode vazar para o registro
    setPastosBebedouro(null)
    setBebedouroIndisponivel(false)
    setForm((prev) => (prev.tempoDesdeLimpeza || prev.intervaloMedioLimpezas || prev.metaIntervaloLimpeza ? { ...prev, ...limpo } : prev))

    const nome = form.numeroBebedouro
    if (!nome || !fazendaId) {
      setCarregandoBebedouro(false)
      setLoadingPastosBebedouro(false)
      return
    }
    setCarregandoBebedouro(true)
    setLoadingPastosBebedouro(true)

    const dataSemHora = form.data.split(' ')[0]
    const [dia, mes, ano] = dataSemHora.split('/')
    const dataRef = `${ano}-${mes}-${dia}`

    const aplicarPastos = (pastos: { id: string; nome: string }[] | null) => {
      setPastosBebedouro(pastos)
      setLoadingPastosBebedouro(false)
    }

    const aplicarResumo = async (bebedouro: any, comRede: boolean) => {
      // Sem rede (cache): as leituras caem direto no que está no aparelho
      const [ultima, intervaloMedio] = await Promise.all([
        getUltimaDataLimpezaBebedouroAntesDeCached(fazendaId!, bebedouro.id, dataRef),
        getIntervaloMedioLimpezasCached(fazendaId!, bebedouro.id),
      ])
      if (cancelado) return
      void comRede
      setForm((prev) => ({
        ...prev,
        tempoDesdeLimpeza: formatarTempoDesdeLimpeza(ultima),
        intervaloMedioLimpezas: intervaloMedio > 0 ? `${intervaloMedio} dias` : 'Sem dados suficientes',
        metaIntervaloLimpeza: bebedouro.meta_intervalo_limpeza ? `${bebedouro.meta_intervalo_limpeza} dias` : 'Não definida',
      }))
    }

    async function carregar() {
      try {
        // 1) Cache local: instantâneo
        const bebedouroCache = await getBebedouroByNomeFromCacheOnly(fazendaId!, nome)
        const pastosCache = bebedouroCache ? await getPastosByBebedouroFromCacheOnly(fazendaId!, bebedouroCache.id) : null
        if (cancelado) return
        if (bebedouroCache && pastosCache) {
          aplicarPastos(pastosCache)
          setCarregandoBebedouro(false)
        }

        // 2) Online (ou cache, quando a rede falhou): com cache só revalida
        const bebedouro = await getBebedouroByNomeCached(fazendaId!, nome)
        if (cancelado) return
        if (!bebedouro) {
          if (!(bebedouroCache && pastosCache)) setBebedouroIndisponivel(true)
          return
        }
        const pastos = await getPastosByBebedouroCached(fazendaId!, bebedouro.id)
        if (cancelado) return
        if (pastos) aplicarPastos(pastos)
        else if (!pastosCache) setBebedouroIndisponivel(true) // não foi possível saber os pastos

        await withTimeout(aplicarResumo(bebedouro, true), 6000).catch(() => {})
      } catch (error) {
        if (cancelado) return
        console.error('[BebedourosPage] Erro ao carregar dados do bebedouro:', error)
        setBebedouroIndisponivel(true)
      } finally {
        if (!cancelado) {
          setCarregandoBebedouro(false)
          setLoadingPastosBebedouro(false)
        }
      }
    }

    carregar()
    return () => {
      cancelado = true
    }
  }, [form.numeroBebedouro, form.data, fazendaId, recarga])

  // Validation rules: itens do checklist nao sao obrigatorios porque
  // "nao marcado" ja significa "condicao adequada" no modelo novo.
  const validationRules: any = {
    data: { required: true },
    numeroBebedouro: { required: true },
    leituraBebedouro: { required: true },
  }
  if (checklistAtivo) {
    validationRules.limpouHoje = { required: true }
  }

  const { isValid } = useFormValidation(form, validationRules)

  const bebedouroBloqueado = carregandoBebedouro || bebedouroIndisponivel || loadingChecklistRegras
  bebedouroIndisponivelRef.current = bebedouroIndisponivel && !carregandoBebedouro

  useEffect(() => {
    const aoVoltarInternet = () => {
      if (bebedouroIndisponivelRef.current) setRecarga((n) => n + 1)
    }
    window.addEventListener('online', aoVoltarInternet)
    return () => window.removeEventListener('online', aoVoltarInternet)
  }, [])

  // Erro de salvamento anterior não vale para outra data/bebedouro
  useEffect(() => {
    setErrors([])
  }, [form.data, form.numeroBebedouro])

  const executarSalvamento = async () => {
    setErrors([])

    // Validate form using the validation hook
    if (!isValid || bebedouroBloqueado) {
      return
    }

    const result = await salvarRegistro('bebedouros', {
      data: form.data,
      responsavel: usuario,
      usuario: usuario,
      leituraBebedouro: form.leituraBebedouro ? Number(form.leituraBebedouro) : null,
      numeroBebedouro: form.numeroBebedouro,
      pasto: pastosBebedouro && pastosBebedouro.length > 0 ? pastosBebedouro.map(p => p.nome).join(', ') : null,
      pastoId: pastosBebedouro && pastosBebedouro.length === 1 ? pastosBebedouro[0].id : null,
      observacao: form.observacao,
      tempoDesdeLimpeza: form.tempoDesdeLimpeza,
      intervaloMedioLimpezas: form.intervaloMedioLimpezas,
      metaIntervaloLimpeza: form.metaIntervaloLimpeza,
      // valor = "a condicao esta adequada" (true) ou "problema marcado" (false).
      // A afirmacao negativa existe so na UI; a chave e a proposicao positiva.
      checklist: checklistAtivo ? {
        ...Object.fromEntries(CHECKLIST_PROBLEMAS.map(({ campo, checklistKey }) => [
          checklistKey,
          {
            valor: form[campo] !== 'Não',
            observacao: (form as any)[`${campo}Obs`] || '',
            fotoBase64: (form as any)[`${campo}Foto`] || undefined,
          },
        ])),
        limpou_hoje: {
          valor: form.limpouHoje === 'Sim',
          observacao: '',
        },
      } : null,
    })

    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      // O histórico de limpeza é gravado pelo sync junto com o registro (funciona offline e sem duplicar).

      // Enriquecer registro com histórico de limpeza para o texto compartilhado
      let registroParaShare = result.registro as any
      if (form.numeroBebedouro && fazendaId) {
        try {
          const [dia, mes, ano] = form.data.split('/')
          const dataLimpeza = `${ano}-${mes}-${dia}`
          const bebedouro = await getBebedouroByNomeCached(fazendaId, form.numeroBebedouro)
          if (bebedouro) {
            const ultimaDataLimpeza = await getUltimaDataLimpezaBebedouroAntesDeCached(fazendaId, bebedouro.id, dataLimpeza)
            const tempoDesdeLimpeza = formatarTempoDesdeLimpeza(ultimaDataLimpeza)
            const intervaloMedio = await getIntervaloMedioLimpezasCached(fazendaId, bebedouro.id)
            const intervaloMedioStr = intervaloMedio > 0 ? `${intervaloMedio} dias` : 'Sem dados suficientes'
            const metaIntervalo = bebedouro.meta_intervalo_limpeza ? `${bebedouro.meta_intervalo_limpeza} dias` : 'Não definida'
            registroParaShare = {
              ...registroParaShare,
              tempoDesdeLimpeza,
              intervaloMedioLimpezas: intervaloMedioStr,
              metaIntervaloLimpeza: metaIntervalo,
            }
          }
        } catch (error) {
          console.error('[BebedourosPage] Erro ao enriquecer histórico para share:', error)
        }
      }

      setRegistroSalvo(registroParaShare)
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

  const pastosSecundario = (nome: string) =>
    nome === form.numeroBebedouro && pastosBebedouro && pastosBebedouro.length > 0
      ? pastosBebedouro.map((p) => p.nome).join(' · ')
      : ''

  // Resumo do bebedouro selecionado: stats de limpeza + faixa unica de decisao
  const metaDiasLimpeza = parseInt(form.metaIntervaloLimpeza)
  const tempoDiasLimpeza =
    form.tempoDesdeLimpeza === 'limpo hoje'
      ? 0
      : parseInt(form.tempoDesdeLimpeza.replace(/\D+/g, ' ').trim())
  const mediaDiasLimpeza = parseInt(form.intervaloMedioLimpezas)
  const temPasto = (pastosBebedouro?.length ?? 0) > 0
  const temMeta = !isNaN(metaDiasLimpeza) && metaDiasLimpeza > 0
  const temHistorico = !isNaN(tempoDiasLimpeza)

  const bebedouroStatus: InfoCardStatus | undefined = (() => {
    if (form.tempoDesdeLimpeza === 'Sem histórico')
      return { tone: 'warning', text: 'Sem histórico de limpeza registrado' }
    if (!temMeta) return { tone: 'neutral', text: 'Meta de limpeza não definida' }
    if (!temHistorico) return undefined
    const atraso = tempoDiasLimpeza - metaDiasLimpeza
    if (atraso > 2) return { tone: 'danger', text: `Limpeza atrasada há ${atraso} dias` }
    if (atraso > 0) return { tone: 'warning', text: 'Limpeza no limite do prazo' }
    if (!isNaN(mediaDiasLimpeza) && mediaDiasLimpeza > metaDiasLimpeza + 1)
      return { tone: 'warning', text: 'Média de limpezas acima da meta' }
    const restam = metaDiasLimpeza - tempoDiasLimpeza
    return {
      tone: 'success',
      text: restam === 0 ? 'Limpeza vence hoje' : `No prazo: limpa de novo em ${restam} dias`,
    }
  })()

  const pendenciaTexto = (() => {
    if (!form.numeroBebedouro) return 'Falta escolher o bebedouro'
    if (carregandoBebedouro) return 'Carregando dados do bebedouro...'
    if (bebedouroIndisponivel) return 'Dados do bebedouro indisponíveis neste aparelho: conecte à internet e atualize os dados'
    if (loadingChecklistRegras) return 'Carregando regras do checklist...'
    if (!form.leituraBebedouro) return 'Falta a leitura do bebedouro'
    if (checklistAtivo && !form.limpouHoje) return 'Falta informar se limpou o bebedouro hoje'
    return undefined
  })()

  const bebedouroProgress = temMeta && temHistorico ? tempoDiasLimpeza / metaDiasLimpeza : null

  return (
    <>
      <CadernetaLayout
        title="BEBEDOUROS"
        cadernetaId="bebedouros"
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

        <CadernetaSection numero={1} titulo="Bebedouro" required>
          {bebedourosDisponiveis.length > 0 ? (
            <SearchableModal
              label=""
              value={form.numeroBebedouro}
              onChange={set('numeroBebedouro')}
              error={getError('numeroBebedouro')}
              options={bebedourosDisponiveis}
              secondaryText={pastosSecundario}
              placeholder="Selecione o bebedouro..."
              id="numeroBebedouro"
              name="numeroBebedouro"
            />
          ) : (
            <Input
              label="BEBEDOURO"
              placeholder={bebedourosCarregados ? 'Nenhum bebedouro neste aparelho. Conecte à internet e atualize os dados' : 'Carregando...'}
              value={form.numeroBebedouro}
              onChange={() => {}}
              error={getError('numeroBebedouro')}
              id="numeroBebedouro"
              disabled
            />
          )}
          {form.numeroBebedouro && (
            <InfoCard
              icon={Droplets}
              title={form.numeroBebedouro}
              subtitle={
                loadingPastosBebedouro
                  ? 'Carregando pasto...'
                  : temPasto
                    ? pastosBebedouro!.map((p) => p.nome).join(' · ')
                    : 'Sem pasto associado'
              }
              stats={[
                {
                  label: 'Última limpeza',
                  value: (form.tempoDesdeLimpeza || '-').replace(/^há\s*/i, ''),
                },
                {
                  label: 'Média',
                  value: isNaN(mediaDiasLimpeza) ? '-' : form.intervaloMedioLimpezas,
                },
                { label: 'Meta', value: temMeta ? form.metaIntervaloLimpeza : '-' },
              ]}
              progress={bebedouroProgress}
              status={bebedouroStatus}
            >
              {!loadingPastosBebedouro && !temPasto && (
                <InfoStrip tone="warning" className="mt-2">
                  Sem pasto associado. No Manej'Us, acessar edição de pastos e vincular
                  este bebedouro.
                </InfoStrip>
              )}
            </InfoCard>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="block text-[15px] font-bold text-gray-900">
                COMO ESTÁ A ÁGUA? <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPdfModal(true)}
                className="flex !min-h-0 shrink-0 items-center gap-1.5 rounded-lg bg-yellow-400 px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-black transition-colors hover:bg-yellow-300 active:scale-[0.98]"
              >
                <FileText className="h-3.5 w-3.5" strokeWidth={2.5} />
                POP Bebedouros
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2" data-field="leituraBebedouro">
              {AGUA_OPTIONS.map((opt) => {
                const selecionado = form.leituraBebedouro === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set('leituraBebedouro')(opt.value)}
                    className={`flex min-h-[72px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border-2 p-2 transition-all active:scale-95 ${
                      selecionado ? opt.selecionado : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`h-3 w-3 rounded-full ${opt.dot}`} />
                      <span className="text-lg font-extrabold leading-none">{opt.numero}</span>
                    </span>
                    <span className="text-xs font-bold leading-tight">{opt.label}</span>
                  </button>
                )
              })}
            </div>
            {getError('leituraBebedouro') && (
              <p className="mt-2 text-base font-semibold text-red-700">{getError('leituraBebedouro')}</p>
            )}
          </div>
        </CadernetaSection>

        {loadingChecklistRegras ? (
          <CadernetaSection numero={2} titulo="Checklist">
            <p className="py-4 text-center text-sm text-gray-500">Carregando regras do checklist...</p>
          </CadernetaSection>
        ) : checklistAtivo ? (
          <CadernetaSection numero={2} titulo="Checklist">
            <p className="-mt-2 text-sm text-gray-500">
              Toque em um item se encontrar o problema. Não tocar significa que está tudo certo.
            </p>
            {CHECKLIST_PROBLEMAS.map(({ campo, label, aviso }) => {
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
                LIMPOU O BEBEDOURO HOJE? <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2" data-field="limpouHoje">
                {[
                  { value: 'Sim', label: 'SIM', icon: '✓', sel: 'bg-green-100 text-green-800 border-green-500', iconColor: 'text-green-600' },
                  { value: 'Não', label: 'NÃO', icon: '✗', sel: 'bg-red-50 text-red-700 border-red-400', iconColor: 'text-red-500' },
                ].map((opt) => {
                  const selecionado = form.limpouHoje === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set('limpouHoje')(opt.value)}
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
              {getError('limpouHoje') && (
                <p className="mt-2 text-base font-semibold text-red-700">{getError('limpouHoje')}</p>
              )}
            </div>
          </CadernetaSection>
        ) : null}

        <CadernetaSection numero={3} titulo="Observação">
          <Input
            placeholder="Detalhes adicionais (opcional)"
            value={form.observacao}
            onChange={setInput('observacao')}
          />
        </CadernetaSection>

        <FormFooter
          onSalvar={() => salvar(executarSalvamento)}
          onLimpar={() => {
            limparRascunho()
            setErrors([])
          }}
          salvando={salvando}
          disabled={!isValid || bebedouroBloqueado}
          formValido={isValid && !bebedouroBloqueado}
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
        cadernetaName="Bebedouros"
        registro={registroSalvo}
        caderneta="bebedouros"
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
          `${BASE}docs/bebedouros/POP_Bebedouros_01.jpg`
        ]}
      />
    </>
  )
}

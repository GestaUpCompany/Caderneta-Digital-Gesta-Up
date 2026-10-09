import { useState, useEffect, useRef } from 'react'
import { Beef, FileText, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, ValidationMessage } from '../../components/ui'
import SearchableModal from '../../components/ui/SearchableModal'
import SuccessModal from '../../components/SuccessModal'
import PdfModal from '../../components/PdfModal'
import { salvarRegistro } from '../../services/api'
import { todayBR, brToIso } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import ChoiceGrid from '../../components/cadernetas/ChoiceGrid'
import InfoCard from '../../components/cadernetas/InfoCard'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import StepperInput from '../../components/cadernetas/StepperInput'
import FormFooter from '../../components/cadernetas/FormFooter'
import BannerRascunho from '../../components/BannerRascunho'
import {
  getCachedCadastroData,
  getLoteByNomeCached,
  getLoteByNomeFromCacheOnly,
  getLoteDetalhesComCategoriasCached,
  getLoteDetalhesFromCacheOnly,
  getTratamentosCached,
  getTratamentosFromCacheOnly,
  getRacasCached,
  getRacasFromCacheOnly,
  getMedicamentosCached,
  getMedicamentosFromCacheOnly,
  clearCachedQuery,
  buildCacheKey,
  getLotesAtivosCached,
  withTimeout,
} from '../../services/cadastroCache'
import AnimalIdentifier from '../../components/AnimalIdentifier'
import MedicamentosSection, { MedicamentoItem } from '../../components/cadernetas/MedicamentosSection'
import { scrollToFirstError } from '../../utils/scrollToError'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { useFormValidation, ValidationRules } from '../../hooks/useFormValidation'
import { usePhotoGps } from '../../hooks/usePhotoGps'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { base64ToDataUrl } from '../../utils/photoCompress'
import { capitalizarCategoria, processarCategorias } from '../../utils/categorias'
import { conflitosComRebanho, conflitosDeIdentificacao } from '../../utils/maternidadeIds'
import { registrarRespostaDeRede } from '../../utils/fetchComTimeout'

const BASE = import.meta.env.BASE_URL

const PROBLEMAS_PARTO = [
  { value: 'Aborto', label: 'ABORTO', icon: '❌' },
  { value: 'Natimorto', label: 'NASCEU MORTO', icon: '🕊️' },
  { value: 'Distócico', label: 'DISTÓCICO', icon: '⚠️' },
  { value: 'Deficiência Física', label: 'DEFEITO FÍSICO', icon: '♿' },
  { value: 'Retenção de Placenta', label: 'PLACENTA PRESA', icon: '🩸' },
]

const SEXO = [
  { value: 'Macho', label: 'MACHO', icon: '♂️' },
  { value: 'Fêmea', label: 'FÊMEA', icon: '♀️' },
]

const RACAS_PADRAO = [
  { value: 'Aberdeen Angus', label: 'ABERDEEN ANGUS' },
  { value: 'Anelorado', label: 'ANELORADO' },
  { value: 'Angus', label: 'ANGUS' },
  { value: 'Blonde', label: 'BLONDE' },
  { value: 'Brangus', label: 'BRANGUS' },
  { value: 'Caracu', label: 'CARACU' },
  { value: 'Charolês', label: 'CHAROLÊS' },
  { value: 'Gir', label: 'GIR' },
  { value: 'Girolando', label: 'GIROLANDO' },
  { value: 'Guacho', label: 'GUACHO' },
  { value: 'Guzerá', label: 'GUZERÁ' },
  { value: 'Leiteiro', label: 'LEITEIRO' },
  { value: 'Limousin', label: 'LIMOUSIN' },
  { value: 'Nelore', label: 'NELORE' },
  { value: 'Red Angus', label: 'RED ANGUS' },
  { value: 'Senepol', label: 'SENEPOL' },
  { value: 'Simental', label: 'SIMENTAL' },
  { value: 'SRD', label: 'SRD' },
  { value: 'Tabapuã', label: 'TABAPUÃ' },
  { value: 'Wagyu', label: 'WAGYU' },
]

const CATEGORIAS_MAE = [
  { value: 'Nulípara', label: 'NULÍPARA' },
  { value: 'Primípara', label: 'PRIMÍPARA' },
  { value: 'Secundípara', label: 'SECUNDÍPARA' },
  { value: 'Multípara', label: 'MULTÍPARA' },
]

const ESCORES = [
  { value: '1', label: '1', color: 'bg-red-500' },
  { value: '1.5', label: '1.5', color: 'bg-red-500' },
  { value: '2', label: '2', color: 'bg-yellow-400' },
  { value: '2.5', label: '2.5', color: 'bg-yellow-400' },
  { value: '3', label: '3', color: 'bg-green-500' },
  { value: '3.5', label: '3.5', color: 'bg-green-500' },
  { value: '4', label: '4', color: 'bg-yellow-400' },
  { value: '4.5', label: '4.5', color: 'bg-yellow-400' },
  { value: '5', label: '5', color: 'bg-red-500' },
]

interface FormState {
  data: string
  lote: string
  loteId: string
  pastoId: string
  // Parto
  tipoParto: string[]
  partoAuxiliado: boolean
  problemasParto: string[]
  gemelos: boolean
  gemelosNatimorto: boolean
  observacaoParto: string
  // 1ª cria
  pesoCria: string
  idProvisorioCria: string
  idBrincoCria: string
  idChipCria: string
  individuoIdCria: string
  tratamentos: string[]
  medicamentos: MedicamentoItem[]
  sexo: string
  raca: string
  guachoCria: boolean
  // 2ª cria (gêmeos)
  pesoCria2: string
  idProvisorioCria2: string
  idBrincoCria2: string
  idChipCria2: string
  individuoIdCria2: string
  tratamentos2: string[]
  medicamentos2: MedicamentoItem[]
  sexo2: string
  raca2: string
  guachoCria2: boolean
  // Mãe
  idManejoMae: string
  idBrincoMae: string
  idChipMae: string
  individuoIdMae: string
  categoriaMae: string
  escoreMatriz: string
  docilidadeMatriz: string
  racaMae: string
  categoriaAnimalMae: string
  // Mãe adotiva (guacho 1ª cria)
  idManejoMaeAdotiva: string
  idBrincoMaeAdotiva: string
  idChipMaeAdotiva: string
  individuoIdMaeAdotiva: string
  categoriaMaeAdotiva: string
  racaMaeAdotiva: string
  // Mãe adotiva (guacho 2ª cria)
  idManejoMaeAdotiva2: string
  idBrincoMaeAdotiva2: string
  idChipMaeAdotiva2: string
  individuoIdMaeAdotiva2: string
  categoriaMaeAdotiva2: string
  racaMaeAdotiva2: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  lote: '',
  loteId: '',
  pastoId: '',
  tipoParto: [],
  partoAuxiliado: false,
  problemasParto: [],
  gemelos: false,
  gemelosNatimorto: false,
  observacaoParto: '',
  pesoCria: '',
  idProvisorioCria: '',
  idBrincoCria: '',
  idChipCria: '',
  individuoIdCria: '',
  tratamentos: [],
  medicamentos: [],
  sexo: '',
  raca: '',
  guachoCria: false,
  pesoCria2: '',
  idProvisorioCria2: '',
  idBrincoCria2: '',
  idChipCria2: '',
  individuoIdCria2: '',
  tratamentos2: [],
  medicamentos2: [],
  sexo2: '',
  raca2: '',
  guachoCria2: false,
  idManejoMae: '',
  idBrincoMae: '',
  idChipMae: '',
  individuoIdMae: '',
  categoriaMae: '',
  escoreMatriz: '',
  docilidadeMatriz: '',
  racaMae: '',
  categoriaAnimalMae: '',
  idManejoMaeAdotiva: '',
  idBrincoMaeAdotiva: '',
  idChipMaeAdotiva: '',
  individuoIdMaeAdotiva: '',
  categoriaMaeAdotiva: '',
  racaMaeAdotiva: '',
  idManejoMaeAdotiva2: '',
  idBrincoMaeAdotiva2: '',
  idChipMaeAdotiva2: '',
  individuoIdMaeAdotiva2: '',
  categoriaMaeAdotiva2: '',
  racaMaeAdotiva2: '',
})

export default function MaternidadePage() {
  const navigate = useNavigate()
  const { usuario, fazendaId, testModeAtivo } = useSelector((state: RootState) => state.config)
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'maternidade', makeInitial })
  const [animalIdentifierKey, setAnimalIdentifierKey] = useState(0)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showEscoreModal, setShowEscoreModal] = useState(false)
  const [hasIndividuos, setHasIndividuos] = useState<boolean | null>(null)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [lotesPastoMap, setLotesPastoMap] = useState<Record<string, string>>({})
  const [detalhesLote, setDetalhesLote] = useState<any>(null)
  const [tratamentosDisponiveis, setTratamentosDisponiveis] = useState<any[]>([])
  const [racasDisponiveis, setRacasDisponiveis] = useState<any[]>([])
  const [medicamentosDisponiveis, setMedicamentosDisponiveis] = useState<any[]>([])
  // Salvar antes dos dados do lote chegarem gravaria o parto sem lote_id/pasto_id
  const [carregandoLote, setCarregandoLote] = useState(false)
  const [loteIndisponivel, setLoteIndisponivel] = useState(false)
  const [listasCarregadas, setListasCarregadas] = useState(false)
  // Animais já conhecidos neste aparelho: avisa brinco/chip da cria que já existe antes de o servidor recusar
  const [individuosCache, setIndividuosCache] = useState<any[]>([])
  // Incrementa quando a internet volta (ou de tempos em tempos) com dados faltando: refaz a leitura sozinho
  const [recarga, setRecarga] = useState(0)
  const pendenteRef = useRef(false)
  const salvandoRef = useRef(false)

  // Fotos (sem GPS nesta caderneta): da cria/mãe (foto_url) e do brinco da mãe (opcional)
  const fotoCria = usePhotoGps({ comGps: false })
  const fotoBrincoMae = usePhotoGps({ comGps: false })

  // Aborto ou natimorto: a cria é tratada como animal morto — sem identificação, sem indivíduo no rebanho
  const isAborto = form.problemasParto.includes('Aborto')
  const isNatimorto = form.problemasParto.includes('Natimorto')
  const cria1Morta = isAborto || isNatimorto
  // 2ª cria sem identificação: natimorta ou aborto
  const cria2Morta = form.gemelosNatimorto || isAborto

  const validationRules: ValidationRules = {
    // Form 1: Dados Gerais
    data: { required: true },
    lote: { required: true },
    
    // Form 2: Identificação da Mãe (at least one ID required). Chaves com "_" rodam mesmo com o campo vazio.
    _maeIdentificada: {
      custom: () => {
        const hasManejo = form.idManejoMae && form.idManejoMae.trim() !== ''
        const hasBrinco = form.idBrincoMae && form.idBrincoMae.trim() !== ''
        const hasChip = form.idChipMae && form.idChipMae.trim() !== ''
        if (!hasManejo && !hasBrinco && !hasChip) return 'Preencha o ID Manejo, Brinco ou Chip'
        return null
      }
    },
    
    // Form 3: Parto
    tipoParto: { 
      custom: (value: string[]) => {
        if (!value || value.length === 0) return 'Pelo menos um tipo de parto é obrigatório'
        return null
      }
    },

    // Form 4: 1ª Cria (cria morta não pede identificação)
    idProvisorioCria: { required: !cria1Morta },
    pesoCria: { required: !cria1Morta },
    tratamentos: {
      custom: (value: string[]) => {
        if (cria1Morta) return null
        if (!value || value.length === 0) return 'Pelo menos um primeiro cuidado é obrigatório'
        return null
      }
    },
    sexo: { required: !cria1Morta },
    raca: { required: !cria1Morta },

    // Form 5: 2ª Cria (obrigatórios quando gêmeos E 2ª cria viva)
    idProvisorioCria2: { required: form.gemelos && !cria2Morta },
    pesoCria2: { required: form.gemelos && !cria2Morta },
    sexo2: { required: form.gemelos && !cria2Morta },
    raca2: { required: form.gemelos && !cria2Morta },
    tratamentos2: {
      custom: (value: string[]) => {
        if (form.gemelos && !cria2Morta && (!value || value.length === 0)) return 'Pelo menos um primeiro cuidado da 2ª cria é obrigatório'
        return null
      }
    },
    
    // Outros campos obrigatórios
    categoriaMae: { required: true },
    escoreMatriz: { required: true },
    docilidadeMatriz: { required: true },
    _racaMae: {
      custom: () => {
        if (!form.individuoIdMae && (form.idManejoMae || form.idBrincoMae || form.idChipMae)) {
          if (!form.racaMae || form.racaMae.trim() === '') return 'Raça da nova mãe é obrigatória'
        }
        return null
      }
    },

    // Mãe adotiva (guacho 1ª cria)
    _maeAdotivaIdentificada: {
      custom: () => {
        if (form.guachoCria && !cria1Morta) {
          const hasManejo = form.idManejoMaeAdotiva && form.idManejoMaeAdotiva.trim() !== ''
          const hasBrinco = form.idBrincoMaeAdotiva && form.idBrincoMaeAdotiva.trim() !== ''
          const hasChip = form.idChipMaeAdotiva && form.idChipMaeAdotiva.trim() !== ''
          if (!hasManejo && !hasBrinco && !hasChip) return 'Preencha o ID Manejo, Brinco ou Chip da mãe adotiva'
        }
        return null
      }
    },
    _racaMaeAdotiva: {
      custom: () => {
        if (form.guachoCria && !cria1Morta && !form.individuoIdMaeAdotiva && (form.idManejoMaeAdotiva || form.idBrincoMaeAdotiva || form.idChipMaeAdotiva)) {
          if (!form.racaMaeAdotiva || form.racaMaeAdotiva.trim() === '') return 'Raça da mãe adotiva é obrigatória'
        }
        return null
      }
    },
    _categoriaMaeAdotiva: {
      custom: () => {
        if (form.guachoCria && !cria1Morta && !form.individuoIdMaeAdotiva && (form.idManejoMaeAdotiva || form.idBrincoMaeAdotiva || form.idChipMaeAdotiva)) {
          if (!form.categoriaMaeAdotiva || form.categoriaMaeAdotiva.trim() === '') return 'Classificação da matriz adotiva é obrigatória'
        }
        return null
      }
    },

    // Mãe adotiva (guacho 2ª cria)
    _maeAdotiva2Identificada: {
      custom: () => {
        if (form.guachoCria2 && !isAborto) {
          const hasManejo = form.idManejoMaeAdotiva2 && form.idManejoMaeAdotiva2.trim() !== ''
          const hasBrinco = form.idBrincoMaeAdotiva2 && form.idBrincoMaeAdotiva2.trim() !== ''
          const hasChip = form.idChipMaeAdotiva2 && form.idChipMaeAdotiva2.trim() !== ''
          if (!hasManejo && !hasBrinco && !hasChip) return 'Preencha o ID Manejo, Brinco ou Chip da mãe adotiva da 2ª cria'
        }
        return null
      }
    },
    _racaMaeAdotiva2: {
      custom: () => {
        if (form.guachoCria2 && !isAborto && !form.individuoIdMaeAdotiva2 && (form.idManejoMaeAdotiva2 || form.idBrincoMaeAdotiva2 || form.idChipMaeAdotiva2)) {
          if (!form.racaMaeAdotiva2 || form.racaMaeAdotiva2.trim() === '') return 'Raça da mãe adotiva da 2ª cria é obrigatória'
        }
        return null
      }
    },
    _categoriaMaeAdotiva2: {
      custom: () => {
        if (form.guachoCria2 && !isAborto && !form.individuoIdMaeAdotiva2 && (form.idManejoMaeAdotiva2 || form.idBrincoMaeAdotiva2 || form.idChipMaeAdotiva2)) {
          if (!form.categoriaMaeAdotiva2 || form.categoriaMaeAdotiva2.trim() === '') return 'Classificação da matriz adotiva da 2ª cria é obrigatória'
        }
        return null
      }
    },
  }

  const { isValid, errors: validationErrors } = useFormValidation(form, validationRules)

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInputEvent = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleProblemasPartoChange = (newProblemas: string[]) => {
    setForm(prev => ({
      ...prev,
      problemasParto: newProblemas
    }))
  }

  const handleGemelosToggle = (checked: boolean) => {
    setForm(prev => ({
      ...prev,
      gemelos: checked,
      gemelosNatimorto: false,
      // Limpar campos da 2ª cria ao desmarcar
      ...(checked ? {} : {
        pesoCria2: '',
        idProvisorioCria2: '',
        idBrincoCria2: '',
        idChipCria2: '',
        sexo2: '',
        raca2: '',
        tratamentos2: [],
        medicamentos2: [],
      })
    }))
  }

  const handleGuachoCriaToggle = (checked: boolean) => {
    setForm(prev => ({
      ...prev,
      guachoCria: checked,
      // Limpar campos da adotiva ao desmarcar
      ...(checked ? {} : {
        idManejoMaeAdotiva: '', idBrincoMaeAdotiva: '', idChipMaeAdotiva: '',
        individuoIdMaeAdotiva: '', categoriaMaeAdotiva: '', racaMaeAdotiva: '',
      })
    }))
  }

  const handleGuachoCria2Toggle = (checked: boolean) => {
    setForm(prev => ({
      ...prev,
      guachoCria2: checked,
      // Limpar campos da adotiva ao desmarcar
      ...(checked ? {} : {
        idManejoMaeAdotiva2: '', idBrincoMaeAdotiva2: '', idChipMaeAdotiva2: '',
        individuoIdMaeAdotiva2: '', categoriaMaeAdotiva2: '', racaMaeAdotiva2: '',
      })
    }))
  }

  const getError = (field: string) => {
    // Only return manual errors (from API validation), not validation errors from the hook
    // Validation errors are shown via asterisks, not red borders
    return errors.find((e) => e.field === field)?.message
  }

  // Listas (lotes, tratamentos, raças, medicamentos): cache local primeiro, aparecem na hora mesmo com rede ruim,
  // e cada uma revalida online com tempo limite sem apagar o que já está na tela.
  useEffect(() => {
    if (!fazendaId) return
    let cancelado = false
    async function carregar() {
      try {
        const cache = await getCachedCadastroData()
        if (cancelado) return
        if (cache?.lotes?.length) {
          setLotesDisponiveis(cache.lotes)
          setLotesPastoMap(cache.lotesPastoMap || {})
        }
        if (cache?.individuos?.length) setIndividuosCache(cache.individuos)
      } catch (error) {
        console.warn('[MaternidadePage] Falha ao ler o cache de cadastros:', error)
      }
      const [tr, ra, me] = await Promise.all([
        getTratamentosFromCacheOnly(fazendaId!),
        getRacasFromCacheOnly(fazendaId!),
        getMedicamentosFromCacheOnly(fazendaId!),
      ])
      if (cancelado) return
      if (tr) setTratamentosDisponiveis(tr)
      if (ra) setRacasDisponiveis(ra)
      if (me) setMedicamentosDisponiveis(me)

      await Promise.allSettled([
        withTimeout(getLotesAtivosCached(fazendaId!), 3500).then(({ lotes, lotesPastoMap: mapa }) => {
          if (cancelado) return
          setLotesDisponiveis(lotes)
          setLotesPastoMap(mapa)
        }),
        getTratamentosCached(fazendaId!).then((d) => { if (!cancelado && d) setTratamentosDisponiveis(d) }),
        getRacasCached(fazendaId!).then((d) => { if (!cancelado && d) setRacasDisponiveis(d) }),
        getMedicamentosCached(fazendaId!).then((d) => { if (!cancelado && d) setMedicamentosDisponiveis(d) }),
      ])
      if (!cancelado) setListasCarregadas(true)
    }
    carregar()
    return () => {
      cancelado = true
    }
  }, [fazendaId, recarga])

  // Escutar atualizações do cache de cadastro
  useEffect(() => {
    const unsubscribe = eventBus.on(CADASTRO_CACHE_UPDATED, (data: any) => {
      // Só aplica o que veio no evento: um payload parcial não pode zerar a lista da tela
      if (data && Array.isArray(data.lotes)) {
        setLotesDisponiveis(data.lotes)
        setLotesPastoMap(data.lotesPastoMap || {})
      }
    })

    return unsubscribe
  }, [])

  // Detalhes do lote (cabeças, categorias, pasto). Cache local primeiro (libera o formulário na hora, mesmo com
  // rede ruim) e revalidação online com tempo limite. Sem os dados o SALVAR fica bloqueado: salvar assim gravaria
  // o parto sem lote_id/pasto_id (e, ao trocar de lote sem achar o novo, ficaria o id do lote anterior).
  useEffect(() => {
    let cancelado = false
    setDetalhesLote(null)
    setLoteIndisponivel(false)
    setForm((prev) => (prev.loteId || prev.pastoId ? { ...prev, loteId: '', pastoId: '' } : prev))

    const nome = form.lote
    if (!nome || !fazendaId) {
      setCarregandoLote(false)
      return
    }
    setCarregandoLote(true)

    const aplicar = (lote: any, det: any) => {
      setDetalhesLote({
        ...lote,
        categorias: det.categorias,
        n_cabecas: det.quant_atual,
        peso_vivo_kg: det.peso_vivo_kg,
        qtd_bezerros: det.qtd_bezerros,
      })
      setForm((prev) => ({ ...prev, loteId: lote.id, pastoId: lote.pasto_id || '' }))
    }

    async function carregarDetalhesLote() {
      try {
        const loteCache = await getLoteByNomeFromCacheOnly(fazendaId!, nome)
        const detCache = loteCache ? await getLoteDetalhesFromCacheOnly(loteCache.id) : null
        if (cancelado) return
        let resolvido = false
        if (loteCache && detCache) {
          aplicar(loteCache, detCache)
          setCarregandoLote(false)
          resolvido = true
        }
        try {
          const lote = await getLoteByNomeCached(fazendaId!, nome)
          if (cancelado) return
          const det = lote ? await getLoteDetalhesComCategoriasCached(lote.id) : null
          if (cancelado) return
          if (lote && det) {
            aplicar(lote, det)
            resolvido = true
          }
        } catch (error) {
          console.warn('[MaternidadePage] Revalidação do lote falhou, usando o que está no aparelho:', error)
        }
        if (cancelado) return
        if (!resolvido) setLoteIndisponivel(true)
      } catch (error) {
        if (cancelado) return
        console.error('Erro ao carregar detalhes do lote:', error)
        setLoteIndisponivel(true)
      } finally {
        if (!cancelado) setCarregandoLote(false)
      }
    }

    carregarDetalhesLote()
    return () => {
      cancelado = true
    }
  }, [form.lote, fazendaId, recarga])

  const loteBloqueado = carregandoLote || loteIndisponivel
  pendenteRef.current = (loteIndisponivel && !carregandoLote) || (listasCarregadas && lotesDisponiveis.length === 0)

  useEffect(() => {
    const aoVoltarInternet = () => {
      if (pendenteRef.current) {
        // O sistema avisou que a internet voltou: o sinal de rede instável não vale mais
        registrarRespostaDeRede()
        setRecarga((n) => n + 1)
      }
    }
    window.addEventListener('online', aoVoltarInternet)
    // Wi-Fi sem internet que volta não dispara 'online': tenta de novo de tempos em tempos enquanto faltar dado
    const tentativa = setInterval(() => {
      if (pendenteRef.current) setRecarga((n) => n + 1)
    }, 25_000)
    return () => {
      window.removeEventListener('online', aoVoltarInternet)
      clearInterval(tentativa)
    }
  }, [])

  // Erro de salvamento anterior não vale para outra data/lote
  useEffect(() => {
    setErrors([])
  }, [form.data, form.lote])

  // Brinco/chip repetido (entre mãe, adotivas e crias, ou já existente no aparelho): o servidor recusaria o parto
  const opConflito = {
    cria1Viva: !cria1Morta,
    cria2Viva: form.gemelos && !cria2Morta,
    guacho1: form.guachoCria && !cria1Morta,
    guacho2: form.guachoCria2 && !isAborto,
  }
  const conflitosDentro = conflitosDeIdentificacao(form as unknown as Record<string, unknown>, opConflito)
  const conflitosRebanho = conflitosComRebanho(form as unknown as Record<string, unknown>, opConflito, individuosCache).filter(
    (c) => !conflitosDentro.some((d) => d.field === c.field)
  )
  const conflitosIds = [...conflitosDentro, ...conflitosRebanho]

  const executarSalvamento = async () => {
    setErrors([])

    // Validate form using the validation hook
    if (!isValid) {
      const errorArray = Object.entries(validationErrors).map(([field, message]) => ({
        field,
        message
      }))
      setErrors(errorArray)
      scrollToFirstError(errorArray)
      return
    }
    if (conflitosIds.length > 0) {
      setErrors(conflitosIds)
      scrollToFirstError(conflitosIds)
      return
    }

    // Montar observação combinada: problemas de parto + observação livre (parte comum)
    const observacaoPartesComuns: string[] = []
    if (form.problemasParto.length > 0) {
      observacaoPartesComuns.push(`Problemas: ${form.problemasParto.join(', ')}`)
    }
    if (form.observacaoParto && form.observacaoParto.trim() !== '') {
      observacaoPartesComuns.push(form.observacaoParto.trim())
    }
    const observacaoComum = observacaoPartesComuns.join(' | ')

    // Guacho não se aplica a cria morta (sem identificação)
    const guacho1 = form.guachoCria && !cria1Morta
    const guacho2 = form.guachoCria2 && !isAborto

    // Observação da 1ª cria (comum + guacho se marcado)
    const observacaoCria1 = [
      ...(observacaoComum ? [observacaoComum] : []),
      ...(guacho1 ? ['Guacho'] : []),
    ].join(' | ')

    // Observação da 2ª cria (comum + guacho se marcado)
    const observacaoCria2 = [
      ...(observacaoComum ? [observacaoComum] : []),
      ...(guacho2 ? ['Guacho'] : []),
    ].join(' | ')

    // Tipo de parto: incluir 'Auxiliado' se marcado, 'Gêmeos' se marcado, 'Aborto'/'Natimorto' quando a cria morre
    const tipoPartoFinal = [
      ...form.tipoParto,
      ...(form.partoAuxiliado ? ['Auxiliado'] : []),
      ...(form.gemelos ? ['Gêmeos'] : []),
      ...(isAborto ? ['Aborto'] : []),
      ...(isNatimorto ? ['Natimorto'] : []),
    ]

    // Animais novos (mãe, mães adotivas e crias) NÃO são mais gravados direto no Supabase daqui: viajam no registro,
    // com id gerado agora, e o sync os cria de forma idempotente antes do registro. Assim o SALVAR não depende da
    // rede (antes cada gravação esperava até 20 s com sinal ruim) e reenviar não duplica o animal nem estoura o
    // índice único de brinco. Em modo teste nada vai ao servidor.
    const gravaAnimais = !testModeAtivo
    const novoId = () => crypto.randomUUID()

    let individuoIdMaeFinal = form.individuoIdMae
    const novosMae: Record<string, unknown>[] = []
    if (gravaAnimais && !individuoIdMaeFinal && (form.idManejoMae || form.idBrincoMae || form.idChipMae)) {
      individuoIdMaeFinal = novoId()
      novosMae.push({
        id: individuoIdMaeFinal,
        fazenda_id: fazendaId,
        id_manejo: form.idManejoMae || null,
        id_brinco: form.idBrincoMae || null,
        id_chip: form.idChipMae || null,
        sexo: 'Fêmea',
        raca: form.racaMae || null,
        categoria: 'Vaca Parida',
        classificacao_matriz: form.categoriaMae || null,
        status: 'Vivo',
        data_nascimento: null,
        lote_atual: form.loteId || null,
        pasto_atual: form.pastoId || null,
        origem: 'Cadastro Manual',
      })
    }

    // Mãe adotiva (guacho): a categoria deriva da classificação (Nulípara → Vaca Vazia, demais → Vaca Parida)
    const categoriaAdotiva = (cat: string) => cat === 'Nulípara' ? 'Vaca Vazia' : 'Vaca Parida'
    let individuoIdMaeAdotivaFinal = form.individuoIdMaeAdotiva
    const novosAdotiva1: Record<string, unknown>[] = []
    if (gravaAnimais && guacho1 && !individuoIdMaeAdotivaFinal && (form.idManejoMaeAdotiva || form.idBrincoMaeAdotiva || form.idChipMaeAdotiva)) {
      individuoIdMaeAdotivaFinal = novoId()
      novosAdotiva1.push({
        id: individuoIdMaeAdotivaFinal,
        fazenda_id: fazendaId,
        id_manejo: form.idManejoMaeAdotiva || null,
        id_brinco: form.idBrincoMaeAdotiva || null,
        id_chip: form.idChipMaeAdotiva || null,
        sexo: 'Fêmea',
        raca: form.racaMaeAdotiva || null,
        categoria: categoriaAdotiva(form.categoriaMaeAdotiva),
        classificacao_matriz: form.categoriaMaeAdotiva || null,
        status: 'Vivo',
        data_nascimento: null,
        lote_atual: form.loteId || null,
        pasto_atual: form.pastoId || null,
        origem: 'Cadastro Manual',
      })
    }

    let individuoIdMaeAdotiva2Final = form.individuoIdMaeAdotiva2
    const novosAdotiva2: Record<string, unknown>[] = []
    if (gravaAnimais && guacho2 && !individuoIdMaeAdotiva2Final && (form.idManejoMaeAdotiva2 || form.idBrincoMaeAdotiva2 || form.idChipMaeAdotiva2)) {
      individuoIdMaeAdotiva2Final = novoId()
      novosAdotiva2.push({
        id: individuoIdMaeAdotiva2Final,
        fazenda_id: fazendaId,
        id_manejo: form.idManejoMaeAdotiva2 || null,
        id_brinco: form.idBrincoMaeAdotiva2 || null,
        id_chip: form.idChipMaeAdotiva2 || null,
        sexo: 'Fêmea',
        raca: form.racaMaeAdotiva2 || null,
        categoria: categoriaAdotiva(form.categoriaMaeAdotiva2),
        classificacao_matriz: form.categoriaMaeAdotiva2 || null,
        data_nascimento: null,
        lote_atual: form.loteId || null,
        pasto_atual: form.pastoId || null,
        origem: 'Cadastro Manual',
      })
    }

    // Animal da cria (id gerado aqui; o sync grava)
    const montarCria = (dadosCria: {
      idProvisorio: string
      idBrinco: string
      idChip: string
      sexo: string
      raca: string
      peso: string
      maeAdotivaId?: string
    }): Record<string, unknown> => {
      const categoriaCria = dadosCria.sexo === 'Macho' ? 'Bezerro ao Pé' : 'Bezerra ao Pé'
      const dataNascimentoIso = brToIso(form.data)
      return {
        id: novoId(),
        fazenda_id: fazendaId,
        id_provisorio_cria: dadosCria.idProvisorio || null,
        id_brinco: dadosCria.idBrinco || null,
        id_chip: dadosCria.idChip || null,
        sexo: dadosCria.sexo,
        raca: dadosCria.raca,
        categoria: categoriaCria,
        data_nascimento: dataNascimentoIso || null,
        peso_nascimento_kg: dadosCria.peso ? Number(dadosCria.peso) : null,
        parto: tipoPartoFinal,
        origem: 'Nascimento',
        data_entrada_fazenda: dataNascimentoIso || null,
        mae: individuoIdMaeFinal || null,
        mae_adotiva_id: dadosCria.maeAdotivaId || null,
        id_brinco_mae: form.idBrincoMae || null,
        id_chip_mae: form.idChipMae || null,
        lote_atual: form.loteId || null,
        pasto_atual: form.pastoId || null,
        status: 'Vivo',
        idade_atual_dias: 0,
        idade_atual_meses: 0,
      }
    }

    // 1ª cria (cria morta não entra no rebanho)
    const novaCria1 = !gravaAnimais || cria1Morta ? null : montarCria({
      idProvisorio: form.idProvisorioCria,
      idBrinco: form.idBrincoCria,
      idChip: form.idChipCria,
      sexo: form.sexo,
      raca: form.raca,
      peso: form.pesoCria,
      maeAdotivaId: guacho1 ? (individuoIdMaeAdotivaFinal || undefined) : undefined,
    })
    const individuoIdCria = novaCria1 ? String(novaCria1.id) : ''

    // 2ª cria (gêmeos e 2ª cria viva; aborto não entra no rebanho)
    const novaCria2 = !gravaAnimais || !(form.gemelos && !cria2Morta) ? null : montarCria({
      idProvisorio: form.idProvisorioCria2,
      idBrinco: form.idBrincoCria2,
      idChip: form.idChipCria2,
      sexo: form.sexo2,
      raca: form.raca2,
      peso: form.pesoCria2,
      maeAdotivaId: guacho2 ? (individuoIdMaeAdotiva2Final || undefined) : undefined,
    })
    const individuoIdCria2 = novaCria2 ? String(novaCria2.id) : ''

    // Cada registro leva os animais que referencia (mãe repetida no 2º registro: o sync ignora id que já existe)
    const novosIndividuos1 = [...novosMae, ...novosAdotiva1, ...(novaCria1 ? [novaCria1] : [])]
    const novosIndividuos2 = [...novosMae, ...novosAdotiva2, ...(novaCria2 ? [novaCria2] : [])]

    // Construir strings finais de tratamentos
    const tratamentoFinal = form.tratamentos.join(', ')
    const tratamentoFinal2 = form.tratamentos2.join(', ')
    const pastoNome = detalhesLote?.pastos?.nome || null

    // Vínculo entre gêmeos (mesmo UUID para ambos os registros)
    const partoVinculoId = form.gemelos ? crypto.randomUUID() : null

    // Registrar 1ª cria (cria morta: sem identificação nem indivíduo)
    const result = await salvarRegistro('maternidade', {
      data: form.data,
      pasto: pastoNome,
      pastoId: form.pastoId,
      lote: form.lote,
      loteId: form.loteId,
      pesoCria: cria1Morta ? null : (form.pesoCria ? Number(form.pesoCria) : null),
      idProvisorioCria: cria1Morta ? null : form.idProvisorioCria,
      idBrincoCria: cria1Morta ? null : form.idBrincoCria,
      idChipCria: cria1Morta ? null : form.idChipCria,
      tratamento: cria1Morta ? null : tratamentoFinal,
      medicamentos: cria1Morta ? [] : form.medicamentos,
      tipoParto: tipoPartoFinal,
      observacaoParto: observacaoCria1,
      sexo: cria1Morta ? null : form.sexo,
      raca: cria1Morta ? null : form.raca,
      idManejoMae: form.idManejoMae,
      idBrincoMae: form.idBrincoMae,
      idChipMae: form.idChipMae,
      individuoIdMae: individuoIdMaeFinal,
      individuoIdCria,
      novosIndividuos: novosIndividuos1,
      categoriaMae: form.categoriaMae,
      escoreMatriz: form.escoreMatriz ? Number(form.escoreMatriz) : null,
      docilidadeMatriz: form.docilidadeMatriz ? Number(form.docilidadeMatriz) : null,
      partoVinculoId,
      // Mãe adotiva (guacho)
      guachoCria: guacho1,
      individuoIdMaeAdotiva: guacho1 ? (individuoIdMaeAdotivaFinal || null) : null,
      idManejoMaeAdotiva: guacho1 ? form.idManejoMaeAdotiva : null,
      idBrincoMaeAdotiva: guacho1 ? form.idBrincoMaeAdotiva : null,
      idChipMaeAdotiva: guacho1 ? form.idChipMaeAdotiva : null,
      categoriaMaeAdotiva: guacho1 ? form.categoriaMaeAdotiva : null,
      racaMaeAdotiva: guacho1 ? form.racaMaeAdotiva : null,
      fotoBase64: fotoCria.fotoBase64 || null,
      fotoBrincoMaeBase64: fotoBrincoMae.fotoBase64 || null,
      usuario: usuario,
    })

    // Registrar 2ª cria (gêmeos)
    if (form.gemelos) {
      try {
        // 2ª cria natimorta: garante 'Natimorto' no tipoParto; cria viva não herda a marca da 1ª cria
        const tipoPartoCria2 = form.gemelosNatimorto
          ? (tipoPartoFinal.includes('Natimorto') ? tipoPartoFinal : [...tipoPartoFinal, 'Natimorto'])
          : tipoPartoFinal.filter((t) => t !== 'Natimorto')

        await salvarRegistro('maternidade', {
          data: form.data,
          pasto: pastoNome,
          pastoId: form.pastoId,
          lote: form.lote,
          loteId: form.loteId,
          // 2ª cria morta (natimorta ou aborto): sem peso, sem IDs
          pesoCria: cria2Morta ? null : (form.pesoCria2 ? Number(form.pesoCria2) : null),
          idProvisorioCria: cria2Morta ? null : form.idProvisorioCria2,
          idBrincoCria: cria2Morta ? null : form.idBrincoCria2,
          idChipCria: cria2Morta ? null : form.idChipCria2,
          // 2ª cria morta: sem primeiros cuidados
          tratamento: cria2Morta ? null : tratamentoFinal2,
          medicamentos: cria2Morta ? [] : form.medicamentos2,
          tipoParto: tipoPartoCria2,
          observacaoParto: observacaoCria2,
          // 2ª cria morta: sem sexo e raça (não identificado)
          sexo: cria2Morta ? null : form.sexo2,
          raca: cria2Morta ? null : form.raca2,
          idManejoMae: form.idManejoMae,
          idBrincoMae: form.idBrincoMae,
          idChipMae: form.idChipMae,
          individuoIdMae: individuoIdMaeFinal,
          individuoIdCria: individuoIdCria2,
          novosIndividuos: novosIndividuos2,
          categoriaMae: form.categoriaMae,
          escoreMatriz: form.escoreMatriz ? Number(form.escoreMatriz) : null,
          docilidadeMatriz: form.docilidadeMatriz ? Number(form.docilidadeMatriz) : null,
          partoVinculoId,
          // Mãe adotiva (guacho 2ª cria)
          guachoCria: guacho2,
          individuoIdMaeAdotiva: guacho2 ? (individuoIdMaeAdotiva2Final || null) : null,
          idManejoMaeAdotiva: guacho2 ? form.idManejoMaeAdotiva2 : null,
          idBrincoMaeAdotiva: guacho2 ? form.idBrincoMaeAdotiva2 : null,
          idChipMaeAdotiva: guacho2 ? form.idChipMaeAdotiva2 : null,
          categoriaMaeAdotiva: guacho2 ? form.categoriaMaeAdotiva2 : null,
          racaMaeAdotiva: guacho2 ? form.racaMaeAdotiva2 : null,
          fotoBase64: fotoCria.fotoBase64 || null,
        })
      } catch (err) {
        console.error('Erro ao salvar registro da 2ª cria (gêmeos):', err)
      }
    }

    if (!result.success) {
      const errosSalvar = result.errors ?? [{ field: 'geral', message: 'Não foi possível salvar. Tente novamente.' }]
      setErrors(errosSalvar)
      scrollToFirstError(errosSalvar)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      limparRascunho()
      fotoCria.limpar()
      fotoBrincoMae.limpar()
      setAnimalIdentifierKey(k => k + 1)
      // Invalida cache de detalhes do lote para refletir o novo bezerro/bezerra
      if (form.loteId) {
        clearCachedQuery(buildCacheKey('lote-detalhes', form.loteId))
      }
    }
  }

  // Trava de toque duplo e sem salvar enquanto faltam os dados do lote
  const handleSalvar = async () => {
    if (salvandoRef.current || loteBloqueado) return
    salvandoRef.current = true
    setSalvando(true)
    try {
      await executarSalvamento()
    } catch (error) {
      console.error('Erro ao salvar maternidade:', error)
      const erro = [{ field: 'geral', message: 'Erro ao salvar o parto. Tente novamente.' }]
      setErrors(erro)
      scrollToFirstError(erro)
    } finally {
      salvandoRef.current = false
      setSalvando(false)
    }
  }

  const handleLimpar = () => {
    limparRascunho()
    fotoCria.limpar()
    fotoBrincoMae.limpar()
    setAnimalIdentifierKey(k => k + 1)
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

  // ---------- Apoio da UI nova (mesmo estado e mesmo payload de antes) ----------
  const categoriasLoteStr = detalhesLote?.categorias
    ? processarCategorias(detalhesLote.categorias).map(capitalizarCategoria).join(', ')
    : ''

  // Parto em escolha única: Normal / Precisa ajudar (Normal + Auxiliado) / Cesárea
  const partoOpcao = form.tipoParto.includes('Cesárea')
    ? 'Cesárea'
    : form.tipoParto.includes('Normal')
      ? (form.partoAuxiliado ? 'Auxiliado' : 'Normal')
      : ''
  const selecionarParto = (v: string) =>
    setForm((prev) =>
      v === 'Cesárea'
        ? { ...prev, tipoParto: ['Cesárea'], partoAuxiliado: false }
        : { ...prev, tipoParto: ['Normal'], partoAuxiliado: v === 'Auxiliado' }
    )

  const opcoesRaca = racasDisponiveis.length > 0
    ? racasDisponiveis.map((r: any) => r.nome as string)
    : RACAS_PADRAO.map((r) => r.value)

  const iconeCuidado = (nome: string): string => {
    const n = nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    if (n.includes('colostro')) return '🍼'
    if (n.includes('umbigo')) return '🩹'
    if (n.includes('brinco') || n.includes('orelha')) return '🏷️'
    if (n.includes('repelente')) return '🧴'
    if (n.includes('vermifug')) return '🐛'
    if (n.includes('antibiot')) return '💉'
    if (n.includes('soro')) return '🧪'
    if (n.includes('pesagem')) return '⚖️'
    if (n.includes('tatuagem')) return '🖋️'
    if (n.includes('probiot')) return '💊'
    if (n.includes('unguento')) return '🧴'
    return '💊'
  }

  const rotulo = 'text-[15px] font-bold uppercase text-gray-900'
  const erroTexto = (field: string) =>
    getError(field) ? <p className="text-base font-semibold text-red-700">{getError(field)}</p> : null

  const tileFoto = (
    nome: string,
    h: ReturnType<typeof usePhotoGps>,
    onTirar: () => void,
  ) => (
    <div className="flex flex-col gap-2">
      <label className={rotulo}>{nome}</label>
      <div className="relative">
        <button
          type="button"
          onClick={onTirar}
          disabled={h.capturandoFoto}
          className={`relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl border-2 transition-all active:scale-[0.99] disabled:opacity-60 ${
            h.fotoBase64 ? 'h-24 border-green-500' : 'min-h-[56px] border-brand-900 bg-brand-900 px-3 py-2.5 text-white hover:bg-brand-800'
          }`}
        >
          {h.fotoBase64 ? (
            <>
              <img src={base64ToDataUrl(h.fotoBase64)} alt={nome} className="h-full w-full object-cover" />
              <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-sm font-black text-white">✓</span>
            </>
          ) : (
            <>
              <span className="text-lg leading-none">📷</span>
              <span className="text-sm font-extrabold uppercase tracking-wide">{h.capturandoFoto ? 'Capturando...' : nome}</span>
            </>
          )}
        </button>
        {h.fotoBase64 && (
          <button
            type="button"
            onClick={h.limpar}
            aria-label={`Remover ${nome}`}
            className="absolute right-1.5 top-1.5 flex !min-h-0 h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
          >
            <X className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
        )}
      </div>
      {h.fotoErro && <InfoStrip tone="danger">{h.fotoErro}</InfoStrip>}
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

  /** Bloco de uma cria (n = 1 ou 2): mesmas chaves de estado de antes, sufixo '' ou '2'. */
  const renderCria = (n: 1 | 2) => {
    const sfx = n === 1 ? '' : '2'
    const k = (base: string) => (base + sfx) as keyof FormState
    const f = form as any
    const guacho = !!f[k('guachoCria')]
    const toggleGuacho = n === 1 ? handleGuachoCriaToggle : handleGuachoCria2Toggle
    const tratamentos: string[] = f[k('tratamentos')]
    const adotivaNova = !f[k('individuoIdMaeAdotiva')] && (f[k('idManejoMaeAdotiva')] || f[k('idBrincoMaeAdotiva')] || f[k('idChipMaeAdotiva')])
    const categoriaAdotivaAtual = f[k('categoriaMaeAdotiva')]

    return (
      <>
        <Input
          label={<span>ID PROVISÓRIO <span className="text-red-500">*</span></span>}
          placeholder={n === 1 ? 'Ex: 2023-145' : 'Ex: 2023-146'}
          value={f[k('idProvisorioCria')]}
          onChange={setInputEvent(k('idProvisorioCria'))}
          error={getError(`idProvisorioCria${sfx}`)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="ID BRINCO"
            placeholder="Opcional"
            value={f[k('idBrincoCria')]}
            onChange={setInputEvent(k('idBrincoCria'))}
            error={getError(`idBrincoCria${sfx}`)}
          />
          <Input
            label="ID CHIP"
            placeholder="Opcional"
            value={f[k('idChipCria')]}
            onChange={setInputEvent(k('idChipCria'))}
            error={getError(`idChipCria${sfx}`)}
          />
        </div>

        <div className="flex flex-col gap-2" data-field={`pesoCria${sfx}`}>
          <label className={rotulo}>Peso ao nascer <span className="text-red-500">*</span></label>
          <StepperInput
            value={f[k('pesoCria')]}
            onChange={(v) => setForm((prev) => ({ ...prev, [k('pesoCria')]: v }))}
            min={0}
            step={0.5}
            suffix="kg"
            error={getError(`pesoCria${sfx}`)}
          />
        </div>

        <div className="flex flex-col gap-2" data-field={`sexo${sfx}`}>
          <label className={rotulo}>Sexo <span className="text-red-500">*</span></label>
          <ChoiceGrid
            options={SEXO}
            value={f[k('sexo')]}
            onChange={(v) => setForm((prev) => ({ ...prev, [k('sexo')]: v }))}
            cols={2}
          />
          {erroTexto(`sexo${sfx}`)}
        </div>

        <div data-field={`raca${sfx}`}>
          <SearchableModal
            label={<span>RAÇA <span className="text-red-500">*</span></span>}
            value={f[k('raca')]}
            onChange={(v) => setForm((prev) => ({ ...prev, [k('raca')]: v }))}
            error={getError(`raca${sfx}`)}
            options={opcoesRaca}
            placeholder="Buscar raça..."
            id={`raca${sfx}`}
            name={`raca${sfx}`}
          />
        </div>

        <div className="flex flex-col gap-2" data-field={`tratamentos${sfx}`}>
          <label className={rotulo}>Primeiros cuidados (marque todos) <span className="text-red-500">*</span></label>
          <ChoiceGrid
            mode="multi"
            showCheck
            options={tratamentosDisponiveis.map((t: any) => ({ value: t.nome, label: String(t.nome).toUpperCase(), icon: iconeCuidado(t.nome) }))}
            values={tratamentos}
            onChangeMulti={(vals) => setForm((prev) => ({ ...prev, [k('tratamentos')]: vals }))}
            cols={3}
            labelSize="xs"
          />
          {erroTexto(`tratamentos${sfx}`)}
        </div>

        <div className="flex flex-col gap-2">
          <label className={rotulo}>Medicamentos (opcional)</label>
          <MedicamentosSection
            items={f[k('medicamentos')]}
            onChange={(items) => setForm((prev) => ({ ...prev, [k('medicamentos')]: items }))}
            medicamentosDisponiveis={medicamentosDisponiveis}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={rotulo}>Bezerro guacho (outra vaca adotou)?</label>
          <ChoiceGrid
            options={[{ value: 'S', label: 'SIM', icon: '✅' }, { value: 'N', label: 'NÃO', icon: '❌' }]}
            value={guacho ? 'S' : 'N'}
            onChange={(v) => toggleGuacho(v === 'S')}
            cols={2}
            size="sm"
          />
          <p className="text-xs text-gray-500">Bezerro abandonado pela mãe biológica e adotado por outra. Informe a mãe adotiva abaixo.</p>
        </div>

        {guacho && (
          <div className="flex flex-col gap-4 rounded-xl border border-green-200 bg-green-50 p-4">
            <span className="text-base font-bold text-green-800">MÃE ADOTIVA</span>
            <AnimalIdentifier
              fazendaId={fazendaId}
              valueManejo={f[k('idManejoMaeAdotiva')]}
              valueBrinco={f[k('idBrincoMaeAdotiva')]}
              valueChip={f[k('idChipMaeAdotiva')]}
              onChange={({ idManejo, idBrinco, idChip, individuoId, animalData }) => {
                setForm((prev) => ({
                  ...prev,
                  [k('idManejoMaeAdotiva')]: idManejo,
                  [k('idBrincoMaeAdotiva')]: idBrinco,
                  [k('idChipMaeAdotiva')]: idChip,
                  [k('individuoIdMaeAdotiva')]: individuoId || '',
                  // Preencher raça e classificação do animal existente
                  [k('racaMaeAdotiva')]: animalData?.raca || '',
                  [k('categoriaMaeAdotiva')]: animalData?.classificacao_matriz || '',
                }))
              }}
              required={true}
              showAnimalCard={true}
            />
            {/* Dados da nova mãe adotiva (quando não encontrada na base) */}
            {adotivaNova && (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-500">SEXO</p>
                    <p className="font-bold text-gray-900">Fêmea</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-500">STATUS</p>
                    <p className="font-bold text-gray-900">Vivo</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-500">CATEGORIA</p>
                    <p className="font-bold text-gray-900">{categoriaAdotivaAtual === 'Nulípara' ? 'Vaca Vazia' : 'Vaca Parida'}</p>
                  </div>
                </div>
                <div data-field={`racaMaeAdotiva${sfx}`}>
                  <SearchableModal
                    label={<span>RAÇA <span className="text-red-500">*</span></span>}
                    value={f[k('racaMaeAdotiva')]}
                    onChange={(v) => setForm((prev) => ({ ...prev, [k('racaMaeAdotiva')]: v }))}
                    error={getError(`racaMaeAdotiva${sfx}`)}
                    options={opcoesRaca}
                    placeholder="Buscar raça..."
                    id={`racaMaeAdotiva${sfx}`}
                    name={`racaMaeAdotiva${sfx}`}
                  />
                </div>
                <div className="flex flex-col gap-2" data-field={`categoriaMaeAdotiva${sfx}`}>
                  <label className={rotulo}>Classificação da matriz adotiva <span className="text-red-500">*</span></label>
                  <ChoiceGrid
                    options={CATEGORIAS_MAE}
                    value={categoriaAdotivaAtual}
                    onChange={(v) => setForm((prev) => ({ ...prev, [k('categoriaMaeAdotiva')]: v }))}
                    cols={2}
                    size="sm"
                  />
                  {erroTexto(`categoriaMaeAdotiva${sfx}`)}
                </div>
              </>
            )}
          </div>
        )}
      </>
    )
  }

  const aviso = (texto: string) => (
    <InfoStrip tone="danger" icon="💀">{texto}</InfoStrip>
  )

  const pendenciaTexto = (() => {
    if (!form.lote) return 'Falta escolher o pasto/lote'
    if (carregandoLote) return 'Carregando dados do lote...'
    if (loteIndisponivel) return 'Dados do lote indisponíveis neste aparelho: conecte à internet e atualize os dados'
    if (!form.idManejoMae.trim() && !form.idBrincoMae.trim() && !form.idChipMae.trim()) return 'Falta identificar a mãe (manejo, brinco ou chip)'
    if (!form.categoriaMae) return 'Falta a classificação da matriz'
    if (!form.escoreMatriz) return 'Falta o escore da matriz'
    if (!form.docilidadeMatriz) return 'Falta a docilidade da matriz'
    if (form.tipoParto.length === 0) return 'Falta informar como foi o parto'
    if (validationErrors._maeIdentificada) return validationErrors._maeIdentificada
    if (validationErrors._racaMae) return validationErrors._racaMae
    const faltaAdotiva = Object.keys(validationErrors).find((k) => /^_(mae|raca|categoria)MaeAdotiva|^_maeAdotiva/.test(k))
    if (faltaAdotiva) return validationErrors[faltaAdotiva]
    if (conflitosIds.length > 0) return conflitosIds[0].message
    return validationErrors && Object.keys(validationErrors).length > 0 ? 'Falta preencher os dados da cria' : undefined
  })()

  const novaMae = !form.individuoIdMae && (form.idManejoMae || form.idBrincoMae || form.idChipMae)

  return (
    <>
      <CadernetaLayout
        title="MATERNIDADE"
        cadernetaId="maternidade"
        dateContent={<DatePicker value={form.data} onChange={set('data')} variant="header" compact inline maxDate={todayBR()} />}
      >
        <BannerRascunho visible={rascunhoRestaurado} onConfirmar={confirmarRascunho} onDescartar={descartarRascunho} />
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        <button
          type="button"
          onClick={() => setShowPdfModal(true)}
          className="flex !min-h-0 w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3 font-bold text-black transition-colors hover:bg-yellow-300"
        >
          <FileText className="h-5 w-5" strokeWidth={2.5} />
          <span>POP MATERNIDADE</span>
        </button>

        {/* Pasto/Lote */}
        <CadernetaSection titulo="Pasto/Lote" required>
          {lotesDisponiveis.length > 0 ? (
            <SearchableModal
              label=""
              value={form.lote}
              onChange={set('lote')}
              error={getError('lote')}
              options={lotesDisponiveis}
              secondaryText={(lote) => lotesPastoMap[lote] || ''}
              placeholder="Selecione o pasto/lote..."
              id="lote"
              name="lote"
            />
          ) : (
            <Input
              label="PASTO/LOTE"
              placeholder="Carregando..."
              value={form.lote}
              onChange={setInputEvent('lote')}
              error={getError('lote')}
              inputMode="text"
              disabled
            />
          )}
          {detalhesLote && (
            <InfoCard
              icon={Beef}
              title={form.lote}
              subtitle={detalhesLote.pastos?.nome || lotesPastoMap[form.lote] || 'Sem pasto associado'}
              stats={[
                { label: 'Cabeças', value: detalhesLote.n_cabecas != null ? String(detalhesLote.n_cabecas) : '-', span: 1 },
                {
                  label: 'PV médio',
                  value: detalhesLote.peso_vivo_kg != null
                    ? `${Number(detalhesLote.peso_vivo_kg).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`
                    : '-',
                  span: 1,
                },
                ...(categoriasLoteStr ? [{ label: 'Categorias', value: categoriasLoteStr, span: 2 }] : []),
              ]}
            />
          )}
        </CadernetaSection>

        {/* 1. A mãe */}
        <CadernetaSection numero={1} titulo="A mãe">
          {hasIndividuos === true && (
            <InfoStrip tone="neutral" icon="💡">
              <strong>Não encontrou a mãe?</strong> Clique em qualquer um dos 3 campos de busca abaixo, vá em <strong>NOVO</strong> no final da tela que se abrir e informe o ID Manejo, Brinco e/ou Chip para cadastrá-la automaticamente.
            </InfoStrip>
          )}
          <AnimalIdentifier
            key={animalIdentifierKey}
            fazendaId={fazendaId}
            valueManejo={form.idManejoMae}
            valueBrinco={form.idBrincoMae}
            valueChip={form.idChipMae}
            onHasIndividuosChange={setHasIndividuos}
            onChange={({ idManejo, idBrinco, idChip, individuoId, animalData }) => {
              setForm(prev => ({
                ...prev,
                idManejoMae: idManejo,
                idBrincoMae: idBrinco,
                idChipMae: idChip,
                individuoIdMae: individuoId || '',
                // Auto-populate from individuo data if available
                categoriaMae: animalData?.classificacao_matriz || prev.categoriaMae,
                // Clear new-mother fields when an existing animal is found
                racaMae: individuoId ? '' : prev.racaMae,
                categoriaAnimalMae: individuoId ? '' : prev.categoriaAnimalMae,
              }))
            }}
            required={true}
            showAnimalCard={true}
          />

          {tileFoto('Foto do brinco da mãe (opcional)', fotoBrincoMae, () => fotoBrincoMae.capturarFoto())}

          {/* Dados da nova mãe (quando não encontrada na base) */}
          {novaMae && (
            <div className="flex flex-col gap-4 rounded-xl border border-green-200 bg-green-50 p-4">
              <span className="text-base font-bold text-green-800">🆕 DADOS DA NOVA MÃE</span>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="font-medium text-gray-500">SEXO</p>
                  <p className="font-bold text-gray-900">Fêmea</p>
                </div>
                <div>
                  <p className="font-medium text-gray-500">STATUS</p>
                  <p className="font-bold text-gray-900">Vivo</p>
                </div>
                <div>
                  <p className="font-medium text-gray-500">CATEGORIA</p>
                  <p className="font-bold text-gray-900">Vaca Parida</p>
                </div>
              </div>
              <div data-field="racaMae">
                <SearchableModal
                  label={<span>RAÇA <span className="text-red-500">*</span></span>}
                  value={form.racaMae}
                  onChange={set('racaMae')}
                  error={getError('racaMae')}
                  options={opcoesRaca}
                  placeholder="Buscar raça..."
                  id="racaMae"
                  name="racaMae"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2" data-field="categoriaMae">
            <label className={rotulo}>Classificação da matriz <span className="text-red-500">*</span></label>
            <div className={form.individuoIdMae ? 'pointer-events-none opacity-60' : ''}>
              <ChoiceGrid
                options={CATEGORIAS_MAE}
                value={form.categoriaMae}
                onChange={set('categoriaMae')}
                cols={2}
                size="sm"
              />
            </div>
            {erroTexto('categoriaMae')}
          </div>

          <div className="flex flex-col gap-2" data-field="escoreMatriz">
            <div className="flex items-center justify-between gap-2">
              <label className={rotulo}>Escore da matriz <span className="text-red-500">*</span></label>
              <button
                type="button"
                onClick={() => setShowEscoreModal(true)}
                className="flex !min-h-0 shrink-0 items-center gap-1.5 rounded-lg bg-yellow-400 px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-black transition-colors hover:bg-yellow-300 active:scale-[0.98]"
              >
                <FileText className="h-3.5 w-3.5" strokeWidth={2.5} />
                POP Escore
              </button>
            </div>
            <ChoiceGrid
              options={ESCORES.map((e) => ({
                value: e.value,
                label: e.label,
                icon: e.color === 'bg-red-500' ? '🔴' : e.color === 'bg-yellow-400' ? '🟡' : '🟢',
              }))}
              value={form.escoreMatriz}
              onChange={set('escoreMatriz')}
              cols={5}
              size="sm"
              labelSize="xs"
            />
            <p className="text-xs text-gray-500">1 Muito magra · 3 Boa · 5 Muito gorda (aceita meios pontos)</p>
            {erroTexto('escoreMatriz')}
          </div>

          <div className="flex flex-col gap-2" data-field="docilidadeMatriz">
            <label className={rotulo}>Docilidade da matriz <span className="text-red-500">*</span></label>
            <ChoiceGrid
              options={[
                { value: '1', label: 'CALMA', icon: '😊' },
                { value: '2', label: 'AGITADA', icon: '😐' },
                { value: '3', label: 'BRAVA', icon: '😠' },
              ]}
              value={form.docilidadeMatriz}
              onChange={set('docilidadeMatriz')}
              cols={3}
              labelSize="xs"
            />
            {erroTexto('docilidadeMatriz')}
          </div>
        </CadernetaSection>

        {/* 2. Parto */}
        <CadernetaSection numero={2} titulo="Parto" required>
          <div className="flex flex-col gap-2" data-field="tipoParto">
            <label className={rotulo}>Como foi? <span className="text-red-500">*</span></label>
            <ChoiceGrid
              options={[
                { value: 'Normal', label: 'NORMAL', icon: '✅' },
                { value: 'Auxiliado', label: 'PRECISOU AJUDAR', icon: '🤝' },
                { value: 'Cesárea', label: 'CESÁREA', icon: '🏥' },
              ]}
              value={partoOpcao}
              onChange={selecionarParto}
              cols={3}
              labelSize="xs"
            />
            {erroTexto('tipoParto')}
          </div>

          <div className="flex flex-col gap-2">
            <label className={rotulo}>Teve problema? (marque todos)</label>
            <ChoiceGrid
              mode="multi"
              showCheck={false}
              options={PROBLEMAS_PARTO.map((p) => ({ ...p, tone: 'danger-solid' as const }))}
              values={form.problemasParto}
              onChangeMulti={handleProblemasPartoChange}
              cols={2}
              labelSize="xs"
              dataField="problemasParto"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className={rotulo}>Quantos bezerros?</label>
            <ChoiceGrid
              options={[
                { value: '1', label: '1', icon: '🐮' },
                { value: '2', label: '2 (GÊMEOS)', icon: '🐮🐮' },
              ]}
              value={form.gemelos ? '2' : '1'}
              onChange={(v) => handleGemelosToggle(v === '2')}
              cols={2}
              labelSize="xs"
            />
            {/* Sub-opção de gêmeos: 2ª cria viva ou natimorta (em aborto todas as crias são mortas) */}
            {form.gemelos && !isAborto && (
              <div className="mt-1 flex flex-col gap-2">
                <p className="text-sm font-semibold text-gray-700">2ª cria:</p>
                <ChoiceGrid
                  options={[
                    { value: 'viva', label: 'VIVA', icon: '✅' },
                    { value: 'natimorta', label: 'NATIMORTA', icon: '💀', tone: 'danger-solid' as const },
                  ]}
                  value={form.gemelosNatimorto ? 'natimorta' : 'viva'}
                  onChange={(v) => setForm((prev) => ({ ...prev, gemelosNatimorto: v === 'natimorta' }))}
                  cols={2}
                  size="sm"
                />
              </div>
            )}
          </div>

          <Input
            label="OBSERVAÇÃO (OPCIONAL)"
            placeholder="Observações sobre o parto..."
            value={form.observacaoParto}
            onChange={setInputEvent('observacaoParto')}
          />
        </CadernetaSection>

        {/* 3. A cria (1ª) — oculta quando a cria morre */}
        {cria1Morta ? (
          aviso(`A cria será registrada como ${isAborto ? 'abortada' : 'natimorta'} e não entrará no rebanho. Não é necessário informar identificação, peso, sexo, raça ou primeiros cuidados.`)
        ) : (
          <CadernetaSection numero={3} titulo={form.gemelos ? 'A cria (1ª)' : 'A cria'}>
            {renderCria(1)}
          </CadernetaSection>
        )}

        {/* 4. 2ª cria (gêmeos) */}
        {form.gemelos && (
          <CadernetaSection numero={4} titulo="2ª cria (gêmeos)">
            {cria2Morta
              ? aviso(`A 2ª cria será registrada como ${isAborto ? 'abortada' : 'natimorta'} e não entrará no rebanho. Não é necessário informar identificação, peso, sexo, raça ou primeiros cuidados.`)
              : renderCria(2)}
          </CadernetaSection>
        )}

        {/* Foto da cria */}
        <CadernetaSection numero={form.gemelos ? 5 : 4} titulo="Foto da cria">
          {tileFoto('Foto da cria (opcional)', fotoCria, () => fotoCria.capturarFoto())}
          <p className="text-sm text-gray-500">Tire uma foto da cria ou da mãe para anexar ao registro.</p>
        </CadernetaSection>

        <FormFooter
          onSalvar={handleSalvar}
          onLimpar={handleLimpar}
          salvando={salvando}
          disabled={!isValid || loteBloqueado || conflitosIds.length > 0}
          formValido={isValid && !loteBloqueado && conflitosIds.length === 0}
          pendenciaTexto={pendenciaTexto}
        />
      </CadernetaLayout>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Maternidade"
        registro={registroSalvo}
        caderneta="maternidade"
      />

      <PdfModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        images={[
          `${BASE}docs/maternidade/POP_Maternidade_1.jpg`,
          `${BASE}docs/maternidade/POP_Maternidade_2.jpg`,
          `${BASE}docs/maternidade/POP_Maternidade_3.jpg`,
          `${BASE}docs/maternidade/POP_Maternidade_4.jpg`,
          `${BASE}docs/maternidade/POP_Maternidade_5.jpg`,
          `${BASE}docs/maternidade/POP_Maternidade_6.jpg`,
          `${BASE}docs/maternidade/POP_Maternidade_7.jpg`
        ]}
      />

      <PdfModal
        isOpen={showEscoreModal}
        onClose={() => setShowEscoreModal(false)}
        images={[
          `${BASE}docs/ECC/POP_ECC.jpeg`
        ]}
      />
    </>
  )
}

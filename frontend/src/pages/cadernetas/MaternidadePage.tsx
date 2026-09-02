import { useState, useEffect } from 'react'
import { Brush, Save } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, Radio, CheckboxGroup, ValidationMessage } from '../../components/ui'
import SearchableModal from '../../components/ui/SearchableModal'
import SuccessModal from '../../components/SuccessModal'
import PdfModal from '../../components/PdfModal'
import { salvarRegistro } from '../../services/api'
import { todayBR, brToIso } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import CadernetaHeader from '../../components/CadernetaHeader'
import {
  getLoteByNomeCached,
  getLoteDetalhesComCategoriasCached,
  getTratamentosCached,
  getRacasCached,
  clearCachedQuery,
  buildCacheKey,
  getLotesAtivosCached,
} from '../../services/cadastroCache'
import { createIndividuo } from '../../services/supabaseService'
import AnimalIdentifier from '../../components/AnimalIdentifier'
import { scrollToFirstError } from '../../utils/scrollToError'
import LoteDetalhesCard from '../../components/LoteDetalhesCard'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { useFormValidation, ValidationRules } from '../../hooks/useFormValidation'

const BASE = import.meta.env.BASE_URL

const TIPOS_PARTO = [
  { value: 'Normal', label: 'NORMAL', icon: '✅' },
  { value: 'Cesárea', label: 'CESÁREA', icon: '🏥' },
]

const PROBLEMAS_PARTO = [
  { value: 'Aborto', label: 'ABORTO', icon: '❌' },
  { value: 'Natimorto', label: 'NATIMORTO', icon: '💀' },
  { value: 'Distócico', label: 'DISTÓCICO', icon: '⚠️' },
  { value: 'Deficiência Física', label: 'DEFICIÊNCIA FÍSICA', icon: '♿' },
  { value: 'Retenção de Placenta', label: 'RETENÇÃO DE PLACENTA', icon: '🩸' },
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
  sexo: '',
  raca: '',
  guachoCria: false,
  pesoCria2: '',
  idProvisorioCria2: '',
  idBrincoCria2: '',
  idChipCria2: '',
  individuoIdCria2: '',
  tratamentos2: [],
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
  const [form, setForm] = useState<FormState>(makeInitial())
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

  const validationRules: ValidationRules = {
    // Form 1: Dados Gerais
    data: { required: true },
    lote: { required: true },
    
    // Form 2: Identificação da Mãe (at least one ID required)
    idManejoMae: { 
      custom: (value: string) => {
        const hasManejo = value && value.trim() !== ''
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

    // Form 4: 1ª Cria
    idProvisorioCria: { required: true },
    pesoCria: { required: true },
    tratamentos: { 
      custom: (value: string[]) => {
        if (!value || value.length === 0) return 'Pelo menos um primeiro cuidado é obrigatório'
        return null
      }
    },
    sexo: { required: true },
    raca: { required: true },

    // Form 5: 2ª Cria (obrigatórios quando gêmeos E 2ª cria viva)
    idProvisorioCria2: {
      custom: (value: string) => {
        if (form.gemelos && !form.gemelosNatimorto && (!value || value.trim() === '')) return 'ID provisório da 2ª cria é obrigatório para gêmeos'
        return null
      }
    },
    pesoCria2: {
      custom: (value: string) => {
        if (form.gemelos && !form.gemelosNatimorto && (!value || value.trim() === '')) return 'Peso da 2ª cria é obrigatório para gêmeos'
        return null
      }
    },
    sexo2: {
      custom: (value: string) => {
        if (form.gemelos && !form.gemelosNatimorto && (!value || value.trim() === '')) return 'Sexo da 2ª cria é obrigatório para gêmeos'
        return null
      }
    },
    raca2: {
      custom: (value: string) => {
        if (form.gemelos && !form.gemelosNatimorto && (!value || value.trim() === '')) return 'Raça da 2ª cria é obrigatória para gêmeos'
        return null
      }
    },
    tratamentos2: {
      custom: (value: string[]) => {
        if (form.gemelos && !form.gemelosNatimorto && (!value || value.length === 0)) return 'Pelo menos um primeiro cuidado da 2ª cria é obrigatório'
        return null
      }
    },
    
    // Outros campos obrigatórios
    categoriaMae: { required: true },
    escoreMatriz: { required: true },
    docilidadeMatriz: { required: true },
    racaMae: {
      custom: (value: string) => {
        if (!form.individuoIdMae && (form.idManejoMae || form.idBrincoMae || form.idChipMae)) {
          if (!value || value.trim() === '') return 'Raça da nova mãe é obrigatória'
        }
        return null
      }
    },

    // Mãe adotiva (guacho 1ª cria)
    idManejoMaeAdotiva: {
      custom: (value: string) => {
        if (form.guachoCria) {
          const hasManejo = value && value.trim() !== ''
          const hasBrinco = form.idBrincoMaeAdotiva && form.idBrincoMaeAdotiva.trim() !== ''
          const hasChip = form.idChipMaeAdotiva && form.idChipMaeAdotiva.trim() !== ''
          if (!hasManejo && !hasBrinco && !hasChip) return 'Preencha o ID Manejo, Brinco ou Chip da mãe adotiva'
        }
        return null
      }
    },
    racaMaeAdotiva: {
      custom: (value: string) => {
        if (form.guachoCria && !form.individuoIdMaeAdotiva && (form.idManejoMaeAdotiva || form.idBrincoMaeAdotiva || form.idChipMaeAdotiva)) {
          if (!value || value.trim() === '') return 'Raça da mãe adotiva é obrigatória'
        }
        return null
      }
    },
    categoriaMaeAdotiva: {
      custom: (value: string) => {
        if (form.guachoCria && !form.individuoIdMaeAdotiva && (form.idManejoMaeAdotiva || form.idBrincoMaeAdotiva || form.idChipMaeAdotiva)) {
          if (!value || value.trim() === '') return 'Classificação da matriz adotiva é obrigatória'
        }
        return null
      }
    },

    // Mãe adotiva (guacho 2ª cria)
    idManejoMaeAdotiva2: {
      custom: (value: string) => {
        if (form.guachoCria2) {
          const hasManejo = value && value.trim() !== ''
          const hasBrinco = form.idBrincoMaeAdotiva2 && form.idBrincoMaeAdotiva2.trim() !== ''
          const hasChip = form.idChipMaeAdotiva2 && form.idChipMaeAdotiva2.trim() !== ''
          if (!hasManejo && !hasBrinco && !hasChip) return 'Preencha o ID Manejo, Brinco ou Chip da mãe adotiva da 2ª cria'
        }
        return null
      }
    },
    racaMaeAdotiva2: {
      custom: (value: string) => {
        if (form.guachoCria2 && !form.individuoIdMaeAdotiva2 && (form.idManejoMaeAdotiva2 || form.idBrincoMaeAdotiva2 || form.idChipMaeAdotiva2)) {
          if (!value || value.trim() === '') return 'Raça da mãe adotiva da 2ª cria é obrigatória'
        }
        return null
      }
    },
    categoriaMaeAdotiva2: {
      custom: (value: string) => {
        if (form.guachoCria2 && !form.individuoIdMaeAdotiva2 && (form.idManejoMaeAdotiva2 || form.idBrincoMaeAdotiva2 || form.idChipMaeAdotiva2)) {
          if (!value || value.trim() === '') return 'Classificação da matriz adotiva da 2ª cria é obrigatória'
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

  const handleTratamentosChange = (newTratamentos: string[]) => {
    setForm(prev => ({
      ...prev,
      tratamentos: newTratamentos
    }))
  }

  const handleTratamentos2Change = (newTratamentos: string[]) => {
    setForm(prev => ({
      ...prev,
      tratamentos2: newTratamentos
    }))
  }

  const handleTipoPartoChange = (newTipoParto: string[]) => {
    setForm(prev => {
      const prevParto = prev.tipoParto
      // Exclusão mútua: Normal e Cesárea não podem coexistir
      // Se selecionou Cesárea, remove Normal (e consequentemente Auxiliado)
      if (newTipoParto.includes('Cesárea') && !prevParto.includes('Cesárea')) {
        return {
          ...prev,
          tipoParto: ['Cesárea'],
          partoAuxiliado: false,
        }
      }
      // Se selecionou Normal enquanto Cesárea estava marcada, remove Cesárea
      if (newTipoParto.includes('Normal') && prevParto.includes('Cesárea')) {
        return {
          ...prev,
          tipoParto: ['Normal'],
          partoAuxiliado: prev.partoAuxiliado,
        }
      }
      // Fluxo normal: desmarcar auxiliado se Normal foi removido
      return {
        ...prev,
        tipoParto: newTipoParto,
        partoAuxiliado: newTipoParto.includes('Normal') ? prev.partoAuxiliado : false,
      }
    })
  }

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

  // Carregar lotes ativos do Supabase (online) ou cache (offline)
  useEffect(() => {
    const loadData = async () => {
      if (fazendaId) {
        const { lotes, lotesPastoMap: mapa } = await getLotesAtivosCached(fazendaId)
        setLotesDisponiveis(lotes)
        setLotesPastoMap(mapa)
      }

      // Carregar tratamentos (com cache lazy para offline)
      if (fazendaId) {
        try {
          const tratamentosData = await getTratamentosCached(fazendaId)
          setTratamentosDisponiveis(tratamentosData || [])
        } catch (error) {
          console.error('Erro ao carregar tratamentos:', error)
        }
      }

      // Carregar raças (com cache lazy para offline)
      if (fazendaId) {
        try {
          const racasData = await getRacasCached(fazendaId)
          setRacasDisponiveis(racasData || [])
        } catch (error) {
          console.error('Erro ao carregar raças:', error)
        }
      }
    }
    loadData()
  }, [fazendaId])

  // Escutar atualizações do cache de cadastro
  useEffect(() => {
    const unsubscribe = eventBus.on(CADASTRO_CACHE_UPDATED, (data: any) => {
      console.log('[MaternidadePage] Cache atualizado, recarregando dados')
      if (data) {
        setLotesDisponiveis(data.lotes || [])
        setLotesPastoMap(data.lotesPastoMap || {})
      }
    })

    return unsubscribe
  }, [])

  // Buscar detalhes do lote quando selecionado
  useEffect(() => {
    async function carregarDetalhesLote() {
      if (!form.lote || !fazendaId) {
        setDetalhesLote(null)
        setForm(prev => ({ ...prev, loteId: '', pastoId: '' }))
        return
      }

      try {
        const lote = await getLoteByNomeCached(fazendaId, form.lote)
        if (lote) {
          // Buscar detalhes de categorias do lote
          const categoriasDetalhes = await getLoteDetalhesComCategoriasCached(lote.id)
          
          // Combinar dados do lote com dados de categorias
          setDetalhesLote({
            ...lote,
            categorias: categoriasDetalhes.categorias,
            n_cabecas: categoriasDetalhes.quant_atual,
            peso_vivo_kg: categoriasDetalhes.peso_vivo_kg,
            qtd_bezerros: categoriasDetalhes.qtd_bezerros
          })
          // Armazenar o ID do lote e o pasto_id
          setForm(prev => ({ ...prev, loteId: lote.id, pastoId: lote.pasto_id || '' }))
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do lote:', error)
        setDetalhesLote(null)
        setForm(prev => ({ ...prev, loteId: '', pastoId: '' }))
      }
    }

    carregarDetalhesLote()
  }, [form.lote, fazendaId])

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    // Validate form using the validation hook
    if (!isValid) {
      const errorArray = Object.entries(validationErrors).map(([field, message]) => ({
        field,
        message
      }))
      setErrors(errorArray)
      setSalvando(false)
      scrollToFirstError(errorArray)
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

    // Observação da 1ª cria (comum + guacho se marcado)
    const observacaoCria1 = [
      ...(observacaoComum ? [observacaoComum] : []),
      ...(form.guachoCria ? ['Guacho'] : []),
    ].join(' | ')

    // Observação da 2ª cria (comum + guacho se marcado)
    const observacaoCria2 = [
      ...(observacaoComum ? [observacaoComum] : []),
      ...(form.guachoCria2 ? ['Guacho'] : []),
    ].join(' | ')

    // Tipo de parto: incluir 'Auxiliado' se marcado e 'Gêmeos' se marcado
    const tipoPartoFinal = [
      ...form.tipoParto,
      ...(form.partoAuxiliado ? ['Auxiliado'] : []),
      ...(form.gemelos ? ['Gêmeos'] : []),
    ]

    // Criar indivíduo da mãe se ela não existir na base (nova mãe via modal NOVO)
    let individuoIdMaeFinal = form.individuoIdMae
    if (!individuoIdMaeFinal && (form.idManejoMae || form.idBrincoMae || form.idChipMae)) {
      if (testModeAtivo) {
        console.log('[MaternidadePage] Modo teste ativo: pulando criação de indivíduo da mãe no Supabase')
      } else {
      try {
        const novaMae = await createIndividuo({
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
        individuoIdMaeFinal = novaMae?.id || ''
      } catch (err) {
        console.error('Erro ao criar indivíduo da mãe:', err)
      }
      }
    }

    // Criar indivíduo da mãe adotiva (guacho 1ª cria) se não existir na base
    // A categoria deriva da classificação: Nulípara → Vaca Vazia, demais → Vaca Parida
    const categoriaAdotiva = (cat: string) => cat === 'Nulípara' ? 'Vaca Vazia' : 'Vaca Parida'
    let individuoIdMaeAdotivaFinal = form.individuoIdMaeAdotiva
    if (form.guachoCria && !individuoIdMaeAdotivaFinal && (form.idManejoMaeAdotiva || form.idBrincoMaeAdotiva || form.idChipMaeAdotiva)) {
      if (testModeAtivo) {
        console.log('[MaternidadePage] Modo teste ativo: pulando criação de indivíduo da mãe adotiva no Supabase')
      } else {
        try {
          const novaAdotiva = await createIndividuo({
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
          individuoIdMaeAdotivaFinal = novaAdotiva?.id || ''
        } catch (err) {
          console.error('Erro ao criar indivíduo da mãe adotiva:', err)
        }
      }
    }

    // Criar indivíduo da mãe adotiva (guacho 2ª cria) se não existir na base
    let individuoIdMaeAdotiva2Final = form.individuoIdMaeAdotiva2
    if (form.guachoCria2 && !individuoIdMaeAdotiva2Final && (form.idManejoMaeAdotiva2 || form.idBrincoMaeAdotiva2 || form.idChipMaeAdotiva2)) {
      if (testModeAtivo) {
        console.log('[MaternidadePage] Modo teste ativo: pulando criação de indivíduo da mãe adotiva 2 no Supabase')
      } else {
        try {
          const novaAdotiva2 = await createIndividuo({
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
          individuoIdMaeAdotiva2Final = novaAdotiva2?.id || ''
        } catch (err) {
          console.error('Erro ao criar indivíduo da mãe adotiva 2:', err)
        }
      }
    }

    // Função auxiliar para criar indivíduo de uma cria
    const criarIndividuoCria = async (dadosCria: {
      idProvisorio: string
      idBrinco: string
      idChip: string
      sexo: string
      raca: string
      peso: string
      maeAdotivaId?: string
    }): Promise<string> => {
      if (testModeAtivo) {
        console.log('[MaternidadePage] Modo teste ativo: pulando criação de indivíduo da cria no Supabase')
        return ''
      }
      try {
        const categoriaCria = dadosCria.sexo === 'Macho' ? 'Bezerro ao Pé' : 'Bezerra ao Pé'
        const dataNascimentoIso = brToIso(form.data)
        const novoIndividuo = await createIndividuo({
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
        })
        return novoIndividuo?.id || ''
      } catch (err) {
        console.error('Erro ao criar individuo do bezerro:', err)
        return ''
      }
    }

    // Criar indivíduo da 1ª cria
    const individuoIdCria = await criarIndividuoCria({
      idProvisorio: form.idProvisorioCria,
      idBrinco: form.idBrincoCria,
      idChip: form.idChipCria,
      sexo: form.sexo,
      raca: form.raca,
      peso: form.pesoCria,
      maeAdotivaId: form.guachoCria ? (individuoIdMaeAdotivaFinal || undefined) : undefined,
    })

    // Criar indivíduo da 2ª cria (se gêmeos e 2ª cria viva)
    let individuoIdCria2 = ''
    if (form.gemelos && !form.gemelosNatimorto) {
      individuoIdCria2 = await criarIndividuoCria({
        idProvisorio: form.idProvisorioCria2,
        idBrinco: form.idBrincoCria2,
        idChip: form.idChipCria2,
        sexo: form.sexo2,
        raca: form.raca2,
        peso: form.pesoCria2,
        maeAdotivaId: form.guachoCria2 ? (individuoIdMaeAdotiva2Final || undefined) : undefined,
      })
    }

    // Construir strings finais de tratamentos
    const tratamentoFinal = form.tratamentos.join(', ')
    const tratamentoFinal2 = form.tratamentos2.join(', ')
    const pastoNome = detalhesLote?.pastos?.nome || null

    // Vínculo entre gêmeos (mesmo UUID para ambos os registros)
    const partoVinculoId = form.gemelos ? crypto.randomUUID() : null

    // Registrar 1ª cria
    const result = await salvarRegistro('maternidade', {
      data: form.data,
      pasto: pastoNome,
      pastoId: form.pastoId,
      lote: form.lote,
      loteId: form.loteId,
      pesoCria: form.pesoCria ? Number(form.pesoCria) : null,
      idProvisorioCria: form.idProvisorioCria,
      idBrincoCria: form.idBrincoCria,
      idChipCria: form.idChipCria,
      tratamento: tratamentoFinal,
      tipoParto: tipoPartoFinal,
      observacaoParto: observacaoCria1,
      sexo: form.sexo,
      raca: form.raca,
      idManejoMae: form.idManejoMae,
      idBrincoMae: form.idBrincoMae,
      idChipMae: form.idChipMae,
      individuoIdMae: individuoIdMaeFinal,
      individuoIdCria,
      categoriaMae: form.categoriaMae,
      escoreMatriz: form.escoreMatriz ? Number(form.escoreMatriz) : null,
      docilidadeMatriz: form.docilidadeMatriz ? Number(form.docilidadeMatriz) : null,
      partoVinculoId,
      // Mãe adotiva (guacho)
      individuoIdMaeAdotiva: form.guachoCria ? (individuoIdMaeAdotivaFinal || null) : null,
      idManejoMaeAdotiva: form.guachoCria ? form.idManejoMaeAdotiva : null,
      idBrincoMaeAdotiva: form.guachoCria ? form.idBrincoMaeAdotiva : null,
      idChipMaeAdotiva: form.guachoCria ? form.idChipMaeAdotiva : null,
      categoriaMaeAdotiva: form.guachoCria ? form.categoriaMaeAdotiva : null,
      racaMaeAdotiva: form.guachoCria ? form.racaMaeAdotiva : null,
      usuario: usuario,
    })

    // Registrar 2ª cria (gêmeos)
    if (form.gemelos) {
      try {
        // Se natimorto: tipoParto inclui 'Natimorto', sem identificação nem indivíduo
        const tipoPartoCria2 = form.gemelosNatimorto
          ? [...tipoPartoFinal, 'Natimorto']
          : tipoPartoFinal

        await salvarRegistro('maternidade', {
          data: form.data,
          pasto: pastoNome,
          pastoId: form.pastoId,
          lote: form.lote,
          loteId: form.loteId,
          // 2ª cria natimorta: sem peso, sem IDs
          pesoCria: form.gemelosNatimorto ? null : (form.pesoCria2 ? Number(form.pesoCria2) : null),
          idProvisorioCria: form.gemelosNatimorto ? null : form.idProvisorioCria2,
          idBrincoCria: form.gemelosNatimorto ? null : form.idBrincoCria2,
          idChipCria: form.gemelosNatimorto ? null : form.idChipCria2,
          // 2ª cria natimorta: sem primeiros cuidados
          tratamento: form.gemelosNatimorto ? null : tratamentoFinal2,
          tipoParto: tipoPartoCria2,
          observacaoParto: observacaoCria2,
          // 2ª cria natimorta: sem sexo e raça (não identificado)
          sexo: form.gemelosNatimorto ? null : form.sexo2,
          raca: form.gemelosNatimorto ? null : form.raca2,
          idManejoMae: form.idManejoMae,
          idBrincoMae: form.idBrincoMae,
          idChipMae: form.idChipMae,
          individuoIdMae: individuoIdMaeFinal,
          individuoIdCria: individuoIdCria2,
          categoriaMae: form.categoriaMae,
          escoreMatriz: form.escoreMatriz ? Number(form.escoreMatriz) : null,
          docilidadeMatriz: form.docilidadeMatriz ? Number(form.docilidadeMatriz) : null,
          partoVinculoId,
          // Mãe adotiva (guacho 2ª cria)
          individuoIdMaeAdotiva: form.guachoCria2 ? (individuoIdMaeAdotiva2Final || null) : null,
          idManejoMaeAdotiva: form.guachoCria2 ? form.idManejoMaeAdotiva2 : null,
          idBrincoMaeAdotiva: form.guachoCria2 ? form.idBrincoMaeAdotiva2 : null,
          idChipMaeAdotiva: form.guachoCria2 ? form.idChipMaeAdotiva2 : null,
          categoriaMaeAdotiva: form.guachoCria2 ? form.categoriaMaeAdotiva2 : null,
          racaMaeAdotiva: form.guachoCria2 ? form.racaMaeAdotiva2 : null,
        })
      } catch (err) {
        console.error('Erro ao salvar registro da 2ª cria (gêmeos):', err)
      }
    }

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      setForm(makeInitial())
      setAnimalIdentifierKey(k => k + 1)
      // Invalida cache de detalhes do lote para refletir o novo bezerro/bezerra
      if (form.loteId) {
        clearCachedQuery(buildCacheKey('lote-detalhes', form.loteId))
      }
    }
  }

  const handleLimpar = () => {
    setForm(makeInitial())
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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <CadernetaHeader
        title="MATERNIDADE"
        cadernetaId="maternidade"
        dateContent={<DatePicker value={form.data} onChange={set('data')} variant="header" compact inline />}
      />

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8 desktop-form-container">
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        <button
          onClick={() => setShowPdfModal(true)}
          className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors"
        >
          <span className="text-xl">📄</span>
          <span>POP MATERNIDADE</span>
        </button>

        {/* Seção 1: Dados Principais */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          {lotesDisponiveis.length > 0 ? (
            <SearchableModal
              label={<span>PASTO/LOTE <span className="text-red-500">*</span></span>}
              value={form.lote}
              onChange={set('lote')}
              error={getError('lote')}
              options={lotesDisponiveis}
              secondaryText={(lote) => lotesPastoMap[lote] || ''}
              placeholder="Buscar pasto ou lote..."
              id="lote"
              name="lote"
            />
          ) : (
            <Input
              label={<span>PASTO/LOTE <span className="text-red-500">*</span></span>}
              placeholder="Carregando..."
              value={form.lote}
              onChange={setInputEvent('lote')}
              error={getError('lote')}
              inputMode="text"
              disabled
            />
          )}
          {detalhesLote && (
            <LoteDetalhesCard detalhes={detalhesLote} processarCategorias={processarCategorias} />
          )}
        </div>

        {/* Seção 2: Dados da Mãe */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. IDENTIFICAÇÃO DA MÃE</h2>
          {hasIndividuos === true && (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-200">
              💡 <strong>Não encontrou a mãe?</strong> Clique em qualquer um dos 3 campos de busca abaixo, vá em <strong>NOVO</strong> no final da tela que se abrir e informe o ID Manejo, Brinco e/ou Chip para cadastrá-la automaticamente.
            </p>
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
          {/* Dados da nova mãe (quando não encontrada na base) */}
          {!form.individuoIdMae && (form.idManejoMae || form.idBrincoMae || form.idChipMae) && (
            <div className="bg-green-50 rounded-xl p-4 border border-green-200 flex flex-col gap-4">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-base font-bold text-green-800">🆕 DADOS DA NOVA MÃE</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 font-medium">SEXO</p>
                  <p className="text-gray-900 font-bold">Fêmea</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium">STATUS</p>
                  <p className="text-gray-900 font-bold">Vivo</p>
                </div>
              </div>
              <Radio
                name="racaMae"
                label={<span>RAÇA <span className="text-red-500">*</span></span>}
                options={racasDisponiveis.length > 0
                  ? racasDisponiveis.map((r: any) => ({ value: r.nome, label: r.nome.toUpperCase() }))
                  : RACAS_PADRAO}
                value={form.racaMae}
                onChange={set('racaMae')}
                error={getError('racaMae')}
                gridCols={2}
              />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 font-medium">CATEGORIA</p>
                  <p className="text-gray-900 font-bold">Vaca Parida</p>
                </div>
              </div>
            </div>
          )}
          <Radio
            name="categoriaMae"
            label={<span>CLASSIFICAÇÃO DA MATRIZ <span className="text-red-500">*</span></span>}
            options={CATEGORIAS_MAE}
            value={form.categoriaMae}
            onChange={set('categoriaMae')}
            error={getError('categoriaMae')}
            gridCols={2}
            disabled={!!form.individuoIdMae}
          />
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-4">ESCORE DA MATRIZ <span className="text-red-500">*</span></h3>
            <button
              onClick={() => setShowEscoreModal(true)}
              className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors mb-4"
            >
              <span className="text-xl">📄</span>
              <span>POP ESCORE CORPORAL</span>
            </button>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {ESCORES.map((escore) => (
                <button
                  key={escore.value}
                  onClick={() => set('escoreMatriz')(escore.value)}
                  className={`py-3 px-4 rounded-xl font-bold transition-all transform hover:scale-105 ${
                    form.escoreMatriz === escore.value ? `${escore.color} text-black` : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {escore.label}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-4">DOCILIDADE DA MATRIZ <span className="text-red-500">*</span></h3>
            <label className="block text-lg font-bold text-gray-900 mb-3 whitespace-pre-wrap">AVALIAÇÃO DE DOCILIDADE</label>
            <p className="text-sm text-gray-600 mb-3">1 - Mais dócil | 3 - Mais brava</p>
            <div className="grid grid-cols-3 gap-2">
              <label className={`
                cursor-pointer rounded-xl border-2 
                transition-all active:scale-95
                flex flex-col items-center justify-center gap-1
                p-2 min-h-[70px]
                ${form.docilidadeMatriz === '1' ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]' : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
              `}>
                <input type="radio" name="docilidadeMatriz" className="sr-only" value="1" checked={form.docilidadeMatriz === '1'} onChange={() => set('docilidadeMatriz')('1')} />
                <span className="text-2xl sm:text-3xl">🟢</span>
                <span className="text-base sm:text-lg font-bold text-center leading-tight">1</span>
              </label>
              <label className={`
                cursor-pointer rounded-xl border-2 
                transition-all active:scale-95
                flex flex-col items-center justify-center gap-1
                p-2 min-h-[70px]
                ${form.docilidadeMatriz === '2' ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]' : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
              `}>
                <input type="radio" name="docilidadeMatriz" className="sr-only" value="2" checked={form.docilidadeMatriz === '2'} onChange={() => set('docilidadeMatriz')('2')} />
                <span className="text-2xl sm:text-3xl">🟡</span>
                <span className="text-base sm:text-lg font-bold text-center leading-tight">2</span>
              </label>
              <label className={`
                cursor-pointer rounded-xl border-2 
                transition-all active:scale-95
                flex flex-col items-center justify-center gap-1
                p-2 min-h-[70px]
                ${form.docilidadeMatriz === '3' ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]' : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
              `}>
                <input type="radio" name="docilidadeMatriz" className="sr-only" value="3" checked={form.docilidadeMatriz === '3'} onChange={() => set('docilidadeMatriz')('3')} />
                <span className="text-2xl sm:text-3xl">🔴</span>
                <span className="text-base sm:text-lg font-bold text-center leading-tight">3</span>
              </label>
            </div>
          </div>
        </div>

        {/* Seção 3: Parto */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. PARTO <span className="text-red-500">*</span></h2>
          <CheckboxGroup
            label=""
            options={TIPOS_PARTO}
            selectedValues={form.tipoParto}
            onChange={handleTipoPartoChange}
            error={getError('tipoParto')}
            gridCols={2}
            hideCheckbox={true}
            id="tipoParto"
            dataField="tipoParto"
          />

          {/* Sub-opção: Auxiliado (apenas quando Normal está selecionado) */}
          {form.tipoParto.includes('Normal') && (
            <div className="ml-2">
              <label className={`
                cursor-pointer rounded-xl border-2 px-4 py-2.5
                transition-all active:scale-95
                flex items-center justify-center gap-2
                ${form.partoAuxiliado
                  ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]'
                  : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
              `}>
                <input
                  type="checkbox"
                  checked={form.partoAuxiliado}
                  onChange={(e) => setForm(prev => ({ ...prev, partoAuxiliado: e.target.checked }))}
                  className="sr-only"
                />
                <span className="text-2xl sm:text-3xl">🤝</span>
                <span className="text-sm font-bold tracking-tight">AUXILIADO</span>
              </label>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-base font-bold text-gray-900 mb-3">PROBLEMAS DE PARTO <span className="text-sm font-normal text-gray-500">(opcional)</span></h3>
            <CheckboxGroup
              label=""
              options={PROBLEMAS_PARTO}
              selectedValues={form.problemasParto}
              onChange={handleProblemasPartoChange}
              gridCols={2}
              hideCheckbox={true}
              id="problemasParto"
              dataField="problemasParto"
            />
          </div>

          {/* Checkbox isolado: Gêmeos */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-base font-bold text-gray-900 mb-3">OPÇÃO ADICIONAL</h3>
            <div className="grid grid-cols-1 gap-3">
              <label className={`
                cursor-pointer rounded-xl border-2 px-4 py-3
                transition-all active:scale-95
                flex items-center justify-center
                ${form.gemelos
                  ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]'
                  : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
              `}>
                <input
                  type="checkbox"
                  checked={form.gemelos}
                  onChange={(e) => handleGemelosToggle(e.target.checked)}
                  className="sr-only"
                />
                <span className="text-base font-bold tracking-tight">GÊMEOS</span>
              </label>
            </div>

            {/* Sub-opção de gêmeos: 2ª cria viva ou natimorta */}
            {form.gemelos && (
              <div className="mt-3">
                <p className="text-sm font-semibold text-gray-700 mb-2">2ª cria:</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`
                    cursor-pointer rounded-xl border-2 px-4 py-2.5
                    transition-all active:scale-95
                    flex items-center justify-center
                    ${!form.gemelosNatimorto
                      ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]'
                      : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
                  `}>
                    <input
                      type="radio"
                      name="gemelosNatimorto"
                      className="sr-only"
                      checked={!form.gemelosNatimorto}
                      onChange={() => setForm(prev => ({ ...prev, gemelosNatimorto: false }))}
                    />
                    <span className="text-sm font-bold tracking-tight">VIVA</span>
                  </label>
                  <label className={`
                    cursor-pointer rounded-xl border-2 px-4 py-2.5
                    transition-all active:scale-95
                    flex items-center justify-center
                    ${form.gemelosNatimorto
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
                  `}>
                    <input
                      type="radio"
                      name="gemelosNatimorto"
                      className="sr-only"
                      checked={form.gemelosNatimorto}
                      onChange={() => setForm(prev => ({ ...prev, gemelosNatimorto: true }))}
                    />
                    <span className="text-sm font-bold tracking-tight">NATIMORTA</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <Input
            label="OBSERVAÇÃO (OPCIONAL)"
            placeholder="Observações sobre o parto..."
            value={form.observacaoParto}
            onChange={setInputEvent('observacaoParto')}
          />
        </div>

        {/* Seção 4: 1ª Cria (identificação + sexo + raça + primeiros cuidados) */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. 1ª CRIA</h2>
          <Input
            label={<span>ID PROVISÓRIO <span className="text-red-500">*</span></span>}
            placeholder="Ex: 2023-145"
            value={form.idProvisorioCria}
            onChange={setInputEvent('idProvisorioCria')}
            error={getError('idProvisorioCria')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="ID BRINCO"
              placeholder="Opcional"
              value={form.idBrincoCria}
              onChange={setInputEvent('idBrincoCria')}
              error={getError('idBrincoCria')}
            />
            <Input
              label="ID CHIP"
              placeholder="Opcional"
              value={form.idChipCria}
              onChange={setInputEvent('idChipCria')}
              error={getError('idChipCria')}
            />
          </div>
          <Input
            label={<span>PESO DA CRIA (kg) <span className="text-red-500">*</span></span>}
            placeholder="Ex: 32"
            value={form.pesoCria}
            onChange={setInputEvent('pesoCria')}
            inputMode="decimal"
            type="number"
            error={getError('pesoCria')}
          />
          <Radio
            name="sexo"
            label={<span>SEXO <span className="text-red-500">*</span></span>}
            options={SEXO}
            value={form.sexo}
            onChange={set('sexo')}
            error={getError('sexo')}
            gridCols={2}
          />
          <Radio
            name="raca"
            label={<span>RAÇA <span className="text-red-500">*</span></span>}
            options={racasDisponiveis.length > 0
              ? racasDisponiveis.map((r: any) => ({ value: r.nome, label: r.nome.toUpperCase() }))
              : RACAS_PADRAO}
            value={form.raca}
            onChange={set('raca')}
            error={getError('raca')}
            gridCols={2}
          />

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-base font-bold text-gray-900 mb-3">PRIMEIROS CUIDADOS <span className="text-red-500">*</span></h3>
            <CheckboxGroup
              label=""
              options={tratamentosDisponiveis.map(t => ({ value: t.nome, label: t.nome.toUpperCase() }))}
              selectedValues={form.tratamentos}
              onChange={handleTratamentosChange}
              error={getError('tratamentos')}
              gridCols={2}
              hideCheckbox={true}
              id="tratamentos"
              dataField="tratamentos"
            />
          </div>

          {/* Guacho: opção específica da 1ª cria */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-base font-bold text-gray-900 mb-3">OPÇÃO ADICIONAL</h3>
            <label className={`
              cursor-pointer rounded-xl border-2 px-4 py-3
              transition-all active:scale-95
              flex items-center justify-center
              ${form.guachoCria
                ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]'
                : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
            `}>
              <input
                type="checkbox"
                checked={form.guachoCria}
                onChange={(e) => handleGuachoCriaToggle(e.target.checked)}
                className="sr-only"
              />
              <span className="text-base font-bold tracking-tight">GUACHO</span>
            </label>
            <p className="text-xs text-gray-500 mt-2">
              Bezerro abandonado pela mãe biológica e adotado por outra. Informe a mãe adotiva abaixo.
            </p>
          </div>

          {/* Mãe adotiva da 1ª cria (visível apenas quando guacho) */}
          {form.guachoCria && (
            <div className="bg-green-50 rounded-xl p-4 border border-green-200 flex flex-col gap-4">
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-base font-bold text-green-800">MÃE ADOTIVA</span>
              </div>
              <AnimalIdentifier
                fazendaId={fazendaId}
                valueManejo={form.idManejoMaeAdotiva}
                valueBrinco={form.idBrincoMaeAdotiva}
                valueChip={form.idChipMaeAdotiva}
                onChange={({ idManejo, idBrinco, idChip, individuoId, animalData }) => {
                  setForm(prev => ({
                    ...prev,
                    idManejoMaeAdotiva: idManejo,
                    idBrincoMaeAdotiva: idBrinco,
                    idChipMaeAdotiva: idChip,
                    individuoIdMaeAdotiva: individuoId || '',
                    // Preencher raça e classificação do animal existente
                    racaMaeAdotiva: animalData?.raca || '',
                    categoriaMaeAdotiva: animalData?.classificacao_matriz || '',
                  }))
                }}
                required={true}
                showAnimalCard={true}
              />
              {/* Dados da nova mãe adotiva (quando não encontrada na base) */}
              {!form.individuoIdMaeAdotiva && (form.idManejoMaeAdotiva || form.idBrincoMaeAdotiva || form.idChipMaeAdotiva) && (
                <>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500 font-medium">SEXO</p>
                      <p className="text-gray-900 font-bold">Fêmea</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">STATUS</p>
                      <p className="text-gray-900 font-bold">Vivo</p>
                    </div>
                    <div>
                      <p className="text-gray-500 font-medium">CATEGORIA</p>
                      <p className="text-gray-900 font-bold">{form.categoriaMaeAdotiva === 'Nulípara' ? 'Vaca Vazia' : 'Vaca Parida'}</p>
                    </div>
                  </div>
                  <Radio
                    name="racaMaeAdotiva"
                    label={<span>RAÇA <span className="text-red-500">*</span></span>}
                    options={racasDisponiveis.length > 0
                      ? racasDisponiveis.map((r: any) => ({ value: r.nome, label: r.nome.toUpperCase() }))
                      : RACAS_PADRAO}
                    value={form.racaMaeAdotiva}
                    onChange={set('racaMaeAdotiva')}
                    error={getError('racaMaeAdotiva')}
                    gridCols={2}
                  />
                  <Radio
                    name="categoriaMaeAdotiva"
                    label={<span>CLASSIFICAÇÃO DA MATRIZ ADOTIVA <span className="text-red-500">*</span></span>}
                    options={CATEGORIAS_MAE}
                    value={form.categoriaMaeAdotiva}
                    onChange={set('categoriaMaeAdotiva')}
                    error={getError('categoriaMaeAdotiva')}
                    gridCols={2}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Seção 5: 2ª Cria (condicional - apenas para gêmeos) */}
        {form.gemelos && (
          <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-[#1a3a2a] flex flex-col gap-5">
            <h2 className="text-lg font-black text-[#1a3a2a] tracking-tight">4. 2ª CRIA (GÊMEOS)</h2>

            {/* Campos de identificação: apenas se 2ª cria viva */}
            {!form.gemelosNatimorto && (
              <>
                <Input
                  label={<span>ID PROVISÓRIO <span className="text-red-500">*</span></span>}
                  placeholder="Ex: 2023-146"
                  value={form.idProvisorioCria2}
                  onChange={setInputEvent('idProvisorioCria2')}
                  error={getError('idProvisorioCria2')}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="ID BRINCO"
                    placeholder="Opcional"
                    value={form.idBrincoCria2}
                    onChange={setInputEvent('idBrincoCria2')}
                  />
                  <Input
                    label="ID CHIP"
                    placeholder="Opcional"
                    value={form.idChipCria2}
                    onChange={setInputEvent('idChipCria2')}
                  />
                </div>
                <Input
                  label={<span>PESO DA CRIA (kg) <span className="text-red-500">*</span></span>}
                  placeholder="Ex: 28"
                  value={form.pesoCria2}
                  onChange={setInputEvent('pesoCria2')}
                  inputMode="decimal"
                  type="number"
                  error={getError('pesoCria2')}
                />
                <Radio
                  name="sexo2"
                  label={<span>SEXO <span className="text-red-500">*</span></span>}
                  options={SEXO}
                  value={form.sexo2}
                  onChange={set('sexo2')}
                  error={getError('sexo2')}
                  gridCols={2}
                />
                <Radio
                  name="raca2"
                  label={<span>RAÇA <span className="text-red-500">*</span></span>}
                  options={racasDisponiveis.length > 0
                    ? racasDisponiveis.map((r: any) => ({ value: r.nome, label: r.nome.toUpperCase() }))
                    : RACAS_PADRAO}
                  value={form.raca2}
                  onChange={set('raca2')}
                  error={getError('raca2')}
                  gridCols={2}
                />

                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-base font-bold text-[#1a3a2a] mb-3">PRIMEIROS CUIDADOS <span className="text-red-500">*</span></h3>
                  <CheckboxGroup
                    label=""
                    options={tratamentosDisponiveis.map(t => ({ value: t.nome, label: t.nome.toUpperCase() }))}
                    selectedValues={form.tratamentos2}
                    onChange={handleTratamentos2Change}
                    error={getError('tratamentos2')}
                    gridCols={2}
                    hideCheckbox={true}
                    id="tratamentos2"
                    dataField="tratamentos2"
                  />
                </div>

                {/* Guacho: opção específica da 2ª cria */}
                <div className="border-t border-gray-100 pt-4">
                  <h3 className="text-base font-bold text-[#1a3a2a] mb-3">OPÇÃO ADICIONAL</h3>
                  <label className={`
                    cursor-pointer rounded-xl border-2 px-4 py-3
                    transition-all active:scale-95
                    flex items-center justify-center
                    ${form.guachoCria2
                      ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]'
                      : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
                  `}>
                    <input
                      type="checkbox"
                      checked={form.guachoCria2}
                      onChange={(e) => handleGuachoCria2Toggle(e.target.checked)}
                      className="sr-only"
                    />
                    <span className="text-base font-bold tracking-tight">GUACHO</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    Bezerro abandonado pela mãe biológica e adotado por outra. Informe a mãe adotiva abaixo.
                  </p>
                </div>

                {/* Mãe adotiva da 2ª cria (visível apenas quando guacho) */}
                {form.guachoCria2 && (
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200 flex flex-col gap-4">
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-base font-bold text-green-800">MÃE ADOTIVA DA 2ª CRIA</span>
                    </div>
                    <AnimalIdentifier
                      fazendaId={fazendaId}
                      valueManejo={form.idManejoMaeAdotiva2}
                      valueBrinco={form.idBrincoMaeAdotiva2}
                      valueChip={form.idChipMaeAdotiva2}
                      onChange={({ idManejo, idBrinco, idChip, individuoId, animalData }) => {
                        setForm(prev => ({
                          ...prev,
                          idManejoMaeAdotiva2: idManejo,
                          idBrincoMaeAdotiva2: idBrinco,
                          idChipMaeAdotiva2: idChip,
                          individuoIdMaeAdotiva2: individuoId || '',
                          // Preencher raça e classificação do animal existente
                          racaMaeAdotiva2: animalData?.raca || '',
                          categoriaMaeAdotiva2: animalData?.classificacao_matriz || '',
                        }))
                      }}
                      required={true}
                      showAnimalCard={true}
                    />
                    {/* Dados da nova mãe adotiva (quando não encontrada na base) */}
                    {!form.individuoIdMaeAdotiva2 && (form.idManejoMaeAdotiva2 || form.idBrincoMaeAdotiva2 || form.idChipMaeAdotiva2) && (
                      <>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-500 font-medium">SEXO</p>
                            <p className="text-gray-900 font-bold">Fêmea</p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-medium">STATUS</p>
                            <p className="text-gray-900 font-bold">Vivo</p>
                          </div>
                          <div>
                            <p className="text-gray-500 font-medium">CATEGORIA</p>
                            <p className="text-gray-900 font-bold">{form.categoriaMaeAdotiva2 === 'Nulípara' ? 'Vaca Vazia' : 'Vaca Parida'}</p>
                          </div>
                        </div>
                        <Radio
                          name="racaMaeAdotiva2"
                          label={<span>RAÇA <span className="text-red-500">*</span></span>}
                          options={racasDisponiveis.length > 0
                            ? racasDisponiveis.map((r: any) => ({ value: r.nome, label: r.nome.toUpperCase() }))
                            : RACAS_PADRAO}
                          value={form.racaMaeAdotiva2}
                          onChange={set('racaMaeAdotiva2')}
                          error={getError('racaMaeAdotiva2')}
                          gridCols={2}
                        />
                        <Radio
                          name="categoriaMaeAdotiva2"
                          label={<span>CLASSIFICAÇÃO DA MATRIZ ADOTIVA <span className="text-red-500">*</span></span>}
                          options={CATEGORIAS_MAE}
                          value={form.categoriaMaeAdotiva2}
                          onChange={set('categoriaMaeAdotiva2')}
                          error={getError('categoriaMaeAdotiva2')}
                          gridCols={2}
                        />
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Confirmação natimorto: sem campos de identificação nem cuidados */}
            {form.gemelosNatimorto && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">💀</span>
                <p className="text-sm text-red-800 font-medium">
                  A 2ª cria será registrada como natimorta. Não é necessário informar identificação, peso, sexo, raça ou primeiros cuidados.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvando || !isValid}
            className={`w-full !min-h-0 rounded-2xl border-2 px-3 py-4 text-base font-bold transition-colors active:scale-[0.99] ${
              salvando || !isValid
                ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                : 'border-green-600 bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Save className="h-5 w-5" strokeWidth={2.5} />
              {salvando ? 'SALVANDO...' : 'SALVAR'}
            </span>
          </button>
          <button
            type="button"
            onClick={handleLimpar}
            className="w-full !min-h-0 rounded-2xl border-2 border-gray-300 bg-gray-200 px-3 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-300 active:scale-95"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Brush className="h-4 w-4" strokeWidth={2.5} />
              LIMPAR
            </span>
          </button>
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
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, CheckboxGroup, ValidationMessage } from '../../components/ui'
import SearchableModal from '../../components/ui/SearchableModal'
import SuccessModal from '../../components/SuccessModal'
import PdfModal from '../../components/PdfModal'
import { salvarRegistro } from '../../services/api'
import { todayBR, brToIso } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import {
  getCachedCadastroData,
  getLoteByNomeCached,
  getLoteDetalhesComCategoriasCached,
  getTratamentosCached,
  getRacasCached,
  clearCachedQuery,
  buildCacheKey,
} from '../../services/cadastroCache'
import { getLotes, createIndividuo } from '../../services/supabaseService'
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
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  lote: '',
  loteId: '',
  pastoId: '',
  tipoParto: [],
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
})

export default function MaternidadePage() {
  const navigate = useNavigate()
  const { usuario, fazenda, fazendaId, logoUrl } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showEscoreModal, setShowEscoreModal] = useState(false)
  const [hasIndividuos, setHasIndividuos] = useState<boolean | null>(null)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
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
    setForm(prev => ({
      ...prev,
      tipoParto: newTipoParto
    }))
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
    setForm(prev => ({ ...prev, guachoCria: checked }))
  }

  const handleGuachoCria2Toggle = (checked: boolean) => {
    setForm(prev => ({ ...prev, guachoCria2: checked }))
  }

  const getError = (field: string) => {
    // Only return manual errors (from API validation), not validation errors from the hook
    // Validation errors are shown via asterisks, not red borders
    return errors.find((e) => e.field === field)?.message
  }

  // Carregar lotes do cache global, com fallback para Supabase
  useEffect(() => {
    const loadData = async () => {
      const cache = await getCachedCadastroData()
      if (cache && cache.lotes && cache.lotes.length > 0) {
        setLotesDisponiveis(cache.lotes || [])
      } else if (fazendaId) {
        try {
          const lotesData = await getLotes(fazendaId)
          setLotesDisponiveis(lotesData?.map((l: any) => l.nome) || [])
        } catch (error) {
          console.error('Erro ao carregar dados do Supabase:', error)
        }
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

    // Tipo de parto: incluir 'Gêmeos' se marcado
    const tipoPartoFinal = form.gemelos ? [...form.tipoParto, 'Gêmeos'] : form.tipoParto

    // Função auxiliar para criar indivíduo de uma cria
    const criarIndividuoCria = async (dadosCria: {
      idProvisorio: string
      idBrinco: string
      idChip: string
      sexo: string
      raca: string
      peso: string
    }): Promise<string> => {
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
          mae: form.individuoIdMae || null,
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
      individuoIdMae: form.individuoIdMae,
      individuoIdCria,
      categoriaMae: form.categoriaMae,
      escoreMatriz: form.escoreMatriz ? Number(form.escoreMatriz) : null,
      docilidadeMatriz: form.docilidadeMatriz ? Number(form.docilidadeMatriz) : null,
      partoVinculoId,
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
          individuoIdMae: form.individuoIdMae,
          individuoIdCria: individuoIdCria2,
          categoriaMae: form.categoriaMae,
          escoreMatriz: form.escoreMatriz ? Number(form.escoreMatriz) : null,
          docilidadeMatriz: form.docilidadeMatriz ? Number(form.docilidadeMatriz) : null,
          partoVinculoId,
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
      // Invalida cache de detalhes do lote para refletir o novo bezerro/bezerra
      if (form.loteId) {
        clearCachedQuery(buildCacheKey('lote-detalhes', form.loteId))
      }
    }
  }

  const handleLimpar = () => {
    setForm(makeInitial())
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
      {/* Header sticky com botões e título */}
      <div className="sticky top-0 z-10 bg-[#1a3a2a] text-white px-4 py-4">
        <div className="flex items-center justify-between desktop-form-container">
          <button
            onClick={() => navigate(-1)}
            className="text-yellow-400 font-bold text-sm min-h-[40px] px-3"
          >
            VOLTAR
          </button>
          <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2">MATERNIDADE</h1>
          <button
            onClick={() => navigate('/caderneta/maternidade/lista')}
            className="text-yellow-400 font-bold text-sm min-h-[40px] px-3 -mr-2"
          >
            REGISTROS
          </button>
        </div>
      </div>

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

      {/* Botão de PDF POP */}
      <div className="bg-[#1a3a2a] text-white px-4 py-3">
        <div className="desktop-form-container">
          <button
            onClick={() => setShowPdfModal(true)}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors"
          >
            <span className="text-xl">📄</span>
            <span>POP MATERNIDADE</span>
          </button>
        </div>
      </div>

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8 desktop-form-container">
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: Dados Principais */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          {usuario && (
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <span className="text-xl">👤</span>
              <p className="text-gray-700 font-semibold">{usuario}</p>
            </div>
          )}
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS PRINCIPAIS</h2>
          <DatePicker label={<span>DATA <span className="text-red-500">*</span></span>} value={form.data} onChange={set('data')} error={getError('data')} />
          {lotesDisponiveis.length > 0 ? (
            <SearchableModal
              label={<span>LOTE <span className="text-red-500">*</span></span>}
              value={form.lote}
              onChange={set('lote')}
              error={getError('lote')}
              options={lotesDisponiveis}
              placeholder="Buscar lote..."
              id="lote"
              name="lote"
            />
          ) : (
            <Input
              label={<span>LOTE <span className="text-red-500">*</span></span>}
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
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. IDENTIFICAÇÃO DA MÃE</h2>
          {hasIndividuos === true && (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-200">
              💡 <strong>Não encontrou a mãe?</strong> Clique em qualquer um dos 3 campos de busca abaixo, vá em <strong>NOVO</strong> no final da tela que se abrir e informe o ID Manejo, Brinco e/ou Chip para cadastrá-la automaticamente.
            </p>
          )}
          <AnimalIdentifier
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
              }))
            }}
            required={true}
            showAnimalCard={true}
          />
          <Radio
            name="categoriaMae"
            label={<span>CATEGORIA DA MÃE <span className="text-red-500">*</span></span>}
            options={CATEGORIAS_MAE}
            value={form.categoriaMae}
            onChange={set('categoriaMae')}
            error={getError('categoriaMae')}
            gridCols={2}
            disabled={hasIndividuos === true}
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
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. PARTO <span className="text-red-500">*</span></h2>
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
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. 1ª CRIA</h2>
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
          </div>
        </div>

        {/* Seção 5: 2ª Cria (condicional - apenas para gêmeos) */}
        {form.gemelos && (
          <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-[#1a3a2a] flex flex-col gap-5">
            <h2 className="text-lg font-black text-[#1a3a2a] tracking-tight">5. 2ª CRIA (GÊMEOS)</h2>

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
                </div>
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
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾" fullWidth disabled={!isValid}>
            SALVAR
          </Button>
          <Button onClick={handleLimpar} variant="secondary" icon="🧹" fullWidth>
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

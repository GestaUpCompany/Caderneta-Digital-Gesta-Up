import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, ValidationMessage } from '../../components/ui'
import SearchableModal from '../../components/ui/SearchableModal'
import SuccessModal from '../../components/SuccessModal'
import PdfModal from '../../components/PdfModal'
import PastoDetalhesCard from '../../components/PastoDetalhesCard'
import LoteDetalhesCard from '../../components/LoteDetalhesCard'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { getCachedCadastroData } from '../../services/cadastroCache'
import { getPastoByNome, getUltimaDataPastoEntrada, getUltimaDataPastoSaida, getUltimoStatusPasto, getLoteDetalhesComCategorias, getPastos, getFuncionarios, getLotesByPastoId } from '../../services/supabaseService'
import { calcularDiferencaTempo } from '../../utils/calcularTempo'
import { scrollToFirstError } from '../../utils/scrollToError'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { useFormValidation } from '../../hooks/useFormValidation'

const BASE = import.meta.env.BASE_URL

const AVALIACOES = [
  { value: '1', label: '1', icon: '🔴' },
  { value: '2', label: '2', icon: '🟢' },
  { value: '3', label: '3', icon: '🟡' },
  { value: '4', label: '4', icon: '🟢' },
  { value: '5', label: '5', icon: '🔴' },
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

// Fields where "Sim" means a problem exists (observation should show on "Sim")
const INVERTED_DIAGNOSTICOS = [
  'animaisMachucadosDoentesBichados',
  'carrapatosMoscas',
  'animaisEntreverados',
  'animalMorto',
]

interface FormState {
  data: string
  manejador: string
  numeroLote: string
  loteId: string
  pastoSaida: string
  pastoSaidaAreaUtil: string
  pastoSaidaEspecie: string
  avaliacaoSaida: string
  tempoOcupacao: string
  pastoEntrada: string
  pastoEntradaAreaUtil: string
  pastoEntradaEspecie: string
  avaliacaoEntrada: string
  tempoVedacao: string
  gadoContado: string
  vaca: string
  touro: string
  bezerro: string
  boiGordo: string
  boiMagro: string
  garrote: string
  novilha: string
  tropa: string
  outros: string
  escoreGado: string
  bebedourosCochos: string
  bebedourosCochosObs: string
  pastagensTaxaLotacao: string
  pastagensTaxaLotacaoObs: string
  animaisMachucadosDoentesBichados: string
  animaisMachucadosDoentesBichadosObs: string
  cercasCochosPorteiras: string
  cercasCochosPorteirasObs: string
  carrapatosMoscas: string
  carrapatosMoscasObs: string
  animaisEntreverados: string
  animaisEntreveradosObs: string
  animalMorto: string
  animalMortoObs: string
  escoreFezes: string
  numeroPessoasManejo: string
  equipeNomes: string[]
}

const makeInitial = (usuario?: string): FormState => ({
  data: todayBR(),
  manejador: usuario || '',
  numeroLote: '',
  loteId: '',
  pastoSaida: '',
  pastoSaidaAreaUtil: '',
  pastoSaidaEspecie: '',
  avaliacaoSaida: '',
  tempoOcupacao: '',
  pastoEntrada: '',
  pastoEntradaAreaUtil: '',
  pastoEntradaEspecie: '',
  avaliacaoEntrada: '',
  tempoVedacao: '',
  gadoContado: '',
  vaca: '',
  touro: '',
  bezerro: '',
  boiGordo: '',
  boiMagro: '',
  garrote: '',
  novilha: '',
  tropa: '',
  outros: '',
  escoreGado: '',
  bebedourosCochos: '',
  bebedourosCochosObs: '',
  pastagensTaxaLotacao: '',
  pastagensTaxaLotacaoObs: '',
  animaisMachucadosDoentesBichados: '',
  animaisMachucadosDoentesBichadosObs: '',
  cercasCochosPorteiras: '',
  cercasCochosPorteirasObs: '',
  carrapatosMoscas: '',
  carrapatosMoscasObs: '',
  animaisEntreverados: '',
  animaisEntreveradosObs: '',
  animalMorto: '',
  animalMortoObs: '',
  escoreFezes: '',
  numeroPessoasManejo: '',
  equipeNomes: [],
})

const CATEGORIAS: { campo: keyof FormState; label: string }[] = [
  { campo: 'vaca', label: 'VACAS' },
  { campo: 'touro', label: 'TOUROS' },
  { campo: 'boiGordo', label: 'BOIS GORDOS' },
  { campo: 'boiMagro', label: 'BOIS MAGROS' },
  { campo: 'garrote', label: 'GARROTES' },
  { campo: 'bezerro', label: 'BEZERROS(AS)' },
  { campo: 'novilha', label: 'NOVILHAS' },
  { campo: 'tropa', label: 'TROPAS' },
  { campo: 'outros', label: 'OUTROS' },
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

export default function PastagensPage() {
  const navigate = useNavigate()
  const { usuario, fazenda, fazendaId, logoUrl } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(() => makeInitial(usuario))
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [pastosDisponiveis, setPastosDisponiveis] = useState<string[]>([])
  const [funcionariosDisponiveis, setFuncionariosDisponiveis] = useState<string[]>([])
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showEscoreModal, setShowEscoreModal] = useState(false)
  const [showFezesModal, setShowFezesModal] = useState(false)
  const [detalhesPastoSaida, setDetalhesPastoSaida] = useState<any>(null)
  const [detalhesPastoEntrada, setDetalhesPastoEntrada] = useState<any>(null)
  const [detalhesLote, setDetalhesLote] = useState<any>(null)

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

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
        setForm(prev => ({ ...prev, numeroLote: '', loteId: '' }))
        setDetalhesLote(null)
        return
      }

      try {
        // Buscar detalhes do pasto
        const pasto = await getPastoByNome(fazendaId, form.pastoSaida)
        if (!pasto) {
          setErrors([{ field: 'pastoSaida', message: 'Pasto não encontrado. Selecione outro pasto.' }])
          set('pastoSaida')('')
          return
        }

        // Verificar se há um lote no pasto de saída (fonte de verdade: tabela lotes)
        const lotes = await getLotesByPastoId(fazendaId, pasto.id)
        if (!lotes || lotes.length === 0) {
          setDetalhesPastoSaida(null)
          setForm(prev => ({ ...prev, numeroLote: '', loteId: '' }))
          setDetalhesLote(null)
          setErrors([{ field: 'pastoSaida', message: 'Este pasto está vazio (não possui lote). Selecione outro pasto.' }])
          set('pastoSaida')('')
          return
        }

        // Buscar última data de entrada para calcular tempo de ocupação
        const ultimaDataEntrada = await getUltimaDataPastoEntrada(fazendaId, form.pastoSaida)
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
        set('pastoSaidaAreaUtil')(pasto.area_util_ha?.toString() || '')
        set('pastoSaidaEspecie')(pasto.especie || '')
        // Remover erro se existia
        setErrors(prev => prev.filter(e => e.field !== 'pastoSaida'))

        // Auto-popular com o primeiro lote (único permitido)
        const lotePrincipal = lotes[0]
        const categoriasDetalhes = await getLoteDetalhesComCategorias(lotePrincipal.id)
        setDetalhesLote({
          ...lotePrincipal,
          categorias: categoriasDetalhes.categorias,
          n_cabecas: categoriasDetalhes.quant_atual,
          peso_vivo_kg: categoriasDetalhes.peso_vivo_kg,
          qtd_bezerros: categoriasDetalhes.qtd_bezerros
        })
        setForm(prev => ({
          ...prev,
          numeroLote: lotePrincipal.nome || '',
          loteId: lotePrincipal.id
        }))
      } catch (error) {
        console.error('Erro ao carregar detalhes do pasto de saída:', error)
        setDetalhesPastoSaida(null)
        setForm(prev => ({ ...prev, numeroLote: '', loteId: '' }))
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
        return
      }

      try {
        // Buscar o pasto pelo nome para obter o ID
        const pasto = await getPastoByNome(fazendaId, form.pastoEntrada)
        if (!pasto) {
          setDetalhesPastoEntrada(null)
          setErrors([{ field: 'pastoEntrada', message: 'Pasto não encontrado. Selecione outro pasto.' }])
          set('pastoEntrada')('')
          return
        }

        // Verificar se o pasto de entrada já possui um lote (bloquear se sim)
        const lotesEntrada = await getLotesByPastoId(fazendaId, pasto.id)
        if (lotesEntrada && lotesEntrada.length > 0) {
          setDetalhesPastoEntrada(null)
          setErrors([{ field: 'pastoEntrada', message: `Este pasto já possui o lote ${lotesEntrada[0].nome}.` }])
          set('pastoEntrada')('')
          return
        }

        // Verificar o último status do pasto para validar seleção
        const ultimoStatus = await getUltimoStatusPasto(fazendaId, form.pastoEntrada)
        
        // Se o último status foi entrada, impedir seleção (pasto está ocupado)
        if (ultimoStatus === 'entrada') {
          setDetalhesPastoEntrada(null)
          setErrors([{ field: 'pastoEntrada', message: 'Este pasto está ocupado (último registro foi entrada). Selecione outro pasto.' }])
          set('pastoEntrada')('')
          return
        }
        
        // Buscar última data de saída para calcular tempo de vedação
        const ultimaDataSaida = await getUltimaDataPastoSaida(fazendaId, form.pastoEntrada)
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


  const total = ['vaca', 'touro', 'bezerro', 'boiGordo', 'boiMagro', 'garrote', 'novilha', 'tropa', 'outros'].reduce(
    (acc, c) => acc + (Number(form[c as keyof FormState]) || 0), 0
  )

  // Validation rules
  const validationRules: any = {
    data: { required: true },
    manejador: { required: true },
    numeroLote: { required: true },
    pastoSaida: { required: true },
    avaliacaoSaida: { required: true },
    pastoEntrada: { required: true },
    avaliacaoEntrada: { required: true },
    gadoContado: { required: true },
    escoreGado: { required: true },
    bebedourosCochos: { required: true },
    pastagensTaxaLotacao: { required: true },
    animaisMachucadosDoentesBichados: { required: true },
    cercasCochosPorteiras: { required: true },
    carrapatosMoscas: { required: true },
    animaisEntreverados: { required: true },
    animalMorto: { required: true },
    escoreFezes: { required: true },
    numeroPessoasManejo: { required: true },
  }

  // Add dynamic validation for animal categories when gadoContado is 'Sim'
  if (form.gadoContado === 'Sim') {
    validationRules.categorias = {
      custom: () => {
        const hasAnyValue = ['vaca', 'touro', 'bezerro', 'boiGordo', 'boiMagro', 'garrote', 'novilha', 'tropa', 'outros'].some(
          (campo) => Number(form[campo as keyof FormState]) > 0
        )
        if (!hasAnyValue) return 'Preencha pelo menos uma categoria de animais'
        return null
      }
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

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    // Validar que pasto de saída e entrada não são iguais
    if (form.pastoSaida && form.pastoEntrada && form.pastoSaida === form.pastoEntrada) {
      setErrors([{ field: 'pastoEntrada', message: 'O pasto de entrada não pode ser igual ao pasto de saída' }])
      setSalvando(false)
      return
    }

    // Calcular total de animais baseado na resposta de gadoContado
    let totalAnimais = 0
    if (form.gadoContado === 'Sim') {
      totalAnimais = (Number(form.vaca) || 0) + (Number(form.touro) || 0) + (Number(form.bezerro) || 0) +
                      (Number(form.boiGordo) || 0) + (Number(form.boiMagro) || 0) + (Number(form.garrote) || 0) +
                      (Number(form.novilha) || 0) + (Number(form.tropa) || 0) + (Number(form.outros) || 0)
    } else if (form.gadoContado === 'Não' && detalhesLote) {
      totalAnimais = (detalhesLote.n_cabecas || 0) + (detalhesLote.qtd_bezerros || 0)
    }

    const result = await salvarRegistro('pastagens', {
      data: form.data,
      manejador: form.manejador,
      numeroLote: form.numeroLote,
      loteId: form.loteId,
      pastoSaida: form.pastoSaida,
      pastoSaidaAreaUtil: form.pastoSaidaAreaUtil,
      pastoSaidaEspecie: form.pastoSaidaEspecie,
      avaliacaoSaida: form.avaliacaoSaida ? Number(form.avaliacaoSaida) : 0,
      tempoOcupacao: form.tempoOcupacao,
      pastoEntrada: form.pastoEntrada,
      pastoEntradaAreaUtil: form.pastoEntradaAreaUtil,
      pastoEntradaEspecie: form.pastoEntradaEspecie,
      avaliacaoEntrada: form.avaliacaoEntrada ? Number(form.avaliacaoEntrada) : 0,
      tempoVedacao: form.tempoVedacao,
      gadoContado: form.gadoContado,
      totalAnimais: totalAnimais,
      vaca: form.vaca ? Number(form.vaca) : 0,
      touro: form.touro ? Number(form.touro) : 0,
      boiGordo: form.boiGordo ? Number(form.boiGordo) : 0,
      boiMagro: form.boiMagro ? Number(form.boiMagro) : 0,
      garrote: form.garrote ? Number(form.garrote) : 0,
      bezerro: form.bezerro ? Number(form.bezerro) : 0,
      novilha: form.novilha ? Number(form.novilha) : 0,
      tropa: form.tropa ? Number(form.tropa) : 0,
      outros: form.outros ? Number(form.outros) : 0,
      escoreGado: form.escoreGado ? Number(form.escoreGado) : 0,
      bebedourosCochos: form.bebedourosCochos,
      bebedourosCochosObs: form.bebedourosCochosObs,
      pastagensTaxaLotacao: form.pastagensTaxaLotacao,
      pastagensTaxaLotacaoObs: form.pastagensTaxaLotacaoObs,
      animaisMachucadosDoentesBichados: form.animaisMachucadosDoentesBichados,
      animaisMachucadosDoentesBichadosObs: form.animaisMachucadosDoentesBichadosObs,
      cercasCochosPorteiras: form.cercasCochosPorteiras,
      cercasCochosPorteirasObs: form.cercasCochosPorteirasObs,
      carrapatosMoscas: form.carrapatosMoscas,
      carrapatosMoscasObs: form.carrapatosMoscasObs,
      animaisEntreverados: form.animaisEntreverados,
      animaisEntreveradosObs: form.animaisEntreveradosObs,
      animalMorto: form.animalMorto,
      animalMortoObs: form.animalMortoObs,
      escoreFezes: form.escoreFezes || null,
      numeroPessoasManejo: form.numeroPessoasManejo ? Number(form.numeroPessoasManejo) : 0,
      equipe_nomes: form.equipeNomes || null,
      // Campos de divergência
      n_cabecas: detalhesLote?.n_cabecas || 0,
      qtd_bezerros: detalhesLote?.qtd_bezerros || 0,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      setForm(makeInitial(usuario))
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
          <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2 text-center">MANEJO<br/>PASTAGENS</h1>
          <button
            onClick={() => navigate('/caderneta/pastagens/lista')}
            className="text-yellow-400 font-bold text-sm min-h-[40px] px-3"
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
          {usuario && (
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <span className="text-xl">👤</span>
              <p className="text-gray-700 font-semibold">{usuario}</p>
            </div>
          )}
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS PRINCIPAIS</h2>
          <DatePicker label={<span>DATA <span className="text-red-500">*</span></span>} value={form.data} onChange={set('data')} error={getError('data')} />
          {funcionariosDisponiveis.length > 0 ? (
            <SearchableModal
              label={<span>MANEJADOR <span className="text-red-500">*</span></span>}
              value={form.manejador}
              onChange={set('manejador')}
              error={getError('manejador')}
              options={funcionariosDisponiveis}
              placeholder="Buscar manejador..."
              id="manejador"
              name="manejador"
            />
          ) : (
            <Input
              label={<span>MANEJADOR <span className="text-red-500">*</span></span>}
              placeholder="Carregando..."
              value={form.manejador}
              onChange={setInput('manejador')}
              error={getError('manejador')}
              disabled
              id="manejador"
            />
          )}
        </div>

        {/* Seção 2: Pasto de Saída */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. PASTO DE SAÍDA</h2>
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
            />
          )}
          {detalhesPastoSaida && (
            <PastoDetalhesCard detalhes={detalhesPastoSaida} tipo="saida" tempo={form.tempoOcupacao} />
          )}
          {detalhesLote && (
            <LoteDetalhesCard detalhes={detalhesLote} processarCategorias={processarCategorias} />
          )}
          <Radio
            name="avaliacaoSaida"
            label={<span>AVALIAÇÃO DO PASTO DE SAÍDA <span className="text-red-500">*</span></span>}
            options={AVALIACOES}
            value={form.avaliacaoSaida}
            onChange={set('avaliacaoSaida')}
            gridCols={5}
            error={getError('avaliacaoSaida')}
          />
        </div>

        {/* Botão de PDF POP */}
        <button
          onClick={() => setShowPdfModal(true)}
          className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors"
        >
          <span className="text-xl">📄</span>
          <span>POP MANEJO PASTAGENS</span>
        </button>

        {/* Seção 3: Pasto de Entrada */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. PASTO DE ENTRADA</h2>
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
            <PastoDetalhesCard detalhes={detalhesPastoEntrada} tipo="entrada" tempo={form.tempoVedacao} />
          )}
          <Radio
            name="avaliacaoEntrada"
            label={<span>AVALIAÇÃO DO PASTO DE ENTRADA <span className="text-red-500">*</span></span>}
            options={AVALIACOES}
            value={form.avaliacaoEntrada}
            onChange={set('avaliacaoEntrada')}
            gridCols={5}
            error={getError('avaliacaoEntrada')}
          />
        </div>

        {/* Seção 4: Quantidade de Animais */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. QUANTIDADE DE ANIMAIS</h2>
          <Radio
            name="gadoContado"
            label={<span>O GADO FOI CONTADO? <span className="text-red-500">*</span></span>}
            options={[
              { value: 'Sim', label: 'SIM' },
              { value: 'Não', label: 'NÃO' }
            ]}
            value={form.gadoContado}
            onChange={set('gadoContado')}
            gridCols={2}
            error={getError('gadoContado')}
          />
          {form.gadoContado === 'Sim' && (
            <>
              {getError('categorias') && (
                <p className="text-base font-semibold text-red-700">⚠️ {getError('categorias')}</p>
              )}
              <div className="grid grid-cols-2 gap-3 overflow-hidden">
                {CATEGORIAS.map(({ campo, label }) => (
                  <Input
                    key={campo}
                    label={label}
                    placeholder="0"
                    value={form[campo]}
                    onChange={setInput(campo)}
                    inputMode="numeric"
                    type="number"
                    min="0"
                  />
                ))}
              </div>
              {total > 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-700">TOTAL</span>
                  <span className="text-2xl font-bold text-black">{total} animais</span>
                </div>
              )}
            </>
          )}
          {form.gadoContado === 'Não' && detalhesLote && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-gray-500 font-semibold mb-2">CABEÇAS MANEJADAS</p>
              <p className="text-2xl font-bold text-gray-900">
                {(detalhesLote.n_cabecas || 0) + (detalhesLote.qtd_bezerros || 0)} animais
              </p>
            </div>
          )}
          {form.gadoContado === 'Sim' && total > 0 && detalhesLote && (
            (() => {
              const totalCabecasLote = (detalhesLote.n_cabecas || 0) + (detalhesLote.qtd_bezerros || 0)
              const diferenca = total - totalCabecasLote
              if (diferenca !== 0) {
                return (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                    <p className="text-base font-semibold text-orange-800 text-justify">
                      ⚠️ O total informado ({total} animais) não coincide com o total do lote ({totalCabecasLote} animais)
                    </p>
                    <p className="text-base text-orange-700 mt-1">
                      {diferenca > 0 
                        ? `Excedeu ${diferenca} animais do total do lote` 
                        : `Faltam ${Math.abs(diferenca)} animais para completar o lote`
                      }
                    </p>
                  </div>
                )
              }
              return null
            })()
          )}
        </div>

        {/* Seção 5: Avaliação do Gado e Equipe */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">5. AVALIAÇÃO DO GADO E EQUIPE</h2>
          <div>
            <label className="block text-lg font-bold text-gray-900 mb-3 whitespace-pre-wrap">ESCORE DO GADO <span className="text-red-500">*</span></label>
            <button
              onClick={() => setShowEscoreModal(true)}
              className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors mb-3"
            >
              <span className="text-xl">📄</span>
              <span>POP ESCORE CORPORAL</span>
            </button>
            <div className="grid grid-cols-3 gap-2">
              {ESCORES.map((escore) => (
                <button
                  key={escore.value}
                  type="button"
                  onClick={() => set('escoreGado')(escore.value)}
                  className={`
                    py-3 px-2 rounded-xl font-bold text-black text-base
                    transition-all duration-200
                    ${form.escoreGado === escore.value ? escore.color : 'bg-gray-200 text-gray-700'}
                    hover:opacity-80
                  `}
                >
                  {escore.label}
                </button>
              ))}
            </div>
            {getError('escoreGado') && (
              <p className="text-base font-semibold text-red-700 mt-2">⚠️ {getError('escoreGado')}</p>
            )}
          </div>
          <div>
            <button
              onClick={() => setShowFezesModal(true)}
              className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors"
            >
              <span className="text-xl">📄</span>
              <span>POP ESCORE DE FEZES</span>
            </button>
            <label className="block text-lg font-bold text-gray-900 mb-3 whitespace-pre-wrap mt-3">ESCORE DE FEZES <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { value: '1', icon: '🔴' },
                { value: '2', icon: '🟡' },
                { value: '3', icon: '🟢' },
                { value: '4', icon: '🟡' },
                { value: '5', icon: '🔴' },
              ].map((escore) => (
                <label
                  key={escore.value}
                  className={`
                    cursor-pointer rounded-xl border-2
                    transition-all active:scale-95
                    flex flex-col items-center justify-center gap-1
                    p-2 min-h-[70px]
                    ${form.escoreFezes === escore.value ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]' : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
                  `}
                >
                  <input type="radio" name="escoreFezes" className="sr-only" value={escore.value} checked={form.escoreFezes === escore.value} onChange={(e) => setInput('escoreFezes')(e)} />
                  <span className="text-2xl sm:text-3xl">{escore.icon}</span>
                  <span className="text-base sm:text-lg font-bold text-center leading-tight">{escore.value}</span>
                </label>
              ))}
            </div>
            {getError('escoreFezes') && (
              <p className="text-base font-semibold text-red-700 mt-2">⚠️ {getError('escoreFezes')}</p>
            )}
          </div>
          <div>
            <label className="block text-lg font-bold text-gray-900 mb-3 whitespace-pre-wrap">N° PESSOAS NO MANEJO <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((num) => (
                <label
                  key={num}
                  className={`
                    cursor-pointer rounded-xl border-2
                    transition-all active:scale-95
                    flex flex-col items-center justify-center gap-1
                    p-2 min-h-[70px]
                    ${form.numeroPessoasManejo === String(num) ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]' : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
                  `}
                >
                  <input type="radio" name="numeroPessoasManejo" className="sr-only" value={num} checked={form.numeroPessoasManejo === String(num)} onChange={(e) => {
                    setInput('numeroPessoasManejo')(e)
                    // Reset equipeNomes when number changes
                    const numPessoas = Number(e.target.value) || 0
                    setForm(prev => ({
                      ...prev,
                      equipeNomes: Array(numPessoas).fill('')
                    }))
                  }} />
                  <span className="text-base sm:text-lg font-bold text-center leading-tight">{num}</span>
                </label>
              ))}
            </div>
            {form.numeroPessoasManejo && Number(form.numeroPessoasManejo) > 0 && (
              <div className="flex flex-col gap-3 mt-3">
                {getError('equipeNomes') && (
                  <p className="text-base font-semibold text-red-700">⚠️ {getError('equipeNomes')}</p>
                )}
                {Array.from({ length: Number(form.numeroPessoasManejo) }).map((_, index) => (
                  funcionariosDisponiveis.length > 0 ? (
                    <SearchableModal
                      key={index}
                      label={<span>Nome da {index + 1}ª pessoa <span className="text-red-500">*</span></span>}
                      value={form.equipeNomes[index] || ''}
                      onChange={(val) => {
                        const newNomes = [...form.equipeNomes]
                        newNomes[index] = val
                        setForm(prev => ({ ...prev, equipeNomes: newNomes }))
                      }}
                      options={funcionariosDisponiveis}
                      placeholder="Buscar funcionário..."
                      id={`equipeNome-${index}`}
                      name={`equipeNome-${index}`}
                    />
                  ) : (
                    <Input
                      key={index}
                      label={<span>Nome da {index + 1}ª pessoa <span className="text-red-500">*</span></span>}
                      placeholder="Carregando..."
                      value={form.equipeNomes[index] || ''}
                      onChange={(e) => {
                        const newNomes = [...form.equipeNomes]
                        newNomes[index] = e.target.value
                        setForm(prev => ({ ...prev, equipeNomes: newNomes }))
                      }}
                      disabled
                    />
                  )
                ))}
              </div>
            )}
            {getError('numeroPessoasManejo') && (
              <p className="text-base font-semibold text-red-700 mt-2">⚠️ {getError('numeroPessoasManejo')}</p>
            )}
          </div>
        </div>

        {/* Seção 6: Avaliação Geral */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">6. AVALIAÇÃO GERAL</h2>
          <Radio
            name="bebedourosCochos"
            label={<span>BEBEDOUROS / COCHOS OK? <span className="text-red-500">*</span></span>}
            options={[
              { value: 'S', label: 'SIM', icon: '✅' },
              { value: 'N', label: 'NÃO', icon: '❌' }
            ]}
            value={form.bebedourosCochos}
            onChange={set('bebedourosCochos')}
            gridCols={2}
            error={getError('bebedourosCochos')}
          />
          {form.bebedourosCochos === 'N' && (
            <Input
              placeholder="Adicionar observação (opcional)"
              value={form.bebedourosCochosObs}
              onChange={setInput('bebedourosCochosObs')}
            />
          )}
          <Radio
            name="pastagensTaxaLotacao"
            label={<span>PASTAGENS / TAXA DE LOTAÇÃO ADEQUADA? <span className="text-red-500">*</span></span>}
            options={[
              { value: 'S', label: 'SIM', icon: '✅' },
              { value: 'N', label: 'NÃO', icon: '❌' }
            ]}
            value={form.pastagensTaxaLotacao}
            onChange={set('pastagensTaxaLotacao')}
            gridCols={2}
            error={getError('pastagensTaxaLotacao')}
          />
          {form.pastagensTaxaLotacao === 'N' && (
            <Input
              placeholder="Adicionar observação (opcional)"
              value={form.pastagensTaxaLotacaoObs}
              onChange={setInput('pastagensTaxaLotacaoObs')}
            />
          )}
          <Radio
            name="animaisMachucadosDoentesBichados"
            label={<span>ANIMAIS MACHUCADOS / DOENTES / BICHADOS? <span className="text-red-500">*</span></span>}
            options={[
              { value: 'S', label: 'SIM', icon: '✅' },
              { value: 'N', label: 'NÃO', icon: '❌' }
            ]}
            value={form.animaisMachucadosDoentesBichados}
            onChange={set('animaisMachucadosDoentesBichados')}
            gridCols={2}
            error={getError('animaisMachucadosDoentesBichados')}
          />
          {form.animaisMachucadosDoentesBichados === 'S' && INVERTED_DIAGNOSTICOS.includes('animaisMachucadosDoentesBichados') && (
            <Input
              placeholder="Adicionar observação (opcional)"
              value={form.animaisMachucadosDoentesBichadosObs}
              onChange={setInput('animaisMachucadosDoentesBichadosObs')}
            />
          )}
          <Radio
            name="cercasCochosPorteiras"
            label={<span>CERCAS / COCHOS / PORTEIRAS OK? <span className="text-red-500">*</span></span>}
            options={[
              { value: 'S', label: 'SIM', icon: '✅' },
              { value: 'N', label: 'NÃO', icon: '❌' }
            ]}
            value={form.cercasCochosPorteiras}
            onChange={set('cercasCochosPorteiras')}
            gridCols={2}
            error={getError('cercasCochosPorteiras')}
          />
          {form.cercasCochosPorteiras === 'N' && (
            <Input
              placeholder="Adicionar observação (opcional)"
              value={form.cercasCochosPorteirasObs}
              onChange={setInput('cercasCochosPorteirasObs')}
            />
          )}
          <Radio
            name="carrapatosMoscas"
            label={<span>CARRAPATOS / MOSCAS? <span className="text-red-500">*</span></span>}
            options={[
              { value: 'S', label: 'SIM', icon: '✅' },
              { value: 'N', label: 'NÃO', icon: '❌' }
            ]}
            value={form.carrapatosMoscas}
            onChange={set('carrapatosMoscas')}
            gridCols={2}
            error={getError('carrapatosMoscas')}
          />
          {form.carrapatosMoscas === 'S' && INVERTED_DIAGNOSTICOS.includes('carrapatosMoscas') && (
            <Input
              placeholder="Adicionar observação (opcional)"
              value={form.carrapatosMoscasObs}
              onChange={setInput('carrapatosMoscasObs')}
            />
          )}
          <Radio
            name="animaisEntreverados"
            label={<span>ANIMAIS ENTREVERADOS? <span className="text-red-500">*</span></span>}
            options={[
              { value: 'S', label: 'SIM', icon: '✅' },
              { value: 'N', label: 'NÃO', icon: '❌' }
            ]}
            value={form.animaisEntreverados}
            onChange={set('animaisEntreverados')}
            gridCols={2}
            error={getError('animaisEntreverados')}
          />
          {form.animaisEntreverados === 'S' && INVERTED_DIAGNOSTICOS.includes('animaisEntreverados') && (
            <Input
              placeholder="Adicionar observação (opcional)"
              value={form.animaisEntreveradosObs}
              onChange={setInput('animaisEntreveradosObs')}
            />
          )}
          <Radio
            name="animalMorto"
            label={<span>ANIMAL MORTO? <span className="text-red-500">*</span></span>}
            options={[
              { value: 'S', label: 'SIM', icon: '✅' },
              { value: 'N', label: 'NÃO', icon: '❌' }
            ]}
            value={form.animalMorto}
            onChange={set('animalMorto')}
            gridCols={2}
            error={getError('animalMorto')}
          />
          {form.animalMorto === 'S' && INVERTED_DIAGNOSTICOS.includes('animalMorto') && (
            <Input
              placeholder="Adicionar observação (opcional)"
              value={form.animalMortoObs}
              onChange={setInput('animalMortoObs')}
            />
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾" disabled={!isValid}>
            SALVAR
          </Button>
          <Button onClick={() => { setForm(makeInitial()); setErrors([]) }} variant="secondary" icon="🧹">
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
        cadernetaName="Manejo Pastagens"
        registro={registroSalvo}
        caderneta="pastagens"
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
        images={[
          `${BASE}docs/ECC/POP_ECC.jpeg`
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

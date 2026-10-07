import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, ValidationMessage, SearchableModal } from '../../components/ui'
import { MapPin } from 'lucide-react'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import ChoiceGrid from '../../components/cadernetas/ChoiceGrid'
import InfoCard from '../../components/cadernetas/InfoCard'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import StepperInput from '../../components/cadernetas/StepperInput'
import FormFooter from '../../components/cadernetas/FormFooter'
import BannerRascunho from '../../components/BannerRascunho'
import { usePhotoGps } from '../../hooks/usePhotoGps'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { base64ToDataUrl } from '../../utils/photoCompress'
import { salvarRegistro } from '../../services/api'
import { saveRegistro as saveRegistroIDB, deleteRegistro, removeFromSyncQueueByRegistroId } from '../../services/indexedDB'
import { enqueueRegistro } from '../../services/syncService'
import { registerBackgroundSync } from '../../serviceWorkerRegistration'
import { generateId, generateVersion, getCurrentTimestamp } from '../../utils/generateId'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import {
  getCachedCadastroData,
  getLoteByNomeCached,
  getLoteDetalhesComCategoriasCached,
  getFazendasDoMesmoGrupoCached,
  getLotesAtivosCached,
  getCurraisCached,
  getRacasCached,
} from '../../services/cadastroCache'
import { transferirLoteEntreFazendas, getPastos } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import { isCategoriaAoPe, processarCategorias, capitalizarCategoria, getCategoriasPorDestino } from '../../utils/categorias'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { useFormValidation } from '../../hooks/useFormValidation'

const MOTIVOS = [
  { value: 'Entrada', label: 'ENTRADA', icon: '📥' },
  { value: 'Saída', label: 'SAÍDA', icon: '📤' },
  { value: 'Consumo', label: 'CONSUMO', icon: '🍖' },
  { value: 'Entrevero', label: 'ENTREVERO', icon: '🔀' },
  { value: 'Doação', label: 'DOAÇÃO', icon: '🎁' },
]

const TIPO_SAIDA_BASE = [
  { value: 'Enfermaria', label: 'Enfermaria', icon: '' },
  { value: 'Apartação', label: 'Apartação', icon: '' },
  { value: 'Refugo de Cocho', label: 'Refugo de Cocho', icon: '' },
  { value: 'Venda', label: 'Venda', icon: '' },
  { value: 'Transferência', label: 'Transferência', icon: '' },
  { value: 'Novo Lote', label: 'Novo Lote', icon: '' },
]

// "Novo Lote" disponível apenas para fazendas específicas
const FAZENDAS_NOVO_LOTE_HABILITADO = [
  'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034', // Fazenda Marcon
  'f8be22c5-12e9-4bda-a813-fae8cb3d47ec',
  'd649c65e-16ab-4b77-a84b-df937aa41cc3', // Fazenda Gesta'Up (teste)
  'a6640dd6-94b6-4828-a3b1-b7b31c892bf9' // Bom Jesus - Mirandópolis
]

const SISTEMA_PRODUCAO_OPTS = [
  { value: 'Cria', label: 'Cria' },
  { value: 'Confinamento', label: 'Confinamento' },
  { value: 'Engorda', label: 'Engorda' },
  { value: 'Recria', label: 'Recria' },
  { value: 'RIP', label: 'RIP' },
  { value: 'Sequestro', label: 'Sequestro' },
  { value: 'TIP', label: 'TIP' },
]

// Sistemas de produção que ocupam curral (participam da folha de tratos).
const SISTEMAS_COM_CURRAL = ['Confinamento', 'TIP', 'Sequestro']
function usaCurralSistema(sistema: string | null | undefined): boolean {
  return SISTEMAS_COM_CURRAL.includes(sistema || '')
}

const DESTINO_OPTS = [
  { value: 'corte', label: 'Abate' },
  { value: 'reprodução', label: 'Reprodução' },
  { value: 'enfermaria', label: 'Enfermaria' },
]

const ESCALA_EQUIPE = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6+' },
]

interface FormState {
  data: string
  loteOrigem: string
  loteOrigemId: string
  loteDestino: string
  loteDestinoId: string
  cabecasPorCategoria: Record<string, string>
  motivoMovimentacao: string
  subtipo: string // Enfermaria, Apartação, Refugo de Cocho, Compras, Transferência
  brinco: string
  chip: string
  observacao: string
  fazendaDestinoId: string
  fazendaDestinoNome: string
  // Campos para Novo Lote
  nomeNovoLote: string
  sistemaProducaoNovoLote: string
  destinoNovoLote: string
  pastoIdNovoLote: string
  pastoNomeNovoLote: string
  curralIdNovoLote: string
  curralNomeNovoLote: string
  // Campos para Entrada
  dataEntrada: string
  categoriasEntrada: Record<string, {
    selecionada: boolean
    cabecas: string
    pesoAtual: string
    raca: string
    sexo: string
    idade: string
  }>
  // Equipe (opcional)
  equipe: string
  equipeNomes: string[]
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  loteOrigem: '',
  loteOrigemId: '',
  loteDestino: '',
  loteDestinoId: '',
  cabecasPorCategoria: {},
  motivoMovimentacao: '',
  subtipo: '',
  brinco: '',
  chip: '',
  observacao: '',
  fazendaDestinoId: '',
  fazendaDestinoNome: '',
  nomeNovoLote: '',
  sistemaProducaoNovoLote: '',
  destinoNovoLote: '',
  pastoIdNovoLote: '',
  pastoNomeNovoLote: '',
  curralIdNovoLote: '',
  curralNomeNovoLote: '',
  dataEntrada: todayBR(),
  categoriasEntrada: {},
  equipe: '',
  equipeNomes: [],
})

export default function MovimentacaoPage() {
  const navigate = useNavigate()
  const { usuario, fazendaId } = useSelector((state: RootState) => state.config)
  const tipoSaidaOptions = FAZENDAS_NOVO_LOTE_HABILITADO.includes(fazendaId)
    ? TIPO_SAIDA_BASE
    : TIPO_SAIDA_BASE.filter(o => o.value !== 'Novo Lote')
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'movimentacao', makeInitial })
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [lotesPastoMap, setLotesPastoMap] = useState<Record<string, string>>({})
  const [frigorificosDisponiveis, setFrigorificosDisponiveis] = useState<string[]>([])
  const [detalhesLoteOrigem, setDetalhesLoteOrigem] = useState<any>(null)
  const [fazendasDoGrupo, setFazendasDoGrupo] = useState<{ id: string; nome: string }[]>([])
  const [pastosDisponiveis, setPastosDisponiveis] = useState<{ id: string; nome: string }[]>([])
  const [curraisDisponiveis, setCurraisDisponiveis] = useState<{ id: string; nome: string }[]>([])
  const [racasDisponiveis, setRacasDisponiveis] = useState<{ id: string; nome: string }[]>([])
  const [funcionariosDisponiveis, setFuncionariosDisponiveis] = useState<string[]>([])
  const baseVozRef = useRef('')

  const { fotoBase64, capturandoFoto, fotoErro, capturarFoto, limpar: limparFoto, fotoInputRef, handleFileInputChange } =
    usePhotoGps({ comGps: false })
  const { ouvindo: ouvindoVoz, erro: vozErro, toggle: toggleVoz, parar: pararVoz } = useVoiceInput()

  // Ditado: o texto parcial é acrescentado ao que já existia quando a gravação começou.
  const handleFalar = async () => {
    if (ouvindoVoz) {
      await pararVoz()
      return
    }
    baseVozRef.current = form.observacao.trim()
    await toggleVoz((parcial) => {
      const texto = baseVozRef.current ? `${baseVozRef.current} ${parcial}` : parcial
      setForm((prev) => ({ ...prev, observacao: texto }))
    })
  }

  const resetarTudo = () => {
    limparRascunho()
    limparFoto()
  }

  const handleEquipe = (value: string) => {
    const numPessoas = Number(value) || 0
    setForm((prev) => ({
      ...prev,
      equipe: value,
      equipeNomes: Array.from({ length: numPessoas }, (_, i) => prev.equipeNomes[i] || ''),
    }))
    if (errors.length > 0) setErrors([])
  }

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [field]: val } as FormState))
    if (errors.length > 0) setErrors([])
  }

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Validation rules condicionais por motivo/subtipo
  const validationRules: any = {
    data: { required: true },
    motivoMovimentacao: { required: true },
  }

  // loteOrigem obrigatório (Doação também desconta cabeças do lote)
  validationRules.loteOrigem = { required: true }

  // subtipo obrigatório quando motivo é Saída
  if (form.motivoMovimentacao === 'Saída') {
    validationRules.subtipo = { required: true }
  }

  // loteDestino obrigatório para Consumo, Entrevero, e Saída exceto Transferência, Novo Lote, Enfermaria e Venda
  // (Enfermaria e Venda têm destino automático = subtipo, sem seletor de lote na UI)
  if (form.motivoMovimentacao === 'Consumo' || form.motivoMovimentacao === 'Entrevero') {
    validationRules.loteDestino = { required: true }
  } else if (
    form.motivoMovimentacao === 'Saída' &&
    form.subtipo !== 'Transferência' &&
    form.subtipo !== 'Novo Lote' &&
    form.subtipo !== 'Enfermaria' &&
    form.subtipo !== 'Venda'
  ) {
    validationRules.loteDestino = { required: true }
  }

  // Transferência entre fazendas: fazendaDestinoId obrigatório
  if (form.motivoMovimentacao === 'Saída' && form.subtipo === 'Transferência') {
    validationRules.fazendaDestinoId = { required: true }
  }

  // Novo Lote: campos específicos obrigatórios
  if (form.motivoMovimentacao === 'Saída' && form.subtipo === 'Novo Lote') {
    validationRules.nomeNovoLote = { required: true }
    validationRules.sistemaProducaoNovoLote = { required: true }
    validationRules.destinoNovoLote = { required: true }
    if (usaCurralSistema(form.sistemaProducaoNovoLote)) {
      validationRules.curralIdNovoLote = { required: true }
    } else if (form.sistemaProducaoNovoLote) {
      validationRules.pastoIdNovoLote = { required: true }
    }
  }

  // Cabeças por categoria: pelo menos uma > 0 (exceto Entrada, que tem validação própria)
  if (form.motivoMovimentacao !== 'Entrada' && form.loteOrigem) {
    validationRules.cabecasPorCategoria = {
      custom: (_value: any, formState: any) => {
        const vals = Object.values(formState.cabecasPorCategoria || {})
        if (vals.length === 0) return 'Informe pelo menos uma quantidade de cabeças'
        const hasAny = vals.some((v: any) => Number(v) > 0)
        return hasAny ? null : 'Informe pelo menos uma quantidade de cabeças'
      },
    }
  }

  // Entrada: validar campos obrigatórios por categoria selecionada
  if (form.motivoMovimentacao === 'Entrada' && form.loteOrigem) {
    validationRules.categoriasEntrada = {
      custom: (_value: any, formState: any) => {
        const entradas = Object.entries(formState.categoriasEntrada || {}) as [string, any][]
        const selecionadas = entradas.filter(([, v]) => v.selecionada && Number(v.cabecas) > 0)
        if (selecionadas.length === 0) return 'Selecione pelo menos uma categoria com quantidade de cabeças'
        const catsExistentes = (detalhesLoteOrigem?.categorias_raw || []) as any[]
        for (const [categoria, v] of selecionadas) {
          if (!v.pesoAtual || Number(v.pesoAtual) <= 0) return `Peso médio atual é obrigatório para ${categoria}`
          const existe = catsExistentes.some((c: any) => c.categoria.toLowerCase() === categoria.toLowerCase())
          if (!existe) {
            if (!v.raca) return `Raça é obrigatória para ${categoria} (categoria nova)`
            if (!v.sexo) return `Sexo é obrigatório para ${categoria} (categoria nova)`
            if (!v.idade || Number(v.idade) <= 0) return `Idade é obrigatória para ${categoria} (categoria nova)`
          }
        }
        return null
      },
    }
  }

  // Equipe (opcional): se informou quantidade, nomes são obrigatórios
  if (form.equipe) {
    validationRules.equipeNomes = {
      custom: (value: string[]) => {
        const numPessoas = Number(form.equipe) || 0
        if (numPessoas === 0) return null
        if (!value || value.length < numPessoas || value.some(v => !v || v.trim() === '')) {
          return 'Preencha o nome de todas as pessoas da equipe'
        }
        return null
      },
    }
  }

  const { isValid } = useFormValidation(form, validationRules)

  const setCabecasCategoria = (categoria: string, valor: string) => {
    // Trava: impedir valor maior que o disponível na categoria
    const cat = detalhesLoteOrigem?.categorias_raw?.find((c: any) => c.categoria === categoria)
    const max = cat?.quant_atual ?? 0
    const num = Number(valor)
    if (valor !== '' && !isNaN(num) && num > max) {
      setForm((p) => ({ ...p, cabecasPorCategoria: { ...p.cabecasPorCategoria, [categoria]: String(max) } }))
      return
    }
    setForm((p) => ({ ...p, cabecasPorCategoria: { ...p.cabecasPorCategoria, [categoria]: valor } }))
  }

  const totalCabecas = Object.values(form.cabecasPorCategoria).reduce(
    (sum, val) => sum + (Number(val) || 0),
    0
  )

  // Lógica para definir destino automaticamente baseado no motivo
  useEffect(() => {
    if (!form.motivoMovimentacao) {
      setForm((p) => ({ ...p, loteDestino: '', subtipo: '' }))
      return
    }

    switch (form.motivoMovimentacao) {
      case 'Consumo':
        setForm((p) => ({ ...p, loteDestino: 'Cantina', subtipo: '' }))
        break
      case 'Saída':
        // Limpar destino e subtipo para que o usuário selecione
        setForm((p) => ({ ...p, loteDestino: '', subtipo: '' }))
        break
      case 'Entrada':
        // Limpar destino e subtipo para que o usuário selecione
        setForm((p) => ({ ...p, loteDestino: '', subtipo: '' }))
        break
      case 'Abate':
      case 'Entrevero':
      case 'Doação':
        // Para esses casos, limpar o destino para que o usuário selecione
        setForm((p) => ({ ...p, loteDestino: '', subtipo: '' }))
        break
      default:
        break
    }
  }, [form.motivoMovimentacao])

  // Carregar pastos e lotes do cache global, com fallback para Supabase
  useEffect(() => {
    const loadData = async () => {
      if (fazendaId) {
        const { lotes, lotesPastoMap: mapa } = await getLotesAtivosCached(fazendaId)
        setLotesDisponiveis(lotes)
        setLotesPastoMap(mapa)
      }
      const cache = await getCachedCadastroData()
      if (cache) {
        setFrigorificosDisponiveis(cache.frigorificos || [])
        setFuncionariosDisponiveis(cache.funcionarios || [])
      }

      // Carregar fazendas do mesmo grupo (para Transferência entre fazendas)
      if (fazendaId) {
        try {
          const fazendas = await getFazendasDoMesmoGrupoCached(fazendaId)
          setFazendasDoGrupo(fazendas || [])
        } catch (error) {
          // Erro silencioso: se a fazenda não tem grupo_id, a função retorna []
          setFazendasDoGrupo([])
        }
      }

      // Carregar pastos e currais (para Novo Lote)
      if (fazendaId) {
        try {
          const pastosData = await getPastos(fazendaId)
          setPastosDisponiveis((pastosData || []).map((p: any) => ({ id: p.id, nome: p.nome })))
        } catch (error) {
          setPastosDisponiveis([])
        }
        try {
          const curraisData = await getCurraisCached(fazendaId)
          setCurraisDisponiveis((curraisData || []).map((c: any) => ({ id: c.id, nome: c.nome })))
        } catch (error) {
          setCurraisDisponiveis([])
        }
        try {
          const racasData = await getRacasCached(fazendaId)
          setRacasDisponiveis((racasData || []).map((r: any) => ({ id: r.id, nome: r.nome })))
        } catch (error) {
          setRacasDisponiveis([])
        }
      }
    }
    loadData()
  }, [fazendaId])

  // Escutar atualizações do cache de cadastro
  useEffect(() => {
    const unsubscribe = eventBus.on(CADASTRO_CACHE_UPDATED, (data: any) => {
      console.log('[MovimentacaoPage] Cache atualizado, recarregando dados')
      if (data) {
        setLotesDisponiveis(data.lotes || [])
        setLotesPastoMap(data.lotesPastoMap || {})
        setFrigorificosDisponiveis(data.frigorificos || [])
        setFuncionariosDisponiveis(data.funcionarios || [])
      }
    })

    return unsubscribe
  }, [])

  // Buscar detalhes do lote origem quando selecionado
  useEffect(() => {
    async function carregarDetalhesLoteOrigem() {
      if (!form.loteOrigem || !fazendaId) {
        setDetalhesLoteOrigem(null)
        setForm(prev => ({ ...prev, loteOrigemId: '', cabecasPorCategoria: {} }))
        return
      }

      try {
        const lote = await getLoteByNomeCached(fazendaId, form.loteOrigem)
        if (lote) {
          // Buscar detalhes de categorias do lote
          const categoriasDetalhes = await getLoteDetalhesComCategoriasCached(lote.id)
          
          // Combinar dados do lote com dados de categorias
          setDetalhesLoteOrigem({
            ...lote,
            categorias: categoriasDetalhes.categorias,
            categorias_raw: categoriasDetalhes.categorias_raw || [],
            n_cabecas: categoriasDetalhes.quant_atual,
            peso_vivo_kg: categoriasDetalhes.peso_vivo_kg,
            qtd_bezerros: categoriasDetalhes.qtd_bezerros
          })
          // Armazenar o ID do lote origem e zerar categorias do lote anterior
          setForm(prev => ({ ...prev, loteOrigemId: lote.id, cabecasPorCategoria: {} }))
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do lote origem:', error)
        setDetalhesLoteOrigem(null)
        setForm(prev => ({ ...prev, loteOrigemId: '' }))
      }
    }

    carregarDetalhesLoteOrigem()
  }, [form.loteOrigem, fazendaId])

  // Buscar ID do lote destino quando selecionado (se for um lote)
  useEffect(() => {
    async function carregarLoteDestinoId() {
      if (!form.loteDestino || !fazendaId) {
        setForm(prev => ({ ...prev, loteDestinoId: '' }))
        return
      }

      // Verificar se o destino é um lote (está na lista de lotes disponíveis)
      const isLote = lotesDisponiveis.includes(form.loteDestino)
      
      if (!isLote) {
        // Não é um lote (pode ser Cantina, frigorifico, fornecedor, etc.)
        setForm(prev => ({ ...prev, loteDestinoId: '' }))
        return
      }

      try {
        const lote = await getLoteByNomeCached(fazendaId, form.loteDestino)
        if (lote) {
          setForm(prev => ({ ...prev, loteDestinoId: lote.id }))
        }
      } catch (error) {
        console.error('Erro ao carregar ID do lote destino:', error)
        setForm(prev => ({ ...prev, loteDestinoId: '' }))
      }
    }

    carregarLoteDestinoId()
  }, [form.loteDestino, fazendaId, lotesDisponiveis])

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    try {
      // Pré-validação: motivo é obrigatório (exceto Doação que tem fluxo próprio)
      if (!form.motivoMovimentacao) {
        setErrors([{ field: 'motivoMovimentacao', message: 'Selecione o motivo da movimentação' }])
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      // Pré-validação: lote origem é obrigatório
      if (!form.loteOrigem) {
        setErrors([{ field: 'loteOrigem', message: 'Selecione o lote de origem' }])
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      // Destino final: loteDestino do seletor, com ajuste por motivo/subtipo
      let destinoFinal = form.loteDestino

      // Ajustar destino padrão baseado no motivo/subtipo
      if (form.motivoMovimentacao === 'Consumo') {
        if (!destinoFinal || destinoFinal === '') {
          destinoFinal = 'Cantina'
        }
      } else if (form.motivoMovimentacao === 'Saída') {
        if (form.subtipo === 'Enfermaria' || form.subtipo === 'Venda') {
          if (!destinoFinal || destinoFinal === '') {
            destinoFinal = form.subtipo
          }
        }
      }

      // Validar que destino não está vazio (exceto Transferência, Novo Lote, Entrada e Doação, que não têm seletor de destino)
      if (!(form.motivoMovimentacao === 'Saída' && (form.subtipo === 'Transferência' || form.subtipo === 'Novo Lote')) && form.motivoMovimentacao !== 'Entrada' && form.motivoMovimentacao !== 'Doação') {
        if (!destinoFinal || destinoFinal.trim() === '') {
          setErrors([{ field: 'loteDestino', message: 'Selecione o destino da movimentação' }])
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }
      }

      // Caso especial: Entrada de animais (lote do topo = destino)
      if (form.motivoMovimentacao === 'Entrada') {
        const categoriasSelecionadas = Object.entries(form.categoriasEntrada)
          .filter(([, v]) => v.selecionada && Number(v.cabecas) > 0)
          .map(([categoria, v]) => {
            const catExistente = detalhesLoteOrigem?.categorias_raw?.find(
              (c: any) => c.categoria.toLowerCase() === categoria.toLowerCase()
            )
            return {
              categoria,
              cabecas: Number(v.cabecas),
              pesoAtual: Number(v.pesoAtual),
              raca: v.raca || null,
              sexo: v.sexo || null,
              idade: v.idade ? Number(v.idade) : null,
              existeNoLote: !!catExistente,
            }
          })

        if (categoriasSelecionadas.length === 0) {
          setErrors([{ field: 'categoriasEntrada', message: 'Selecione pelo menos uma categoria com quantidade de cabeças' }])
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }

        // Validar campos obrigatórios
        const errosEntrada: { field: string; message: string }[] = []
        for (const c of categoriasSelecionadas) {
          if (!c.pesoAtual || c.pesoAtual <= 0) {
            errosEntrada.push({ field: `entrada_peso_${c.categoria}`, message: `Peso médio atual é obrigatório para ${c.categoria}` })
          }
          if (!c.existeNoLote) {
            if (!c.raca) {
              errosEntrada.push({ field: `entrada_raca_${c.categoria}`, message: `Raça é obrigatória para ${c.categoria} (categoria nova)` })
            }
            if (!c.sexo) {
              errosEntrada.push({ field: `entrada_sexo_${c.categoria}`, message: `Sexo é obrigatório para ${c.categoria} (categoria nova)` })
            }
            if (!c.idade || c.idade <= 0) {
              errosEntrada.push({ field: `entrada_idade_${c.categoria}`, message: `Idade é obrigatória para ${c.categoria} (categoria nova)` })
            }
          }
        }
        if (errosEntrada.length > 0) {
          setErrors(errosEntrada)
          scrollToFirstError(errosEntrada)
          return
        }

        // Criar um registro de movimentação por categoria
        const resultadosEntrada: { success: boolean; errors?: any[]; registro?: any }[] = []
        const salvosEntrada: string[] = []
        for (const c of categoriasSelecionadas) {
          const result = await salvarRegistro('movimentacao', {
            data: form.dataEntrada,
            responsavel: usuario,
            usuario: usuario,
            loteOrigem: form.loteOrigem,
            loteOrigemId: form.loteOrigemId,
            loteDestino: '',
            loteDestinoId: '',
            numeroCabecas: c.cabecas,
            maxCabecasLote: null,
            categoria: c.categoria,
            motivoMovimentacao: 'Entrada',
            subtipo: null,
            brinco: '',
            chip: '',
            observacao: form.observacao,
            equipe: form.equipe ? Number(form.equipe) : null,
            equipeNomes: form.equipeNomes,
            pesoVivoAtualKg: c.pesoAtual,
            raca: c.existeNoLote ? null : c.raca,
            sexo: c.existeNoLote ? null : c.sexo,
            idade: c.existeNoLote ? null : c.idade,
            // Foto só no primeiro registro (evita upload duplicado)
            fotoBase64: salvosEntrada.length === 0 ? fotoBase64 || null : null,
          })
          resultadosEntrada.push(result)
          if (result.success && result.registro) {
            salvosEntrada.push(result.registro.id)
          } else if (!result.success && result.errors) {
            // Rollback: remover categorias ja persistidas para evitar duplicatas no reenvio
            for (const id of salvosEntrada) {
              await deleteRegistro('movimentacao', id)
              await removeFromSyncQueueByRegistroId(id)
            }
            break
          }
        }

        const falhouEntrada = resultadosEntrada.find(r => !r.success)
        if (falhouEntrada && falhouEntrada.errors) {
          setErrors(falhouEntrada.errors)
          scrollToFirstError(falhouEntrada.errors)
        } else {
          const ultimoRegistroEntrada = resultadosEntrada[resultadosEntrada.length - 1]?.registro
          setRegistroSalvo(ultimoRegistroEntrada ? {
            ...ultimoRegistroEntrada,
            categoriasEntrada: categoriasSelecionadas.map(c => ({
              categoria: c.categoria,
              cabecas: c.cabecas,
              pesoAtual: c.pesoAtual,
            })),
          } : ultimoRegistroEntrada)
          setShowSuccessModal(true)
          resetarTudo()
        }
        return
      }

      // Caso especial: Transferência entre fazendas do mesmo grupo
      if (form.motivoMovimentacao === 'Saída' && form.subtipo === 'Transferência') {
        if (!form.fazendaDestinoId) {
          setErrors([{ field: 'fazendaDestinoId', message: 'Selecione a fazenda de destino' }])
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }

        // Coletar categorias com quantidade > 0 (reusa mesma lógica abaixo)
        const categoriasRawTransf = detalhesLoteOrigem?.categorias_raw || []
        const categoriasParaTransferir = categoriasRawTransf
          .map((cat: any) => ({
            categoria: cat.categoria,
            numeroCabecas: Number(form.cabecasPorCategoria[cat.categoria] || 0),
            maxCabecas: cat.quant_atual || 0,
          }))
          .filter((c: any) => c.numeroCabecas > 0)

        if (categoriasParaTransferir.length === 0) {
          setErrors([{ field: 'cabecasPorCategoria', message: 'Informe pelo menos uma quantidade de cabeças por categoria' }])
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }

        const excedeTransf = categoriasParaTransferir.find((c: any) => c.numeroCabecas > c.maxCabecas)
        if (excedeTransf) {
          const msg = `Quantidade de ${excedeTransf.categoria} (${excedeTransf.numeroCabecas}) excede o disponível no lote (${excedeTransf.maxCabecas})`
          setErrors([{ field: `cabecas_${excedeTransf.categoria}`, message: msg }])
          scrollToFirstError([{ field: `cabecas_${excedeTransf.categoria}`, message: msg }])
          return
        }

        try {
          const result = await transferirLoteEntreFazendas(
            form.loteOrigemId,
            form.fazendaDestinoId,
            categoriasParaTransferir.map((c: any) => ({ categoria: c.categoria, numero_cabecas: c.numeroCabecas })),
            usuario
          )

          if (!result.success) {
            setErrors([{ field: 'general', message: result.error || 'Erro ao transferir lote' }])
            window.scrollTo({ top: 0, behavior: 'smooth' })
            return
          }

          // Salvar registro local no IndexedDB para aparecer na lista de movimentações
          // syncStatus='synced' para não tentar sincronizar de novo (a RPC já fez tudo)
          try {
            const registroLocal = {
              id: generateId(),
              data: `${form.data} ${new Date().toTimeString().slice(0, 5)}`,
              loteOrigem: form.loteOrigem,
              loteOrigemId: form.loteOrigemId,
              loteDestino: result.lote_destino_nome || form.fazendaDestinoNome,
              loteDestinoId: result.lote_destino_id || '',
              motivoMovimentacao: 'Transferencia',
              subtipo: 'Saida',
              numeroCabecas: result.total_cabecas || 0,
              categoria: categoriasParaTransferir.map((c: any) => c.categoria).join(', '),
              usuario: usuario,
              responsavel: usuario,
              brinco: '',
              chip: '',
              observacao: `Transferência para ${result.fazenda_destino_nome}. Lote criado: ${result.lote_destino_nome}.`,
              equipe: form.equipe ? Number(form.equipe) : null,
              equipeNomes: form.equipeNomes,
              syncStatus: 'synced' as const,
              version: generateVersion(),
              lastModified: getCurrentTimestamp(),
              supabaseId: result.lote_destino_id,
            }
            await saveRegistroIDB('movimentacao', registroLocal as any)
          } catch (err) {
            console.error('[MovimentacaoPage] Erro ao salvar registro local da transferência:', err)
          }

          setRegistroSalvo({
            tipo: 'transferencia',
            loteDestinoNome: result.lote_destino_nome,
            fazendaDestinoNome: result.fazenda_destino_nome,
            totalCabecas: result.total_cabecas,
            transferenciaTotal: result.transferencia_total,
          })
          setShowSuccessModal(true)
          resetarTudo()
        } catch (error: any) {
          console.error('[MovimentacaoPage] Erro na transferência:', error)
          setErrors([{ field: 'general', message: error?.message || 'Erro ao transferir lote. Tente novamente.' }])
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }
        return
      }

      // Caso especial: Novo Lote (Saída com criação pendente de aprovação)
      if (form.motivoMovimentacao === 'Saída' && form.subtipo === 'Novo Lote') {
        // Validar campos do novo lote
        if (!form.nomeNovoLote.trim()) {
          setErrors([{ field: 'nomeNovoLote', message: 'Informe o nome do novo lote' }])
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }
        if (!form.sistemaProducaoNovoLote) {
          setErrors([{ field: 'sistemaProducaoNovoLote', message: 'Selecione o sistema de produção' }])
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }
        if (!form.destinoNovoLote) {
          setErrors([{ field: 'destinoNovoLote', message: 'Selecione o destino' }])
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }
        const isConfinamentoNL = usaCurralSistema(form.sistemaProducaoNovoLote)
        if (isConfinamentoNL && !form.curralIdNovoLote) {
          setErrors([{ field: 'curralIdNovoLote', message: 'Selecione o curral' }])
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }
        if (!isConfinamentoNL && !form.pastoIdNovoLote) {
          setErrors([{ field: 'pastoIdNovoLote', message: 'Selecione o pasto' }])
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }

        // Coletar categorias com quantidade > 0
        const categoriasRawNL = detalhesLoteOrigem?.categorias_raw || []
        const categoriasParaMoverNL = categoriasRawNL
          .map((cat: any) => ({
            categoria: cat.categoria,
            numeroCabecas: Number(form.cabecasPorCategoria[cat.categoria] || 0),
            maxCabecas: cat.quant_atual || 0,
          }))
          .filter((c: any) => c.numeroCabecas > 0)

        if (categoriasParaMoverNL.length === 0) {
          setErrors([{ field: 'cabecasPorCategoria', message: 'Informe pelo menos uma quantidade de cabeças por categoria' }])
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }

        const excedeNL = categoriasParaMoverNL.find((c: any) => c.numeroCabecas > c.maxCabecas)
        if (excedeNL) {
          const msg = `Quantidade de ${excedeNL.categoria} (${excedeNL.numeroCabecas}) excede o disponível no lote (${excedeNL.maxCabecas})`
          setErrors([{ field: `cabecas_${excedeNL.categoria}`, message: msg }])
          scrollToFirstError([{ field: `cabecas_${excedeNL.categoria}`, message: msg }])
          return
        }

        // Montar snapshot completo de cada categoria (sem gmd)
        // quant_inicial = quant_atual = cabeças movimentadas
        // data_pesagem = data da movimentação
        const categoriasSnapshot = categoriasParaMoverNL.map((c: any) => {
          const catOrigem = categoriasRawNL.find((cr: any) => cr.categoria === c.categoria)
          return {
            categoria: c.categoria,
            numero_cabecas: c.numeroCabecas,
            quant_inicial: c.numeroCabecas,
            quant_atual: c.numeroCabecas,
            data_pesagem: form.data.split('/').reverse().join('-'),
            raca: catOrigem?.raca || null,
            sexo: catOrigem?.sexo || null,
            idade: catOrigem?.idade || null,
            peso_entrada_kg_cab: catOrigem?.peso_entrada_kg_cab || null,
            peso_entrada_arrobas: catOrigem?.peso_entrada_arrobas || null,
            peso_vivo_atual_kg_cab: catOrigem?.peso_vivo_atual_kg_cab || null,
            peso_vivo_meta_kg_cab: catOrigem?.peso_vivo_meta_kg_cab || null,
            peso_vivo_atual_arroba_cab: catOrigem?.peso_vivo_atual_arroba_cab || null,
            rc_inicial: catOrigem?.rc_inicial || null,
            rc_final: catOrigem?.rc_final || null,
            rc_atual: catOrigem?.rc_atual || null,
            periodo: catOrigem?.periodo || null,
            dias_restantes_meta: catOrigem?.dias_restantes_meta || null,
            data_meta_projetada: catOrigem?.data_meta_projetada || null,
            estrategia_nutricional: catOrigem?.estrategia_nutricional || null,
            // lote_categorias.qtd_bezerros é legado: para categoria ao pé as
            // cabeças movimentadas são os próprios bezerros.
            qtd_bezerros: isCategoriaAoPe(c.categoria) ? c.numeroCabecas : null,
            consumo_meta_porcentagem_pesovivo: catOrigem?.consumo_meta_porcentagem_pesovivo || null,
            peso_venda_meta_arroba: catOrigem?.peso_venda_meta_arroba || null,
            margem_lucro_percent: catOrigem?.margem_lucro_percent || null,
            preco_custo_reais_arroba: catOrigem?.preco_custo_reais_arroba || null,
            preco_custo_cab: catOrigem?.preco_custo_cab || null,
            preco_venda_projetado_reais_arroba: catOrigem?.preco_venda_projetado_reais_arroba || null,
            preco_venda_sugerido_cab: catOrigem?.preco_venda_sugerido_cab || null,
            producao_atual_arroba_cab: catOrigem?.producao_atual_arroba_cab || null,
            producao_projetada_arroba_cab: catOrigem?.producao_projetada_arroba_cab || null,
            preco_entrada_reais_arroba: catOrigem?.preco_entrada_reais_arroba || null,
            faturamento_projetado_reais_lote_categoria: catOrigem?.faturamento_projetado_reais_lote_categoria || null,
            venda_total_arroba_lote_categoria: catOrigem?.venda_total_arroba_lote_categoria || null,
            agio_percent: catOrigem?.agio_percent || null,
            custo_frete_reais_cab: catOrigem?.custo_frete_reais_cab || null,
            custo_comissao_reais_cab: catOrigem?.custo_comissao_reais_cab || null,
            custo_sanidade_reais_cab: catOrigem?.custo_sanidade_reais_cab || null,
            custo_identificacao_rastreabilidade_reais_cab: catOrigem?.custo_identificacao_rastreabilidade_reais_cab || null,
            custo_total_entrada_reais_cab: catOrigem?.custo_total_entrada_reais_cab || null,
            custo_total_entrada_reais_lote: catOrigem?.custo_total_entrada_reais_lote || null,
            preco_entrada_reais_kg: catOrigem?.preco_entrada_reais_kg || null,
            preco_entrada_reais_cab: catOrigem?.preco_entrada_reais_cab || null,
            custo_operacional_reais_cab_dia: catOrigem?.custo_operacional_reais_cab_dia || null,
          }
        })

        const dadosLoteProposto = {
          nome: form.nomeNovoLote.trim(),
          pasto_id: isConfinamentoNL ? null : form.pastoIdNovoLote,
          curral_id: isConfinamentoNL ? form.curralIdNovoLote : null,
          sistema_producao: form.sistemaProducaoNovoLote,
          destino: form.destinoNovoLote,
        }

        const dadosMovimentacao = {
          data: form.data,
          usuario: usuario,
          motivo: 'Saída',
          subtipo: 'Novo Lote',
          observacao: form.observacao || null,
        }

        // Salvar no IndexedDB com syncStatus='pending'
        // O syncService fará o upload para solicitacoes_novo_lote
        const totalCabecasNL = categoriasParaMoverNL.reduce((sum: number, c: any) => sum + c.numeroCabecas, 0)
        const registroLocal = {
          id: generateId(),
          data: `${form.data} ${new Date().toTimeString().slice(0, 5)}`,
          loteOrigem: form.loteOrigem,
          loteOrigemId: form.loteOrigemId,
          loteDestino: form.nomeNovoLote.trim(),
          loteDestinoId: '',
          motivoMovimentacao: 'Saída',
          subtipo: 'Novo Lote',
          numeroCabecas: totalCabecasNL,
          categoria: categoriasParaMoverNL.map((c: any) => c.categoria).join(', '),
          usuario: usuario,
          responsavel: usuario,
          brinco: '',
          chip: '',
          observacao: form.observacao || '',
          equipe: form.equipe ? Number(form.equipe) : null,
          equipeNomes: form.equipeNomes,
          syncStatus: 'pending' as const,
          version: generateVersion(),
          lastModified: getCurrentTimestamp(),
          fotoBase64: fotoBase64 || null,
          // Campos extras para a solicitação de novo lote
          dadosLoteProposto,
          categoriasSnapshot,
          dadosMovimentacao,
        }

        try {
          await saveRegistroIDB('movimentacao', registroLocal as any)
          await enqueueRegistro('movimentacao', registroLocal.id, 'create')
          registerBackgroundSync('sync-registros').catch(() => {})
        } catch (err) {
          console.error('[MovimentacaoPage] Erro ao salvar solicitação de novo lote:', err)
          setErrors([{ field: 'general', message: 'Erro ao salvar solicitação. Tente novamente.' }])
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }

        setRegistroSalvo({
          tipo: 'novo_lote',
          data: `${form.data} ${new Date().toTimeString().slice(0, 5)}`,
          nomeNovoLote: form.nomeNovoLote.trim(),
          totalCabecas: totalCabecasNL,
          loteOrigem: form.loteOrigem,
          sistemaProducaoNovoLote: form.sistemaProducaoNovoLote,
          destinoNovoLote: form.destinoNovoLote,
          pastoNomeNovoLote: form.pastoNomeNovoLote,
          curralNomeNovoLote: form.curralNomeNovoLote,
          categoriasParaMover: categoriasParaMoverNL,
          observacao: form.observacao || '',
        })
        setShowSuccessModal(true)
        resetarTudo()
        return
      }

      // Coletar categorias com quantidade > 0
      const categoriasRaw = detalhesLoteOrigem?.categorias_raw || []
      const categoriasParaMover = categoriasRaw
        .map((cat: any) => ({
          categoria: cat.categoria,
          numeroCabecas: Number(form.cabecasPorCategoria[cat.categoria] || 0),
          maxCabecas: cat.quant_atual || 0,
        }))
        .filter((c: any) => c.numeroCabecas > 0)

      if (categoriasParaMover.length === 0) {
        setErrors([{ field: 'cabecasPorCategoria', message: 'Informe pelo menos uma quantidade de cabeças por categoria' }])
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      // Validar que nenhuma categoria excede o disponível
      const excedeDisponivel = categoriasParaMover.find((c: any) => c.numeroCabecas > c.maxCabecas)
      if (excedeDisponivel) {
        const msg = `Quantidade de ${excedeDisponivel.categoria} (${excedeDisponivel.numeroCabecas}) excede o disponível no lote (${excedeDisponivel.maxCabecas})`
        setErrors([{ field: `cabecas_${excedeDisponivel.categoria}`, message: msg }])
        scrollToFirstError([{ field: `cabecas_${excedeDisponivel.categoria}`, message: msg }])
        return
      }

      // Criar um registro de movimentação por categoria
      const resultados: { success: boolean; errors?: any[]; registro?: any }[] = []
      const salvos: string[] = []
      for (const c of categoriasParaMover) {
        const result = await salvarRegistro('movimentacao', {
          data: form.data,
          responsavel: usuario,
          usuario: usuario,
          loteOrigem: form.loteOrigem,
          loteOrigemId: form.loteOrigemId,
          loteDestino: destinoFinal,
          loteDestinoId: form.loteDestinoId,
          numeroCabecas: c.numeroCabecas,
          maxCabecasLote: c.maxCabecas,
          categoria: c.categoria,
          motivoMovimentacao: form.motivoMovimentacao,
          subtipo: form.subtipo || null,
          brinco: totalCabecas === 1 ? form.brinco : '',
          chip: totalCabecas === 1 ? form.chip : '',
          observacao: form.observacao,
          equipe: form.equipe ? Number(form.equipe) : null,
          equipeNomes: form.equipeNomes,
          fotoBase64: salvos.length === 0 ? fotoBase64 || null : null,
        })
        resultados.push(result)
        if (result.success && result.registro) {
          salvos.push(result.registro.id)
        } else if (!result.success && result.errors) {
          // Rollback: remover categorias ja persistidas para evitar duplicatas no reenvio
          for (const id of salvos) {
            await deleteRegistro('movimentacao', id)
            await removeFromSyncQueueByRegistroId(id)
          }
          break
        }
      }

      const falhou = resultados.find(r => !r.success)
      if (falhou && falhou.errors) {
        setErrors(falhou.errors)
        scrollToFirstError(falhou.errors)
      } else {
        const ultimoRegistro = resultados[resultados.length - 1]?.registro
        setRegistroSalvo(ultimoRegistro)
        setShowSuccessModal(true)
        resetarTudo()
      }
    } catch (error) {
      console.error('[MovimentacaoPage] Erro ao salvar:', error)
      setErrors([{ field: 'general', message: 'Erro ao salvar registro. Tente novamente.' }])
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSalvando(false)
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

  const disponivelTotal = ((detalhesLoteOrigem?.categorias_raw || []) as any[]).reduce(
    (acc, c) => acc + (c.quant_atual || 0),
    0
  )
  const destinoEhLote = !!form.loteDestino && lotesDisponiveis.includes(form.loteDestino)
  const ehTransferencia = form.motivoMovimentacao === 'Saída' && form.subtipo === 'Transferência'
  const categoriasLoteStr = detalhesLoteOrigem?.categorias
    ? processarCategorias(detalhesLoteOrigem.categorias).map(capitalizarCategoria).join(', ')
    : ''
  const categoriasRawLote = (detalhesLoteOrigem?.categorias_raw || []) as any[]

  const pendenciaTexto = (() => {
    if (!form.loteOrigem) return 'Falta escolher o pasto/lote'
    if (!form.motivoMovimentacao) return 'Falta escolher o motivo da movimentação'
    if (form.motivoMovimentacao === 'Saída' && !form.subtipo) return 'Falta escolher para onde foi'
    if (form.motivoMovimentacao === 'Entrada') return isValid ? undefined : 'Falta preencher as categorias da entrada'
    if (totalCabecas === 0) return 'Falta informar quantas cabeças'
    if (Number(form.equipe) > 0 && form.equipeNomes.some((n) => !n || !n.trim())) return 'Falta o nome de todas as pessoas da equipe'
    return undefined
  })()

  const rotuloCampo = 'text-[13px] font-bold uppercase text-gray-900'

  const lotesDestinoOpcoes = lotesDisponiveis.filter((l) => l !== form.loteOrigem)

  const campoLoteDestino = (label: string, placeholder: string) =>
    lotesDisponiveis.length > 0 ? (
      <SearchableModal
        label={label}
        value={form.loteDestino}
        onChange={(val) => setForm((p) => ({ ...p, loteDestino: val }))}
        error={getError('loteDestino')}
        options={lotesDestinoOpcoes}
        secondaryText={(lote) => lotesPastoMap[lote] || ''}
        placeholder={placeholder}
        id="loteDestino"
        name="loteDestino"
      />
    ) : (
      <Input label={label} placeholder="Carregando..." value={form.loteDestino} onChange={setInput('loteDestino')} error={getError('loteDestino')} disabled id="loteDestino" />
    )

  const mensagemErroCampo = (field: string) =>
    getError(field) ? <p className="text-base font-semibold text-red-700">{getError(field)}</p> : null

  return (
    <>
      <CadernetaLayout
        title="MOVIMENTAÇÃO"
        cadernetaId="movimentacao"
        dateContent={<DatePicker value={form.data} onChange={(val) => setForm((p) => ({ ...p, data: val }))} variant="header" compact inline />}
      >
        <BannerRascunho visible={rascunhoRestaurado} onConfirmar={confirmarRascunho} onDescartar={descartarRascunho} />
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Pasto/Lote */}
        <CadernetaSection titulo="Pasto/Lote" required>
          {lotesDisponiveis.length > 0 ? (
            <SearchableModal
              label=""
              value={form.loteOrigem}
              onChange={(val) => setForm((p) => ({ ...p, loteOrigem: val }))}
              error={getError('loteOrigem')}
              options={lotesDisponiveis}
              secondaryText={(lote) => lotesPastoMap[lote] || ''}
              placeholder="Selecione o pasto/lote..."
              id="loteOrigem"
              name="loteOrigem"
            />
          ) : (
            <Input label="PASTO/LOTE" placeholder="Carregando..." value={form.loteOrigem} onChange={setInput('loteOrigem')} error={getError('loteOrigem')} disabled id="loteOrigem" />
          )}
          {detalhesLoteOrigem && (
            <InfoCard
              icon={MapPin}
              title={form.loteOrigem}
              subtitle={lotesPastoMap[form.loteOrigem] || detalhesLoteOrigem.pastos?.nome || 'Sem pasto associado'}
              stats={[
                { label: 'Cabeças', value: String(detalhesLoteOrigem.n_cabecas ?? disponivelTotal) },
                {
                  label: 'PV médio',
                  value: detalhesLoteOrigem.peso_vivo_kg != null
                    ? `${Number(detalhesLoteOrigem.peso_vivo_kg).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`
                    : '-',
                },
                ...(categoriasLoteStr ? [{ label: 'Categorias', value: categoriasLoteStr, span: 2 }] : []),
              ]}
            />
          )}
        </CadernetaSection>

        {/* 1. Motivo da movimentação */}
        <CadernetaSection numero={1} titulo="Motivo da movimentação" required>
          <ChoiceGrid
            options={MOTIVOS.map((m) => ({ value: m.value, label: m.label, icon: m.icon }))}
            value={form.motivoMovimentacao}
            onChange={(val) => { setForm((p) => ({ ...p, motivoMovimentacao: val })); if (errors.length > 0) setErrors([]) }}
            cols={3}
            dataField="motivoMovimentacao"
          />
          {mensagemErroCampo('motivoMovimentacao')}

          {form.motivoMovimentacao === 'Doação' && (
            <InfoStrip tone="neutral" icon="🎁">Doação: as cabeças saem do lote, sem destino</InfoStrip>
          )}

          {form.motivoMovimentacao === 'Consumo' && (
            <InfoStrip tone="neutral" icon="🍖">Destino: Cantina</InfoStrip>
          )}

          {form.motivoMovimentacao === 'Abate' && (
            frigorificosDisponiveis.length > 0 ? (
              <SearchableModal
                label="SELECIONE O FRIGORÍFICO:"
                value={form.loteDestino}
                onChange={(val) => setForm((p) => ({ ...p, loteDestino: val }))}
                error={getError('loteDestino')}
                options={frigorificosDisponiveis}
                placeholder="Buscar frigorífico..."
                id="loteDestino"
                name="loteDestino"
              />
            ) : (
              <Input label="SELECIONE O FRIGORÍFICO:" placeholder="Carregando..." value={form.loteDestino} onChange={setInput('loteDestino')} error={getError('loteDestino')} disabled id="loteDestino" />
            )
          )}

          {form.motivoMovimentacao === 'Saída' && (
            <>
              <div className="flex flex-col gap-2">
                <label className={rotuloCampo}>Para onde foi? <span className="text-red-500">*</span></label>
                <ChoiceGrid
                  options={tipoSaidaOptions.map((o) => ({ value: o.value, label: o.label }))}
                  value={form.subtipo}
                  onChange={(val) => { setForm((p) => ({ ...p, subtipo: val, loteDestino: '' })); if (errors.length > 0) setErrors([]) }}
                  cols={3}
                  dataField="subtipo"
                />
                {mensagemErroCampo('subtipo')}
              </div>

              {(form.subtipo === 'Apartação' || form.subtipo === 'Refugo de Cocho') &&
                campoLoteDestino('SELECIONE O PASTO/LOTE:', 'Buscar pasto ou lote...')}

              {form.subtipo === 'Transferência' && (
                <>
                  {fazendasDoGrupo.length > 0 ? (
                    <SearchableModal
                      label="SELECIONE A FAZENDA DE DESTINO:"
                      value={form.fazendaDestinoNome}
                      onChange={(val) => {
                        const fazenda = fazendasDoGrupo.find((f) => f.nome === val)
                        setForm((p) => ({ ...p, fazendaDestinoNome: val, fazendaDestinoId: fazenda?.id || '' }))
                      }}
                      error={getError('fazendaDestinoId')}
                      options={fazendasDoGrupo.map((f) => f.nome)}
                      placeholder="Buscar fazenda..."
                      id="fazendaDestino"
                      name="fazendaDestino"
                    />
                  ) : (
                    <InfoStrip tone="warning" icon="⚠️">
                      Esta fazenda não pertence a nenhum grupo. A transferência entre fazendas requer que a fazenda atual faça parte de um grupo.
                    </InfoStrip>
                  )}
                  <InfoStrip tone="neutral" icon="ℹ️">
                    <strong>Transferência entre fazendas:</strong> o lote será criado na fazenda de destino com os mesmos dados cadastrais (peso, categoria, dados financeiros), sem plano nutricional. Se todas as cabeças forem transferidas, o lote origem será inativado.
                  </InfoStrip>
                </>
              )}

              {form.subtipo === 'Novo Lote' && (
                <>
                  <InfoStrip tone="warning" icon="⚠️">
                    <strong>Novo Lote:</strong> as cabeças serão movimentadas para um novo lote que será criado após aprovação do controller no Manej'Us. O lote origem será ajustado (parcial ou totalmente). A criação fica pendente até a aprovação.
                  </InfoStrip>
                  <Input
                    label="NOME DO NOVO LOTE"
                    placeholder=""
                    value={form.nomeNovoLote}
                    onChange={setInput('nomeNovoLote')}
                    error={getError('nomeNovoLote')}
                    id="nomeNovoLote"
                  />
                  <div className="flex flex-col gap-2">
                    <label className={rotuloCampo}>Sistema de produção <span className="text-red-500">*</span></label>
                    <ChoiceGrid
                      options={SISTEMA_PRODUCAO_OPTS}
                      value={form.sistemaProducaoNovoLote}
                      onChange={(val) => {
                        setForm((p) => ({ ...p, sistemaProducaoNovoLote: val, pastoIdNovoLote: '', pastoNomeNovoLote: '', curralIdNovoLote: '', curralNomeNovoLote: '' }))
                        if (errors.length > 0) setErrors([])
                      }}
                      cols={3}
                      labelSize="xs"
                      dataField="sistemaProducaoNovoLote"
                    />
                    {mensagemErroCampo('sistemaProducaoNovoLote')}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className={rotuloCampo}>Destino <span className="text-red-500">*</span></label>
                    <ChoiceGrid
                      options={DESTINO_OPTS}
                      value={form.destinoNovoLote}
                      onChange={(val) => { setForm((p) => ({ ...p, destinoNovoLote: val })); if (errors.length > 0) setErrors([]) }}
                      cols={3}
                      labelSize="xs"
                      dataField="destinoNovoLote"
                    />
                    {mensagemErroCampo('destinoNovoLote')}
                  </div>
                  {usaCurralSistema(form.sistemaProducaoNovoLote) ? (
                    curraisDisponiveis.length > 0 ? (
                      <SearchableModal
                        label="CURRAL"
                        value={form.curralNomeNovoLote}
                        onChange={(val) => {
                          const curral = curraisDisponiveis.find((c) => c.nome === val)
                          setForm((p) => ({ ...p, curralIdNovoLote: curral?.id || '', curralNomeNovoLote: val }))
                          if (errors.length > 0) setErrors([])
                        }}
                        error={getError('curralIdNovoLote')}
                        options={curraisDisponiveis.map((c) => c.nome)}
                        placeholder="Selecione o curral..."
                        id="curralIdNovoLote"
                        name="curralIdNovoLote"
                      />
                    ) : (
                      <InfoStrip tone="warning">Nenhum curral disponível.</InfoStrip>
                    )
                  ) : form.sistemaProducaoNovoLote ? (
                    pastosDisponiveis.length > 0 ? (
                      <SearchableModal
                        label="PASTO"
                        value={form.pastoNomeNovoLote}
                        onChange={(val) => {
                          const pasto = pastosDisponiveis.find((p) => p.nome === val)
                          setForm((p) => ({ ...p, pastoIdNovoLote: pasto?.id || '', pastoNomeNovoLote: val }))
                          if (errors.length > 0) setErrors([])
                        }}
                        error={getError('pastoIdNovoLote')}
                        options={pastosDisponiveis.map((p) => p.nome)}
                        placeholder="Selecione o pasto..."
                        id="pastoIdNovoLote"
                        name="pastoIdNovoLote"
                      />
                    ) : (
                      <InfoStrip tone="warning">Nenhum pasto disponível.</InfoStrip>
                    )
                  ) : null}
                </>
              )}
            </>
          )}

          {form.motivoMovimentacao === 'Entrada' && (
            <>
              <InfoStrip tone="neutral" icon="ℹ️">
                <strong>Entrada de animais:</strong> o lote selecionado no topo será o destino. Informe a data de entrada e as categorias que estão chegando.
              </InfoStrip>
              <DatePicker
                label="DATA DE ENTRADA"
                value={form.dataEntrada}
                onChange={(val) => setForm((p) => ({ ...p, dataEntrada: val }))}
                compact
              />
              {getCategoriasPorDestino(detalhesLoteOrigem?.destino).length > 0 ? (
                <>
                  {mensagemErroCampo('categoriasEntrada')}
                  {getCategoriasPorDestino(detalhesLoteOrigem?.destino).map((categoria) => {
                    const catExistente = categoriasRawLote.find((c: any) => c.categoria.toLowerCase() === categoria.toLowerCase())
                    const catState = form.categoriasEntrada[categoria] || {
                      selecionada: false, cabecas: '', pesoAtual: '', raca: '', sexo: '', idade: ''
                    }
                    const setCatState = (patch: Partial<typeof catState>) => {
                      setForm((p) => ({
                        ...p,
                        categoriasEntrada: { ...p.categoriasEntrada, [categoria]: { ...catState, ...patch } },
                      }))
                      if (errors.length > 0) setErrors([])
                    }
                    return (
                      <div
                        key={categoria}
                        className={`flex flex-col gap-3 rounded-xl border-2 p-3 transition-colors ${catState.selecionada ? 'border-brand-900 bg-brand-50/40' : 'border-gray-300 bg-white'}`}
                      >
                        <button
                          type="button"
                          onClick={() => setCatState({ selecionada: !catState.selecionada })}
                          className="flex !min-h-0 w-full cursor-pointer items-center justify-between gap-3 text-left"
                        >
                          <span className="flex flex-col">
                            <span className="text-[15px] font-extrabold text-gray-900">{categoria.toUpperCase()}</span>
                            {catExistente && (
                              <span className="text-xs font-semibold text-gray-500">
                                já existe: {catExistente.quant_atual || 0} cab, {catExistente.peso_vivo_atual_kg_cab || 0} kg
                              </span>
                            )}
                          </span>
                          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-sm font-black ${catState.selecionada ? 'border-brand-900 bg-brand-900 text-white' : 'border-gray-300 bg-white text-transparent'}`}>
                            ✓
                          </span>
                        </button>
                        {catState.selecionada && (
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-2">
                              <label className={rotuloCampo}>Quantidade de cabeças</label>
                              <StepperInput
                                value={catState.cabecas}
                                onChange={(val) => setCatState({ cabecas: val })}
                                min={0}
                                allowDecimals={false}
                                suffix="cabeças"
                                error={getError(`entrada_cabecas_${categoria}`)}
                              />
                            </div>
                            <Input
                              label="PESO MÉDIO ATUAL (kg)"
                              placeholder="Ex: 440"
                              value={catState.pesoAtual}
                              onChange={(e) => setCatState({ pesoAtual: e.target.value })}
                              error={getError(`entrada_peso_${categoria}`)}
                              inputMode="numeric"
                              type="number"
                              min="0"
                            />
                            {!catExistente && (
                              <>
                                {racasDisponiveis.length > 0 ? (
                                  <SearchableModal
                                    label="RAÇA"
                                    value={catState.raca}
                                    onChange={(val) => setCatState({ raca: val })}
                                    error={getError(`entrada_raca_${categoria}`)}
                                    options={racasDisponiveis.map((r) => r.nome)}
                                    placeholder="Selecione a raça..."
                                    id={`entrada_raca_${categoria}`}
                                    name={`entrada_raca_${categoria}`}
                                  />
                                ) : (
                                  <InfoStrip tone="warning">Nenhuma raça cadastrada.</InfoStrip>
                                )}
                                <div className="flex flex-col gap-2" data-field={`entrada_sexo_${categoria}`}>
                                  <label className={rotuloCampo}>Sexo</label>
                                  <ChoiceGrid
                                    options={[{ value: 'macho', label: 'Macho' }, { value: 'fêmea', label: 'Fêmea' }]}
                                    value={catState.sexo}
                                    onChange={(val) => setCatState({ sexo: val })}
                                    cols={2}
                                    size="sm"
                                  />
                                  {mensagemErroCampo(`entrada_sexo_${categoria}`)}
                                </div>
                                <Input
                                  label="IDADE (meses)"
                                  placeholder="Ex: 24"
                                  value={catState.idade}
                                  onChange={(e) => setCatState({ idade: e.target.value })}
                                  error={getError(`entrada_idade_${categoria}`)}
                                  inputMode="numeric"
                                  type="number"
                                  min="0"
                                />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </>
              ) : (
                <InfoStrip tone="warning" icon="⚠️">
                  {form.loteOrigem
                    ? 'Este lote não tem destino definido (corte, reprodução ou enfermaria). Defina o destino do lote no painel web para habilitar a entrada.'
                    : 'Selecione um lote para ver as categorias disponíveis.'}
                </InfoStrip>
              )}
            </>
          )}

          {form.motivoMovimentacao === 'Entrevero' && campoLoteDestino('SELECIONE UM DESTINO:', 'Buscar destino...')}
        </CadernetaSection>

        {/* 2. Quantificação (Entrada tem formulário próprio) */}
        {form.motivoMovimentacao !== 'Entrada' && (
          <CadernetaSection numero={2} titulo="Quantificação">
            {categoriasRawLote.length > 0 ? (
              <>
                {mensagemErroCampo('cabecasPorCategoria')}
                {categoriasRawLote.map((cat: any) => (
                  <div key={cat.categoria} className="flex flex-col gap-2" data-field={`cabecas_${cat.categoria}`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <label className={rotuloCampo}>
                        {categoriasRawLote.length > 1 ? cat.categoria : 'Quantos saíram?'} <span className="text-red-500">*</span>
                      </label>
                      <span className="text-sm font-semibold text-gray-500">disp.: {cat.quant_atual || 0} cab.</span>
                    </div>
                    <StepperInput
                      value={form.cabecasPorCategoria[cat.categoria] || ''}
                      onChange={(val) => setCabecasCategoria(cat.categoria, val)}
                      min={0}
                      max={cat.quant_atual || 0}
                      allowDecimals={false}
                      suffix="cabeças"
                      error={getError(`cabecas_${cat.categoria}`)}
                    />
                  </div>
                ))}
                {categoriasRawLote.length > 1 && totalCabecas > 0 && (
                  <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                    <span className="text-sm font-bold text-gray-600">TOTAL A MOVIMENTAR</span>
                    <span className="text-xl font-extrabold text-gray-900">{totalCabecas} cabeças</span>
                  </div>
                )}
                {totalCabecas > 0 && (
                  <InfoStrip tone="success" icon="✅">
                    {form.loteOrigem} fica com {Math.max(0, disponivelTotal - totalCabecas)}
                    {destinoEhLote
                      ? ` · ${form.loteDestino} recebe +${totalCabecas}`
                      : ` · saem ${totalCabecas}`}
                  </InfoStrip>
                )}
              </>
            ) : (
              <InfoStrip tone="neutral">
                {form.loteOrigem ? 'Nenhuma categoria encontrada neste lote.' : 'Selecione um lote para ver as categorias disponíveis.'}
              </InfoStrip>
            )}
          </CadernetaSection>
        )}

        {/* Equipe e registro */}
        <CadernetaSection numero={form.motivoMovimentacao === 'Entrada' ? 2 : 3} titulo="Equipe e registro">
          <div className="flex flex-col gap-2">
            <label className={rotuloCampo}>Nº pessoas no manejo (opcional)</label>
            <ChoiceGrid options={ESCALA_EQUIPE} value={form.equipe} onChange={handleEquipe} cols={6} size="sm" dataField="equipe" />
          </div>

          {Number(form.equipe) > 0 && (
            <div className="flex flex-col gap-3">
              {mensagemErroCampo('equipeNomes')}
              {Array.from({ length: Number(form.equipe) }).map((_, index) =>
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
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className={rotuloCampo}>{ehTransferencia ? 'Recado (opcional)' : 'Foto ou recado (opcional)'}</label>
            {!ehTransferencia && fotoBase64 && (
              <div className="flex flex-col gap-3">
                <img src={base64ToDataUrl(fotoBase64)} alt="Foto da movimentação" className="mx-auto w-full max-w-sm rounded-xl border border-gray-200" />
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
              {!ehTransferencia && !fotoBase64 && (
                <button
                  type="button"
                  onClick={capturarFoto}
                  disabled={capturandoFoto}
                  className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-brand-900 px-3 py-2.5 text-white transition-colors hover:bg-brand-800 active:scale-[0.99] disabled:opacity-60"
                >
                  <span className="text-lg leading-none">📷</span>
                  <span className="text-sm font-extrabold uppercase tracking-wide">{capturandoFoto ? 'Capturando...' : 'Tirar foto'}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleFalar}
                className={`flex min-h-[56px] items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-white transition-colors active:scale-[0.99] ${
                  ehTransferencia || fotoBase64 ? 'col-span-2' : ''
                } ${ouvindoVoz ? 'animate-pulse bg-red-600' : 'bg-gray-600 hover:bg-gray-700'}`}
              >
                <span className="text-lg leading-none">🎤</span>
                <span className="text-sm font-extrabold uppercase tracking-wide">{ouvindoVoz ? 'Ouvindo...' : 'Gravar áudio'}</span>
              </button>
            </div>
            {fotoErro && <InfoStrip tone="danger">{fotoErro}</InfoStrip>}
            {vozErro && <InfoStrip tone="danger">{vozErro}</InfoStrip>}
            <Input
              placeholder="Observação (opcional)"
              value={form.observacao}
              onChange={setInput('observacao')}
            />
            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        </CadernetaSection>

        <FormFooter
          onSalvar={handleSalvar}
          onLimpar={resetarTudo}
          salvando={salvando}
          disabled={!isValid}
          formValido={isValid}
          pendenciaTexto={pendenciaTexto}
        />
      </CadernetaLayout>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName={registroSalvo?.tipo === 'transferencia' ? 'Transferência' : registroSalvo?.tipo === 'novo_lote' ? 'Novo Lote' : 'Movimentação'}
        registro={registroSalvo}
        caderneta={registroSalvo?.tipo === 'transferencia' ? undefined : registroSalvo?.tipo === 'novo_lote' ? 'novo_lote' : 'movimentacao'}
      />
    </>
  )
}

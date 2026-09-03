import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, Radio, ValidationMessage, SearchableModal } from '../../components/ui'
import { Brush, Save } from 'lucide-react'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { saveRegistro as saveRegistroIDB } from '../../services/indexedDB'
import { enqueueRegistro } from '../../services/syncService'
import { registerBackgroundSync } from '../../serviceWorkerRegistration'
import { generateId, generateVersion, getCurrentTimestamp } from '../../utils/generateId'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import CadernetaHeader from '../../components/CadernetaHeader'
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
import LoteDetalhesCard from '../../components/LoteDetalhesCard'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { useFormValidation } from '../../hooks/useFormValidation'

const MOTIVOS = [
  { value: 'Consumo', label: 'CONSUMO', icon: '🍖' },
  { value: 'Saída', label: 'SAÍDA', icon: '📤' },
  { value: 'Entrada', label: 'ENTRADA', icon: '📥' },
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

// "Novo Lote" disponível apenas para a Fazenda Marcon
const FAZENDA_NOVO_LOTE_HABILITADO = 'c4d13f1f-a785-4bcd-8e72-4ac4b28ee034'

const SISTEMA_PRODUCAO_OPTS = [
  { value: 'Cria', label: 'Cria' },
  { value: 'Confinamento', label: 'Confinamento' },
  { value: 'Engorda', label: 'Engorda' },
  { value: 'Recria', label: 'Recria' },
  { value: 'RIP', label: 'RIP' },
  { value: 'Sequestro', label: 'Sequestro' },
  { value: 'TIP', label: 'TIP' },
]

const DESTINO_OPTS = [
  { value: 'corte', label: 'Abate' },
  { value: 'reprodução', label: 'Reprodução' },
  { value: 'enfermaria', label: 'Enfermaria' },
]

// Categorias disponíveis para Entrada conforme destino do lote
const CATEGORIAS_ABATE = ['Bezerro', 'Bezerra', 'Garrote', 'Novilha', 'Boi Magro', 'Boi Gordo', 'Vaca']
const CATEGORIAS_REPRODUCAO = ['Bezerro', 'Bezerra', 'Garrote', 'Novilha', 'Tourinho', 'Touro', 'Vaca']
const CATEGORIAS_ENFERMARIA = [...new Set([...CATEGORIAS_ABATE, ...CATEGORIAS_REPRODUCAO])]

function getCategoriasPorDestino(destino: string | null | undefined): string[] {
  if (!destino) return []
  const d = destino.toLowerCase()
  if (d === 'corte') return CATEGORIAS_ABATE
  if (d === 'reprodução' || d === 'reproducao') return CATEGORIAS_REPRODUCAO
  if (d === 'enfermaria') return CATEGORIAS_ENFERMARIA
  return []
}

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
  loteOrigem: string
  loteOrigemId: string
  loteDestino: string
  loteDestinoId: string
  cabecasPorCategoria: Record<string, string>
  motivoMovimentacao: string
  subtipo: string // Enfermaria, Apartação, Refugo de Cocho, Compras, Transferência
  brinco: string
  chip: string
  causaObservacao: string
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
  causaObservacao: '',
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
})

export default function MovimentacaoPage() {
  const navigate = useNavigate()
  const { usuario, fazendaId } = useSelector((state: RootState) => state.config)
  const tipoSaidaOptions = fazendaId === FAZENDA_NOVO_LOTE_HABILITADO
    ? TIPO_SAIDA_BASE
    : TIPO_SAIDA_BASE.filter(o => o.value !== 'Novo Lote')
  const [form, setForm] = useState<FormState>(makeInitial)
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

  // loteOrigem obrigatório exceto Doação
  if (form.motivoMovimentacao !== 'Doação') {
    validationRules.loteOrigem = { required: true }
  }

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
    if (form.sistemaProducaoNovoLote === 'Confinamento') {
      validationRules.curralIdNovoLote = { required: true }
    } else if (form.sistemaProducaoNovoLote) {
      validationRules.pastoIdNovoLote = { required: true }
    }
  }

  // Cabeças por categoria: pelo menos uma > 0 (exceto Doação e Entrada, que tem validação própria)
  if (form.motivoMovimentacao !== 'Doação' && form.motivoMovimentacao !== 'Entrada' && form.loteOrigem) {
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
          // Armazenar o ID do lote origem
          setForm(prev => ({ ...prev, loteOrigemId: lote.id }))
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

      // Pré-validação: lote origem é obrigatório (exceto Doação)
      if (form.motivoMovimentacao !== 'Doação' && !form.loteOrigem) {
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

      // Validar que destino não está vazio (exceto Transferência, Novo Lote e Entrada, que têm fluxo próprio)
      if (!(form.motivoMovimentacao === 'Saída' && (form.subtipo === 'Transferência' || form.subtipo === 'Novo Lote')) && form.motivoMovimentacao !== 'Entrada') {
        if (!destinoFinal || destinoFinal.trim() === '') {
          setErrors([{ field: 'loteDestino', message: 'Selecione o destino da movimentação' }])
          window.scrollTo({ top: 0, behavior: 'smooth' })
          return
        }
      }

      // Caso especial: Doação não exige lote nem cabeças
      if (form.motivoMovimentacao === 'Doação') {
        const result = await salvarRegistro('movimentacao', {
          data: form.data,
          responsavel: usuario,
          usuario: usuario,
          loteOrigem: form.loteOrigem,
          loteOrigemId: form.loteOrigemId,
          loteDestino: destinoFinal,
          loteDestinoId: form.loteDestinoId,
          numeroCabecas: 0,
          maxCabecasLote: null,
          categoria: null,
          motivoMovimentacao: form.motivoMovimentacao,
          subtipo: form.subtipo || null,
          brinco: form.brinco,
          chip: form.chip,
          causaObservacao: form.causaObservacao,
        })

        if (!result.success && result.errors) {
          setErrors(result.errors)
          scrollToFirstError(result.errors)
        } else {
          setRegistroSalvo(result.registro)
          setShowSuccessModal(true)
          setForm(makeInitial())
        }
        return
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
            causaObservacao: form.causaObservacao,
            pesoVivoAtualKg: c.pesoAtual,
            raca: c.existeNoLote ? null : c.raca,
            sexo: c.existeNoLote ? null : c.sexo,
            idade: c.existeNoLote ? null : c.idade,
          })
          resultadosEntrada.push(result)
          if (!result.success && result.errors) break
        }

        const falhouEntrada = resultadosEntrada.find(r => !r.success)
        if (falhouEntrada && falhouEntrada.errors) {
          setErrors(falhouEntrada.errors)
          scrollToFirstError(falhouEntrada.errors)
        } else {
          const ultimoRegistroEntrada = resultadosEntrada[resultadosEntrada.length - 1]?.registro
          setRegistroSalvo(ultimoRegistroEntrada)
          setShowSuccessModal(true)
          setForm(makeInitial())
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
              causaObservacao: `Transferência para ${result.fazenda_destino_nome}. Lote criado: ${result.lote_destino_nome}.`,
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
          setForm(makeInitial())
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
        const isConfinamentoNL = form.sistemaProducaoNovoLote === 'Confinamento'
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
            qtd_bezerros: catOrigem?.qtd_bezerros || null,
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
          causa_observacao: form.causaObservacao || null,
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
          causaObservacao: form.causaObservacao || '',
          syncStatus: 'pending' as const,
          version: generateVersion(),
          lastModified: getCurrentTimestamp(),
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
          nomeNovoLote: form.nomeNovoLote.trim(),
          totalCabecas: totalCabecasNL,
        })
        setShowSuccessModal(true)
        setForm(makeInitial())
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
          causaObservacao: form.causaObservacao,
        })
        resultados.push(result)
        if (!result.success && result.errors) break
      }

      const falhou = resultados.find(r => !r.success)
      if (falhou && falhou.errors) {
        setErrors(falhou.errors)
        scrollToFirstError(falhou.errors)
      } else {
        const ultimoRegistro = resultados[resultados.length - 1]?.registro
        setRegistroSalvo(ultimoRegistro)
        setShowSuccessModal(true)
        setForm(makeInitial())
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

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <CadernetaHeader
        title="MOVIMENTAÇÃO"
        cadernetaId="movimentacao"
        dateContent={<DatePicker value={form.data} onChange={(val) => setForm((p) => ({ ...p, data: val }))} variant="header" compact inline />}
      />

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8 desktop-form-container">
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: Dados Principais */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          {lotesDisponiveis.length > 0 ? (
            <SearchableModal
              label="PASTO/LOTE"
              value={form.loteOrigem}
              onChange={(val) => setForm((p) => ({ ...p, loteOrigem: val }))}
              error={getError('loteOrigem')}
              options={lotesDisponiveis}
              secondaryText={(lote) => lotesPastoMap[lote] || ''}
              placeholder="Buscar pasto ou lote..."
              id="loteOrigem"
              name="loteOrigem"
            />
          ) : (
            <Input
              label="PASTO/LOTE"
              placeholder="Carregando..."
              value={form.loteOrigem}
              onChange={setInput('loteOrigem')}
              error={getError('loteOrigem')}
              inputMode="numeric"
              disabled
              id="loteOrigem"
            />
          )}
          {detalhesLoteOrigem && (
            <LoteDetalhesCard detalhes={detalhesLoteOrigem} processarCategorias={processarCategorias} />
          )}
        </div>

        {/* Seção 2: Motivo da Movimentação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. MOTIVO DA MOVIMENTAÇÃO</h2>
          <Radio
            name="motivoMovimentacao"
            options={MOTIVOS}
            value={form.motivoMovimentacao}
            onChange={(val) => { setForm((p) => ({ ...p, motivoMovimentacao: val })); if (errors.length > 0) setErrors([]) }}
            error={getError('motivoMovimentacao')}
            gridCols={2}
          />
          {form.motivoMovimentacao ? (
            <>
              {form.motivoMovimentacao === 'Consumo' ? (
                <>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-lg font-bold text-gray-900">DESTINO: CANTINA</p>
                  </div>
                  <Input
                    label="CAUSA / OBSERVAÇÃO:"
                    placeholder=""
                    value={form.causaObservacao}
                    onChange={setInput('causaObservacao')}
                  />
                </>
              ) : form.motivoMovimentacao === 'Abate' ? (
                <>
                  {frigorificosDisponiveis.length > 0 ? (
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
                    <Input
                      label="SELECIONE O FRIGORÍFICO:"
                      placeholder="Carregando..."
                      value={form.loteDestino}
                      onChange={setInput('loteDestino')}
                      error={getError('loteDestino')}
                      disabled
                      id="loteDestino"
                    />
                  )}
                  <Input
                    label="CAUSA / OBSERVAÇÃO:"
                    placeholder=""
                    value={form.causaObservacao}
                    onChange={setInput('causaObservacao')}
                  />
                </>
              ) : form.motivoMovimentacao === 'Saída' ? (
                <>
                  <Radio
                    name="subtipo"
                    options={tipoSaidaOptions}
                    value={form.subtipo}
                    onChange={(val) => { setForm((p) => ({ ...p, subtipo: val, loteDestino: '' })); if (errors.length > 0) setErrors([]) }}
                    error={getError('subtipo')}
                    direction="vertical"
                  />
                  {form.subtipo === 'Apartação' || form.subtipo === 'Refugo de Cocho' ? (
                    <>
                      {lotesDisponiveis.length > 0 ? (
                        <SearchableModal
                          label="SELECIONE O PASTO/LOTE:"
                          value={form.loteDestino}
                          onChange={(val) => setForm((p) => ({ ...p, loteDestino: val }))}
                          error={getError('loteDestino')}
                          options={lotesDisponiveis.filter(l => l !== form.loteOrigem)}
                          secondaryText={(lote) => lotesPastoMap[lote] || ''}
                          placeholder="Buscar pasto ou lote..."
                          id="loteDestino"
                          name="loteDestino"
                        />
                      ) : (
                        <Input
                          label="SELECIONE O LOTE:"
                          placeholder="Carregando..."
                          value={form.loteDestino}
                          onChange={setInput('loteDestino')}
                          error={getError('loteDestino')}
                          disabled
                          id="loteDestino"
                        />
                      )}
                      <Input
                        label="CAUSA / OBSERVAÇÃO:"
                        placeholder=""
                        value={form.causaObservacao}
                        onChange={setInput('causaObservacao')}
                      />
                    </>
                  ) : form.subtipo === 'Transferência' ? (
                    <>
                      {fazendasDoGrupo.length > 0 ? (
                        <SearchableModal
                          label="SELECIONE A FAZENDA DE DESTINO:"
                          value={form.fazendaDestinoNome}
                          onChange={(val) => {
                            const fazenda = fazendasDoGrupo.find(f => f.nome === val)
                            setForm((p) => ({ ...p, fazendaDestinoNome: val, fazendaDestinoId: fazenda?.id || '' }))
                          }}
                          error={getError('fazendaDestinoId')}
                          options={fazendasDoGrupo.map(f => f.nome)}
                          placeholder="Buscar fazenda..."
                          id="fazendaDestino"
                          name="fazendaDestino"
                        />
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          Esta fazenda não pertence a nenhum grupo. A transferência entre fazendas requer que a fazenda atual faça parte de um grupo.
                        </p>
                      )}
                      <div className="p-4 bg-blue-50 rounded-xl">
                        <p className="text-sm text-blue-900">
                          <strong>Transferência entre fazendas:</strong> o lote será criado na fazenda de destino com os mesmos dados cadastrais (peso, categoria, dados financeiros), sem plano nutricional. Se todas as cabeças forem transferidas, o lote origem será inativado.
                        </p>
                      </div>
                    </>
                  ) : form.subtipo === 'Novo Lote' ? (
                    <>
                      <div className="p-4 bg-amber-50 rounded-xl">
                        <p className="text-sm text-amber-900">
                          <strong>Novo Lote:</strong> as cabeças serão movimentadas para um novo lote que será criado após aprovação do controller no Manej'Us. O lote origem será ajustado (parcial ou totalmente). A criação fica pendente até a aprovação.
                        </p>
                      </div>
                      <Input
                        label="NOME DO NOVO LOTE"
                        placeholder=""
                        value={form.nomeNovoLote}
                        onChange={setInput('nomeNovoLote')}
                        error={getError('nomeNovoLote')}
                        id="nomeNovoLote"
                      />
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          SISTEMA DE PRODUÇÃO
                        </label>
                        <select
                          value={form.sistemaProducaoNovoLote}
                          onChange={(e) => { setForm((p) => ({ ...p, sistemaProducaoNovoLote: e.target.value, pastoIdNovoLote: '', pastoNomeNovoLote: '', curralIdNovoLote: '', curralNomeNovoLote: '' })); if (errors.length > 0) setErrors([]) }}
                          className="w-full px-3 py-3 min-h-[44px] border border-gray-200 rounded-xl focus:outline-none focus:border-accent text-base"
                        >
                          <option value="">Selecione</option>
                          {SISTEMA_PRODUCAO_OPTS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        {getError('sistemaProducaoNovoLote') && (
                          <p className="text-sm font-semibold text-red-700 mt-1">{getError('sistemaProducaoNovoLote')}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">
                          DESTINO
                        </label>
                        <select
                          value={form.destinoNovoLote}
                          onChange={(e) => { setForm((p) => ({ ...p, destinoNovoLote: e.target.value })); if (errors.length > 0) setErrors([]) }}
                          className="w-full px-3 py-3 min-h-[44px] border border-gray-200 rounded-xl focus:outline-none focus:border-accent text-base"
                        >
                          <option value="">Selecione</option>
                          {DESTINO_OPTS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        {getError('destinoNovoLote') && (
                          <p className="text-sm font-semibold text-red-700 mt-1">{getError('destinoNovoLote')}</p>
                        )}
                      </div>
                      {form.sistemaProducaoNovoLote === 'Confinamento' ? (
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            CURRAL
                          </label>
                          {curraisDisponiveis.length > 0 ? (
                            <select
                              value={form.curralIdNovoLote}
                              onChange={(e) => {
                                const curral = curraisDisponiveis.find(c => c.id === e.target.value)
                                setForm((p) => ({ ...p, curralIdNovoLote: e.target.value, curralNomeNovoLote: curral?.nome || '' }))
                                if (errors.length > 0) setErrors([])
                              }}
                              className="w-full px-3 py-3 min-h-[44px] border border-gray-200 rounded-xl focus:outline-none focus:border-accent text-base"
                            >
                              <option value="">Selecione</option>
                              {curraisDisponiveis.map(c => (
                                <option key={c.id} value={c.id}>{c.nome}</option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-sm text-gray-500 italic">Nenhum curral disponível.</p>
                          )}
                          {getError('curralIdNovoLote') && (
                            <p className="text-sm font-semibold text-red-700 mt-1">{getError('curralIdNovoLote')}</p>
                          )}
                        </div>
                      ) : form.sistemaProducaoNovoLote ? (
                        <div>
                          <label className="block text-sm font-bold text-gray-900 mb-2">
                            PASTO
                          </label>
                          {pastosDisponiveis.length > 0 ? (
                            <select
                              value={form.pastoIdNovoLote}
                              onChange={(e) => {
                                const pasto = pastosDisponiveis.find(p => p.id === e.target.value)
                                setForm((p) => ({ ...p, pastoIdNovoLote: e.target.value, pastoNomeNovoLote: pasto?.nome || '' }))
                                if (errors.length > 0) setErrors([])
                              }}
                              className="w-full px-3 py-3 min-h-[44px] border border-gray-200 rounded-xl focus:outline-none focus:border-accent text-base"
                            >
                              <option value="">Selecione</option>
                              {pastosDisponiveis.map(p => (
                                <option key={p.id} value={p.id}>{p.nome}</option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-sm text-gray-500 italic">Nenhum pasto disponível.</p>
                          )}
                          {getError('pastoIdNovoLote') && (
                            <p className="text-sm font-semibold text-red-700 mt-1">{getError('pastoIdNovoLote')}</p>
                          )}
                        </div>
                      ) : null}
                      <Input
                        label="CAUSA / OBSERVAÇÃO:"
                        placeholder=""
                        value={form.causaObservacao}
                        onChange={setInput('causaObservacao')}
                      />
                    </>
                  ) : null}
                </>
              ) : form.motivoMovimentacao === 'Entrada' ? (
                <>
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <p className="text-sm text-blue-900">
                      <strong>Entrada de animais:</strong> o lote selecionado no topo será o destino. Informe a data de entrada e as categorias que estão chegando.
                    </p>
                  </div>
                  <DatePicker
                    label="DATA DE ENTRADA"
                    value={form.dataEntrada}
                    onChange={(val) => setForm((p) => ({ ...p, dataEntrada: val }))}
                    compact
                  />
                  {getCategoriasPorDestino(detalhesLoteOrigem?.destino).length > 0 ? (
                    <>
                      {getCategoriasPorDestino(detalhesLoteOrigem?.destino).map((categoria) => {
                        const catExistente = detalhesLoteOrigem?.categorias_raw?.find(
                          (c: any) => c.categoria.toLowerCase() === categoria.toLowerCase()
                        )
                        const catState = form.categoriasEntrada[categoria] || {
                          selecionada: false, cabecas: '', pesoAtual: '', raca: '', sexo: '', idade: ''
                        }
                        const setCatState = (patch: Partial<typeof catState>) => {
                          setForm((p) => ({
                            ...p,
                            categoriasEntrada: {
                              ...p.categoriasEntrada,
                              [categoria]: { ...catState, ...patch },
                            },
                          }))
                          if (errors.length > 0) setErrors([])
                        }
                        return (
                          <div key={categoria} className="flex flex-col gap-2 border border-gray-200 rounded-xl p-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={catState.selecionada}
                                onChange={(e) => setCatState({ selecionada: e.target.checked })}
                                className="w-5 h-5 accent-green-600"
                              />
                              <span className="text-base font-bold text-gray-900">{categoria.toUpperCase()}</span>
                              {catExistente && (
                                <span className="text-sm text-gray-500">
                                  (já existe: {catExistente.quant_atual || 0} cab, {catExistente.peso_vivo_atual_kg_cab || 0} kg)
                                </span>
                              )}
                            </label>
                            {catState.selecionada && (
                              <div className="flex flex-col gap-3 pl-8">
                                <Input
                                  label="QUANTIDADE DE CABEÇAS"
                                  placeholder="Ex: 30"
                                  value={catState.cabecas}
                                  onChange={(e) => setCatState({ cabecas: e.target.value })}
                                  error={getError(`entrada_cabecas_${categoria}`)}
                                  inputMode="numeric"
                                  type="number"
                                  min="0"
                                />
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
                                    <div>
                                      <label className="block text-lg font-bold text-gray-900 mb-2">RAÇA</label>
                                      <select
                                        value={catState.raca}
                                        onChange={(e) => setCatState({ raca: e.target.value })}
                                        className={`w-full px-3 py-3 min-h-[44px] border rounded-xl focus:outline-none focus:border-accent text-base ${getError(`entrada_raca_${categoria}`) ? 'border-red-500' : 'border-gray-200'}`}
                                      >
                                        <option value="">Selecione</option>
                                        {racasDisponiveis.map((r) => (
                                          <option key={r.id} value={r.nome}>{r.nome}</option>
                                        ))}
                                      </select>
                                      {getError(`entrada_raca_${categoria}`) && (
                                        <p className="mt-1 text-sm font-semibold text-red-600">{getError(`entrada_raca_${categoria}`)}</p>
                                      )}
                                    </div>
                                    <div>
                                      <label className="block text-lg font-bold text-gray-900 mb-2">SEXO</label>
                                      <select
                                        value={catState.sexo}
                                        onChange={(e) => setCatState({ sexo: e.target.value })}
                                        className={`w-full px-3 py-3 min-h-[44px] border rounded-xl focus:outline-none focus:border-accent text-base ${getError(`entrada_sexo_${categoria}`) ? 'border-red-500' : 'border-gray-200'}`}
                                      >
                                        <option value="">Selecione</option>
                                        <option value="macho">Macho</option>
                                        <option value="fêmea">Fêmea</option>
                                      </select>
                                      {getError(`entrada_sexo_${categoria}`) && (
                                        <p className="mt-1 text-sm font-semibold text-red-600">{getError(`entrada_sexo_${categoria}`)}</p>
                                      )}
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
                      <Input
                        label="CAUSA / OBSERVAÇÃO:"
                        placeholder="Descreva detalhes da entrada (opcional)"
                        value={form.causaObservacao}
                        onChange={setInput('causaObservacao')}
                      />
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      {form.loteOrigem
                        ? 'Este lote não tem destino definido (corte, reprodução ou enfermaria). Defina o destino do lote no painel web para habilitar a entrada.'
                        : 'Selecione um lote para ver as categorias disponíveis.'}
                    </p>
                  )}
                </>
              ) : form.motivoMovimentacao === 'Entrevero' ? (
                <>
                  {lotesDisponiveis.length > 0 ? (
                    <SearchableModal
                      label="SELECIONE UM DESTINO:"
                      value={form.loteDestino}
                      onChange={(val) => setForm((p) => ({ ...p, loteDestino: val }))}
                      error={getError('loteDestino')}
                      options={lotesDisponiveis.filter(l => l !== form.loteOrigem)}
                      secondaryText={(lote) => lotesPastoMap[lote] || ''}
                      placeholder="Buscar destino..."
                    />
                  ) : (
                    <Input
                      label="SELECIONE UM DESTINO:"
                      placeholder="Carregando..."
                      value={form.loteDestino}
                      onChange={setInput('loteDestino')}
                      error={getError('loteDestino')}
                      disabled
                    />
                  )}
                  <Input
                    label="CAUSA / OBSERVAÇÃO:"
                    placeholder=""
                    value={form.causaObservacao}
                    onChange={setInput('causaObservacao')}
                  />
                </>
              ) : form.motivoMovimentacao === 'Doação' ? (
                <>
                  <Input
                    label="OBSERVAÇÃO:"
                    placeholder=""
                    value={form.causaObservacao}
                    onChange={setInput('causaObservacao')}
                  />
                </>
              ) : null}
            </>
          ) : (
            <div>
              <p className="text-lg font-bold text-gray-900 mb-2">SELECIONE UM DESTINO:</p>
              <p className="text-sm text-gray-500 italic">Escolha uma das opções acima primeiro...</p>
            </div>
          )}
        </div>

        {/* Seção 3: Quantificação (oculta para Entrada, que tem formulário próprio) */}
        {form.motivoMovimentacao !== 'Entrada' && (
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. QUANTIFICAÇÃO</h2>
          {detalhesLoteOrigem?.categorias_raw && detalhesLoteOrigem.categorias_raw.length > 0 ? (
            <>
              {getError('cabecasPorCategoria') && (
                <p className="text-base font-semibold text-red-700">⚠️ {getError('cabecasPorCategoria')}</p>
              )}
              {detalhesLoteOrigem.categorias_raw.map((cat: any) => (
                <div key={cat.categoria} className="flex flex-col gap-1">
                  <Input
                    label={`${cat.categoria.toUpperCase()} (Disp.: ${cat.quant_atual || 0})`}
                    placeholder="Ex: 25"
                    value={form.cabecasPorCategoria[cat.categoria] || ''}
                    onChange={(e) => setCabecasCategoria(cat.categoria, e.target.value)}
                    error={getError(`cabecas_${cat.categoria}`)}
                    inputMode="numeric"
                    type="number"
                    min="0"
                    max={String(cat.quant_atual || 0)}
                  />
                </div>
              ))}
              {totalCabecas > 0 && (
                <p className="text-sm text-gray-500">
                  Total a movimentar: {totalCabecas} cabeças
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 italic">
              {form.loteOrigem ? 'Nenhuma categoria encontrada neste lote.' : 'Selecione um lote para ver as categorias disponíveis.'}
            </p>
          )}
        </div>
        )}

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
            onClick={() => setForm(makeInitial())}
            className="w-full !min-h-0 rounded-2xl border-2 border-gray-300 bg-gray-200 px-3 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-300 active:scale-95"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Brush className="h-4 w-4" strokeWidth={2.5} />
              LIMPAR
            </span>
          </button>
          {!isValid && (
            <p className="text-base text-gray-600 text-center">
              <span className="text-red-500">*</span> Preencha todos os campos obrigatórios para salvar
            </p>
          )}
        </div>
      </main>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName={registroSalvo?.tipo === 'transferencia' ? 'Transferência' : registroSalvo?.tipo === 'novo_lote' ? 'Novo Lote' : 'Movimentação'}
        registro={registroSalvo}
        caderneta={registroSalvo?.tipo === 'transferencia' || registroSalvo?.tipo === 'novo_lote' ? undefined : 'movimentacao'}
      />
    </div>
  )
}

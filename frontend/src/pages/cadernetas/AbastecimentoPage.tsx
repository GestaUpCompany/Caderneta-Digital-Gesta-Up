import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, ValidationMessage } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import ChoiceGrid from '../../components/cadernetas/ChoiceGrid'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import StepperInput from '../../components/cadernetas/StepperInput'
import FormFooter from '../../components/cadernetas/FormFooter'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { redeInstavelRecentemente, registrarRespostaDeRede } from '../../utils/fetchComTimeout'
import { normalizarNumeroString } from '../../utils/formatNumber'
import { scrollToFirstError } from '../../utils/scrollToError'
import {
  getCachedCadastroData,
  getMaquinasVeiculosCached,
  getMaquinasVeiculosFromCacheOnly,
  getTanquesCombustivelCached,
  getTanquesCombustivelFromCacheOnly,
  updateTanqueSaldoCache,
  withTimeout,
} from '../../services/cadastroCache'
import { getAllRegistros } from '../../services/indexedDB'
import { getFuncionarios, getUltimaLeituraBomba } from '../../services/supabaseService'
import { RootState } from '../../store/store'
import { useFormValidation } from '../../hooks/useFormValidation'
import { User } from 'lucide-react'

const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const COMBUSTIVEL_OPTIONS = [
  { value: 'Álcool', label: 'ÁLCOOL', icon: '🔵' },
  { value: 'Gasolina', label: 'GASOLINA', icon: '🔴' },
  { value: 'Diesel S10', label: 'DIESEL S10', icon: '🟢' },
  { value: 'Diesel Comum', label: 'DIESEL COMUM', icon: '⚫' },
]

const OPERACAO_OPTIONS = [
  { value: 'Nutrição', label: 'NUTRIÇÃO', icon: '🥣' },
  { value: 'Pulverização', label: 'PULVER.', icon: '💧' },
  { value: 'Gradagem', label: 'GRADAGEM', icon: '🚜' },
  { value: 'Fertilização/Correção', label: 'FERT.', icon: '🪨' },
  { value: 'Limpeza', label: 'LIMP.', icon: '🧹' },
  { value: 'Niveladora', label: 'NIVEL.', icon: '⛏️' },
  { value: 'Rodagem', label: 'RODAGEM', icon: '🛣️' },
  { value: 'Manutenção', label: 'MANUT.', icon: '🔧' },
  { value: 'Plantio', label: 'PLANTIO', icon: '🌱' },
  { value: 'Esterco', label: 'ESTERCO', icon: '💩' },
  { value: 'Colheita', label: 'COLHEITA', icon: '🌾' },
  { value: 'Compactação', label: 'COMPACT.', icon: '⚙️' },
  { value: 'Roçada', label: 'ROÇADA', icon: '🌿' },
  { value: 'Serviços Gerais', label: 'SERVIÇOS', icon: '🧰' },
  { value: 'Terraplanagem', label: 'TERRAP.', icon: '🏗️' },
  { value: 'Outros', label: 'OUTROS', icon: '➕' },
]

const AVATAR_CORES = ['#64748b', '#a0845c', '#6b9e78', '#8b7ec8', '#5b8fa8', '#b06f6f', '#7a9e5c', '#a87f4f']

const iniciais = (nome: string): string => {
  const partes = nome.trim().split(/\s+/)
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase()
}

const primeiroNome = (nome: string): string => nome.trim().split(/\s+/)[0] || nome

const maquinaIcon = (m: any): string => {
  const n = normalizar(`${m?.tipo || ''} ${m?.categoria || ''} ${m?.nome || ''}`)
  if (n.includes('caminhonete') || n.includes('pickup')) return '🛻'
  if (n.includes('caminhao')) return '🚚'
  if (n.includes('colheitadeira')) return '🌾'
  if (n.includes('pulveriz')) return '💨'
  if (n.includes('trator')) return '🚜'
  if (n.includes('moto')) return '🏍️'
  if (n.includes('veiculo') || n.includes('carro')) return '🚗'
  if (n.includes('implemento')) return '⚙️'
  return '🚜'
}

interface FormState {
  data: string
  quemAbasteceu: string
  operadorMotorista: string
  maquinaVeiculo: string
  maquinaVeiculoId: string
  placa: string
  totalAbastecido: string
  totalBomba: string
  combustivel: string
  tanqueId: string
  tanqueNome: string
  odometro: string
  tipoOperacao: string
  tipoOperacaoOutros: string
  observacao: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  quemAbasteceu: '',
  operadorMotorista: '',
  maquinaVeiculo: '',
  maquinaVeiculoId: '',
  placa: '',
  totalAbastecido: '',
  totalBomba: '',
  combustivel: '',
  tanqueId: '',
  tanqueNome: '',
  odometro: '',
  tipoOperacao: '',
  tipoOperacaoOutros: '',
  observacao: '',
})

const formatarLitros = (n: number) => n.toLocaleString('pt-BR')

export default function AbastecimentoPage() {
  const navigate = useNavigate()
  const { usuario, fazendaId } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const salvandoRef = useRef(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [funcionariosDisponiveis, setFuncionariosDisponiveis] = useState<string[]>([])
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(false)
  const [maquinasVeiculosDisponiveis, setMaquinasVeiculosDisponiveis] = useState<any[]>([])
  const [maquinaVeiculoSelecionada, setMaquinaVeiculoSelecionada] = useState<any>(null)
  const [tanquesDisponiveis, setTanquesDisponiveis] = useState<any[]>([])
  const [semHorimetro, setSemHorimetro] = useState(false)
  const [bombaAnterior, setBombaAnterior] = useState<number | null>(null)
  // Salvar antes de máquinas e tanques chegarem gravaria o registro sem id da máquina e sem baixa no tanque.
  const [maquinasCarregadas, setMaquinasCarregadas] = useState(false)
  const [tanquesCarregados, setTanquesCarregados] = useState(false)
  const [tanquesIndisponivel, setTanquesIndisponivel] = useState(false)
  // Incrementa quando a internet volta com tanques indisponíveis: refaz a leitura sozinho
  const [recarga, setRecarga] = useState(0)
  const tanquesIndisponivelRef = useRef(false)

  // Quem abasteceu vem do login (padrao da referencia)
  useEffect(() => {
    if (usuario && !form.quemAbasteceu) {
      setForm((prev) => ({ ...prev, quemAbasteceu: usuario }))
    }
  }, [usuario])

  // Carregar funcionários do cache, com fallback para Supabase
  useEffect(() => {
    const loadFuncionarios = async () => {
      const cachedData = await getCachedCadastroData()
      if (cachedData?.funcionarios && cachedData.funcionarios.length > 0) {
        setFuncionariosDisponiveis(cachedData.funcionarios)
        return
      }
      if (!fazendaId) {
        setFuncionariosDisponiveis([])
        return
      }
      setLoadingFuncionarios(true)
      try {
        const funcionarios = await withTimeout(getFuncionarios(fazendaId), 3000)
        setFuncionariosDisponiveis(funcionarios.map(f => f.nome))
      } catch (error) {
        console.error('Erro ao carregar funcionários:', error)
        setFuncionariosDisponiveis([])
      } finally {
        setLoadingFuncionarios(false)
      }
    }
    loadFuncionarios()
  }, [fazendaId])

  // Máquinas/veículos: cache local primeiro (aparece na hora, mesmo com rede ruim) e revalida com timeout
  useEffect(() => {
    if (!fazendaId) return
    let cancelado = false
    async function carregarMaquinasVeiculos() {
      try {
        const cache = await getMaquinasVeiculosFromCacheOnly(fazendaId!)
        if (cancelado) return
        if (cache) setMaquinasVeiculosDisponiveis(cache)
        const maquinas = await getMaquinasVeiculosCached(fazendaId!)
        if (cancelado) return
        if (maquinas) setMaquinasVeiculosDisponiveis(maquinas)
      } catch (error) {
        console.error('Erro ao carregar máquinas/veículos:', error)
      } finally {
        if (!cancelado) setMaquinasCarregadas(true)
      }
    }
    carregarMaquinasVeiculos()
    return () => {
      cancelado = true
    }
  }, [fazendaId])

  // Tanques de combustível: cache primeiro. Sem cache e sem rede é "indisponível", não "sem tanques":
  // salvar assim gravaria o abastecimento sem tanque e sem a baixa de estoque.
  useEffect(() => {
    if (!fazendaId) return
    let cancelado = false
    async function carregarTanques() {
      try {
        const cache = await getTanquesCombustivelFromCacheOnly(fazendaId!)
        if (cancelado) return
        if (cache) {
          setTanquesDisponiveis(cache)
          setTanquesIndisponivel(false)
        }
        const tanques = await getTanquesCombustivelCached(fazendaId!)
        if (cancelado) return
        if (tanques) {
          setTanquesDisponiveis(tanques)
          setTanquesIndisponivel(false)
        } else if (!cache) {
          setTanquesIndisponivel(true)
        }
      } catch (error) {
        if (cancelado) return
        console.error('Erro ao carregar tanques:', error)
        setTanquesIndisponivel(true)
      } finally {
        if (!cancelado) setTanquesCarregados(true)
      }
    }
    carregarTanques()
    return () => {
      cancelado = true
    }
  }, [fazendaId, recarga])

  // Leitura anterior da bomba. Prioridade: o que está pendente neste aparelho (é mais novo que qualquer
  // coisa do servidor), depois a última do servidor (outros aparelhos e Painel), por fim o último registro local.
  useEffect(() => {
    let cancelado = false
    const paraNumero = (v: unknown): number | null => {
      const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.'))
      return Number.isNaN(n) ? null : n
    }
    async function carregarBombaAnterior() {
      try {
        const registros = await getAllRegistros('abastecimento')
        const comBomba = (registros || [])
          .filter((r: any) => r.totalBomba !== undefined && r.totalBomba !== null && String(r.totalBomba).trim() !== '')
          .sort((a: any, b: any) => String(b.lastModified || '').localeCompare(String(a.lastModified || '')))
        const pendente = comBomba.find((r: any) => r.syncStatus === 'pending')
        const local = paraNumero((pendente || comBomba[0])?.totalBomba)
        if (cancelado) return
        if (local !== null) setBombaAnterior(local)
        if (pendente || !fazendaId || !navigator.onLine || redeInstavelRecentemente()) return
        const servidor = await withTimeout(getUltimaLeituraBomba(fazendaId), 3000)
        if (!cancelado && servidor !== null) setBombaAnterior(servidor)
      } catch (error) {
        console.error('Erro ao buscar leitura anterior da bomba:', error)
      }
    }
    carregarBombaAnterior()
    return () => {
      cancelado = true
    }
  }, [fazendaId, recarga])

  // Filtrar tanques pelo combustivel selecionado
  const tanquesFiltrados = tanquesDisponiveis.filter(
    (t) => t.tipo_combustivel === form.combustivel && t.ativo
  )

  const idsTanquesFiltrados = tanquesFiltrados.map((t) => t.id).join(',')

  // Auto-selecionar tanque quando houver apenas um para o combustivel selecionado
  useEffect(() => {
    if (tanquesFiltrados.length === 1 && form.tanqueId !== tanquesFiltrados[0].id) {
      setForm((prev) => ({ ...prev, tanqueId: tanquesFiltrados[0].id, tanqueNome: tanquesFiltrados[0].nome }))
    } else if (tanquesFiltrados.length !== 1 && form.tanqueId && !tanquesFiltrados.some((t) => t.id === form.tanqueId)) {
      // Limpar tanque se o selecionado nao esta mais na lista filtrada
      setForm((prev) => ({ ...prev, tanqueId: '', tanqueNome: '' }))
    }
  }, [idsTanquesFiltrados, form.combustivel])

  // Detalhes da máquina/veículo selecionada, a partir da lista já carregada (sem nova ida à rede)
  useEffect(() => {
    if (!form.maquinaVeiculo || !fazendaId) {
      setMaquinaVeiculoSelecionada(null)
      setForm((prev) => (prev.maquinaVeiculoId || prev.placa ? { ...prev, maquinaVeiculoId: '', placa: '' } : prev))
      return
    }
    // Lista ainda não carregou: manter valores existentes (rascunho pode ter restaurado)
    if (maquinasVeiculosDisponiveis.length === 0) return
    const maquina = maquinasVeiculosDisponiveis.find((m: any) => m.nome === form.maquinaVeiculo) || null
    if (maquina) {
      // Mesmo objeto de antes: não reaplica combustível/operador padrão quando a lista só revalida
      setMaquinaVeiculoSelecionada((prev: any) => (prev?.id === maquina.id ? prev : maquina))
      setForm((prev) => ({ ...prev, maquinaVeiculoId: maquina.id, placa: maquina.placa || '' }))
    } else {
      // Máquina que não existe mais na lista (rascunho antigo, cadastro removido): sai da seleção
      setMaquinaVeiculoSelecionada(null)
      setForm((prev) => ({ ...prev, maquinaVeiculo: '', maquinaVeiculoId: '', placa: '' }))
    }
  }, [form.maquinaVeiculo, fazendaId, maquinasVeiculosDisponiveis])

  // Auto-preencher combustível e operador padrão da máquina (padrao da referencia)
  useEffect(() => {
    if (!maquinaVeiculoSelecionada) return
    const combustivelMaquina = maquinaVeiculoSelecionada.tipo_combustivel
    if (combustivelMaquina && COMBUSTIVEL_OPTIONS.some((o) => o.value === combustivelMaquina)) {
      setForm((prev) => ({ ...prev, combustivel: combustivelMaquina }))
    }
    const operadorPadrao = maquinaVeiculoSelecionada.operador_padrao
    if (operadorPadrao && !form.operadorMotorista) {
      setForm((prev) => ({ ...prev, operadorMotorista: operadorPadrao }))
    }
  }, [maquinaVeiculoSelecionada])

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // Sanitiza campos decimais: permite apenas digitos e uma virgula decimal
  const setDecimalInput = (field: 'totalBomba' | 'odometro') => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d,]/g, '')
    const firstComma = value.indexOf(',')
    if (firstComma !== -1) {
      value = value.slice(0, firstComma + 1) + value.slice(firstComma + 1).replace(/,/g, '')
    }
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Validation rules
  const validationRules: any = {
    data: { required: true },
    quemAbasteceu: { required: true },
    operadorMotorista: { required: true },
    maquinaVeiculo: { required: true },
    totalAbastecido: { required: true },
    combustivel: { required: true },
    odometro: { required: !semHorimetro },
    tipoOperacao: { required: true },
  }

  // Tanque é obrigatório apenas quando há tanques cadastrados para o combustível selecionado.
  // Fazendas sem tanques cadastrados ainda podem registrar abastecimentos (sem controle de estoque).
  if (form.combustivel && tanquesFiltrados.length > 0) {
    validationRules.tanqueId = { required: true }
  }

  // Add validation for tipoOperacaoOutros when tipoOperacao is 'Outros'
  if (form.tipoOperacao === 'Outros') {
    validationRules.tipoOperacaoOutros = { required: true }
  }

  const { isValid } = useFormValidation(form, validationRules)

  const dadosBloqueados =
    (!!form.maquinaVeiculo && !maquinasCarregadas) ||
    (!!form.combustivel && (!tanquesCarregados || tanquesIndisponivel))
  tanquesIndisponivelRef.current = tanquesIndisponivel && tanquesCarregados

  useEffect(() => {
    const aoVoltarInternet = () => {
      if (tanquesIndisponivelRef.current) {
        // O sistema avisou que a internet voltou: o sinal de rede instável não vale mais
        registrarRespostaDeRede()
        setRecarga((n) => n + 1)
      }
    }
    window.addEventListener('online', aoVoltarInternet)
    // Wi-Fi sem internet que volta não dispara 'online': tenta de novo de tempos em tempos enquanto indisponível
    const tentativa = setInterval(() => {
      if (tanquesIndisponivelRef.current) setRecarga((n) => n + 1)
    }, 25_000)
    return () => {
      window.removeEventListener('online', aoVoltarInternet)
      clearInterval(tentativa)
    }
  }, [])

  // Erro de salvamento anterior não vale para outra data/máquina
  useEffect(() => {
    setErrors([])
  }, [form.data, form.maquinaVeiculo])

  // Tanque selecionado (para trava de saldo)
  const tanqueSelecionado = tanquesFiltrados.find((t) => t.id === form.tanqueId)
  const totalAbastecidoNum = form.totalAbastecido ? parseFloat(String(form.totalAbastecido).replace(',', '.')) : 0
  const saldoInsuficiente = tanqueSelecionado && totalAbastecidoNum > Number(tanqueSelecionado.saldo_atual_l)

  // Relogio da bomba: comparacao AGORA - ANTES vs total abastecido
  const totalBombaNum = form.totalBomba ? parseFloat(String(form.totalBomba).replace('.', '').replace(',', '.')) : null
  const bombaDiff = bombaAnterior != null && totalBombaNum != null ? totalBombaNum - bombaAnterior : null
  const bombaBateu = bombaDiff != null && Math.abs(bombaDiff - totalAbastecidoNum) < 0.5
  const bombaDiverge = bombaDiff != null && totalAbastecidoNum > 0 && !bombaBateu

  const pendenciaTexto = (() => {
    if (!form.maquinaVeiculo) return 'Falta escolher a máquina/veículo'
    if (!maquinasCarregadas) return 'Carregando máquinas...'
    if (!form.operadorMotorista) return 'Falta escolher o operador/motorista'
    if (!form.combustivel) return 'Falta escolher o combustível'
    if (!tanquesCarregados) return 'Carregando tanques...'
    if (tanquesIndisponivel) return 'Tanques indisponíveis neste aparelho: conecte à internet e atualize os dados'
    if (tanquesFiltrados.length > 0 && !form.tanqueId) return 'Falta escolher o tanque de origem'
    if (!(totalAbastecidoNum > 0)) return 'Falta o total abastecido'
    if (!semHorimetro && !form.odometro) return 'Falta o odômetro/horímetro (ou marque que a máquina não tem)'
    if (!form.tipoOperacao) return 'Falta escolher o serviço'
    if (form.tipoOperacao === 'Outros' && !form.tipoOperacaoOutros) return 'Falta especificar o serviço'
    return undefined
  })()

  const handleSalvar = async () => {
    if (salvandoRef.current || dadosBloqueados || !isValid || !(totalAbastecidoNum > 0)) return
    salvandoRef.current = true
    setSalvando(true)
    setErrors([])

    // Saldo negativo permitido: o aviso de saldo insuficiente e informativo, nao bloqueia o save.
    // A trigger do banco registra a baixa e o saldo fica negativo, sinalizando necessidade de entrada.

    const resultado = await salvarRegistro('abastecimento', {
      data: form.data,
      quemAbasteceu: form.quemAbasteceu,
      operadorMotorista: form.operadorMotorista,
      maquinaVeiculo: form.maquinaVeiculo,
      maquinaVeiculoId: form.maquinaVeiculoId,
      placa: form.placa,
      totalAbastecido: form.totalAbastecido,
      totalBomba: form.totalBomba,
      combustivel: form.combustivel,
      tanqueId: form.tanqueId,
      tanqueNome: form.tanqueNome,
      odometro: semHorimetro ? '' : normalizarNumeroString(form.odometro),
      semHorimetro,
      tipoOperacao: form.tipoOperacao,
      tipoOperacaoOutros: form.tipoOperacaoOutros,
      observacao: form.observacao,
    }).catch(() => null)
    const result: { success: boolean; errors?: { field: string; message: string }[]; registro?: unknown } = resultado ?? {
      success: false,
      errors: [{ field: 'geral', message: 'Não foi possível salvar agora. Tente novamente.' }],
    }

    salvandoRef.current = false
    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      // Update otimista do cache de tanques: decrementa o saldo localmente
      if (fazendaId && form.tanqueId && totalAbastecidoNum > 0) {
        await updateTanqueSaldoCache(fazendaId, form.tanqueId, -totalAbastecidoNum)
        setTanquesDisponiveis((prev) =>
          prev.map((t) =>
            t.id === form.tanqueId
              ? { ...t, saldo_atual_l: Number(Number(t.saldo_atual_l || 0) - totalAbastecidoNum) }
              : t
          )
        )
      }
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
    }
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    setForm({ ...makeInitial(), quemAbasteceu: usuario || '' })
    setSemHorimetro(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/')
  }

  const maquinaOptions = maquinasVeiculosDisponiveis.map((m) => ({
    value: m.nome,
    label: m.nome,
    icon: maquinaIcon(m),
  }))

  const operadorOptions = funcionariosDisponiveis.map((nome, i) => ({
    value: nome,
    label: primeiroNome(nome),
    icon: (
      <span
        className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
        style={{ backgroundColor: AVATAR_CORES[i % AVATAR_CORES.length] }}
      >
        {iniciais(nome)}
      </span>
    ),
  }))

  return (
    <CadernetaLayout
      title="ABASTECIMENTO"
      cadernetaId="abastecimento"
      dateContent={<DatePicker value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} variant="header" compact inline maxDate={todayBR()} />}
    >
      {errors.length > 0 && <ValidationMessage errors={errors} />}

      <CadernetaSection numero={1} titulo="Dados do abastecimento">
        <div className="flex flex-col gap-2.5">
          <p className="text-[15px] font-bold text-gray-900">
            MÁQUINA/VEÍCULO <span className="text-red-500">*</span>
          </p>
          {maquinasVeiculosDisponiveis.length > 0 ? (
            <ChoiceGrid
              options={maquinaOptions}
              value={form.maquinaVeiculo}
              onChange={set('maquinaVeiculo')}
              cols={4}
              dataField="maquinaVeiculo"
            />
          ) : (
            <Input
              placeholder="Modelo da máquina/veículo"
              value={form.maquinaVeiculo}
              onChange={setInput('maquinaVeiculo')}
              error={getError('maquinaVeiculo')}
            />
          )}
          {form.placa && (
            <InfoStrip tone="neutral">Placa: {form.placa}</InfoStrip>
          )}
          {maquinasVeiculosDisponiveis.length === 0 && form.maquinaVeiculo && (
            <Input
              label="PLACA"
              placeholder="Placa do veículo"
              value={form.placa}
              onChange={setInput('placa')}
            />
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <p className="text-[15px] font-bold text-gray-900">
            OPERADOR/MOTORISTA <span className="text-red-500">*</span>
          </p>
          {funcionariosDisponiveis.length > 0 ? (
            <ChoiceGrid
              options={operadorOptions}
              value={form.operadorMotorista}
              onChange={set('operadorMotorista')}
              cols={4}
              dataField="operadorMotorista"
            />
          ) : (
            <Input
              placeholder={loadingFuncionarios ? 'Carregando funcionários...' : 'Nome do operador'}
              value={form.operadorMotorista}
              onChange={setInput('operadorMotorista')}
              error={getError('operadorMotorista')}
              disabled={loadingFuncionarios}
            />
          )}
          {form.quemAbasteceu && (
            <InfoStrip tone="neutral" icon={<User className="h-4 w-4" />}>
              Abastecido por: {form.quemAbasteceu} (pega do login)
            </InfoStrip>
          )}
        </div>

        <div className="flex flex-col gap-2.5">
          <p className="text-[15px] font-bold text-gray-900">
            COMBUSTÍVEL <span className="text-red-500">*</span>
          </p>
          <ChoiceGrid
            options={COMBUSTIVEL_OPTIONS}
            value={form.combustivel}
            onChange={(val) => setForm((prev) => ({ ...prev, combustivel: val }))}
            cols={4}
            labelSize="xs"
            dataField="combustivel"
          />
          {maquinaVeiculoSelecionada?.tipo_combustivel && form.combustivel === maquinaVeiculoSelecionada.tipo_combustivel && (
            <InfoStrip tone="neutral">Já vem marcado o combustível dessa máquina</InfoStrip>
          )}
        </div>

        {form.combustivel && (
          <>
            {tanquesFiltrados.length === 1 ? (
              <InfoStrip
                tone={Number(tanquesFiltrados[0].saldo_atual_l) <= Number(tanquesFiltrados[0].limite_alerta_l) && Number(tanquesFiltrados[0].limite_alerta_l) > 0 ? 'danger' : 'success'}
              >
                Tanque: {tanquesFiltrados[0].nome} · Saldo: {formatarLitros(Number(tanquesFiltrados[0].saldo_atual_l))} L
              </InfoStrip>
            ) : tanquesFiltrados.length > 1 ? (
              <div className="flex flex-col gap-2">
                <p className="text-[15px] font-bold text-gray-900">TANQUE DE ORIGEM</p>
                <div className="grid grid-cols-1 gap-2">
                  {tanquesFiltrados.map((tanque) => {
                    const emAlerta = Number(tanque.saldo_atual_l) <= Number(tanque.limite_alerta_l) && Number(tanque.limite_alerta_l) > 0
                    return (
                      <button
                        key={tanque.id}
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            tanqueId: tanque.id,
                            tanqueNome: tanque.nome,
                          }))
                        }}
                        className={`min-h-[50px] px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all text-left ${
                          form.tanqueId === tanque.id
                            ? 'border-brand-900 bg-brand-900 text-white'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{tanque.nome}</span>
                          <span className={`text-xs ${form.tanqueId === tanque.id ? (emAlerta ? 'text-red-300' : 'text-green-200') : (emAlerta ? 'text-red-600 font-bold' : 'text-gray-500')}`}>
                            Saldo: {formatarLitros(Number(tanque.saldo_atual_l))} L{emAlerta ? ' ⚠' : ''}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : tanquesIndisponivel ? (
              <InfoStrip tone="danger" icon="⚠️">
                Tanques indisponíveis neste aparelho. Conecte à internet e atualize os dados para registrar o abastecimento.
              </InfoStrip>
            ) : (
              <InfoStrip tone="warning">
                Nenhum tanque de {form.combustivel} cadastrado. O abastecimento será registrado sem controle de estoque. Cadastre um tanque no Painel Web para habilitar o controle automático.
              </InfoStrip>
            )}
          </>
        )}
        {saldoInsuficiente && (
          <InfoStrip tone="warning">
            Atenção: o tanque {tanqueSelecionado.nome} tem saldo atual de {formatarLitros(Number(tanqueSelecionado.saldo_atual_l))} L para uma baixa de {formatarLitros(totalAbastecidoNum)} L. O saldo ficará negativo e precisará de uma entrada de reconciliação.
          </InfoStrip>
        )}
      </CadernetaSection>

      <CadernetaSection numero={2} titulo="Quantidade" required>
        <div className="flex flex-col gap-2.5">
          <p className="text-[15px] font-bold text-gray-900">
            TOTAL ABASTECIDO <span className="text-red-500">*</span>
          </p>
          <StepperInput
            value={form.totalAbastecido}
            onChange={set('totalAbastecido')}
            step={5}
            min={0}
            suffix="litros"
            placeholder="0"
          />
        </div>

        <div className="flex flex-col gap-2.5">
          <p className="text-[15px] font-bold text-gray-900">RELÓGIO DA BOMBA</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase text-gray-500">Antes</span>
              <input
                type="text"
                readOnly
                tabIndex={-1}
                value={bombaAnterior != null ? formatarLitros(bombaAnterior) : ''}
                placeholder="—"
                className="w-full rounded-xl border-2 border-gray-400 bg-white px-3 py-2.5 text-base font-bold text-gray-900 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase text-gray-500">Agora</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Leitura atual"
                value={form.totalBomba}
                onChange={setDecimalInput('totalBomba')}
                className="w-full rounded-xl border-2 border-gray-400 bg-white px-3 py-2.5 text-base font-bold text-gray-900 focus:outline-none focus:border-brand-700"
              />
            </div>
          </div>
          {bombaBateu && totalAbastecidoNum > 0 && (
            <InfoStrip tone="success" icon="✓">
              Bateu com os {formatarLitros(totalAbastecidoNum)} litros
            </InfoStrip>
          )}
          {bombaDiverge && (
            <InfoStrip tone="warning">
              A bomba indica {formatarLitros(bombaDiff!)} L de diferença, mas foram lançados {formatarLitros(totalAbastecidoNum)} L. Confira as leituras.
            </InfoStrip>
          )}
        </div>
      </CadernetaSection>

      <CadernetaSection numero={3} titulo="Horímetro" required={!semHorimetro}>
        <Input
          label={!semHorimetro ? <span>ODÔMETRO/HORÍMETRO <span className="text-red-500">*</span></span> : 'ODÔMETRO/HORÍMETRO'}
          placeholder={semHorimetro ? 'Sem horímetro/odômetro' : 'Leitura do odômetro/horímetro'}
          value={semHorimetro ? '' : form.odometro}
          onChange={setDecimalInput('odometro')}
          error={getError('odometro')}
          inputMode="decimal"
          suffix="h"
          disabled={semHorimetro}
        />
        <button
          type="button"
          onClick={() => {
            setSemHorimetro(!semHorimetro)
            if (!semHorimetro) setForm((prev) => ({ ...prev, odometro: '' }))
          }}
          className="flex items-center gap-2.5 text-left active:scale-[0.99]"
        >
          <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${semHorimetro ? 'bg-brand-900 border-brand-900' : 'border-gray-300 bg-white'}`}>
            {semHorimetro && (
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
          <span className="text-sm font-semibold text-gray-700">Essa máquina não tem horímetro</span>
        </button>
      </CadernetaSection>

      <CadernetaSection numero={4} titulo="Para qual serviço?" required>
        <ChoiceGrid
          options={OPERACAO_OPTIONS}
          value={form.tipoOperacao}
          onChange={(val) => setForm((prev) => ({ ...prev, tipoOperacao: val }))}
          cols={4}
          labelSize="xs"
          dataField="tipoOperacao"
        />
        {form.tipoOperacao === 'Outros' && (
          <Input
            label={<span>ESPECIFICAR <span className="text-red-500">*</span></span>}
            placeholder="Especifique o tipo de operação"
            value={form.tipoOperacaoOutros}
            onChange={setInput('tipoOperacaoOutros')}
            error={getError('tipoOperacaoOutros')}
          />
        )}
        <Input
          label="OBSERVAÇÃO (OPCIONAL)"
          placeholder="Detalhes adicionais"
          value={form.observacao}
          onChange={setInput('observacao')}
        />
      </CadernetaSection>

      <FormFooter
        onSalvar={handleSalvar}
        onLimpar={() => {
          setForm({ ...makeInitial(), quemAbasteceu: usuario || '' })
          setSemHorimetro(false)
          setErrors([])
        }}
        salvando={salvando}
        disabled={!isValid || dadosBloqueados || !(totalAbastecidoNum > 0)}
        formValido={isValid && !dadosBloqueados && totalAbastecidoNum > 0}
        pendenciaTexto={pendenciaTexto}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Abastecimento"
        registro={registroSalvo}
        caderneta="abastecimento"
      />
    </CadernetaLayout>
  )
}

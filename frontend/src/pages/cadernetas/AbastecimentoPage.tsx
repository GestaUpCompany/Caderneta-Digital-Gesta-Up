import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, Radio, ValidationMessage, SearchableModal } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { normalizarNumeroString } from '../../utils/formatNumber'
import { scrollToFirstError } from '../../utils/scrollToError'
import { getCachedCadastroData, getMaquinasVeiculosCached, getTanquesCombustivelCached, updateTanqueSaldoCache } from '../../services/cadastroCache'
import { getFuncionarios } from '../../services/supabaseService'
import { RootState } from '../../store/store'
import { useFormValidation } from '../../hooks/useFormValidation'
import { atualizarNomeUsuarioConfig } from '../../utils/nomeUsuario'
import { Save } from 'lucide-react'

const COMBUSTIVEL_OPTIONS = [
  { value: 'Álcool', label: 'ÁLCOOL' },
  { value: 'Gasolina', label: 'GASOLINA' },
  { value: 'Diesel S10', label: 'DIESEL S10' },
  { value: 'Diesel Comum', label: 'DIESEL COMUM' },
]

const OPERACAO_OPTIONS = [
  { value: 'Nutrição', label: 'NUTRIÇÃO' },
  { value: 'Pulverização', label: 'PULVERIZAÇÃO' },
  { value: 'Gradagem', label: 'GRADAGEM' },
  { value: 'Fertilização/Correção', label: 'FERT./CORRET.' },
  { value: 'Limpeza', label: 'LIMPEZA' },
  { value: 'Niveladora', label: 'NIVELADORA' },
  { value: 'Rodagem', label: 'RODAGEM' },
  { value: 'Manutenção', label: 'MANUTENÇÃO' },
  { value: 'Plantio', label: 'PLANTIO' },
  { value: 'Esterco', label: 'ESTERCO' },
  { value: 'Colheita', label: 'COLHEITA' },
  { value: 'Compactação', label: 'COMPACTAÇÃO' },
  { value: 'Roçada', label: 'ROÇADA' },
  { value: 'Serviços Gerais', label: 'SERVIÇOS GERAIS' },
  { value: 'Terraplanagem', label: 'TERRAPLANAGEM' },
  { value: 'Outros', label: 'OUTROS' },
]

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

export default function AbastecimentoPage() {
  const navigate = useNavigate()
  const { fazendaId } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [funcionariosDisponiveis, setFuncionariosDisponiveis] = useState<string[]>([])
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(false)
  const [maquinasVeiculosDisponiveis, setMaquinasVeiculosDisponiveis] = useState<any[]>([])
  const [maquinaVeiculoSelecionada, setMaquinaVeiculoSelecionada] = useState<any>(null)
  const [tanquesDisponiveis, setTanquesDisponiveis] = useState<any[]>([])
  const [semHorimetro, setSemHorimetro] = useState(false)


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
        const funcionarios = await getFuncionarios(fazendaId)
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

  // Carregar máquinas/veículos (com cache lazy para offline)
  useEffect(() => {
    async function carregarMaquinasVeiculos() {
      if (!fazendaId) return
      try {
        const maquinas = await getMaquinasVeiculosCached(fazendaId)
        setMaquinasVeiculosDisponiveis(maquinas || [])
      } catch (error) {
        console.error('Erro ao carregar máquinas/veículos:', error)
      }
    }
    carregarMaquinasVeiculos()
  }, [fazendaId])

  // Carregar tanques de combustivel do cache
  useEffect(() => {
    async function carregarTanques() {
      if (!fazendaId) return
      try {
        const tanques = await getTanquesCombustivelCached(fazendaId)
        if (tanques) setTanquesDisponiveis(tanques)
      } catch (error) {
        console.error('Erro ao carregar tanques:', error)
      }
    }
    carregarTanques()
  }, [fazendaId])

  // Filtrar tanques pelo combustivel selecionado
  const tanquesFiltrados = tanquesDisponiveis.filter(
    (t) => t.tipo_combustivel === form.combustivel && t.ativo
  )

  // Auto-selecionar tanque quando houver apenas um para o combustivel selecionado
  useEffect(() => {
    if (tanquesFiltrados.length === 1 && form.tanqueId !== tanquesFiltrados[0].id) {
      setForm((prev) => ({ ...prev, tanqueId: tanquesFiltrados[0].id, tanqueNome: tanquesFiltrados[0].nome }))
    } else if (tanquesFiltrados.length !== 1 && form.tanqueId && !tanquesFiltrados.some((t) => t.id === form.tanqueId)) {
      // Limpar tanque se o selecionado nao esta mais na lista filtrada
      setForm((prev) => ({ ...prev, tanqueId: '', tanqueNome: '' }))
    }
  }, [tanquesFiltrados.length])

  // Buscar detalhes da máquina/veículo quando selecionada
  useEffect(() => {
    async function carregarDetalhesMaquinaVeiculo() {
      if (!form.maquinaVeiculo || !fazendaId) {
        setMaquinaVeiculoSelecionada(null)
        setForm(prev => ({ ...prev, maquinaVeiculoId: '', placa: '' }))
        return
      }
      try {
        const lista = await getMaquinasVeiculosCached(fazendaId)
        if (!lista || lista.length === 0) {
          // Cache ainda nao carregou: manter valores existentes (rascunho pode ter restaurado)
          return
        }
        const maquina = lista.find((m: any) => m.nome === form.maquinaVeiculo) || null
        if (maquina) {
          setMaquinaVeiculoSelecionada(maquina)
          setForm(prev => ({ ...prev, maquinaVeiculoId: maquina.id, placa: maquina.placa || '' }))
        } else {
          setMaquinaVeiculoSelecionada(null)
          setForm(prev => ({ ...prev, maquinaVeiculoId: '', placa: '' }))
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes da máquina/veículo:', error)
        setMaquinaVeiculoSelecionada(null)
        setForm(prev => ({ ...prev, maquinaVeiculoId: '', placa: '' }))
      }
    }
    carregarDetalhesMaquinaVeiculo()
  }, [form.maquinaVeiculo, fazendaId])

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // Sanitiza campos decimais: permite apenas digitos e uma virgula decimal
  const setDecimalInput = (field: 'totalAbastecido' | 'totalBomba' | 'odometro') => (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Tanque selecionado (para trava de saldo)
  const tanqueSelecionado = tanquesFiltrados.find((t) => t.id === form.tanqueId)
  const totalAbastecidoNum = form.totalAbastecido ? parseFloat(String(form.totalAbastecido).replace(',', '.')) : 0
  const saldoInsuficiente = tanqueSelecionado && totalAbastecidoNum > Number(tanqueSelecionado.saldo_atual_l)

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    // Saldo negativo permitido: o aviso de saldo insuficiente e informativo, nao bloqueia o save.
    // A trigger do banco registra a baixa e o saldo fica negativo, sinalizando necessidade de entrada.

    const result = await salvarRegistro('abastecimento', {
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
    })

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
    setForm(makeInitial())
    setSemHorimetro(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/')
  }

  return (
    <CadernetaLayout
      title="ABASTECIMENTO"
      cadernetaId="abastecimento"
      dateContent={<DatePicker value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} variant="header" compact inline />}
    >
      {errors.length > 0 && <ValidationMessage errors={errors} />}
      {/* Seção 1: Dados Principais */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS DO ABASTECIMENTO</h2>

        </div>
        <>
          <SearchableModal
            label={<span>QUEM ABASTECEU? <span className="text-red-500">*</span></span>}
            value={form.quemAbasteceu}
            onChange={(val) => { set('quemAbasteceu')(val); atualizarNomeUsuarioConfig(val) }}
            error={getError('quemAbasteceu')}
            options={funcionariosDisponiveis}
            placeholder={loadingFuncionarios ? 'Carregando funcionários...' : 'Buscar funcionário...'}
            disabled={loadingFuncionarios}
            id="quemAbasteceu"
            name="quemAbasteceu"
          />
        </>
        <>
          <SearchableModal
            label={<span>OPERADOR/MOTORISTA? <span className="text-red-500">*</span></span>}
            value={form.operadorMotorista}
            onChange={set('operadorMotorista')}
            error={getError('operadorMotorista')}
            options={funcionariosDisponiveis}
            placeholder={loadingFuncionarios ? 'Carregando funcionários...' : 'Buscar funcionário...'}
            disabled={loadingFuncionarios}
            id="operadorMotorista"
            name="operadorMotorista"
          />
        </>
        <>
          {maquinasVeiculosDisponiveis.length > 0 ? (
            <SearchableModal
              label={<span>MÁQUINA/VEÍCULO? <span className="text-red-500">*</span></span>}
              value={form.maquinaVeiculo}
              onChange={set('maquinaVeiculo')}
              error={getError('maquinaVeiculo')}
              options={maquinasVeiculosDisponiveis.map(m => m.nome)}
              placeholder="Buscar máquina/veículo..."
              id="maquinaVeiculo"
              name="maquinaVeiculo"
            />
          ) : (
            <Input
              label={<span>MÁQUINA/VEÍCULO? <span className="text-red-500">*</span></span>}
              placeholder="Modelo da máquina/veículo"
              value={form.maquinaVeiculo}
              onChange={setInput('maquinaVeiculo')}
              error={getError('maquinaVeiculo')}
            />
          )}
        </>
        {form.maquinaVeiculo && (
          <Input
            label="PLACA"
            placeholder="Placa do veículo"
            value={form.placa}
            onChange={setInput('placa')}
            disabled={!!maquinaVeiculoSelecionada?.placa}
          />
        )}
        <Input label={<span>TOTAL ABASTECIDO (L) <span className="text-red-500">*</span></span>} placeholder="Quantidade abastecida" value={form.totalAbastecido} onChange={setDecimalInput('totalAbastecido')} error={getError('totalAbastecido')} inputMode="decimal" />
        <Input label="TOTAL DA BOMBA (L)" placeholder="Total acumulado da bomba" value={form.totalBomba} onChange={setDecimalInput('totalBomba')} inputMode="decimal" />
      </div>

      {/* Seção 2: Combustível e Operação */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">2. COMBUSTÍVEL E OPERAÇÃO</h2>
        <Radio
          name="combustivel"
          label={<span>COMBUSTÍVEL? <span className="text-red-500">*</span></span>}
          options={COMBUSTIVEL_OPTIONS}
          value={form.combustivel}
          onChange={(val) => setForm((prev) => ({ ...prev, combustivel: val }))}
          error={getError('combustivel')}
          gridCols={2}
        />
        {form.combustivel && (
          <>
            {tanquesFiltrados.length === 1 ? (
              <div className={`border rounded-xl p-4 ${Number(tanquesFiltrados[0].saldo_atual_l) <= Number(tanquesFiltrados[0].limite_alerta_l) && Number(tanquesFiltrados[0].limite_alerta_l) > 0 ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
                <p className={`text-sm ${Number(tanquesFiltrados[0].saldo_atual_l) <= Number(tanquesFiltrados[0].limite_alerta_l) && Number(tanquesFiltrados[0].limite_alerta_l) > 0 ? 'text-red-800' : 'text-green-800'}`}>
                  <span className="font-bold">Tanque: {tanquesFiltrados[0].nome}</span>
                  <span className="block text-xs mt-1">Saldo: {Number(tanquesFiltrados[0].saldo_atual_l).toLocaleString('pt-BR')} L (auto-selecionado)</span>
                </p>
              </div>
            ) : tanquesFiltrados.length > 1 ? (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  TANQUE DE ORIGEM
                </label>
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
                          ? 'border-[#1a3b2c] bg-[#1a3b2c] text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span>{tanque.nome}</span>
                        <span className={`text-xs ${form.tanqueId === tanque.id ? (emAlerta ? 'text-red-300' : 'text-green-200') : (emAlerta ? 'text-red-600 font-bold' : 'text-gray-500')}`}>
                          Saldo: {Number(tanque.saldo_atual_l).toLocaleString('pt-BR')} L{emAlerta ? ' ⚠' : ''}
                        </span>
                      </div>
                    </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  <span className="font-bold">Nenhum tanque de {form.combustivel} cadastrado.</span>{' '}
                  O abastecimento será registrado sem controle de estoque. Cadastre um tanque no Painel Web para habilitar o controle automático.
                </p>
              </div>
            )}
          </>
        )}
        {saldoInsuficiente && (
          <div className="bg-amber-50 border border-amber-300 rounded-xl p-3">
            <p className="text-sm text-amber-800 font-bold">
              Atenção: o tanque {tanqueSelecionado.nome} tem saldo atual de {Number(tanqueSelecionado.saldo_atual_l).toLocaleString('pt-BR')} L para uma baixa de {totalAbastecidoNum.toLocaleString('pt-BR')} L. O saldo ficara negativo e precisara de uma entrada de reconciliacao.
            </p>
          </div>
        )}
        <div>
          <Input
            label={<span>ODÔMETRO/HORÍMETRO? {!semHorimetro && <span className="text-red-500">*</span>}</span>}
            placeholder={semHorimetro ? 'Sem horímetro/odômetro' : 'Leitura do odômetro/horímetro'}
            value={semHorimetro ? '' : form.odometro}
            onChange={setDecimalInput('odometro')}
            error={getError('odometro')}
            inputMode="decimal"
            disabled={semHorimetro}
          />
          <button
            type="button"
            onClick={() => {
              setSemHorimetro(!semHorimetro)
              if (!semHorimetro) setForm((prev) => ({ ...prev, odometro: '' }))
            }}
            className={`mt-2 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-colors ${semHorimetro ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-gray-400'}`}
          >
            {semHorimetro ? '✓ Esta máquina/veículo não possui horímetro/odômetro' : 'Clique aqui se essa máquina/veículo não possui horímetro/odômetro'}
          </button>
        </div>
        <Radio
          name="tipoOperacao"
          label={<span>TIPO DE OPERAÇÃO? <span className="text-red-500">*</span></span>}
          options={OPERACAO_OPTIONS}
          value={form.tipoOperacao}
          onChange={(val) => setForm((prev) => ({ ...prev, tipoOperacao: val }))}
          error={getError('tipoOperacao')}
          gridCols={2}
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
      </div>

      {/* Seção 3: Observação */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">3. OBSERVAÇÃO</h2>
        <Input
          placeholder="Detalhes adicionais (opcional)"
          value={form.observacao}
          onChange={setInput('observacao')}
        />
      </div>

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
      </div>
      {!isValid && (
        <p className="text-base text-gray-600 text-center">
          <span className="text-red-500">*</span> Preencha todos os campos obrigatórios para salvar
        </p>
      )}

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

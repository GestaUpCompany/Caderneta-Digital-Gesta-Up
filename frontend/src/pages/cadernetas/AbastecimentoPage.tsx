import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, DatePicker, Radio, ValidationMessage, SearchableModal } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { scrollToFirstError } from '../../utils/scrollToError'
import { getCachedCadastroData } from '../../services/cadastroCache'

const COMBUSTIVEL_OPTIONS = [
  { value: 'Álcool', label: 'ÁLCOOL' },
  { value: 'Gasolina', label: 'GASOLINA' },
  { value: 'Diesel S10', label: 'DIESEL S10' },
  { value: 'Diesel S500', label: 'DIESEL S500' },
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
  placa: string
  hidrometroInicial: string
  hidrometroFinal: string
  totalAbastecido: string
  combustivel: string
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
  placa: '',
  hidrometroInicial: '',
  hidrometroFinal: '',
  totalAbastecido: '',
  combustivel: '',
  odometro: '',
  tipoOperacao: '',
  tipoOperacaoOutros: '',
  observacao: '',
})

export default function AbastecimentoPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(() => makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [funcionariosDisponiveis, setFuncionariosDisponiveis] = useState<string[]>([])

  // Calcular total abastecido automaticamente
  useEffect(() => {
    if (form.hidrometroInicial && form.hidrometroFinal) {
      const inicial = parseFloat(form.hidrometroInicial)
      const final = parseFloat(form.hidrometroFinal)
      if (!isNaN(inicial) && !isNaN(final) && final >= inicial) {
        setForm((prev) => ({ ...prev, totalAbastecido: String(final - inicial) }))
      }
    }
  }, [form.hidrometroInicial, form.hidrometroFinal])

  // Carregar funcionários do cache
  useEffect(() => {
    const cachedData = getCachedCadastroData()
    if (cachedData?.funcionarios) {
      setFuncionariosDisponiveis(cachedData.funcionarios)
    }
  }, [])

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const set = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const result = await salvarRegistro('abastecimento', {
      data: form.data,
      quemAbasteceu: form.quemAbasteceu,
      operadorMotorista: form.operadorMotorista,
      maquinaVeiculo: form.maquinaVeiculo,
      placa: form.placa,
      hidrometroInicial: form.hidrometroInicial,
      hidrometroFinal: form.hidrometroFinal,
      totalAbastecido: form.totalAbastecido,
      combustivel: form.combustivel,
      odometro: form.odometro,
      tipoOperacao: form.tipoOperacao,
      tipoOperacaoOutros: form.tipoOperacaoOutros,
      observacao: form.observacao,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
    }
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    setForm(makeInitial())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/')
  }

  return (
    <CadernetaLayout title="ABASTECIMENTO" cadernetaId="abastecimento">
      {errors.length > 0 && <ValidationMessage errors={errors} />}
      {/* Seção 1: Dados Principais */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS DO ABASTECIMENTO</h2>
        <DatePicker label="DATA" value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} error={getError('data')} />
        <>
          {funcionariosDisponiveis.length > 0 ? (
            <SearchableModal
              label="QUEM ABASTECEU?"
              value={form.quemAbasteceu}
              onChange={set('quemAbasteceu')}
              error={getError('quemAbasteceu')}
              options={funcionariosDisponiveis}
              placeholder="Buscar funcionário..."
              id="quemAbasteceu"
              name="quemAbasteceu"
            />
          ) : (
            <Input
              label="QUEM ABASTECEU?"
              placeholder="Nome de quem abasteceu"
              value={form.quemAbasteceu}
              onChange={setInput('quemAbasteceu')}
              error={getError('quemAbasteceu')}
            />
          )}
        </>
        <>
          {funcionariosDisponiveis.length > 0 ? (
            <SearchableModal
              label="OPERADOR/MOTORISTA?"
              value={form.operadorMotorista}
              onChange={set('operadorMotorista')}
              error={getError('operadorMotorista')}
              options={funcionariosDisponiveis}
              placeholder="Buscar funcionário..."
              id="operadorMotorista"
              name="operadorMotorista"
            />
          ) : (
            <Input
              label="OPERADOR/MOTORISTA?"
              placeholder="Nome do operador/motorista"
              value={form.operadorMotorista}
              onChange={setInput('operadorMotorista')}
              error={getError('operadorMotorista')}
            />
          )}
        </>
        <Input label="MÁQUINA/VEÍCULO?" placeholder="Modelo da máquina/veículo" value={form.maquinaVeiculo} onChange={setInput('maquinaVeiculo')} error={getError('maquinaVeiculo')} />
        <Input label="PLACA?" placeholder="Placa do veículo" value={form.placa} onChange={setInput('placa')} error={getError('placa')} />
        <Input label="HIDRÔMETRO INICIAL?" placeholder="Leitura inicial" value={form.hidrometroInicial} onChange={setInput('hidrometroInicial')} error={getError('hidrometroInicial')} />
        <Input label="HIDRÔMETRO FINAL?" placeholder="Leitura final" value={form.hidrometroFinal} onChange={setInput('hidrometroFinal')} error={getError('hidrometroFinal')} />
        <Input label="TOTAL ABASTECIDO (L)" placeholder="Calculado automaticamente" value={form.totalAbastecido} onChange={setInput('totalAbastecido')} error={getError('totalAbastecido')} readOnly />
      </div>

      {/* Seção 2: Combustível e Operação */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">2. COMBUSTÍVEL E OPERAÇÃO</h2>
        <Radio
          name="combustivel"
          label="COMBUSTÍVEL?"
          options={COMBUSTIVEL_OPTIONS}
          value={form.combustivel}
          onChange={(val) => setForm((prev) => ({ ...prev, combustivel: val }))}
          error={getError('combustivel')}
          gridCols={2}
        />
        <Input label="ODÔMETRO/HORÍMETRO?" placeholder="Leitura do odômetro/horímetro" value={form.odometro} onChange={setInput('odometro')} error={getError('odometro')} />
        <Radio
          name="tipoOperacao"
          label="TIPO DE OPERAÇÃO?"
          options={OPERACAO_OPTIONS}
          value={form.tipoOperacao}
          onChange={(val) => setForm((prev) => ({ ...prev, tipoOperacao: val }))}
          error={getError('tipoOperacao')}
          gridCols={2}
        />
        {form.tipoOperacao === 'Outros' && (
          <Input
            label="ESPECIFICAR"
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

      <div className="flex flex-col gap-3">
        <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾">
          SALVAR REGISTRO
        </Button>
        <Button onClick={() => setForm(makeInitial())} variant="secondary" icon="🧹">
          LIMPAR
        </Button>
      </div>

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

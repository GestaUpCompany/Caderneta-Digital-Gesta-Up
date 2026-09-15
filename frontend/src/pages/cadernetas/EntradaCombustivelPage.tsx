import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, Radio, ValidationMessage, SearchableModal } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { scrollToFirstError } from '../../utils/scrollToError'
import { getTanquesCombustivelCached, updateTanqueSaldoCache } from '../../services/cadastroCache'
import { useCadastroOptions } from '../../hooks/useCadastroOptions'
import { RootState } from '../../store/store'
import { useFormValidation } from '../../hooks/useFormValidation'
import { Save } from 'lucide-react'

const COMBUSTIVEL_OPTIONS = [
  { value: 'Álcool', label: 'ÁLCOOL' },
  { value: 'Gasolina', label: 'GASOLINA' },
  { value: 'Diesel S10', label: 'DIESEL S10' },
  { value: 'Diesel Comum', label: 'DIESEL COMUM' },
]

interface FormState {
  data: string
  combustivel: string
  tanqueId: string
  tanqueNome: string
  quantidadeL: string
  precoPorLitro: string
  fornecedor: string
  placaVeiculo: string
  nomeMotorista: string
  notaFiscal: string
  observacao: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  combustivel: '',
  tanqueId: '',
  tanqueNome: '',
  quantidadeL: '',
  precoPorLitro: '',
  fornecedor: '',
  placaVeiculo: '',
  nomeMotorista: '',
  notaFiscal: '',
  observacao: '',
})

export default function EntradaCombustivelPage() {
  const navigate = useNavigate()
  const { fazendaId } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [tanquesDisponiveis, setTanquesDisponiveis] = useState<any[]>([])

  const { options: fornecedoresOptions, loading: loadingFornecedores } = useCadastroOptions('fornecedores', fazendaId)

  // Carregar tanques do cache
  useEffect(() => {
    async function carregarTanques() {
      if (!fazendaId) return
      try {
        const tanques = await getTanquesCombustivelCached(fazendaId)
        if (tanques) {
          setTanquesDisponiveis(tanques)
        }
      } catch (error) {
        console.error('Erro ao carregar tanques:', error)
      }
    }
    carregarTanques()
  }, [fazendaId])

  // Filtrar tanques pelo combustível selecionado
  const tanquesFiltrados = tanquesDisponiveis.filter(
    (t) => t.tipo_combustivel === form.combustivel && t.ativo
  )

  // Auto-selecionar tanque quando houver apenas um para o combustivel selecionado
  useEffect(() => {
    if (tanquesFiltrados.length === 1 && form.tanqueId !== tanquesFiltrados[0].id) {
      setForm((prev) => ({ ...prev, tanqueId: tanquesFiltrados[0].id, tanqueNome: tanquesFiltrados[0].nome }))
    } else if (tanquesFiltrados.length !== 1 && form.tanqueId && !tanquesFiltrados.some((t) => t.id === form.tanqueId)) {
      setForm((prev) => ({ ...prev, tanqueId: '', tanqueNome: '' }))
    }
  }, [tanquesFiltrados.length])

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // Sanitiza campos decimais: permite apenas digitos e uma virgula decimal
  const setDecimalInput = (field: 'quantidadeL' | 'precoPorLitro') => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d,]/g, '')
    // Permite no maximo uma virgula
    const firstComma = value.indexOf(',')
    if (firstComma !== -1) {
      value = value.slice(0, firstComma + 1) + value.slice(firstComma + 1).replace(/,/g, '')
    }
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const validationRules: any = {
    data: { required: true },
    combustivel: {
      required: true,
      custom: (value: string) => {
        if (!value) return null
        const tanques = tanquesDisponiveis.filter((t) => t.tipo_combustivel === value && t.ativo)
        if (tanques.length === 0) return 'Nenhum tanque cadastrado para este combustível'
        return null
      },
    },
    quantidadeL: { required: true },
    precoPorLitro: { required: true },
    tanqueId: {
      required: true,
      custom: (value: string, form: FormState) => {
        if (!form.combustivel) return null
        const tanques = tanquesDisponiveis.filter((t) => t.tipo_combustivel === form.combustivel && t.ativo)
        if (tanques.length > 0 && !value) return 'Selecione o tanque'
        return null
      },
    },
  }

  const { isValid } = useFormValidation(form, validationRules)

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const litros = parseFloat(String(form.quantidadeL).replace(',', '.')) || 0
    const precoPorLitro = parseFloat(String(form.precoPorLitro).replace(',', '.')) || 0
    const valorTotal = litros * precoPorLitro

    const result = await salvarRegistro('entrada-combustivel', {
      data: form.data,
      combustivel: form.combustivel,
      tanqueId: form.tanqueId,
      tanqueNome: form.tanqueNome,
      quantidadeL: form.quantidadeL,
      valorTotal: valorTotal.toFixed(2),
      precoPorLitro: precoPorLitro.toFixed(4),
      fornecedor: form.fornecedor,
      placaVeiculo: form.placaVeiculo,
      nomeMotorista: form.nomeMotorista,
      notaFiscal: form.notaFiscal,
      observacao: form.observacao,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      // Update otimista do cache de tanques: incrementa o saldo localmente
      if (fazendaId && form.tanqueId && litros > 0) {
        await updateTanqueSaldoCache(fazendaId, form.tanqueId, litros)
        // Atualizar o state local para refletir o novo saldo imediatamente
        setTanquesDisponiveis((prev) =>
          prev.map((t) =>
            t.id === form.tanqueId
              ? { ...t, saldo_atual_l: Number(Number(t.saldo_atual_l || 0) + litros) }
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/')
  }

  return (
    <CadernetaLayout
      title="ENTRADA DE COMBUSTÍVEL"
      cadernetaId="entrada-combustivel"
      dateContent={<DatePicker value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} variant="header" compact inline />}
    >
      {errors.length > 0 && <ValidationMessage errors={errors} />}

      {/* Seção 1: Dados da Entrada */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS DA ENTRADA</h2>

        <Radio
          name="combustivel"
          label={<span>TIPO DE COMBUSTÍVEL <span className="text-red-500">*</span></span>}
          options={COMBUSTIVEL_OPTIONS}
          value={form.combustivel}
          onChange={(val) => setForm((prev) => ({ ...prev, combustivel: val }))}
          error={getError('combustivel')}
          gridCols={2}
        />

        {form.combustivel && (
          <>
            {tanquesFiltrados.length === 1 ? (
              <div className="bg-green-50 border border-green-300 rounded-xl p-4">
                <p className="text-sm text-green-800">
                  <span className="font-bold">Tanque: {tanquesFiltrados[0].nome}</span>
                  <span className="block text-xs mt-1">Saldo: {Number(tanquesFiltrados[0].saldo_atual_l).toLocaleString('pt-BR')} L (auto-selecionado)</span>
                </p>
              </div>
            ) : tanquesFiltrados.length > 1 ? (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  TANQUE <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {tanquesFiltrados.map((tanque) => (
                    <button
                      key={tanque.id}
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({
                          ...prev,
                          tanqueId: tanque.id,
                          tanqueNome: tanque.nome,
                        }))
                        setErrors((prev) => prev.filter((e) => e.field !== 'tanqueId'))
                      }}
                      className={`min-h-[50px] px-4 py-3 rounded-xl text-sm font-bold border-2 transition-all text-left ${
                        form.tanqueId === tanque.id
                          ? 'border-[#1a3b2c] bg-[#1a3b2c] text-white'
                          : getError('tanqueId')
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span>{tanque.nome}</span>
                        <span className={`text-xs ${form.tanqueId === tanque.id ? 'text-green-200' : 'text-gray-500'}`}>
                          Saldo: {Number(tanque.saldo_atual_l).toLocaleString('pt-BR')} L
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
                <p className="text-sm text-yellow-800">
                  Nenhum tanque de {form.combustivel} cadastrado. Peça ao gestor para configurar um tanque no painel web.
                </p>
              </div>
            )}
          </>
        )}

        <Input
          label={<span>QUANTIDADE (L) <span className="text-red-500">*</span></span>}
          placeholder="Quantidade em litros"
          value={form.quantidadeL}
          onChange={setDecimalInput('quantidadeL')}
          error={getError('quantidadeL')}
          inputMode="decimal"
        />

        <Input
          label={<span>PREÇO POR LITRO (R$) <span className="text-red-500">*</span></span>}
          placeholder="Ex: 6,50"
          value={form.precoPorLitro}
          onChange={setDecimalInput('precoPorLitro')}
          error={getError('precoPorLitro')}
          inputMode="decimal"
        />

        {form.quantidadeL && form.precoPorLitro && (() => {
          const litros = parseFloat(String(form.quantidadeL).replace(',', '.')) || 0
          const preco = parseFloat(String(form.precoPorLitro).replace(',', '.')) || 0
          const total = litros * preco
          if (total > 0) {
            return (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-sm text-blue-800">
                  <span className="font-bold">Valor total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="block text-xs mt-0.5">{litros.toLocaleString('pt-BR')} L × R$ {preco.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}/L</span>
                </p>
              </div>
            )
          }
          return null
        })()}

        <SearchableModal
          label="FORNECEDOR"
          value={form.fornecedor}
          onChange={(val) => setForm((prev) => ({ ...prev, fornecedor: val }))}
          error={getError('fornecedor')}
          options={fornecedoresOptions}
          placeholder="Buscar fornecedor..."
          disabled={loadingFornecedores}
          id="fornecedor"
          name="fornecedor"
        />

        <Input
          label={<span>PLACA DO VEÍCULO</span>}
          placeholder="Ex: ABC1D23"
          value={form.placaVeiculo}
          onChange={setInput('placaVeiculo')}
          maxLength={8}
        />

        <Input
          label={<span>NOME DO MOTORISTA</span>}
          placeholder="Nome do motorista"
          value={form.nomeMotorista}
          onChange={setInput('nomeMotorista')}
        />

        <Input
          label={<span>NOTA FISCAL</span>}
          placeholder="Número ou chave da NF"
          value={form.notaFiscal}
          onChange={setInput('notaFiscal')}
        />
      </div>

      {/* Seção 2: Observação */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">2. OBSERVAÇÃO</h2>
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
        cadernetaName="Entrada de Combustível"
        registro={registroSalvo}
        caderneta="entrada-combustivel"
      />
    </CadernetaLayout>
  )
}

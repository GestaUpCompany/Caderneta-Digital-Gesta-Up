import { useState, useEffect, useMemo } from 'react'
import { useRefreshTick } from '../../hooks/useRefreshCadastros'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, Radio, ValidationMessage, SearchableModal } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { scrollToFirstError } from '../../utils/scrollToError'
import { getMedicamentosCached, updateMedicamentoSaldoCache } from '../../services/cadastroCache'
import { useCadastroOptions } from '../../hooks/useCadastroOptions'
import { RootState } from '../../store/store'
import { useFormValidation } from '../../hooks/useFormValidation'
import { Save } from 'lucide-react'

const TIPO_OPTIONS = [
  { value: 'entrada', label: 'ENTRADA' },
  { value: 'baixa', label: 'SAÍDA' },
]

interface FormState {
  data: string
  tipoMovimentacao: string
  medicamento: string
  quantidade: string
  custoUnitario: string
  fornecedor: string
  notaFiscal: string
  loteProduto: string
  validade: string
  observacao: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  tipoMovimentacao: '',
  medicamento: '',
  quantidade: '',
  custoUnitario: '',
  fornecedor: '',
  notaFiscal: '',
  loteProduto: '',
  validade: '',
  observacao: '',
})

const rotuloMedicamento = (m: any) => `${m.nome_comercial} (${m.tipo})`

export default function FarmaciaPage() {
  const navigate = useNavigate()
  const { fazendaId } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial)
  const [apiErrors, setApiErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [medicamentos, setMedicamentos] = useState<any[]>([])

  const { options: fornecedoresOptions, loading: loadingFornecedores } = useCadastroOptions('fornecedores', fazendaId)

  const refreshTick = useRefreshTick()
  useEffect(() => {
    async function carregar() {
      if (!fazendaId) return
      try {
        const lista = await getMedicamentosCached(fazendaId)
        if (lista) setMedicamentos(lista)
      } catch (error) {
        console.error('Erro ao carregar medicamentos:', error)
      }
    }
    carregar()
  }, [fazendaId, refreshTick])

  const opcoes = useMemo(() => medicamentos.map(rotuloMedicamento), [medicamentos])
  const selecionado = useMemo(() => medicamentos.find((m) => rotuloMedicamento(m) === form.medicamento), [medicamentos, form.medicamento])
  const ehSaida = form.tipoMovimentacao === 'baixa'

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // Sanitiza campos decimais: permite apenas dígitos e uma vírgula decimal
  const setDecimalInput = (field: 'quantidade' | 'custoUnitario') => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^\d,]/g, '')
    const firstComma = value.indexOf(',')
    if (firstComma !== -1) {
      value = value.slice(0, firstComma + 1) + value.slice(firstComma + 1).replace(/,/g, '')
    }
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const validationRules: any = {
    data: { required: true },
    tipoMovimentacao: { required: true },
    medicamento: {
      required: true,
      custom: (value: string) => (value && !medicamentos.some((m) => rotuloMedicamento(m) === value) ? 'Selecione um medicamento da lista' : null),
    },
    quantidade: {
      required: true,
      custom: (value: string) => {
        const n = parseFloat(String(value).replace(',', '.'))
        return value && (isNaN(n) || n <= 0) ? 'Informe uma quantidade maior que zero' : null
      },
    },
  }

  const { isValid, errors: formErrors } = useFormValidation(form, validationRules)

  const allErrors = useMemo(
    () => [
      ...Object.entries(formErrors).map(([field, message]) => ({ field, message })),
      ...apiErrors,
    ],
    [formErrors, apiErrors]
  )

  const getError = (field: string) =>
    formErrors[field] || apiErrors.find((e) => e.field === field)?.message

  const handleSalvar = async () => {
    if (!selecionado) return
    setSalvando(true)
    setApiErrors([])

    const quantidade = parseFloat(String(form.quantidade).replace(',', '.')) || 0

    const result = await salvarRegistro('farmacia', {
      data: form.data,
      tipoMovimentacao: form.tipoMovimentacao,
      medicamentoId: selecionado.id,
      medicamentoNome: selecionado.nome_comercial,
      unidade: selecionado.unidade || 'un',
      quantidade: form.quantidade,
      custoUnitario: ehSaida ? '' : form.custoUnitario,
      fornecedor: ehSaida ? '' : form.fornecedor,
      notaFiscal: ehSaida ? '' : form.notaFiscal,
      loteProduto: form.loteProduto,
      validade: ehSaida ? '' : form.validade,
      observacao: form.observacao,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setApiErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      // Atualização otimista do saldo no cache; o saldo canônico vem do servidor
      if (fazendaId && quantidade > 0) {
        const delta = ehSaida ? -quantidade : quantidade
        await updateMedicamentoSaldoCache(fazendaId, selecionado.id, delta)
        setMedicamentos((prev) =>
          prev.map((m) => (m.id === selecionado.id ? { ...m, estoque_atual: Number(Number(m.estoque_atual || 0) + delta) } : m))
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
      title="FARMÁCIA"
      cadernetaId="farmacia"
      dateContent={<DatePicker value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} variant="header" compact inline />}
    >
      {allErrors.length > 0 && <ValidationMessage errors={allErrors} />}

      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">1. MOVIMENTO</h2>

        <Radio
          name="tipoMovimentacao"
          label={<span>TIPO <span className="text-red-500">*</span></span>}
          options={TIPO_OPTIONS}
          value={form.tipoMovimentacao}
          onChange={(val) => setForm((prev) => ({ ...prev, tipoMovimentacao: val }))}
          error={getError('tipoMovimentacao')}
          gridCols={2}
        />

        <SearchableModal
          label={<span>MEDICAMENTO / VACINA <span className="text-red-500">*</span></span>}
          value={form.medicamento}
          onChange={(val) => setForm((prev) => ({ ...prev, medicamento: val }))}
          error={getError('medicamento')}
          options={opcoes}
          placeholder="Buscar medicamento..."
          id="medicamento"
          name="medicamento"
        />

        {selecionado && (
          <div className="bg-green-50 border border-green-300 rounded-xl p-4">
            <p className="text-sm text-green-800">
              <span className="font-bold">{selecionado.nome_comercial}</span>
              <span className="block text-xs mt-1">
                {selecionado.controla_estoque
                  ? `Saldo: ${Number(selecionado.estoque_atual || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${selecionado.unidade || 'un'}`
                  : 'Controle de estoque não ativado para este medicamento (o movimento é registrado, mas o saldo só conta após o gestor ativar).'}
              </span>
            </p>
          </div>
        )}

        <Input
          label={<span>QUANTIDADE{selecionado ? ` (${selecionado.unidade || 'un'})` : ''} <span className="text-red-500">*</span></span>}
          placeholder="Quantidade"
          value={form.quantidade}
          onChange={setDecimalInput('quantidade')}
          error={getError('quantidade')}
          inputMode="decimal"
        />

        <Input
          label={<span>LOTE DO PRODUTO</span>}
          placeholder="Número do lote"
          value={form.loteProduto}
          onChange={setInput('loteProduto')}
        />
      </div>

      {!ehSaida && form.tipoMovimentacao && (
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. DADOS DA COMPRA</h2>

          <Input
            label={<span>CUSTO UNITÁRIO (R$)</span>}
            placeholder="Ex: 12,50 (opcional)"
            value={form.custoUnitario}
            onChange={setDecimalInput('custoUnitario')}
            inputMode="decimal"
          />

          <Input
            label={<span>VALIDADE (AAAA-MM-DD)</span>}
            placeholder="Ex: 2027-03-31"
            value={form.validade}
            onChange={setInput('validade')}
          />

          <SearchableModal
            label="FORNECEDOR"
            value={form.fornecedor}
            onChange={(val) => setForm((prev) => ({ ...prev, fornecedor: val }))}
            options={fornecedoresOptions}
            placeholder="Buscar fornecedor..."
            disabled={loadingFornecedores}
            id="fornecedor"
            name="fornecedor"
          />

          <Input
            label={<span>NOTA FISCAL</span>}
            placeholder="Número ou chave da NF"
            value={form.notaFiscal}
            onChange={setInput('notaFiscal')}
          />
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">{ehSaida ? '2' : '3'}. OBSERVAÇÃO</h2>
        <Input
          placeholder={ehSaida ? 'Motivo ou destino da saída (opcional)' : 'Detalhes adicionais (opcional)'}
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
        cadernetaName="Farmácia"
        registro={registroSalvo}
        caderneta="farmacia"
      />
    </CadernetaLayout>
  )
}

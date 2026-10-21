import { useState, useEffect, useMemo } from 'react'
import { useRefreshTick } from '../../hooks/useRefreshCadastros'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, ValidationMessage, SearchableModal } from '../ui'
import SuccessModal from '../SuccessModal'
import CadernetaLayout from '../CadernetaLayout'
import ChoiceGrid from './ChoiceGrid'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { scrollToFirstError } from '../../utils/scrollToError'
import { adicionarMedicamentoCache, getMedicamentosCached, updateMedicamentoSaldoCache } from '../../services/cadastroCache'
import { useCadastroOptions } from '../../hooks/useCadastroOptions'
import { RootState } from '../../store/store'
import { useFormValidation } from '../../hooks/useFormValidation'
import { Plus, Save } from 'lucide-react'

export type ModoFarmacia = 'entrada' | 'baixa'

// Valores do enum medicamento_tipo no banco
const TIPOS_MEDICAMENTO = [
  { value: 'Antibiotico', label: 'ANTIBIÓTICO' },
  { value: 'Vermifugo', label: 'VERMÍFUGO' },
  { value: 'Carrapaticida', label: 'CARRAPATICIDA' },
  { value: 'Vacina', label: 'VACINA' },
  { value: 'Anti_inflamatorio', label: 'ANTI-INFLAMATÓRIO' },
  { value: 'Analgesico', label: 'ANALGÉSICO' },
  { value: 'Hormonio', label: 'HORMÔNIO' },
  { value: 'Vitamina_Mineral', label: 'VITAMINA / MINERAL' },
  { value: 'Probiotico', label: 'PROBIÓTICO' },
  { value: 'Anti_stress', label: 'ANTI-STRESS' },
  { value: 'Coccidiostatico', label: 'COCCIDIOSTÁTICO' },
  { value: 'Fluido_oral', label: 'FLUIDO ORAL' },
  { value: 'Outro', label: 'OUTRO' },
]

const UNIDADES = ['un', 'dose', 'frasco', 'caixa', 'mL', 'L', 'g', 'kg']
const UNIDADES_DIRETAS = ['mL', 'L', 'g', 'kg']

interface FormState {
  data: string
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
const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

interface Props {
  modo: ModoFarmacia
}

export default function FarmaciaForm({ modo }: Props) {
  const navigate = useNavigate()
  const { fazendaId } = useSelector((state: RootState) => state.config)
  const ehSaida = modo === 'baixa'
  const cadernetaId = ehSaida ? 'saida-farmacia' : 'entrada-farmacia'
  const [form, setForm] = useState<FormState>(makeInitial)
  const [apiErrors, setApiErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [medicamentos, setMedicamentos] = useState<any[]>([])

  // Cadastro de medicamento novo (só na entrada)
  const [mostrarNovo, setMostrarNovo] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoTipo, setNovoTipo] = useState('')
  const [novaUnidade, setNovaUnidade] = useState('')
  const [novoConteudo, setNovoConteudo] = useState('')
  const [novoConteudoUn, setNovoConteudoUn] = useState('mL')
  const [novoErro, setNovoErro] = useState<string | null>(null)

  const { options: fornecedoresOptions, loading: loadingFornecedores } = useCadastroOptions('fornecedores', fazendaId)

  const refreshTick = useRefreshTick()
  useEffect(() => {
    async function carregar() {
      if (!fazendaId) return
      try {
        const lista = await getMedicamentosCached(fazendaId)
        // Medicamentos criados neste aparelho e ainda não enviados não vêm do servidor: não os perde ao recarregar
        if (lista) setMedicamentos((prev) => [...lista, ...prev.filter((p) => p.novo && !lista.some((l) => l.id === p.id))])
      } catch (error) {
        console.error('Erro ao carregar medicamentos:', error)
      }
    }
    carregar()
  }, [fazendaId, refreshTick])

  const opcoes = useMemo(() => medicamentos.map(rotuloMedicamento), [medicamentos])
  const selecionado = useMemo(() => medicamentos.find((m) => rotuloMedicamento(m) === form.medicamento), [medicamentos, form.medicamento])

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // Sanitiza campos decimais: permite apenas dígitos e uma vírgula decimal
  const sanitizarDecimal = (texto: string) => {
    let value = texto.replace(/[^\d,]/g, '')
    const firstComma = value.indexOf(',')
    if (firstComma !== -1) value = value.slice(0, firstComma + 1) + value.slice(firstComma + 1).replace(/,/g, '')
    return value
  }
  const setDecimalInput = (field: 'quantidade' | 'custoUnitario') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: sanitizarDecimal(e.target.value) }))

  const validationRules: any = {
    data: { required: true },
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

  const handleAdicionarNovo = () => {
    const nome = novoNome.trim()
    if (!nome) return setNovoErro('Informe o nome do medicamento')
    if (!novoTipo) return setNovoErro('Escolha o tipo')
    if (!novaUnidade) return setNovoErro('Escolha a unidade de medida')
    const existente = medicamentos.find((m) => normalizar(m.nome_comercial) === normalizar(nome))
    if (existente) {
      setForm((prev) => ({ ...prev, medicamento: rotuloMedicamento(existente) }))
      setMostrarNovo(false)
      setNovoErro(null)
      return
    }
    const conteudo = parseFloat(novoConteudo.replace(',', '.'))
    const temConteudo = !UNIDADES_DIRETAS.includes(novaUnidade) && !isNaN(conteudo) && conteudo > 0
    const novo = {
      id: crypto.randomUUID(),
      nome_comercial: nome,
      tipo: novoTipo,
      principio_ativo: '',
      unidade: novaUnidade,
      conteudo_por_unidade: temConteudo ? conteudo : null,
      conteudo_unidade: temConteudo ? novoConteudoUn : null,
      estoque_atual: 0,
      controla_estoque: true,
      novo: true,
    }
    setMedicamentos((prev) => [...prev, novo])
    setForm((prev) => ({ ...prev, medicamento: rotuloMedicamento(novo) }))
    setNovoNome('')
    setNovoTipo('')
    setNovaUnidade('')
    setNovoConteudo('')
    setNovoErro(null)
    setMostrarNovo(false)
  }

  const handleSalvar = async () => {
    if (!selecionado) return
    setSalvando(true)
    setApiErrors([])

    const quantidade = parseFloat(String(form.quantidade).replace(',', '.')) || 0

    const result = await salvarRegistro(cadernetaId, {
      data: form.data,
      tipoMovimentacao: modo,
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
      // Medicamento que ainda não existe no servidor: o sync o cria (RPC criar_medicamento_pwa) antes da movimentação
      novoMedicamento: selecionado.novo
        ? {
            id: selecionado.id,
            nome_comercial: selecionado.nome_comercial,
            tipo: selecionado.tipo,
            unidade: selecionado.unidade,
            conteudo_por_unidade: selecionado.conteudo_por_unidade,
            conteudo_unidade: selecionado.conteudo_unidade,
          }
        : undefined,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setApiErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      if (fazendaId) {
        if (selecionado.novo) await adicionarMedicamentoCache(fazendaId, { ...selecionado, estoque_atual: 0 })
        if (quantidade > 0) {
          const delta = ehSaida ? -quantidade : quantidade
          await updateMedicamentoSaldoCache(fazendaId, selecionado.id, delta)
          setMedicamentos((prev) =>
            prev.map((m) => (m.id === selecionado.id ? { ...m, estoque_atual: Number(Number(m.estoque_atual || 0) + delta) } : m))
          )
        }
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
      title={ehSaida ? 'FARMÁCIA · SAÍDA' : 'FARMÁCIA · ENTRADA'}
      cadernetaId={cadernetaId}
      dateContent={<DatePicker value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} variant="header" compact inline />}
    >
      {allErrors.length > 0 && <ValidationMessage errors={allErrors} />}

      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">1. {ehSaida ? 'O QUE SAIU?' : 'O QUE CHEGOU?'}</h2>

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

        {!ehSaida && !mostrarNovo && (
          <button
            type="button"
            onClick={() => { setMostrarNovo(true); setNovoErro(null) }}
            className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 px-4 py-3 flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-500 transition-colors hover:border-brand-600 hover:text-brand-700 active:scale-[0.99]"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            NÃO ESTÁ NA LISTA? CADASTRAR NOVO
          </button>
        )}

        {!ehSaida && mostrarNovo && (
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col gap-4">
            <h3 className="text-[15px] font-extrabold uppercase tracking-tight text-gray-900">NOVO MEDICAMENTO / VACINA</h3>
            <Input
              label={<span>NOME COMERCIAL <span className="text-red-500">*</span></span>}
              placeholder="Ex: Draxxin 100 mL"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
            />
            <div className="flex flex-col gap-2">
              <p className="text-[15px] font-bold text-gray-900">TIPO <span className="text-red-500">*</span></p>
              <ChoiceGrid options={TIPOS_MEDICAMENTO} value={novoTipo} onChange={setNovoTipo} cols={2} labelSize="xs" showCheck={false} />
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-[15px] font-bold text-gray-900">UNIDADE DE MEDIDA <span className="text-red-500">*</span></p>
              <ChoiceGrid options={UNIDADES.map((u) => ({ value: u, label: u.toUpperCase() }))} value={novaUnidade} onChange={setNovaUnidade} cols={4} labelSize="xs" showCheck={false} />
              <p className="text-xs text-amber-700">Atenção: depois do primeiro lançamento a unidade não pode ser alterada.</p>
            </div>
            {novaUnidade && !UNIDADES_DIRETAS.includes(novaUnidade) && (
              <div className="flex flex-col gap-2">
                <Input
                  label={<span>CONTEÚDO POR {novaUnidade.toUpperCase()} (OPCIONAL)</span>}
                  placeholder="Ex: 100"
                  value={novoConteudo}
                  onChange={(e) => setNovoConteudo(sanitizarDecimal(e.target.value))}
                  inputMode="decimal"
                />
                <ChoiceGrid options={[{ value: 'mL', label: 'ML' }, { value: 'mg', label: 'MG' }]} value={novoConteudoUn} onChange={setNovoConteudoUn} cols={2} labelSize="xs" showCheck={false} />
                <p className="text-xs text-gray-500">Permite a baixa automática pela Enfermaria (ex.: 20 mL aplicados ÷ 100 mL = 0,2 {novaUnidade}).</p>
              </div>
            )}
            {novoErro && <p className="text-sm text-red-500">{novoErro}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAdicionarNovo}
                className="flex-1 rounded-xl bg-green-600 px-3 py-3 text-sm font-bold text-white transition-colors hover:bg-green-700 active:scale-[0.99]"
              >
                USAR ESTE MEDICAMENTO
              </button>
              <button
                type="button"
                onClick={() => { setMostrarNovo(false); setNovoErro(null) }}
                className="rounded-xl bg-gray-200 px-4 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-300 active:scale-[0.99]"
              >
                CANCELAR
              </button>
            </div>
          </div>
        )}

        {selecionado && (
          <div className="bg-green-50 border border-green-300 rounded-xl p-4">
            <p className="text-sm text-green-800">
              <span className="font-bold">{selecionado.nome_comercial}</span>
              {selecionado.novo && <span className="ml-2 rounded-full bg-green-200 px-2 py-0.5 text-[11px] font-bold">NOVO</span>}
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

      {!ehSaida && (
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
        cadernetaName={ehSaida ? 'Saída de Farmácia' : 'Entrada de Farmácia'}
        registro={registroSalvo}
        caderneta={cadernetaId}
      />
    </CadernetaLayout>
  )
}

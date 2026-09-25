import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, Select, DatePicker, Radio, ValidationMessage } from '../../components/ui'
import { Brush, Save } from 'lucide-react'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import BannerRascunho from '../../components/BannerRascunho'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { normalizarNumero } from '../../utils/formatNumber'
import { RootState } from '../../store/store'
import { scrollToFirstError } from '../../utils/scrollToError'
import { useFormValidation } from '../../hooks/useFormValidation'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'

interface FormState {
  data: string
  tipoVenda: string
  vendedor: string
  comprador: string
  vendaDireta: string
  corretora: string
  quantidadePrevista: string
  sexo: string
  idadeEra: string
  dataPrevistaEmbarque: string
  dataPrevistaAbate: string
  precoArroba: string
  dataPrevistaPagamento: string
  observacao: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  tipoVenda: '',
  vendedor: '',
  comprador: '',
  vendaDireta: 'S',
  corretora: '',
  quantidadePrevista: '',
  sexo: '',
  idadeEra: '',
  dataPrevistaEmbarque: '',
  dataPrevistaAbate: '',
  precoArroba: '',
  dataPrevistaPagamento: '',
  observacao: '',
})

export default function ComunicadoVendaPage() {
  const navigate = useNavigate()
  const { usuario } = useSelector((state: RootState) => state.config)
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'comunicado-venda', makeInitial })
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const validationRules: any = {
    data: { required: true },
    tipoVenda: { required: true },
    vendedor: { required: true },
    comprador: { required: true },
    quantidadePrevista: {
      required: true,
      custom: (v: string) => {
        const n = Number(v)
        return !v || isNaN(n) || n <= 0 ? 'Quantidade deve ser maior que zero' : null
      },
    },
    sexo: { required: true },
    idadeEra: { required: true },
    dataPrevistaEmbarque: { required: true },
    dataPrevistaAbate: {
      custom: (_v: string, f: FormState) =>
        f.tipoVenda === 'abate' && !f.dataPrevistaAbate ? 'Campo obrigatório' : null,
    },
    corretora: {
      custom: (_v: string, f: FormState) =>
        f.vendaDireta === 'N' && !f.corretora.trim() ? 'Campo obrigatório' : null,
    },
    _responsavel: {
      custom: () => (!usuario || usuario.trim() === '') ? 'Responsável é obrigatório' : null,
    },
  }

  const { isValid } = useFormValidation(form, validationRules)

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const result = await salvarRegistro('ordens-servico', {
      // uuid real: a pesagem pode referenciar a OS como FK antes do sync
      id: crypto.randomUUID(),
      data: form.data,
      usuario: usuario,
      tipo: 'venda',
      tipoVenda: form.tipoVenda,
      vendedor: form.vendedor.trim(),
      comprador: form.comprador.trim(),
      vendaDireta: form.vendaDireta === 'S',
      corretora: form.vendaDireta === 'N' ? form.corretora.trim() : null,
      quantidadePrevista: Number(form.quantidadePrevista),
      sexo: form.sexo,
      idadeEra: form.idadeEra,
      dataPrevistaEmbarque: form.dataPrevistaEmbarque,
      dataPrevistaAbate: form.tipoVenda === 'abate' ? form.dataPrevistaAbate : null,
      precoArroba: normalizarNumero(form.precoArroba),
      dataPrevistaPagamento: form.dataPrevistaPagamento || null,
      observacao: form.observacao.trim() || null,
      statusOs: 'aberta',
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      limparRascunho()
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
    <>
      <CadernetaLayout
        title="COMUNICADO DE VENDA"
        cadernetaId="comunicado-venda"
        dateContent={<DatePicker value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} variant="header" compact inline />}
      >
        <BannerRascunho
          visible={rascunhoRestaurado}
          onConfirmar={confirmarRascunho}
          onDescartar={descartarRascunho}
        />
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: Tipo da venda */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <Radio
            name="tipoVenda"
            label={<span>1. TIPO DA VENDA <span className="text-red-500">*</span></span>}
            value={form.tipoVenda}
            onChange={(v) => setForm((prev) => ({ ...prev, tipoVenda: v }))}
            error={getError('tipoVenda')}
            options={[
              { value: 'abate', label: 'ABATE' },
              { value: 'animal_vivo', label: 'ANIMAL VIVO' },
            ]}
            gridCols={2}
          />
        </div>

        {/* Seção 2: Partes */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. PARTES</h2>
          <Input
            label={<span>VENDEDOR <span className="text-red-500">*</span></span>}
            placeholder="Ex: Fazenda Boa Vista"
            value={form.vendedor}
            onChange={setInput('vendedor')}
            error={getError('vendedor')}
          />
          <Input
            label={<span>EMPRESA <span className="text-red-500">*</span></span>}
            placeholder="Ex: Frigorífico Pantanal / Fazenda Y"
            value={form.comprador}
            onChange={setInput('comprador')}
            error={getError('comprador')}
          />
          <Radio
            name="vendaDireta"
            label="VENDA DIRETA?"
            value={form.vendaDireta}
            onChange={(v) => setForm((prev) => ({ ...prev, vendaDireta: v }))}
            options={[
              { value: 'S', label: 'SIM (DIRETA)' },
              { value: 'N', label: 'NÃO (COM CORRETORA)' },
            ]}
            gridCols={2}
          />
          {form.vendaDireta === 'N' && (
            <Input
              label={<span>CORRETORA/INTERMEDIÁRIO <span className="text-red-500">*</span></span>}
              placeholder="Nome da corretora ou intermediário"
              value={form.corretora}
              onChange={setInput('corretora')}
              error={getError('corretora')}
            />
          )}
        </div>

        {/* Seção 3: Animais */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. ANIMAIS</h2>
          <Input
            label={<span>QUANTIDADE DE ANIMAIS <span className="text-red-500">*</span></span>}
            placeholder="Ex: 50"
            value={form.quantidadePrevista}
            onChange={setInput('quantidadePrevista')}
            error={getError('quantidadePrevista')}
            type="number"
            inputMode="numeric"
          />
          <Select
            label="SEXO *"
            value={form.sexo}
            onChange={(e) => setForm((prev) => ({ ...prev, sexo: e.target.value }))}
            error={getError('sexo')}
            options={[
              { value: '', label: 'Selecione...' },
              { value: 'Macho', label: 'Macho' },
              { value: 'Fêmea', label: 'Fêmea' },
              { value: 'Misto', label: 'Misto' },
            ]}
          />
          <Select
            label="IDADE (ERA) *"
            value={form.idadeEra}
            onChange={(e) => setForm((prev) => ({ ...prev, idadeEra: e.target.value }))}
            error={getError('idadeEra')}
            options={[
              { value: '', label: 'Selecione...' },
              { value: '0-4m', label: '0 a 4 meses' },
              { value: '5-12m', label: '5 a 12 meses' },
              { value: '13-24m', label: '13 a 24 meses' },
              { value: '25-36m', label: '25 a 36 meses' },
              { value: '>36m', label: 'Mais de 36 meses' },
            ]}
          />
          <p className="text-sm text-gray-500">
            Um comunicado representa um único perfil de animais. Para perfis mistos, crie um comunicado separado para cada perfil.
          </p>
        </div>

        {/* Seção 4: Datas e valores */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. DATAS E VALORES</h2>
          <DatePicker
            label={<span>DATA PREVISTA DE EMBARQUE <span className="text-red-500">*</span></span>}
            value={form.dataPrevistaEmbarque}
            onChange={(val) => setForm((prev) => ({ ...prev, dataPrevistaEmbarque: val }))}
            error={getError('dataPrevistaEmbarque')}
          />
          {form.tipoVenda === 'abate' && (
            <DatePicker
              label={<span>DATA PREVISTA DE ABATE <span className="text-red-500">*</span></span>}
              value={form.dataPrevistaAbate}
              onChange={(val) => setForm((prev) => ({ ...prev, dataPrevistaAbate: val }))}
              error={getError('dataPrevistaAbate')}
            />
          )}
          <Input
            label="PREÇO POR ARROBA (R$)"
            placeholder="Ex: 315,00"
            value={form.precoArroba}
            onChange={setInput('precoArroba')}
            error={getError('precoArroba')}
            inputMode="decimal"
          />
          <DatePicker
            label="DATA PREVISTA DE PAGAMENTO"
            value={form.dataPrevistaPagamento}
            onChange={(val) => setForm((prev) => ({ ...prev, dataPrevistaPagamento: val }))}
            error={getError('dataPrevistaPagamento')}
          />
        </div>

        {/* Seção 5: Observação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">5. OBSERVAÇÃO</h2>
          <Input
            label=""
            placeholder="Adicione observações (opcional)"
            value={form.observacao}
            onChange={setInput('observacao')}
            error={getError('observacao')}
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
          <button
            type="button"
            onClick={() => limparRascunho()}
            className="w-full !min-h-0 rounded-2xl border-2 border-gray-300 bg-gray-200 px-3 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-300 active:scale-95"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Brush className="h-4 w-4" strokeWidth={2.5} />
              LIMPAR
            </span>
          </button>
        </div>
        {!isValid && (
          <p className="text-base text-gray-600 text-center">
            <span className="text-red-500">*</span> Preencha todos os campos obrigatórios para salvar
          </p>
        )}
      </CadernetaLayout>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Comunicado de Venda"
        registro={registroSalvo}
        caderneta="ordens-servico"
      />
    </>
  )
}

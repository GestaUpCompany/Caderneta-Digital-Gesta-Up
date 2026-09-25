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
  // Origem
  origemFazenda: string
  fornecedor: string
  origemLocalizacao: string
  origemMunicipioUf: string
  // Animais
  quantidadePrevista: string
  sexo: string
  idadeEra: string
  categoria: string
  raca: string
  jejumHoras: string
  tipoPesagem: string
  // Preço
  modoPreco: string
  valorKg: string
  pesoMedioUa: string
  valorUa: string
  valorTotalPrevisto: string
  // Pagamento
  formaPagamento: string
  favorecidoNome: string
  favorecidoCpfCnpj: string
  favorecidoBanco: string
  favorecidoPixConta: string
  // Transporte
  transportadora: string
  motorista: string
  tipoVeiculo: string
  placaVeiculo: string
  placaReboque: string
  dataSaida: string
  dataChegadaPrevista: string
  distanciaKm: string
  valorFrete: string
  // Corretagem
  temCorretor: string
  corretorNome: string
  corretorComissao: string
  corretorDadosBancarios: string
  // Extras
  historicoNutricional: string
  despesas: string
  observacao: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  origemFazenda: '',
  fornecedor: '',
  origemLocalizacao: '',
  origemMunicipioUf: '',
  quantidadePrevista: '',
  sexo: '',
  idadeEra: '',
  categoria: '',
  raca: '',
  jejumHoras: '',
  tipoPesagem: 'coletivo',
  modoPreco: '',
  valorKg: '',
  pesoMedioUa: '',
  valorUa: '',
  valorTotalPrevisto: '',
  formaPagamento: '',
  favorecidoNome: '',
  favorecidoCpfCnpj: '',
  favorecidoBanco: '',
  favorecidoPixConta: '',
  transportadora: '',
  motorista: '',
  tipoVeiculo: '',
  placaVeiculo: '',
  placaReboque: '',
  dataSaida: '',
  dataChegadaPrevista: '',
  distanciaKm: '',
  valorFrete: '',
  temCorretor: 'N',
  corretorNome: '',
  corretorComissao: '',
  corretorDadosBancarios: '',
  historicoNutricional: '',
  despesas: '',
  observacao: '',
})

export default function ComunicadoCompraPage() {
  const navigate = useNavigate()
  const { usuario } = useSelector((state: RootState) => state.config)
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'comunicado-compra', makeInitial })
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const validationRules: any = {
    data: { required: true },
    origemFazenda: { required: true },
    fornecedor: { required: true },
    quantidadePrevista: {
      required: true,
      custom: (v: string) => {
        const n = Number(v)
        return !v || isNaN(n) || n <= 0 ? 'Quantidade deve ser maior que zero' : null
      },
    },
    sexo: { required: true },
    modoPreco: { required: true },
    dataChegadaPrevista: { required: true },
    valorUa: {
      custom: (_v: string, f: FormState) =>
        f.modoPreco === 'por_ua' && !f.valorUa.trim() ? 'Informe o valor por UA' : null,
    },
    pesoMedioUa: {
      custom: (_v: string, f: FormState) =>
        f.modoPreco === 'por_ua' && !f.pesoMedioUa.trim() ? 'Informe o peso médio para UA' : null,
    },
    valorKg: {
      custom: (_v: string, f: FormState) =>
        f.modoPreco === 'por_kg' && !f.valorKg.trim() ? 'Informe o valor por KG' : null,
    },
    corretorNome: {
      custom: (_v: string, f: FormState) =>
        f.temCorretor === 'S' && !f.corretorNome.trim() ? 'Campo obrigatório' : null,
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
      // uuid real: recebimentos referenciam a OS como FK antes do sync
      id: crypto.randomUUID(),
      data: form.data,
      usuario: usuario,
      tipo: 'compra',
      fornecedor: form.fornecedor.trim(),
      origemFazenda: form.origemFazenda.trim(),
      origemMunicipioUf: form.origemMunicipioUf.trim() || null,
      quantidadePrevista: Number(form.quantidadePrevista),
      sexo: form.sexo,
      idadeEra: form.idadeEra || null,
      modoPreco: form.modoPreco,
      valorTotalPrevisto: normalizarNumero(form.valorTotalPrevisto),
      formaPagamento: form.formaPagamento || null,
      dataSaida: form.dataSaida || null,
      dataPrevistaEmbarque: form.dataChegadaPrevista,
      valorFrete: normalizarNumero(form.valorFrete),
      observacao: form.observacao.trim() || null,
      statusOs: 'aberta',
      compraDetalhes: {
        origemLocalizacao: form.origemLocalizacao.trim() || null,
        categoria: form.categoria || null,
        raca: form.raca.trim() || null,
        jejumHoras: form.jejumHoras ? Number(form.jejumHoras) : null,
        tipoPesagem: form.tipoPesagem || null,
        valorKg: normalizarNumero(form.valorKg),
        pesoMedioUa: normalizarNumero(form.pesoMedioUa),
        valorUa: normalizarNumero(form.valorUa),
        favorecido: {
          nome: form.favorecidoNome.trim() || null,
          cpfCnpj: form.favorecidoCpfCnpj.trim() || null,
          banco: form.favorecidoBanco.trim() || null,
          pixConta: form.favorecidoPixConta.trim() || null,
        },
        transporte: {
          transportadora: form.transportadora.trim() || null,
          motorista: form.motorista.trim() || null,
          tipoVeiculo: form.tipoVeiculo.trim() || null,
          placaVeiculo: form.placaVeiculo.trim() || null,
          placaReboque: form.placaReboque.trim() || null,
          distanciaKm: normalizarNumero(form.distanciaKm),
        },
        corretor: form.temCorretor === 'S'
          ? {
              nome: form.corretorNome.trim(),
              comissao: normalizarNumero(form.corretorComissao),
              dadosBancarios: form.corretorDadosBancarios.trim() || null,
            }
          : null,
        historicoNutricional: form.historicoNutricional.trim() || null,
        despesas: form.despesas.trim() || null,
      },
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
        title="COMUNICADO DE COMPRA"
        cadernetaId="comunicado-compra"
        dateContent={<DatePicker value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} variant="header" compact inline />}
      >
        <BannerRascunho
          visible={rascunhoRestaurado}
          onConfirmar={confirmarRascunho}
          onDescartar={descartarRascunho}
        />
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: Origem */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. ORIGEM</h2>
          <Input
            label={<span>FAZENDA DE ORIGEM <span className="text-red-500">*</span></span>}
            placeholder="Ex: Fazenda Boa Vista"
            value={form.origemFazenda}
            onChange={setInput('origemFazenda')}
            error={getError('origemFazenda')}
          />
          <Input
            label={<span>PROPRIETÁRIO/FORNECEDOR <span className="text-red-500">*</span></span>}
            placeholder="Nome do proprietário"
            value={form.fornecedor}
            onChange={setInput('fornecedor')}
            error={getError('fornecedor')}
          />
          <Input
            label="LOCALIZAÇÃO"
            placeholder="Ex: Zona Rural, km 12"
            value={form.origemLocalizacao}
            onChange={setInput('origemLocalizacao')}
          />
          <Input
            label="MUNICÍPIO/UF"
            placeholder="Ex: Cáceres/MT"
            value={form.origemMunicipioUf}
            onChange={setInput('origemMunicipioUf')}
          />
        </div>

        {/* Seção 2: Animais */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. ANIMAIS</h2>
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
            label="IDADE (ERA)"
            value={form.idadeEra}
            onChange={(e) => setForm((prev) => ({ ...prev, idadeEra: e.target.value }))}
            options={[
              { value: '', label: 'Selecione...' },
              { value: '0-4m', label: '0 a 4 meses' },
              { value: '5-12m', label: '5 a 12 meses' },
              { value: '13-24m', label: '13 a 24 meses' },
              { value: '25-36m', label: '25 a 36 meses' },
              { value: '>36m', label: 'Mais de 36 meses' },
            ]}
          />
          <Input
            label="CATEGORIA"
            placeholder="Ex: Garrote, Novilha, Boi Magro"
            value={form.categoria}
            onChange={setInput('categoria')}
          />
          <Input
            label="RAÇA"
            placeholder="Ex: Nelore"
            value={form.raca}
            onChange={setInput('raca')}
          />
          <Input
            label="JEJUM (HORAS)"
            placeholder="Ex: 12"
            value={form.jejumHoras}
            onChange={setInput('jejumHoras')}
            type="number"
            inputMode="numeric"
          />
          <Radio
            name="tipoPesagem"
            label="TIPO DE PESAGEM PREVISTO"
            value={form.tipoPesagem}
            onChange={(v) => setForm((prev) => ({ ...prev, tipoPesagem: v }))}
            options={[
              { value: 'coletivo', label: 'COLETIVO (BALANÇO)' },
              { value: 'individual', label: 'INDIVIDUAL' },
            ]}
            gridCols={2}
          />
        </div>

        {/* Seção 3: Preço */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. PREÇO</h2>
          <Radio
            name="modoPreco"
            label={<span>MODO DE PREÇO <span className="text-red-500">*</span></span>}
            value={form.modoPreco}
            onChange={(v) => setForm((prev) => ({ ...prev, modoPreco: v }))}
            error={getError('modoPreco')}
            options={[
              { value: 'por_kg', label: 'POR KG' },
              { value: 'por_ua', label: 'POR UA' },
            ]}
            gridCols={2}
          />
          {form.modoPreco === 'por_kg' && (
            <Input
              label={<span>VALOR POR KG (R$) <span className="text-red-500">*</span></span>}
              placeholder="Ex: 9,80"
              value={form.valorKg}
              onChange={setInput('valorKg')}
              error={getError('valorKg')}
              inputMode="decimal"
            />
          )}
          {form.modoPreco === 'por_ua' && (
            <>
              <Input
                label={<span>PESO MÉDIO PARA UA (KG/CAB) <span className="text-red-500">*</span></span>}
                placeholder="Ex: 450"
                value={form.pesoMedioUa}
                onChange={setInput('pesoMedioUa')}
                error={getError('pesoMedioUa')}
                inputMode="decimal"
              />
              <Input
                label={<span>VALOR POR UA (R$) <span className="text-red-500">*</span></span>}
                placeholder="Ex: 3.500,00"
                value={form.valorUa}
                onChange={setInput('valorUa')}
                error={getError('valorUa')}
                inputMode="decimal"
              />
            </>
          )}
          <Input
            label="VALOR TOTAL PREVISTO (R$)"
            placeholder="Ex: 175.000,00"
            value={form.valorTotalPrevisto}
            onChange={setInput('valorTotalPrevisto')}
            error={getError('valorTotalPrevisto')}
            inputMode="decimal"
          />
        </div>

        {/* Seção 4: Pagamento */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. PAGAMENTO</h2>
          <Select
            label="FORMA DE PAGAMENTO"
            value={form.formaPagamento}
            onChange={(e) => setForm((prev) => ({ ...prev, formaPagamento: e.target.value }))}
            error={getError('formaPagamento')}
            options={[
              { value: '', label: 'Selecione...' },
              { value: 'pix', label: 'PIX' },
              { value: 'boleto', label: 'Boleto' },
              { value: 'ted', label: 'TED' },
              { value: 'dinheiro', label: 'Dinheiro' },
            ]}
          />
          <Input
            label="FAVORECIDO (NOME)"
            placeholder="Nome do favorecido"
            value={form.favorecidoNome}
            onChange={setInput('favorecidoNome')}
          />
          <Input
            label="CPF/CNPJ DO FAVORECIDO"
            placeholder="Ex: 123.456.789-00"
            value={form.favorecidoCpfCnpj}
            onChange={setInput('favorecidoCpfCnpj')}
          />
          <Input
            label="BANCO"
            placeholder="Ex: Banco do Brasil"
            value={form.favorecidoBanco}
            onChange={setInput('favorecidoBanco')}
          />
          <Input
            label="CHAVE PIX / CONTA"
            placeholder="Chave PIX ou agência e conta"
            value={form.favorecidoPixConta}
            onChange={setInput('favorecidoPixConta')}
          />
        </div>

        {/* Seção 5: Transporte */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">5. TRANSPORTE</h2>
          <Input
            label="TRANSPORTADORA"
            placeholder="Nome da transportadora"
            value={form.transportadora}
            onChange={setInput('transportadora')}
          />
          <Input
            label="MOTORISTA"
            placeholder="Nome do motorista"
            value={form.motorista}
            onChange={setInput('motorista')}
          />
          <Input
            label="TIPO DE VEÍCULO"
            placeholder="Ex: Bitrem, Truck"
            value={form.tipoVeiculo}
            onChange={setInput('tipoVeiculo')}
          />
          <Input
            label="PLACA DO VEÍCULO"
            placeholder="Ex: ABC-1234"
            value={form.placaVeiculo}
            onChange={setInput('placaVeiculo')}
          />
          <Input
            label="PLACA DO REBOQUE"
            placeholder="Ex: DEF-5678"
            value={form.placaReboque}
            onChange={setInput('placaReboque')}
          />
          <DatePicker
            label="DATA DE SAÍDA"
            value={form.dataSaida}
            onChange={(val) => setForm((prev) => ({ ...prev, dataSaida: val }))}
          />
          <DatePicker
            label={<span>DATA PREVISTA DE CHEGADA <span className="text-red-500">*</span></span>}
            value={form.dataChegadaPrevista}
            onChange={(val) => setForm((prev) => ({ ...prev, dataChegadaPrevista: val }))}
            error={getError('dataChegadaPrevista')}
          />
          <Input
            label="DISTÂNCIA (KM)"
            placeholder="Ex: 350"
            value={form.distanciaKm}
            onChange={setInput('distanciaKm')}
            inputMode="decimal"
          />
          <Input
            label="VALOR DO FRETE (R$)"
            placeholder="Ex: 4.500,00"
            value={form.valorFrete}
            onChange={setInput('valorFrete')}
            inputMode="decimal"
          />
        </div>

        {/* Seção 6: Corretagem */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">6. CORRETAGEM</h2>
          <Radio
            name="temCorretor"
            label="TEM CORRETOR?"
            value={form.temCorretor}
            onChange={(v) => setForm((prev) => ({ ...prev, temCorretor: v }))}
            options={[
              { value: 'S', label: 'SIM' },
              { value: 'N', label: 'NÃO' },
            ]}
            gridCols={2}
          />
          {form.temCorretor === 'S' && (
            <>
              <Input
                label={<span>CORRETOR <span className="text-red-500">*</span></span>}
                placeholder="Nome do corretor"
                value={form.corretorNome}
                onChange={setInput('corretorNome')}
                error={getError('corretorNome')}
              />
              <Input
                label="COMISSÃO (%)"
                placeholder="Ex: 2"
                value={form.corretorComissao}
                onChange={setInput('corretorComissao')}
                inputMode="decimal"
              />
              <Input
                label="DADOS BANCÁRIOS DO CORRETOR"
                placeholder="Banco, agência, conta ou PIX"
                value={form.corretorDadosBancarios}
                onChange={setInput('corretorDadosBancarios')}
              />
            </>
          )}
        </div>

        {/* Seção 7: Extras */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">7. HISTÓRICO E DESPESAS</h2>
          <Input
            label="HISTÓRICO NUTRICIONAL"
            placeholder="Ex: Ração + sal mineral, há 60 dias"
            value={form.historicoNutricional}
            onChange={setInput('historicoNutricional')}
          />
          <Input
            label="DESPESAS"
            placeholder="Alimentação, hospedagem, combustível, outras"
            value={form.despesas}
            onChange={setInput('despesas')}
          />
          <Input
            label="OBSERVAÇÃO"
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
        cadernetaName="Comunicado de Compra"
        registro={registroSalvo}
        caderneta="ordens-servico"
      />
    </>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, Select, DatePicker, ValidationMessage } from '../../components/ui'
import { Brush, Save } from 'lucide-react'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import BannerRascunho from '../../components/BannerRascunho'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import { scrollToFirstError } from '../../utils/scrollToError'
import { useFormValidation } from '../../hooks/useFormValidation'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { getFazendasDoMesmoGrupoCached } from '../../services/cadastroCache'

interface FormState {
  data: string
  solicitante: string
  fazendaDestinoId: string
  quantidadePrevista: string
  sexo: string
  idadeEra: string
  dataSaida: string           // embarque na origem
  dataPrevistaEmbarque: string // chegada prevista no destino
  observacao: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  solicitante: '',
  fazendaDestinoId: '',
  quantidadePrevista: '',
  sexo: '',
  idadeEra: '',
  dataSaida: '',
  dataPrevistaEmbarque: '',
  observacao: '',
})

export default function ComunicadoTransferenciaPage() {
  const navigate = useNavigate()
  const { usuario, fazendaId, acessoComercial } = useSelector((state: RootState) => state.config)
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'comunicado-transferencia', makeInitial })
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [fazendasDestino, setFazendasDestino] = useState<{ id: string; nome: string }[] | null>(null)

  // Transferência só existe entre fazendas do mesmo grupo: precisa de ao
  // menos uma outra fazenda ativa no grupo da fazenda atual.
  useEffect(() => {
    if (!fazendaId) return
    getFazendasDoMesmoGrupoCached(fazendaId)
      .then((lista) => setFazendasDestino(lista || []))
      .catch(() => setFazendasDestino([]))
  }, [fazendaId])

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const validationRules: any = {
    data: { required: true },
    solicitante: { required: true },
    fazendaDestinoId: { required: true },
    quantidadePrevista: {
      required: true,
      custom: (v: string) => {
        const n = Number(v)
        return !v || isNaN(n) || n <= 0 ? 'Quantidade deve ser maior que zero' : null
      },
    },
    sexo: { required: true },
    idadeEra: { required: true },
    dataSaida: { required: true },
    dataPrevistaEmbarque: { required: true },
    _responsavel: {
      custom: () => (!usuario || usuario.trim() === '') ? 'Responsável é obrigatório' : null,
    },
  }

  const { isValid } = useFormValidation(form, validationRules)

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const fazendaDestinoNome = fazendasDestino?.find((f) => f.id === form.fazendaDestinoId)?.nome || null

    const result = await salvarRegistro('ordens-servico', {
      // uuid real: a pesagem pode referenciar a OS como FK antes do sync
      id: crypto.randomUUID(),
      data: form.data,
      usuario: usuario,
      tipo: 'transferencia',
      vendedor: form.solicitante.trim(), // solicitante da transferência
      fazendaDestinoId: form.fazendaDestinoId,
      fazendaDestinoNome,
      quantidadePrevista: Number(form.quantidadePrevista),
      sexo: form.sexo,
      idadeEra: form.idadeEra,
      dataSaida: form.dataSaida,
      dataPrevistaEmbarque: form.dataPrevistaEmbarque,
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

  // Sem acesso comercial ou sem outra fazenda no grupo: tela bloqueada.
  if (acessoComercial === false || (fazendasDestino !== null && fazendasDestino.length === 0)) {
    return (
      <CadernetaLayout
        title="COMUNICADO DE TRANSFERÊNCIA"
        cadernetaId="comunicado-transferencia"
      >
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-3 text-center">
          <p className="text-lg font-black text-gray-900">Transferência indisponível</p>
          <p className="text-sm text-gray-600">
            A transferência de animais é feita entre fazendas do mesmo grupo.
            Esta fazenda não pertence a um grupo com outra fazenda ativa.
          </p>
        </div>
      </CadernetaLayout>
    )
  }

  return (
    <>
      <CadernetaLayout
        title="COMUNICADO DE TRANSFERÊNCIA"
        cadernetaId="comunicado-transferencia"
        dateContent={<DatePicker value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} variant="header" compact inline />}
      >
        <BannerRascunho
          visible={rascunhoRestaurado}
          onConfirmar={confirmarRascunho}
          onDescartar={descartarRascunho}
        />
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: Partes */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. PARTES</h2>
          <Input
            label={<span>SOLICITANTE <span className="text-red-500">*</span></span>}
            placeholder="Quem negociou a transferência"
            value={form.solicitante}
            onChange={setInput('solicitante')}
            error={getError('solicitante')}
          />
          <Select
            label="FAZENDA DE DESTINO *"
            value={form.fazendaDestinoId}
            onChange={(e) => setForm((prev) => ({ ...prev, fazendaDestinoId: e.target.value }))}
            error={getError('fazendaDestinoId')}
            options={[
              { value: '', label: fazendasDestino === null ? 'Carregando fazendas do grupo...' : 'Selecionar fazenda do grupo...' },
              ...(fazendasDestino || []).map((f) => ({ value: f.id, label: f.nome })),
            ]}
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
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          <p className="text-sm text-gray-500">
            Um comunicado representa um único perfil de animais. Para perfis mistos, crie um comunicado separado para cada perfil.
          </p>
        </div>

        {/* Seção 3: Datas */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. DATAS</h2>
          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label={<span>DATA EMBARQUE <span className="text-red-500">*</span></span>}
              value={form.dataSaida}
              onChange={(val) => setForm((prev) => ({ ...prev, dataSaida: val }))}
              error={getError('dataSaida')}
              compact
            />
            <DatePicker
              label={<span>CHEGADA NO DESTINO <span className="text-red-500">*</span></span>}
              value={form.dataPrevistaEmbarque}
              onChange={(val) => setForm((prev) => ({ ...prev, dataPrevistaEmbarque: val }))}
              error={getError('dataPrevistaEmbarque')}
              compact
            />
          </div>
        </div>

        {/* Seção 4: Observação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. OBSERVAÇÃO</h2>
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
        cadernetaName="Comunicado de Transferência"
        registro={registroSalvo}
        caderneta="ordens-servico"
      />
    </>
  )
}

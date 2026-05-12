import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, ValidationMessage } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { scrollToFirstError } from '../../utils/scrollToError'

const SETOR_OPTIONS = [
  { value: 'Gado', label: 'GADO' },
  { value: 'Máquinas', label: 'MÁQUINAS' },
  { value: 'ADM', label: 'ADM' },
  { value: 'Fábrica', label: 'FÁBRICA' },
  { value: 'Manutenção', label: 'MANUTENÇÃO' },
  { value: 'Terceirizado', label: 'TERCEIRIZADO' },
]

const SN_OPTIONS = [
  { value: 'S', label: 'SIM', icon: '✅' },
  { value: 'N', label: 'NÃO', icon: '❌' },
]

const TIPO_OCORRENCIA_OPTIONS = [
  { value: 'Única', label: 'ÚNICA' },
  { value: 'Repetitiva', label: 'REPETITIVA' },
]

const GRAVIDADE_OPTIONS = [
  { value: 'baixa', label: 'BAIXA' },
  { value: 'média', label: 'MÉDIA' },
  { value: 'alta', label: 'ALTA' },
]

const TIPO_PROBLEMA_OPTIONS = [
  { value: 'Estrutural', label: 'ESTRUTURAL' },
  { value: 'Máquinas', label: 'MÁQUINAS' },
  { value: 'Processos', label: 'PROCESSOS' },
  { value: 'Rebanho', label: 'REBANHO' },
]

interface FormState {
  data: string
  setor: string
  local: string
  descricaoProblema: string
  causaIdentificada: string
  causaIdentificadaObs: string
  acaoCorretivaRealizada: string
  acaoCorretivaRealizadaObs: string
  tipoOcorrencia: string
  tipoOcorrenciaObs: string
  causaRaizIdentificada: string
  causaRaizIdentificadaObs: string
  gravidadeImpacto: string
  gravidadeImpactoObs: string
  tipoProblema: string
  tipoProblemaObs: string
  prioridade: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  setor: '',
  local: '',
  descricaoProblema: '',
  causaIdentificada: '',
  causaIdentificadaObs: '',
  acaoCorretivaRealizada: '',
  acaoCorretivaRealizadaObs: '',
  tipoOcorrencia: '',
  tipoOcorrenciaObs: '',
  causaRaizIdentificada: '',
  causaRaizIdentificadaObs: '',
  gravidadeImpacto: '',
  gravidadeImpactoObs: '',
  tipoProblema: '',
  tipoProblemaObs: '',
  prioridade: '',
})

export default function ProblemasPage() {
  const navigate = useNavigate()
  const { usuario, fazenda, logoUrl } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const result = await salvarRegistro('problemas', {
      data: form.data,
      setor: form.setor,
      local: form.local,
      descricaoProblema: form.descricaoProblema,
      causaIdentificada: form.causaIdentificada,
      causaIdentificadaObs: form.causaIdentificadaObs || '',
      acaoCorretivaRealizada: form.acaoCorretivaRealizada,
      acaoCorretivaRealizadaObs: form.acaoCorretivaRealizadaObs || '',
      tipoOcorrencia: form.tipoOcorrencia,
      tipoOcorrenciaObs: form.tipoOcorrenciaObs || '',
      causaRaizIdentificada: form.causaRaizIdentificada,
      causaRaizIdentificadaObs: form.causaRaizIdentificadaObs || '',
      gravidadeImpacto: form.gravidadeImpacto,
      gravidadeImpactoObs: form.gravidadeImpactoObs || '',
      tipoProblema: form.tipoProblema,
      tipoProblemaObs: form.tipoProblemaObs || '',
      prioridade: form.prioridade,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      setForm(makeInitial())
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
      {/* Header sticky com botões e título */}
      <div className="sticky top-0 z-10 bg-[#1a3a2a] text-white px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-yellow-400 font-bold text-sm min-h-[40px] px-3"
          >
            VOLTAR
          </button>
          <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2">PROBLEMAS</h1>
          <button
            onClick={() => navigate('/caderneta/problemas/lista')}
            className="text-yellow-400 font-bold text-sm min-h-[40px] px-3 -mr-2"
          >
            REGISTROS
          </button>
        </div>
      </div>

      {/* Logos não sticky */}
      <div className="bg-[#1a3a2a] text-white px-4 py-5">
        <div className="flex items-center justify-center gap-8">
          <FarmLogo
            farmName={fazenda}
            logoUrl={logoUrl}
            type="both"
            size="medium"
          />
        </div>
      </div>

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8">
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: Dados Principais */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          {usuario && (
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <span className="text-xl">👤</span>
              <p className="text-gray-700 font-semibold">{usuario}</p>
            </div>
          )}
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS PRINCIPAIS</h2>
          <DatePicker label="DATA" value={form.data} onChange={set('data')} error={getError('data')} />
          <Radio
            name="setor"
            label="EM QUAL SETOR HOUVE PROBLEMA?"
            options={SETOR_OPTIONS}
            value={form.setor}
            onChange={set('setor')}
            error={getError('setor')}
            gridCols={2}
          />
          <Input
            label="LOCAL?"
            placeholder="Informe o local..."
            value={form.local}
            onChange={setInput('local')}
            error={getError('local')}
          />
          <Input
            label="DESCRIÇÃO DO PROBLEMA?"
            placeholder="Descreva o problema..."
            value={form.descricaoProblema}
            onChange={setInput('descricaoProblema')}
            error={getError('descricaoProblema')}
          />
        </div>

        {/* Seção 2: Análise do Problema */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. ANÁLISE DO PROBLEMA</h2>
          
          <div>
            <Radio
              name="causaIdentificada"
              label="CAUSA IDENTIFICADA?"
              options={SN_OPTIONS}
              value={form.causaIdentificada}
              onChange={set('causaIdentificada')}
              error={getError('causaIdentificada')}
              gridCols={2}
            />
            {form.causaIdentificada === 'S' && (
              <Input
                placeholder="Adicionar observação (opcional)"
                value={form.causaIdentificadaObs}
                onChange={setInput('causaIdentificadaObs')}
                className="mt-2"
              />
            )}
          </div>

          <div>
            <Radio
              name="acaoCorretivaRealizada"
              label="AÇÃO CORRETIVA REALIZADA?"
              options={SN_OPTIONS}
              value={form.acaoCorretivaRealizada}
              onChange={set('acaoCorretivaRealizada')}
              error={getError('acaoCorretivaRealizada')}
              gridCols={2}
            />
            {form.acaoCorretivaRealizada === 'S' && (
              <Input
                placeholder="Adicionar observação (opcional)"
                value={form.acaoCorretivaRealizadaObs}
                onChange={setInput('acaoCorretivaRealizadaObs')}
                className="mt-2"
              />
            )}
          </div>

          <div>
            <Radio
              name="tipoOcorrencia"
              label="TIPO DE OCORRÊNCIA?"
              options={TIPO_OCORRENCIA_OPTIONS}
              value={form.tipoOcorrencia}
              onChange={set('tipoOcorrencia')}
              error={getError('tipoOcorrencia')}
              gridCols={2}
            />
            <Input
              placeholder="Adicionar observação (opcional)"
              value={form.tipoOcorrenciaObs}
              onChange={setInput('tipoOcorrenciaObs')}
              className="mt-2"
            />
          </div>

          <div>
            <Radio
              name="causaRaizIdentificada"
              label="CAUSA RAIZ IDENTIFICADA?"
              options={SN_OPTIONS}
              value={form.causaRaizIdentificada}
              onChange={set('causaRaizIdentificada')}
              error={getError('causaRaizIdentificada')}
              gridCols={2}
            />
            {form.causaRaizIdentificada === 'S' && (
              <Input
                placeholder="Adicionar observação (opcional)"
                value={form.causaRaizIdentificadaObs}
                onChange={setInput('causaRaizIdentificadaObs')}
                className="mt-2"
              />
            )}
          </div>
        </div>

        {/* Seção 3: Classificação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. CLASSIFICAÇÃO</h2>
          
          <div>
            <Radio
              name="gravidadeImpacto"
              label="GRAVIDADE OU IMPACTO?"
              options={GRAVIDADE_OPTIONS}
              value={form.gravidadeImpacto}
              onChange={set('gravidadeImpacto')}
              error={getError('gravidadeImpacto')}
              gridCols={3}
            />
            <Input
              placeholder="Adicionar observação (opcional)"
              value={form.gravidadeImpactoObs}
              onChange={setInput('gravidadeImpactoObs')}
              className="mt-2"
            />
          </div>

          <div>
            <Radio
              name="tipoProblema"
              label="TIPO DE PROBLEMA?"
              options={TIPO_PROBLEMA_OPTIONS}
              value={form.tipoProblema}
              onChange={set('tipoProblema')}
              error={getError('tipoProblema')}
              gridCols={2}
            />
            <Input
              placeholder="Adicionar observação (opcional)"
              value={form.tipoProblemaObs}
              onChange={setInput('tipoProblemaObs')}
              className="mt-2"
            />
          </div>

          <Radio
            name="prioridade"
            label="PRIORIDADE?"
            options={GRAVIDADE_OPTIONS}
            value={form.prioridade}
            onChange={set('prioridade')}
            error={getError('prioridade')}
            gridCols={3}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾">
            SALVAR
          </Button>
          <Button onClick={() => setForm(makeInitial())} variant="secondary" icon="🧹">
            LIMPAR
          </Button>
        </div>
      </main>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Problemas"
        registro={registroSalvo}
        caderneta="problemas"
      />
    </div>
  )
}

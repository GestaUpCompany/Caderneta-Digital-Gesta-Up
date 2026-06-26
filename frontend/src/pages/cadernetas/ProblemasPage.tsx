import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, SearchableModal } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { scrollToFirstError } from '../../utils/scrollToError'
import { getSetoresCached, getLocaisCached } from '../../services/cadastroCache'
import { useFormValidation } from '../../hooks/useFormValidation'

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
  setorResolve: string
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
  setorResolve: '',
})

export default function ProblemasPage() {
  const navigate = useNavigate()
  const { usuario, fazenda, fazendaId, logoUrl } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial)
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [setoresDisponiveis, setSetoresDisponiveis] = useState<string[]>([])
  const [locaisDisponiveis, setLocaisDisponiveis] = useState<string[]>([])

  // Carregar setores e locais (com cache lazy para offline)
  useEffect(() => {
    const loadData = async () => {
      if (fazendaId) {
        try {
          const [setoresData, locaisData] = await Promise.all([
            getSetoresCached(fazendaId),
            getLocaisCached(fazendaId)
          ])
          setSetoresDisponiveis(setoresData?.map((s: any) => s.nome) || [])
          setLocaisDisponiveis(locaisData?.map((l: any) => l.nome) || [])
        } catch (error) {
          console.error('Erro ao carregar dados:', error)
        }
      }
    }
    loadData()
  }, [fazendaId])

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // Validation rules
  const validationRules: any = {
    data: { required: true },
    setor: { required: true },
    local: { required: true },
    descricaoProblema: { required: true },
    causaIdentificada: { required: true },
    acaoCorretivaRealizada: { required: true },
    tipoOcorrencia: { required: true },
    causaRaizIdentificada: { required: true },
    gravidadeImpacto: { required: true },
    tipoProblema: { required: true },
    prioridade: { required: true },
    setorResolve: { required: true },
  }

  const { isValid } = useFormValidation(form, validationRules)

  const handleSalvar = async () => {
    setSalvando(true)

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
      setorResolve: form.setorResolve,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      const apiErrors = result.errors.map((e: any) => ({ field: e.field, message: e.message }))
      scrollToFirstError(apiErrors)
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
        {/* Seção 1: Dados Principais */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          {usuario && (
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <span className="text-xl">👤</span>
              <p className="text-gray-700 font-semibold">{usuario}</p>
            </div>
          )}
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS PRINCIPAIS</h2>
          <DatePicker label={<span>DATA <span className="text-red-500">*</span></span>} value={form.data} onChange={set('data')} />
          {setoresDisponiveis.length > 0 ? (
            <SearchableModal
              label={<span>EM QUAL SETOR HOUVE PROBLEMA? <span className="text-red-500">*</span></span>}
              value={form.setor}
              onChange={set('setor')}
              options={setoresDisponiveis}
              placeholder="Buscar setor..."
              id="setor"
              name="setor"
            />
          ) : (
            <Radio
              name="setor"
              label={<span>EM QUAL SETOR HOUVE PROBLEMA? <span className="text-red-500">*</span></span>}
              options={SETOR_OPTIONS}
              value={form.setor}
              onChange={set('setor')}
              gridCols={2}
            />
          )}
          {locaisDisponiveis.length > 0 ? (
            <SearchableModal
              label={<span>LOCAL? <span className="text-red-500">*</span></span>}
              value={form.local}
              onChange={set('local')}
              options={locaisDisponiveis}
              placeholder="Buscar local..."
              id="local"
              name="local"
            />
          ) : (
            <Input
              label={<span>LOCAL? <span className="text-red-500">*</span></span>}
              placeholder="Informe o local..."
              value={form.local}
              onChange={setInput('local')}
            />
          )}
          <Input
            label={<span>DESCRIÇÃO DO PROBLEMA? <span className="text-red-500">*</span></span>}
            placeholder="Descreva o problema..."
            value={form.descricaoProblema}
            onChange={setInput('descricaoProblema')}
          />
        </div>

        {/* Seção 2: Análise do Problema */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. ANÁLISE DO PROBLEMA</h2>
          
          <div>
            <Radio
              name="causaIdentificada"
              label={<span>CAUSA IDENTIFICADA? <span className="text-red-500">*</span></span>}
              options={SN_OPTIONS}
              value={form.causaIdentificada}
              onChange={set('causaIdentificada')}
              gridCols={2}
            />
            <Input
              placeholder="Adicionar observação (opcional)"
              value={form.causaIdentificadaObs}
              onChange={setInput('causaIdentificadaObs')}
              className="mt-2"
            />
          </div>

          <div>
            <Radio
              name="acaoCorretivaRealizada"
              label={<span>AÇÃO CORRETIVA REALIZADA? <span className="text-red-500">*</span></span>}
              options={SN_OPTIONS}
              value={form.acaoCorretivaRealizada}
              onChange={set('acaoCorretivaRealizada')}
              gridCols={2}
            />
            <Input
              placeholder="Adicionar observação (opcional)"
              value={form.acaoCorretivaRealizadaObs}
              onChange={setInput('acaoCorretivaRealizadaObs')}
              className="mt-2"
            />
          </div>

          <div>
            <Radio
              name="tipoOcorrencia"
              label={<span>TIPO DE OCORRÊNCIA? <span className="text-red-500">*</span></span>}
              options={TIPO_OCORRENCIA_OPTIONS}
              value={form.tipoOcorrencia}
              onChange={set('tipoOcorrencia')}
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
              label={<span>CAUSA RAIZ IDENTIFICADA? <span className="text-red-500">*</span></span>}
              options={SN_OPTIONS}
              value={form.causaRaizIdentificada}
              onChange={set('causaRaizIdentificada')}
              gridCols={2}
            />
            <Input
              placeholder="Adicionar observação (opcional)"
              value={form.causaRaizIdentificadaObs}
              onChange={setInput('causaRaizIdentificadaObs')}
              className="mt-2"
            />
          </div>
        </div>

        {/* Seção 3: Classificação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. CLASSIFICAÇÃO</h2>
          
          <div>
            <Radio
              name="gravidadeImpacto"
              label={<span>GRAVIDADE OU IMPACTO? <span className="text-red-500">*</span></span>}
              options={GRAVIDADE_OPTIONS}
              value={form.gravidadeImpacto}
              onChange={set('gravidadeImpacto')}
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
              label={<span>TIPO DE PROBLEMA? <span className="text-red-500">*</span></span>}
              options={TIPO_PROBLEMA_OPTIONS}
              value={form.tipoProblema}
              onChange={set('tipoProblema')}
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
            label={<span>PRIORIDADE? <span className="text-red-500">*</span></span>}
            options={GRAVIDADE_OPTIONS}
            value={form.prioridade}
            onChange={set('prioridade')}
            gridCols={3}
          />
          {setoresDisponiveis.length > 0 ? (
            <SearchableModal
              label={<span>QUAL SETOR RESOLVE? <span className="text-red-500">*</span></span>}
              value={form.setorResolve}
              onChange={set('setorResolve')}
              options={setoresDisponiveis}
              placeholder="Buscar setor..."
              id="setorResolve"
              name="setorResolve"
            />
          ) : (
            <Input
              label={<span>QUAL SETOR RESOLVE? <span className="text-red-500">*</span></span>}
              placeholder="Informe o setor..."
              value={form.setorResolve}
              onChange={setInput('setorResolve')}
            />
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾" disabled={!isValid}>
            SALVAR
          </Button>
          <Button onClick={() => setForm(makeInitial())} variant="secondary" icon="🧹">
            LIMPAR
          </Button>
        </div>

        {!isValid && (
          <p className="text-base text-gray-600 text-center">
            <span className="text-red-500">*</span> Preencha todos os campos obrigatórios para salvar
          </p>
        )}
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

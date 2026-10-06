import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, SearchableModal, TextArea } from '../../components/ui'
import { MapPin } from 'lucide-react'
import SuccessModal from '../../components/SuccessModal'
import BannerRascunho from '../../components/BannerRascunho'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import ChoiceGrid from '../../components/cadernetas/ChoiceGrid'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import FormFooter from '../../components/cadernetas/FormFooter'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import CadernetaHeader from '../../components/CadernetaHeader'
import { scrollToFirstError } from '../../utils/scrollToError'
import { getSetoresCached, getLocaisCached } from '../../services/cadastroCache'
import { loadMapaFazenda } from '../../services/mapaCache'
import { pontoDentroPoligono } from '../../services/mapaRouting'
import { useFormValidation } from '../../hooks/useFormValidation'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { usePhotoGps } from '../../hooks/usePhotoGps'
import { base64ToDataUrl } from '../../utils/photoCompress'

const SETOR_FALLBACK = ['Gado', 'Máquinas', 'ADM', 'Fábrica', 'Manutenção', 'Terceirizado']

const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const setorIcon = (nome: string): string => {
  const n = normalizar(nome)
  if (n.includes('gado')) return '🐄'
  if (n.includes('confinamento')) return '🐂'
  if (n.includes('maquina')) return '🚜'
  if (n.includes('adm')) return '🏢'
  if (n.includes('fabrica')) return '🏭'
  if (n.includes('manutenc')) return '🔧'
  if (n.includes('terceir')) return '👷'
  if (n.includes('servico')) return '🧰'
  return '📍'
}

const OCORRENCIA_OPTIONS = [
  { value: 'Única', label: 'PRIMEIRA VEZ', icon: '1️⃣' },
  { value: 'Repetitiva', label: 'SEMPRE ACONTECE', icon: '🔁' },
]

const RESOLVIDO_OPTIONS = [
  { value: 'S', label: 'SIM', icon: '✓', tone: 'success' as const },
  { value: 'N', label: 'NÃO', icon: '✕', tone: 'danger' as const },
]

const PRIORIDADE_OPTIONS = [
  { value: 'baixa', label: 'PODE ESPERAR', icon: '🟢' },
  { value: 'média', label: 'ESTA SEMANA', icon: '🟡' },
  { value: 'alta', label: 'AGORA!', icon: '🔴' },
]

interface FormState {
  data: string
  setor: string
  local: string
  descricaoProblema: string
  tipoOcorrencia: string
  acaoCorretivaRealizada: string
  prioridade: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  setor: '',
  local: '',
  descricaoProblema: '',
  tipoOcorrencia: '',
  acaoCorretivaRealizada: '',
  prioridade: '',
})

export default function ProblemasPage() {
  const navigate = useNavigate()
  const { usuario, fazendaId } = useSelector((state: RootState) => state.config)
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'problemas', makeInitial })
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [setoresDisponiveis, setSetoresDisponiveis] = useState<string[]>([])
  const [locaisDisponiveis, setLocaisDisponiveis] = useState<string[]>([])
  const [pastoGps, setPastoGps] = useState<string | null>(null)

  const {
    fotoBase64,
    latitude,
    longitude,
    gpsAccuracy,
    capturandoFoto,
    fotoErro,
    capturarFotoComGps,
    limpar: limparFoto,
    fotoInputRef,
    handleFileInputChange,
  } = usePhotoGps({ comGps: true })

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

  // Resolver nome do pasto a partir das coordenadas GPS (pastos no cache do mapa)
  useEffect(() => {
    if (latitude == null || longitude == null || !fazendaId) {
      setPastoGps(null)
      return
    }
    let cancelado = false
    loadMapaFazenda(fazendaId)
      .then((mapa) => {
        if (cancelado || !mapa) return
        for (const pasto of mapa.pastos) {
          const g = pasto.geometria
          const aneis =
            g.type === 'Polygon'
              ? [g.coordinates[0]]
              : g.type === 'MultiPolygon'
                ? g.coordinates.map((c) => c[0])
                : []
          if (aneis.some((coords) => pontoDentroPoligono(longitude, latitude, coords as [number, number][]))) {
            setPastoGps(pasto.nome)
            return
          }
        }
        setPastoGps(null)
      })
      .catch(() => {})
    return () => {
      cancelado = true
    }
  }, [latitude, longitude, fazendaId])

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const setText = (field: keyof FormState) => (e: React.ChangeEvent<HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const validationRules: any = {
    data: { required: true },
    setor: { required: true },
    local: { required: true },
    descricaoProblema: { required: true },
    tipoOcorrencia: { required: true },
    acaoCorretivaRealizada: { required: true },
    prioridade: { required: true },
  }

  const { isValid } = useFormValidation(form, validationRules)

  const setorOptions = (setoresDisponiveis.length > 0 ? setoresDisponiveis : SETOR_FALLBACK).map(
    (nome) => ({ value: nome, label: nome, icon: setorIcon(nome) })
  )

  const handleSalvar = async () => {
    setSalvando(true)

    const result = await salvarRegistro('problemas', {
      data: form.data,
      setor: form.setor,
      local: form.local,
      descricaoProblema: form.descricaoProblema,
      tipoOcorrencia: form.tipoOcorrencia,
      acaoCorretivaRealizada: form.acaoCorretivaRealizada,
      prioridade: form.prioridade,
      fotoBase64: fotoBase64 || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      gpsAccuracy: gpsAccuracy ?? null,
      usuario: usuario,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      const apiErrors = result.errors.map((e: any) => ({ field: e.field, message: e.message }))
      scrollToFirstError(apiErrors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      limparRascunho()
      limparFoto()
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
      <CadernetaHeader
        title="PROBLEMAS"
        cadernetaId="problemas"
        dateContent={<DatePicker value={form.data} onChange={set('data')} variant="header" compact inline />}
      />

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8 desktop-form-container">
        <BannerRascunho
          visible={rascunhoRestaurado}
          onConfirmar={confirmarRascunho}
          onDescartar={descartarRascunho}
        />

        <CadernetaSection numero={1} titulo="Onde é o problema?" required>
          <ChoiceGrid
            options={setorOptions}
            value={form.setor}
            onChange={set('setor')}
            cols={3}
            dataField="setor"
          />
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
        </CadernetaSection>

        <CadernetaSection numero={2} titulo="Mostre e conte" required>
          <TextArea
            label={<span>DESCRIÇÃO DO PROBLEMA <span className="text-red-500">*</span></span>}
            placeholder="Descreva o problema..."
            value={form.descricaoProblema}
            onChange={setText('descricaoProblema')}
            rows={3}
            textSize="base"
            name="descricaoProblema"
          />

          {fotoBase64 ? (
            <div className="flex items-start gap-3">
              <img
                src={base64ToDataUrl(fotoBase64)}
                alt="Foto do problema"
                className="w-24 h-24 rounded-xl border border-gray-200 object-cover"
              />
              <button
                type="button"
                onClick={limparFoto}
                className="flex-1 rounded-xl bg-gray-200 px-3 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-300 active:scale-[0.99]"
              >
                🗑️ REMOVER FOTO
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => capturarFotoComGps()}
              disabled={capturandoFoto}
              className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 px-4 py-7 flex flex-col items-center justify-center gap-2 text-gray-500 transition-colors hover:border-brand-600 hover:text-brand-700 active:scale-[0.99] disabled:opacity-60"
            >
              <span className="text-2xl">📷</span>
              <span className="text-sm font-bold uppercase tracking-wide">
                {capturandoFoto ? 'CAPTURANDO...' : 'TIRAR FOTO'}
              </span>
            </button>
          )}
          {fotoErro && (
            <InfoStrip tone="danger">{fotoErro}</InfoStrip>
          )}
          <input
            ref={fotoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {latitude != null && longitude != null && (
            <InfoStrip tone="success" icon={<MapPin className="h-4 w-4" />}>
              Local marcado pelo GPS: {pastoGps ?? `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`}
            </InfoStrip>
          )}
        </CadernetaSection>

        <CadernetaSection numero={3} titulo="É urgente?" required>
          <ChoiceGrid
            options={PRIORIDADE_OPTIONS}
            value={form.prioridade}
            onChange={set('prioridade')}
            cols={3}
            dataField="prioridade"
          />
        </CadernetaSection>

        <CadernetaSection numero={4} titulo="Situação">
          <div className="flex flex-col gap-2.5">
            <p className="text-[15px] font-bold text-gray-900">
              JÁ ACONTECEU ANTES? <span className="text-red-500">*</span>
            </p>
            <ChoiceGrid
              options={OCORRENCIA_OPTIONS}
              value={form.tipoOcorrencia}
              onChange={set('tipoOcorrencia')}
              cols={2}
              dataField="tipoOcorrencia"
            />
          </div>

          <div className="flex flex-col gap-2.5">
            <p className="text-[15px] font-bold text-gray-900">
              VOCÊ JÁ RESOLVEU? <span className="text-red-500">*</span>
            </p>
            <ChoiceGrid
              options={RESOLVIDO_OPTIONS}
              value={form.acaoCorretivaRealizada}
              onChange={set('acaoCorretivaRealizada')}
              cols={2}
              dataField="acaoCorretivaRealizada"
            />
          </div>

          <InfoStrip icon="ℹ️">
            Causa, tipo, gravidade e quem vai resolver: o gerente define pela foto e pela descrição.
          </InfoStrip>
        </CadernetaSection>

        <FormFooter
          onSalvar={handleSalvar}
          onLimpar={() => {
            limparRascunho()
            limparFoto()
          }}
          salvando={salvando}
          disabled={!isValid}
          salvarLabel="ENVIAR AVISO"
          formValido={isValid}
        />
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

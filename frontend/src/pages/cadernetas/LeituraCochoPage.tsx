import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, ValidationMessage, SearchableModal } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import PdfModal from '../../components/PdfModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import { getCachedCadastroData } from '../../services/cadastroCache'
import { getLoteByNome } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import LoteDetalhesCard from '../../components/LoteDetalhesCard'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'

const BASE = import.meta.env.BASE_URL

const LEITURAS = [
  { value: '-1', label: '-1', icon: '🔴' },
  { value: '0', label: '0', icon: '🟡' },
  { value: '1', label: '1', icon: '🟢' },
  { value: '2', label: '2', icon: '🟡' },
  { value: '3', label: '3', icon: '🔴' },
]

interface FormState {
  data: string
  pastoCurral: string
  numeroLote: string
  quantidadeCabecas: string
  mediaMS: string
  leituraCocho: string
  observacao: string
}

const makeInitial = (usuario?: string): FormState => ({
  data: todayBR(),
  pastoCurral: '',
  numeroLote: '',
  quantidadeCabecas: '',
  mediaMS: '',
  leituraCocho: '',
  observacao: '',
})

export default function LeituraCochoPage() {
  const navigate = useNavigate()
  const { usuario, fazendaId } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(() => makeInitial(usuario))
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pastosDisponiveis, setPastosDisponiveis] = useState<string[]>([])
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [detalhesLote, setDetalhesLote] = useState<any>(null)
  
  // Mock data para MS anteriores (será substituído por busca real no backend)
  const [msAnteriores, setMsAnteriores] = useState<{ valor: string; data: string }[]>([])

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Carregar pastos e lotes do cache global
  useEffect(() => {
    const cache = getCachedCadastroData()
    if (cache) {
      setPastosDisponiveis(cache.pastos || [])
      setLotesDisponiveis(cache.lotes || [])
    }
  }, [])

  // Escutar atualizações do cache de cadastro
  useEffect(() => {
    const unsubscribe = eventBus.on(CADASTRO_CACHE_UPDATED, (data: any) => {
      console.log('[LeituraCochoPage] Cache atualizado, recarregando dados')
      if (data) {
        setPastosDisponiveis(data.pastos || [])
        setLotesDisponiveis(data.lotes || [])
      }
    })

    return unsubscribe
  }, [])

  // Buscar detalhes do lote quando selecionado
  useEffect(() => {
    async function carregarDetalhesLote() {
      if (!form.numeroLote || !fazendaId) {
        setDetalhesLote(null)
        return
      }

      try {
        const lote = await getLoteByNome(fazendaId, form.numeroLote)
        if (lote) {
          setDetalhesLote(lote)
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do lote:', error)
        setDetalhesLote(null)
      }
    }

    carregarDetalhesLote()
  }, [form.numeroLote, fazendaId])

  // Buscar MS anteriores quando pasto/curral e lote forem selecionados
  useEffect(() => {
    async function carregarMsAnteriores() {
      if (!form.pastoCurral || !form.numeroLote) {
        setMsAnteriores([])
        return
      }

      // TODO: Implementar busca real no backend
      // Por enquanto, usando dados mock
      setMsAnteriores([
        { valor: '2.5', data: '10/05/2026' },
        { valor: '2.8', data: '08/05/2026' },
      ])
    }

    carregarMsAnteriores()
  }, [form.pastoCurral, form.numeroLote])

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const result = await salvarRegistro('leitura-cocho', {
      data: form.data,
      pastoCurral: form.pastoCurral,
      numeroLote: form.numeroLote,
      quantidadeCabecas: form.quantidadeCabecas ? Number(form.quantidadeCabecas) : 0,
      mediaMS: form.mediaMS ? Number(form.mediaMS) : 0,
      leituraCocho: form.leituraCocho ? Number(form.leituraCocho) : null,
      observacao: form.observacao,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      setForm(makeInitial(usuario))
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
    <>
      <CadernetaLayout title="LEITURA DE COCHO" cadernetaId="leitura-cocho">
        {/* Tarja de desenvolvimento */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
          <p className="text-xs font-semibold text-amber-700">⚠️ EM DESENVOLVIMENTO</p>
        </div>
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
          <div className="grid grid-cols-2 gap-3">
            {pastosDisponiveis.length > 0 ? (
              <SearchableModal
                label="PASTO/CURRAL"
                value={form.pastoCurral}
                onChange={set('pastoCurral')}
                error={getError('pastoCurral')}
                options={pastosDisponiveis}
                placeholder="Buscar pasto/curral..."
                id="pastoCurral"
                name="pastoCurral"
              />
            ) : (
              <Input
                label="PASTO/CURRAL"
                placeholder="Carregando..."
                value={form.pastoCurral}
                onChange={setInput('pastoCurral')}
                error={getError('pastoCurral')}
                disabled
                id="pastoCurral"
              />
            )}
            {lotesDisponiveis.length > 0 ? (
              <SearchableModal
                label="LOTE"
                value={form.numeroLote}
                onChange={set('numeroLote')}
                error={getError('numeroLote')}
                options={lotesDisponiveis}
                placeholder="Buscar lote..."
                id="numeroLote"
                name="numeroLote"
              />
            ) : (
              <Input
                label="LOTE"
                placeholder="Carregando..."
                value={form.numeroLote}
                onChange={setInput('numeroLote')}
                error={getError('numeroLote')}
                inputMode="numeric"
                disabled
                id="numeroLote"
              />
            )}
          </div>
          {detalhesLote && (
            <LoteDetalhesCard detalhes={detalhesLote} processarCategorias={(c: string) => c.split(',')} />
          )}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="QTD. CABEÇAS"
              placeholder="0"
              value={form.quantidadeCabecas}
              onChange={setInput('quantidadeCabecas')}
              inputMode="numeric"
              type="number"
              min="0"
            />
            <Input
              label="MÉDIA MS"
              placeholder="0.00"
              value={form.mediaMS}
              onChange={setInput('mediaMS')}
              inputMode="decimal"
              type="number"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* Seção 2: MS Anteriores */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. MS ANTERIORES</h2>
          {msAnteriores.length > 0 ? (
            <div className="space-y-3">
              {msAnteriores.map((ms, index) => (
                <div
                  key={index}
                  className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm text-gray-600">Data: {ms.data}</p>
                    <p className="text-lg font-bold text-gray-900">MS: {ms.valor}</p>
                  </div>
                  {index === 0 && (
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                      ÚLTIMA
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-center">
              <p className="text-gray-600">Selecione pasto/curral e lote para ver as MS anteriores</p>
            </div>
          )}
        </div>

        {/* Seção 3: Leitura do Cocho */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. LEITURA DO COCHO</h2>
          <button
            onClick={() => setShowPdfModal(true)}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors"
          >
            <span className="text-xl">📄</span>
            <span>POP LEITURA DE COCHO</span>
          </button>
          <Radio
            name="leituraCocho"
            label="LEITURA DO COCHO (-1 a 3)"
            options={LEITURAS}
            value={form.leituraCocho}
            onChange={set('leituraCocho')}
            error={getError('leituraCocho')}
            gridCols={5}
          />
        </div>

        {/* Seção 4: Observação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. OBSERVAÇÃO</h2>
          <Input
            placeholder="Detalhes adicionais (opcional)"
            value={form.observacao}
            onChange={setInput('observacao')}
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
      </CadernetaLayout>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Leitura de Cocho"
        registro={registroSalvo}
        caderneta="leitura-cocho"
      />

      <PdfModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        images={[
          `${BASE}docs/cocho/POP_Cocho_01.jpg`,
          `${BASE}docs/cocho/POP_Cocho_02.jpg`
        ]}
      />
    </>
  )
}

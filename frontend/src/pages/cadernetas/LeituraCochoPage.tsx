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
import {
  getCachedCadastroData,
  getPastoByNomeCached,
  getLotesByPastoIdCached,
  getLoteDetalhesComCategoriasCached,
  getRegistrosSuplementacaoByLoteCached,
  getRegistrosLeituraCochoByLoteCached,
  getFormulacaoByNomeCached,
} from '../../services/cadastroCache'
import { getPastos, getFuncionarios } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import { calcularMetricasLeituraCocho, MetricasLeituraCocho } from '../../utils/leituraCochoMetrics'
import LoteDetalhesCard from '../../components/LoteDetalhesCard'
import PastoDetalhesCard from '../../components/PastoDetalhesCard'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import FeatureLock from '../../components/FeatureLock'

const BASE = import.meta.env.BASE_URL

// Função para processar categorias com diferentes delimitadores
function processarCategorias(categorias: string): string[] {
  if (!categorias) return []
  // Separar por: vírgula+espaço, vírgula, ponto+espaço, ponto, ponto e vírgula+espaço, ponto e vírgula
  const regex = /[,.;]+\s*/
  return categorias
    .split(regex)
    .map(c => c.trim())
    .filter(c => c.length > 0)
}

const LEITURAS = [
  { value: '-1', label: '-1', icon: '🔴' },
  { value: '0', label: '0', icon: '🟡' },
  { value: '1', label: '1', icon: '🟢' },
  { value: '2', label: '2', icon: '🟡' },
  { value: '3', label: '3', icon: '🔴' },
]

interface FormState {
  data: string
  responsavel: string
  pastoCurral: string
  pastoId: string
  numeroLote: string
  loteId: string
  leituraCocho: string
  observacao: string
}

const makeInitial = (_usuario?: string): FormState => ({
  data: todayBR(),
  responsavel: '',
  pastoCurral: '',
  pastoId: '',
  numeroLote: '',
  loteId: '',
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
  const [funcionariosDisponiveis, setFuncionariosDisponiveis] = useState<string[]>([])
  const [lotesNoPasto, setLotesNoPasto] = useState<any[]>([])
  const [detalhesLote, setDetalhesLote] = useState<any>(null)
  const [detalhesPasto, setDetalhesPasto] = useState<any>(null)
  const [metricas, setMetricas] = useState<MetricasLeituraCocho | null>(null)
  const [carregandoMetricas, setCarregandoMetricas] = useState(false)

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Carregar pastos e lotes do cache global, com fallback para Supabase
  useEffect(() => {
    const loadData = async () => {
      const cache = await getCachedCadastroData()
      if (cache && cache.pastos && cache.pastos.length > 0) {
        setPastosDisponiveis(cache.pastos || [])
      }
      if (cache && cache.funcionarios && cache.funcionarios.length > 0) {
        setFuncionariosDisponiveis(cache.funcionarios || [])
      }
      if (!fazendaId) return
      try {
        const [pastosData, funcionariosData] = await Promise.all([
          getPastos(fazendaId),
          getFuncionarios(fazendaId)
        ])
        setPastosDisponiveis(pastosData?.map((p: any) => p.nome) || [])
        setFuncionariosDisponiveis(funcionariosData?.map((f: any) => f.nome) || [])
      } catch (error) {
        console.error('Erro ao carregar dados do Supabase:', error)
      }
    }
    loadData()
  }, [fazendaId])

  // Escutar atualizações do cache de cadastro
  useEffect(() => {
    const unsubscribe = eventBus.on(CADASTRO_CACHE_UPDATED, (data: any) => {
      console.log('[LeituraCochoPage] Cache atualizado, recarregando dados')
      if (data) {
        setPastosDisponiveis(data.pastos || [])
        setFuncionariosDisponiveis(data.funcionarios || [])
      }
    })

    return unsubscribe
  }, [])

  // Buscar lotes e detalhes quando pasto é selecionado
  useEffect(() => {
    async function carregarLotesDoPasto() {
      if (!form.pastoCurral || !fazendaId) {
        setDetalhesLote(null)
        setLotesNoPasto([])
        setDetalhesPasto(null)
        setForm(prev => ({ ...prev, numeroLote: '', loteId: '', pastoId: '' }))
        return
      }

      try {
        // Buscar o pasto pelo nome para obter o ID
        const pasto = await getPastoByNomeCached(fazendaId, form.pastoCurral)
        if (!pasto) {
          setDetalhesLote(null)
          setLotesNoPasto([])
          setDetalhesPasto(null)
          setForm(prev => ({ ...prev, numeroLote: '', loteId: '', pastoId: '' }))
          return
        }

        const pastoId = pasto.id
        setForm(prev => ({ ...prev, pastoId }))

        // Exibir detalhes do pasto selecionado
        setDetalhesPasto({
          areaUtil: pasto.area_util_ha?.toString() || '',
          especie: pasto.especie || '',
          alturaEntrada: pasto.altura_entrada_cm?.toString() || '',
        })

        // Buscar lotes que ocupam esse pasto
        const lotes = await getLotesByPastoIdCached(fazendaId, pastoId)
        setLotesNoPasto(lotes || [])

        if (!lotes || lotes.length === 0) {
          setDetalhesLote(null)
          setForm(prev => ({ ...prev, numeroLote: '', loteId: '' }))
          return
        }

        // Se houver 1+ lote(s), usar o primeiro como padrão
        const lotePrincipal = lotes[0]

        // Buscar detalhes de categorias do lote
        const categoriasDetalhes = await getLoteDetalhesComCategoriasCached(lotePrincipal.id)

        // Combinar dados do lote com dados de categorias
        setDetalhesLote({
          ...lotePrincipal,
          categorias: categoriasDetalhes.categorias,
          n_cabecas: categoriasDetalhes.quant_atual,
          peso_vivo_kg: categoriasDetalhes.peso_vivo_kg,
          qtd_bezerros: categoriasDetalhes.qtd_bezerros
        })

        setForm(prev => ({
          ...prev,
          numeroLote: lotePrincipal.nome || '',
          loteId: lotePrincipal.id
        }))
      } catch (error) {
        console.error('Erro ao carregar lotes do pasto:', error)
        setDetalhesLote(null)
        setLotesNoPasto([])
        setDetalhesPasto(null)
        setForm(prev => ({ ...prev, numeroLote: '', loteId: '', pastoId: '' }))
      }
    }

    carregarLotesDoPasto()
  }, [form.pastoCurral, fazendaId])

  // Calcular métricas de consumo MS e buscar leituras anteriores quando lote mudar
  useEffect(() => {
    async function carregarMetricas() {
      if (!form.loteId || !fazendaId || !detalhesLote) {
        setMetricas(null)
        return
      }

      setCarregandoMetricas(true)
      try {
        const [registrosSuplementacao, leiturasAnteriores] = await Promise.all([
          getRegistrosSuplementacaoByLoteCached(fazendaId, form.loteId),
          getRegistrosLeituraCochoByLoteCached(fazendaId, form.loteId)
        ])

        const metricasCalculadas = await calcularMetricasLeituraCocho(
          detalhesLote,
          registrosSuplementacao || [],
          async (nome: string) => getFormulacaoByNomeCached(fazendaId, nome),
          leiturasAnteriores || []
        )

        setMetricas(metricasCalculadas)
      } catch (error) {
        console.error('Erro ao carregar métricas de leitura de cocho:', error)
        setMetricas(null)
      } finally {
        setCarregandoMetricas(false)
      }
    }

    carregarMetricas()
  }, [form.loteId, fazendaId, detalhesLote])

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const result = await salvarRegistro('leitura-cocho', {
      data: form.data,
      responsavel: form.responsavel,
      pastoCurral: form.pastoCurral,
      pastoId: form.pastoId,
      numeroLote: form.numeroLote,
      loteId: form.loteId,
      leituraCocho: form.leituraCocho !== '' ? Number(form.leituraCocho) : null,
      observacao: form.observacao,
      // Histórico de consumo MS para compartilhamento
      consumoMedioMsKgDesdeFormacao: metricas?.mediaConsumoMsKgDesdeFormacao ?? null,
      consumoMedioMsKgUltimos10Dias: metricas?.mediaConsumoMsKgUltimos10Dias ?? null,
      consumoMsKgDiaAnterior: metricas?.consumoMsKgDiaAnterior ?? null,
      consumoMedioMsPctPVDesdeFormacao: metricas?.mediaConsumoMsPctPVDesdeFormacao ?? null,
      consumoMedioMsPctPVUltimos10Dias: metricas?.mediaConsumoMsPctPVUltimos10Dias ?? null,
      consumoMsPctPVDiaAnterior: metricas?.consumoMsPctPVDiaAnterior ?? null,
      leiturasUltimos3Dias: metricas?.leiturasUltimos3Dias ?? [],
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
    <FeatureLock feature="leitura-cocho" fazendaId={fazendaId}>
    <>
      <CadernetaLayout title="LEITURA DE COCHO" cadernetaId="leitura-cocho">
        {/* Tarja de desenvolvimento */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
          <p className="text-xs font-semibold text-amber-700">⚠️ EM DESENVOLVIMENTO</p>
        </div>
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: Dados Principais */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS PRINCIPAIS</h2>
          <DatePicker label="DATA" value={form.data} onChange={set('data')} error={getError('data')} />
          {funcionariosDisponiveis.length > 0 ? (
            <SearchableModal
              label={<span>RESPONSÁVEL <span className="text-red-500">*</span></span>}
              value={form.responsavel}
              onChange={set('responsavel')}
              error={getError('responsavel')}
              options={funcionariosDisponiveis}
              placeholder="Buscar responsável..."
              id="responsavel"
              name="responsavel"
            />
          ) : (
            <Input
              label={<span>RESPONSÁVEL <span className="text-red-500">*</span></span>}
              placeholder="Carregando..."
              value={form.responsavel}
              onChange={setInput('responsavel')}
              error={getError('responsavel')}
              disabled
              id="responsavel"
            />
          )}
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
          {detalhesPasto && (
            <PastoDetalhesCard detalhes={detalhesPasto} />
          )}
          {lotesNoPasto.length > 1 && (
            <p className="text-sm text-amber-600 font-medium">
              ⚠️ Este pasto contém {lotesNoPasto.length} lotes ativos. O primeiro foi selecionado automaticamente.
            </p>
          )}
          {lotesNoPasto.length === 0 && form.pastoCurral && (
            <p className="text-sm text-red-600 font-medium">
              ⚠️ Nenhum lote ativo ocupando este pasto.
            </p>
          )}
          {detalhesLote && (
            <LoteDetalhesCard detalhes={detalhesLote} processarCategorias={processarCategorias} />
          )}
        </div>

        {/* Seção 2: Métricas de Consumo MS */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. MÉTRICAS DE CONSUMO MS</h2>

          {carregandoMetricas ? (
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-center">
              <p className="text-gray-600">Carregando métricas...</p>
            </div>
          ) : metricas?.mensagem ? (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-center">
              <p className="text-amber-800">{metricas.mensagem}</p>
            </div>
          ) : metricas ? (
            <div className="space-y-4">
              {/* kg/cab/dia */}
              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-gray-800">Consumo MS (kg/cab/dia)</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-gray-600">Desde formação</p>
                    <p className="text-lg font-bold text-gray-900">
                      {metricas.mediaConsumoMsKgDesdeFormacao?.toFixed(2) ?? '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Últimos 10 dias</p>
                    <p className="text-lg font-bold text-gray-900">
                      {metricas.mediaConsumoMsKgUltimos10Dias?.toFixed(2) ?? '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Dia anterior</p>
                    <p className="text-lg font-bold text-gray-900">
                      {metricas.consumoMsKgDiaAnterior?.toFixed(2) ?? '--'}
                    </p>
                  </div>
                </div>
              </div>

              {/* %PV/cab/dia */}
              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-gray-800">Consumo MS (%PV/cab/dia)</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-gray-600">Desde formação</p>
                    <p className="text-lg font-bold text-gray-900">
                      {metricas.mediaConsumoMsPctPVDesdeFormacao?.toFixed(2) ?? '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Últimos 10 dias</p>
                    <p className="text-lg font-bold text-gray-900">
                      {metricas.mediaConsumoMsPctPVUltimos10Dias?.toFixed(2) ?? '--'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Dia anterior</p>
                    <p className="text-lg font-bold text-gray-900">
                      {metricas.consumoMsPctPVDiaAnterior?.toFixed(2) ?? '--'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Leituras anteriores */}
              <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 space-y-2">
                <h3 className="font-semibold text-gray-800">Leitura de Cocho - Últimos 3 dias</h3>
                {metricas.leiturasUltimos3Dias.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {metricas.leiturasUltimos3Dias.map((leitura, index) => (
                      <div key={index}>
                        <p className="text-xs text-gray-600">{leitura.dataBR}</p>
                        <p className="text-lg font-bold text-gray-900">{leitura.nota ?? '--'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-center">Nenhuma leitura de cocho registrada nos últimos 3 dias.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-center">
              <p className="text-gray-600">Selecione pasto/curral e lote para ver as métricas de consumo MS.</p>
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
    </FeatureLock>
  )
}

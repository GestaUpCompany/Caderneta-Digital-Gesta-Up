import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, ValidationMessage } from '../../components/ui'
import SearchableModal from '../../components/ui/SearchableModal'
import SuccessModal from '../../components/SuccessModal'
import PdfModal from '../../components/PdfModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import {
  getCachedCadastroData,
  getLoteByNomeCached,
  getLoteDetalhesComCategoriasCached,
} from '../../services/cadastroCache'
import { getLotes, getLastRodeioDate, getFuncionarios } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import LoteDetalhesCard from '../../components/LoteDetalhesCard'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { useFormValidation } from '../../hooks/useFormValidation'
import { useChecklistAtivo } from '../../hooks/useChecklistAtivo'
import { useRegistroComExecucao } from '../../hooks/useRegistroComExecucao'
import { useExecucaoRotina } from '../../hooks/useExecucaoRotina'
import ObservacaoAtrasoModal from '../../components/ObservacaoAtrasoModal'

const BASE = import.meta.env.BASE_URL

const DIAGNOSTICOS = [
  { campo: 'bebedourosCochos', label: 'BEBEDOUROS / COCHOS OK?' },
  { campo: 'pastagensTaxaLotacao', label: 'PASTAGENS / TAXA DE LOTAÇÃO ADEQUADA?' },
  { campo: 'animaisMachucadosDoentesBichados', label: 'ANIMAIS MACHUCADOS / DOENTES / BICHADOS?' },
  { campo: 'cercasCochosPorteiras', label: 'CERCAS / COCHOS / PORTEIRAS OK?' },
  { campo: 'carrapatosMoscas', label: 'CARRAPATOS / MOSCAS?' },
  { campo: 'animaisEntreverados', label: 'ANIMAIS ENTREVERADOS?' },
  { campo: 'animalMorto', label: 'ANIMAL MORTO?' },
]

// Fields where "Sim" means a problem exists (observation should show on "Sim")
const INVERTED_DIAGNOSTICOS = [
  'animaisMachucadosDoentesBichados',
  'carrapatosMoscas',
  'animaisEntreverados',
  'animalMorto',
]

const ESCALA_5 = [
  { value: '1', label: '1', icon: '🔴' },
  { value: '2', label: '2', icon: '🟡' },
  { value: '3', label: '3', icon: '🟢' },
  { value: '4', label: '4', icon: '🟡' },
  { value: '5', label: '5', icon: '🔴' },
]

const ESCALA_EQUIPE = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
]

const ESCORES = [
  { value: '1', label: '1', color: 'bg-red-500' },
  { value: '1.5', label: '1.5', color: 'bg-red-500' },
  { value: '2', label: '2', color: 'bg-yellow-400' },
  { value: '2.5', label: '2.5', color: 'bg-yellow-400' },
  { value: '3', label: '3', color: 'bg-green-500' },
  { value: '3.5', label: '3.5', color: 'bg-green-500' },
  { value: '4', label: '4', color: 'bg-yellow-400' },
  { value: '4.5', label: '4.5', color: 'bg-yellow-400' },
  { value: '5', label: '5', color: 'bg-red-500' },
]

const CATEGORIAS_ANIMAIS: { campo: string; label: string }[] = [
  { campo: 'vaca', label: 'VACAS' },
  { campo: 'touro', label: 'TOUROS' },
  { campo: 'boiGordo', label: 'BOIS GORDOS' },
  { campo: 'boiMagro', label: 'BOIS MAGROS' },
  { campo: 'garrote', label: 'GARROTES' },
  { campo: 'bezerro', label: 'BEZERROS(AS)' },
  { campo: 'novilha', label: 'NOVILHAS' },
  { campo: 'tropa', label: 'TROPAS' },
  { campo: 'outros', label: 'OUTROS' },
]

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

interface FormState {
  data: string
  pasto: string
  pastoId: string
  numeroLote: string
  loteId: string
  gadoContado: string
  vaca: string
  touro: string
  boiGordo: string
  boiMagro: string
  garrote: string
  bezerro: string
  novilha: string
  tropa: string
  outros: string
  escoreFezes: string
  equipe: string
  equipeNomes: string[]
  escoreGado: string
  diagnosticos: {
    [key: string]: {
      valor: string | null
      observacao: string
    }
  }
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  pasto: '',
  pastoId: '',
  numeroLote: '',
  loteId: '',
  gadoContado: '',
  vaca: '', touro: '', boiGordo: '', boiMagro: '', garrote: '', bezerro: '', novilha: '', tropa: '', outros: '',
  escoreFezes: '',
  equipe: '',
  equipeNomes: [],
  escoreGado: '',
  diagnosticos: DIAGNOSTICOS.reduce((acc, { campo }) => {
    acc[campo] = { valor: '', observacao: '' }
    return acc
  }, {} as FormState['diagnosticos']),
})

const SN_OPTIONS = [
  { value: 'S', label: 'SIM', icon: '✅' },
  { value: 'N', label: 'NÃO', icon: '❌' },
]

export default function RodeioPage() {
  const navigate = useNavigate()
  const { usuario, fazenda, fazendaId, logoUrl } = useSelector((state: RootState) => state.config)
  const { ativo: checklistAtivo, loading: loadingChecklistRegras } = useChecklistAtivo('rodeio')
  const { garantirExecucao } = useExecucaoRotina()
  const {
    showObservacaoModal,
    horariosModal,
    iniciarSalvamento,
    confirmarObservacao,
    cancelarObservacao,
  } = useRegistroComExecucao('rodeio')

  useEffect(() => {
    garantirExecucao('rodeio')
  }, [garantirExecucao])

  const [form, setForm] = useState<FormState>(makeInitial)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showEscoreModal, setShowEscoreModal] = useState(false)
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [detalhesLote, setDetalhesLote] = useState<any>(null)
  const [metaRodeioInfo, setMetaRodeioInfo] = useState<{ metaDias: number; diasDesdeUltimo: number; diasAteProximo: number; isDentroMeta: boolean; hasRecord: boolean } | null>(null)
  const [funcionariosDisponiveis, setFuncionariosDisponiveis] = useState<string[]>([])

  // Carregar lotes e funcionários do cache global, com fallback para Supabase
  useEffect(() => {
    const loadData = async () => {
      const cache = await getCachedCadastroData()
      if (cache && cache.lotes && cache.lotes.length > 0) {
        setLotesDisponiveis(cache.lotes || [])
        setFuncionariosDisponiveis(cache.funcionarios || [])
      } else if (fazendaId) {
        try {
          const [lotesData, funcionariosData] = await Promise.all([
            getLotes(fazendaId),
            getFuncionarios(fazendaId)
          ])
          setLotesDisponiveis(lotesData?.map((l: any) => l.nome) || [])
          setFuncionariosDisponiveis(funcionariosData?.map((f: any) => f.nome) || [])
        } catch (error) {
          console.error('Erro ao carregar dados do Supabase:', error)
        }
      }
    }
    loadData()
  }, [fazendaId])

  // Escutar atualizações do cache de cadastro
  useEffect(() => {
    const unsubscribe = eventBus.on(CADASTRO_CACHE_UPDATED, (data: any) => {
      console.log('[RodeioPage] Cache atualizado, recarregando dados')
      if (data) {
        setLotesDisponiveis(data.lotes || [])
        setFuncionariosDisponiveis(data.funcionarios || [])
      }
    })

    return unsubscribe
  }, [])

  // Buscar detalhes do lote quando selecionado
  useEffect(() => {
    async function carregarDetalhesLote() {
      if (!form.numeroLote || !fazendaId) {
        setDetalhesLote(null)
        setForm(prev => ({ ...prev, loteId: '', pastoId: '' }))
        return
      }

      try {
        const lote = await getLoteByNomeCached(fazendaId, form.numeroLote)
        if (lote) {
          // Buscar detalhes de categorias do lote
          const categoriasDetalhes = await getLoteDetalhesComCategoriasCached(lote.id)

          // Buscar último rodeio e calcular meta
          const lastRodeioDate = await getLastRodeioDate(lote.id)
          const metaDias = lote.meta_intervalo_rodeio_dias || 0
          const hasRecord = !!lastRodeioDate
          let diasDesdeUltimo = 0
          if (lastRodeioDate) {
            // Normalize both dates to midnight to avoid timezone issues
            const hoje = new Date()
            hoje.setHours(0, 0, 0, 0)
            const ultimo = new Date(lastRodeioDate)
            ultimo.setHours(0, 0, 0, 0)
            const diffMs = hoje.getTime() - ultimo.getTime()
            diasDesdeUltimo = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
          }
          const diasAteProximo = metaDias - diasDesdeUltimo
          setMetaRodeioInfo({
            metaDias,
            diasDesdeUltimo,
            diasAteProximo,
            isDentroMeta: metaDias > 0 ? diasDesdeUltimo <= metaDias : true,
            hasRecord
          })

          // Combinar dados do lote com dados de categorias
          setDetalhesLote({
            ...lote,
            categorias: categoriasDetalhes.categorias,
            n_cabecas: categoriasDetalhes.quant_atual,
            peso_vivo_kg: categoriasDetalhes.peso_vivo_kg,
            qtd_bezerros: categoriasDetalhes.qtd_bezerros
          })
          // Armazenar o ID do lote e o pasto_id
          setForm(prev => ({ ...prev, loteId: lote.id, pastoId: lote.pasto_id || '' }))
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do lote:', error)
        setDetalhesLote(null)
        setMetaRodeioInfo(null)
        setForm(prev => ({ ...prev, loteId: '', pastoId: '' }))
      }
    }

    carregarDetalhesLote()
  }, [form.numeroLote, fazendaId])

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const setDiagnosticoValor = (campo: string) => (val: string) =>
    setForm((p) => ({
      ...p,
      diagnosticos: {
        ...p.diagnosticos,
        [campo]: { ...p.diagnosticos[campo], valor: val }
      }
    }))

  const setDiagnosticoObs = (campo: string) => (val: string) =>
    setForm((p) => ({
      ...p,
      diagnosticos: {
        ...p.diagnosticos,
        [campo]: { ...p.diagnosticos[campo], observacao: val }
      }
    }))

  const validationRules = {
    data: { required: true },
    numeroLote: { required: true },
    gadoContado: { required: true },
    ...(checklistAtivo ? DIAGNOSTICOS.reduce((acc, { campo }) => {
      acc[campo] = { required: true }
      return acc
    }, {} as Record<string, { required: boolean }>) : {}),
    escoreFezes: { required: true },
    equipe: { required: true },
  }

  const { isValid } = useFormValidation(form, validationRules)

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const total = ['vaca', 'touro', 'boiGordo', 'boiMagro', 'garrote', 'bezerro', 'novilha', 'tropa', 'outros'].reduce(
    (acc, c) => acc + (Number(form[c as keyof FormState]) || 0), 0
  )

  const executarSalvamento = async () => {
    setSalvando(true)
    setErrors([])

    // Validate form using the validation hook
    if (!isValid) {
      setSalvando(false)
      return
    }

    // Calcular total de animais baseado na resposta de gadoContado
    let totalAnimais = 0
    if (form.gadoContado === 'Sim') {
      totalAnimais = (Number(form.vaca) || 0) + (Number(form.touro) || 0) + (Number(form.bezerro) || 0) +
                      (Number(form.boiGordo) || 0) + (Number(form.boiMagro) || 0) + (Number(form.garrote) || 0) +
                      (Number(form.novilha) || 0) + (Number(form.tropa) || 0) + (Number(form.outros) || 0)
    } else if (form.gadoContado === 'Não' && detalhesLote) {
      totalAnimais = (detalhesLote.n_cabecas || 0) + (detalhesLote.qtd_bezerros || 0)
    }

    const result = await salvarRegistro('rodeio', {
      data: form.data,
      pasto: form.pasto,
      pastoId: form.pastoId,
      numeroLote: form.numeroLote,
      loteId: form.loteId,
      gadoContado: form.gadoContado,
      vaca: form.vaca ? Number(form.vaca) : 0,
      touro: form.touro ? Number(form.touro) : 0,
      boiGordo: form.boiGordo ? Number(form.boiGordo) : 0,
      boiMagro: form.boiMagro ? Number(form.boiMagro) : 0,
      garrote: form.garrote ? Number(form.garrote) : 0,
      bezerro: form.bezerro ? Number(form.bezerro) : 0,
      novilha: form.novilha ? Number(form.novilha) : 0,
      tropa: form.tropa ? Number(form.tropa) : 0,
      outros: form.outros ? Number(form.outros) : 0,
      totalCabecas: totalAnimais,
      diagnosticos: checklistAtivo ? form.diagnosticos : null,
      escoreFezes: form.escoreFezes || null,
      equipe: form.equipe ? Number(form.equipe) : null,
      equipeNomes: form.equipeNomes,
      escoreGado: form.escoreGado ? Number(form.escoreGado) : null,
      // Campos de divergência
      n_cabecas: detalhesLote?.n_cabecas || 0,
      qtd_bezerros: detalhesLote?.qtd_bezerros || 0,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo({ ...result.registro, metaRodeio: metaRodeioInfo })
      setShowSuccessModal(true)
      setForm(makeInitial())
    }
  }

  const handleSalvar = async () => {
    const podeContinuar = await iniciarSalvamento()
    if (!podeContinuar) {
      setSalvando(false)
      return
    }
    await executarSalvamento()
  }

  const handleSalvarContinuar = async () => {
    await executarSalvamento()
  }

  const handleLimpar = () => {
    setForm(makeInitial())
    setErrors([])
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    setForm(makeInitial())
    setErrors([])
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
          <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2">RODEIO GADO</h1>
          <button
            onClick={() => navigate('/caderneta/rodeio/lista')}
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
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS PRINCIPAIS</h2>
          <DatePicker label="DATA" value={form.data} onChange={set('data')} error={getError('data')} />
          <Input
            label="MANEJADOR"
            placeholder="Nome do responsável"
            value={usuario || ''}
            readOnly
          />
          <div className="grid grid-cols-1 gap-3">
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
                label="NÚMERO LOTE"
                placeholder="Carregando..."
                value={form.numeroLote}
                onChange={setInput('numeroLote')}
                error={getError('numeroLote')}
                inputMode="numeric"
                disabled
              />
            )}
          </div>
          {detalhesLote && (
            <LoteDetalhesCard detalhes={detalhesLote} processarCategorias={processarCategorias} metaRodeio={metaRodeioInfo} />
          )}
        </div>

        {/* Seção 2: Quantidade por Categoria */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. QUANTIDADE DE ANIMAIS</h2>
          <div>
            <label className="block text-lg font-bold text-gray-900 mb-3 whitespace-pre-wrap">O GADO FOI CONTADO?</label>
            <div className="grid grid-cols-2 gap-2">
              <label className={`
                cursor-pointer rounded-xl border-2
                transition-all active:scale-95
                flex flex-col items-center justify-center gap-1
                p-2 min-h-[70px]
                ${form.gadoContado === 'Sim' ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]' : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
              `}>
                <input type="radio" name="gadoContado" className="sr-only" value="Sim" checked={form.gadoContado === 'Sim'} onChange={() => set('gadoContado')('Sim')} />
                <span className="text-base sm:text-lg font-bold text-center leading-tight">SIM</span>
              </label>
              <label className={`
                cursor-pointer rounded-xl border-2
                transition-all active:scale-95
                flex flex-col items-center justify-center gap-1
                p-2 min-h-[70px]
                ${form.gadoContado === 'Não' ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]' : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
              `}>
                <input type="radio" name="gadoContado" className="sr-only" value="Não" checked={form.gadoContado === 'Não'} onChange={() => set('gadoContado')('Não')} />
                <span className="text-base sm:text-lg font-bold text-center leading-tight">NÃO</span>
              </label>
            </div>
          </div>
          {form.gadoContado === 'Sim' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIAS_ANIMAIS.map(({ campo, label }) => (
                  <Input
                    key={campo}
                    label={label}
                    placeholder="0"
                    value={form[campo as keyof FormState] as string}
                    onChange={setInput(campo as keyof FormState)}
                    inputMode="numeric"
                    type="number"
                    min="0"
                  />
                ))}
              </div>
              {total > 0 && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-lg font-bold text-gray-700">TOTAL</span>
                  <span className="text-2xl font-bold text-black">{total} cabeças</span>
                </div>
              )}
            </>
          )}
          {form.gadoContado === 'Não' && detalhesLote && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-gray-500 font-semibold mb-2">CABEÇAS MANEJADAS</p>
              <p className="text-2xl font-bold text-gray-900">
                {(detalhesLote.n_cabecas || 0) + (detalhesLote.qtd_bezerros || 0)} animais
              </p>
            </div>
          )}
          {form.gadoContado === 'Sim' && total > 0 && detalhesLote && (
            (() => {
              const totalLote = (detalhesLote.n_cabecas || 0) + (detalhesLote.qtd_bezerros || 0)
              const diferenca = total - totalLote
              if (diferenca !== 0) {
                return (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                    <p className="text-base font-semibold text-orange-800 text-justify">
                      ⚠️ O total informado ({total} animais) não coincide com o total do lote ({totalLote} animais)
                    </p>
                    <p className="text-base text-orange-700 mt-1">
                      {diferenca > 0 
                        ? `Excedeu ${diferenca} animais do total do lote` 
                        : `Faltam ${Math.abs(diferenca)} animais para completar o lote`
                      }
                    </p>
                  </div>
                )
              }
              return null
            })()
          )}
        </div>

        {/* Seção 3: Avaliação Geral S/N */}
        {loadingChecklistRegras ? (
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
            <h2 className="text-lg font-black text-gray-900 tracking-tight">3. AVALIAÇÃO GERAL</h2>
            <p className="text-gray-500 text-center py-4">Carregando regras do checklist...</p>
          </div>
        ) : checklistAtivo ? (
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
            <h2 className="text-lg font-black text-gray-900 tracking-tight">3. AVALIAÇÃO GERAL</h2>
            {DIAGNOSTICOS.map(({ campo, label }) => (
              <div key={campo}>
                <Radio
                  name={campo}
                  label={label}
                  options={SN_OPTIONS}
                  value={form.diagnosticos[campo]?.valor || ''}
                  onChange={setDiagnosticoValor(campo)}
                  error={getError(campo)}
                  gridCols={2}
                />
                {((form.diagnosticos[campo]?.valor === 'N' && !INVERTED_DIAGNOSTICOS.includes(campo)) ||
                  (form.diagnosticos[campo]?.valor === 'S' && INVERTED_DIAGNOSTICOS.includes(campo))) && (
                  <Input
                    placeholder="Adicionar observação (opcional)"
                    value={form.diagnosticos[campo]?.observacao || ''}
                    onChange={(e) => setDiagnosticoObs(campo)(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>
            ))}
          </div>
        ) : null}

        {/* Seção 4: Avaliação do Gado e Equipe */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. AVALIAÇÃO DO GADO E EQUIPE</h2>
          
          {/* Escore do Gado - moved from Seção 5 */}
          <button
            onClick={() => setShowEscoreModal(true)}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors"
          >
            <span className="text-xl">📄</span>
            <span>POP ESCORE CORPORAL</span>
          </button>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {ESCORES.map((escore) => (
              <button
                key={escore.value}
                onClick={() => set('escoreGado')(escore.value)}
                className={`py-3 px-4 rounded-xl font-bold transition-all transform hover:scale-105 ${
                  form.escoreGado === escore.value ? `${escore.color} text-black` : 'bg-gray-200 text-gray-700'
                }`}
              >
                {escore.label}
              </button>
            ))}
          </div>

          {/* Escore de Fezes */}
          <button
            onClick={() => setShowPdfModal(true)}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors"
          >
            <span className="text-xl">📄</span>
            <span>POP ESCORE DE FEZES</span>
          </button>
          <Radio
            name="escoreFezes"
            label="ESCORE DE FEZES"
            options={ESCALA_5}
            value={form.escoreFezes}
            onChange={set('escoreFezes')}
            error={getError('escoreFezes')}
            gridCols={5}
          />
          
          {/* Equipe */}
          <Radio
            name="equipe"
            label="N° PESSOAS NO MANEJO"
            options={ESCALA_EQUIPE}
            value={form.equipe}
            onChange={(value) => {
              set('equipe')(value)
              // Reset equipeNomes when number changes
              const numPessoas = Number(value) || 0
              setForm(prev => ({
                ...prev,
                equipeNomes: Array(numPessoas).fill('')
              }))
            }}
            error={getError('equipe')}
            gridCols={5}
          />
          {form.equipe && Number(form.equipe) > 0 && (
            <div className="flex flex-col gap-3">
              {Array.from({ length: Number(form.equipe) }).map((_, index) => (
                funcionariosDisponiveis.length > 0 ? (
                  <SearchableModal
                    key={index}
                    label={<span>Nome da {index + 1}ª pessoa <span className="text-red-500">*</span></span>}
                    value={form.equipeNomes[index] || ''}
                    onChange={(val) => {
                      const newNomes = [...form.equipeNomes]
                      newNomes[index] = val
                      setForm(prev => ({ ...prev, equipeNomes: newNomes }))
                    }}
                    options={funcionariosDisponiveis}
                    placeholder="Buscar funcionário..."
                    id={`equipeNome-${index}`}
                    name={`equipeNome-${index}`}
                  />
                ) : (
                  <Input
                    key={index}
                    label={`Nome da ${index + 1}ª pessoa`}
                    placeholder="Nome"
                    value={form.equipeNomes[index] || ''}
                    onChange={(e) => {
                      const newNomes = [...form.equipeNomes]
                      newNomes[index] = e.target.value
                      setForm(prev => ({ ...prev, equipeNomes: newNomes }))
                    }}
                  />
                )
              ))}
            </div>
          )}
        </div>

        {/* Seção 5: Procedimentos - OCULTO (PODERÁ SER REUTILIZADO NA ENFERMARIA) */}
        {/*<div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">5. PROCEDIMENTOS REALIZADOS</h2>
          <Input
            label="ANIMAIS TRATADOS"
            placeholder="0"
            value={form.animaisTratados}
            onChange={setInput('animaisTratados')}
            inputMode="numeric"
            type="number"
            min="0"
            max="20"
          />
          {form.animaisTratados && Number(form.animaisTratados) > 0 && (
            <p className="text-base text-gray-600">
              Registre o ID e os tratamentos para cada animal. Os quadrados vermelhos significam que faltam dados. Quando o quadrado ficar verde, significa que dados suficientes foram preenchidos.
            </p>
          )}
          
          {/* Cards de animais tratados *\/}
          {form.animaisTratadosDetalhes.map((animal, index) => (
            <div
              key={index}
              className={`rounded-xl p-4 border-2 ${
                isAnimalCompleto(index)
                  ? 'bg-green-100 border-green-300'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-bold text-gray-900">
                  ANIMAL {index + 1}
                </h3>
              </div>
              
              <Input
                label="Identificação"
                placeholder="Ex: Vaca 1, B123, Touro 1..."
                value={animal.id}
                onChange={(e) => updateAnimalId(index, e.target.value)}
                className="mb-3"
              />
              
              <p className="text-sm font-bold text-gray-900 mb-2">Tratamentos:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PROCEDIMENTOS_OPCOES.map((proc) => (
                  <Checkbox
                    key={proc}
                    label={proc}
                    checked={animal.tratamentos.includes(proc)}
                    onChange={() => toggleAnimalTratamento(index, proc)}
                  />
                ))}
              </div>
              
              {animal.tratamentos.includes('Outros') && (
                <Input
                  label="Descreva outros tratamentos"
                  placeholder="Ex: Aplicação de vitaminas, limpeza de feridas..."
                  value={animal.tratamentos.find(t => t.startsWith('Outros:'))?.replace('Outros: ', '') || ''}
                  onChange={(e) => {
                    setForm((prev) => {
                      const detalhes = [...prev.animaisTratadosDetalhes]
                      const outrosTratamentos = detalhes[index].tratamentos.filter(t => !t.startsWith('Outros:'))
                      if (e.target.value) {
                        outrosTratamentos.push(`Outros: ${e.target.value}`)
                      }
                      detalhes[index] = { ...detalhes[index], tratamentos: outrosTratamentos }
                      return { ...prev, animaisTratadosDetalhes: detalhes }
                    })
                  }}
                  className="mt-2"
                />
              )}
            </div>
          ))}
        </div>*/}

        <div className="flex flex-col gap-3">
          <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾" disabled={!isValid}>
            SALVAR
          </Button>
          <Button onClick={handleLimpar} variant="secondary" icon="🧹">
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
        cadernetaName="Rodeio Gado"
        registro={registroSalvo}
        caderneta="rodeio"
      />

      <ObservacaoAtrasoModal
        isOpen={showObservacaoModal}
        onClose={async (observacao) => {
          if (observacao !== undefined) {
            setSalvando(true)
            await confirmarObservacao(observacao)
            await handleSalvarContinuar()
          } else {
            cancelarObservacao()
            setSalvando(false)
          }
        }}
        horarioProgramado={horariosModal.programado}
        horarioRegistro={horariosModal.registro}
      />

      <PdfModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        images={[
          `${BASE}docs/fezes/POP_Fezes_01.jpg`
        ]}
      />

      <PdfModal
        isOpen={showEscoreModal}
        onClose={() => setShowEscoreModal(false)}
        images={[
          `${BASE}docs/ECC/POP_ECC.jpeg`
        ]}
      />
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, ValidationMessage, SearchableModal, Radio, CheckboxGroup } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import {
  getCachedCadastroData,
  getLoteByNomeCached,
  getLoteDetalhesComCategoriasCached,
  getMedicamentosCached,
} from '../../services/cadastroCache'
import { getLotes } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import LoteDetalhesCard from '../../components/LoteDetalhesCard'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { useFormValidation } from '../../hooks/useFormValidation'

const DIAGNOSTICOS = [
  { campo: 'feridaCascos', label: 'FERIDA NOS CASCOS?' },
  { campo: 'sintomasPneumonia', label: 'SINTOMAS DE PNEUMONIA?' },
  { campo: 'picadoCobra', label: 'PICADO POR COBRA?' },
  { campo: 'incoordenacaoTremores', label: 'INCOORDENAÇÃO E TREMORES MUSCULARES?' },
  { campo: 'febreAlta', label: 'FEBRE ALTA?' },
  { campo: 'presencaSangue', label: 'EXISTE ALGUM SANGRAMENTO?' },
  { campo: 'fraturas', label: 'ALGUMA FRATURA / DESLOCAMENTO DE MEMBROS?' },
  { campo: 'desordensDigestivas', label: 'DESORDENS DIGESTIVAS / TIMPANISMO / DIARREIA?' },
  { campo: 'cegueira', label: 'CEGUEIRA?' },
  { campo: 'andarCambaleante', label: 'ANDAR CAMBALEANTE?' },
  { campo: 'bicheira', label: 'TEM BICHEIRA?' },
  { campo: 'animalInchado', label: 'ANIMAL COM INCHAÇO?' },
]

const SN_OPTIONS = [
  { value: 'S', label: 'SIM', icon: '✅' },
  { value: 'N', label: 'NÃO', icon: '❌' },
]

const CATEGORIAS = [
  { value: 'Vaca', label: 'VACA' },
  { value: 'Touro', label: 'TOURO' },
  { value: 'Boi Gordo', label: 'BOI GORDO' },
  { value: 'Boi Magro', label: 'BOI MAGRO' },
  { value: 'Garrote', label: 'GARROTE' },
  { value: 'Bezerro', label: 'BEZERRO' },
  { value: 'Novilha', label: 'NOVILHA' },
  { value: 'Tropa', label: 'TROPA' },
  { value: 'Outros', label: 'OUTROS' },
]

const RACAS = [
  { value: 'Nelore', label: 'NELORE' },
  { value: 'Angus', label: 'ANGUS' },
  { value: 'Leiteiro', label: 'LEITEIRO' },
  { value: 'Anelorado', label: 'ANELORADO' },
  { value: 'Guacho', label: 'GUACHO' },
  { value: 'SRD', label: 'SRD' },
  { value: 'Outros', label: 'OUTROS' },
]

const SEXO_OPTIONS = [
  { value: 'Macho', label: 'MACHO', icon: '♂️' },
  { value: 'Fêmea', label: 'FÊMEA', icon: '♀️' },
]

interface MedicamentoItem {
  medicamentoId: string
  tipo: string
  nomeComercial: string
  principioAtivo: string
  doseRecomendada: string
  doseAplicada: string
}

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
  lote: string
  loteId: string
  pastoId: string
  brinco: string
  chip: string
  sexo: string
  raca: string
  racaOutros: string
  idade: string
  categorias: string[]
  outrosTexto: string
  diagnosticos: {
    [key: string]: {
      valor: string | null
      observacao: string
    }
  }
  observacaoTratamento: string
  medicamentos: MedicamentoItem[]
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  pasto: '',
  lote: '',
  loteId: '',
  pastoId: '',
  brinco: '',
  chip: '',
  sexo: '',
  raca: '',
  racaOutros: '',
  idade: '',
  categorias: [],
  outrosTexto: '',
  diagnosticos: {},
  observacaoTratamento: '',
  medicamentos: [],
})

export default function EnfermariaPage() {
  const navigate = useNavigate()
  const { usuario, fazenda, fazendaId, logoUrl } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [detalhesLote, setDetalhesLote] = useState<any>(null)
  const [medicamentosDisponiveis, setMedicamentosDisponiveis] = useState<any[]>([])
  const [mostrarFormularioMedicamento, setMostrarFormularioMedicamento] = useState(false)
  const [medicamentoEditando, setMedicamentoEditando] = useState<MedicamentoItem | null>(null)
  const [medicamentoEditandoIndex, setMedicamentoEditandoIndex] = useState<number | null>(null)
  const [tipoFiltro, setTipoFiltro] = useState<string>('')

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

  const setDiagnosticoObs = (campo: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({
      ...p,
      diagnosticos: {
        ...p.diagnosticos,
        [campo]: { ...p.diagnosticos[campo], observacao: e.target.value }
      }
    }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Validation rules
  const validationRules: any = {
    data: { required: true },
    lote: { required: true },
    brinco: { required: true },
    sexo: { required: true },
    raca: { required: true },
    idade: { required: true },
    categorias: { required: true },
    ...Object.fromEntries(DIAGNOSTICOS.map(d => [d.campo, { required: true }])),
  }

  // Add validation for racaOutros when raca is 'Outros'
  if (form.raca === 'Outros') {
    validationRules.racaOutros = { required: true }
  }

  // Add validation for outrosTexto when categorias includes 'Outros'
  if (form.categorias.includes('Outros')) {
    validationRules.outrosTexto = { required: true }
  }

  const { isValid } = useFormValidation(form, validationRules)

  const handleCategoriasChange = (newCategorias: string[]) => {
    setForm((prev) => ({ ...prev, categorias: newCategorias }))
  }

  // Handlers para medicamentos
  const handleAdicionarMedicamento = () => {
    setMostrarFormularioMedicamento(true)
    setMedicamentoEditando(null)
    setMedicamentoEditandoIndex(null)
    setTipoFiltro('')
  }

  const handleEditarMedicamento = (index: number) => {
    setMostrarFormularioMedicamento(true)
    setMedicamentoEditando(form.medicamentos[index])
    setMedicamentoEditandoIndex(index)
    setTipoFiltro(form.medicamentos[index].tipo)
  }

  const handleRemoverMedicamento = (index: number) => {
    setForm(prev => ({
      ...prev,
      medicamentos: prev.medicamentos.filter((_, i) => i !== index)
    }))
  }

  const handleSalvarMedicamento = () => {
    if (!medicamentoEditando?.medicamentoId || !medicamentoEditando?.doseAplicada) {
      return
    }

    if (medicamentoEditandoIndex !== null) {
      // Editar existente
      setForm(prev => ({
        ...prev,
        medicamentos: prev.medicamentos.map((item, index) =>
          index === medicamentoEditandoIndex ? medicamentoEditando : item
        )
      }))
    } else {
      // Adicionar novo
      setForm(prev => ({
        ...prev,
        medicamentos: [...prev.medicamentos, medicamentoEditando]
      }))
    }

    setMostrarFormularioMedicamento(false)
    setMedicamentoEditando(null)
    setMedicamentoEditandoIndex(null)
    setTipoFiltro('')
  }

  const handleCancelarMedicamento = () => {
    setMostrarFormularioMedicamento(false)
    setMedicamentoEditando(null)
    setMedicamentoEditandoIndex(null)
    setTipoFiltro('')
  }

  const handleSelecionarMedicamento = (medicamento: any) => {
    setMedicamentoEditando({
      medicamentoId: medicamento.id,
      tipo: medicamento.tipo,
      nomeComercial: medicamento.nome_comercial,
      principioAtivo: medicamento.principio_ativo || '',
      doseRecomendada: medicamento.dose_recomendada || '',
      doseAplicada: medicamentoEditando?.doseAplicada || '',
    })
  }

  // Carregar lotes do cache global, com fallback para Supabase
  useEffect(() => {
    const loadData = async () => {
      const cache = await getCachedCadastroData()
      if (cache && cache.lotes && cache.lotes.length > 0) {
        setLotesDisponiveis(cache.lotes || [])
      } else if (fazendaId) {
        try {
          const lotesData = await getLotes(fazendaId)
          setLotesDisponiveis(lotesData?.map((l: any) => l.nome) || [])
        } catch (error) {
          console.error('Erro ao carregar dados do Supabase:', error)
        }
      }
    }
    loadData()
  }, [fazendaId])

  // Carregar medicamentos (com cache lazy para offline)
  useEffect(() => {
    const loadMedicamentos = async () => {
      if (fazendaId) {
        try {
          const medicamentos = await getMedicamentosCached(fazendaId)
          setMedicamentosDisponiveis(medicamentos || [])
        } catch (error) {
          console.error('Erro ao carregar medicamentos:', error)
        }
      }
    }
    loadMedicamentos()
  }, [fazendaId])

  // Escutar atualizações do cache de cadastro
  useEffect(() => {
    const unsubscribe = eventBus.on(CADASTRO_CACHE_UPDATED, (data: any) => {
      console.log('[EnfermariaPage] Cache atualizado, recarregando dados')
      if (data) {
        setLotesDisponiveis(data.lotes || [])
      }
    })

    return unsubscribe
  }, [])

  // Buscar detalhes do lote quando selecionado e auto-derivar pasto
  useEffect(() => {
    async function carregarDetalhesLote() {
      if (!form.lote || !fazendaId) {
        setDetalhesLote(null)
        setForm(prev => ({ ...prev, pasto: '', loteId: '', pastoId: '' }))
        return
      }

      try {
        const lote = await getLoteByNomeCached(fazendaId, form.lote)
        if (lote) {
          // Buscar detalhes de categorias do lote
          const categoriasDetalhes = await getLoteDetalhesComCategoriasCached(lote.id)
          
          // Combinar dados do lote com dados de categorias
          setDetalhesLote({
            ...lote,
            categorias: categoriasDetalhes.categorias,
            n_cabecas: categoriasDetalhes.quant_atual,
            peso_vivo_kg: categoriasDetalhes.peso_vivo_kg,
            qtd_bezerros: categoriasDetalhes.qtd_bezerros
          })

          // Auto-derivar pasto do lote
          const pastoNome = (lote as any).pastos?.nome || ''
          setForm(prev => ({
            ...prev,
            pasto: pastoNome,
            loteId: lote.id,
            pastoId: (lote as any).pasto_id || ''
          }))
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do lote:', error)
        setDetalhesLote(null)
        setForm(prev => ({ ...prev, pasto: '', loteId: '', pastoId: '' }))
      }
    }

    carregarDetalhesLote()
  }, [form.lote, fazendaId])

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    // Validar que pelo menos um medicamento foi adicionado
    if (form.medicamentos.length === 0) {
      setErrors([{ field: 'medicamentos', message: 'Adicione pelo menos um medicamento' }])
      setSalvando(false)
      return
    }

    // Montar categorias como string separada por vírgula
    let categoriasArray = form.categorias.filter(c => c !== 'Outros')
    
    // Se "Outros" estiver selecionado e houver texto, adicionar no final
    if (form.categorias.includes('Outros') && form.outrosTexto.trim()) {
      categoriasArray.push(`Outros: ${form.outrosTexto.trim()}`)
    } else if (form.categorias.includes('Outros')) {
      categoriasArray.push('Outros')
    }
    
    const categoriasString = categoriasArray.join(', ')

    const racaFinal = form.raca === 'Outros' ? form.racaOutros : form.raca

    const result = await salvarRegistro('enfermaria', {
      data: form.data,
      pasto: form.pasto,
      pastoId: form.pastoId,
      lote: form.lote,
      loteId: form.loteId,
      brinco: form.brinco,
      chip: form.chip,
      sexo: form.sexo,
      raca: racaFinal,
      idade: form.idade,
      categoria: categoriasString,
      diagnosticos: form.diagnosticos,
      medicamentos: form.medicamentos,
      observacaoTratamento: form.observacaoTratamento,
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
          <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2">ENFERMARIA</h1>
          <button
            onClick={() => navigate('/caderneta/enfermaria/lista')}
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
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          {usuario && (
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <span className="text-xl">👤</span>
              <p className="text-gray-700 font-semibold">{usuario}</p>
            </div>
          )}
          <h2 className="section-title">1. DADOS PRINCIPAIS</h2>
          <DatePicker label={<span>DATA <span className="text-red-500">*</span></span>} value={form.data} onChange={(val) => setForm((p) => ({ ...p, data: val }))} error={getError('data')} />
          <Input
            label="RESPONSÁVEL"
            placeholder="Nome do responsável"
            value={usuario || ''}
            readOnly
          />
          {lotesDisponiveis.length > 0 ? (
            <SearchableModal
              label={<span>LOTE <span className="text-red-500">*</span></span>}
              value={form.lote}
              onChange={(val) => setForm((p) => ({ ...p, lote: val }))}
              error={getError('lote')}
              options={lotesDisponiveis}
              placeholder="Buscar lote..."
              id="lote"
              name="lote"
            />
          ) : (
            <Input
              label={<span>LOTE <span className="text-red-500">*</span></span>}
              placeholder="Carregando..."
              value={form.lote}
              onChange={setInput('lote')}
              error={getError('lote')}
              disabled
              id="lote"
            />
          )}
          {detalhesLote && (
            <LoteDetalhesCard detalhes={detalhesLote} processarCategorias={processarCategorias} />
          )}
        </div>

        {/* Seção 2: Identificação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. IDENTIFICAÇÃO</h2>
          <Input
            label={<span>ID. BRINCO <span className="text-red-500">*</span></span>}
            placeholder="Número do brinco"
            value={form.brinco}
            onChange={setInput('brinco')}
            error={getError('brinco')}
          />
          <Input
            label={<span>ID. CHIP</span>}
            placeholder="Número do chip"
            value={form.chip}
            onChange={setInput('chip')}
            error={getError('chip')}
          />
          <Radio
            name="sexo"
            label={<span>SEXO <span className="text-red-500">*</span></span>}
            options={SEXO_OPTIONS}
            value={form.sexo}
            onChange={(val) => setForm((p) => ({ ...p, sexo: val }))}
            error={getError('sexo')}
            gridCols={2}
          />
          <Radio
            name="raca"
            label={<span>RAÇA <span className="text-red-500">*</span></span>}
            options={RACAS}
            value={form.raca}
            onChange={(val) => setForm((p) => ({ ...p, raca: val }))}
            error={getError('raca')}
            gridCols={2}
          />
          {form.raca === 'Outros' && (
            <Input
              label={<span>QUAL RAÇA? <span className="text-red-500">*</span></span>}
              placeholder="Ex: Brahman, Hereford, Simmental..."
              value={form.racaOutros}
              onChange={setInput('racaOutros')}
              error={getError('racaOutros')}
            />
          )}
          <div>
            <label className="block text-lg font-bold text-gray-900 mb-3 whitespace-pre-wrap">IDADE <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              <label className={`
                cursor-pointer rounded-xl border-2 
                transition-all active:scale-95
                flex flex-col items-center justify-center gap-1
                p-2 min-h-[70px]
                ${form.idade === '0 a 4 meses' ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]' : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
              `}>
                <input type="radio" name="idade" className="sr-only" value="0 a 4 meses" checked={form.idade === '0 a 4 meses'} onChange={(e) => setInput('idade')(e)} />
                <span className="text-base sm:text-lg font-bold text-center leading-tight">0 A 4 MESES</span>
              </label>
              <label className={`
                cursor-pointer rounded-xl border-2 
                transition-all active:scale-95
                flex flex-col items-center justify-center gap-1
                p-2 min-h-[70px]
                ${form.idade === '5 a 12 meses' ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]' : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
              `}>
                <input type="radio" name="idade" className="sr-only" value="5 a 12 meses" checked={form.idade === '5 a 12 meses'} onChange={(e) => setInput('idade')(e)} />
                <span className="text-base sm:text-lg font-bold text-center leading-tight">5 A 12 MESES</span>
              </label>
              <label className={`
                cursor-pointer rounded-xl border-2 
                transition-all active:scale-95
                flex flex-col items-center justify-center gap-1
                p-2 min-h-[70px]
                ${form.idade === '13 a 24 meses' ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]' : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
              `}>
                <input type="radio" name="idade" className="sr-only" value="13 a 24 meses" checked={form.idade === '13 a 24 meses'} onChange={(e) => setInput('idade')(e)} />
                <span className="text-base sm:text-lg font-bold text-center leading-tight">13 A 24 MESES</span>
              </label>
              <label className={`
                cursor-pointer rounded-xl border-2 
                transition-all active:scale-95
                flex flex-col items-center justify-center gap-1
                p-2 min-h-[70px]
                ${form.idade === '25 a 36 meses' ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]' : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
              `}>
                <input type="radio" name="idade" className="sr-only" value="25 a 36 meses" checked={form.idade === '25 a 36 meses'} onChange={(e) => setInput('idade')(e)} />
                <span className="text-base sm:text-lg font-bold text-center leading-tight">25 A 36 MESES</span>
              </label>
              <label className={`
                cursor-pointer rounded-xl border-2 
                transition-all active:scale-95
                flex flex-col items-center justify-center gap-1
                p-2 min-h-[70px]
                ${form.idade === 'Acima de 36 meses' ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]' : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
              `}>
                <input type="radio" name="idade" className="sr-only" value="Acima de 36 meses" checked={form.idade === 'Acima de 36 meses'} onChange={(e) => setInput('idade')(e)} />
                <span className="text-base sm:text-lg font-bold text-center leading-tight">ACIMA DE 36 MESES</span>
              </label>
            </div>
          </div>
          <CheckboxGroup
            label={<span>CATEGORIAS: <span className="text-red-500">*</span></span>}
            options={CATEGORIAS}
            selectedValues={form.categorias}
            onChange={handleCategoriasChange}
            error={getError('categorias')}
            gridCols={2}
            hideCheckbox={true}
            id="categorias"
            dataField="categorias"
          />
          {form.categorias.includes('Outros') && (
            <Input
              label={<span>ESPECIFICAR OUTROS: <span className="text-red-500">*</span></span>}
              placeholder="Descreva a categoria"
              value={form.outrosTexto}
              onChange={setInput('outrosTexto')}
              error={getError('outrosTexto')}
            />
          )}
        </div>

        {/* Seção 3: Diagnóstico */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. DIAGNÓSTICO</h2>
          {DIAGNOSTICOS.map(({ campo, label }) => (
            <div key={campo}>
              <Radio
                name={campo}
                label={<span>{label} <span className="text-red-500">*</span></span>}
                options={SN_OPTIONS}
                value={form.diagnosticos[campo]?.valor || ''}
                onChange={setDiagnosticoValor(campo)}
                error={getError(campo)}
                gridCols={2}
              />
              {form.diagnosticos[campo]?.valor === 'S' && (
                <Input
                  placeholder="Adicionar observação (opcional)"
                  value={form.diagnosticos[campo]?.observacao || ''}
                  onChange={setDiagnosticoObs(campo)}
                  className="mt-2"
                />
              )}
            </div>
          ))}
        </div>

        {/* Seção 4: Tratamento */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. TRATAMENTO <span className="text-red-500">*</span></h2>
          
          {/* Lista de medicamentos adicionados */}
          {form.medicamentos.length > 0 && (
            <div className="flex flex-col gap-3">
              {form.medicamentos.map((med, index) => (
                <div key={index} className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="text-lg font-bold text-gray-800 uppercase">{med.tipo}</p>
                      <p className="text-base text-gray-900">{med.nomeComercial}</p>
                      {med.doseRecomendada && (
                        <p className="text-sm text-gray-600">Dose recomendada: {med.doseRecomendada}</p>
                      )}
                      <p className="text-base text-gray-900 font-semibold">Dose aplicada: {med.doseAplicada}</p>
                    </div>
                    <div className="flex gap-2 ml-2">
                      <button
                        onClick={() => handleEditarMedicamento(index)}
                        className="text-blue-500 text-2xl"
                        title="Editar medicamento"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleRemoverMedicamento(index)}
                        className="text-red-500 text-2xl"
                        title="Remover medicamento"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Botão para adicionar medicamento */}
          {!mostrarFormularioMedicamento ? (
            <Button
              onClick={handleAdicionarMedicamento}
              variant="secondary"
              icon="➕"
              fullWidth
            >
              ADICIONAR MEDICAMENTO
            </Button>
          ) : (
            /* Formulário para adicionar/editar medicamento */
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 flex flex-col gap-4">
              <h3 className="text-base font-bold text-gray-900">
                {medicamentoEditandoIndex !== null ? 'EDITAR MEDICAMENTO' : 'NOVO MEDICAMENTO'}
              </h3>
              
              {/* Filtro por tipo */}
              <SearchableModal
                label="FILTRAR POR TIPO"
                value={tipoFiltro}
                onChange={setTipoFiltro}
                options={[...new Set(medicamentosDisponiveis.map(m => m.tipo))]}
                placeholder="Todos"
                id="tipoFiltro"
                name="tipoFiltro"
              />

              {/* Seleção de medicamento */}
              {tipoFiltro && (
                <SearchableModal
                  label="MEDICAMENTO"
                  value={medicamentoEditando?.nomeComercial || ''}
                  onChange={(val) => {
                    const medicamento = medicamentosDisponiveis.find(m => m.nome_comercial === val)
                    if (medicamento) {
                      handleSelecionarMedicamento(medicamento)
                    }
                  }}
                  options={medicamentosDisponiveis
                    .filter(m => m.tipo === tipoFiltro)
                    .map(m => m.nome_comercial)}
                  placeholder="Selecione um medicamento..."
                  id="medicamento"
                  name="medicamento"
                />
              )}
              {medicamentoEditando?.principioAtivo && (
                <p className="text-base text-gray-600">Princípio ativo: {medicamentoEditando.principioAtivo}</p>
              )}
              {medicamentoEditando?.doseRecomendada && (
                <p className="text-base text-gray-600">Dose recomendada: {medicamentoEditando.doseRecomendada}</p>
              )}

              <Input
                label="DOSE APLICADA"
                placeholder="Informe a dose aplicada"
                value={medicamentoEditando?.doseAplicada || ''}
                onChange={(e) => setMedicamentoEditando(prev => prev ? { ...prev, doseAplicada: e.target.value } : null)}
              />

              <div className="flex gap-2">
                <Button onClick={handleSalvarMedicamento} variant="success" icon="✓" className="text-sm">
                  SALVAR
                </Button>
                <Button onClick={handleCancelarMedicamento} variant="secondary" icon="✕" className="text-sm">
                  CANCELAR
                </Button>
              </div>
            </div>
          )}

          <Input
            label="OBSERVAÇÃO"
            placeholder="Detalhes adicionais (opcional)"
            value={form.observacaoTratamento}
            onChange={setInput('observacaoTratamento')}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾" disabled={!isValid || form.medicamentos.length === 0}>
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
        cadernetaName="Enfermaria"
        registro={registroSalvo}
        caderneta="enfermaria"
      />
    </div>
  )
}

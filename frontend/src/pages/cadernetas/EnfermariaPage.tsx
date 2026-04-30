import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, ValidationMessage, SearchableModal, Radio, CheckboxGroup } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { getCachedCadastroData } from '../../services/cadastroCache'
import { scrollToFirstError } from '../../utils/scrollToError'
import LoteDetalhesCard from '../../components/LoteDetalhesCard'

const TRATAMENTOS = [
  { value: 'Mata Bicheira', label: 'MATA BICHEIRA' },
  { value: 'Antibiótico', label: 'ANTIBIÓTICO' },
  { value: 'Tiguvon', label: 'TIGUVON' },
  { value: 'Vermífugo', label: 'VERMÍFUGO' },
  { value: 'Anti-Tóxico', label: 'ANTI-TÓXICO' },
  { value: 'Anti-Inflamatório', label: 'ANTI-INFLAMATÓRIO' },
  { value: 'Soro Antiofídico', label: 'SORO ANTIOFÍDICO' },
  { value: 'Soro Vitamínico', label: 'SORO VITAMÍNICO' },
  { value: 'Vacina', label: 'VACINA' },
  { value: 'Inseticida', label: 'INSETICIDA' },
  { value: 'Complexo Vitamínico', label: 'COMPLEXO VITAMÍNICO' },
  { value: 'Outros', label: 'OUTROS' },
]

const DIAGNOSTICOS = [
  { campo: 'problemaCasco', label: 'Problema de casco?' },
  { campo: 'sintomasPneumonia', label: 'Sintomas pneumonia?' },
  { campo: 'picadoCobra', label: 'Picado por cobra?' },
  { campo: 'incoordenacaoTremores', label: 'Incoordenação e tremores musculares?' },
  { campo: 'febreAlta', label: 'Febre alta?' },
  { campo: 'presencaSangue', label: 'Presença de sangue?' },
  { campo: 'fraturas', label: 'Fraturas?' },
  { campo: 'desordensDigestivas', label: 'Desordens digestivas?' },
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
  brincoChip: string
  categorias: string[]
  outrosTexto: string
  tratamentos: string[]
  tratamentoOutros: string
  problemaCasco: string
  problemaCascoObs: string
  sintomasPneumonia: string
  sintomasPneumoniaObs: string
  picadoCobra: string
  picadoCobraObs: string
  incoordenacaoTremores: string
  incoordenacaoTremoresObs: string
  febreAlta: string
  febreAltaObs: string
  presencaSangue: string
  presencaSangueObs: string
  fraturas: string
  fraturasObs: string
  desordensDigestivas: string
  desordensDigestivasObs: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  pasto: '',
  lote: '',
  brincoChip: '',
  categorias: [],
  outrosTexto: '',
  tratamentos: [],
  tratamentoOutros: '',
  problemaCasco: '',
  problemaCascoObs: '',
  sintomasPneumonia: '',
  sintomasPneumoniaObs: '',
  picadoCobra: '',
  picadoCobraObs: '',
  incoordenacaoTremores: '',
  incoordenacaoTremoresObs: '',
  febreAlta: '',
  febreAltaObs: '',
  presencaSangue: '',
  presencaSangueObs: '',
  fraturas: '',
  fraturasObs: '',
  desordensDigestivas: '',
  desordensDigestivasObs: '',
})

export default function EnfermariaPage() {
  const navigate = useNavigate()
  const { usuario, fazenda, cadastroSheetUrl } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [pastosDisponiveis, setPastosDisponiveis] = useState<string[]>([])
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [detalhesLote, setDetalhesLote] = useState<any>(null)

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const handleCategoriasChange = (newCategorias: string[]) => {
    setForm((prev) => ({ ...prev, categorias: newCategorias }))
  }

  const handleTratamentosChange = (newTratamentos: string[]) => {
    if (!newTratamentos.includes('Outros')) {
      setForm(prev => ({
        ...prev,
        tratamentos: newTratamentos,
        tratamentoOutros: ''
      }))
    } else {
      setForm(prev => ({
        ...prev,
        tratamentos: newTratamentos
      }))
    }
  }

  // Carregar pastos e lotes do cache global
  useEffect(() => {
    const cache = getCachedCadastroData()
    if (cache) {
      setPastosDisponiveis(cache.pastos || [])
      setLotesDisponiveis(cache.lotes || [])
    }
  }, [])

  // Buscar detalhes do lote quando selecionado
  useEffect(() => {
    async function carregarDetalhesLote() {
      if (!form.lote || !cadastroSheetUrl) {
        setDetalhesLote(null)
        return
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/insumos/lote-detalhes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl, lote: form.lote }),
        })
        const data = await res.json()
        if (data.success) {
          setDetalhesLote(data.detalhes)
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do lote:', error)
      }
    }

    carregarDetalhesLote()
  }, [form.lote, cadastroSheetUrl])

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    // Construir string final de tratamentos
    const tratamentosFinais = form.tratamentos.map(t =>
      t === 'Outros' ? form.tratamentoOutros : t
    ).filter(Boolean)

    const tratamentoFinal = tratamentosFinais.join(', ')

    // Montar categorias como string separada por vírgula
    let categoriasArray = form.categorias.filter(c => c !== 'Outros')
    
    // Se "Outros" estiver selecionado e houver texto, adicionar no final
    if (form.categorias.includes('Outros') && form.outrosTexto.trim()) {
      categoriasArray.push(`Outros: ${form.outrosTexto.trim()}`)
    } else if (form.categorias.includes('Outros')) {
      categoriasArray.push('Outros')
    }
    
    const categoriasString = categoriasArray.join(', ')

    const result = await salvarRegistro('enfermaria', {
      data: form.data,
      pasto: form.pasto,
      lote: form.lote,
      brincoChip: form.brincoChip,
      categoria: categoriasString,
      problemaCasco: form.problemaCasco,
      problemaCascoObs: form.problemaCascoObs,
      sintomasPneumonia: form.sintomasPneumonia,
      sintomasPneumoniaObs: form.sintomasPneumoniaObs,
      picadoCobra: form.picadoCobra,
      picadoCobraObs: form.picadoCobraObs,
      incoordenacaoTremores: form.incoordenacaoTremores,
      incoordenacaoTremoresObs: form.incoordenacaoTremoresObs,
      febreAlta: form.febreAlta,
      febreAltaObs: form.febreAltaObs,
      presencaSangue: form.presencaSangue,
      presencaSangueObs: form.presencaSangueObs,
      fraturas: form.fraturas,
      fraturasObs: form.fraturasObs,
      desordensDigestivas: form.desordensDigestivas,
      desordensDigestivasObs: form.desordensDigestivasObs,
      tratamento: tratamentoFinal,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      const dadosRegistro = {
        data: form.data,
        pasto: form.pasto,
        lote: form.lote,
        brincoChip: form.brincoChip,
        categoria: categoriasString,
        problemaCasco: form.problemaCasco,
        problemaCascoObs: form.problemaCascoObs,
        sintomasPneumonia: form.sintomasPneumonia,
        sintomasPneumoniaObs: form.sintomasPneumoniaObs,
        picadoCobra: form.picadoCobra,
        picadoCobraObs: form.picadoCobraObs,
        incoordenacaoTremores: form.incoordenacaoTremores,
        incoordenacaoTremoresObs: form.incoordenacaoTremoresObs,
        febreAlta: form.febreAlta,
        febreAltaObs: form.febreAltaObs,
        presencaSangue: form.presencaSangue,
        presencaSangueObs: form.presencaSangueObs,
        fraturas: form.fraturas,
        fraturasObs: form.fraturasObs,
        desordensDigestivas: form.desordensDigestivas,
        desordensDigestivasObs: form.desordensDigestivasObs,
        tratamento: tratamentoFinal,
      }
      setRegistroSalvo(dadosRegistro)
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
          <DatePicker label="DATA" value={form.data} onChange={(val) => setForm((p) => ({ ...p, data: val }))} error={getError('data')} />
          {pastosDisponiveis.length > 0 ? (
            <SearchableModal
              label="PASTO"
              value={form.pasto}
              onChange={(val) => setForm((p) => ({ ...p, pasto: val }))}
              error={getError('pasto')}
              options={pastosDisponiveis}
              placeholder="Buscar pasto..."
              id="pasto"
              name="pasto"
            />
          ) : (
            <Input
              label="PASTO"
              placeholder="Carregando..."
              value={form.pasto}
              onChange={setInput('pasto')}
              error={getError('pasto')}
              disabled
              id="pasto"
            />
          )}
          {lotesDisponiveis.length > 0 ? (
            <SearchableModal
              label="LOTE"
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
              label="LOTE"
              placeholder="Carregando..."
              value={form.lote}
              onChange={setInput('lote')}
              error={getError('lote')}
              disabled
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
            label="BRINCO / CHIP"
            placeholder="Número do brinco ou chip"
            value={form.brincoChip}
            onChange={setInput('brincoChip')}
            error={getError('brincoChip')}
          />
          <CheckboxGroup
            label="CATEGORIAS:"
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
              label="ESPECIFICAR OUTROS:"
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
                label={label}
                options={SN_OPTIONS}
                value={form[campo as keyof FormState] as string}
                onChange={(val) => setForm((p) => ({ ...p, [campo]: val }))}
                error={getError(campo)}
                gridCols={2}
              />
              <Input
                placeholder="Adicionar observação (opcional)"
                value={(form as any)[`${campo}Obs`]}
                onChange={(e) => setForm((p) => ({ ...p, [`${campo}Obs`]: e.target.value }))}
                className="mt-2"
              />
            </div>
          ))}
        </div>

        {/* Seção 4: Tratamento */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. TRATAMENTO</h2>
          <CheckboxGroup
            label="TRATAMENTO"
            options={TRATAMENTOS}
            selectedValues={form.tratamentos}
            onChange={handleTratamentosChange}
            error={getError('tratamentos')}
            gridCols={2}
            hideCheckbox={true}
            id="tratamentos"
            dataField="tratamentos"
          />
          {form.tratamentos.includes('Outros') && (
            <Input
              label="DESCREVA O TRATAMENTO"
              placeholder="Ex: Outro tratamento..."
              value={form.tratamentoOutros}
              onChange={setInput('tratamentoOutros')}
              error={getError('tratamentoOutros')}
            />
          )}
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
        cadernetaName="Enfermaria"
        registro={registroSalvo}
        caderneta="enfermaria"
      />
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, CheckboxGroup, ValidationMessage } from '../../components/ui'
import SearchableModal from '../../components/ui/SearchableModal'
import SuccessModal from '../../components/SuccessModal'
import PdfModal from '../../components/PdfModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { getCachedCadastroData } from '../../services/cadastroCache'
import { scrollToFirstError } from '../../utils/scrollToError'
import LoteDetalhesCard from '../../components/LoteDetalhesCard'

const BASE = import.meta.env.BASE_URL

const TRATAMENTOS = [
  { value: 'Colostro', label: 'COLOSTRO'},
  { value: 'Cura Umbigo', label: 'CURA UMBIGO'},
  { value: 'Tatuagem', label: 'TATUAGEM'},
  { value: 'Furo Orelhas', label: 'FURO ORELHAS'},
  { value: 'Unguento', label: 'UNGUENTO'},
  { value: 'Repelente', label: 'REPELENTE'},
  { value: 'Vermífugo', label: 'VERMÍFUGO'},
  { value: 'Antibiótico', label: 'ANTIBIÓTICO'},
  { value: 'Probiótico', label: 'PROBIÓTICO'},
  { value: 'Pesagem', label: 'PESAGEM' },
  { value: 'Outros', label: 'OUTROS'},
]

const TIPOS_PARTO = [
  { value: 'Normal', label: 'NORMAL', icon: '✅' },
  { value: 'Auxiliado', label: 'AUXILIADO', icon: '🤝' },
  { value: 'Cesárea', label: 'CESÁREA', icon: '🏥' },
  { value: 'Aborto', label: 'ABORTO', icon: '❌' },
]

const SEXO = [
  { value: 'Macho', label: 'MACHO', icon: '♂️' },
  { value: 'Fêmea', label: 'FÊMEA', icon: '♀️' },
]

const RACAS = [
  { value: 'Nelore', label: 'NELORE' },
  { value: 'Angus', label: 'ANGUS' },
  { value: 'Leiteiro', label: 'LEITEIRO' },
  { value: 'Outros', label: 'OUTROS' },
]

const CATEGORIAS_MAE = [
  { value: 'Nulípara', label: 'NULÍPARA' },
  { value: 'Primípara', label: 'PRIMÍPARA' },
  { value: 'Multípara', label: 'MULTÍPARA' },
  { value: 'Leiteira', label: 'LEITEIRA' },
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
  pesoCria: string
  numeroCria: string
  tratamentos: string[]
  tratamentoOutros: string
  tipoParto: string
  sexo: string
  raca: string
  racaOutros: string
  numeroMae: string
  categoriaMae: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  pasto: '',
  lote: '',
  pesoCria: '',
  numeroCria: '',
  tratamentos: [],
  tratamentoOutros: '',
  tipoParto: '',
  sexo: '',
  raca: '',
  racaOutros: '',
  numeroMae: '',
  categoriaMae: '',
})

export default function MaternidadePage() {
  const navigate = useNavigate()
  const { usuario, fazenda, cadastroSheetUrl } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [pastosDisponiveis, setPastosDisponiveis] = useState<string[]>([])
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [detalhesLote, setDetalhesLote] = useState<any>(null)

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInputEvent = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleTratamentosChange = (newTratamentos: string[]) => {
    // Se "Outros" foi deselecionado, limpa o campo de texto
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

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

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
    ).filter(Boolean) // remove strings vazias

    const tratamentoFinal = tratamentosFinais.join(', ')
    const racaFinal = form.raca === 'Outros' ? form.racaOutros : form.raca
    const result = await salvarRegistro('maternidade', {
      data: form.data,
      pasto: form.pasto,
      lote: form.lote,
      pesoCria: form.pesoCria ? Number(form.pesoCria) : null,
      numeroCria: form.numeroCria,
      tratamento: tratamentoFinal,
      tipoParto: form.tipoParto,
      sexo: form.sexo,
      raca: racaFinal,
      numeroMae: form.numeroMae,
      categoriaMae: form.categoriaMae,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      // Armazenar o registro salvo para compartilhamento
      const dadosRegistro = {
        data: form.data,
        pasto: form.pasto,
        lote: form.lote,
        pesoCria: form.pesoCria ? Number(form.pesoCria) : null,
        numeroCria: form.numeroCria,
        tratamento: tratamentoFinal,
        tipoParto: form.tipoParto,
        sexo: form.sexo,
        raca: racaFinal,
        numeroMae: form.numeroMae,
        categoriaMae: form.categoriaMae,
      }
      setRegistroSalvo(dadosRegistro)
      setShowSuccessModal(true)
      setForm(makeInitial())
    }
  }

  const handleLimpar = () => {
    setForm(makeInitial())
    setErrors([])
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
          <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2">MATERNIDADE</h1>
          <button
            onClick={() => navigate('/caderneta/maternidade/lista')}
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

      {/* Botão de PDF POP */}
      <div className="bg-[#1a3a2a] text-white px-4 py-3">
        <button
          onClick={() => setShowPdfModal(true)}
          className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors"
        >
          <span className="text-xl">📄</span>
          <span>VER POP MATERNIDADE</span>
        </button>
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
          <div className="grid grid-cols-2 gap-3">
            {pastosDisponiveis.length > 0 ? (
              <SearchableModal
                label="PASTO"
                value={form.pasto}
                onChange={set('pasto')}
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
                onChange={setInputEvent('pasto')}
                error={getError('pasto')}
                inputMode="text"
                disabled
                id="pasto"
              />
            )}
            {lotesDisponiveis.length > 0 ? (
              <SearchableModal
                label="LOTE"
                value={form.lote}
                onChange={set('lote')}
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
                onChange={setInputEvent('lote')}
                error={getError('lote')}
                inputMode="text"
                disabled
              />
            )}
          </div>
          {detalhesLote && (
            <LoteDetalhesCard detalhes={detalhesLote} processarCategorias={processarCategorias} />
          )}
        </div>

        {/* Seção 2: Identificação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. IDENTIFICAÇÃO</h2>
          <Input
            label="NÚMERO DA CRIA"
            placeholder="Ex: 2023-145"
            value={form.numeroCria}
            onChange={setInputEvent('numeroCria')}
            error={getError('numeroCria')}
          />
          <Input
            label="PESO DA CRIA (kg)"
            placeholder="Ex: 32"
            value={form.pesoCria}
            onChange={setInputEvent('pesoCria')}
            inputMode="decimal"
            type="number"
          />
        </div>

        {/* Seção 3: Tratamento */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. TRATAMENTOS</h2>
          <CheckboxGroup
            label=""
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
              placeholder="Ex: Anti-inflamatório..."
              value={form.tratamentoOutros}
              onChange={setInputEvent('tratamentoOutros')}
              error={getError('tratamentoOutros')}
            />
          )}
        </div>

        {/* Seção 4: Parto */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. TIPO DE PARTO</h2>
          <Radio
            name="tipoParto"
            options={TIPOS_PARTO}
            value={form.tipoParto}
            onChange={set('tipoParto')}
            error={getError('tipoParto')}
            gridCols={2}
          />
        </div>

        {/* Seção 5: Sexo e Raça */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">5. SEXO E RAÇA</h2>
          <Radio
            name="sexo"
            label="SEXO"
            options={SEXO}
            value={form.sexo}
            onChange={set('sexo')}
            error={getError('sexo')}
            gridCols={2}
          />
          <Radio
            name="raca"
            label="RAÇA"
            options={RACAS}
            value={form.raca}
            onChange={set('raca')}
            error={getError('raca')}
            gridCols={2}
          />
          {form.raca === 'Outros' && (
            <Input
              label="QUAL RAÇA?"
              placeholder="Ex: Brahman, Hereford, Simmental..."
              value={form.racaOutros}
              onChange={setInputEvent('racaOutros')}
              error={getError('racaOutros')}
            />
          )}
        </div>

        {/* Seção 6: Dados da Mãe */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">6. DADOS DA MÃE</h2>
          <Input
            label="NÚMERO DA MÃE"
            placeholder="Ex: 2021-089"
            value={form.numeroMae}
            onChange={setInputEvent('numeroMae')}
            error={getError('numeroMae')}
          />
          <Radio
            name="categoriaMae"
            label="CATEGORIA DA MÃE"
            options={CATEGORIAS_MAE}
            value={form.categoriaMae}
            onChange={set('categoriaMae')}
            error={getError('categoriaMae')}
            gridCols={2}
          />
        </div>

        {/* Ações */}
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾" fullWidth>
            SALVAR
          </Button>
          <Button onClick={handleLimpar} variant="secondary" icon="🧹" fullWidth>
            LIMPAR
          </Button>
        </div>
      </main>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Maternidade"
        registro={registroSalvo}
        caderneta="maternidade"
      />

      <PdfModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        images={[
          `${BASE}docs/maternidade/POP_Maternidade_1.jpg`,
          `${BASE}docs/maternidade/POP_Maternidade_2.jpg`,
          `${BASE}docs/maternidade/POP_Maternidade_3.jpg`,
          `${BASE}docs/maternidade/POP_Maternidade_4.jpg`,
          `${BASE}docs/maternidade/POP_Maternidade_5.jpg`,
          `${BASE}docs/maternidade/POP_Maternidade_6.jpg`,
          `${BASE}docs/maternidade/POP_Maternidade_7.jpg`
        ]}
      />
    </div>
  )
}

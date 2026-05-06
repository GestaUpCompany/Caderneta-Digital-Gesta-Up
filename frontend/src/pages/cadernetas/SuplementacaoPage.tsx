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
import { getMineralNomes, getProteinadoNomes, getRacaoNomes, getInsumosNomes, getDietasNomes, getLoteByNome } from '../../services/supabaseService'
import LoteDetalhesCard from '../../components/LoteDetalhesCard'
import EspacamentoCochoCard from '../../components/EspacamentoCochoCard'
import { scrollToFirstError } from '../../utils/scrollToError'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'

const BASE = import.meta.env.BASE_URL

const PRODUTOS = [
  { value: 'Mineral', label: 'MINERAL', icon: '' },
  { value: 'Proteinado', label: 'PROTEINADO', icon: '' },
  { value: 'Ração', label: 'RAÇÃO', icon: '' },
  { value: 'Insumos', label: 'INSUMOS', icon: '' },
  { value: 'Dietas', label: 'DIETAS', icon: '' },
  { value: 'Creep', label: 'CREEP', icon: '' },
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

const LEITURAS = [
  { value: '-1', label: '-1', icon: '🔴' },
  { value: '0', label: '0', icon: '🟡' },
  { value: '1', label: '1', icon: '🟢' },
  { value: '2', label: '2', icon: '🟡' },
  { value: '3', label: '3', icon: '🔴' },
]

const ESCALA_5 = [
  { value: '1', label: '1', icon: '🔴' },
  { value: '2', label: '2', icon: '🟡' },
  { value: '3', label: '3', icon: '🟢' },
  { value: '4', label: '4', icon: '🟡' },
  { value: '5', label: '5', icon: '🔴' },
]

const SN_OPTIONS = [
  { value: 'Sim', label: 'SIM', icon: '✅' },
  { value: 'Não', label: 'NÃO', icon: '❌' },
]

const CHECKLIST_PERGUNTAS = [
  { campo: 'limpezaCocho', label: 'LIMPEZA DE COCHO?' },
  { campo: 'cochosCondicoes', label: 'OS COCHOS ESTÃO EM BOAS CONDIÇÕES?' },
  { campo: 'aterroAcessoIdeal', label: 'ATERRO / ACESSO DE COCHO ESTÁ IDEAL?' },
  { campo: 'espacamentoCocho', label: 'ESPAÇAMENTO DO COCHO (cm/cab):' },
  { campo: 'depositoCondicoes', label: 'DEPÓSITO ESTÁ EM BOAS CONDIÇÕES?' },
  { campo: 'estoqueDepositio', label: 'TEM ESTOQUE NO DEPÓSITO?' },
]

interface FormState {
  data: string
  tratador: string
  pasto: string
  numeroLote: string
  produto: string
  leitura: string
  kgCocho: string
  kgDeposito: string
  categorias: string[]
  outrosTexto: string
  escoreFezes: string
  // Checklist fields
  limpezaCocho: string
  limpezaCochoObs: string
  cochosCondicoes: string
  cochosCondicoesObs: string
  aterroAcessoIdeal: string
  aterroAcessoIdealObs: string
  espacamentoCochoCmCab: string
  espacamentoCochoObs: string
  depositoCondicoes: string
  depositoCondicoesObs: string
  estoqueDepositio: string
  estoqueDepositioObs: string
}

const makeInitial = (usuario?: string): FormState => ({
  data: todayBR(),
  tratador: usuario || '',
  pasto: '',
  numeroLote: '',
  produto: '',
  leitura: '',
  kgCocho: '',
  kgDeposito: '',
  categorias: [],
  outrosTexto: '',
  escoreFezes: '',
  // Checklist fields
  limpezaCocho: '',
  limpezaCochoObs: '',
  cochosCondicoes: '',
  cochosCondicoesObs: '',
  aterroAcessoIdeal: '',
  aterroAcessoIdealObs: '',
  espacamentoCochoCmCab: '',
  espacamentoCochoObs: '',
  depositoCondicoes: '',
  depositoCondicoesObs: '',
  estoqueDepositio: '',
  estoqueDepositioObs: '',
})

export default function SuplementacaoPage() {
  const navigate = useNavigate()
  const { usuario, fazenda, fazendaId } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(() => makeInitial(usuario))
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showFezesModal, setShowFezesModal] = useState(false)
  const [suplementos, setSuplementos] = useState<string[]>([])
  const [suplemento, setSuplemento] = useState('')
  const [quantidadeCreep, setQuantidadeCreep] = useState('')
  const [kgDeposito, setKgDeposito] = useState('')
  const [pastosDisponiveis, setPastosDisponiveis] = useState<string[]>([])
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [detalhesLote, setDetalhesLote] = useState<any>(null)

  // Carregar suplementos quando tipo principal muda (exceto Creep)
  useEffect(() => {
    const carregarSuplementos = async () => {
      if (!form.produto || form.produto === 'Creep') {
        setSuplementos([])
        setSuplemento('')
        return
      }

      // Buscar do Supabase usando o fazendaId
      if (!fazendaId) {
        setSuplementos([])
        return
      }

      try {
        let suplementosArray: string[] = []
        switch (form.produto) {
          case 'Mineral':
            suplementosArray = await getMineralNomes(fazendaId)
            break
          case 'Proteinado':
            suplementosArray = await getProteinadoNomes(fazendaId)
            break
          case 'Ração':
            suplementosArray = await getRacaoNomes(fazendaId)
            break
          case 'Insumos':
            suplementosArray = await getInsumosNomes(fazendaId)
            break
          case 'Dietas':
            suplementosArray = await getDietasNomes(fazendaId)
            break
          default:
            suplementosArray = []
        }

        // Fallback para cache se Supabase retornar vazio
        if (suplementosArray.length === 0) {
          console.log('[SuplementacaoPage] Supabase retornou vazio, usando cache como fallback')
          const cached = getCachedCadastroData()
          switch (form.produto) {
            case 'Mineral':
              suplementosArray = cached?.mineral || []
              break
            case 'Proteinado':
              suplementosArray = cached?.proteinado || []
              break
            case 'Ração':
              suplementosArray = cached?.racao || []
              break
            case 'Insumos':
              suplementosArray = cached?.insumos || []
              break
            case 'Dietas':
              suplementosArray = cached?.dietas || []
              break
          }
        }

        setSuplementos(suplementosArray)
        setSuplemento('')
      } catch (error) {
        console.error('Erro ao carregar suplementos do Supabase, usando cache como fallback:', error)
        // Fallback para cache em caso de erro
        const cached = getCachedCadastroData()
        let suplementosArray: string[] = []
        switch (form.produto) {
          case 'Mineral':
            suplementosArray = cached?.mineral || []
            break
          case 'Proteinado':
            suplementosArray = cached?.proteinado || []
            break
          case 'Ração':
            suplementosArray = cached?.racao || []
            break
          case 'Insumos':
            suplementosArray = cached?.insumos || []
            break
          case 'Dietas':
            suplementosArray = cached?.dietas || []
            break
        }
        setSuplementos(suplementosArray)
        setSuplemento('')
      }
    }

    carregarSuplementos()
  }, [form.produto, fazendaId])

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
      console.log('[SuplementacaoPage] Cache atualizado, recarregando dados')
      if (data) {
        setPastosDisponiveis(data.pastos || [])
        setLotesDisponiveis(data.lotes || [])
        // Se houver um produto selecionado, recarregar suplementos
        if (form.produto && form.produto !== 'Creep') {
          switch (form.produto) {
            case 'Mineral':
              setSuplementos(data.mineral || [])
              break
            case 'Proteinado':
              setSuplementos(data.proteinado || [])
              break
            case 'Ração':
              setSuplementos(data.racao || [])
              break
            case 'Insumos':
              setSuplementos(data.insumos || [])
              break
            case 'Dietas':
              setSuplementos(data.dietas || [])
              break
          }
        }
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

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const handleCategoriasChange = (newCategorias: string[]) => {
    setForm((prev) => ({ ...prev, categorias: newCategorias }))
  }

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    // Lógica do Creep
    const produtoFinal = form.produto === 'Creep' ? 'Creep' : suplemento
    const creepKgFinal = form.produto === 'Creep' ? quantidadeCreep : ''
    
    // Montar categorias como string separada por vírgula
    let categoriasArray = form.categorias.filter(c => c !== 'Outros')
    
    // Se "Outros" estiver selecionado e houver texto, adicionar no final
    if (form.categorias.includes('Outros') && form.outrosTexto.trim()) {
      categoriasArray.push(`Outros: ${form.outrosTexto.trim()}`)
    } else if (form.categorias.includes('Outros')) {
      categoriasArray.push('Outros')
    }
    
    const categoriasString = categoriasArray.join(', ')

    const result = await salvarRegistro('suplementacao', {
      data: form.data,
      tratador: form.tratador,
      pasto: form.pasto,
      numeroLote: form.numeroLote,
      produto: produtoFinal,
      creepKg: creepKgFinal,
      leituraCocho: form.leitura ? Number(form.leitura) : null,
      kgCocho: form.kgCocho ? Number(form.kgCocho) : 0,
      kgDeposito: kgDeposito ? Number(kgDeposito) : 0,
      categorias: form.categorias,
      categoriasString: categoriasString,
      escoreFezes: form.escoreFezes ? Number(form.escoreFezes) : null,
      // Checklist fields
      limpezaCocho: form.limpezaCocho === 'Sim',
      limpezaCochoObs: form.limpezaCochoObs || '',
      cochosCondicoes: form.cochosCondicoes === 'Sim',
      cochosCondicoesObs: form.cochosCondicoesObs || '',
      aterroAcessoIdeal: form.aterroAcessoIdeal === 'Sim',
      aterroAcessoIdealObs: form.aterroAcessoIdealObs || '',
      espacamentoCochoCmCab: form.espacamentoCochoCmCab ? Number(form.espacamentoCochoCmCab) : null,
      espacamentoCochoObs: form.espacamentoCochoObs || '',
      depositoCondicoes: form.depositoCondicoes === 'Sim',
      depositoCondicoesObs: form.depositoCondicoesObs || '',
      estoqueDepositio: form.estoqueDepositio === 'Sim',
      estoqueDepositioObs: form.estoqueDepositioObs || '',
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      setForm(makeInitial(usuario))
      setSuplemento('')
      setQuantidadeCreep('')
      setKgDeposito('')
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
          <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2">SUPLEMENTAÇÃO</h1>
          <button
            onClick={() => navigate('/caderneta/suplementacao/lista')}
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
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS PRINCIPAIS</h2>
          {usuario && (
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <span className="text-xl">👤</span>
              <p className="text-gray-700 font-semibold">{usuario}</p>
            </div>
          )}
          <DatePicker label="DATA" value={form.data} onChange={set('data')} error={getError('data')} />
          <Input
            label="TRATADOR"
            placeholder="Nome do responsável"
            value={form.tratador}
            onChange={setInput('tratador')}
            error={getError('tratador')}
          />
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
                onChange={setInput('pasto')}
                error={getError('pasto')}
                disabled
                id="pasto"
              />
            )}
            {lotesDisponiveis.length > 0 ? (
              <SearchableModal
                label="NÚMERO LOTE"
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
            <LoteDetalhesCard detalhes={detalhesLote} processarCategorias={processarCategorias} />
          )}
        </div>

        {/* Seção 2: Tipo de Suplementação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. TIPO DE SUPLEMENTAÇÃO</h2>
          <Radio
            name="produto"
            label="PRODUTO"
            options={PRODUTOS}
            value={form.produto}
            onChange={set('produto')}
            error={getError('produto')}
            gridCols={2}
          />

          {/* Lista suspensa para suplemento (Mineral/Proteinado/Ração) */}
          {form.produto && form.produto !== 'Creep' && (
            <div className="mt-2">
              {suplementos.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-gray-700">Suplemento:</label>
                  <select
                    value={suplemento}
                    onChange={(e) => setSuplemento(e.target.value)}
                    className="w-full p-3 border-2 border-gray-300 rounded-xl text-lg focus:border-[#3b82f6] focus:outline-none"
                  >
                    <option value="">Selecione o suplemento...</option>
                    {suplementos.map((sup) => (
                      <option key={sup} value={sup}>
                        {sup}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-gray-500">Nenhum suplemento disponível</p>
              )}
            </div>
          )}

          {/* Campo numérico para Creep */}
          {form.produto === 'Creep' && (
            <div className="mt-2">
              <Input
                label="QUANTIDADE (kg)"
                placeholder="0"
                value={quantidadeCreep}
                onChange={(e) => setQuantidadeCreep(e.target.value)}
                inputMode="decimal"
                type="number"
                min="0"
              />
            </div>
          )}
        </div>

        {/* Seção 3: Gado e Categorias */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. CLASSIFICAÇÃO DO GADO</h2>
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

        {/* Seção 4: Leitura e Quantidade */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. LEITURA E QUANTIDADE</h2>
          <button
            onClick={() => setShowPdfModal(true)}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors"
          >
            <span className="text-xl">📄</span>
            <span>POP LEITURA DE COCHO</span>
          </button>
          <Radio
            name="leitura"
            label="LEITURA DO COCHO (-1 a 3)"
            options={LEITURAS}
            value={form.leitura}
            onChange={set('leitura')}
            error={getError('leitura')}
            gridCols={5}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Kg no cocho"
              placeholder="0"
              value={form.kgCocho}
              onChange={setInput('kgCocho')}
              inputMode="decimal"
              type="number"
              min="0"
            />
            <Input
              label="Kg no depósito"
              placeholder="0"
              value={kgDeposito}
              onChange={(e) => setKgDeposito(e.target.value)}
              inputMode="decimal"
              type="number"
              min="0"
            />
          </div>
          <button
            onClick={() => setShowFezesModal(true)}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors"
          >
            <span className="text-xl">📄</span>
            <span>POP FEZES</span>
          </button>
          <Radio
            name="escoreFezes"
            label="ESCORE DE FEZES (1 a 5)"
            options={ESCALA_5}
            value={form.escoreFezes}
            onChange={set('escoreFezes')}
            error={getError('escoreFezes')}
            gridCols={5}
          />
        </div>

        {/* Seção 5: Checklist */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">5. CHECKLIST</h2>
          {CHECKLIST_PERGUNTAS.map(({ campo, label }) => (
            campo === 'espacamentoCocho' ? (
              <div key={campo}>
                <Input
                  label={label}
                  placeholder="Espaçamento em cm/cab"
                  value={form.espacamentoCochoCmCab}
                  onChange={setInput('espacamentoCochoCmCab')}
                  error={getError('espacamentoCochoCmCab')}
                  inputMode="decimal"
                  type="number"
                  step="0.1"
                />
                <EspacamentoCochoCard espacamentoInformado={form.espacamentoCochoCmCab} />
                {form.espacamentoCochoCmCab && (
                  <Input
                    placeholder="Adicionar observação (opcional)"
                    value={form.espacamentoCochoObs}
                    onChange={setInput('espacamentoCochoObs')}
                    className="mt-2"
                  />
                )}
              </div>
            ) : (
              <div key={campo}>
                <Radio
                  name={campo}
                  label={label}
                  options={SN_OPTIONS}
                  value={(form as any)[campo]}
                  onChange={set(campo as keyof FormState)}
                  error={getError(campo)}
                  gridCols={2}
                />
                <Input
                  placeholder="Adicionar observação (opcional)"
                  value={(form as any)[`${campo}Obs`] || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, [`${campo}Obs`]: e.target.value }))}
                  className="mt-2"
                />
              </div>
            )
          ))}
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
        cadernetaName="Suplementação"
        registro={registroSalvo}
        caderneta="suplementacao"
      />

      <PdfModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        images={[
          `${BASE}docs/cocho/POP_Cocho_01.jpg`,
          `${BASE}docs/cocho/POP_Cocho_02.jpg`
        ]}
      />

      <PdfModal
        isOpen={showFezesModal}
        onClose={() => setShowFezesModal(false)}
        images={[
          `${BASE}docs/fezes/POP_Fezes_01.jpg`
        ]}
      />
    </div>
  )
}

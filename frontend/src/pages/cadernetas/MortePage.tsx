import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, ValidationMessage, SearchableModal, Radio } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import PdfModal from '../../components/PdfModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { getCachedCadastroData } from '../../services/cadastroCache'
import { getLoteByNome, getLoteDetalhesComCategorias, getPastos, getLotes } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import LoteDetalhesCard from '../../components/LoteDetalhesCard'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { supabase, getSupabaseClient } from '../../services/supabaseClient'

const BASE = import.meta.env.BASE_URL

const SEXO = [
  { value: 'Macho', label: 'MACHO', icon: '♂️' },
  { value: 'Fêmea', label: 'FÊMEA', icon: '♀️' },
]

const RACAS = [
  { value: 'Nelore', label: 'NELORE' },
  { value: 'Angus', label: 'ANGUS' },
  { value: 'Leiteiro', label: 'LEITEIRO' },
  { value: 'Anelorado', label: 'ANELORADO' },
  { value: 'SRD', label: 'SRD' },
  { value: 'Outros', label: 'OUTROS' },
]

const IDADES = [
  { value: '0 a 4 meses', label: '0 A 4 MESES' },
  { value: '5 a 12 meses', label: '5 A 12 MESES' },
  { value: '13 a 24 meses', label: '13 A 24 MESES' },
  { value: '25 a 36 meses', label: '25 A 36 MESES' },
  { value: 'Acima de 36 meses', label: 'ACIMA DE 36 MESES' },
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

const DIAGNOSTICOS = [
  { campo: 'secrecaoOrificios', label: 'ALGUMA SECREÇÃO NOS ORIFÍCIOS?' },
  { campo: 'sintomasPneumonia', label: 'SINTOMAS DE PNEUMONIA?' },
  { campo: 'inchaco', label: 'EXISTE ALGUM SANGRAMENTO?' },
  { campo: 'incoordenacaoTremores', label: 'INCOORDENAÇÃO / PEDALAGEM E TREMORES MUSCULARES DA MORTE?' },
  { campo: 'apatiaFraqueza', label: 'APATIA OU FRAQUEZA?' },
  { campo: 'desordensDigestivas', label: 'DESORDENS DIGESTIVAS / TIMPANISMO / DIARREIA?' },
  { campo: 'fraturas', label: 'ALGUMA FRATURA / DESLOCAMENTO DE MEMBROS?' },
  { campo: 'decomposicao', label: 'ANIMAL EM DECOMPOSIÇÃO / PUTREFAÇÃO?' },
  { campo: 'doencasPrevias', label: 'HAVIA DOENÇAS PRÉVIAS?' },
  { campo: 'medicamentosRecentes', label: 'RECEBEU MEDICAMENTOS RECENTEMENTE?' },
  { campo: 'morteSubita', label: 'A MORTE FOI SÚBITA?' },
  { campo: 'animalSozinho', label: 'ANIMAL MORREU SOZINHO?' },
  { campo: 'salivacaoExcessiva', label: 'SALIVAÇÃO EXCESSIVA?' },
  { campo: 'sinaisIntoxicacao', label: 'EXISTEM SINAIS DE INTOXICAÇÃO?' },
  { campo: 'carrapatosMoscas', label: 'PRESENÇA DE CARRAPATOS / MOSCAS?' },
  { campo: 'encontradoVivo', label: 'ANIMAL FOI ENCONTRADO VIVO?' },
  { campo: 'medicado', label: 'ANIMAL CHEGOU A SER MEDICADO?' },
  { campo: 'animalInchado', label: 'ANIMAL ESTAVA INCHADO?' },
  { campo: 'animalBicheira', label: 'ANIMAL COM BICHEIRA?' },
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

interface FormState {
  data: string
  pasto: string
  lote: string
  loteId: string
  brinco: string
  chip: string
  categoria: string
  categoriaOutros: string
  sexo: string
  raca: string
  racaOutros: string
  idade: string
  pesoVivo: string
  causaMorte: string
  causaMorteOutros: string
  escore: string
  nutricaoAtual: string
  nutricaoAnterior: string
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
  lote: '',
  loteId: '',
  brinco: '',
  chip: '',
  categoria: '',
  categoriaOutros: '',
  sexo: '',
  raca: '',
  racaOutros: '',
  idade: '',
  pesoVivo: '',
  causaMorte: '',
  causaMorteOutros: '',
  escore: '',
  nutricaoAtual: '',
  nutricaoAnterior: '',
  diagnosticos: DIAGNOSTICOS.reduce((acc, { campo }) => {
    acc[campo] = { valor: '', observacao: '' }
    return acc
  }, {} as FormState['diagnosticos']),
})

export default function MortePage() {
  const navigate = useNavigate()
  const { usuario, fazenda, fazendaId, logoUrl } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showEscoreModal, setShowEscoreModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [pastosDisponiveis, setPastosDisponiveis] = useState<string[]>([])
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [detalhesLote, setDetalhesLote] = useState<any>(null)
  const [causasMorte, setCausasMorte] = useState<{ value: string; label: string }[]>([])
  const [dietas, setDietas] = useState<{ value: string; label: string }[]>([])

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

  // Carregar pastos e lotes do cache global, com fallback para Supabase
  useEffect(() => {
    const loadData = async () => {
      const cache = getCachedCadastroData()
      if (cache && cache.pastos && cache.pastos.length > 0) {
        setPastosDisponiveis(cache.pastos || [])
        setLotesDisponiveis(cache.lotes || [])
      } else if (fazendaId) {
        try {
          const [pastosData, lotesData] = await Promise.all([
            getPastos(fazendaId),
            getLotes(fazendaId)
          ])
          setPastosDisponiveis(pastosData?.map((p: any) => p.nome) || [])
          setLotesDisponiveis(lotesData?.map((l: any) => l.nome) || [])
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
      console.log('[MortePage] Cache atualizado, recarregando dados')
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
      if (!form.lote || !fazendaId) {
        setDetalhesLote(null)
        setForm(prev => ({ ...prev, loteId: '' }))
        return
      }

      try {
        const lote = await getLoteByNome(fazendaId, form.lote)
        if (lote) {
          // Buscar detalhes de categorias do lote
          const categoriasDetalhes = await getLoteDetalhesComCategorias(lote.id)
          
          // Combinar dados do lote com dados de categorias
          setDetalhesLote({
            ...lote,
            categorias: categoriasDetalhes.categorias,
            n_cabecas: categoriasDetalhes.quant_atual,
            peso_vivo_kg: categoriasDetalhes.peso_vivo_kg,
            qtd_bezerros: categoriasDetalhes.qtd_bezerros
          })
          // Armazenar o ID do lote
          setForm(prev => ({ ...prev, loteId: lote.id }))
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do lote:', error)
        setDetalhesLote(null)
        setForm(prev => ({ ...prev, loteId: '' }))
      }
    }

    carregarDetalhesLote()
  }, [form.lote, fazendaId])

  // Buscar causas de morte do Supabase
  useEffect(() => {
    async function carregarCausasMorte() {
      if (!fazendaId) return

      try {
        const client = getSupabaseClient()
        const { data, error } = await client
          .from('causas_morte')
          .select('nome')
          .eq('fazenda_id', fazendaId)
          .eq('ativo', true)
          .order('nome')

        if (error) {
          console.error('Erro ao buscar causas de morte:', error)
          return
        }

        if (data) {
          const causas = data.map(c => ({
            value: c.nome,
            label: c.nome.toUpperCase()
          }))
          setCausasMorte(causas)
        }
      } catch (error) {
        console.error('Erro ao carregar causas de morte:', error)
      }
    }

    carregarCausasMorte()
  }, [fazendaId])

  // Buscar dietas do Supabase
  useEffect(() => {
    async function carregarDietas() {
      if (!fazendaId) return

      try {
        const client = getSupabaseClient()
        const { data, error } = await client
          .from('dietas')
          .select('nome')
          .eq('fazenda_id', fazendaId)
          .eq('ativo', true)
          .order('nome')

        if (error) {
          console.error('Erro ao buscar dietas:', error)
          return
        }

        if (data) {
          const dietasList = data.map(d => ({
            value: d.nome,
            label: d.nome.toUpperCase()
          }))
          setDietas(dietasList)
        }
      } catch (error) {
        console.error('Erro ao carregar dietas:', error)
      }
    }

    carregarDietas()
  }, [fazendaId])

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const racaFinal = form.raca === 'Outros' ? form.racaOutros : form.raca
    const causaMorteFinal = form.causaMorte === 'Outros' ? form.causaMorteOutros : form.causaMorte

    const result = await salvarRegistro('morte', {
      responsavel: usuario,
      data: form.data,
      pasto: form.pasto,
      lote: form.lote,
      loteId: form.loteId,
      brinco: form.brinco,
      chip: form.chip,
      categoria: form.categoria,
      categoriaOutros: form.categoriaOutros,
      sexo: form.sexo,
      raca: racaFinal,
      idade: form.idade,
      pesoVivo: form.pesoVivo ? Number(form.pesoVivo) : null,
      causaMorte: causaMorteFinal,
      escore: form.escore ? Number(form.escore) : null,
      nutricaoAtual: form.nutricaoAtual || null,
      nutricaoAnterior: form.nutricaoAnterior || null,
      diagnosticos: form.diagnosticos,
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
          <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2">MORTE</h1>
          <button
            onClick={() => navigate('/caderneta/morte/lista')}
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
          <DatePicker label="DATA" value={form.data} onChange={(val) => setForm((p) => ({ ...p, data: val }))} error={getError('data')} />
          <div className="w-full">
            <label className="block text-lg font-bold text-gray-900 mb-2">RESPONSÁVEL</label>
            <div className="relative">
              <input
                className="min-h-[60px] text-lg sm:text-xl px-3 sm:px-4 py-3 bg-white border-2 rounded-xl focus:outline-none transition-colors w-full border-gray-400 focus:border-black"
                placeholder="Nome do responsável"
                value={usuario || ''}
                readOnly
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
                id="lote"
              />
            )}
          </div>
          {detalhesLote && (
            <LoteDetalhesCard detalhes={detalhesLote} processarCategorias={() => []} />
          )}
        </div>

        {/* Seção 2: Identificação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. IDENTIFICAÇÃO</h2>
          <Input
            label="ID. BRINCO"
            placeholder="Número do brinco"
            value={form.brinco}
            onChange={setInput('brinco')}
            error={getError('brinco')}
          />
          <Input
            label="ID. CHIP"
            placeholder="Número do chip"
            value={form.chip}
            onChange={setInput('chip')}
            error={getError('chip')}
          />
        </div>

        {/* Seção 3: Quantificação de Animais */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. CLASSIFICAÇÃO DO GADO</h2>
          <Radio
            name="categoria"
            label="CATEGORIA:"
            options={CATEGORIAS}
            value={form.categoria}
            onChange={(val) => setForm((p) => ({ ...p, categoria: val }))}
            error={getError('categoria')}
            gridCols={2}
          />
          {form.categoria === 'Outros' && (
            <Input
              label="ESPECIFICAR OUTROS:"
              placeholder="Descreva a categoria"
              value={form.categoriaOutros}
              onChange={setInput('categoriaOutros')}
              error={getError('categoriaOutros')}
            />
          )}
        </div>

        {/* Seção 4: Sexo e Raça */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. SEXO E RAÇA</h2>
          <Radio
            name="sexo"
            label="SEXO"
            options={SEXO}
            value={form.sexo}
            onChange={(val) => setForm((p) => ({ ...p, sexo: val }))}
            error={getError('sexo')}
            gridCols={2}
          />
          <Radio
            name="raca"
            label="RAÇA"
            options={RACAS}
            value={form.raca}
            onChange={(val) => setForm((p) => ({ ...p, raca: val }))}
            error={getError('raca')}
            gridCols={2}
          />
          {form.raca === 'Outros' && (
            <Input
              label="QUAL RAÇA?"
              placeholder="Especifique a raça"
              value={form.racaOutros}
              onChange={setInput('racaOutros')}
              error={getError('racaOutros')}
            />
          )}
        </div>

        {/* Seção 5: Idade e Peso */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">5. IDADE E PESO</h2>
          <Radio
            name="idade"
            label="IDADE"
            options={IDADES}
            value={form.idade}
            onChange={(val) => setForm((p) => ({ ...p, idade: val }))}
            error={getError('idade')}
            gridCols={2}
          />
          <Input
            label="PESO VIVO (kg)"
            placeholder="Ex: 450"
            value={form.pesoVivo}
            onChange={setInput('pesoVivo')}
            inputMode="decimal"
            type="number"
            error={getError('pesoVivo')}
          />
        </div>

        {/* Seção 6: Causa da Morte */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">6. CAUSA DA MORTE</h2>
          {causasMorte.length > 0 ? (
            <SearchableModal
              label="CAUSA DA MORTE"
              value={form.causaMorte}
              onChange={(val) => setForm((p) => ({ ...p, causaMorte: val }))}
              error={getError('causaMorte')}
              options={causasMorte.map(c => c.value)}
              placeholder="Buscar causa da morte..."
              id="causaMorte"
              name="causaMorte"
            />
          ) : (
            <Input
              label="CAUSA DA MORTE"
              placeholder="Carregando..."
              value={form.causaMorte}
              onChange={setInput('causaMorte')}
              error={getError('causaMorte')}
              disabled
              id="causaMorte"
            />
          )}
          {form.causaMorte === 'Outros' && (
            <Input
              label="ESPECIFIQUE A CAUSA"
              placeholder="Descreva a causa da morte"
              value={form.causaMorteOutros}
              onChange={setInput('causaMorteOutros')}
              error={getError('causaMorteOutros')}
            />
          )}
        </div>

        {/* Seção 7: Diagnóstico */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">7. DIAGNÓSTICO</h2>
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
              {form.diagnosticos[campo]?.valor === 'N' && (
                <Input
                  placeholder="Adicionar observação (opcional)"
                  value={form.diagnosticos[campo]?.observacao || ''}
                  onChange={setDiagnosticoObs(campo)}
                  className="mt-2"
                />
              )}
            </div>
          ))}

          {dietas.length > 0 ? (
            <>
              <SearchableModal
                label="NUTRIÇÃO ATUAL"
                value={form.nutricaoAtual}
                onChange={(val) => setForm((p) => ({ ...p, nutricaoAtual: val }))}
                error={getError('nutricaoAtual')}
                options={dietas.map(d => d.value)}
                placeholder="Buscar nutrição atual..."
                id="nutricaoAtual"
                name="nutricaoAtual"
              />
              <SearchableModal
                label="NUTRIÇÃO ANTERIOR"
                value={form.nutricaoAnterior}
                onChange={(val) => setForm((p) => ({ ...p, nutricaoAnterior: val }))}
                error={getError('nutricaoAnterior')}
                options={dietas.map(d => d.value)}
                placeholder="Buscar nutrição anterior..."
                id="nutricaoAnterior"
                name="nutricaoAnterior"
              />
            </>
          ) : (
            <>
              <Input
                label="NUTRIÇÃO ATUAL"
                placeholder="Carregando..."
                value={form.nutricaoAtual}
                onChange={setInput('nutricaoAtual')}
                error={getError('nutricaoAtual')}
                disabled
                id="nutricaoAtual"
              />
              <Input
                label="NUTRIÇÃO ANTERIOR"
                placeholder="Carregando..."
                value={form.nutricaoAnterior}
                onChange={setInput('nutricaoAnterior')}
                error={getError('nutricaoAnterior')}
                disabled
                id="nutricaoAnterior"
              />
            </>
          )}
        </div>

        {/* Seção 8: Escore Corporal */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">8. ESCORE CORPORAL</h2>
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
                onClick={() => setForm((p) => ({ ...p, escore: escore.value }))}
                className={`py-3 px-4 rounded-xl font-bold transition-all transform hover:scale-105 ${
                  form.escore === escore.value ? `${escore.color} text-black` : 'bg-gray-200 text-gray-700'
                }`}
              >
                {escore.label}
              </button>
            ))}
          </div>
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
        cadernetaName="Morte"
        registro={registroSalvo}
        caderneta="morte"
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

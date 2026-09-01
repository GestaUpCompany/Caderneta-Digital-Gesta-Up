import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, ValidationMessage, SearchableModal, Radio } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import CadernetaHeader from '../../components/CadernetaHeader'
import {
  getLoteByNomeCached,
  getLoteDetalhesComCategoriasCached,
  getCausasMorteCached,
  getLotesAtivosCached,
} from '../../services/cadastroCache'
import { getFormulacoes } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import LoteDetalhesCard from '../../components/LoteDetalhesCard'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { useFormValidation } from '../../hooks/useFormValidation'
import { usePhotoGps } from '../../hooks/usePhotoGps'

function processarCategorias(categorias: string): string[] {
  if (!categorias) return []
  const regex = /[,.;]+\s*/
  return categorias
    .split(regex)
    .map(c => c.trim())
    .filter(c => c.length > 0)
}

const SEXO = [
  { value: 'Macho', label: 'MACHO', icon: '♂️' },
  { value: 'Fêmea', label: 'FÊMEA', icon: '♀️' },
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

// Fields where "Não" means a problem exists (observation should show on "Não")
const INVERTED_DIAGNOSTICOS = [
  'animalSozinho',
  'morteSubita',
]

interface FormState {
  data: string
  pasto: string
  lote: string
  loteId: string
  pastoId: string
  brinco: string
  chip: string
  observacaoIdentificacao: string
  categoria: string
  categoriaOutros: string
  sexo: string
  raca: string
  racaOutros: string
  idade: string
  pesoVivo: string
  causaMorte: string
  causaMorteOutros: string
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
  pastoId: '',
  brinco: '',
  chip: '',
  observacaoIdentificacao: '',
  categoria: '',
  categoriaOutros: '',
  sexo: '',
  raca: '',
  racaOutros: '',
  idade: '',
  pesoVivo: '',
  causaMorte: '',
  causaMorteOutros: '',
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
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [lotesPastoMap, setLotesPastoMap] = useState<Record<string, string>>({})
  const [detalhesLote, setDetalhesLote] = useState<any>(null)
  const [causasMorte, setCausasMorte] = useState<{ value: string; label: string }[]>([])
  const [dietas, setDietas] = useState<{ value: string; label: string }[]>([])

  // Hook reutilizavel de foto + GPS (correcao iOS inclusa)
  const {
    fotoBase64,
    latitude,
    longitude,
    gpsAccuracy,
    capturandoFoto,
    capturandoGps,
    fotoErro,
    capturarFotoComGps,
    limpar: limparFotoGps,
    fotoInputRef,
    handleFileInputChange,
  } = usePhotoGps({ gpsObrigatorio: true })

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
    observacaoIdentificacao: {
      custom: (_value: any, formState: any) => {
        const semBrinco = !formState.brinco || formState.brinco.trim() === ''
        const semChip = !formState.chip || formState.chip.trim() === ''
        const semObs = !formState.observacaoIdentificacao || formState.observacaoIdentificacao.trim() === ''
        if (semBrinco && semChip && semObs) {
          return 'Informe o brinco/chip ou a razão de o animal não ter identificação'
        }
        return null
      },
    },
    categoria: { required: true },
    sexo: { required: true },
    raca: { required: true },
    idade: { required: true },
    causaMorte: { required: true },
    ...Object.fromEntries(DIAGNOSTICOS.map(d => [d.campo, { required: true }])),
  }

  // Add validation for racaOutros when raca is 'Outros'
  if (form.raca === 'Outros') {
    validationRules.racaOutros = { required: true }
  }

  // Add validation for causaMorteOutros when causaMorte is 'Outros'
  if (form.causaMorte === 'Outros') {
    validationRules.causaMorteOutros = { required: true }
  }

  const { isValid } = useFormValidation(form, validationRules)

  // Carregar lotes ativos do Supabase (online) ou cache (offline)
  useEffect(() => {
    const loadData = async () => {
      if (!fazendaId) return
      const { lotes, lotesPastoMap: mapa } = await getLotesAtivosCached(fazendaId)
      setLotesDisponiveis(lotes)
      setLotesPastoMap(mapa)
    }
    loadData()
  }, [fazendaId])

  // Escutar atualizações do cache de cadastro
  useEffect(() => {
    const unsubscribe = eventBus.on(CADASTRO_CACHE_UPDATED, (data: any) => {
      console.log('[MortePage] Cache atualizado, recarregando dados')
      if (data) {
        setLotesDisponiveis(data.lotes || [])
        setLotesPastoMap(data.lotesPastoMap || {})
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
            categorias_raw: categoriasDetalhes.categorias_raw || [],
            n_cabecas: categoriasDetalhes.quant_atual,
            peso_vivo_kg: categoriasDetalhes.peso_vivo_kg,
            qtd_bezerros: categoriasDetalhes.qtd_bezerros
          })

          // Auto-derivar pasto do lote
          const pastoNome = (lote as any).pastos?.nome || ''

          // Auto-preencher categoria se o lote tem exatamente 1 categoria
          const catsRaw = categoriasDetalhes.categorias_raw || []
          const nomesCategorias = catsRaw.map((c: any) => c.categoria).filter(Boolean)
          const categoriaAuto = nomesCategorias.length === 1 ? nomesCategorias[0] : ''

          setForm(prev => ({
            ...prev,
            pasto: pastoNome,
            loteId: lote.id,
            pastoId: (lote as any).pasto_id || '',
            // Se lote tem 1 categoria, auto-selecionar; senão limpar se a atual nao existe no lote
            categoria: categoriaAuto || (nomesCategorias.length > 0 && !nomesCategorias.some((c: string) => c.toLowerCase() === prev.categoria.toLowerCase()) ? '' : prev.categoria),
            categoriaOutros: '',
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

  // Buscar causas de morte (com cache lazy para offline)
  useEffect(() => {
    async function carregarCausasMorte() {
      if (!fazendaId) return
      try {
        const data = await getCausasMorteCached(fazendaId)
        if (data) {
          setCausasMorte(data.map((c: any) => ({ value: c.nome, label: c.nome.toUpperCase() })))
        }
      } catch (error) {
        console.error('Erro ao carregar causas de morte:', error)
      }
    }
    carregarCausasMorte()
  }, [fazendaId])

  // Buscar formulacoes do Supabase
  useEffect(() => {
    async function carregarFormulacoes() {
      if (!fazendaId) return

      try {
        const data = await getFormulacoes(fazendaId, true)

        if (data) {
          const formulacoesList = data.map(d => ({
            value: d.nome,
            label: d.nome.toUpperCase()
          }))
          setDietas(formulacoesList)
        }
      } catch (error) {
        console.error('Erro ao carregar formulacoes:', error)
      }
    }

    carregarFormulacoes()
  }, [fazendaId])

  const handleTirarFoto = async () => {
    const result = await capturarFotoComGps()
    if (result) {
      setForm((prev) => ({
        ...prev,
        fotoBase64: result.fotoBase64,
        latitude: result.latitude,
        longitude: result.longitude,
        gpsAccuracy: result.gpsAccuracy,
      }))
    }
  }

  const handleRemoverFoto = () => {
    limparFotoGps()
    setForm((prev) => ({
      ...prev,
      fotoBase64: null,
      latitude: null,
      longitude: null,
      gpsAccuracy: null,
    }))
  }

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const racaFinal = form.raca === 'Outros' ? form.racaOutros : form.raca
    const causaMorteFinal = form.causaMorte === 'Outros' ? form.causaMorteOutros : form.causaMorte
    const categoriaFinal = form.categoria

    const result = await salvarRegistro('morte', {
      responsavel: usuario,
      usuario: usuario,
      data: form.data,
      pasto: form.pasto,
      pastoId: form.pastoId,
      lote: form.lote,
      loteId: form.loteId,
      brinco: form.brinco,
      chip: form.chip,
      observacaoIdentificacao: form.observacaoIdentificacao,
      categoria: categoriaFinal,
      categoriaOutros: form.categoriaOutros,
      sexo: form.sexo,
      raca: racaFinal,
      idade: form.idade,
      pesoVivo: form.pesoVivo ? Number(form.pesoVivo) : null,
      causaMorte: causaMorteFinal,
      nutricaoAtual: form.nutricaoAtual || null,
      nutricaoAnterior: form.nutricaoAnterior || null,
      diagnosticos: form.diagnosticos,
      fotoBase64: fotoBase64 || null,
      latitude: latitude || null,
      longitude: longitude || null,
      gpsAccuracy: gpsAccuracy || null,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      setForm(makeInitial())
      limparFotoGps()
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
      <CadernetaHeader title="MORTE" cadernetaId="morte" />

      {/* Logos não sticky */}
      <div className="bg-[#1a3a2a] text-white px-4 py-5">
        <div className="flex items-center justify-center gap-8 desktop-form-container">
          <FarmLogo
            farmName={fazenda}
            logoUrl={logoUrl}
            type="both"
            size="medium"
          />
        </div>
      </div>

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8 desktop-form-container">
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: Dados Principais */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="section-title">1. DADOS PRINCIPAIS</h2>
            <div className="flex items-center gap-2 shrink-0">
              {usuario && (
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 font-semibold bg-gray-100 rounded-full px-3 py-1 whitespace-nowrap">
                  <span>👤</span>
                  <span>{usuario}</span>
                </span>
              )}
              <DatePicker value={form.data} onChange={(val) => setForm((p) => ({ ...p, data: val }))} error={getError('data')} compact inline />
            </div>
          </div>
          {lotesDisponiveis.length > 0 ? (
            <SearchableModal
              label={<span>PASTO/LOTE <span className="text-red-500">*</span></span>}
              value={form.lote}
              onChange={(val) => setForm((p) => ({ ...p, lote: val }))}
              error={getError('lote')}
              options={lotesDisponiveis}
              secondaryText={(lote) => lotesPastoMap[lote] || ''}
              placeholder="Buscar pasto ou lote..."
              id="lote"
              name="lote"
            />
          ) : (
            <Input
              label={<span>PASTO/LOTE <span className="text-red-500">*</span></span>}
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
          <p className="text-base text-gray-500 -mt-2">
            Caso o animal tenha perdido ou não possua brinco ou chip, informe o motivo no campo abaixo
          </p>
          <Input
            label={<span>OBS. IDENTIFICAÇÃO {!form.brinco && !form.chip && <span className="text-red-500">*</span>}</span>}
            placeholder=""
            value={form.observacaoIdentificacao}
            onChange={setInput('observacaoIdentificacao')}
            error={getError('observacaoIdentificacao')}
          />
        </div>

        {/* Seção 3: Quantificação de Animais */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. CLASSIFICAÇÃO DO GADO</h2>
          {(() => {
            const catsRaw = detalhesLote?.categorias_raw || []
            const nomesCats = catsRaw.map((c: any) => c.categoria).filter(Boolean)
            const options = (nomesCats.length > 0 ? nomesCats : CATEGORIAS.map(c => c.value))
              .filter((v: string) => v.toLowerCase() !== 'outros')
              .map((v: string) => ({ value: v, label: v.toUpperCase() }))
            return (
              <Radio
                name="categoria"
                label={<span>CATEGORIA: <span className="text-red-500">*</span></span>}
                options={options}
                value={form.categoria}
                onChange={(val) => setForm((p) => ({ ...p, categoria: val }))}
                error={getError('categoria')}
                gridCols={2}
              />
            )
          })()}
        </div>

        {/* Seção 4: Sexo e Raça */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. SEXO E RAÇA</h2>
          <Radio
            name="sexo"
            label={<span>SEXO <span className="text-red-500">*</span></span>}
            options={SEXO}
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
            label={<span>IDADE <span className="text-red-500">*</span></span>}
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
              label={<span>CAUSA DA MORTE <span className="text-red-500">*</span></span>}
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
              label={<span>CAUSA DA MORTE <span className="text-red-500">*</span></span>}
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
              label={<span>ESPECIFIQUE A CAUSA <span className="text-red-500">*</span></span>}
              placeholder="Descreva a causa da morte"
              value={form.causaMorteOutros}
              onChange={setInput('causaMorteOutros')}
              error={getError('causaMorteOutros')}
            />
          )}
        </div>

        {/* Seção 7: Diagnóstico */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">7. DIAGNÓSTICO <span className="text-red-500">*</span></h2>
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
              {(() => {
                const valor = form.diagnosticos[campo]?.valor
                const isInverted = INVERTED_DIAGNOSTICOS.includes(campo)
                const shouldShowObs = isInverted ? valor === 'N' : valor === 'S'
                return shouldShowObs ? (
                  <Input
                    placeholder="Adicionar observação (opcional)"
                    value={form.diagnosticos[campo]?.observacao || ''}
                    onChange={setDiagnosticoObs(campo)}
                    className="mt-2"
                  />
                ) : null
              })()}
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

        {/* Seção 8: Foto e Localização */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-4">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">8. FOTO E LOCALIZAÇÃO</h2>

          {fotoBase64 ? (
            <div className="flex flex-col gap-3">
              <img
                src={`data:image/jpeg;base64,${fotoBase64}`}
                alt="Foto do animal"
                className="w-full max-w-sm rounded-2xl border-2 border-gray-200 mx-auto"
              />
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-sm text-green-800">
                <span className="text-lg">📍</span>
                <div>
                  <p className="font-semibold">Localização capturada</p>
                  <p className="text-xs text-green-700">
                    {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
                    {gpsAccuracy ? ` (precisão: ~${Math.round(gpsAccuracy)}m)` : ''}
                  </p>
                </div>
              </div>
              <Button onClick={handleRemoverFoto} variant="secondary" icon="🗑️">
                REMOVER FOTO
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-gray-600">
                Tire uma foto do animal com a localização capturada automaticamente. A coordenada GPS é registrada no momento da foto.
              </p>
              <Button
                onClick={handleTirarFoto}
                variant="success"
                loading={capturandoFoto || capturandoGps}
                icon="📷"
                className="!bg-green-900 !border-green-900 !active:bg-green-950"
              >
                {(capturandoFoto || capturandoGps) ? 'CAPTURANDO...' : 'TIRAR FOTO DO ANIMAL'}
              </Button>
              {fotoErro && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
                  {fotoErro}
                </div>
              )}
              <input
                ref={fotoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾" disabled={!isValid}>
            SALVAR
          </Button>
          <Button onClick={() => { setForm(makeInitial()); limparFotoGps() }} variant="secondary" icon="🧹">
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
        cadernetaName="Morte"
        registro={registroSalvo}
        caderneta="morte"
      />

    </div>
  )
}

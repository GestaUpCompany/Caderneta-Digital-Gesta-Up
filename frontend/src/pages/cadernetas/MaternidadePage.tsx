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
import { getLoteByNome, getLoteDetalhesComCategorias, getContagemPartosVaca, getLotes } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import LoteDetalhesCard from '../../components/LoteDetalhesCard'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'

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
  { value: 'Soro', label: 'SORO'},
  { value: 'Pesagem', label: 'PESAGEM' },
  { value: 'Outros', label: 'OUTROS'},
]

const TIPOS_PARTO = [
  { value: 'Normal', label: 'NORMAL', icon: '✅' },
  { value: 'Auxiliado', label: 'AUXILIADO', icon: '🤝' },
  { value: 'Cesárea', label: 'CESÁREA', icon: '🏥' },
  { value: 'Aborto', label: 'ABORTO', icon: '❌' },
  { value: 'Natimorto', label: 'NATIMORTO', icon: '💀' },
  { value: 'Distócico', label: 'DISTÓCICO', icon: '⚠️' },
  { value: 'Gêmeos', label: 'GÊMEOS', icon: '👯' },
  { value: 'Deficiência Física', label: 'DEFICIÊNCIA FÍSICA', icon: '♿' },
  { value: 'Retenção de Placenta', label: 'RETENÇÃO DE PLACENTA', icon: '🩸' },
]

const SEXO = [
  { value: 'Macho', label: 'MACHO', icon: '♂️' },
  { value: 'Fêmea', label: 'FÊMEA', icon: '♀️' },
]

const RACAS = [
  { value: 'Aberdeen', label: 'ABERDEEN' },
  { value: 'Anelorado', label: 'ANELORADO' },
  { value: 'Angus', label: 'ANGUS' },
  { value: 'Charolês', label: 'CHAROLÊS' },
  { value: 'Girolando', label: 'GIROLANDO' },
  { value: 'Guzerá', label: 'GUZERÁ' },
  { value: 'Leiteiro', label: 'LEITEIRO' },
  { value: 'Nelore', label: 'NELORE' },
  { value: 'Red Angus', label: 'RED ANGUS' },
  { value: 'Senepol', label: 'SENEPOL' },
  { value: 'SRD', label: 'SRD' },
  { value: 'Wagyu', label: 'WAGYU' },
  { value: 'Outros', label: 'OUTROS' },
]

const CATEGORIAS_MAE = [
  { value: 'Nulípara', label: 'NULÍPARA' },
  { value: 'Primípara', label: 'PRIMÍPARA' },
  { value: 'Secundípara', label: 'SECUNDÍPARA' },
  { value: 'Multípara', label: 'MULTÍPARA' },
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
  lote: string
  loteId: string
  pesoCria: string
  idProvisorioCria: string
  idBrincoCria: string
  idChipCria: string
  tratamentos: string[]
  tratamentoOutros: string
  tipoParto: string[]
  observacaoParto: string
  sexo: string
  raca: string
  racaOutros: string
  idBrincoMae: string
  idChipMae: string
  categoriaMae: string
  escoreMatriz: string
  docilidadeMatriz: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  lote: '',
  loteId: '',
  pesoCria: '',
  idProvisorioCria: '',
  idBrincoCria: '',
  idChipCria: '',
  tratamentos: [],
  tratamentoOutros: '',
  tipoParto: [],
  observacaoParto: '',
  sexo: '',
  raca: '',
  racaOutros: '',
  idBrincoMae: '',
  idChipMae: '',
  categoriaMae: '',
  escoreMatriz: '',
  docilidadeMatriz: '',
})

export default function MaternidadePage() {
  const navigate = useNavigate()
  const { usuario, fazenda, fazendaId, logoUrl } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showEscoreModal, setShowEscoreModal] = useState(false)
  const [partosCount, setPartosCount] = useState<number>(0)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
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

  const handleTipoPartoChange = (newTipoParto: string[]) => {
    setForm(prev => ({
      ...prev,
      tipoParto: newTipoParto
    }))
  }

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Carregar lotes do cache global, com fallback para Supabase
  useEffect(() => {
    const loadData = async () => {
      const cache = getCachedCadastroData()
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

  // Escutar atualizações do cache de cadastro
  useEffect(() => {
    const unsubscribe = eventBus.on(CADASTRO_CACHE_UPDATED, (data: any) => {
      console.log('[MaternidadePage] Cache atualizado, recarregando dados')
      if (data) {
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

  // Buscar contagem de partos quando idBrincoMae ou idChipMae mudar
  useEffect(() => {
    async function carregarContagemPartos() {
      if (!fazendaId) {
        setPartosCount(0)
        return
      }

      try {
        const count = await getContagemPartosVaca(fazendaId, form.idBrincoMae, form.idChipMae)
        setPartosCount(count)
      } catch (error) {
        console.error('Erro ao carregar contagem de partos:', error)
        setPartosCount(0)
      }
    }

    carregarContagemPartos()
  }, [form.idBrincoMae, form.idChipMae, fazendaId])

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    // Construir string final de tratamentos
    const tratamentosFinais = form.tratamentos.map(t => 
      t === 'Outros' ? form.tratamentoOutros : t
    ).filter(Boolean) // remove strings vazias

    const tratamentoFinal = tratamentosFinais.join(', ')
    const racaFinal = form.raca === 'Outros' ? form.racaOutros : form.raca
    const pastoNome = detalhesLote?.pastos?.nome || null
    const result = await salvarRegistro('maternidade', {
      data: form.data,
      pasto: pastoNome,
      lote: form.lote,
      loteId: form.loteId,
      pesoCria: form.pesoCria ? Number(form.pesoCria) : null,
      idProvisorioCria: form.idProvisorioCria,
      idBrincoCria: form.idBrincoCria,
      idChipCria: form.idChipCria,
      tratamento: tratamentoFinal,
      tipoParto: form.tipoParto,
      observacaoParto: form.observacaoParto,
      sexo: form.sexo,
      raca: racaFinal,
      idBrincoMae: form.idBrincoMae,
      idChipMae: form.idChipMae,
      categoriaMae: form.categoriaMae,
      escoreMatriz: form.escoreMatriz ? Number(form.escoreMatriz) : null,
      docilidadeMatriz: form.docilidadeMatriz ? Number(form.docilidadeMatriz) : null,
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
            logoUrl={logoUrl}
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
          <span>POP MATERNIDADE</span>
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
          {detalhesLote && (
            <LoteDetalhesCard detalhes={detalhesLote} processarCategorias={processarCategorias} />
          )}
        </div>

        {/* Seção 2: Dados da Mãe */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. IDENTIFICAÇÃO DA MÃE</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="ID BRINCO"
              placeholder="Ex: 2021-089"
              value={form.idBrincoMae}
              onChange={setInputEvent('idBrincoMae')}
              error={getError('idBrincoMae')}
            />
            <Input
              label="ID CHIP"
              placeholder="Número do chip"
              value={form.idChipMae}
              onChange={setInputEvent('idChipMae')}
              error={getError('idChipMae')}
            />
          </div>
          <Radio
            name="categoriaMae"
            label="CATEGORIA DA MÃE"
            options={CATEGORIAS_MAE}
            value={form.categoriaMae}
            onChange={set('categoriaMae')}
            error={getError('categoriaMae')}
            gridCols={2}
          />
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-4">ESCORE DA MATRIZ</h3>
            <button
              onClick={() => setShowEscoreModal(true)}
              className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors mb-4"
            >
              <span className="text-xl">📄</span>
              <span>POP ESCORE CORPORAL</span>
            </button>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {ESCORES.map((escore) => (
                <button
                  key={escore.value}
                  onClick={() => set('escoreMatriz')(escore.value)}
                  className={`py-3 px-4 rounded-xl font-bold transition-all transform hover:scale-105 ${
                    form.escoreMatriz === escore.value ? `${escore.color} text-black` : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {escore.label}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-4">DOCILIDADE DA MATRIZ</h3>
            <label className="block text-lg font-bold text-gray-900 mb-3 whitespace-pre-wrap">AVALIAÇÃO DE DOCILIDADE</label>
            <p className="text-sm text-gray-600 mb-3">1 - Mais dócil | 3 - Mais brava</p>
            <div className="grid grid-cols-3 gap-2">
              <label className={`
                cursor-pointer rounded-xl border-2 
                transition-all active:scale-95
                flex flex-col items-center justify-center gap-1
                p-2 min-h-[70px]
                ${form.docilidadeMatriz === '1' ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]' : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
              `}>
                <input type="radio" name="docilidadeMatriz" className="sr-only" value="1" checked={form.docilidadeMatriz === '1'} onChange={() => set('docilidadeMatriz')('1')} />
                <span className="text-2xl sm:text-3xl">🟢</span>
                <span className="text-base sm:text-lg font-bold text-center leading-tight">1</span>
              </label>
              <label className={`
                cursor-pointer rounded-xl border-2 
                transition-all active:scale-95
                flex flex-col items-center justify-center gap-1
                p-2 min-h-[70px]
                ${form.docilidadeMatriz === '2' ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]' : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
              `}>
                <input type="radio" name="docilidadeMatriz" className="sr-only" value="2" checked={form.docilidadeMatriz === '2'} onChange={() => set('docilidadeMatriz')('2')} />
                <span className="text-2xl sm:text-3xl">🟡</span>
                <span className="text-base sm:text-lg font-bold text-center leading-tight">2</span>
              </label>
              <label className={`
                cursor-pointer rounded-xl border-2 
                transition-all active:scale-95
                flex flex-col items-center justify-center gap-1
                p-2 min-h-[70px]
                ${form.docilidadeMatriz === '3' ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]' : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
              `}>
                <input type="radio" name="docilidadeMatriz" className="sr-only" value="3" checked={form.docilidadeMatriz === '3'} onChange={() => set('docilidadeMatriz')('3')} />
                <span className="text-2xl sm:text-3xl">🔴</span>
                <span className="text-base sm:text-lg font-bold text-center leading-tight">3</span>
              </label>
            </div>
          </div>
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-2">HISTÓRICO DE PRENHEZ</h3>
            {!form.idBrincoMae && !form.idChipMae ? (
              <p className="text-lg font-semibold text-gray-700">
                Digite um ID brinco e/ou chip válidos primeiro
              </p>
            ) : partosCount > 0 ? (
              <p className="text-lg font-semibold text-gray-700">
                {partosCount}ª cria
              </p>
            ) : (
              <p className="text-lg font-semibold text-gray-700">
                Nenhum registro encontrado
              </p>
            )}
          </div>
        </div>

        {/* Seção 3: Identificação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. IDENTIFICAÇÃO DA CRIA</h2>
          <Input
            label="ID PROVISÓRIO"
            placeholder="Ex: 2023-145"
            value={form.idProvisorioCria}
            onChange={setInputEvent('idProvisorioCria')}
            error={getError('idProvisorioCria')}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="ID BRINCO"
              placeholder="Opcional"
              value={form.idBrincoCria}
              onChange={setInputEvent('idBrincoCria')}
              error={getError('idBrincoCria')}
            />
            <Input
              label="ID CHIP"
              placeholder="Opcional"
              value={form.idChipCria}
              onChange={setInputEvent('idChipCria')}
              error={getError('idChipCria')}
            />
          </div>
          <Input
            label="PESO DA CRIA (kg)"
            placeholder="Ex: 32"
            value={form.pesoCria}
            onChange={setInputEvent('pesoCria')}
            inputMode="decimal"
            type="number"
          />
        </div>

        {/* Seção 4: Tratamento */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. TRATAMENTOS</h2>
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

        {/* Seção 5: Parto */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">5. TIPO DE PARTO</h2>
          <CheckboxGroup
            label=""
            options={TIPOS_PARTO}
            selectedValues={form.tipoParto}
            onChange={handleTipoPartoChange}
            error={getError('tipoParto')}
            gridCols={2}
            hideCheckbox={true}
            id="tipoParto"
            dataField="tipoParto"
          />
          <Input
            label="OBSERVAÇÃO (OPCIONAL)"
            placeholder="Observações sobre o parto..."
            value={form.observacaoParto}
            onChange={setInputEvent('observacaoParto')}
          />
        </div>

        {/* Seção 6: Sexo e Raça */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">6. SEXO E RAÇA</h2>
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
              placeholder="Ex: Brahman, Hereford, Simental..."
              value={form.racaOutros}
              onChange={setInputEvent('racaOutros')}
              error={getError('racaOutros')}
            />
          )}
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

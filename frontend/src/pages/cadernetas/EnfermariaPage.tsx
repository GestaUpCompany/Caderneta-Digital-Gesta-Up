import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, ValidationMessage, SearchableModal, Radio } from '../../components/ui'
import { Brush, Save } from 'lucide-react'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import CadernetaHeader from '../../components/CadernetaHeader'
import {
  getLoteByNomeCached,
  getLoteDetalhesComCategoriasCached,
  getMedicamentosCached,
  getLotesAtivosCached,
} from '../../services/cadastroCache'
import { getLoteById } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import AnimalIdentifier from '../../components/AnimalIdentifier'
import LoteDetalhesCard from '../../components/LoteDetalhesCard'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { useFormValidation } from '../../hooks/useFormValidation'
import { usePhotoGps } from '../../hooks/usePhotoGps'
import FotoSection from '../../components/cadernetas/FotoSection'
import MedicamentosSection, { MedicamentoItem } from '../../components/cadernetas/MedicamentosSection'

const DIAGNOSTICOS = [
  'Pneumonia',
  'Cobra',
  'Tremores Musculares',
  'Incoordenação Motora',
  'Febre',
  'Sangramento',
  'Fratura',
  'Diarreia',
  'Empanzinado',
  'Cegueira',
  'Bicheira',
  'Inchaço',
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

function calcularIdade(dataNascimento: string | null | undefined): string {
  if (!dataNascimento) return ''
  try {
    const hoje = new Date()
    const nascimento = new Date(dataNascimento)
    if (isNaN(nascimento.getTime())) return ''
    let anos = hoje.getFullYear() - nascimento.getFullYear()
    let meses = hoje.getMonth() - nascimento.getMonth()
    if (meses < 0) {
      anos--
      meses += 12
    }
    const partes: string[] = []
    if (anos > 0) partes.push(`${anos} ${anos === 1 ? 'ano' : 'anos'}`)
    if (meses > 0) partes.push(`${meses} ${meses === 1 ? 'mês' : 'meses'}`)
    return partes.join(' e ') || '0 mês'
  } catch {
    return ''
  }
}

interface FormState {
  data: string
  pasto: string
  lote: string
  loteId: string
  pastoId: string
  idManejo: string
  brinco: string
  chip: string
  individuoId: string
  sexo: string
  raca: string
  idade: string
  categoria: string
  diagnosticos: string[]
  observacaoTratamento: string
  medicamentos: MedicamentoItem[]
  tipoRegistro: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  pasto: '',
  lote: '',
  loteId: '',
  pastoId: '',
  idManejo: '',
  brinco: '',
  chip: '',
  individuoId: '',
  sexo: '',
  raca: '',
  idade: '',
  categoria: '',
  diagnosticos: [],
  observacaoTratamento: '',
  medicamentos: [],
  tipoRegistro: '',
})

export default function EnfermariaPage() {
  const navigate = useNavigate()
  const { usuario, fazendaId } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [lotesPastoMap, setLotesPastoMap] = useState<Record<string, string>>({})
  const [detalhesLote, setDetalhesLote] = useState<any>(null)
  const [medicamentosDisponiveis, setMedicamentosDisponiveis] = useState<any[]>([])
  const [loteAutoIdentificado, setLoteAutoIdentificado] = useState<boolean>(false)
  const [mensagemLote, setMensagemLote] = useState<string>('')

  // Hook reutilizavel de foto (sem GPS nesta caderneta)
  const {
    fotoBase64,
    capturandoFoto,
    fotoErro,
    capturarFoto,
    limpar: limparFoto,
    fotoInputRef,
    handleFileInputChange,
  } = usePhotoGps({ comGps: false })

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const toggleDiagnostico = (diagnostico: string) => {
    setForm((prev) => ({
      ...prev,
      diagnosticos: prev.diagnosticos.includes(diagnostico)
        ? prev.diagnosticos.filter((d) => d !== diagnostico)
        : [...prev.diagnosticos, diagnostico]
    }))
  }

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Validation rules
  const validationRules: any = {
    data: { required: true },
    lote: { required: true },
    idManejo: {
      custom: (value: string) => {
        const hasManejo = value && value.trim() !== ''
        const hasBrinco = form.brinco && form.brinco.trim() !== ''
        const hasChip = form.chip && form.chip.trim() !== ''
        if (!hasManejo && !hasBrinco && !hasChip) return 'Preencha o ID Manejo, Brinco ou Chip'
        return null
      }
    },
    diagnosticos: {
      custom: (value: string[]) => {
        if (!value || value.length === 0) return 'Selecione pelo menos um diagnóstico'
        return null
      }
    },
    tipoRegistro: { required: true },
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

    const result = await salvarRegistro('enfermaria', {
      data: form.data,
      responsavel: usuario,
      usuario: usuario,
      pasto: form.pasto,
      pastoId: form.pastoId,
      lote: form.lote,
      loteId: form.loteId,
      idManejo: form.idManejo,
      brinco: form.brinco,
      chip: form.chip,
      individuoId: form.individuoId,
      sexo: form.sexo,
      raca: form.raca,
      idade: form.idade,
      categoria: form.categoria,
      diagnosticos: form.diagnosticos,
      medicamentos: form.medicamentos,
      observacaoTratamento: form.observacaoTratamento,
      tipoRegistro: form.tipoRegistro,
      fotoBase64: fotoBase64 || null,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      setForm(makeInitial())
      limparFoto()
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
      <CadernetaHeader
        title="ENFERMARIA"
        cadernetaId="enfermaria"
        dateContent={<DatePicker value={form.data} onChange={(val) => setForm((p) => ({ ...p, data: val }))} variant="header" compact inline />}
      />

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8 desktop-form-container">
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 2: Identificação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. IDENTIFICAÇÃO</h2>
          {loteAutoIdentificado ? (
            <Input
              label={<span>LOTE <span className="text-red-500">*</span></span>}
              value={form.lote}
              readOnly
              id="lote"
            />
          ) : lotesDisponiveis.length > 0 ? (
            <SearchableModal
              label={<span>PASTO/LOTE <span className="text-red-500">*</span></span>}
              value={form.lote}
              onChange={async (val) => {
                let loteId = ''
                try {
                  const lote = await getLoteByNomeCached(fazendaId, val)
                  loteId = lote?.id || ''
                } catch {
                  loteId = ''
                }
                setForm((p) => ({ ...p, lote: val, loteId }))
              }}
              error={getError('lote')}
              options={lotesDisponiveis}
              secondaryText={(lote) => lotesPastoMap[lote] || ''}
              placeholder="Buscar pasto ou lote..."
              id="lote"
              name="lote"
              disabled={!form.idManejo && !form.brinco && !form.chip}
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
          {mensagemLote && (
            <p className="text-sm text-amber-600 font-medium">{mensagemLote}</p>
          )}
          {detalhesLote && (
            <LoteDetalhesCard detalhes={detalhesLote} processarCategorias={processarCategorias} />
          )}
          <AnimalIdentifier
            fazendaId={fazendaId}
            valueManejo={form.idManejo}
            valueBrinco={form.brinco}
            valueChip={form.chip}
            required
            onChange={async ({ idManejo, idBrinco, idChip, individuoId, animalData }) => {
              const loteAtual = animalData?.lote_atual
              let novoLote = ''
              let novoLoteId = ''
              let autoIdentificado = false
              let msg = ''

              if (loteAtual) {
                try {
                  const lote = await getLoteById(loteAtual)
                  if (lote) {
                    novoLote = lote.nome || ''
                    novoLoteId = lote.id || ''
                    autoIdentificado = true
                  } else {
                    msg = 'Lote do animal não encontrado. Informe o lote manualmente.'
                  }
                } catch {
                  msg = 'Não foi possível identificar o lote do animal. Informe o lote manualmente.'
                }
              } else {
                msg = 'Animal sem lote vinculado. Informe o lote manualmente.'
              }

              setLoteAutoIdentificado(autoIdentificado)
              setMensagemLote(msg)
              setForm(prev => ({
                ...prev,
                idManejo: idManejo,
                brinco: idBrinco,
                chip: idChip,
                individuoId: individuoId || '',
                sexo: animalData?.sexo || prev.sexo,
                raca: animalData?.raca || prev.raca,
                idade: calcularIdade(animalData?.data_nascimento) || prev.idade,
                categoria: animalData?.categoria || prev.categoria,
                lote: autoIdentificado ? novoLote : prev.lote,
                loteId: autoIdentificado ? novoLoteId : prev.loteId,
              }))
            }}
          />
        </div>

        {/* Seção 3: Diagnóstico */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. DIAGNÓSTICO <span className="text-red-500">*</span></h2>
          <div className="grid grid-cols-2 gap-2">
            {DIAGNOSTICOS.map((diagnostico) => {
              const selecionado = form.diagnosticos.includes(diagnostico)
              return (
                <button
                  key={diagnostico}
                  type="button"
                  onClick={() => toggleDiagnostico(diagnostico)}
                  className={`
                    cursor-pointer rounded-xl border-2
                    transition-all active:scale-95
                    flex flex-col items-center justify-center gap-1
                    p-2 min-h-[70px]
                    ${selecionado ? 'bg-[#1a3a2a] text-white border-[#1a3a2a]' : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}
                  `}
                >
                  <span className="text-sm sm:text-base font-bold text-center leading-tight">{diagnostico.toUpperCase()}</span>
                </button>
              )
            })}
          </div>
          {getError('diagnosticos') && (
            <span className="text-sm text-red-500">{getError('diagnosticos')}</span>
          )}
        </div>

        {/* Seção 4: Tratamento */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. TRATAMENTOS <span className="text-red-500">*</span></h2>

          <Radio
            name="tipoRegistro"
            label={<span>TIPO <span className="text-red-500">*</span></span>}
            options={[
              { value: 'Curativo', label: 'CURATIVO' },
              { value: 'Preventivo', label: 'PREVENTIVO' },
            ]}
            value={form.tipoRegistro}
            onChange={(val) => setForm((p) => ({ ...p, tipoRegistro: val }))}
            error={getError('tipoRegistro')}
            gridCols={2}
          />

          <MedicamentosSection
            items={form.medicamentos}
            onChange={(items) => setForm(prev => ({ ...prev, medicamentos: items }))}
            medicamentosDisponiveis={medicamentosDisponiveis}
          />

          <Input
            label="OBSERVAÇÃO"
            placeholder="Detalhes adicionais (opcional)"
            value={form.observacaoTratamento}
            onChange={setInput('observacaoTratamento')}
          />
        </div>

        {/* Seção 5: Foto */}
        <FotoSection
          titulo="4. FOTO"
          descricao="Tire uma foto do animal ou do ferimento para anexar ao registro."
          textoBotao="TIRAR FOTO DO ANIMAL"
          fotoBase64={fotoBase64}
          capturando={capturandoFoto}
          erro={fotoErro}
          onTirar={capturarFoto}
          onRemover={limparFoto}
          fotoInputRef={fotoInputRef}
          onFileChange={handleFileInputChange}
        />

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvando || !isValid || form.medicamentos.length === 0}
            className={`w-full !min-h-0 rounded-2xl border-2 px-3 py-4 text-base font-bold transition-colors active:scale-[0.99] ${
              salvando || !isValid || form.medicamentos.length === 0
                ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                : 'border-green-600 bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Save className="h-5 w-5" strokeWidth={2.5} />
              {salvando ? 'SALVANDO...' : 'SALVAR'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => { setForm(makeInitial()); limparFoto() }}
            className="w-full !min-h-0 rounded-2xl border-2 border-gray-300 bg-gray-200 px-3 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-300 active:scale-95"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Brush className="h-4 w-4" strokeWidth={2.5} />
              LIMPAR
            </span>
          </button>
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

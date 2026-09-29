import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, ValidationMessage, SearchableModal, TextArea } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import CadernetaHeader from '../../components/CadernetaHeader'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import ChoiceGrid from '../../components/cadernetas/ChoiceGrid'
import FormFooter from '../../components/cadernetas/FormFooter'
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
  { value: 'Pneumonia', label: 'PNEUMONIA', icon: '🫁' },
  { value: 'Cobra', label: 'PICADA DE COBRA', icon: '🐍' },
  { value: 'Tremores Musculares', label: 'TREMENDO', icon: '〰️' },
  { value: 'Incoordenação Motora', label: 'ANDANDO TORTO', icon: '🌀' },
  { value: 'Febre', label: 'FEBRE', icon: '🌡️' },
  { value: 'Sangramento', label: 'SANGRAMENTO', icon: '🩸' },
  { value: 'Fratura', label: 'FRATURA', icon: '🦴' },
  { value: 'Diarreia', label: 'DIARREIA', icon: '💩' },
  { value: 'Empanzinado', label: 'EMPANZINADO', icon: '🎈' },
  { value: 'Cegueira', label: 'CEGUEIRA', icon: '👁️' },
  { value: 'Bicheira', label: 'BICHEIRA', icon: '🪰' },
  { value: 'Inchaço', label: 'INCHAÇO', icon: '⭕' },
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
    medicamentos: {
      custom: (value: MedicamentoItem[]) => {
        if (!value || value.length === 0) return 'Adicione pelo menos um medicamento'
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

  const handleLimpar = () => {
    setForm(makeInitial())
    limparFoto()
    setLoteAutoIdentificado(false)
    setMensagemLote('')
    setDetalhesLote(null)
  }

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

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
      handleLimpar()
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

      <main className="flex-1 p-4 flex flex-col gap-4 pb-8 desktop-form-container">
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        <CadernetaSection numero={1} titulo="IDENTIFICAÇÃO">
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
        </CadernetaSection>

        <CadernetaSection numero={2} titulo="O QUE ELE TEM? (MARQUE TODOS)" required>
          <ChoiceGrid
            options={DIAGNOSTICOS.map((d) => ({ ...d, tone: 'danger-solid' as const }))}
            mode="multi"
            values={form.diagnosticos}
            onChangeMulti={(vals) => setForm((p) => ({ ...p, diagnosticos: vals }))}
            cols={3}
            showCheck={false}
            labelSize="xs"
            dataField="diagnosticos"
          />
          {getError('diagnosticos') && (
            <p className="text-sm text-red-500">{getError('diagnosticos')}</p>
          )}
        </CadernetaSection>

        <CadernetaSection numero={3} titulo="TRATAMENTO">
          <div className="flex flex-col gap-2" data-field="tipoRegistro">
            <p className="text-[15px] font-bold text-gray-900">
              TIPO <span className="text-red-500">*</span>
            </p>
            <ChoiceGrid
              options={[
                { value: 'Curativo', label: 'CURATIVO', icon: '🩹' },
                { value: 'Preventivo', label: 'PREVENTIVO', icon: '🛡️' },
              ]}
              value={form.tipoRegistro}
              onChange={(val) => setForm((p) => ({ ...p, tipoRegistro: val }))}
              cols={2}
              showCheck={false}
            />
            {getError('tipoRegistro') && (
              <p className="text-sm text-red-500">{getError('tipoRegistro')}</p>
            )}
          </div>

          <div className="flex flex-col gap-2" data-field="medicamentos">
            <p className="text-[15px] font-bold text-gray-900">
              MEDICAMENTO <span className="text-red-500">*</span>
            </p>
            <MedicamentosSection
              items={form.medicamentos}
              onChange={(items) => setForm(prev => ({ ...prev, medicamentos: items }))}
              medicamentosDisponiveis={medicamentosDisponiveis}
            />
            {getError('medicamentos') && (
              <p className="text-sm text-red-500">{getError('medicamentos')}</p>
            )}
          </div>

          <TextArea
            label="OBSERVAÇÃO"
            placeholder="Detalhes adicionais (opcional)"
            value={form.observacaoTratamento}
            onChange={(e) => setForm((p) => ({ ...p, observacaoTratamento: e.target.value }))}
            rows={2}
          />
        </CadernetaSection>

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

        <FormFooter
          onSalvar={handleSalvar}
          onLimpar={handleLimpar}
          salvando={salvando}
          disabled={!isValid}
          formValido={isValid}
        />
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

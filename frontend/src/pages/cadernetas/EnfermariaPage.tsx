import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, ValidationMessage, SearchableModal } from '../../components/ui'
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
import { getLotes, getLoteById } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import AnimalIdentifier from '../../components/AnimalIdentifier'
import LoteDetalhesCard from '../../components/LoteDetalhesCard'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { useFormValidation } from '../../hooks/useFormValidation'

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
  const [loteAutoIdentificado, setLoteAutoIdentificado] = useState<boolean>(false)
  const [mensagemLote, setMensagemLote] = useState<string>('')

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
    sexo: { required: true },
    raca: { required: true },
    idade: { required: true },
    categoria: { required: true },
    diagnosticos: {
      custom: (value: string[]) => {
        if (!value || value.length === 0) return 'Selecione pelo menos um diagnóstico'
        return null
      }
    },
  }

  const { isValid } = useFormValidation(form, validationRules)

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

    const result = await salvarRegistro('enfermaria', {
      data: form.data,
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
        <div className="flex items-center justify-between desktop-form-container">
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
        </div>

        {/* Seção 2: Identificação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. IDENTIFICAÇÃO</h2>
          {loteAutoIdentificado ? (
            <Input
              label={<span>LOTE <span className="text-red-500">*</span></span>}
              value={form.lote}
              readOnly
              id="lote"
            />
          ) : lotesDisponiveis.length > 0 ? (
            <SearchableModal
              label={<span>LOTE <span className="text-red-500">*</span></span>}
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
              placeholder="Buscar lote..."
              id="lote"
              name="lote"
              disabled={!form.idManejo && !form.brinco && !form.chip}
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
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. DIAGNÓSTICO <span className="text-red-500">*</span></h2>
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

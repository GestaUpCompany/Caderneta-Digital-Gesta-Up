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
import { getLoteByNome, getMedicamentos, getLoteDetalhesComCategorias, getPastos, getLotes } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import LoteDetalhesCard from '../../components/LoteDetalhesCard'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'

const DIAGNOSTICOS = [
  { campo: 'pododermiteCascos', label: 'PODODERMITE DOS CASCOS?' },
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
  const [pastosDisponiveis, setPastosDisponiveis] = useState<string[]>([])
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

  // Carregar medicamentos do Supabase
  useEffect(() => {
    const loadMedicamentos = async () => {
      if (fazendaId) {
        try {
          const medicamentos = await getMedicamentos(fazendaId)
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
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do lote:', error)
        setDetalhesLote(null)
      }
    }

    carregarDetalhesLote()
  }, [form.lote, fazendaId])

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

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
      lote: form.lote,
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
          <DatePicker label="DATA" value={form.data} onChange={(val) => setForm((p) => ({ ...p, data: val }))} error={getError('data')} />
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
          <Radio
            name="sexo"
            label="SEXO"
            options={SEXO_OPTIONS}
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
              placeholder="Ex: Brahman, Hereford, Simmental..."
              value={form.racaOutros}
              onChange={setInput('racaOutros')}
              error={getError('racaOutros')}
            />
          )}
          <Input
            label="IDADE"
            placeholder="Ex: 2 anos, 6 meses..."
            value={form.idade}
            onChange={setInput('idade')}
            error={getError('idade')}
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
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. TRATAMENTO</h2>
          
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

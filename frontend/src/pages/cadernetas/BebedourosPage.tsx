import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, CheckboxGroup, ValidationMessage, SearchableModal } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import PdfModal from '../../components/PdfModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import { getCachedCadastroData } from '../../services/cadastroCache'
import { getLoteByNome, getBebedouroByNome, getUltimaDataLimpezaBebedouro, getIntervaloMedioLimpezas, createHistoricoLimpeza } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import LoteDetalhesCard from '../../components/LoteDetalhesCard'
import BebedouroDetalhesCard from '../../components/BebedouroDetalhesCard'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'

const BASE = import.meta.env.BASE_URL

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
  const regex = /[,.;]+\s*/
  return categorias
    .split(regex)
    .map(c => c.trim())
    .filter(c => c.length > 0)
}

const LEITURAS_BEBEDOURO = [
  { value: '1', label: '1', icon: '🟢' },
  { value: '2', label: '2', icon: '🟡' },
  { value: '3', label: '3', icon: '🔴' },
]

const SN_OPTIONS = [
  { value: 'Sim', label: 'SIM', icon: '✅' },
  { value: 'Não', label: 'NÃO', icon: '❌' },
]

const CHECKLIST_PERGUNTAS = [
  { campo: 'aguaSuficiente', label: 'QUANTIDADE DE ÁGUA ESTÁ ADEQUADA?' },
  { campo: 'vazaoBebedouroIdeal', label: 'VAZÃO DA BÓIA ESTÁ IDEAL?' },
  { campo: 'aterroAcessoBebedouroIdeal', label: 'ATERRO / ACESSO AO BEBEDOURO ESTÁ ADEQUADO?' },
  { campo: 'espacamentoBebedouroIdeal', label: 'ESPAÇAMENTO DO BEBEDOURO ESTÁ IDEAL?' },
  { campo: 'boiaProtecaoBoasCondicoes', label: 'BÓIA E PROTEÇÃO DA BÓIA ESTÃO EM BOAS CONDIÇÕES?' },
]

interface FormState {
  data: string
  responsavel: string
  pasto: string
  numeroLote: string
  categorias: string[]
  leituraBebedouro: string
  numeroBebedouro: string
  observacao: string
  outrosTexto: string
  // Checklist fields
  aguaSuficiente: string
  aguaSuficienteObs: string
  vazaoBebedouroIdeal: string
  vazaoBebedouroIdealObs: string
  aterroAcessoBebedouroIdeal: string
  aterroAcessoBebedouroIdealObs: string
  espacamentoBebedouroIdeal: string
  espacamentoBebedouroIdealObs: string
  boiaProtecaoBoasCondicoes: string
  boiaProtecaoBoasCondicoesObs: string
  // Limpeza info fields (read-only)
  tempoDesdeLimpeza: string
  intervaloMedioLimpezas: string
  metaIntervaloLimpeza: string
}

const makeInitial = (usuario?: string): FormState => ({
  data: todayBR(),
  responsavel: usuario || '',
  pasto: '',
  numeroLote: '',
  categorias: [],
  leituraBebedouro: '',
  numeroBebedouro: '',
  observacao: '',
  outrosTexto: '',
  // Checklist fields
  aguaSuficiente: '',
  aguaSuficienteObs: '',
  vazaoBebedouroIdeal: '',
  vazaoBebedouroIdealObs: '',
  aterroAcessoBebedouroIdeal: '',
  aterroAcessoBebedouroIdealObs: '',
  espacamentoBebedouroIdeal: '',
  espacamentoBebedouroIdealObs: '',
  boiaProtecaoBoasCondicoes: '',
  boiaProtecaoBoasCondicoesObs: '',
  // Limpeza info fields (read-only)
  tempoDesdeLimpeza: '',
  intervaloMedioLimpezas: '',
  metaIntervaloLimpeza: '',
})

export default function BebedourosPage() {
  const navigate = useNavigate()
  const { usuario, fazendaId } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(() => makeInitial(usuario))
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pastosDisponiveis, setPastosDisponiveis] = useState<string[]>([])
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [bebedourosDisponiveis, setBebedourosDisponiveis] = useState<string[]>([])
  const [detalhesLote, setDetalhesLote] = useState<any>(null)

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const handleCategoriasChange = (newCategorias: string[]) => {
    setForm((prev) => ({ ...prev, categorias: newCategorias }))
  }

  // Carregar pastos e lotes do cache global
  useEffect(() => {
    const cache = getCachedCadastroData()
    if (cache) {
      setPastosDisponiveis(cache.pastos || [])
      setLotesDisponiveis(cache.lotes || [])
      setBebedourosDisponiveis(cache.bebedouros || [])
    }
  }, [])

  // Escutar atualizações do cache de cadastro
  useEffect(() => {
    const unsubscribe = eventBus.on(CADASTRO_CACHE_UPDATED, (data: any) => {
      console.log('[BebedourosPage] Cache atualizado, recarregando dados')
      if (data) {
        setPastosDisponiveis(data.pastos || [])
        setLotesDisponiveis(data.lotes || [])
        setBebedourosDisponiveis(data.bebedouros || [])
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

  // Calcular dados de limpeza quando bebedouro for selecionado
  useEffect(() => {
    async function carregarDadosLimpeza() {
      if (!form.numeroBebedouro || !fazendaId) {
        setForm((prev) => ({
          ...prev,
          tempoDesdeLimpeza: '',
          intervaloMedioLimpezas: '',
          metaIntervaloLimpeza: '',
        }))
        return
      }

      try {
        const bebedouro = await getBebedouroByNome(fazendaId, form.numeroBebedouro)
        if (!bebedouro) {
          setForm((prev) => ({
            ...prev,
            tempoDesdeLimpeza: '',
            intervaloMedioLimpezas: '',
            metaIntervaloLimpeza: '',
          }))
          return
        }

        // Calcular tempo desde última limpeza
        const ultimaDataLimpeza = await getUltimaDataLimpezaBebedouro(fazendaId, bebedouro.id)
        let tempoDesdeLimpeza = 'Sem histórico'
        if (ultimaDataLimpeza) {
          const dataLimpeza = new Date(ultimaDataLimpeza)
          const hoje = new Date()
          const diffMs = hoje.getTime() - dataLimpeza.getTime()
          const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24))
          tempoDesdeLimpeza = `${diffDias} dias`
        }

        // Calcular intervalo médio de limpezas
        const intervaloMedio = await getIntervaloMedioLimpezas(fazendaId, bebedouro.id)
        const intervaloMedioStr = intervaloMedio > 0 ? `${intervaloMedio} dias` : 'Sem dados suficientes'

        // Meta de intervalo
        const metaIntervalo = bebedouro.meta_intervalo_limpeza ? `${bebedouro.meta_intervalo_limpeza} dias` : 'Não definida'

        setForm((prev) => ({
          ...prev,
          tempoDesdeLimpeza,
          intervaloMedioLimpezas: intervaloMedioStr,
          metaIntervaloLimpeza: metaIntervalo,
        }))
      } catch (error) {
        console.error('Erro ao carregar dados de limpeza:', error)
        setForm((prev) => ({
          ...prev,
          tempoDesdeLimpeza: '',
          intervaloMedioLimpezas: '',
          metaIntervaloLimpeza: '',
        }))
      }
    }

    carregarDadosLimpeza()
  }, [form.numeroBebedouro, fazendaId])

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    // Montar categoria como string separada por vírgula
    let categoriasArray = form.categorias.filter(c => c !== 'Outros')
    
    // Se "Outros" estiver selecionado e houver texto, adicionar no final
    if (form.categorias.includes('Outros') && form.outrosTexto.trim()) {
      categoriasArray.push(`Outros: ${form.outrosTexto.trim()}`)
    } else if (form.categorias.includes('Outros')) {
      categoriasArray.push('Outros')
    }
    
    const categoriaString = categoriasArray.join(', ')

    const result = await salvarRegistro('bebedouros', {
      data: form.data,
      responsavel: form.responsavel,
      pasto: form.pasto,
      numeroLote: form.numeroLote,
      categoria: categoriaString,
      leituraBebedouro: form.leituraBebedouro ? Number(form.leituraBebedouro) : null,
      numeroBebedouro: form.numeroBebedouro,
      observacao: form.observacao,
      // Checklist fields
      aguaSuficiente: form.aguaSuficiente === 'Sim',
      aguaSuficienteObs: form.aguaSuficienteObs || '',
      vazaoBebedouroIdeal: form.vazaoBebedouroIdeal === 'Sim',
      vazaoBebedouroIdealObs: form.vazaoBebedouroIdealObs || '',
      aterroAcessoBebedouroIdeal: form.aterroAcessoBebedouroIdeal === 'Sim',
      aterroAcessoBebedouroIdealObs: form.aterroAcessoBebedouroIdealObs || '',
      espacamentoBebedouroIdeal: form.espacamentoBebedouroIdeal === 'Sim',
      espacamentoBebedouroIdealObs: form.espacamentoBebedouroIdealObs || '',
      boiaProtecaoBoasCondicoes: form.boiaProtecaoBoasCondicoes === 'Sim',
      boiaProtecaoBoasCondicoesObs: form.boiaProtecaoBoasCondicoesObs || '',
      // Limpeza info fields
      tempoDesdeLimpeza: form.tempoDesdeLimpeza,
      intervaloMedioLimpezas: form.intervaloMedioLimpezas,
      metaIntervaloLimpeza: form.metaIntervaloLimpeza,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      // Registrar limpeza no histórico se um bebedouro foi selecionado
      if (form.numeroBebedouro && fazendaId) {
        try {
          const bebedouro = await getBebedouroByNome(fazendaId, form.numeroBebedouro)
          if (bebedouro) {
            // Converter data do formato DD/MM/YYYY para YYYY-MM-DD
            const [dia, mes, ano] = form.data.split('/')
            const dataLimpeza = `${ano}-${mes}-${dia}`
            
            await createHistoricoLimpeza(
              fazendaId,
              bebedouro.id,
              dataLimpeza,
              form.responsavel,
              form.observacao || 'Registro de inspeção'
            )
            console.log('[BebedourosPage] Limpeza registrada no histórico')
          }
        } catch (error) {
          console.error('[BebedourosPage] Erro ao registrar limpeza:', error)
          // Não impedir o sucesso do salvamento se o registro de limpeza falhar
        }
      }

      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      setForm(makeInitial(usuario))
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
    <>
      <CadernetaLayout title="BEBEDOUROS" cadernetaId="bebedouros">
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
          <Input
            label="RESPONSÁVEL"
            placeholder="Nome do responsável"
            value={form.responsavel}
            onChange={setInput('responsavel')}
            error={getError('responsavel')}
            readOnly
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

        {/* Seção 2: Classificação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. CLASSIFICAÇÃO DO GADO</h2>
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

        {/* Seção 3: Bebedouro */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. BEBEDOURO</h2>
          {bebedourosDisponiveis.length > 0 ? (
            <SearchableModal
              label=""
              value={form.numeroBebedouro}
              onChange={set('numeroBebedouro')}
              error={getError('numeroBebedouro')}
              options={bebedourosDisponiveis}
              placeholder="Selecione o bebedouro..."
              id="numeroBebedouro"
              name="numeroBebedouro"
            />
          ) : (
            <Input
              label="BEBEDOURO"
              value={form.numeroBebedouro}
              onChange={setInput('numeroBebedouro')}
              error={getError('numeroBebedouro')}
              id="numeroBebedouro"
            />
          )}
          {form.numeroBebedouro && (
            <BebedouroDetalhesCard
              tempoDesdeLimpeza={form.tempoDesdeLimpeza}
              intervaloMedioLimpezas={form.intervaloMedioLimpezas}
              metaIntervaloLimpeza={form.metaIntervaloLimpeza}
            />
          )}
          <Radio
            name="leituraBebedouro"
            label={"LEITURA DE BEBEDOURO" + "\n" + "(1 a 3)"}
            options={LEITURAS_BEBEDOURO}
            value={form.leituraBebedouro}
            onChange={set('leituraBebedouro')}
            error={getError('leituraBebedouro')}
            gridCols={3}
          />
          <button
            onClick={() => setShowPdfModal(true)}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors"
          >
            <span className="text-xl">📄</span>
            <span>POP BEBEDOUROS</span>
          </button>
        </div>

        {/* Seção 4: Checklist */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. CHECKLIST</h2>
          {CHECKLIST_PERGUNTAS.map(({ campo, label }) => (
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
          ))}
        </div>

        {/* Seção 5: Observação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">5. OBSERVAÇÃO</h2>
          <Input
            placeholder="Detalhes adicionais (opcional)"
            value={form.observacao}
            onChange={setInput('observacao')}
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
      </CadernetaLayout>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Bebedouros"
        registro={registroSalvo}
        caderneta="bebedouros"
      />

      <PdfModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        images={[
          `${BASE}docs/bebedouros/POP_Bebedouros_01.jpg`
        ]}
      />
    </>
  )
}

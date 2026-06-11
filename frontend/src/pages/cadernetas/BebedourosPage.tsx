import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, ValidationMessage, SearchableModal } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import PdfModal from '../../components/PdfModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import { getCachedCadastroData } from '../../services/cadastroCache'
import { getBebedouroByNome, getUltimaDataLimpezaBebedouro, getIntervaloMedioLimpezas, createHistoricoLimpeza, getFuncionarios, getLoteDetalhesComCategorias, getPastos, getPastoByNome, getLotesByPastoId, getBebedouros } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import { useFormValidation } from '../../hooks/useFormValidation'
import LoteOcupandoPastoCard from '../../components/LoteOcupandoPastoCard'
import BebedouroDetalhesCard from '../../components/BebedouroDetalhesCard'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'

const BASE = import.meta.env.BASE_URL

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
  loteId: string
  pastoId: string
  leituraBebedouro: string
  numeroBebedouro: string
  observacao: string
  // Checklist fields (for UI)
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
  checklist?: {
    agua_suficiente: {
      valor: boolean
      observacao: string
    }
    vazao_bebedouro_ideal: {
      valor: boolean
      observacao: string
    }
    aterro_acesso_bebedouro_ideal: {
      valor: boolean
      observacao: string
    }
    espacamento_bebedouro_ideal: {
      valor: boolean
      observacao: string
    }
    boia_protecao_boas_condicoes: {
      valor: boolean
      observacao: string
    }
  }
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
  loteId: '',
  pastoId: '',
  leituraBebedouro: '',
  numeroBebedouro: '',
  observacao: '',
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
  const [lotesNoPasto, setLotesNoPasto] = useState<any[]>([])
  const [bebedourosDisponiveis, setBebedourosDisponiveis] = useState<string[]>([])
  const [detalhesLote, setDetalhesLote] = useState<any>(null)
  const [funcionariosDisponiveis, setFuncionariosDisponiveis] = useState<string[]>([])
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(false)

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Carregar funcionários do Supabase
  useEffect(() => {
    const loadFuncionarios = async () => {
      if (!fazendaId) {
        setFuncionariosDisponiveis([])
        setLoadingFuncionarios(false)
        return
      }

      setLoadingFuncionarios(true)
      try {
        const funcionarios = await getFuncionarios(fazendaId)
        setFuncionariosDisponiveis(funcionarios.map(f => f.nome))
      } catch (error) {
        console.error('Erro ao carregar funcionários:', error)
        setFuncionariosDisponiveis([])
      } finally {
        setLoadingFuncionarios(false)
      }
    }

    loadFuncionarios()
  }, [fazendaId])

  // Carregar pastos e lotes do cache global, com fallback para Supabase
  useEffect(() => {
    const loadData = async () => {
      const cache = getCachedCadastroData()
      if (cache && cache.pastos && cache.pastos.length > 0) {
        setPastosDisponiveis(cache.pastos || [])
        setBebedourosDisponiveis(cache.bebedouros || [])
      } else if (fazendaId) {
        // Fallback: carregar do Supabase se cache estiver vazio
        try {
          const [pastosData, bebedourosData] = await Promise.all([
            getPastos(fazendaId),
            getBebedouros(fazendaId)
          ])
          setPastosDisponiveis(pastosData?.map((p: any) => p.nome) || [])
          setBebedourosDisponiveis(bebedourosData?.map((b: any) => b.nome) || [])
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
      console.log('[BebedourosPage] Cache atualizado, recarregando dados')
      if (data) {
        setPastosDisponiveis(data.pastos || [])
        setBebedourosDisponiveis(data.bebedouros || [])
      }
    })

    return unsubscribe
  }, [])

  // Buscar lotes e detalhes quando pasto é selecionado
  useEffect(() => {
    async function carregarLotesDoPasto() {
      if (!form.pasto || !fazendaId) {
        setDetalhesLote(null)
        setLotesNoPasto([])
        setForm(prev => ({ ...prev, numeroLote: '', loteId: '', pastoId: '' }))
        return
      }

      try {
        const pasto = await getPastoByNome(fazendaId, form.pasto)
        if (!pasto) {
          setDetalhesLote(null)
          setLotesNoPasto([])
          setForm(prev => ({ ...prev, numeroLote: '', loteId: '', pastoId: '' }))
          return
        }

        const pastoId = pasto.id
        setForm(prev => ({ ...prev, pastoId }))

        const lotes = await getLotesByPastoId(fazendaId, pastoId)
        setLotesNoPasto(lotes || [])

        if (!lotes || lotes.length === 0) {
          setDetalhesLote(null)
          setForm(prev => ({ ...prev, numeroLote: '', loteId: '' }))
          return
        }

        const lotePrincipal = lotes[0]
        const categoriasDetalhes = await getLoteDetalhesComCategorias(lotePrincipal.id)

        setDetalhesLote({
          ...lotePrincipal,
          categorias: categoriasDetalhes.categorias,
          n_cabecas: categoriasDetalhes.quant_atual,
          peso_vivo_kg: categoriasDetalhes.peso_vivo_kg,
          qtd_bezerros: categoriasDetalhes.qtd_bezerros
        })

        setForm(prev => ({
          ...prev,
          numeroLote: lotePrincipal.nome || '',
          loteId: lotePrincipal.id
        }))
      } catch (error) {
        console.error('Erro ao carregar lotes do pasto:', error)
        setDetalhesLote(null)
        setLotesNoPasto([])
        setForm(prev => ({ ...prev, numeroLote: '', loteId: '', pastoId: '' }))
      }
    }

    carregarLotesDoPasto()
  }, [form.pasto, fazendaId])

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

  // Validation rules
  const validationRules: any = {
    data: { required: true },
    responsavel: { required: true },
    pasto: { required: true },
    leituraBebedouro: { required: true },
    aguaSuficiente: { required: true },
    vazaoBebedouroIdeal: { required: true },
    aterroAcessoBebedouroIdeal: { required: true },
    espacamentoBebedouroIdeal: { required: true },
    boiaProtecaoBoasCondicoes: { required: true },
  }

  const { isValid } = useFormValidation(form, validationRules)

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    // Validate form using the validation hook
    if (!isValid) {
      setSalvando(false)
      return
    }

    const result = await salvarRegistro('bebedouros', {
      data: form.data,
      responsavel: form.responsavel,
      pasto: form.pasto,
      pastoId: form.pastoId,
      numeroLote: form.numeroLote,
      loteId: form.loteId,
      leituraBebedouro: form.leituraBebedouro ? Number(form.leituraBebedouro) : null,
      numeroBebedouro: form.numeroBebedouro,
      observacao: form.observacao,
      checklist: {
        agua_suficiente: {
          valor: form.aguaSuficiente === 'Sim',
          observacao: form.aguaSuficienteObs || ''
        },
        vazao_bebedouro_ideal: {
          valor: form.vazaoBebedouroIdeal === 'Sim',
          observacao: form.vazaoBebedouroIdealObs || ''
        },
        aterro_acesso_bebedouro_ideal: {
          valor: form.aterroAcessoBebedouroIdeal === 'Sim',
          observacao: form.aterroAcessoBebedouroIdealObs || ''
        },
        espacamento_bebedouro_ideal: {
          valor: form.espacamentoBebedouroIdeal === 'Sim',
          observacao: form.espacamentoBebedouroIdealObs || ''
        },
        boia_protecao_boas_condicoes: {
          valor: form.boiaProtecaoBoasCondicoes === 'Sim',
          observacao: form.boiaProtecaoBoasCondicoesObs || ''
        }
      },
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
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS PRINCIPAIS <span className="text-red-500">*</span></h2>
          <DatePicker label="DATA" value={form.data} onChange={set('data')} error={getError('data')} />
          {funcionariosDisponiveis.length > 0 ? (
            <SearchableModal
              label="RESPONSÁVEL"
              value={form.responsavel}
              onChange={set('responsavel')}
              error={getError('responsavel')}
              options={funcionariosDisponiveis}
              placeholder="Buscar funcionário..."
              disabled={loadingFuncionarios}
              id="responsavel"
              name="responsavel"
            />
          ) : (
            <Input
              label="RESPONSÁVEL"
              placeholder={loadingFuncionarios ? 'Carregando funcionários...' : 'Nome do responsável'}
              value={form.responsavel}
              onChange={setInput('responsavel')}
              error={getError('responsavel')}
            />
          )}
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
            />
          )}
          {lotesNoPasto.length > 1 && (
            <p className="text-sm text-amber-600 font-medium">
              ⚠️ Este pasto contém {lotesNoPasto.length} lotes ativos. O primeiro foi selecionado automaticamente.
            </p>
          )}
          {lotesNoPasto.length === 0 && form.pasto && (
            <p className="text-sm text-red-600 font-medium">
              ⚠️ Nenhum lote ativo ocupando este pasto.
            </p>
          )}
          {detalhesLote && (
            <LoteOcupandoPastoCard
              detalhes={{
                nome: detalhesLote.nome || form.numeroLote,
                categorias: detalhesLote.categorias,
                n_cabecas: detalhesLote.n_cabecas,
                peso_vivo_kg: detalhesLote.peso_vivo_kg,
              }}
              processarCategorias={processarCategorias}
            />
          )}
        </div>

        {/* Seção 2: Bebedouro */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. BEBEDOURO <span className="text-red-500">*</span></h2>
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
            label="LEITURA DE BEBEDOURO (1 a 3)"
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

        {/* Seção 3: Checklist */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. CHECKLIST <span className="text-red-500">*</span></h2>
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
              {(form as any)[campo] === 'Não' && (
                <Input
                  placeholder="Adicionar observação (opcional)"
                  value={(form as any)[`${campo}Obs`] || ''}
                  onChange={(e) => setForm((prev) => ({ ...prev, [`${campo}Obs`]: e.target.value }))}
                  className="mt-2"
                />
              )}
            </div>
          ))}
        </div>

        {/* Seção 4: Observação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. OBSERVAÇÃO</h2>
          <Input
            placeholder="Detalhes adicionais (opcional)"
            value={form.observacao}
            onChange={setInput('observacao')}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾" disabled={!isValid}>
            SALVAR
          </Button>
          <Button onClick={() => setForm(makeInitial())} variant="secondary" icon="🧹" fullWidth>
            LIMPAR
          </Button>
        </div>
        {!isValid && (
          <p className="text-base text-gray-600 text-center">
            <span className="text-red-500">*</span> Preencha todos os campos obrigatórios para salvar
          </p>
        )}
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

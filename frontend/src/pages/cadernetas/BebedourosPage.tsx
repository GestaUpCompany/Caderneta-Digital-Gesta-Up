import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, Radio, ValidationMessage, SearchableModal } from '../../components/ui'
import { Brush, Save } from 'lucide-react'
import SuccessModal from '../../components/SuccessModal'
import PdfModal from '../../components/PdfModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { formatarTempoDesdeLimpeza } from '../../utils/shareUtils'
import { RootState } from '../../store/store'
import { getCachedCadastroData, getBebedourosCached, getBebedouroByNomeCached, getUltimaDataLimpezaBebedouroAntesDeCached, getIntervaloMedioLimpezasCached, getPastosByBebedouroCached } from '../../services/cadastroCache'
import { createHistoricoLimpeza } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import { useFormValidation } from '../../hooks/useFormValidation'
import { useChecklistAtivo } from '../../hooks/useChecklistAtivo'
import { useSalvarRegistro } from '../../hooks/useSalvarRegistro'
import ObservacaoAtrasoModal from '../../components/ObservacaoAtrasoModal'
import BebedouroDetalhesCard from '../../components/BebedouroDetalhesCard'
import BebedouroPastoCard from '../../components/BebedouroPastoCard'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'

const BASE = import.meta.env.BASE_URL

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

const makeInitial = (): FormState => ({
  data: todayBR(),
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
  const { usuario, fazendaId, testModeAtivo } = useSelector((state: RootState) => state.config)
  const { ativo: checklistAtivo, loading: loadingChecklistRegras } = useChecklistAtivo('bebedouros')
  const {
    salvando,
    salvar,
    showObservacaoModal,
    horariosModal,
    onConfirmarObservacao,
    onCancelarObservacao,
  } = useSalvarRegistro('bebedouros')
  const [form, setForm] = useState<FormState>(() => makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [bebedourosDisponiveis, setBebedourosDisponiveis] = useState<string[]>([])
  const [pastosBebedouro, setPastosBebedouro] = useState<{ id: string; nome: string }[] | null>(null)
  const [loadingPastosBebedouro, setLoadingPastosBebedouro] = useState(false)

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Carregar bebedouros (com cache lazy para offline)
  useEffect(() => {
    const loadData = async () => {
      if (!fazendaId) return
      try {
        const bebedourosData = await getBebedourosCached(fazendaId)
        if (bebedourosData && bebedourosData.length > 0) {
          setBebedourosDisponiveis(bebedourosData.map((b: any) => b.nome))
        } else {
          const cache = await getCachedCadastroData()
          setBebedourosDisponiveis(cache?.bebedouros || [])
        }
      } catch (error) {
        console.error('Erro ao carregar bebedouros:', error)
      }
    }
    loadData()
  }, [fazendaId])

  // Escutar atualizações do cache de cadastro
  useEffect(() => {
    const unsubscribe = eventBus.on(CADASTRO_CACHE_UPDATED, (data: any) => {
      console.log('[BebedourosPage] Cache atualizado, recarregando dados')
      if (data) {
        setBebedourosDisponiveis(data.bebedouros || [])
      }
    })

    return unsubscribe
  }, [])

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
        const bebedouro = await getBebedouroByNomeCached(fazendaId, form.numeroBebedouro)
        if (!bebedouro) {
          setForm((prev) => ({
            ...prev,
            tempoDesdeLimpeza: '',
            intervaloMedioLimpezas: '',
            metaIntervaloLimpeza: '',
          }))
          return
        }

        // Calcular tempo desde última limpeza (anterior à data do registro)
        const dataSemHora = form.data.split(' ')[0]
        const [dia, mes, ano] = dataSemHora.split('/')
        const dataRef = `${ano}-${mes}-${dia}`
        const ultimaDataLimpeza = await getUltimaDataLimpezaBebedouroAntesDeCached(fazendaId, bebedouro.id, dataRef)
        const tempoDesdeLimpeza = formatarTempoDesdeLimpeza(ultimaDataLimpeza)

        // Calcular intervalo médio de limpezas
        const intervaloMedio = await getIntervaloMedioLimpezasCached(fazendaId, bebedouro.id)
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

  // Buscar pastos vinculados ao bebedouro selecionado (via junction pasto_bebedouros)
  useEffect(() => {
    async function carregarPastosBebedouro() {
      if (!form.numeroBebedouro || !fazendaId) {
        setPastosBebedouro(null)
        return
      }

      setLoadingPastosBebedouro(true)
      try {
        const bebedouro = await getBebedouroByNomeCached(fazendaId, form.numeroBebedouro)
        if (!bebedouro) {
          setPastosBebedouro(null)
          return
        }
        const pastos = await getPastosByBebedouroCached(fazendaId, bebedouro.id)
        setPastosBebedouro(pastos)
      } catch (error) {
        console.error('[BebedourosPage] Erro ao carregar pastos do bebedouro:', error)
        setPastosBebedouro(null)
      } finally {
        setLoadingPastosBebedouro(false)
      }
    }

    carregarPastosBebedouro()
  }, [form.numeroBebedouro, fazendaId])

  // Validation rules
  const validationRules: any = {
    data: { required: true },
    numeroBebedouro: { required: true },
    leituraBebedouro: { required: true },
  }
  if (checklistAtivo) {
    CHECKLIST_PERGUNTAS.forEach(({ campo }) => {
      validationRules[campo] = { required: true }
    })
  }

  const { isValid } = useFormValidation(form, validationRules)

  const executarSalvamento = async () => {
    setErrors([])

    // Validate form using the validation hook
    if (!isValid) {
      return
    }

    const result = await salvarRegistro('bebedouros', {
      data: form.data,
      responsavel: usuario,
      usuario: usuario,
      leituraBebedouro: form.leituraBebedouro ? Number(form.leituraBebedouro) : null,
      numeroBebedouro: form.numeroBebedouro,
      pasto: pastosBebedouro && pastosBebedouro.length > 0 ? pastosBebedouro.map(p => p.nome).join(', ') : null,
      pastoId: pastosBebedouro && pastosBebedouro.length === 1 ? pastosBebedouro[0].id : null,
      observacao: form.observacao,
      tempoDesdeLimpeza: form.tempoDesdeLimpeza,
      intervaloMedioLimpezas: form.intervaloMedioLimpezas,
      metaIntervaloLimpeza: form.metaIntervaloLimpeza,
      checklist: checklistAtivo ? {
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
      } : null,
    })

    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      // Registrar limpeza no histórico se um bebedouro foi selecionado
      if (form.numeroBebedouro && fazendaId && !testModeAtivo) {
        try {
          const bebedouro = await getBebedouroByNomeCached(fazendaId, form.numeroBebedouro)
          if (bebedouro) {
            // Converter data do formato DD/MM/YYYY para YYYY-MM-DD
            const [dia, mes, ano] = form.data.split('/')
            const dataLimpeza = `${ano}-${mes}-${dia}`
            
            await createHistoricoLimpeza(
              fazendaId,
              bebedouro.id,
              dataLimpeza,
              usuario,
              form.observacao || 'Registro de inspeção'
            )
            console.log('[BebedourosPage] Limpeza registrada no histórico')
          }
        } catch (error) {
          console.error('[BebedourosPage] Erro ao registrar limpeza:', error)
          // Não impedir o sucesso do salvamento se o registro de limpeza falhar
        }
      }

      // Enriquecer registro com histórico de limpeza para o texto compartilhado
      let registroParaShare = result.registro as any
      if (form.numeroBebedouro && fazendaId) {
        try {
          const [dia, mes, ano] = form.data.split('/')
          const dataLimpeza = `${ano}-${mes}-${dia}`
          const bebedouro = await getBebedouroByNomeCached(fazendaId, form.numeroBebedouro)
          if (bebedouro) {
            const ultimaDataLimpeza = await getUltimaDataLimpezaBebedouroAntesDeCached(fazendaId, bebedouro.id, dataLimpeza)
            const tempoDesdeLimpeza = formatarTempoDesdeLimpeza(ultimaDataLimpeza)
            const intervaloMedio = await getIntervaloMedioLimpezasCached(fazendaId, bebedouro.id)
            const intervaloMedioStr = intervaloMedio > 0 ? `${intervaloMedio} dias` : 'Sem dados suficientes'
            const metaIntervalo = bebedouro.meta_intervalo_limpeza ? `${bebedouro.meta_intervalo_limpeza} dias` : 'Não definida'
            registroParaShare = {
              ...registroParaShare,
              tempoDesdeLimpeza,
              intervaloMedioLimpezas: intervaloMedioStr,
              metaIntervaloLimpeza: metaIntervalo,
            }
          }
        } catch (error) {
          console.error('[BebedourosPage] Erro ao enriquecer histórico para share:', error)
        }
      }

      setRegistroSalvo(registroParaShare)
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
    <>
      <CadernetaLayout
        title="BEBEDOUROS"
        cadernetaId="bebedouros"
        dateContent={
          <DatePicker value={form.data} onChange={set('data')} variant="header" compact inline />
        }
      >
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 2: Bebedouro */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. BEBEDOURO <span className="text-red-500">*</span></h2>
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
          {form.numeroBebedouro && (
            <BebedouroPastoCard
              nomeBebedouro={form.numeroBebedouro}
              pastos={pastosBebedouro}
              loading={loadingPastosBebedouro}
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
        {loadingChecklistRegras ? (
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
            <h2 className="text-lg font-black text-gray-900 tracking-tight">2. CHECKLIST</h2>
            <p className="text-gray-500 text-center py-4">Carregando regras do checklist...</p>
          </div>
        ) : checklistAtivo ? (
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
            <h2 className="text-lg font-black text-gray-900 tracking-tight">2. CHECKLIST <span className="text-red-500">*</span></h2>
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
        ) : null}

        {/* Seção 4: Observação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. OBSERVAÇÃO</h2>
          <Input
            placeholder="Detalhes adicionais (opcional)"
            value={form.observacao}
            onChange={setInput('observacao')}
          />
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => salvar(executarSalvamento)}
            disabled={salvando || !isValid}
            className={`w-full !min-h-0 rounded-2xl border-2 px-3 py-4 text-base font-bold transition-colors active:scale-[0.99] ${
              salvando || !isValid
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
            onClick={() => setForm(makeInitial())}
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

      <ObservacaoAtrasoModal
        isOpen={showObservacaoModal}
        onClose={async (observacao) => {
          if (observacao !== undefined) {
            await onConfirmarObservacao(observacao)
          } else {
            onCancelarObservacao()
          }
        }}
        horarioProgramado={horariosModal.programado}
        horarioRegistro={horariosModal.registro}
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

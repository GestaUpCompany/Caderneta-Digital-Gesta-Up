import { useState, useEffect, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, ValidationMessage } from '../../components/ui'
import { Warehouse } from 'lucide-react'
import SearchableModal from '../../components/ui/SearchableModal'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import ChoiceGrid from '../../components/cadernetas/ChoiceGrid'
import InfoCard from '../../components/cadernetas/InfoCard'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import StepperInput from '../../components/cadernetas/StepperInput'
import FormFooter from '../../components/cadernetas/FormFooter'
import EscalaRotulada from '../../components/cadernetas/EscalaRotulada'
import BannerRascunho from '../../components/BannerRascunho'
import { salvarRegistro } from '../../services/api'
import { todayBR, brToIso, getCurrentTimeInTimezone } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import {
  getCachedCadastroData,
  getCurraisCached,
  getLoteByIdCached,
  getLoteDetalhesComCategoriasCached,
  getOcupacoesCurralNaDataCached,
} from '../../services/cadastroCache'
import { getFuncionarios } from '../../services/supabaseService'
import { calcularDiferencaTempo } from '../../utils/calcularTempo'
import { ocupacaoVigentePorCurral } from '../../utils/ocupacaoCurral'
import { scrollToFirstError } from '../../utils/scrollToError'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { processarCategorias, capitalizarCategoria } from '../../utils/categorias'
import { useFormValidation } from '../../hooks/useFormValidation'
import { useSalvarRegistro } from '../../hooks/useSalvarRegistro'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import ObservacaoAtrasoModal from '../../components/ObservacaoAtrasoModal'
import { normalizeCategoriaToField } from '../../utils/categoriasRebanho'
import { ESCORES_CORPORAIS, ESCORES_FEZES, EQUIPE_OPTIONS, CONTADO_OPTIONS, CHAVE_TOTAL } from '../../utils/pastagensManejo'

// Sistemas de produção cujos lotes ficam em curral (mesma regra do servidor em trocar_lote_curral).
const SISTEMAS_COM_CURRAL = ['Confinamento', 'TIP', 'Sequestro']

interface CurralCache {
  id: string
  nome: string
  lote_id: string | null
}

interface FormState {
  data: string
  horarioManejo: string
  numeroLote: string
  loteId: string
  curralSaida: string
  curralSaidaId: string
  tempoOcupacao: string
  curralEntrada: string
  curralEntradaId: string
  gadoContado: string
  escoreGado: string
  escoreFezes: string
  numeroPessoasManejo: string
  equipeNomes: string[]
  categoriasQuantidades: Record<string, string>
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  horarioManejo: getCurrentTimeInTimezone().slice(0, 5),
  numeroLote: '',
  loteId: '',
  curralSaida: '',
  curralSaidaId: '',
  tempoOcupacao: '',
  curralEntrada: '',
  curralEntradaId: '',
  gadoContado: '',
  escoreGado: '',
  escoreFezes: '',
  numeroPessoasManejo: '',
  equipeNomes: [],
  categoriasQuantidades: {},
})

interface PastagensCurralFormProps {
  /** Seletor Pastos | Currais, renderizado no topo da tela */
  seletor?: ReactNode
}

/**
 * Manejo de currais: move o lote de um curral para outro (curral x lote é 1:1).
 * Grava em registros_curral; o servidor aplica a troca e gera o histórico de ocupação.
 */
export default function PastagensCurralForm({ seletor }: PastagensCurralFormProps) {
  const navigate = useNavigate()
  const { usuario, fazendaId } = useSelector((state: RootState) => state.config)
  const {
    salvando,
    salvar,
    showObservacaoModal,
    horariosModal,
    onConfirmarObservacao,
    onCancelarObservacao,
  } = useSalvarRegistro('pastagens')

  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'curral', makeInitial })
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [currais, setCurrais] = useState<CurralCache[]>([])
  const [funcionariosDisponiveis, setFuncionariosDisponiveis] = useState<string[]>([])
  const [detalhesLote, setDetalhesLote] = useState<any>(null)

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const categoriasDoLote = useMemo(() => {
    if (!detalhesLote?.categorias_raw || !Array.isArray(detalhesLote.categorias_raw)) return null
    const cats = detalhesLote.categorias_raw
      .map((cat: any) => ({ nome: cat.categoria as string, maxCabecas: cat.quant_atual || 0 }))
      .filter((c: { nome: string; maxCabecas: number }) => c.nome)
    return cats.length === 0 ? null : (cats as { nome: string; maxCabecas: number }[])
  }, [detalhesLote])

  const [horaAtual, setHoraAtual] = useState(() => getCurrentTimeInTimezone().slice(0, 5))
  useEffect(() => {
    const id = setInterval(() => setHoraAtual(getCurrentTimeInTimezone().slice(0, 5)), 30000)
    return () => clearInterval(id)
  }, [])

  const handleEquipe = (value: string) => {
    const numPessoas = Number(value) || 0
    setForm((prev) => ({
      ...prev,
      numeroPessoasManejo: value,
      equipeNomes: Array.from({ length: numPessoas }, (_, i) => prev.equipeNomes[i] || ''),
    }))
  }

  const setCategoriaQtd = (chave: string) => (val: string) =>
    setForm((prev) => ({ ...prev, categoriasQuantidades: { ...prev.categoriasQuantidades, [chave]: val } }))

  // Currais e funcionários (cache global, com fallback para o Supabase)
  useEffect(() => {
    if (!fazendaId) return
    let cancelado = false
    const carregar = async () => {
      try {
        const lista = await getCurraisCached(fazendaId)
        if (!cancelado && lista) setCurrais(lista.map((c: any) => ({ id: c.id, nome: c.nome, lote_id: c.lote_id ?? null })))
      } catch (error) {
        console.error('[PastagensCurralForm] Erro ao carregar currais:', error)
      }
      try {
        const cache = await getCachedCadastroData()
        if (cache?.funcionarios?.length) {
          if (!cancelado) setFuncionariosDisponiveis(cache.funcionarios)
        } else {
          const funcionarios = await getFuncionarios(fazendaId)
          if (!cancelado) setFuncionariosDisponiveis(funcionarios?.map((f: any) => f.nome) || [])
        }
      } catch (error) {
        console.error('[PastagensCurralForm] Erro ao carregar funcionários:', error)
      }
    }
    carregar()
    const unsubscribe = eventBus.on(CADASTRO_CACHE_UPDATED, (dados: any) => {
      if (dados?.funcionarios) setFuncionariosDisponiveis(dados.funcionarios)
      carregar()
    })
    return () => {
      cancelado = true
      unsubscribe()
    }
  }, [fazendaId])

  // Curral de saída: o lote é o que ocupa o curral hoje
  useEffect(() => {
    let cancelado = false
    const limpar = () => {
      setDetalhesLote(null)
      setForm((prev) => ({ ...prev, numeroLote: '', loteId: '', curralSaidaId: '', tempoOcupacao: '', categoriasQuantidades: {} }))
    }
    async function carregar() {
      if (!form.curralSaida || !fazendaId) return limpar()
      const curral = currais.find((c) => c.nome === form.curralSaida)
      if (!curral) return
      if (!curral.lote_id) {
        limpar()
        setErrors([{ field: 'curralSaida', message: 'Este curral está vazio (não possui lote). Selecione outro curral.' }])
        set('curralSaida')('')
        return
      }
      try {
        const lote = await getLoteByIdCached(fazendaId, curral.lote_id)
        if (cancelado) return
        if (!lote) {
          limpar()
          setErrors([{ field: 'curralSaida', message: 'Não foi possível carregar o lote deste curral (inativo ou sem dados no aparelho). Selecione outro curral.' }])
          set('curralSaida')('')
          return
        }
        if (!lote.sistema_producao || !SISTEMAS_COM_CURRAL.includes(lote.sistema_producao)) {
          limpar()
          setErrors([{ field: 'curralSaida', message: `O lote ${lote.nome} (${lote.sistema_producao || 'sem sistema de produção'}) não usa curral. Selecione outro curral.` }])
          set('curralSaida')('')
          return
        }
        const detalhes = await getLoteDetalhesComCategoriasCached(curral.lote_id)
        let tempo = 'Primeiro uso'
        try {
          const ocupacoes = ocupacaoVigentePorCurral(await getOcupacoesCurralNaDataCached(fazendaId, brToIso(todayBR())))
          const ocupacao = ocupacoes.find((o: any) => o.curral_id === curral.id)
          // Entrada no início do dia (Cuiabá = UTC-4)
          if (ocupacao?.data_inicial) tempo = calcularDiferencaTempo(`${ocupacao.data_inicial}T04:00:00Z`)
        } catch (e) {
          console.error('[PastagensCurralForm] Erro ao calcular tempo de ocupação:', e)
        }
        if (cancelado) return
        setDetalhesLote({
          ...(lote || {}),
          categorias: detalhes?.categorias,
          n_cabecas: detalhes?.quant_atual,
          categorias_raw: detalhes?.categorias_raw,
        })
        setErrors((prev) => prev.filter((e) => e.field !== 'curralSaida'))
        setForm((prev) => ({
          ...prev,
          numeroLote: lote?.nome || '',
          loteId: curral.lote_id as string,
          curralSaidaId: curral.id,
          tempoOcupacao: tempo,
          categoriasQuantidades: {},
        }))
      } catch (error) {
        console.error('[PastagensCurralForm] Erro ao carregar o lote do curral:', error)
        if (!cancelado) limpar()
      }
    }
    carregar()
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.curralSaida, fazendaId, currais])

  // Curral de entrada: precisa estar livre (1 lote por curral)
  useEffect(() => {
    let cancelado = false
    async function carregar() {
      if (!form.curralEntrada) {
        set('curralEntradaId')('')
        return
      }
      const curral = currais.find((c) => c.nome === form.curralEntrada)
      if (!curral) return
      if (curral.lote_id) {
        const lote = fazendaId ? await getLoteByIdCached(fazendaId, curral.lote_id).catch(() => null) : null
        if (cancelado) return
        setErrors([{ field: 'curralEntrada', message: `Este curral já possui o lote ${lote?.nome || ''}. Escolha um curral livre.`.replace('  ', ' ') }])
        set('curralEntrada')('')
        return
      }
      setErrors((prev) => prev.filter((e) => e.field !== 'curralEntrada'))
      set('curralEntradaId')(curral.id)
    }
    carregar()
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.curralEntrada, fazendaId, currais])

  const total = Object.values(form.categoriasQuantidades).reduce((acc, v) => acc + (Number(v) || 0), 0)
  const totalLote = detalhesLote?.n_cabecas || 0
  const diferenca = total - totalLote
  const mostrarDivergencia =
    form.gadoContado === 'Sim' && !!detalhesLote && Object.values(form.categoriasQuantidades).some((v) => v !== '')

  const validationRules: any = {
    data: { required: true },
    numeroLote: { required: true },
    curralSaida: { required: true },
    curralEntrada: { required: true },
    gadoContado: { required: true },
    escoreGado: { required: true },
    escoreFezes: { required: true },
    numeroPessoasManejo: { required: true },
  }
  if (form.gadoContado === 'Sim') {
    validationRules.categorias = {
      custom: () =>
        Object.values(form.categoriasQuantidades).some((v) => Number(v) > 0)
          ? null
          : 'Preencha pelo menos uma categoria de animais',
    }
    if (categoriasDoLote) {
      categoriasDoLote.forEach(({ nome, maxCabecas }) => {
        validationRules[`cat_${nome}`] = {
          custom: () => ((Number(form.categoriasQuantidades[nome]) || 0) > maxCabecas ? `Máximo: ${maxCabecas} cabeças` : null),
        }
      })
    }
  }
  if (form.numeroPessoasManejo && Number(form.numeroPessoasManejo) > 0) {
    validationRules.equipeNomes = {
      custom: () => {
        const numPessoas = Number(form.numeroPessoasManejo)
        const preenchidos = form.equipeNomes.filter((nome) => nome && nome.trim() !== '').length
        return preenchidos < numPessoas ? `Preencha o nome de todas as ${numPessoas} pessoas` : null
      },
    }
  }

  const { isValid } = useFormValidation(form, validationRules)

  const executarSalvamento = async () => {
    setErrors([])

    if (form.curralSaida && form.curralEntrada && form.curralSaida === form.curralEntrada) {
      setErrors([{ field: 'curralEntrada', message: 'O curral de entrada não pode ser igual ao curral de saída' }])
      return
    }

    let totalAnimais = 0
    let categoriasDetalhes: { nome: string; quant_atual: number; quant_informada: number }[] = []
    const camposFixos: Record<string, number> = {
      vaca: 0, touro: 0, bezerro: 0, boiGordo: 0, boiMagro: 0,
      garrote: 0, novilha: 0, tropa: 0, outros: 0,
    }
    if (form.gadoContado === 'Sim') {
      if (categoriasDoLote) {
        categoriasDetalhes = categoriasDoLote.map(({ nome, maxCabecas }) => ({
          nome,
          quant_atual: maxCabecas,
          quant_informada: Number(form.categoriasQuantidades[nome]) || 0,
        }))
        totalAnimais = categoriasDetalhes.reduce((acc, c) => acc + c.quant_informada, 0)
        for (const c of categoriasDetalhes) {
          const field = normalizeCategoriaToField(c.nome)
          if (field && field in camposFixos) camposFixos[field] += c.quant_informada
        }
      } else {
        totalAnimais = Object.values(form.categoriasQuantidades).reduce((acc, v) => acc + (Number(v) || 0), 0)
      }
    } else if (form.gadoContado === 'Não' && detalhesLote) {
      totalAnimais = detalhesLote.n_cabecas || 0
    }

    const result = await salvarRegistro('curral', {
      data: form.data,
      horarioManejo: getCurrentTimeInTimezone().slice(0, 5),
      manejador: usuario,
      usuario: usuario,
      numeroLote: form.numeroLote,
      loteId: form.loteId,
      curralSaida: form.curralSaida,
      curralSaidaId: form.curralSaidaId || null,
      tempoOcupacao: form.tempoOcupacao || null,
      curralEntrada: form.curralEntrada,
      curralEntradaId: form.curralEntradaId || null,
      gadoContado: form.gadoContado,
      totalAnimais,
      ...camposFixos,
      categorias_detalhes: categoriasDetalhes.length > 0 ? categoriasDetalhes : null,
      escoreGado: form.escoreGado ? Number(form.escoreGado) : 0,
      escoreFezes: form.escoreFezes || null,
      numeroPessoasManejo: form.numeroPessoasManejo ? Number(form.numeroPessoasManejo) : 0,
      equipe_nomes: form.equipeNomes || null,
    })

    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      resetarTudo()
      // O lote mudou de curral: atualiza a lista local para o próximo manejo
      if (fazendaId) getCurraisCached(fazendaId).then((l) => l && setCurrais(l.map((c: any) => ({ id: c.id, nome: c.nome, lote_id: c.lote_id ?? null })))).catch(() => {})
    }
  }

  const resetarTudo = () => {
    limparRascunho()
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

  const categoriasLoteStr = detalhesLote?.categorias
    ? processarCategorias(detalhesLote.categorias).map(capitalizarCategoria).join(', ')
    : ''

  const pendenciaTexto = (() => {
    if (!form.curralSaida) return 'Falta escolher o curral de saída'
    if (!form.curralEntrada) return 'Falta escolher o curral de entrada'
    if (!form.gadoContado) return 'Falta informar se o gado foi contado'
    if (form.gadoContado === 'Sim' && !Object.values(form.categoriasQuantidades).some((v) => Number(v) > 0)) return 'Falta informar a quantidade de animais'
    if (!form.escoreGado) return 'Falta o escore corporal'
    if (!form.escoreFezes) return 'Falta o escore de fezes'
    if (!form.numeroPessoasManejo) return 'Falta o número de pessoas no manejo'
    if (Number(form.numeroPessoasManejo) > 0 && form.equipeNomes.some((n) => !n || !n.trim())) return 'Falta o nome de todas as pessoas da equipe'
    return undefined
  })()

  const rotulo = 'text-[13px] font-bold uppercase text-gray-900'
  const nomesOcupados = currais.filter((c) => c.lote_id).map((c) => c.nome)
  const nomesLivres = currais.filter((c) => !c.lote_id).map((c) => c.nome)

  return (
    <>
      <CadernetaLayout
        title="MANEJO DE CURRAIS"
        cadernetaId="curral"
        dateContent={<DatePicker value={form.data} onChange={set('data')} variant="header" compact inline />}
      >
        {seletor}
        <BannerRascunho visible={rascunhoRestaurado} onConfirmar={confirmarRascunho} onDescartar={descartarRascunho} />
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* 1. Entrada e saída */}
        <CadernetaSection numero={1} titulo="Entrada e saída">
          <InfoStrip tone="neutral" icon="🕐">Horário do manejo: {horaAtual} (automático)</InfoStrip>

          <SearchableModal
            label={<span>CURRAL DE SAÍDA <span className="text-red-500">*</span></span>}
            value={form.curralSaida}
            onChange={set('curralSaida')}
            error={getError('curralSaida')}
            options={nomesOcupados.filter((n) => n !== form.curralEntrada)}
            placeholder={currais.length ? 'Buscar curral com lote...' : 'Carregando...'}
            id="curralSaida"
            name="curralSaida"
          />
          {form.curralSaidaId && (
            <InfoCard
              icon={Warehouse}
              title={form.curralSaida}
              subtitle={form.numeroLote ? `Lote ${form.numeroLote}` : 'Sem lote'}
              stats={[
                { label: 'Cabeças', value: detalhesLote?.n_cabecas != null ? String(detalhesLote.n_cabecas) : '-', span: 1 },
                { label: 'No curral há', value: form.tempoOcupacao || '-', span: 1 },
                ...(categoriasLoteStr ? [{ label: 'Categorias', value: categoriasLoteStr, span: 2 }] : []),
              ]}
            />
          )}

          <SearchableModal
            label={<span>CURRAL DE ENTRADA <span className="text-red-500">*</span></span>}
            value={form.curralEntrada}
            onChange={set('curralEntrada')}
            error={getError('curralEntrada')}
            options={nomesLivres.filter((n) => n !== form.curralSaida)}
            placeholder={currais.length ? 'Buscar curral livre...' : 'Carregando...'}
            id="curralEntrada"
            name="curralEntrada"
          />
          {form.curralEntradaId && (
            <InfoCard
              icon={Warehouse}
              title={form.curralEntrada}
              subtitle="Curral vazio, pronto para receber"
              stats={[]}
            />
          )}
          {currais.length > 0 && nomesLivres.length === 0 && (
            <InfoStrip tone="warning" icon="⚠️">Não há curral livre. Libere um curral antes de mover o lote.</InfoStrip>
          )}
        </CadernetaSection>

        {/* 2. Quantidade de animais */}
        <CadernetaSection numero={2} titulo="Quantidade de animais">
          <div>
            <label className="mb-2 block text-[15px] font-bold text-gray-900">
              O GADO FOI CONTADO? <span className="text-red-500">*</span>
            </label>
            <ChoiceGrid options={CONTADO_OPTIONS} value={form.gadoContado} onChange={set('gadoContado')} cols={2} dataField="gadoContado" />
            {getError('gadoContado') && <p className="mt-2 text-base font-semibold text-red-700">{getError('gadoContado')}</p>}
          </div>

          {form.gadoContado === 'Sim' && (
            <>
              {!form.curralSaida && <InfoStrip tone="warning" icon="⚠️">Escolha o curral de saída para ver as categorias do lote</InfoStrip>}
              {getError('categorias') && <p className="text-base font-semibold text-red-700">⚠️ {getError('categorias')}</p>}
              {(categoriasDoLote
                ? categoriasDoLote.map((c) => ({ chave: c.nome, nome: c.nome, cadastro: c.maxCabecas }))
                : [{ chave: CHAVE_TOTAL, nome: 'Total de cabeças', cadastro: totalLote }]
              ).map((cat) => (
                <div key={cat.chave} className="flex flex-col gap-2" data-field={`cat_${cat.chave}`}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[15px] font-bold capitalize text-gray-900">
                      {categoriasDoLote && categoriasDoLote.length === 1 ? 'Quantos passaram?' : cat.nome}
                    </span>
                    {detalhesLote && <span className="text-sm font-semibold text-gray-500">cadastro: {cat.cadastro} cab.</span>}
                  </div>
                  <StepperInput
                    value={form.categoriasQuantidades[cat.chave] ?? ''}
                    onChange={setCategoriaQtd(cat.chave)}
                    min={0}
                    max={categoriasDoLote ? cat.cadastro : undefined}
                    allowDecimals={false}
                    suffix="cabeças"
                    error={getError(`cat_${cat.chave}`)}
                  />
                </div>
              ))}
              {categoriasDoLote && categoriasDoLote.length > 1 && total > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <span className="text-sm font-bold text-gray-600">TOTAL CONTADO</span>
                  <span className="text-xl font-extrabold text-gray-900">{total} cabeças</span>
                </div>
              )}
              {mostrarDivergencia && (
                diferenca === 0 ? (
                  <InfoStrip tone="success" icon="✅">Bateu com o lote ({totalLote})</InfoStrip>
                ) : (
                  <InfoStrip tone="danger" icon="⚠️">
                    {diferenca < 0
                      ? `Faltam ${Math.abs(diferenca)} cabeças (cadastro: ${totalLote})`
                      : `Excedeu ${diferenca} cabeças (cadastro: ${totalLote})`}
                  </InfoStrip>
                )
              )}
            </>
          )}

          {form.gadoContado === 'Não' && detalhesLote && (
            <InfoStrip tone="neutral">Será registrado o cadastro do lote: {totalLote} cabeças manejadas</InfoStrip>
          )}
        </CadernetaSection>

        {/* 3. Avaliação do gado e equipe */}
        <CadernetaSection numero={3} titulo="Avaliação do gado e equipe">
          <div className="flex flex-col gap-2">
            <label className={rotulo}>Escore corporal <span className="text-red-500">*</span></label>
            <EscalaRotulada options={ESCORES_CORPORAIS} value={form.escoreGado} onChange={set('escoreGado')} dataField="escoreGado" />
            {getError('escoreGado') && <p className="text-base font-semibold text-red-700">{getError('escoreGado')}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className={rotulo}>Escore de fezes <span className="text-red-500">*</span></label>
            <EscalaRotulada options={ESCORES_FEZES} value={form.escoreFezes} onChange={set('escoreFezes')} dataField="escoreFezes" />
            {getError('escoreFezes') && <p className="text-base font-semibold text-red-700">{getError('escoreFezes')}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className={rotulo}>Nº pessoas no manejo <span className="text-red-500">*</span></label>
            <ChoiceGrid options={EQUIPE_OPTIONS} value={form.numeroPessoasManejo} onChange={handleEquipe} cols={6} size="sm" dataField="numeroPessoasManejo" />
            {getError('numeroPessoasManejo') && <p className="text-base font-semibold text-red-700">{getError('numeroPessoasManejo')}</p>}
          </div>

          {Number(form.numeroPessoasManejo) > 0 && (
            <div className="flex flex-col gap-3">
              {getError('equipeNomes') && <p className="text-sm font-semibold text-red-600">{getError('equipeNomes')}</p>}
              {Array.from({ length: Number(form.numeroPessoasManejo) }).map((_, index) => {
                const atualizar = (val: string) =>
                  setForm((prev) => {
                    const nomes = [...prev.equipeNomes]
                    nomes[index] = val
                    return { ...prev, equipeNomes: nomes }
                  })
                const label = <span>Nome da {index + 1}ª pessoa <span className="text-red-500">*</span></span>
                return funcionariosDisponiveis.length > 0 ? (
                  <SearchableModal
                    key={index}
                    label={label}
                    value={form.equipeNomes[index] || ''}
                    onChange={atualizar}
                    options={funcionariosDisponiveis}
                    placeholder="Buscar funcionário..."
                    id={`equipeNome-${index}`}
                    name={`equipeNome-${index}`}
                  />
                ) : (
                  <Input
                    key={index}
                    label={label}
                    placeholder="Nome"
                    value={form.equipeNomes[index] || ''}
                    onChange={(e) => atualizar(e.target.value)}
                  />
                )
              })}
            </div>
          )}
        </CadernetaSection>

        <FormFooter
          onSalvar={() => salvar(executarSalvamento)}
          onLimpar={resetarTudo}
          salvando={salvando}
          disabled={!isValid}
          formValido={isValid}
          pendenciaTexto={pendenciaTexto}
        />
      </CadernetaLayout>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Manejo de Currais"
        registro={registroSalvo}
        caderneta="curral"
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
    </>
  )
}

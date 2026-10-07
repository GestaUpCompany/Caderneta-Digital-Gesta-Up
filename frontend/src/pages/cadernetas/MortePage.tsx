import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, DatePicker, ValidationMessage, SearchableModal } from '../../components/ui'
import { Beef, X } from 'lucide-react'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import ChoiceGrid from '../../components/cadernetas/ChoiceGrid'
import InfoCard from '../../components/cadernetas/InfoCard'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import StepperInput from '../../components/cadernetas/StepperInput'
import FormFooter from '../../components/cadernetas/FormFooter'
import BannerRascunho from '../../components/BannerRascunho'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import {
  getLoteByNomeCached,
  getLoteDetalhesComCategoriasCached,
  getCausasMorteCached,
  getLotesAtivosCached,
} from '../../services/cadastroCache'
import { getFormulacoes } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { useFormValidation } from '../../hooks/useFormValidation'
import { usePhotoGps } from '../../hooks/usePhotoGps'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { base64ToDataUrl } from '../../utils/photoCompress'
import { capitalizarCategoria, getCategoriasPorDestino, normalizarCategoria, processarCategorias } from '../../utils/categorias'

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

// Ícone decorativo por categoria (a lista de categorias vem sempre do lote / do destino do lote)
function iconeCategoria(nome: string): string | undefined {
  const n = normalizarCategoria(nome)
  if (n.startsWith('vaca') || n.startsWith('novilha')) return '🐄'
  if (n.startsWith('touro') || n.startsWith('tourinho') || n.startsWith('boi') || n.startsWith('garrote')) return '🐂'
  if (n.startsWith('bezerr')) return '🐮'
  if (n.startsWith('tropa')) return '🐃'
  return undefined
}

// Diagnóstico em dois blocos visuais; a ordem relativa dos itens é a original.
const DIAGNOSTICOS = [
  { campo: 'secrecaoOrificios', label: 'ALGUMA SECREÇÃO NOS ORIFÍCIOS?', grupo: 'sinais' },
  { campo: 'sintomasPneumonia', label: 'SINTOMAS DE PNEUMONIA?', grupo: 'sinais' },
  { campo: 'inchaco', label: 'EXISTE ALGUM SANGRAMENTO?', grupo: 'sinais' },
  { campo: 'incoordenacaoTremores', label: 'INCOORDENAÇÃO / PEDALAGEM E TREMORES MUSCULARES DA MORTE?', grupo: 'sinais' },
  { campo: 'apatiaFraqueza', label: 'APATIA OU FRAQUEZA?', grupo: 'sinais' },
  { campo: 'desordensDigestivas', label: 'DESORDENS DIGESTIVAS / TIMPANISMO / DIARREIA?', grupo: 'sinais' },
  { campo: 'fraturas', label: 'ALGUMA FRATURA / DESLOCAMENTO DE MEMBROS?', grupo: 'sinais' },
  { campo: 'decomposicao', label: 'ANIMAL EM DECOMPOSIÇÃO / PUTREFAÇÃO?', grupo: 'sinais' },
  { campo: 'doencasPrevias', label: 'HAVIA DOENÇAS PRÉVIAS?', grupo: 'antes' },
  { campo: 'medicamentosRecentes', label: 'RECEBEU MEDICAMENTOS RECENTEMENTE?', grupo: 'antes' },
  { campo: 'morteSubita', label: 'A MORTE FOI SÚBITA?', grupo: 'antes' },
  { campo: 'animalSozinho', label: 'ANIMAL MORREU SOZINHO?', grupo: 'antes' },
  { campo: 'salivacaoExcessiva', label: 'SALIVAÇÃO EXCESSIVA?', grupo: 'sinais' },
  { campo: 'sinaisIntoxicacao', label: 'EXISTEM SINAIS DE INTOXICAÇÃO?', grupo: 'sinais' },
  { campo: 'carrapatosMoscas', label: 'PRESENÇA DE CARRAPATOS / MOSCAS?', grupo: 'sinais' },
  { campo: 'encontradoVivo', label: 'ANIMAL FOI ENCONTRADO VIVO?', grupo: 'antes' },
  { campo: 'medicado', label: 'ANIMAL CHEGOU A SER MEDICADO?', grupo: 'antes' },
  { campo: 'animalInchado', label: 'ANIMAL ESTAVA INCHADO?', grupo: 'sinais' },
  { campo: 'animalBicheira', label: 'ANIMAL COM BICHEIRA?', grupo: 'sinais' },
] as const

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
  const { usuario, fazendaId } = useSelector((state: RootState) => state.config)
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'morte', makeInitial })
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [lotesPastoMap, setLotesPastoMap] = useState<Record<string, string>>({})
  const [detalhesLote, setDetalhesLote] = useState<any>(null)
  const [causasMorte, setCausasMorte] = useState<{ value: string; label: string }[]>([])
  const [dietas, setDietas] = useState<{ value: string; label: string }[]>([])
  const [alvoVoz, setAlvoVoz] = useState<string | null>(null)
  const baseVozRef = useRef('')

  // Foto do animal: obrigatória, com GPS obrigatório (correção iOS inclusa no hook)
  const fotoAnimal = usePhotoGps({ gpsObrigatorio: true })
  // Fotos de apoio (brinco e cabeça): só imagem
  const fotoBrinco = usePhotoGps({ comGps: false })
  const fotoCabeca = usePhotoGps({ comGps: false })

  const { ouvindo: ouvindoVoz, erro: vozErro, toggle: toggleVoz, parar: pararVoz } = useVoiceInput()

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

  const setDiagnosticoObsTexto = (campo: string, texto: string) =>
    setForm((p) => ({
      ...p,
      diagnosticos: {
        ...p.diagnosticos,
        [campo]: { ...p.diagnosticos[campo], observacao: texto }
      }
    }))

  // Ditado: o texto parcial é acrescentado ao que já existia quando a gravação começou.
  // alvo: 'identificacao' ou o nome do campo de diagnóstico.
  const handleFalar = async (alvo: string) => {
    if (ouvindoVoz) {
      await pararVoz()
      if (alvoVoz === alvo) return
    }
    setAlvoVoz(alvo)
    baseVozRef.current = (alvo === 'identificacao'
      ? form.observacaoIdentificacao
      : form.diagnosticos[alvo]?.observacao || ''
    ).trim()
    await toggleVoz((parcial) => {
      const texto = baseVozRef.current ? `${baseVozRef.current} ${parcial}` : parcial
      if (alvo === 'identificacao') setForm((p) => ({ ...p, observacaoIdentificacao: texto }))
      else setDiagnosticoObsTexto(alvo, texto)
    })
  }
  const ouvindoAlvo = (alvo: string) => ouvindoVoz && alvoVoz === alvo

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Validation rules
  const validationRules: any = {
    data: { required: true },
    lote: { required: true },
    fotoAnimal: {
      custom: () => (!fotoAnimal.fotoBase64 ? 'Tire a foto do animal (com localização)' : null),
    },
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

  const resetarTudo = () => {
    limparRascunho()
    fotoAnimal.limpar()
    fotoBrinco.limpar()
    fotoCabeca.limpar()
    setErrors([])
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
      categoriaOutros: '',
      sexo: form.sexo,
      raca: racaFinal,
      idade: form.idade,
      pesoVivo: form.pesoVivo ? Number(form.pesoVivo) : null,
      causaMorte: causaMorteFinal,
      nutricaoAtual: form.nutricaoAtual || null,
      nutricaoAnterior: form.nutricaoAnterior || null,
      diagnosticos: form.diagnosticos,
      fotoBase64: fotoAnimal.fotoBase64 || null,
      fotoBrincoBase64: fotoBrinco.fotoBase64 || null,
      fotoCabecaBase64: fotoCabeca.fotoBase64 || null,
      latitude: fotoAnimal.latitude || null,
      longitude: fotoAnimal.longitude || null,
      gpsAccuracy: fotoAnimal.gpsAccuracy || null,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      const cabecasAntes = detalhesLote ? Number(detalhesLote.n_cabecas) || 0 : 0
      const cabecasApos = Math.max(0, cabecasAntes - 1)
      setRegistroSalvo({
        ...result.registro,
        n_cabecas_apos_obito: cabecasApos,
      })
      setShowSuccessModal(true)
      resetarTudo()
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

  // Categorias: as do lote (já variam conforme o destino do lote); sem categorias cadastradas,
  // usa a lista do destino do lote (mesma da Movimentação). "Outros" não é opção.
  const categoriasOpcoes: string[] = (() => {
    const nomesCats: string[] = (detalhesLote?.categorias_raw || []).map((c: any) => c.categoria).filter(Boolean)
    const base = nomesCats.length > 0
      ? nomesCats
      : (() => {
          const porDestino = getCategoriasPorDestino(detalhesLote?.destino)
          return porDestino.length > 0 ? porDestino : getCategoriasPorDestino('enfermaria')
        })()
    return base.filter((v) => v.toLowerCase() !== 'outros')
  })()

  const categoriasLoteStr = detalhesLote?.categorias
    ? processarCategorias(detalhesLote.categorias).map(capitalizarCategoria).join(', ')
    : ''

  const rotulo = 'text-[13px] font-bold uppercase text-gray-900'

  const diagnosticoRespondido = DIAGNOSTICOS.filter((d) => !!form.diagnosticos[d.campo]?.valor).length

  const pendenciaTexto = (() => {
    if (!form.lote) return 'Falta escolher o pasto/lote'
    if (!fotoAnimal.fotoBase64) return 'Falta a foto do animal'
    const semBrinco = !form.brinco.trim()
    const semChip = !form.chip.trim()
    if (semBrinco && semChip && !form.observacaoIdentificacao.trim()) return 'Falta o brinco/chip ou o motivo de não ter'
    if (!form.categoria) return 'Falta a categoria'
    if (!form.sexo) return 'Falta o sexo'
    if (!form.raca) return 'Falta a raça'
    if (form.raca === 'Outros' && !form.racaOutros.trim()) return 'Falta informar a raça'
    if (!form.idade) return 'Falta a idade'
    if (!form.causaMorte) return 'Falta a causa da morte'
    if (form.causaMorte === 'Outros' && !form.causaMorteOutros.trim()) return 'Falta especificar a causa'
    if (diagnosticoRespondido < DIAGNOSTICOS.length) return `Faltam ${DIAGNOSTICOS.length - diagnosticoRespondido} respostas em "O que você viu?"`
    return undefined
  })()

  /** Tile de foto (3 por linha). Preenchido: miniatura com ✓ e botão de remover; tocar refaz. */
  const tileFoto = (
    nome: string,
    h: ReturnType<typeof usePhotoGps>,
    onTirar: () => void,
    obrigatoria?: boolean,
    campo?: string
  ) => (
    <div className="flex flex-col gap-1" data-field={campo}>
      <div className="relative">
        <button
          type="button"
          onClick={onTirar}
          disabled={h.capturandoFoto || h.capturandoGps}
          className={`relative flex h-24 w-full items-center justify-center overflow-hidden rounded-xl border-2 transition-all active:scale-95 disabled:opacity-60 ${
            h.fotoBase64 ? 'border-green-500' : 'border-dashed border-gray-300 bg-white hover:border-gray-400'
          }`}
        >
          {h.fotoBase64 ? (
            <>
              <img src={base64ToDataUrl(h.fotoBase64)} alt={`Foto: ${nome}`} className="h-full w-full object-cover" />
              <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-sm font-black text-white">✓</span>
              <span className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5 text-center text-xs font-bold text-white">{nome}</span>
            </>
          ) : (
            <span className="flex flex-col items-center gap-1 text-sm font-bold text-gray-700">
              <span className="text-xl leading-none">📷</span>
              {h.capturandoFoto || h.capturandoGps ? '...' : nome}
              {obrigatoria && <span className="text-[10px] font-semibold text-red-500">obrigatória</span>}
            </span>
          )}
        </button>
        {h.fotoBase64 && (
          <button
            type="button"
            onClick={h.limpar}
            aria-label={`Remover foto ${nome}`}
            className="absolute right-1.5 top-1.5 flex !min-h-0 h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
          >
            <X className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
        )}
      </div>
      <input
        ref={h.fotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={h.handleFileInputChange}
        className="hidden"
      />
    </div>
  )

  const diagnosticoBloco = (grupo: 'sinais' | 'antes') =>
    DIAGNOSTICOS.filter((d) => d.grupo === grupo).map(({ campo, label }) => {
      const valor = form.diagnosticos[campo]?.valor
      const isInverted = INVERTED_DIAGNOSTICOS.includes(campo)
      const mostrarObs = isInverted ? valor === 'N' : valor === 'S'
      return (
        <div key={campo} className="flex flex-col gap-2">
          <label className="text-[14px] font-bold text-gray-900">
            {label} <span className="text-red-500">*</span>
          </label>
          <ChoiceGrid
            options={SN_OPTIONS}
            value={valor || ''}
            onChange={setDiagnosticoValor(campo)}
            cols={2}
            size="sm"
            dataField={campo}
          />
          {getError(campo) && <p className="text-base font-semibold text-red-700">{getError(campo)}</p>}
          {mostrarObs && (
            <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50/60 p-3">
              <button
                type="button"
                onClick={() => handleFalar(campo)}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-white transition-colors active:scale-[0.99] ${
                  ouvindoAlvo(campo) ? 'animate-pulse bg-red-600' : 'bg-gray-600 hover:bg-gray-700'
                }`}
              >
                <span className="text-lg leading-none">🎤</span>
                <span className="text-xs font-extrabold uppercase tracking-wide">{ouvindoAlvo(campo) ? 'Ouvindo...' : 'Falar'}</span>
              </button>
              {vozErro && alvoVoz === campo && <InfoStrip tone="danger">{vozErro}</InfoStrip>}
              <Input
                placeholder="Adicionar observação (opcional)"
                value={form.diagnosticos[campo]?.observacao || ''}
                onChange={(e) => setDiagnosticoObsTexto(campo, e.target.value)}
              />
            </div>
          )}
        </div>
      )
    })

  return (
    <>
      <CadernetaLayout
        title="MORTE"
        cadernetaId="morte"
        dateContent={<DatePicker value={form.data} onChange={(val) => setForm((p) => ({ ...p, data: val }))} variant="header" compact inline />}
      >
        <BannerRascunho visible={rascunhoRestaurado} onConfirmar={confirmarRascunho} onDescartar={descartarRascunho} />
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Pasto/Lote */}
        <CadernetaSection titulo="Pasto/Lote" required>
          {lotesDisponiveis.length > 0 ? (
            <SearchableModal
              label=""
              value={form.lote}
              onChange={(val) => setForm((p) => ({ ...p, lote: val }))}
              error={getError('lote')}
              options={lotesDisponiveis}
              secondaryText={(lote) => lotesPastoMap[lote] || ''}
              placeholder="Selecione o pasto/lote..."
              id="lote"
              name="lote"
            />
          ) : (
            <Input
              label="PASTO/LOTE"
              placeholder="Carregando..."
              value={form.lote}
              onChange={setInput('lote')}
              error={getError('lote')}
              disabled
              id="lote"
            />
          )}
          {detalhesLote && (
            <InfoCard
              icon={Beef}
              title={form.lote}
              subtitle={form.pasto || 'Sem pasto associado'}
              stats={[
                { label: 'Cabeças', value: detalhesLote.n_cabecas != null ? String(detalhesLote.n_cabecas) : '-', span: 1 },
                {
                  label: 'PV médio',
                  value: detalhesLote.peso_vivo_kg != null
                    ? `${Number(detalhesLote.peso_vivo_kg).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} kg`
                    : '-',
                  span: 1,
                },
                ...(categoriasLoteStr ? [{ label: 'Categorias', value: categoriasLoteStr, span: 2 }] : []),
              ]}
            />
          )}
        </CadernetaSection>

        {/* 1. Fotos do animal */}
        <CadernetaSection numero={1} titulo="Fotos do animal" required>
          <div className="grid grid-cols-3 gap-2">
            {tileFoto('Animal', fotoAnimal, () => fotoAnimal.capturarFotoComGps(), true, 'fotoAnimal')}
            {tileFoto('Brinco', fotoBrinco, () => fotoBrinco.capturarFoto())}
            {tileFoto('Cabeça', fotoCabeca, () => fotoCabeca.capturarFoto())}
          </div>
          {fotoAnimal.fotoBase64 && fotoAnimal.latitude != null && fotoAnimal.longitude != null ? (
            <InfoStrip tone="success" icon="📍">
              Local marcado pelo GPS da foto: {fotoAnimal.latitude.toFixed(5)}, {fotoAnimal.longitude.toFixed(5)}
              {fotoAnimal.gpsAccuracy ? ` (±${Math.round(fotoAnimal.gpsAccuracy)} m)` : ''}
            </InfoStrip>
          ) : (
            <InfoStrip tone="neutral" icon="📍">
              A foto do animal marca o local pelo GPS automaticamente. Brinco e cabeça são opcionais.
            </InfoStrip>
          )}
          {fotoAnimal.fotoErro && <InfoStrip tone="danger">{fotoAnimal.fotoErro}</InfoStrip>}
          {fotoBrinco.fotoErro && <InfoStrip tone="danger">{fotoBrinco.fotoErro}</InfoStrip>}
          {fotoCabeca.fotoErro && <InfoStrip tone="danger">{fotoCabeca.fotoErro}</InfoStrip>}
          {getError('fotoAnimal') && <p className="text-base font-semibold text-red-700">{getError('fotoAnimal')}</p>}
        </CadernetaSection>

        {/* 2. Identificação */}
        <CadernetaSection numero={2} titulo="Identificação">
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
          <p className="-mt-2 text-sm text-gray-500">
            Caso o animal tenha perdido ou não possua brinco ou chip, informe o motivo no campo abaixo
          </p>
          <div className="flex flex-col gap-2" data-field="observacaoIdentificacao">
            <Input
              label={<span>OBS. IDENTIFICAÇÃO {!form.brinco && !form.chip && <span className="text-red-500">*</span>}</span>}
              placeholder=""
              value={form.observacaoIdentificacao}
              onChange={setInput('observacaoIdentificacao')}
              error={getError('observacaoIdentificacao')}
            />
            <button
              type="button"
              onClick={() => handleFalar('identificacao')}
              className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-3 py-2 text-white transition-colors active:scale-[0.99] ${
                ouvindoAlvo('identificacao') ? 'animate-pulse bg-red-600' : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              <span className="text-lg leading-none">🎤</span>
              <span className="text-sm font-extrabold uppercase tracking-wide">
                {ouvindoAlvo('identificacao') ? 'Ouvindo...' : 'Gravar áudio'}
              </span>
            </button>
            {vozErro && alvoVoz === 'identificacao' && <InfoStrip tone="danger">{vozErro}</InfoStrip>}
          </div>

          <div className="flex flex-col gap-2" data-field="categoria">
            <label className={rotulo}>Categoria <span className="text-red-500">*</span></label>
            <ChoiceGrid
              options={categoriasOpcoes.map((c) => ({ value: c, label: capitalizarCategoria(c), icon: iconeCategoria(c) }))}
              value={form.categoria}
              onChange={(val) => setForm((p) => ({ ...p, categoria: val }))}
              cols={3}
              labelSize="xs"
            />
            {getError('categoria') && <p className="text-base font-semibold text-red-700">{getError('categoria')}</p>}
          </div>

          <div className="flex flex-col gap-2" data-field="sexo">
            <label className={rotulo}>Sexo <span className="text-red-500">*</span></label>
            <ChoiceGrid
              options={SEXO}
              value={form.sexo}
              onChange={(val) => setForm((p) => ({ ...p, sexo: val }))}
              cols={2}
            />
            {getError('sexo') && <p className="text-base font-semibold text-red-700">{getError('sexo')}</p>}
          </div>

          <div className="flex flex-col gap-2" data-field="raca">
            <label className={rotulo}>Raça <span className="text-red-500">*</span></label>
            <ChoiceGrid
              options={RACAS}
              value={form.raca}
              onChange={(val) => setForm((p) => ({ ...p, raca: val }))}
              cols={3}
              size="sm"
              labelSize="xs"
            />
            {getError('raca') && <p className="text-base font-semibold text-red-700">{getError('raca')}</p>}
          </div>
          {form.raca === 'Outros' && (
            <Input
              label={<span>QUAL RAÇA? <span className="text-red-500">*</span></span>}
              placeholder="Especifique a raça"
              value={form.racaOutros}
              onChange={setInput('racaOutros')}
              error={getError('racaOutros')}
            />
          )}

          <div className="flex flex-col gap-2" data-field="idade">
            <label className={rotulo}>Idade <span className="text-red-500">*</span></label>
            <ChoiceGrid
              options={IDADES}
              value={form.idade}
              onChange={(val) => setForm((p) => ({ ...p, idade: val }))}
              cols={2}
              size="sm"
              labelSize="xs"
            />
            {getError('idade') && <p className="text-base font-semibold text-red-700">{getError('idade')}</p>}
          </div>

          <div className="flex flex-col gap-2">
            <label className={rotulo}>Peso vivo (opcional)</label>
            <StepperInput
              value={form.pesoVivo}
              onChange={(val) => setForm((p) => ({ ...p, pesoVivo: val }))}
              min={0}
              step={10}
              allowDecimals={false}
              suffix="kg"
              error={getError('pesoVivo')}
            />
          </div>
        </CadernetaSection>

        {/* 3. O que você viu */}
        <CadernetaSection numero={3} titulo="O que você viu?" required>
          <div className="flex flex-col gap-5">
            <p className="text-sm font-extrabold uppercase text-gray-500">Sinais no animal</p>
            {diagnosticoBloco('sinais')}
          </div>
          <div className="flex flex-col gap-5">
            <p className="text-sm font-extrabold uppercase text-gray-500">Antes de morrer</p>
            {diagnosticoBloco('antes')}
          </div>
        </CadernetaSection>

        {/* 4. Causa e nutrição */}
        <CadernetaSection numero={4} titulo="Causa e nutrição">
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
        </CadernetaSection>

        <FormFooter
          onSalvar={handleSalvar}
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
        cadernetaName="Morte"
        registro={registroSalvo}
        caderneta="morte"
      />
    </>
  )
}

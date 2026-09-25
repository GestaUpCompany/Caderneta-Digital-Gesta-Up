import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import CadernetaLayout from '../../components/CadernetaLayout'
import { Input, Select, Button } from '../../components/ui'
import { salvarRegistro, aguardarSyncConcluido, listarRegistros } from '../../services/api'
import { enqueueRegistro } from '../../services/syncService'
import { todayBR } from '../../utils/formatDate'
import { normalizarNumero } from '../../utils/formatNumber'
import { generateId } from '../../utils/generateId'
import { RootState } from '../../store/store'
import { salvarRascunho, lerRascunho, limparRascunho, updateRegistro, deleteRegistro, removeFromSyncQueueByRegistroId } from '../../services/indexedDB'
import { getCachedCadastroData, getRacasCached, getLoteByNomeCached, getOrdensServicoAbertasCached, getLoteDetalhesComCategoriasCached } from '../../services/cadastroCache'
import { getLotes, getIndividuos } from '../../services/supabaseService'
import { Trash2, Pencil, CheckCircle2, AlertTriangle, Share2, ChevronDown, ChevronUp } from 'lucide-react'
import { formatarRegistroComoTexto, compartilharWhatsApp } from '../../utils/shareUtils'

type SN = '' | 'S' | 'N'
type Fase = 'preparacao' | 'captura' | 'revisao'

interface AnimalDraft {
  uid: string
  idChip: string
  idBrinco: string
  loteId: string
  lote: string
  categoria: string
  sexo: '' | 'Macho' | 'Fêmea'
  pesoKg: string
  raca: string
  idadeEra: string
  tempoPreenchimentoSeg: number | null
  individuoId: string | null
  /** id do registro local já gravado no store 'pesagem' (tentativa anterior de finalização) */
  registroId?: string | null
}

interface OrdemServicoItem {
  id: string
  numero_os: string | null
  tipo_venda: 'abate' | 'animal_vivo' | null
  quantidade_prevista: number | null
  sexo: string | null
  idade_era: string | null
  data_prevista_embarque: string | null
  data_prevista_abate: string | null
  comprador: string | null
  created_at: string | null
  /** true quando o registro só existe localmente (ainda não sincronizou) */
  pendenteSync?: boolean
}

interface SessaoPesagem {
  fase: Fase
  tipoManejo: string
  /** OS de venda vinculada (obrigatória para abate/venda_vivo) */
  osId: string | null
  osNumero: string | null
  osTipoVenda: 'abate' | 'animal_vivo' | null
  /** uuid da sessão: movimentações da OS exigem sessao_id (guarda de sessão única) */
  sessaoId: string
  equipeAjustada: SN
  balancaAferida: SN
  checklistConferido: SN
  curralLimpo: SN
  horarioInicio: string | null
  horarioFim: string | null
  /** ms acumulados em revisão (cronômetro pausado), descontados do total */
  tempoPausadoMs: number
  tempoTotalMin: number | null
  tempoMedioMinCab: number | null
  // Checklist de manejo da sessão, respondido uma vez na revisão (pós-processamento)
  acidente: SN
  manejoCalmo: SN
  gritaria: SN
  manejoAgil: SN
  animais: AnimalDraft[]
  animalAtual: AnimalDraft
  animalInicioTs: number | null
}

interface IndividuoCache {
  id: string
  id_manejo: string | null
  id_brinco: string | null
  id_chip: string | null
  sexo: string | null
  raca: string | null
  categoria: string | null
  status: string | null
  data_nascimento?: string | null
  lote_atual?: string | null
  idade_era?: string | null
}

interface LoteItem {
  id: string
  nome: string
  destino: string | null
}

const TIPOS_MANEJO: { value: string; label: string }[] = [
  { value: 'abate', label: 'Abate' },
  { value: 'compra', label: 'Compra' },
  { value: 'venda_vivo', label: 'Venda vivo' },
  { value: 'transf_saida', label: 'Transf. saída' },
  { value: 'transf_entrada', label: 'Transf. entrada' },
  { value: 'apartacao', label: 'Apartação' },
  { value: 'processamento', label: 'Processamento' },
]

const ERAS = [
  { value: '0-4m', label: '0–4 m' },
  { value: '5-12m', label: '5–12 m' },
  { value: '13-24m', label: '13–24 m' },
  { value: '25-36m', label: '25–36 m' },
  { value: '>36m', label: '> 36 m' },
]

// Mesmo filtro por destino do lote usado no Painel Web (Lotes.tsx),
// convertido para a capitalização aceita em individuos.categoria
function categoriasPorDestino(destino: string | null | undefined): string[] {
  const base = ['Bezerro ao Pé', 'Bezerra ao Pé', 'Bezerro', 'Bezerra', 'Garrote', 'Novilha']
  const d = (destino || '').toLowerCase().trim()
  if (d === 'reprodução' || d === 'reproducao') return [...base, 'Tourinho', 'Touro', 'Vaca', 'Tropa']
  if (d === 'corte' || d === 'abate') return [...base, 'Boi Magro', 'Boi Gordo', 'Vaca', 'Tropa']
  return [...base, 'Boi Magro', 'Boi Gordo', 'Tourinho', 'Touro', 'Vaca', 'Tropa']
}

const CATEGORIAS_FEMEA = new Set(['Bezerra ao Pé', 'Bezerra Desmama', 'Bezerra', 'Novilha', 'Primípara', 'Vaca', 'Vaca Parida', 'Vaca Prenha', 'Vaca Vazia', 'Vaca Descarte', 'Tropa'])
const CATEGORIAS_MACHO = new Set(['Bezerro ao Pé', 'Bezerro Desmama', 'Bezerro', 'Garrote', 'Boi Magro', 'Boi Gordo', 'Tourinho', 'Touro'])

// lote_categorias.categoria pode vir em minúsculo ('boi gordo'); comparação
// normalizada para não zerar a lista quando o usuário marca o sexo.
const CATEGORIAS_FEMEA_LOWER = new Set([...CATEGORIAS_FEMEA].map((c) => c.toLowerCase()))
const CATEGORIAS_MACHO_LOWER = new Set([...CATEGORIAS_MACHO].map((c) => c.toLowerCase()))

function categoriasCompativeis(categorias: string[], sexo: '' | 'Macho' | 'Fêmea'): string[] {
  const norm = (c: string) => c.toLowerCase().trim()
  if (sexo === 'Macho') return categorias.filter((c) => CATEGORIAS_MACHO_LOWER.has(norm(c)))
  if (sexo === 'Fêmea') return categorias.filter((c) => CATEGORIAS_FEMEA_LOWER.has(norm(c)))
  return categorias
}

function novoAnimal(): AnimalDraft {
  return {
    uid: generateId(),
    idChip: '',
    idBrinco: '',
    loteId: '',
    lote: '',
    categoria: '',
    sexo: '',
    pesoKg: '',
    raca: '',
    idadeEra: '',
    tempoPreenchimentoSeg: null,
    individuoId: null,
  }
}

function novaSessao(): SessaoPesagem {
  return {
    fase: 'preparacao',
    tipoManejo: '',
    osId: null,
    osNumero: null,
    osTipoVenda: null,
    sessaoId: crypto.randomUUID(),
    equipeAjustada: '',
    balancaAferida: '',
    checklistConferido: '',
    curralLimpo: '',
    horarioInicio: null,
    horarioFim: null,
    tempoPausadoMs: 0,
    tempoTotalMin: null,
    tempoMedioMinCab: null,
    acidente: '',
    manejoCalmo: '',
    gritaria: '',
    manejoAgil: '',
    animais: [],
    animalAtual: novoAnimal(),
    animalInicioTs: null,
  }
}

function formatCronometro(ms: number): string {
  if (ms < 0) ms = 0
  const totalMs = Math.floor(ms)
  const mili = totalMs % 1000
  const totalSeg = Math.floor(totalMs / 1000)
  const seg = totalSeg % 60
  const min = Math.floor(totalSeg / 60)
  if (min >= 60) {
    const h = Math.floor(min / 60)
    const m = min % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(seg).padStart(2, '0')}.${String(mili).padStart(3, '0')}`
  }
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}.${String(mili).padStart(3, '0')}`
}

function formatHora(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('pt-BR')
}

function formatMin(min: number | null): string {
  if (min === null || min === undefined) return '—'
  return `${min.toFixed(1).replace('.', ',')} min`
}

function SNButtons({ value, onChange, size = 'md' }: { value: SN; onChange: (v: SN) => void; size?: 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'min-h-[38px] text-base' : 'min-h-[38px] text-sm'
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onChange('S')}
        className={`${cls} rounded-xl font-bold border-2 transition-all active:scale-95 ${
          value === 'S' ? 'bg-green-700 border-green-700 text-white' : 'bg-white border-gray-300 text-gray-700'
        }`}
      >
        SIM
      </button>
      <button
        type="button"
        onClick={() => onChange('N')}
        className={`${cls} rounded-xl font-bold border-2 transition-all active:scale-95 ${
          value === 'N' ? 'bg-red-700 border-red-700 text-white' : 'bg-white border-gray-300 text-gray-700'
        }`}
      >
        NÃO
      </button>
    </div>
  )
}

export default function PesagemPage() {
  const navigate = useNavigate()
  const { fazendaId, usuario } = useSelector((state: RootState) => state.config)

  const [sessao, setSessao] = useState<SessaoPesagem>(novaSessao())
  const [sessaoCarregada, setSessaoCarregada] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [lotes, setLotes] = useState<LoteItem[]>([])
  const [racas, setRacas] = useState<string[]>([])
  const [individuos, setIndividuos] = useState<IndividuoCache[]>([])
  const [errosAnimal, setErrosAnimal] = useState<string[]>([])
  const [flashSalvo, setFlashSalvo] = useState(false)
  const [showRevisao, setShowRevisao] = useState(false)
  const [editandoUid, setEditandoUid] = useState<string | null>(null)
  const [excluindoUid, setExcluindoUid] = useState<string | null>(null)
  const [confirmSair, setConfirmSair] = useState(false)
  const [salvandoFinal, setSalvandoFinal] = useState(false)
  const [errosFinal, setErrosFinal] = useState<string[]>([])
  const [finalizado, setFinalizado] = useState<{ total: number; textoShare: string | null; syncErrors: number | null } | null>(null)
  const [metricasAbertas, setMetricasAbertas] = useState(false)
  const [checklistAberto, setChecklistAberto] = useState(false)
  const [osAbertas, setOsAbertas] = useState<OrdemServicoItem[]>([])
  // Categorias reais do lote (lote_categorias) para sessões com OS:
  // a pesagem de saída desconta do lote, então a categoria precisa existir
  // no lote (evita CATEGORIA_NOT_IN_LOTE no trigger do servidor).
  const [loteCategoriasOs, setLoteCategoriasOs] = useState<Record<string, string[]>>({})
  const autoFillRef = useRef<string | null>(null)

  const focarChip = () => {
    setTimeout(() => document.getElementById('pesagem-chip-input')?.focus(), 150)
  }

  const rascunhoKey = `pesagem-sessao-${fazendaId}`

  // Rascunho com debounce: digitar chip/brinco dispara updateAnimalAtual por
  // tecla, e serializar a sessão inteira a cada dígito é O(animais) por
  // keystroke. Escrita imediata (persistSessao) cancela o debounce pendente
  // para que um estado mais antigo não sobrescreva o novo.
  const rascunhoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingRascunho = useRef<SessaoPesagem | null>(null)
  const cancelRascunhoTimer = useCallback(() => {
    if (rascunhoTimer.current) {
      clearTimeout(rascunhoTimer.current)
      rascunhoTimer.current = null
    }
    pendingRascunho.current = null
  }, [])

  const persistSessao = useCallback(
    (next: SessaoPesagem) => {
      cancelRascunhoTimer()
      setSessao(next)
      salvarRascunho(rascunhoKey, next).catch((e) => console.error('[Pesagem] erro ao salvar rascunho:', e))
    },
    [rascunhoKey, cancelRascunhoTimer]
  )

  const updateAnimalAtual = useCallback(
    (patch: Partial<AnimalDraft>) => {
      setSessao((prev) => {
        const next = { ...prev, animalAtual: { ...prev.animalAtual, ...patch } }
        pendingRascunho.current = next
        if (rascunhoTimer.current) clearTimeout(rascunhoTimer.current)
        rascunhoTimer.current = setTimeout(() => {
          rascunhoTimer.current = null
          const toWrite = pendingRascunho.current
          pendingRascunho.current = null
          if (toWrite) salvarRascunho(rascunhoKey, toWrite).catch(() => {})
        }, 350)
        return next
      })
    },
    [rascunhoKey]
  )

  // Flush do rascunho pendente ao desmontar: sem isso os últimos ~350ms de
  // digitação se perderiam ao sair da página.
  useEffect(() => () => {
    if (rascunhoTimer.current) clearTimeout(rascunhoTimer.current)
    if (pendingRascunho.current) {
      salvarRascunho(rascunhoKey, pendingRascunho.current).catch(() => {})
      pendingRascunho.current = null
    }
  }, [rascunhoKey])

  // ==================== Restauração de sessão ====================
  useEffect(() => {
    if (!fazendaId) return
    lerRascunho<SessaoPesagem>(rascunhoKey)
      .then((draft) => {
        if (draft && draft.fase) {
          setSessao({ ...novaSessao(), ...draft })
        }
      })
      .catch(() => {})
      .finally(() => setSessaoCarregada(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fazendaId])

  // Em captura, colapsa as métricas por padrão para reduzir rolagem;
  // na revisão reabre, pois início/fim/total importam na conferência
  useEffect(() => {
    if (sessao.fase === 'captura') setMetricasAbertas(false)
    else if (sessao.fase === 'revisao') setMetricasAbertas(true)
  }, [sessao.fase])

  // ==================== Dados de apoio ====================
  useEffect(() => {
    if (!fazendaId) return
    let cancelled = false

    const load = async () => {
      // Lotes ativos (com destino para o filtro de categorias)
      let lotesData: any[] = []
      if (navigator.onLine) {
        try {
          lotesData = (await getLotes(fazendaId)) || []
        } catch {
          lotesData = []
        }
      }
      if (lotesData.length === 0) {
        const cache = await getCachedCadastroData()
        const nomes = cache?.lotes || []
        const detalhes = await Promise.all(nomes.map((nome: string) => getLoteByNomeCached(fazendaId, nome)))
        lotesData = detalhes.filter((l: any) => l && l.ativo !== false && !l.deleted_at)
      }
      if (cancelled) return
      setLotes(
        lotesData
          .filter((l: any) => l.id && l.nome)
          .map((l: any) => ({ id: l.id, nome: l.nome, destino: l.destino ?? null }))
          .sort((a: LoteItem, b: LoteItem) => a.nome.localeCompare(b.nome, 'pt-BR'))
      )

      // Raças ativas da fazenda
      try {
        const racasData = await getRacasCached(fazendaId)
        if (!cancelled) setRacas((racasData || []).map((r: any) => r.nome).filter(Boolean))
      } catch {
        /* offline sem cache */
      }

      // Indivíduos para autocomplete (cache primeiro, Supabase em background)
      const cache = await getCachedCadastroData()
      const cachedIndividuos = (cache?.individuos || []) as IndividuoCache[]
      if (!cancelled && cachedIndividuos.length > 0) setIndividuos(cachedIndividuos)
      if (navigator.onLine) {
        try {
          const online = await getIndividuos(fazendaId, 2000)
          if (!cancelled && online && online.length > 0) setIndividuos(online as IndividuoCache[])
        } catch {
          /* mantém cache */
        }
      }

      // OS de venda abertas: cache lazy (funciona offline) + OS locais ainda
      // não sincronizadas (comunicado criado offline pode ser pesado offline).
      try {
        const [remotas, locais, pesagens] = await Promise.all([
          getOrdensServicoAbertasCached(fazendaId, 'venda'),
          listarRegistros('ordens-servico'),
          listarRegistros('pesagem'),
        ])
        // Guarda de sessão única no cliente: OS que já tem pesagem gravada
        // neste dispositivo não pode receber segundo embarque. O servidor
        // também rejeita (trigger) para o caso multi-dispositivo.
        const osJaPesadas = new Set(
          pesagens.map((p) => p.osId as string | undefined).filter(Boolean)
        )
        const mapa = new Map<string, OrdemServicoItem>()
        ;(remotas || []).forEach((o: any) => mapa.set(o.id, o))
        locais
          .filter((r) => r.tipo === 'venda' && !['fechada', 'cancelada'].includes((r.statusOs as string) || 'aberta'))
          .forEach((r) => {
            const id = (r.supabaseId as string) || r.id
            mapa.set(id, {
              id,
              numero_os: (r.numeroOs as string) || null,
              tipo_venda: (r.tipoVenda as 'abate' | 'animal_vivo') || null,
              quantidade_prevista: r.quantidadePrevista ? Number(r.quantidadePrevista) : null,
              sexo: (r.sexo as string) || null,
              idade_era: (r.idadeEra as string) || null,
              data_prevista_embarque: (r.dataPrevistaEmbarque as string) || null,
              data_prevista_abate: (r.dataPrevistaAbate as string) || null,
              comprador: (r.comprador as string) || null,
              created_at: (r.lastModified as string) || null,
              pendenteSync: r.syncStatus !== 'synced',
            })
          })
        if (!cancelled) {
          setOsAbertas(
            [...mapa.values()]
              .filter((o) => !osJaPesadas.has(o.id))
              .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
          )
        }
      } catch {
        /* offline sem cache: lista vazia */
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [fazendaId])

  // ==================== Cronômetro ====================
  const sessaoAtiva = sessao.fase === 'captura' && !sessao.horarioFim
  useEffect(() => {
    if (!sessaoAtiva) return
    const interval = setInterval(() => setNow(Date.now()), 47)
    return () => clearInterval(interval)
  }, [sessaoAtiva])

  // ==================== Guards de saída ====================
  // A sessão inteira é persistida em rascunho, então sair não perde dados;
  // ainda assim avisamos e seguramos a navegação por engano.
  useEffect(() => {
    if (!sessaoAtiva) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [sessaoAtiva])

  useEffect(() => {
    if (!sessaoAtiva) return
    window.history.pushState({ pesagemSessao: true }, '')
    const onPop = () => {
      window.history.pushState({ pesagemSessao: true }, '')
      setConfirmSair(true)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [sessaoAtiva])

  const handleBack = useCallback(() => {
    if (sessaoAtiva) {
      setConfirmSair(true)
    } else {
      navigate(-1)
    }
  }, [sessaoAtiva, navigate])

  // ==================== Métricas ====================
  const inicioTs = sessao.horarioInicio ? new Date(sessao.horarioInicio).getTime() : null
  const fimTs = sessao.horarioFim ? new Date(sessao.horarioFim).getTime() : null
  const elapsedMs = inicioTs !== null ? Math.max(0, (fimTs ?? now) - inicioTs - sessao.tempoPausadoMs) : 0
  const tempoTotalMin = inicioTs !== null ? elapsedMs / 60000 : null
  const tempoMedioMinCab = useMemo(() => {
    if (sessao.animais.length === 0) return null
    const soma = sessao.animais.reduce((acc, a) => acc + (a.tempoPreenchimentoSeg || 0), 0)
    return soma / sessao.animais.length / 60
  }, [sessao.animais])

  const checklistFinalCompleto =
    sessao.acidente !== '' && sessao.manejoCalmo !== '' && sessao.gritaria !== '' && sessao.manejoAgil !== ''

  const carregarCategoriasLoteOs = useCallback(
    async (loteId: string) => {
      if (!loteId || loteCategoriasOs[loteId]) return
      try {
        const detalhes = await getLoteDetalhesComCategoriasCached(loteId)
        const cats = (detalhes?.categorias_raw || [])
          .map((c: any) => c.categoria)
          .filter(Boolean)
        setLoteCategoriasOs((prev) => ({ ...prev, [loteId]: cats }))
      } catch {
        /* mantém fallback por destino */
      }
    },
    [loteCategoriasOs]
  )

  // ==================== Autocomplete chip/brinco ====================
  const sugestoes = useMemo(() => {
    const chip = sessao.animalAtual.idChip.trim()
    const brinco = sessao.animalAtual.idBrinco.trim()
    if (!chip && !brinco) return []
    return individuos
      .filter(
        (i) =>
          (chip && i.id_chip && i.id_chip.startsWith(chip)) ||
          (brinco && i.id_brinco && i.id_brinco.startsWith(brinco))
      )
      .slice(0, 5)
  }, [individuos, sessao.animalAtual.idChip, sessao.animalAtual.idBrinco])

  const aplicarIndividuo = useCallback(
    (ind: IndividuoCache) => {
      const loteMatch = ind.lote_atual ? lotes.find((l) => l.id === ind.lote_atual) : undefined
      autoFillRef.current = ind.id
      if (sessao.osId && loteMatch?.id) carregarCategoriasLoteOs(loteMatch.id)
      updateAnimalAtual({
        idChip: ind.id_chip || '',
        idBrinco: ind.id_brinco || '',
        sexo: ind.sexo === 'Macho' || ind.sexo === 'Fêmea' ? ind.sexo : '',
        raca: ind.raca || '',
        categoria: ind.categoria || '',
        loteId: loteMatch?.id || '',
        lote: loteMatch?.nome || '',
        idadeEra: ind.idade_era || '',
        individuoId: ind.id,
      })
      setErrosAnimal([])
    },
    [lotes, updateAnimalAtual, sessao.osId, carregarCategoriasLoteOs]
  )

  const handleIdChange = useCallback(
    (field: 'idChip' | 'idBrinco', value: string) => {
      const digits = value.replace(/\D/g, '')
      updateAnimalAtual({ [field]: digits })

      // Reavalia o match: se havia animal aplicado e o prefixo quebrou, limpa os campos preenchidos
      const merged = { ...sessao.animalAtual, [field]: digits }
      const chip = merged.idChip.trim()
      const brinco = merged.idBrinco.trim()
      const matches = individuos.filter(
        (i) =>
          (chip && i.id_chip && i.id_chip.startsWith(chip)) ||
          (brinco && i.id_brinco && i.id_brinco.startsWith(brinco))
      )
      const unico = matches.length === 1 ? matches[0] : null

      if (autoFillRef.current && (!unico || unico.id !== autoFillRef.current)) {
        autoFillRef.current = null
        updateAnimalAtual({
          sexo: '',
          raca: '',
          categoria: '',
          loteId: '',
          lote: '',
          idadeEra: '',
          individuoId: null,
        })
      } else if (unico && (chip.length >= 2 || brinco.length >= 2) && autoFillRef.current !== unico.id) {
        aplicarIndividuo(unico)
      }
    },
    [individuos, sessao.animalAtual, updateAnimalAtual, aplicarIndividuo]
  )

  // ==================== Opções do form ====================

  const TIPOS_MANEJO_VENDA = ['abate', 'venda_vivo'] as const
  const tipoManejoEhVenda = (TIPOS_MANEJO_VENDA as readonly string[]).includes(sessao.tipoManejo)

  // OS elegíveis para o tipo de manejo atual: 'abate'->tipo_venda 'abate',
  // 'venda_vivo'->tipo_venda 'animal_vivo'. Sem tipo selecionado, lista todas.
  const osDisponiveis = osAbertas.filter((o) =>
    !tipoManejoEhVenda
      ? true
      : o.tipo_venda === (sessao.tipoManejo === 'abate' ? 'abate' : 'animal_vivo')
  )

  const handleSelecionarOs = (osIdSelecionada: string) => {
    const os = osAbertas.find((o) => o.id === osIdSelecionada)
    if (!os) {
      persistSessao({ ...sessao, osId: null, osNumero: null, osTipoVenda: null })
      return
    }
    // A OS define o tipo de manejo: abate -> 'abate', animal vivo -> 'venda_vivo'
    persistSessao({
      ...sessao,
      osId: os.id,
      osNumero: os.numero_os,
      osTipoVenda: os.tipo_venda,
      tipoManejo: os.tipo_venda === 'abate' ? 'abate' : 'venda_vivo',
    })
  }

  const handleSelecionarTipoManejo = (tipo: string) => {
    const ehVenda = (TIPOS_MANEJO_VENDA as readonly string[]).includes(tipo)
    const tipoVendaEsperado = tipo === 'abate' ? 'abate' : 'animal_vivo'
    persistSessao({
      ...sessao,
      tipoManejo: tipo,
      // Desvincula a OS quando o tipo não é venda ou diverge do tipo da OS
      ...(!ehVenda || (sessao.osTipoVenda && sessao.osTipoVenda !== tipoVendaEsperado)
        ? { osId: null, osNumero: null, osTipoVenda: null }
        : {}),
    })
  }

  const preparacaoCompleta =
    sessao.tipoManejo !== '' &&
    (!tipoManejoEhVenda || !!sessao.osId) &&
    sessao.equipeAjustada !== '' &&
    sessao.balancaAferida !== '' &&
    sessao.checklistConferido !== '' &&
    sessao.curralLimpo !== ''

  // ==================== Ações ====================
  const iniciarSessao = () => {
    if (!preparacaoCompleta) return
    const inicio = new Date().toISOString()
    persistSessao({
      ...sessao,
      fase: 'captura',
      horarioInicio: inicio,
      animalInicioTs: Date.now(),
      animalAtual: novoAnimal(),
    })
    autoFillRef.current = null
    focarChip()
  }

  const validarAnimal = (a: AnimalDraft): string[] => {
    const errs: string[] = []
    if (!a.idChip.trim() && !a.idBrinco.trim()) errs.push('Informe o Chip ou o Brinco')
    if (!a.lote) errs.push('Selecione o Lote')
    if (!a.categoria) errs.push('Selecione a Categoria')
    if (!a.sexo) errs.push('Selecione o Sexo')
    const peso = normalizarNumero(a.pesoKg)
    if (peso === null || peso <= 0) errs.push('Informe o Peso (kg)')
    if (!a.raca) errs.push('Selecione a Raça')
    if (!a.idadeEra) errs.push('Selecione a Idade (era)')
    return errs
  }

  const salvarEAproveitar = () => {
    const a = sessao.animalAtual
    const errs = validarAnimal(a)
    if (errs.length > 0) {
      setErrosAnimal(errs)
      return
    }
    const tempoSeg = sessao.animalInicioTs ? Math.max(0, (Date.now() - sessao.animalInicioTs) / 1000) : null
    const salvo: AnimalDraft = { ...a, tempoPreenchimentoSeg: tempoSeg }
    persistSessao({
      ...sessao,
      animais: [...sessao.animais, salvo],
      animalAtual: novoAnimal(),
      animalInicioTs: Date.now(),
    })
    autoFillRef.current = null
    setErrosAnimal([])
    setFlashSalvo(true)
    setTimeout(() => setFlashSalvo(false), 1800)
    focarChip()
  }

  const finalizarSessao = () => {
    if (sessao.animais.length === 0) return
    const fim = new Date().toISOString()
    const totalMin = inicioTs !== null ? (Date.now() - inicioTs - sessao.tempoPausadoMs) / 60000 : null
    persistSessao({
      ...sessao,
      fase: 'revisao',
      horarioFim: fim,
      tempoTotalMin: totalMin,
      tempoMedioMinCab: tempoMedioMinCab,
    })
    setShowRevisao(true)
  }

  const updateAnimalRevisao = (uid: string, patch: Partial<AnimalDraft>) => {
    persistSessao({
      ...sessao,
      animais: sessao.animais.map((a) => (a.uid === uid ? { ...a, ...patch } : a)),
    })
  }

  const excluirAnimal = (uid: string) => {
    const alvo = sessao.animais.find((a) => a.uid === uid)
    persistSessao({ ...sessao, animais: sessao.animais.filter((a) => a.uid !== uid) })
    setExcluindoUid(null)
    // Se o animal já tinha sido gravado no store (finalização com falha parcial),
    // remove o registro local e o item da fila para não subir ao Supabase.
    if (alvo?.registroId) {
      removeFromSyncQueueByRegistroId(alvo.registroId).catch(() => {})
      deleteRegistro('pesagem', alvo.registroId).catch(() => {})
    }
  }

  const salvarEFinalizar = async () => {
    if (!fazendaId) return
    setSalvandoFinal(true)
    setErrosFinal([])
    // Data da sessão no fuso do aparelho (não UTC): sessões após 20h em Cuiabá
    // cairiam no dia seguinte se extraíssemos a parte de data do ISO.
    const dataSessao = sessao.horarioInicio
      ? new Date(sessao.horarioInicio).toLocaleDateString('pt-BR')
      : todayBR()
    // horarioManejo faz salvarRegistro compor 'data' com a hora de INÍCIO da
    // sessão em vez da hora da finalização — 'data' fica sendo o timestamp do
    // manejo, coerente com as outras cadernetas.
    const inicioHM = (() => {
      if (!sessao.horarioInicio) return ''
      const d = new Date(sessao.horarioInicio)
      return isNaN(d.getTime())
        ? ''
        : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    })()

    // Animais são registros independentes: grava em paralelo para não pagar
    // o sleep de 100ms de salvarRegistro por cabeça.
    const results = await Promise.all(sessao.animais.map(async (a, idx) => {
      // Campos compartilhados + do animal; 'data' é montada por salvarRegistro
      // (DD/MM/AAAA HH:MM) e por isso fica fora do payload de update.
      const payload = {
        data: dataSessao,
        horarioManejo: inicioHM,
        responsavel: usuario,
        usuario,
        tipoManejo: sessao.tipoManejo,
        equipeAjustada: sessao.equipeAjustada,
        balancaAferida: sessao.balancaAferida,
        checklistConferido: sessao.checklistConferido,
        curralLimpo: sessao.curralLimpo,
        horarioInicio: sessao.horarioInicio,
        horarioFim: sessao.horarioFim,
        tempoTotalMin: sessao.tempoTotalMin,
        tempoMedioMinCab: sessao.tempoMedioMinCab,
        idChip: a.idChip,
        idBrinco: a.idBrinco,
        lote: a.lote,
        loteId: a.loteId || null,
        categoria: a.categoria,
        sexo: a.sexo,
        pesoKg: a.pesoKg,
        raca: a.raca,
        idadeEra: a.idadeEra,
        idadeDias: null,
        acidente: sessao.acidente,
        manejoCalmo: sessao.manejoCalmo,
        gritaria: sessao.gritaria,
        manejoAgil: sessao.manejoAgil,
        tempoPreenchimentoSeg: a.tempoPreenchimentoSeg,
        individuoId: a.individuoId,
        osId: sessao.osId,
        numeroOs: sessao.osNumero,
      }

      if (a.registroId) {
        // Já gravado numa tentativa anterior: reaplica os campos (cobre edições
        // feitas na revisão após a falha) e reenfileira. O sync faz upsert por
        // local_id, então reenviar 'create' é idempotente e não duplica.
        try {
          const { data: _omit, ...payloadUpdate } = payload
          await updateRegistro('pesagem', a.registroId, { ...payloadUpdate, syncStatus: 'pending' })
          await removeFromSyncQueueByRegistroId(a.registroId)
          await enqueueRegistro('pesagem', a.registroId, 'create')
          return { registroId: a.registroId as string | null, error: null as string | null }
        } catch {
          return { registroId: null as string | null, error: `Animal ${idx + 1}: erro ao atualizar registro local` }
        }
      }

      const result = await salvarRegistro('pesagem', payload)
      if (!result.success) {
        const msgs = (result.errors || []).map((e) => e.message).join('; ')
        return { registroId: null as string | null, error: `Animal ${idx + 1}: ${msgs}` }
      }
      return { registroId: result.id || null, error: null as string | null }
    }))

    const falhas = results.map((r) => r.error).filter((e): e is string => Boolean(e))
    const animaisAtualizados = sessao.animais.map((a, idx) =>
      results[idx].registroId ? { ...a, registroId: results[idx].registroId } : a
    )

    // Persiste os registroId atribuídos: numa nova tentativa de finalização,
    // animais já gravados são atualizados em vez de duplicados.
    if (falhas.length > 0) {
      persistSessao({ ...sessao, animais: animaisAtualizados })
    }

    // Sessão com OS: gera as movimentações de saída (Saída/Venda) agrupadas
    // por lote+categoria. É isso que desconta as cabeças no servidor via
    // trigger — a pesagem em si não movimenta lote.
    const movimentacaoIds: string[] = []
    if (sessao.osId && falhas.length === 0) {
      const grupos = new Map<string, { lote: string; loteId: string | null; categoria: string; cabecas: number; pesoTotal: number; pesoCount: number }>()
      for (const a of sessao.animais) {
        const key = `${a.loteId || a.lote}|${a.categoria}`
        const g = grupos.get(key) || {
          lote: a.lote,
          loteId: a.loteId || null,
          categoria: a.categoria,
          cabecas: 0,
          pesoTotal: 0,
          pesoCount: 0,
        }
        g.cabecas += 1
        const peso = normalizarNumero(a.pesoKg)
        if (peso !== null && peso > 0) {
          g.pesoTotal += peso
          g.pesoCount += 1
        }
        grupos.set(key, g)
      }

      for (const g of grupos.values()) {
        const result = await salvarRegistro('movimentacao', {
          data: dataSessao,
          horarioManejo: inicioHM,
          responsavel: usuario,
          usuario,
          loteOrigem: g.lote,
          loteOrigemId: g.loteId,
          loteDestino: 'Venda',
          loteDestinoId: null,
          numeroCabecas: g.cabecas,
          categoria: g.categoria,
          motivoMovimentacao: 'Saída',
          subtipo: 'Venda',
          pesoVivoAtualKg: g.pesoCount > 0 ? g.pesoTotal / g.pesoCount : null,
          observacao: `Embarque ${sessao.osNumero || 'OS'}`,
          osId: sessao.osId,
          sessaoId: sessao.sessaoId,
        })
        if (result.success && result.registro) {
          movimentacaoIds.push(result.registro.id)
        } else {
          const msgs = (result.errors || []).map((e) => e.message).join('; ')
          falhas.push(`Saída ${g.lote}/${g.categoria}: ${msgs || 'erro ao salvar movimentação'}`)
        }
      }
    }

    setSalvandoFinal(false)
    if (falhas.length > 0) {
      persistSessao({ ...sessao, animais: animaisAtualizados })
      setErrosFinal(falhas)
      return
    }

    // Cancela o debounce antes de limpar: um write pendente disparando após
    // limparRascunho ressuscitaria o rascunho da sessão recém-finalizada.
    cancelRascunhoTimer()
    await limparRascunho(rascunhoKey).catch(() => {})

    // Gera o texto compartilhável agora: sessao é resetada logo abaixo e o
    // modal de sucesso não teria mais os dados para montar o resumo.
    const registrosShare = sessao.animais.map((a) => ({
      id: a.registroId || a.uid,
      data: dataSessao,
      responsavel: usuario,
      tipoManejo: sessao.tipoManejo,
      equipeAjustada: sessao.equipeAjustada,
      balancaAferida: sessao.balancaAferida,
      checklistConferido: sessao.checklistConferido,
      curralLimpo: sessao.curralLimpo,
      horarioInicio: sessao.horarioInicio,
      horarioFim: sessao.horarioFim,
      tempoTotalMin: sessao.tempoTotalMin,
      tempoMedioMinCab: sessao.tempoMedioMinCab,
      idChip: a.idChip,
      idBrinco: a.idBrinco,
      lote: a.lote,
      categoria: a.categoria,
      sexo: a.sexo,
      pesoKg: a.pesoKg,
      raca: a.raca,
      idadeEra: a.idadeEra,
      acidente: sessao.acidente,
      manejoCalmo: sessao.manejoCalmo,
      gritaria: sessao.gritaria,
      manejoAgil: sessao.manejoAgil,
      numeroOs: sessao.osNumero,
    }))
    const textoShare = registrosShare.length > 0
      ? formatarRegistroComoTexto(registrosShare[0] as any, 'pesagem', registrosShare as any)
      : null

    setShowRevisao(false)
    setFinalizado({ total: sessao.animais.length, textoShare, syncErrors: null })
    setSessao(novaSessao())

    // Observa o sync dos registros recém-gravados: falhas aparecem no modal
    // de sucesso em vez de só na tela de lista. Timeout de 30s por registro;
    // offline sai cedo e a lista continua sendo a fonte de verdade.
    const syncIds = results.map((r) => r.registroId).filter((x): x is string => Boolean(x))
    const syncWatch = [
      ...syncIds.map((id) => aguardarSyncConcluido('pesagem', id)),
      ...movimentacaoIds.map((id) => aguardarSyncConcluido('movimentacao', id)),
    ]
    if (navigator.onLine && syncWatch.length) {
      Promise.all(syncWatch)
        .then((statuses) => {
          const errs = statuses.filter((s) => s === 'error').length
          if (errs > 0) setFinalizado((f) => (f ? { ...f, syncErrors: errs } : f))
        })
        .catch(() => {})
    }
  }

  const encerrarTela = () => {
    setFinalizado(null)
    navigate('/caderneta/pesagem/lista')
  }

  if (!sessaoCarregada) return null

  // ==================== Bloco de campos do animal (usado na captura e na revisão) ====================
  const renderAnimalFields = (
    animal: AnimalDraft,
    onChange: (patch: Partial<AnimalDraft>) => void,
    opts: { showSugestoes?: boolean; compact?: boolean } = {}
  ) => {
    const loteSel = lotes.find((l) => l.id === animal.loteId) || null
    // Sessão com OS: categorias vêm das lote_categorias reais do lote (o desconto
    // no servidor exige que a categoria exista no lote). Fallback: heurística por destino.
    const catsBase =
      sessao.osId && animal.loteId && loteCategoriasOs[animal.loteId]
        ? loteCategoriasOs[animal.loteId]
        : categoriasPorDestino(loteSel?.destino)
    const cats = categoriasCompativeis(catsBase, animal.sexo)
    return (
      <div className="flex flex-col gap-4 [&_input:not(#pesagem-peso-input)]:!min-h-[38px] [&_input:not(#pesagem-peso-input)]:!py-1.5 [&_input:not(#pesagem-peso-input)]:!text-sm [&_select]:!min-h-[38px] [&_select]:!py-1 [&_select]:!text-sm [&_select:disabled]:!bg-gray-50 [&_select:disabled]:!text-gray-500 [&_label]:!text-xs [&_label]:!mb-1 [&_label]:!text-center">
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <Input
              id={opts.showSugestoes ? 'pesagem-chip-input' : undefined}
              label="CHIP"
              inputMode="numeric"
              placeholder="Nº do chip"
              value={animal.idChip}
              onChange={(e) => opts.showSugestoes ? handleIdChange('idChip', e.target.value) : onChange({ idChip: e.target.value.replace(/\D/g, ''), individuoId: null })}
            />
          </div>
          <Input
            label="BRINCO"
            inputMode="numeric"
            placeholder="Nº do brinco"
            value={animal.idBrinco}
            onChange={(e) => opts.showSugestoes ? handleIdChange('idBrinco', e.target.value) : onChange({ idBrinco: e.target.value.replace(/\D/g, ''), individuoId: null })}
          />
        </div>

        {opts.showSugestoes && sugestoes.length > 0 && !animal.individuoId && (
          <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 -mt-2">
            {sugestoes.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => aplicarIndividuo(i)}
                className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 active:bg-gray-50"
              >
                <span className="text-base font-bold text-gray-900">
                  {[i.id_brinco && `Brinco ${i.id_brinco}`, i.id_chip && `Chip ${i.id_chip}`].filter(Boolean).join(' · ')}
                </span>
                <span className="text-sm text-gray-500 shrink-0">
                  {[i.sexo === 'Macho' ? 'M' : i.sexo === 'Fêmea' ? 'F' : '', i.categoria].filter(Boolean).join(' · ')}
                </span>
              </button>
            ))}
          </div>
        )}

        {opts.showSugestoes && animal.individuoId && (
          <p className="text-sm font-semibold text-green-700 -mt-2">✓ Animal identificado na base. Dados preenchidos, ajuste se necessário.</p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="LOTE"
            options={[{ value: '', label: 'Selecione' }, ...lotes.map((l) => ({ value: l.id, label: l.nome }))]}
            value={animal.loteId}
            onChange={(e) => {
              const lote = lotes.find((l) => l.id === e.target.value) || null
              onChange({ loteId: lote?.id || '', lote: lote?.nome || '', categoria: '' })
              if (sessao.osId && lote?.id) carregarCategoriasLoteOs(lote.id)
            }}
          />
          <Select
            label="CATEGORIA"
            disabled={!animal.loteId}
            options={
              animal.loteId
                ? [{ value: '', label: 'Selecione' }, ...cats.map((c) => ({ value: c, label: c }))]
                : [{ value: '', label: 'Escolha o lote' }]
            }
            value={animal.categoria}
            onChange={(e) => onChange({ categoria: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-lg font-bold text-gray-900 mb-2">SEXO</label>
            <div className="grid grid-cols-2 gap-2">
              {(['Macho', 'Fêmea'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    const patch: Partial<AnimalDraft> = { sexo: s }
                    if (animal.categoria && !categoriasCompativeis([animal.categoria], s).length) patch.categoria = ''
                    onChange(patch)
                  }}
                  className={`min-h-[38px] rounded-xl text-sm font-bold border-2 transition-all active:scale-95 ${
                    animal.sexo === s ? 'bg-[#1a3a2a] border-[#1a3a2a] text-white' : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  {s === 'Macho' ? 'M' : 'F'}
                </button>
              ))}
            </div>
          </div>
          {racas.length > 0 ? (
            <Select
              label="RAÇA"
              options={[{ value: '', label: 'Selecione' }, ...racas.map((r) => ({ value: r, label: r }))]}
              value={animal.raca}
              onChange={(e) => onChange({ raca: e.target.value })}
            />
          ) : (
            <Input label="RAÇA" placeholder="Raça" value={animal.raca} onChange={(e) => onChange({ raca: e.target.value })} />
          )}
        </div>

        <div>
          <label className="block text-lg font-bold text-gray-900 mb-2">IDADE (ERA) *</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {ERAS.map((era) => (
              <button
                key={era.value}
                type="button"
                onClick={() => onChange({ idadeEra: era.value })}
                className={`min-h-[38px] rounded-xl px-2 text-sm font-bold border-2 transition-all active:scale-95 ${
                  animal.idadeEra === era.value ? 'bg-[#1a3a2a] border-[#1a3a2a] text-white' : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                {era.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-1/2 mx-auto">
          <Input
            id="pesagem-peso-input"
            label="PESO (kg)"
            inputMode="decimal"
            placeholder="Ex: 285,5"
            value={animal.pesoKg}
            onChange={(e) => onChange({ pesoKg: e.target.value.replace(/[^\d,.]/g, '') })}
          />
        </div>
      </div>
    )
  }

  return (
    <CadernetaLayout
      title="PESAGEM"
      cadernetaId="pesagem"
      onBack={handleBack}
      showRegistrosButton={sessao.fase !== 'captura'}
      extraHeaderContent={
        <div className="mt-3 rounded-2xl bg-white/10 border border-white/15 p-3">
          <div className="relative text-center">
            <span className="text-3xl font-black tracking-widest tabular-nums">
              {inicioTs !== null ? formatCronometro(elapsedMs) : '00:00.000'}
            </span>
            <button
              type="button"
              onClick={() => setMetricasAbertas((v) => !v)}
              aria-label={metricasAbertas ? 'Ocultar métricas' : 'Mostrar métricas'}
              className="absolute right-0 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 active:scale-95"
            >
              {metricasAbertas ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
          {metricasAbertas && (
            <div className="mt-2 grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-[10px] font-bold text-white/60 uppercase">Início</p>
                <p className="text-sm font-bold tabular-nums">{formatHora(sessao.horarioInicio)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-white/60 uppercase">Fim</p>
                <p className="text-sm font-bold tabular-nums">{formatHora(sessao.horarioFim)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-white/60 uppercase">Total</p>
                <p className="text-sm font-bold tabular-nums">{formatMin(tempoTotalMin)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-white/60 uppercase">Médio/cab</p>
                <p className="text-sm font-bold tabular-nums">{formatMin(tempoMedioMinCab)}</p>
              </div>
            </div>
          )}
        </div>
      }
      bottomContent={
        sessao.fase === 'preparacao' ? (
          <div className="pb-3">
            <Button variant="success" onClick={iniciarSessao} disabled={!preparacaoCompleta}>
              INICIAR
            </Button>
          </div>
        ) : sessao.fase === 'captura' ? (
          <div className="flex flex-col gap-2 pb-3">
            <div className="text-center text-sm font-bold text-gray-600">
              {sessao.animais.length} {sessao.animais.length === 1 ? 'animal lançado' : 'animais lançados'}
            </div>
            <Button variant="danger" onClick={finalizarSessao} disabled={sessao.animais.length === 0}>
              FINALIZAR
            </Button>
          </div>
        ) : null
      }
    >
      {/* Seção 2 — Preparação */}
      {sessao.fase === 'preparacao' && (
        <div className="flex flex-col gap-5">
          {/* OS de venda: abate/venda vivo exigem OS; selecionar a OS define o tipo automaticamente */}
          {(tipoManejoEhVenda || osAbertas.length > 0) && (
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
              <Select
                label={tipoManejoEhVenda ? 'ORDEM DE SERVIÇO (OBRIGATÓRIA)' : 'ORDEM DE SERVIÇO DE VENDA (OPCIONAL)'}
                options={[
                  {
                    value: '',
                    label: tipoManejoEhVenda
                      ? osDisponiveis.length === 0
                        ? 'Nenhuma OS aberta para este tipo'
                        : 'Selecione a OS...'
                      : 'Sem OS (pesagem comum)',
                  },
                  ...osDisponiveis.map((o) => ({
                    value: o.id,
                    label: `${o.numero_os || 'OS aguardando sync'} · ${o.tipo_venda === 'abate' ? 'Abate' : 'Animal Vivo'}${o.quantidade_prevista ? ` · ${o.quantidade_prevista} cab` : ''}${o.pendenteSync ? ' (pendente sync)' : ''}`,
                  })),
                ]}
                value={sessao.osId || ''}
                onChange={(e) => handleSelecionarOs(e.target.value)}
              />
              {sessao.osId && (
                <div className="mt-3 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm">
                  {(() => {
                    const os = osAbertas.find((o) => o.id === sessao.osId)
                    if (!os) return <p className="font-semibold text-green-800">OS vinculada: {sessao.osNumero || sessao.osId}</p>
                    return (
                      <>
                        <p className="font-black text-green-900">
                          {os.numero_os || 'OS aguardando sync'} · {os.tipo_venda === 'abate' ? 'Venda para abate' : 'Venda de animal vivo'}
                        </p>
                        <p className="text-green-800 mt-1">
                          {[
                            os.quantidade_prevista ? `${os.quantidade_prevista} cabeças previstas` : null,
                            os.sexo,
                            os.idade_era,
                            os.comprador ? `Comprador: ${os.comprador}` : null,
                            os.data_prevista_embarque ? `Embarque: ${os.data_prevista_embarque}` : null,
                            os.data_prevista_abate ? `Abate: ${os.data_prevista_abate}` : null,
                          ].filter(Boolean).join(' · ')}
                        </p>
                      </>
                    )
                  })()}
                </div>
              )}
              {tipoManejoEhVenda && !sessao.osId && osDisponiveis.length === 0 && (
                <p className="mt-2 text-sm font-semibold text-amber-700">
                  Nenhuma OS de venda aberta. Crie um Comunicado de Venda primeiro (e sincronize, se estiver offline).
                </p>
              )}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <label className="block text-lg font-bold text-gray-900 mb-2">TIPO DE MANEJO</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TIPOS_MANEJO.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  disabled={!!sessao.osId}
                  onClick={() => handleSelecionarTipoManejo(t.value)}
                  className={`min-h-[38px] rounded-xl px-2 text-sm font-bold border-2 transition-all active:scale-95 disabled:cursor-not-allowed ${
                    sessao.tipoManejo === t.value
                      ? 'bg-[#1a3a2a] border-[#1a3a2a] text-white'
                      : sessao.osId
                        ? 'bg-gray-100 border-gray-200 text-gray-400'
                        : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {sessao.osId && (
              <p className="mt-2 text-xs text-gray-500">
                Tipo definido pela OS. Para pesagem comum, selecione "Sem OS" acima.
              </p>
            )}
          </div>

          {([
            ['equipeAjustada', 'Equipe ajustada?'],
            ['balancaAferida', 'Balança aferida?'],
            ['checklistConferido', 'Checklist conferido?'],
            ['curralLimpo', 'Curral limpo?'],
          ] as const).map(([campo, label]) => (
            <div key={campo} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between gap-3">
              <span className="text-lg font-bold text-gray-900">{label}</span>
              <div className="w-44 shrink-0">
                <SNButtons size="lg" value={sessao[campo]} onChange={(v) => persistSessao({ ...sessao, [campo]: v })} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Seção 3 — Dados do animal */}
      {sessao.fase === 'captura' && (
        <div className="flex flex-col gap-4">
          {flashSalvo && (
            <div className="rounded-xl bg-green-100 border border-green-300 px-4 py-3 flex items-center gap-2 text-green-800 font-bold">
              <CheckCircle2 className="h-5 w-5" />
              Animal {sessao.animais.length} salvo. Próximo!
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                Animal {sessao.animais.length + 1}
              </p>
              {sessao.osId && (
                <span className="text-xs font-bold text-green-800 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                  {sessao.osNumero || 'OS'} · {sessao.osTipoVenda === 'abate' ? 'Abate' : 'Animal vivo'}
                </span>
              )}
            </div>
            {renderAnimalFields(sessao.animalAtual, updateAnimalAtual, { showSugestoes: true })}
          </div>

          {errosAnimal.length > 0 && (
            <div className="rounded-xl bg-red-50 border border-red-300 px-4 py-3">
              <p className="font-bold text-red-800 flex items-center gap-2 mb-1">
                <AlertTriangle className="h-5 w-5" /> Corrija antes de salvar:
              </p>
              <ul className="list-disc pl-6 text-red-700 font-medium">
                {errosAnimal.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <Button variant="success" onClick={salvarEAproveitar}>
            SALVAR E AVANÇAR
          </Button>
        </div>
      )}

      {/* Revisão aberta em modal; estado 'revisao' mantém a seção escondida atrás do modal */}
      {sessao.fase === 'revisao' && !showRevisao && (
        <div className="flex flex-col gap-4">
          <Button onClick={() => setShowRevisao(true)}>ABRIR REVISÃO</Button>
        </div>
      )}

      {/* Modal de revisão */}
      {showRevisao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="bg-gray-50 rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 bg-[#1a3a2a] text-white">
              <h2 className="text-lg font-black">Revisão da Pesagem</h2>
              <p className="text-sm text-white/70 mt-0.5">
                {sessao.animais.length} {sessao.animais.length === 1 ? 'animal' : 'animais'} · Total {formatMin(sessao.tempoTotalMin)} · Médio {formatMin(sessao.tempoMedioMinCab)}/cab
              </p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3">
              {sessao.animais.length === 0 ? (
                <div className="p-8 text-center text-gray-500 font-medium">Nenhum animal na sessão.</div>
              ) : (
                <>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide px-1">
                    Animais ({sessao.animais.length})
                  </p>
                  {sessao.animais.map((a, idx) => (
                  <div key={a.uid} id={`revisao-card-${a.uid}`} className={`rounded-2xl border bg-white overflow-hidden shrink-0 transition-shadow ${editandoUid === a.uid ? 'border-[#1a3a2a] shadow-md' : 'border-gray-200'}`}>
                    <div className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-gray-900 truncate">
                          #{idx + 1} · {[a.idBrinco && `Brinco ${a.idBrinco}`, a.idChip && `Chip ${a.idChip}`].filter(Boolean).join(' · ') || 'Sem ID'}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {[a.lote, a.categoria, a.sexo === 'Macho' ? 'M' : a.sexo === 'Fêmea' ? 'F' : '', a.pesoKg && `${a.pesoKg} kg`]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const abrindo = editandoUid !== a.uid
                          setEditandoUid(abrindo ? a.uid : null)
                          if (abrindo) {
                            setTimeout(() => document.getElementById(`revisao-card-${a.uid}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
                          }
                        }}
                        className="p-2 rounded-lg text-gray-500 active:bg-gray-100"
                        aria-label="Editar"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setExcluindoUid(a.uid)}
                        className="p-2 rounded-lg text-red-600 active:bg-red-50"
                        aria-label="Excluir"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                    {editandoUid === a.uid && (
                      <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                        {renderAnimalFields(a, (patch) => updateAnimalRevisao(a.uid, patch), { compact: true })}
                      </div>
                    )}
                  </div>
                  ))}
                </>
              )}
            </div>

            {/* Checklist da sessão: banda retrátil acima dos botões; expande só ao toque */}
            <div className={`border-t transition-colors ${checklistFinalCompleto ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <button
                type="button"
                onClick={() => setChecklistAberto((v) => !v)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left ${
                  checklistFinalCompleto ? 'text-green-800' : 'text-amber-800'
                }`}
              >
                <span className="text-xs font-bold uppercase tracking-wide">
                  Checklist de manejo
                  <span className="block normal-case font-semibold tracking-normal">
                    {checklistFinalCompleto
                      ? 'Respondido — toque para revisar'
                      : `${[sessao.acidente, sessao.manejoCalmo, sessao.gritaria, sessao.manejoAgil].filter((v) => v !== '').length}/4 respondidas · toque para responder`}
                  </span>
                </span>
                {checklistAberto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {checklistAberto && (
                <div className="px-4 pb-3 flex flex-col gap-2">
                  {([
                    ['acidente', 'Algum acidente?'],
                    ['manejoCalmo', 'Manejo calmo?'],
                    ['gritaria', 'Gritaria?'],
                    ['manejoAgil', 'Manejo ágil?'],
                  ] as const).map(([campo, label]) => (
                    <div key={campo} className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-xl px-4 py-2">
                      <span className="text-sm font-bold text-gray-900">{label}</span>
                      <div className="w-40 shrink-0">
                        <SNButtons value={sessao[campo]} onChange={(v) => persistSessao({ ...sessao, [campo]: v })} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {errosFinal.length > 0 && (
              <div className="mx-3 mb-2 rounded-xl bg-red-50 border border-red-300 px-4 py-3 max-h-32 overflow-y-auto">
                {errosFinal.map((e) => (
                  <p key={e} className="text-sm font-medium text-red-700">{e}</p>
                ))}
              </div>
            )}

            <div className="p-4 flex gap-3 border-t border-gray-200 bg-white">
              <button
                onClick={() => {
                  // Volta para captura: o tempo parado na revisão vira pausa acumulada,
                  // então o cronômetro retoma de onde parou em vez de somar o tempo de revisão.
                  const pausa = fimTs !== null ? Date.now() - fimTs : 0
                  setShowRevisao(false)
                  persistSessao({ ...sessao, fase: 'captura', horarioFim: null, tempoPausadoMs: sessao.tempoPausadoMs + Math.max(0, pausa), tempoTotalMin: null, tempoMedioMinCab: null, animalInicioTs: Date.now() })
                }}
                disabled={salvandoFinal}
                className="flex-1 font-bold text-base px-4 py-3 rounded-2xl border-2 border-gray-300 text-gray-700 bg-gray-100 active:bg-gray-200 disabled:opacity-50"
              >
                VOLTAR
              </button>
              <button
                onClick={salvarEFinalizar}
                disabled={salvandoFinal || sessao.animais.length === 0 || !checklistFinalCompleto}
                className="flex-1 font-bold text-base px-4 py-3 rounded-2xl border-2 bg-[#1a3a2a] text-white border-[#1a3a2a] active:bg-[#245038] disabled:opacity-50"
              >
                {salvandoFinal ? 'SALVANDO...' : 'SALVAR E FINALIZAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {excluindoUid && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-5">
            <h3 className="text-lg font-black text-gray-900">Excluir animal?</h3>
            <p className="text-sm text-gray-600 mt-1">Esta ação remove o animal da sessão e não pode ser desfeita.</p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setExcluindoUid(null)}
                className="flex-1 font-bold px-4 py-3 rounded-2xl border-2 border-gray-300 text-gray-700 bg-gray-100 active:bg-gray-200"
              >
                CANCELAR
              </button>
              <button
                onClick={() => excluirAnimal(excluindoUid)}
                className="flex-1 font-bold px-4 py-3 rounded-2xl bg-red-700 text-white active:bg-red-800"
              >
                EXCLUIR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de saída durante sessão */}
      {confirmSair && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-5">
            <h3 className="text-lg font-black text-gray-900">Sessão em andamento</h3>
            <p className="text-sm text-gray-600 mt-1">
              {sessao.animais.length} {sessao.animais.length === 1 ? 'animal lançado' : 'animais lançados'} ficam salvos no aparelho e a sessão continua ao reabrir a Pesagem.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={() => setConfirmSair(false)}
                className="w-full font-bold px-4 py-3 rounded-2xl bg-[#1a3a2a] text-white active:bg-[#245038]"
              >
                CONTINUAR SESSÃO
              </button>
              <button
                onClick={() => { setConfirmSair(false); navigate('/modulos/cadernetas') }}
                className="w-full font-bold px-4 py-3 rounded-2xl border-2 border-gray-300 text-gray-700 bg-gray-100 active:bg-gray-200"
              >
                SAIR (SESSÃO FICA SALVA)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de sucesso */}
      {finalizado && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-5 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-700 mx-auto" />
            <h3 className="text-lg font-black text-gray-900 mt-2">Pesagem finalizada</h3>
            <p className="text-sm text-gray-600 mt-1">
              {finalizado.total} {finalizado.total === 1 ? 'registro salvo' : 'registros salvos'} no aparelho. Serão enviados ao sincronizar.
            </p>
            {finalizado.syncErrors ? (
              <p className="text-sm font-semibold text-amber-700 mt-2">
                {finalizado.syncErrors} {finalizado.syncErrors === 1 ? 'registro falhou' : 'registros falharam'} ao sincronizar — abra a lista para reenviar.
              </p>
            ) : null}
            <div className="mt-4 flex flex-col gap-2">
              {finalizado.textoShare && (
                <button
                  onClick={() => compartilharWhatsApp(finalizado.textoShare!)}
                  className="w-full font-bold px-4 py-3 rounded-2xl bg-green-700 text-white active:bg-green-800 flex items-center justify-center gap-2"
                >
                  <Share2 className="h-5 w-5" />
                  COMPARTILHAR
                </button>
              )}
              <button
                onClick={encerrarTela}
                className="w-full font-bold px-4 py-3 rounded-2xl bg-[#1a3a2a] text-white active:bg-[#245038]"
              >
                VER REGISTROS
              </button>
              <button
                onClick={() => { setFinalizado(null); navigate('/') }}
                className="w-full font-bold px-4 py-3 rounded-2xl border-2 border-gray-300 text-gray-700 bg-gray-100 active:bg-gray-200"
              >
                VOLTAR PARA O INÍCIO
              </button>
            </div>
          </div>
        </div>
      )}
    </CadernetaLayout>
  )
}

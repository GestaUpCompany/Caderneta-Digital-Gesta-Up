import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import CadernetaLayout from '../../components/CadernetaLayout'
import { Input, Select, Button } from '../../components/ui'
import { salvarRegistro } from '../../services/api'
import { enqueueRegistro } from '../../services/syncService'
import { todayBR } from '../../utils/formatDate'
import { normalizarNumero } from '../../utils/formatNumber'
import { generateId } from '../../utils/generateId'
import { RootState } from '../../store/store'
import { salvarRascunho, lerRascunho, limparRascunho, updateRegistro, deleteRegistro, removeFromSyncQueueByRegistroId } from '../../services/indexedDB'
import { getCachedCadastroData, getRacasCached, getLoteByNomeCached } from '../../services/cadastroCache'
import { getLotes, getIndividuos } from '../../services/supabaseService'
import { Trash2, Pencil, CheckCircle2, AlertTriangle, Share2 } from 'lucide-react'
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
  idadeDias: string
  acidente: SN
  manejoCalmo: SN
  gritaria: SN
  manejoAgil: SN
  tempoPreenchimentoSeg: number | null
  individuoId: string | null
  /** id do registro local já gravado no store 'pesagem' (tentativa anterior de finalização) */
  registroId?: string | null
}

interface SessaoPesagem {
  fase: Fase
  tipoManejo: string
  equipeAjustada: SN
  balancaAferida: SN
  checklistConferido: SN
  curralLimpo: SN
  horarioInicio: string | null
  horarioFim: string | null
  tempoTotalMin: number | null
  tempoMedioMinCab: number | null
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

function categoriasCompativeis(categorias: string[], sexo: '' | 'Macho' | 'Fêmea'): string[] {
  if (sexo === 'Macho') return categorias.filter((c) => CATEGORIAS_MACHO.has(c))
  if (sexo === 'Fêmea') return categorias.filter((c) => CATEGORIAS_FEMEA.has(c))
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
    idadeDias: '',
    acidente: '',
    manejoCalmo: '',
    gritaria: '',
    manejoAgil: '',
    tempoPreenchimentoSeg: null,
    individuoId: null,
  }
}

function novaSessao(): SessaoPesagem {
  return {
    fase: 'preparacao',
    tipoManejo: '',
    equipeAjustada: '',
    balancaAferida: '',
    checklistConferido: '',
    curralLimpo: '',
    horarioInicio: null,
    horarioFim: null,
    tempoTotalMin: null,
    tempoMedioMinCab: null,
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
  const cls = size === 'lg' ? 'min-h-[56px] text-lg' : 'min-h-[48px] text-base'
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
  const [finalizado, setFinalizado] = useState<{ total: number; textoShare: string | null } | null>(null)
  const autoFillRef = useRef<string | null>(null)

  const focarChip = () => {
    setTimeout(() => document.getElementById('pesagem-chip-input')?.focus(), 150)
  }

  const rascunhoKey = `pesagem-sessao-${fazendaId}`

  const persistSessao = useCallback(
    (next: SessaoPesagem) => {
      setSessao(next)
      salvarRascunho(rascunhoKey, next).catch((e) => console.error('[Pesagem] erro ao salvar rascunho:', e))
    },
    [rascunhoKey]
  )

  const updateAnimalAtual = useCallback(
    (patch: Partial<AnimalDraft>) => {
      setSessao((prev) => {
        const next = { ...prev, animalAtual: { ...prev.animalAtual, ...patch } }
        salvarRascunho(rascunhoKey, next).catch(() => {})
        return next
      })
    },
    [rascunhoKey]
  )

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
  const elapsedMs = inicioTs !== null ? (fimTs ?? now) - inicioTs : 0
  const tempoTotalMin = inicioTs !== null ? elapsedMs / 60000 : null
  const tempoMedioMinCab = useMemo(() => {
    if (sessao.animais.length === 0) return null
    const soma = sessao.animais.reduce((acc, a) => acc + (a.tempoPreenchimentoSeg || 0), 0)
    return soma / sessao.animais.length / 60
  }, [sessao.animais])

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
      const dias = ind.data_nascimento
        ? Math.max(0, Math.floor((Date.now() - new Date(ind.data_nascimento).getTime()) / 86400000))
        : null
      autoFillRef.current = ind.id
      updateAnimalAtual({
        idChip: ind.id_chip || '',
        idBrinco: ind.id_brinco || '',
        sexo: ind.sexo === 'Macho' || ind.sexo === 'Fêmea' ? ind.sexo : '',
        raca: ind.raca || '',
        categoria: ind.categoria || '',
        loteId: loteMatch?.id || '',
        lote: loteMatch?.nome || '',
        idadeEra: ind.idade_era || '',
        idadeDias: dias !== null ? String(dias) : '',
        individuoId: ind.id,
      })
      setErrosAnimal([])
    },
    [lotes, updateAnimalAtual]
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
          idadeDias: '',
          individuoId: null,
        })
      } else if (unico && (chip.length >= 2 || brinco.length >= 2) && autoFillRef.current !== unico.id) {
        aplicarIndividuo(unico)
      }
    },
    [individuos, sessao.animalAtual, updateAnimalAtual, aplicarIndividuo]
  )

  // ==================== Opções do form ====================

  const preparacaoCompleta =
    sessao.tipoManejo !== '' &&
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
    if (a.idadeDias.trim() !== '' && (!Number.isInteger(Number(a.idadeDias)) || Number(a.idadeDias) < 0))
      errs.push('Idade em dias inválida')
    if (!a.acidente) errs.push('Responda: Algum acidente?')
    if (!a.manejoCalmo) errs.push('Responda: Manejo calmo?')
    if (!a.gritaria) errs.push('Responda: Gritaria?')
    if (!a.manejoAgil) errs.push('Responda: Manejo ágil?')
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
    const totalMin = inicioTs !== null ? (Date.now() - inicioTs) / 60000 : null
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
    const falhas: string[] = []

    const animaisAtualizados = [...sessao.animais]
    for (const [idx, a] of sessao.animais.entries()) {
      // Campos compartilhados + do animal; 'data' é montada por salvarRegistro
      // (DD/MM/AAAA HH:MM) e por isso fica fora do payload de update.
      const payload = {
        data: dataSessao,
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
        idadeDias: a.idadeDias.trim() !== '' ? Number(a.idadeDias) : null,
        acidente: a.acidente,
        manejoCalmo: a.manejoCalmo,
        gritaria: a.gritaria,
        manejoAgil: a.manejoAgil,
        tempoPreenchimentoSeg: a.tempoPreenchimentoSeg,
        individuoId: a.individuoId,
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
        } catch {
          falhas.push(`Animal ${idx + 1}: erro ao atualizar registro local`)
        }
        continue
      }

      const result = await salvarRegistro('pesagem', payload)
      if (!result.success) {
        const msgs = (result.errors || []).map((e) => e.message).join('; ')
        falhas.push(`Animal ${idx + 1}: ${msgs}`)
      } else {
        animaisAtualizados[idx] = { ...a, registroId: result.id || null }
      }
    }

    // Persiste os registroId atribuídos: numa nova tentativa de finalização,
    // animais já gravados são atualizados em vez de duplicados.
    if (falhas.length > 0) {
      persistSessao({ ...sessao, animais: animaisAtualizados })
    }

    setSalvandoFinal(false)
    if (falhas.length > 0) {
      setErrosFinal(falhas)
      return
    }

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
      acidente: a.acidente,
      manejoCalmo: a.manejoCalmo,
      gritaria: a.gritaria,
      manejoAgil: a.manejoAgil,
    }))
    const textoShare = registrosShare.length > 0
      ? formatarRegistroComoTexto(registrosShare[0] as any, 'pesagem', registrosShare as any)
      : null

    setShowRevisao(false)
    setFinalizado({ total: sessao.animais.length, textoShare })
    setSessao(novaSessao())
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
    const cats = categoriasCompativeis(categoriasPorDestino(loteSel?.destino), animal.sexo)
    return (
      <div className="flex flex-col gap-4">
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

        <Select
          label="LOTE"
          options={[{ value: '', label: 'Selecione o lote' }, ...lotes.map((l) => ({ value: l.id, label: l.nome }))]}
          value={animal.loteId}
          onChange={(e) => {
            const lote = lotes.find((l) => l.id === e.target.value) || null
            onChange({ loteId: lote?.id || '', lote: lote?.nome || '', categoria: '' })
          }}
        />

        <div>
          <label className="block text-lg font-bold text-gray-900 mb-2">CATEGORIA</label>
          {animal.loteId ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {cats.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => onChange({ categoria: c })}
                  className={`min-h-[48px] rounded-xl px-2 text-sm font-bold border-2 transition-all active:scale-95 ${
                    animal.categoria === c ? 'bg-[#1a3a2a] border-[#1a3a2a] text-white' : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-base text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">Selecione o lote primeiro</p>
          )}
        </div>

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
                className={`min-h-[56px] rounded-xl text-lg font-bold border-2 transition-all active:scale-95 ${
                  animal.sexo === s ? 'bg-[#1a3a2a] border-[#1a3a2a] text-white' : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                {s === 'Macho' ? 'M' : 'F'}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="PESO (kg)"
          inputMode="decimal"
          placeholder="Ex: 285,5"
          value={animal.pesoKg}
          onChange={(e) => onChange({ pesoKg: e.target.value.replace(/[^\d,.]/g, '') })}
        />

        {racas.length > 0 ? (
          <Select
            label="RAÇA"
            options={[{ value: '', label: 'Selecione a raça' }, ...racas.map((r) => ({ value: r, label: r }))]}
            value={animal.raca}
            onChange={(e) => onChange({ raca: e.target.value })}
          />
        ) : (
          <Input label="RAÇA" placeholder="Raça do animal" value={animal.raca} onChange={(e) => onChange({ raca: e.target.value })} />
        )}

        <div>
          <label className="block text-lg font-bold text-gray-900 mb-2">IDADE (ERA) *</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {ERAS.map((era) => (
              <button
                key={era.value}
                type="button"
                onClick={() => onChange({ idadeEra: era.value })}
                className={`min-h-[48px] rounded-xl px-2 text-sm font-bold border-2 transition-all active:scale-95 ${
                  animal.idadeEra === era.value ? 'bg-[#1a3a2a] border-[#1a3a2a] text-white' : 'bg-white border-gray-300 text-gray-700'
                }`}
              >
                {era.label}
              </button>
            ))}
          </div>
        </div>

        <Input
          label="IDADE (DIAS) — opcional"
          inputMode="numeric"
          placeholder="Ex: 210"
          value={animal.idadeDias}
          onChange={(e) => onChange({ idadeDias: e.target.value.replace(/\D/g, '') })}
        />

        {([
          ['acidente', 'Algum acidente?'],
          ['manejoCalmo', 'Manejo calmo?'],
          ['gritaria', 'Gritaria?'],
          ['manejoAgil', 'Manejo ágil?'],
        ] as const).map(([campo, label]) => (
          <div key={campo} className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3">
            <span className="text-base font-bold text-gray-900">{label}</span>
            <div className="w-40 shrink-0">
              <SNButtons value={animal[campo]} onChange={(v) => onChange({ [campo]: v })} />
            </div>
          </div>
        ))}
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
          <div className="text-center">
            <span className="text-3xl font-black tracking-widest tabular-nums">
              {inicioTs !== null ? formatCronometro(elapsedMs) : '00:00.000'}
            </span>
          </div>
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
        </div>
      }
      bottomContent={
        sessao.fase === 'preparacao' ? (
          <Button variant="success" onClick={iniciarSessao} disabled={!preparacaoCompleta}>
            INICIAR
          </Button>
        ) : sessao.fase === 'captura' ? (
          <div className="flex flex-col gap-2">
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
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <label className="block text-lg font-bold text-gray-900 mb-2">TIPO DE MANEJO</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TIPOS_MANEJO.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => persistSessao({ ...sessao, tipoManejo: t.value })}
                  className={`min-h-[56px] rounded-xl px-2 text-base font-bold border-2 transition-all active:scale-95 ${
                    sessao.tipoManejo === t.value ? 'bg-[#1a3a2a] border-[#1a3a2a] text-white' : 'bg-white border-gray-300 text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
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
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">
              Animal {sessao.animais.length + 1}
            </p>
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

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
              {sessao.animais.length === 0 ? (
                <div className="p-8 text-center text-gray-500 font-medium">Nenhum animal na sessão.</div>
              ) : (
                sessao.animais.map((a, idx) => (
                  <div key={a.uid} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
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
                        onClick={() => setEditandoUid(editandoUid === a.uid ? null : a.uid)}
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
                ))
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
                onClick={() => { setShowRevisao(false); persistSessao({ ...sessao, fase: 'captura', horarioFim: null, tempoTotalMin: null, tempoMedioMinCab: null, animalInicioTs: Date.now() }) }}
                disabled={salvandoFinal}
                className="flex-1 font-bold text-base px-4 py-3 rounded-2xl border-2 border-gray-300 text-gray-700 bg-gray-100 active:bg-gray-200 disabled:opacity-50"
              >
                VOLTAR
              </button>
              <button
                onClick={salvarEFinalizar}
                disabled={salvandoFinal || sessao.animais.length === 0}
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
            </div>
          </div>
        </div>
      )}
    </CadernetaLayout>
  )
}

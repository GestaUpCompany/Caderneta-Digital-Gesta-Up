import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Check, Search } from 'lucide-react'
import { DatePicker, Input } from '../../components/ui'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import ChecklistProblemasBebedouro from '../../components/cadernetas/ChecklistProblemasBebedouro'
import ChoiceGrid from '../../components/cadernetas/ChoiceGrid'
import FormFooter from '../../components/cadernetas/FormFooter'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import ParticipantesLimpeza, { mesclarNomes, separarNomes } from '../../components/cadernetas/ParticipantesLimpeza'
import BannerRascunho from '../../components/BannerRascunho'
import SuccessModal from '../../components/SuccessModal'
import ObservacaoAtrasoModal from '../../components/ObservacaoAtrasoModal'
import { salvarRegistro } from '../../services/api'
import {
  ResumoLimpezaBebedouro,
  getPendenciasBebedouroCached,
  getResumoLimpezaBebedourosCached,
} from '../../services/cadastroCache'
import { RootState } from '../../store/store'
import { todayBR } from '../../utils/formatDate'
import { formatarTempoDesdeLimpeza, Registro } from '../../utils/shareUtils'
import {
  CHECKLIST_PROBLEMAS_BEBEDOURO,
  CampoChecklistBebedouro,
  PendenciaBebedouro,
  SituacaoPendencia,
  diasEntre,
} from '../../utils/pendenciasBebedouro'
import {
  LEITURA_AGUA_PADRAO,
  OPCOES_AGUA,
  StatusPrazoLimpeza,
  TomPrazo,
  erroItemLote,
  montarPayloadRegistroBebedouro,
  ordenarPorUrgencia,
  statusPrazoLimpeza,
} from '../../utils/bebedourosLote'
import { useChecklistAtivo } from '../../hooks/useChecklistAtivo'
import { usePhotoGps } from '../../hooks/usePhotoGps'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { useSalvarRegistro } from '../../hooks/useSalvarRegistro'
import { useVoiceInput } from '../../hooks/useVoiceInput'

type PorCampo<T> = Partial<Record<CampoChecklistBebedouro, T>>

interface ItemLote {
  leituraBebedouro: string
  problemas: PorCampo<boolean>
  observacoes: PorCampo<string>
  fotos: PorCampo<string>
  pendencias: Record<string, SituacaoPendencia | ''>
}

interface FormLote {
  data: string
  observacao: string
  participantesFuncionarios: string[]
  participantesDiaristas: string[]
  diaristaDigitando: string
  /** Só os bebedouros selecionados, por nome */
  itens: Record<string, ItemLote>
}

interface PendenciasDoBebedouro {
  abertas: PendenciaBebedouro[]
  /** false = histórico do servidor não lido (offline sem cache) */
  verificado: boolean
  carregando: boolean
}

const makeInitial = (): FormLote => ({
  data: todayBR(),
  observacao: '',
  participantesFuncionarios: [],
  participantesDiaristas: [],
  diaristaDigitando: '',
  itens: {},
})

const itemInicial = (): ItemLote => ({
  leituraBebedouro: LEITURA_AGUA_PADRAO,
  problemas: {},
  observacoes: {},
  fotos: {},
  pendencias: {},
})

const CLASSE_TOM: Record<TomPrazo, string> = {
  danger: 'bg-red-100 text-red-800',
  warning: 'bg-amber-100 text-amber-900',
  success: 'bg-green-100 text-green-800',
  neutral: 'bg-gray-100 text-gray-700',
}

const dataBRparaIso = (dataBR: string): string => {
  const [dia, mes, ano] = dataBR.split(' ')[0].split('/')
  return `${ano}-${mes}-${dia}`
}

interface Props {
  /** Seletor "Individual | Em lote" renderizado no topo da página */
  topo: ReactNode
  funcionariosDisponiveis: string[]
}

export default function BebedourosLoteForm({ topo, funcionariosDisponiveis }: Props) {
  const navigate = useNavigate()
  const { usuario, fazendaId } = useSelector((state: RootState) => state.config)
  const { ativo: checklistAtivo, loading: loadingChecklistRegras } = useChecklistAtivo('bebedouros')
  const { salvando, salvar, showObservacaoModal, horariosModal, onConfirmarObservacao, onCancelarObservacao } =
    useSalvarRegistro('bebedouros')
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormLote>({ rascunhoKey: 'bebedouros-lote', makeInitial })

  const [resumos, setResumos] = useState<ResumoLimpezaBebedouro[] | null>(null)
  const [busca, setBusca] = useState('')
  const [pendMap, setPendMap] = useState<Record<string, PendenciasDoBebedouro>>({})
  const pendRef = useRef(pendMap)
  pendRef.current = pendMap
  const [erros, setErros] = useState<Record<string, string>>({})
  const [problemaAberto, setProblemaAberto] = useState<Record<string, boolean>>({})
  const [registrosSalvos, setRegistrosSalvos] = useState<Registro[]>([])
  const [mensagemSucesso, setMensagemSucesso] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [alvoFoto, setAlvoFoto] = useState<{ nome: string; campo: CampoChecklistBebedouro } | null>(null)
  const [alvoVoz, setAlvoVoz] = useState<{ nome: string; campo: CampoChecklistBebedouro } | null>(null)
  const baseVozRef = useRef('')

  const { capturandoFoto, fotoErro, capturarFoto, fotoInputRef, handleFileInputChange } = usePhotoGps({ comGps: false })
  const { ouvindo: ouvindoVoz, erro: vozErro, toggle: toggleVoz, parar: pararVoz } = useVoiceInput()

  const dataIso = dataBRparaIso(form.data)

  // Resumo de limpeza de todos os bebedouros: cache primeiro; refaz quando a data muda (a "última limpeza" é anterior a ela)
  useEffect(() => {
    if (!fazendaId) return
    let cancelado = false
    getResumoLimpezaBebedourosCached(fazendaId, dataIso)
      .then((lista) => {
        if (!cancelado) setResumos(lista)
      })
      .catch((error) => {
        console.warn('[BebedourosLoteForm] Resumo de limpeza indisponível:', error)
        if (!cancelado) setResumos((atual) => atual ?? [])
      })
    return () => {
      cancelado = true
    }
  }, [fazendaId, dataIso])

  // Pendências dos bebedouros selecionados (inclui os restaurados de rascunho), uma consulta por bebedouro
  const nomesSelecionados = Object.keys(form.itens).join('\n')
  useEffect(() => {
    if (!checklistAtivo || !fazendaId) return
    const nomes = nomesSelecionados ? nomesSelecionados.split('\n') : []
    nomes.forEach((nome) => {
      if (pendRef.current[nome]) return
      setPendMap((prev) => ({ ...prev, [nome]: { abertas: [], verificado: true, carregando: true } }))
      getPendenciasBebedouroCached(fazendaId, nome)
        .then(({ resultado, verificado }) =>
          setPendMap((prev) => ({ ...prev, [nome]: { abertas: resultado.abertas, verificado, carregando: false } }))
        )
        .catch((error) => {
          console.warn('[BebedourosLoteForm] Pendências indisponíveis:', nome, error)
          setPendMap((prev) => ({ ...prev, [nome]: { abertas: [], verificado: false, carregando: false } }))
        })
    })
  }, [nomesSelecionados, checklistAtivo, fazendaId])

  const lista = useMemo(() => {
    const hoje = new Date()
    const comStatus = (resumos ?? []).map((r) => ({
      ...r,
      status: statusPrazoLimpeza(r.ultimaLimpeza, r.metaDias, hoje) as StatusPrazoLimpeza,
    }))
    return ordenarPorUrgencia(comStatus)
  }, [resumos])

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return lista
    return lista.filter(
      (r) => r.nome.toLowerCase().includes(termo) || r.pastos.some((p) => p.nome.toLowerCase().includes(termo))
    )
  }, [lista, busca])

  const selecionados = Object.keys(form.itens)
  const pendenciasCarregando = checklistAtivo && selecionados.some((n) => pendMap[n]?.carregando !== false)

  const atualizarItem = useCallback(
    (nome: string, fn: (item: ItemLote) => ItemLote) =>
      setForm((prev) => (prev.itens[nome] ? { ...prev, itens: { ...prev.itens, [nome]: fn(prev.itens[nome]) } } : prev)),
    [setForm]
  )

  const alternar = (nome: string) =>
    setForm((prev) => {
      const itens = { ...prev.itens }
      if (itens[nome]) delete itens[nome]
      else itens[nome] = itemInicial()
      return { ...prev, itens }
    })

  const selecionarVarios = (nomes: string[]) =>
    setForm((prev) => {
      const itens = { ...prev.itens }
      nomes.forEach((nome) => {
        if (!itens[nome]) itens[nome] = itemInicial()
      })
      return { ...prev, itens }
    })

  const atrasados = lista.filter((r) => r.status.dias === null || (r.status.atraso ?? 0) > 0).map((r) => r.nome)

  const toggleProblema = (nome: string, campo: CampoChecklistBebedouro) =>
    atualizarItem(nome, (item) => ({ ...item, problemas: { ...item.problemas, [campo]: !item.problemas[campo] } }))

  // Responder uma pendência define o item: ainda pendente = problema marcado; resolvido = adequado
  const responderPendencia = (nome: string, campo: CampoChecklistBebedouro, situacao: SituacaoPendencia) =>
    atualizarItem(nome, (item) => ({
      ...item,
      pendencias: { ...item.pendencias, [campo]: situacao },
      problemas: { ...item.problemas, [campo]: situacao === 'mantida' },
    }))

  const definirFoto = (nome: string, campo: CampoChecklistBebedouro, base64: string) =>
    atualizarItem(nome, (item) => ({ ...item, fotos: { ...item.fotos, [campo]: base64 } }))

  const handleTirarFoto = async (nome: string, campo: CampoChecklistBebedouro) => {
    setAlvoFoto({ nome, campo })
    const base64 = await capturarFoto()
    // Nativo devolve a foto aqui; no web ela chega pelo input file hidden
    if (base64) definirFoto(nome, campo, base64)
  }

  const handleFotoInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const result = await handleFileInputChange(e)
    if (result?.fotoBase64 && alvoFoto) definirFoto(alvoFoto.nome, alvoFoto.campo, result.fotoBase64)
  }

  const handleFalar = async (nome: string, campo: CampoChecklistBebedouro) => {
    if (ouvindoVoz) {
      await pararVoz()
      if (alvoVoz?.nome === nome && alvoVoz.campo === campo) return
    }
    setAlvoVoz({ nome, campo })
    baseVozRef.current = (form.itens[nome]?.observacoes[campo] || '').trim()
    await toggleVoz((parcial) =>
      atualizarItem(nome, (item) => ({
        ...item,
        observacoes: { ...item.observacoes, [campo]: baseVozRef.current ? `${baseVozRef.current} ${parcial}` : parcial },
      }))
    )
  }

  const executarSalvamento = async () => {
    setErros({})
    if (selecionados.length === 0 || loadingChecklistRegras) return

    // 1) Valida tudo antes de gravar qualquer coisa
    const invalidos: Record<string, string> = {}
    selecionados.forEach((nome) => {
      const pend = pendRef.current[nome]
      const erro = checklistAtivo && pend?.carregando !== false
        ? 'Carregando pendências do bebedouro...'
        : erroItemLote(form.itens[nome].leituraBebedouro, pend?.abertas ?? [], form.itens[nome].pendencias, checklistAtivo)
      if (erro) invalidos[nome] = erro
    })
    if (Object.keys(invalidos).length > 0) {
      setErros(invalidos)
      const primeiro = lista.find((r) => invalidos[r.nome])?.nome ?? Object.keys(invalidos)[0]
      document.querySelector(`[data-bebedouro="${CSS.escape(primeiro)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    // Nome digitado e ainda não confirmado entra como diarista (evita perder o último nome)
    const diaristas = mesclarNomes(form.participantesDiaristas ?? [], separarNomes(form.diaristaDigitando ?? ''))
    const funcionarios = form.participantesFuncionarios ?? []
    const participantesLimpeza = funcionarios.length > 0 || diaristas.length > 0 ? { funcionarios, diaristas } : null

    // 2) Grava em sequência, na ordem da tela; quem falhar fica na seleção
    const ordem = lista.map((r) => r.nome).filter((n) => form.itens[n])
    const salvos: Registro[] = []
    const falhas: Record<string, string> = {}
    for (const nome of ordem) {
      const item = form.itens[nome]
      const r = lista.find((x) => x.nome === nome)!
      const result = await salvarRegistro(
        'bebedouros',
        montarPayloadRegistroBebedouro({
          data: form.data,
          usuario,
          numeroBebedouro: nome,
          leituraBebedouro: item.leituraBebedouro,
          pastos: r.pastos,
          observacao: form.observacao,
          participantesLimpeza,
          tempoDesdeLimpeza: formatarTempoDesdeLimpeza(r.ultimaLimpeza),
          intervaloMedioLimpezas: r.intervaloMedio > 0 ? `${r.intervaloMedio} dias` : 'Sem dados suficientes',
          metaIntervaloLimpeza: r.metaDias ? `${r.metaDias} dias` : 'Não definida',
          checklistAtivo,
          limpouHoje: true,
          fotoBebedouro: '',
          problemas: item.problemas,
          observacoes: item.observacoes,
          fotos: item.fotos,
          pendencias: item.pendencias,
          pendenciasAbertas: pendRef.current[nome]?.abertas ?? [],
        })
      )
      if (result.success && result.registro) salvos.push(result.registro)
      else falhas[nome] = result.errors?.[0]?.message ?? 'Erro ao salvar. Tente novamente.'
    }

    if (salvos.length > 0) {
      const nomesSalvos = new Set(salvos.map((s) => (s as any).numeroBebedouro as string))
      // Pendências respondidas já foram gravadas: a próxima seleção deve reler o histórico
      setPendMap((prev) => Object.fromEntries(Object.entries(prev).filter(([n]) => !nomesSalvos.has(n))))
      setRegistrosSalvos(salvos)
      setMensagemSucesso(
        Object.keys(falhas).length === 0
          ? salvos.length === 1
            ? '1 bebedouro registrado no aparelho. Será enviado ao sincronizar.'
            : `${salvos.length} bebedouros registrados no aparelho. Serão enviados ao sincronizar.`
          : `${salvos.length} de ${ordem.length} bebedouros salvos no aparelho (serão enviados ao sincronizar). Revise os que ficaram na tela.`
      )
      setShowSuccessModal(true)
    }
    setErros(falhas)

    if (Object.keys(falhas).length === 0) {
      limparRascunho()
      setProblemaAberto({})
    } else {
      setForm((prev) => ({
        ...prev,
        itens: Object.fromEntries(Object.entries(prev.itens).filter(([n]) => falhas[n])),
      }))
    }
  }

  const semResposta = checklistAtivo
    ? selecionados.filter((n) => (pendMap[n]?.abertas ?? []).some((p) => !form.itens[n].pendencias[p.campo])).length
    : 0

  const pendenciaTexto = (() => {
    if (selecionados.length === 0) return 'Falta selecionar os bebedouros limpos'
    if (loadingChecklistRegras) return 'Carregando regras do checklist...'
    if (pendenciasCarregando) return 'Buscando pendências dos bebedouros...'
    if (semResposta > 0) return `Falta responder as pendências de ${semResposta} ${semResposta === 1 ? 'bebedouro' : 'bebedouros'}`
    return undefined
  })()

  const bloqueado = selecionados.length === 0 || loadingChecklistRegras || pendenciasCarregando || semResposta > 0

  return (
    <>
      <CadernetaLayout
        title="BEBEDOUROS"
        cadernetaId="bebedouros"
        dateContent={
          <DatePicker value={form.data} onChange={(v) => setForm((p) => ({ ...p, data: v }))} variant="header" compact inline maxDate={todayBR()} />
        }
      >
        {topo}
        <BannerRascunho visible={rascunhoRestaurado} onConfirmar={confirmarRascunho} onDescartar={descartarRascunho} />

        <CadernetaSection
          numero={1}
          titulo="Bebedouros limpos"
          required
          right={
            selecionados.length > 0 ? (
              <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-extrabold text-green-800">
                {selecionados.length} {selecionados.length === 1 ? 'selecionado' : 'selecionados'}
              </span>
            ) : undefined
          }
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por pasto ou bebedouro..."
              className="w-full rounded-xl border-2 border-gray-300 py-3 pl-9 pr-3 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => selecionarVarios(listaFiltrada.map((r) => r.nome))}
              className="!min-h-0 rounded-xl border-2 border-gray-300 px-3 py-2.5 text-xs font-extrabold uppercase text-gray-700 active:scale-[0.99]"
            >
              Selecionar todos
            </button>
            <button
              type="button"
              onClick={() => selecionarVarios(atrasados)}
              disabled={atrasados.length === 0}
              className="!min-h-0 rounded-xl border-2 border-red-300 px-3 py-2.5 text-xs font-extrabold uppercase text-red-700 active:scale-[0.99] disabled:opacity-50"
            >
              Selecionar atrasados ({atrasados.length})
            </button>
          </div>

          {resumos === null ? (
            <p className="py-4 text-center text-sm text-gray-500">Carregando bebedouros...</p>
          ) : lista.length === 0 ? (
            <InfoStrip tone="warning">
              Nenhum bebedouro neste aparelho. Conecte à internet e atualize os dados.
            </InfoStrip>
          ) : (
            listaFiltrada.map((r) => {
              const item = form.itens[r.nome]
              const marcado = !!item
              const pend = pendMap[r.nome]
              const abertas = checklistAtivo && marcado ? pend?.abertas ?? [] : []
              const pendenciasPorCampo = Object.fromEntries(abertas.map((p) => [p.campo, p])) as PorCampo<PendenciaBebedouro>
              const nProblemas = marcado ? Object.values(item.problemas).filter(Boolean).length : 0
              const checklistVisivel = marcado && checklistAtivo && (problemaAberto[r.nome] || abertas.length > 0 || nProblemas > 0)
              const pastoTexto = r.pastos.map((p) => p.nome).join(' · ')
              return (
                <div
                  key={r.nome}
                  data-bebedouro={r.nome}
                  className={`flex flex-col gap-3 rounded-2xl border-2 p-3 transition-colors ${
                    erros[r.nome] ? 'border-red-500 bg-red-50/40' : marcado ? 'border-green-600 bg-green-50/40' : 'border-gray-200 bg-white'
                  }`}
                >
                  <button type="button" onClick={() => alternar(r.nome)} className="flex w-full !min-h-0 items-center gap-3 text-left">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 ${
                        marcado ? 'border-green-600 bg-green-600 text-white' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {marcado && <Check className="h-4 w-4" strokeWidth={3} />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="text-lg font-extrabold leading-tight text-gray-900 break-words">
                        {pastoTexto || r.nome}
                      </span>
                      <span className="text-xs font-semibold text-gray-500 break-words">
                        {pastoTexto ? r.nome : 'Sem pasto associado'}
                      </span>
                      <span className={`mt-0.5 w-fit rounded-full px-2 py-1 text-[11px] font-extrabold ${CLASSE_TOM[r.status.tone]}`}>
                        {r.status.texto}
                      </span>
                    </span>
                  </button>

                  {erros[r.nome] && <p className="text-sm font-semibold text-red-700">{erros[r.nome]}</p>}

                  {marcado && (
                    <div className="flex flex-col gap-3">
                      <div>
                        <p className="mb-1.5 text-xs font-extrabold uppercase text-gray-700">Como está a água?</p>
                        <div className="grid grid-cols-3 gap-2">
                          {OPCOES_AGUA.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => atualizarItem(r.nome, (i) => ({ ...i, leituraBebedouro: opt.value }))}
                              className={`flex !min-h-[48px] items-center justify-center gap-1.5 rounded-xl border-2 p-2 text-sm font-bold active:scale-95 ${
                                item.leituraBebedouro === opt.value ? opt.selecionado : 'border-gray-300 bg-white text-gray-900'
                              }`}
                            >
                              <span className={`h-2.5 w-2.5 rounded-full ${opt.dot}`} />
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {checklistAtivo && pend?.carregando !== false && (
                        <p className="text-center text-xs text-gray-500">Buscando pendências do bebedouro...</p>
                      )}
                      {checklistAtivo && pend?.verificado === false && (
                        <InfoStrip tone="warning" icon="⚠️">
                          Pendências não verificadas com o servidor neste aparelho.
                        </InfoStrip>
                      )}

                      {abertas.map((p) => {
                        const dias = diasEntre(p.desde, new Date().toISOString())
                        return (
                          <div key={p.campo} className="flex flex-col gap-2 rounded-xl border-2 border-amber-300 bg-amber-50/60 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-extrabold leading-tight text-amber-900">{p.label}</span>
                              <span className="shrink-0 text-xs font-bold text-amber-800">
                                {dias === 0 ? 'hoje' : `há ${dias} ${dias === 1 ? 'dia' : 'dias'}`}
                              </span>
                            </div>
                            {p.observacao && <p className="text-sm text-gray-700">“{p.observacao}”</p>}
                            {p.fotoUrl && (
                              <img
                                src={p.fotoUrl}
                                alt={`Foto anterior: ${p.label}`}
                                className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                            )}
                            <ChoiceGrid
                              options={[
                                { value: 'resolvida', label: 'RESOLVIDO', icon: '✓', tone: 'success' },
                                { value: 'mantida', label: 'AINDA PENDENTE', icon: '✗', tone: 'danger' },
                              ]}
                              value={item.pendencias[p.campo] || ''}
                              onChange={(v) => responderPendencia(r.nome, p.campo, v as SituacaoPendencia)}
                              cols={2}
                            />
                          </div>
                        )
                      })}

                      {checklistAtivo && !checklistVisivel && (
                        <button
                          type="button"
                          onClick={() => setProblemaAberto((prev) => ({ ...prev, [r.nome]: true }))}
                          className="!min-h-0 rounded-xl border-2 border-dashed border-red-300 px-3 py-2.5 text-xs font-extrabold uppercase text-red-700 active:scale-[0.99]"
                        >
                          ⚠️ Registrar problema neste bebedouro
                        </button>
                      )}

                      {checklistVisivel &&
                        CHECKLIST_PROBLEMAS_BEBEDOURO.map(({ campo, label, aviso }) => {
                          const pendencia = pendenciasPorCampo[campo]
                          // Item com pendência anterior é decidido pela pergunta acima: resolvido some daqui
                          if (pendencia && item.pendencias[campo] !== 'mantida') return null
                          const foco = alvoFoto?.nome === r.nome && alvoFoto.campo === campo
                          const vozFoco = alvoVoz?.nome === r.nome && alvoVoz.campo === campo
                          return (
                            <ChecklistProblemasBebedouro
                              key={campo}
                              label={label}
                              aviso={aviso}
                              marcado={!!item.problemas[campo]}
                              pendencia={!!pendencia}
                              foto={item.fotos[campo] || ''}
                              observacao={item.observacoes[campo] || ''}
                              capturandoFoto={capturandoFoto}
                              fotoAtiva={foco}
                              ouvindoVoz={ouvindoVoz}
                              vozAtiva={vozFoco}
                              fotoErro={fotoErro}
                              vozErro={vozErro}
                              onToggle={() => toggleProblema(r.nome, campo)}
                              onTirarFoto={() => handleTirarFoto(r.nome, campo)}
                              onRemoverFoto={() => definirFoto(r.nome, campo, '')}
                              onFalar={() => handleFalar(r.nome, campo)}
                              onChangeObservacao={(texto) =>
                                atualizarItem(r.nome, (i) => ({ ...i, observacoes: { ...i.observacoes, [campo]: texto } }))
                              }
                            />
                          )
                        })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CadernetaSection>

        <CadernetaSection numero={2} titulo="Quem participou da limpeza">
          <ParticipantesLimpeza
            funcionariosDisponiveis={funcionariosDisponiveis}
            funcionariosSelecionados={form.participantesFuncionarios ?? []}
            onChangeFuncionarios={(nomes) => setForm((p) => ({ ...p, participantesFuncionarios: nomes }))}
            diaristas={form.participantesDiaristas ?? []}
            onChangeDiaristas={(nomes) => setForm((p) => ({ ...p, participantesDiaristas: nomes }))}
            digitando={form.diaristaDigitando ?? ''}
            onChangeDigitando={(texto) => setForm((p) => ({ ...p, diaristaDigitando: texto }))}
          />
        </CadernetaSection>

        <CadernetaSection numero={3} titulo="Observação">
          <Input
            placeholder="Detalhes adicionais (opcional, vale para todos os bebedouros do lote)"
            value={form.observacao}
            onChange={(e) => setForm((p) => ({ ...p, observacao: e.target.value }))}
          />
        </CadernetaSection>

        <FormFooter
          onSalvar={() => salvar(executarSalvamento)}
          onLimpar={() => {
            limparRascunho()
            setErros({})
            setProblemaAberto({})
          }}
          salvando={salvando}
          disabled={bloqueado}
          formValido={!bloqueado}
          pendenciaTexto={pendenciaTexto}
          salvarLabel={selecionados.length > 0 ? `SALVAR ${selecionados.length}` : 'SALVAR'}
        />

        <input
          ref={fotoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFotoInput}
          className="hidden"
        />
      </CadernetaLayout>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={() => {
          setShowSuccessModal(false)
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
        onExit={() => {
          setShowSuccessModal(false)
          navigate('/')
        }}
        cadernetaName="Bebedouros"
        registrosLote={registrosSalvos}
        mensagem={mensagemSucesso}
      />

      <ObservacaoAtrasoModal
        isOpen={showObservacaoModal}
        onClose={async (observacao) => {
          if (observacao !== undefined) await onConfirmarObservacao(observacao)
          else onCancelarObservacao()
        }}
        horarioProgramado={horariosModal.programado}
        horarioRegistro={horariosModal.registro}
      />
    </>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRefreshTick } from '../../hooks/useRefreshCadastros'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import FormFooter from '../../components/cadernetas/FormFooter'
import BannerRascunho from '../../components/BannerRascunho'
import SuccessModal from '../../components/SuccessModal'
import { DatePicker, Input, ValidationMessage } from '../../components/ui'
import { salvarRegistro } from '../../services/api'
import { getLotesProtocoloIatfCached } from '../../services/cadastroCache'
import { getAllRegistros } from '../../services/indexedDB'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { dataBRparaIso } from '../../utils/manejoCurral'
import { todayBR } from '../../utils/formatDate'
import { cadernetaVisivel } from '../../utils/constants'
import { RootState } from '../../store/store'
import {
  errosProtocoloIatf,
  formVazioProtocoloIatf,
  pendenciaProtocoloIatf,
  situacaoTarefaIatf,
  femeasSemIa,
  passosAnterioresPendentes,
  tarefasPendentes,
  unirIds,
  type FormProtocoloIatf,
  type LoteIatfCache,
  type SituacaoTarefaIatf,
  type TarefaIatfCache,
} from '../../utils/protocoloIatf'

const makeInitial = (): FormProtocoloIatf => formVazioProtocoloIatf(todayBR())

const ROTULO_SITUACAO: Record<SituacaoTarefaIatf, string> = { atrasada: 'ATRASADO', hoje: 'HOJE', futura: 'PREVISTO' }
const CLASSE_SITUACAO: Record<SituacaoTarefaIatf, string> = {
  atrasada: 'bg-red-100 text-red-800',
  hoje: 'bg-amber-100 text-amber-800',
  futura: 'bg-gray-100 text-gray-600',
}

const formatarDataIso = (iso: string) => iso.split('-').reverse().join('/')

export default function ProtocoloIatfPage() {
  const navigate = useNavigate()
  const { fazendaId, usuario, acessoIatf } = useSelector((state: RootState) => state.config)

  const initial = useCallback(makeInitial, [])
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } = useRascunhoForm<FormProtocoloIatf>({
    rascunhoKey: `protocolo-iatf-${fazendaId}`,
    makeInitial: initial,
  })

  const [lotes, setLotes] = useState<LoteIatfCache[] | null>(null)
  const [marcadasLocalmente, setMarcadasLocalmente] = useState<ReadonlySet<string>>(new Set())
  // Fêmeas que este aparelho já inseminou por passo de IA e ainda aguardam envio (a IA é por grupos de fêmeas)
  const [femeasComIaLocal, setFemeasComIaLocal] = useState<ReadonlyMap<string, ReadonlySet<string>>>(new Map())
  // Fêmeas que este aparelho já descartou de um lote e ainda aguardam envio: saem da lista da IA
  const [femeasDescartadasLocal, setFemeasDescartadasLocal] = useState<ReadonlySet<string>>(new Set())
  // Lotes criados neste aparelho que ainda não foram enviados (ou deram erro): aparecem como "aguardando envio"
  const [lotesAguardando, setLotesAguardando] = useState<{ id: string; nome: string; n: number; erro: boolean }[]>([])
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(undefined)

  const refreshTick = useRefreshTick()
  const hojeBR = todayBR()
  const hojeIso = dataBRparaIso(hojeBR) ?? ''

  // Lotes em andamento (servidor; offline usa a última cópia) e passos já marcados neste aparelho e ainda não enviados
  useEffect(() => {
    if (!fazendaId) return
    let cancelado = false
    ;(async () => {
      const dados = ((await getLotesProtocoloIatfCached(fazendaId).catch(() => null)) || []) as LoteIatfCache[]
      const locais = (await getAllRegistros('protocolo-iatf').catch(() => [])) as unknown as {
        tarefaId?: string
        tarefaTipo?: string
        femeasSelecionadas?: string[]
        syncStatus?: string
        acao?: string
        individuoId?: string
      }[]
      const lotesLocais = (await getAllRegistros('protocolo-iatf-lote').catch(() => [])) as unknown as {
        id: string
        nome?: string
        linhas?: unknown[]
        syncStatus?: string
      }[]
      if (cancelado) return
      setLotesAguardando(
        lotesLocais
          .filter((l) => l.syncStatus !== 'synced')
          .map((l) => ({ id: l.id, nome: l.nome ?? 'Lote de protocolo', n: l.linhas?.length ?? 0, erro: l.syncStatus === 'error' }))
      )
      setFemeasDescartadasLocal(
        new Set(locais.filter((l) => l.acao === 'descartar' && l.individuoId && l.syncStatus !== 'error' && l.syncStatus !== 'synced').map((l) => l.individuoId as string))
      )
      // Marcação com erro de envio não conta: o passo volta a aparecer para ser refeito
      const validos = locais.filter((l) => l.tarefaId && l.syncStatus !== 'error')
      setMarcadasLocalmente(new Set(validos.map((l) => l.tarefaId as string)))
      const porPasso = new Map<string, Set<string>>()
      // Só IA ainda não enviada conta aqui: a já sincronizada vem em `inseminadas` do servidor (e some se for desfeita no painel)
      for (const l of validos.filter((x) => x.tarefaTipo === 'Inseminacao' && x.syncStatus !== 'synced')) {
        const doLote = dados.find((d) => d.tarefas.some((t) => t.id === l.tarefaId))
        // Registro sem lista de fêmeas (formato antigo) cobriu todas as ativas do lote
        const ids = l.femeasSelecionadas?.length ? l.femeasSelecionadas : (doLote?.femeas ?? []).map((f) => f.individuoId)
        const atual = porPasso.get(l.tarefaId as string) ?? new Set<string>()
        ids.forEach((id) => atual.add(id))
        porPasso.set(l.tarefaId as string, atual)
      }
      setFemeasComIaLocal(porPasso)
      setLotes(dados)
    })()
    return () => {
      cancelado = true
    }
  }, [fazendaId, refreshTick, showSuccessModal])

  const lote = useMemo(() => (lotes ?? []).find((l) => l.id === form.loteProtocoloId) ?? null, [lotes, form.loteProtocoloId])
  const pendentes = useMemo(
    () => (lote ? tarefasPendentes(lote, marcadasLocalmente, femeasComIaLocal, femeasDescartadasLocal) : []),
    [lote, marcadasLocalmente, femeasComIaLocal, femeasDescartadasLocal]
  )
  const femeasDaIa = useMemo(
    () => (lote && form.tarefaId ? femeasSemIa(lote, unirIds(femeasComIaLocal.get(form.tarefaId), femeasDescartadasLocal)) : []),
    [lote, form.tarefaId, femeasComIaLocal, femeasDescartadasLocal]
  )
  const totalInseminadas = lote ? lote.femeasAtivas - femeasSemIa(lote).length : 0
  const ehIa = form.tarefaTipo === 'Inseminacao'

  const set = (patch: Partial<FormProtocoloIatf>) => setForm((f) => ({ ...f, ...patch }))
  const pendenciaTexto = pendenciaProtocoloIatf(form, hojeBR)
  const isValid = pendenciaTexto === ''

  const escolherLote = (l: LoteIatfCache) =>
    set({
      loteProtocoloId: l.id,
      loteNome: l.nome,
      loteD0: l.data_d0,
      femeasAtivas: l.femeasAtivas,
      tarefaId: '',
      tarefaRotulo: '',
      tarefaTipo: '',
      tarefaDia: null,
      femeasSelecionadas: [],
      femeasDisponiveis: 0,
      touroNome: '',
      semenPartida: '',
      tecnico: '',
    })

  const escolherTarefa = (t: TarefaIatfCache) => {
    // Passo de IA: começa com todas as fêmeas que ainda faltam marcadas; o peão desmarca as que usam outro sêmen
    const disponiveis = t.tipo === 'Inseminacao' && lote ? femeasSemIa(lote, unirIds(femeasComIaLocal.get(t.id), femeasDescartadasLocal)) : []
    set({
      tarefaId: t.id,
      tarefaRotulo: t.rotulo,
      tarefaTipo: t.tipo,
      tarefaDia: t.dia,
      femeasSelecionadas: disponiveis.map((f) => f.individuoId),
      femeasDisponiveis: disponiveis.length,
    })
  }

  const alternarFemea = (individuoId: string) =>
    set({
      femeasSelecionadas: form.femeasSelecionadas.includes(individuoId)
        ? form.femeasSelecionadas.filter((id) => id !== individuoId)
        : [...form.femeasSelecionadas, individuoId],
    })

  const handleSalvar = async () => {
    const lista = errosProtocoloIatf(form, hojeBR)
    if (lista.length > 0) {
      setErrors(lista)
      return
    }
    setSalvando(true)
    setErrors([])
    const resultado = await salvarRegistro('protocolo-iatf', { ...form, responsavel: usuario, usuario })
    setSalvando(false)
    if (!resultado.success) {
      setErrors(resultado.errors || [])
      return
    }
    setRegistroSalvo(resultado.registro)
    setShowSuccessModal(true)
    limparRascunho()
  }

  const handleLimpar = () => {
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

  if (!fazendaId || !cadernetaVisivel('protocolo-iatf', fazendaId, acessoIatf)) {
    return (
      <CadernetaLayout title="PROTOCOLO IATF" cadernetaId="protocolo-iatf" showRegistrosButton={false}>
        <InfoStrip tone="warning" icon="⚠️">
          {!fazendaId ? 'Configure a fazenda antes de usar esta caderneta.' : 'Esta caderneta não está liberada para esta fazenda. Peça ao administrador para ativar o Acesso ao IATF.'}
        </InfoStrip>
      </CadernetaLayout>
    )
  }

  return (
    <>
      <CadernetaLayout
        title="PROTOCOLO IATF"
        cadernetaId="protocolo-iatf"
        dateContent={<DatePicker value={form.data} onChange={(v) => set({ data: v })} variant="header" compact inline maxDate={todayBR()} />}
      >
        <BannerRascunho visible={rascunhoRestaurado} onConfirmar={confirmarRascunho} onDescartar={descartarRascunho} />
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        <InfoStrip tone="neutral" icon="ℹ️">
          Marca o passo feito de um lote de protocolo (criado no painel ou aqui no app). No passo de inseminação, escolha as fêmeas e o sêmen usado; o passo só conclui quando todas as fêmeas ativas do lote foram inseminadas. Não altera contagem nem peso.
        </InfoStrip>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate('/caderneta/protocolo-iatf/novo-lote')}
            className="flex-1 rounded-xl border-2 border-brand-900 px-3 py-2.5 text-sm font-extrabold uppercase tracking-wide text-brand-900 active:scale-[0.99]"
          >
            + Novo lote de protocolo
          </button>
          <button
            type="button"
            onClick={() => navigate('/caderneta/protocolo-iatf/novo-lote/lista')}
            className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-bold uppercase text-gray-600 active:scale-[0.99]"
          >
            Lotes criados
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate('/caderneta/protocolo-iatf/descartar')}
          className="rounded-xl border border-amber-400 bg-amber-50 px-3 py-2.5 text-sm font-bold uppercase text-amber-800 active:scale-[0.99]"
        >
          Descartar fêmea do lote
        </button>

        <CadernetaSection numero={1} titulo="Lote de protocolo">
          {lotes === null && <InfoStrip tone="neutral">Carregando lotes...</InfoStrip>}
          {lotes !== null && lotes.length === 0 && lotesAguardando.length === 0 && (
            <InfoStrip tone="warning" icon="⚠️">
              Nenhum lote de protocolo em andamento neste aparelho. Crie o lote no painel e abra o app com internet para baixar.
            </InfoStrip>
          )}
          {lotesAguardando.map((l) => (
            <div
              key={l.id}
              className={`flex flex-col gap-0.5 rounded-xl border border-dashed p-3 ${l.erro ? 'border-red-300 bg-red-50' : 'border-amber-300 bg-amber-50'}`}
            >
              <span className="text-sm font-extrabold text-gray-900">{l.nome}</span>
              <span className="text-xs text-gray-700">
                {l.n} {l.n === 1 ? 'fêmea' : 'fêmeas'} ·{' '}
                {l.erro
                  ? 'erro no envio: veja em "Lotes criados"'
                  : 'aguardando envio. Com internet, o lote sobe sozinho e os passos aparecem aqui depois de atualizar.'}
              </span>
            </div>
          ))}
          {(lotes ?? []).map((l) => {
            const n = tarefasPendentes(l, marcadasLocalmente, femeasComIaLocal, femeasDescartadasLocal).length
            const ativo = l.id === form.loteProtocoloId
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => escolherLote(l)}
                className={`flex flex-col gap-0.5 rounded-xl border p-3 text-left ${ativo ? 'border-brand-900 bg-brand-50' : 'border-gray-200 bg-white'}`}
              >
                <span className="text-sm font-extrabold text-gray-900">{l.nome}</span>
                <span className="text-xs text-gray-600">
                  D0 {formatarDataIso(l.data_d0)} · {l.femeasAtivas} {l.femeasAtivas === 1 ? 'fêmea' : 'fêmeas'} · {n} {n === 1 ? 'passo pendente' : 'passos pendentes'}
                </span>
              </button>
            )
          })}
        </CadernetaSection>

        {lote && (
          <CadernetaSection numero={2} titulo="Passo feito">
            {pendentes.length === 0 && <InfoStrip tone="neutral">Todos os passos deste lote já foram marcados.</InfoStrip>}
            {pendentes.map((t) => {
              const sit = situacaoTarefaIatf(t.data_prevista, hojeIso)
              const ativo = t.id === form.tarefaId
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => escolherTarefa(t)}
                  className={`flex items-center justify-between gap-2 rounded-xl border p-3 text-left ${ativo ? 'border-brand-900 bg-brand-50' : 'border-gray-200 bg-white'}`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold text-gray-900">
                      D{t.dia} · {t.rotulo}
                    </span>
                    <span className="block text-xs text-gray-600">
                      {formatarDataIso(t.data_prevista)}
                      {t.medicamento_nome || t.dose ? ` · ${[t.medicamento_nome, t.dose].filter(Boolean).join(' · ')}` : ''}
                    </span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${CLASSE_SITUACAO[sit]}`}>{ROTULO_SITUACAO[sit]}</span>
                </button>
              )
            })}
          </CadernetaSection>
        )}

        {lote && form.tarefaId && (
          <CadernetaSection numero={3} titulo={ehIa ? 'Inseminação' : 'Detalhes'}>
            {ehIa && (
              <>
                {passosAnterioresPendentes(pendentes, form.tarefaDia ?? 0).length > 0 && (
                  <InfoStrip tone="warning" icon="⚠️">
                    Atenção: passos anteriores do protocolo ainda não foram marcados:{' '}
                    {passosAnterioresPendentes(pendentes, form.tarefaDia ?? 0)
                      .map((t) => `D${t.dia} ${t.rotulo}`)
                      .join('; ')}
                    .
                  </InfoStrip>
                )}
                {femeasDaIa.length > 0 ? (
                  <>
                    <InfoStrip tone="warning" icon="🐄">
                      {totalInseminadas} de {lote.femeasAtivas} fêmeas já inseminadas. Marque as fêmeas desta inseminação; o touro e a partida valem só para elas. Para outro sêmen, salve e registre as demais em seguida.
                    </InfoStrip>
                    <div className="flex flex-col divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
                      {femeasDaIa.map((f) => (
                        <label key={f.individuoId} className="flex items-center gap-3 p-3 text-sm font-bold text-gray-900">
                          <input
                            type="checkbox"
                            className="h-5 w-5"
                            checked={form.femeasSelecionadas.includes(f.individuoId)}
                            onChange={() => alternarFemea(f.individuoId)}
                          />
                          {f.rotulo}
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <InfoStrip tone="warning" icon="🐄">
                    Serão lançadas inseminações para as fêmeas ativas do lote que ainda não foram inseminadas.
                  </InfoStrip>
                )}
                <Input label="TOURO / SÊMEN (OPCIONAL)" placeholder="Nome ou número do touro" value={form.touroNome} onChange={(e) => set({ touroNome: e.target.value })} />
                <Input label="PARTIDA DO SÊMEN (OPCIONAL)" placeholder="Número da partida" value={form.semenPartida} onChange={(e) => set({ semenPartida: e.target.value })} />
                <Input label="TÉCNICO / INSEMINADOR (OPCIONAL)" placeholder="Quem realizou" value={form.tecnico} onChange={(e) => set({ tecnico: e.target.value })} />
              </>
            )}
            <Input placeholder="Observação (opcional)" value={form.observacao} onChange={(e) => set({ observacao: e.target.value })} />
          </CadernetaSection>
        )}

        <FormFooter
          onSalvar={handleSalvar}
          onLimpar={handleLimpar}
          salvando={salvando}
          disabled={!isValid}
          formValido={isValid}
          pendenciaTexto={isValid ? undefined : pendenciaTexto}
        />
      </CadernetaLayout>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Protocolo IATF"
        registro={registroSalvo}
        caderneta="protocolo-iatf"
      />
    </>
  )
}

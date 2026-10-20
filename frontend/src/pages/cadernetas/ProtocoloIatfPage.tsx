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
import { cadernetaVisivelNaFazenda } from '../../utils/constants'
import { RootState } from '../../store/store'
import {
  errosProtocoloIatf,
  formVazioProtocoloIatf,
  pendenciaProtocoloIatf,
  situacaoTarefaIatf,
  tarefasPendentes,
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
  const { fazendaId, usuario } = useSelector((state: RootState) => state.config)

  const initial = useCallback(makeInitial, [])
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } = useRascunhoForm<FormProtocoloIatf>({
    rascunhoKey: `protocolo-iatf-${fazendaId}`,
    makeInitial: initial,
  })

  const [lotes, setLotes] = useState<LoteIatfCache[] | null>(null)
  const [marcadasLocalmente, setMarcadasLocalmente] = useState<ReadonlySet<string>>(new Set())
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
      const locais = (await getAllRegistros('protocolo-iatf').catch(() => [])) as unknown as { tarefaId?: string; syncStatus?: string }[]
      if (cancelado) return
      // Marcação com erro de envio não conta: o passo volta a aparecer para ser refeito
      setMarcadasLocalmente(new Set(locais.filter((l) => l.tarefaId && l.syncStatus !== 'error').map((l) => l.tarefaId as string)))
      setLotes(dados)
    })()
    return () => {
      cancelado = true
    }
  }, [fazendaId, refreshTick, showSuccessModal])

  const lote = useMemo(() => (lotes ?? []).find((l) => l.id === form.loteProtocoloId) ?? null, [lotes, form.loteProtocoloId])
  const pendentes = useMemo(() => (lote ? tarefasPendentes(lote, marcadasLocalmente) : []), [lote, marcadasLocalmente])
  const ehIa = form.tarefaTipo === 'Inseminacao'

  const set = (patch: Partial<FormProtocoloIatf>) => setForm((f) => ({ ...f, ...patch }))
  const pendenciaTexto = pendenciaProtocoloIatf(form, hojeBR)
  const isValid = pendenciaTexto === ''

  const escolherLote = (l: LoteIatfCache) =>
    set({
      loteProtocoloId: l.id,
      loteNome: l.nome,
      femeasAtivas: l.femeasAtivas,
      tarefaId: '',
      tarefaRotulo: '',
      tarefaTipo: '',
      tarefaDia: null,
      touroNome: '',
      semenPartida: '',
      tecnico: '',
    })

  const escolherTarefa = (t: TarefaIatfCache) =>
    set({ tarefaId: t.id, tarefaRotulo: t.rotulo, tarefaTipo: t.tipo, tarefaDia: t.dia })

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

  if (!fazendaId || !cadernetaVisivelNaFazenda('protocolo-iatf', fazendaId)) {
    return (
      <CadernetaLayout title="PROTOCOLO IATF" cadernetaId="protocolo-iatf" showRegistrosButton={false}>
        <InfoStrip tone="warning" icon="⚠️">
          {!fazendaId ? 'Configure a fazenda antes de usar esta caderneta.' : 'Esta caderneta ainda está em teste e não está liberada para esta fazenda.'}
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
          Marca o passo feito de um lote de protocolo criado no painel. No passo de inseminação, a IA é lançada para todas as fêmeas ativas do lote. Não altera contagem nem peso.
        </InfoStrip>

        <CadernetaSection numero={1} titulo="Lote de protocolo">
          {lotes === null && <InfoStrip tone="neutral">Carregando lotes...</InfoStrip>}
          {lotes !== null && lotes.length === 0 && (
            <InfoStrip tone="warning" icon="⚠️">
              Nenhum lote de protocolo em andamento neste aparelho. Crie o lote no painel e abra o app com internet para baixar.
            </InfoStrip>
          )}
          {(lotes ?? []).map((l) => {
            const n = tarefasPendentes(l, marcadasLocalmente).length
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
                <InfoStrip tone="warning" icon="🐄">
                  Serão lançadas inseminações para as {form.femeasAtivas} fêmeas ativas do lote.
                </InfoStrip>
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

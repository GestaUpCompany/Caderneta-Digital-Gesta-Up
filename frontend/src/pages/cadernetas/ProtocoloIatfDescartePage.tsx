import { useEffect, useMemo, useState } from 'react'
import { useRefreshTick } from '../../hooks/useRefreshCadastros'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import FormFooter from '../../components/cadernetas/FormFooter'
import SuccessModal from '../../components/SuccessModal'
import { ValidationMessage } from '../../components/ui'
import { salvarRegistro } from '../../services/api'
import { getLotesProtocoloIatfCached } from '../../services/cadastroCache'
import { getAllRegistros } from '../../services/indexedDB'
import { todayBR } from '../../utils/formatDate'
import { cadernetaVisivel } from '../../utils/constants'
import { RootState } from '../../store/store'
import { MOTIVOS_DESCARTE_IATF, formVazioDescarteIatf, type LoteIatfCache } from '../../utils/protocoloIatf'

/**
 * Descartar fêmea do lote de protocolo (perdeu o implante, adoeceu...): o peão tira a fêmea do protocolo no campo, offline.
 * Cada fêmea vira um registro local `protocolo-iatf` com `acao: 'descartar'`; o servidor recebe a RPC idempotente
 * descartar_femea_lote_protocolo. Depois do descarte a fêmea deixa de receber IA e deixa de travar o fechamento do passo de IA.
 */
export default function ProtocoloIatfDescartePage() {
  const navigate = useNavigate()
  const { fazendaId, usuario, acessoIatf } = useSelector((state: RootState) => state.config)

  const [lotes, setLotes] = useState<LoteIatfCache[] | null>(null)
  const [descartadasLocal, setDescartadasLocal] = useState<ReadonlySet<string>>(new Set())
  const [loteId, setLoteId] = useState('')
  const [escolhidas, setEscolhidas] = useState<string[]>([])
  const [motivo, setMotivo] = useState('')
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(undefined)

  const refreshTick = useRefreshTick()

  useEffect(() => {
    if (!fazendaId) return
    let cancelado = false
    ;(async () => {
      const dados = ((await getLotesProtocoloIatfCached(fazendaId).catch(() => null)) || []) as LoteIatfCache[]
      const locais = (await getAllRegistros('protocolo-iatf').catch(() => [])) as unknown as { acao?: string; individuoId?: string; syncStatus?: string }[]
      if (cancelado) return
      setDescartadasLocal(
        new Set(locais.filter((l) => l.acao === 'descartar' && l.individuoId && l.syncStatus !== 'error' && l.syncStatus !== 'synced').map((l) => l.individuoId as string))
      )
      setLotes(dados)
    })()
    return () => {
      cancelado = true
    }
  }, [fazendaId, refreshTick, showSuccessModal])

  const lote = useMemo(() => (lotes ?? []).find((l) => l.id === loteId) ?? null, [lotes, loteId])
  const femeas = useMemo(() => (lote?.femeas ?? []).filter((f) => !descartadasLocal.has(f.individuoId)), [lote, descartadasLocal])

  const alternar = (individuoId: string) =>
    setEscolhidas((atual) => (atual.includes(individuoId) ? atual.filter((id) => id !== individuoId) : [...atual, individuoId]))

  const pendencia = !lote ? 'Escolha o lote de protocolo' : escolhidas.length === 0 ? 'Marque a fêmea a descartar' : ''
  const isValid = pendencia === ''

  const handleSalvar = async () => {
    if (!lote || escolhidas.length === 0) return
    setSalvando(true)
    setErrors([])
    let ultimo: any
    for (const individuoId of escolhidas) {
      const f = lote.femeas?.find((x) => x.individuoId === individuoId)
      const resultado = await salvarRegistro('protocolo-iatf', {
        ...formVazioDescarteIatf(todayBR()),
        loteProtocoloId: lote.id,
        loteNome: lote.nome,
        individuoId,
        femeaRotulo: f?.rotulo ?? '',
        motivoDescarte: motivo,
        usuario,
      })
      if (!resultado.success) {
        setErrors(resultado.errors || [])
        setSalvando(false)
        return
      }
      ultimo = resultado.registro
    }
    setSalvando(false)
    setRegistroSalvo(ultimo)
    setShowSuccessModal(true)
    setEscolhidas([])
    setMotivo('')
  }

  const handleLimpar = () => {
    setLoteId('')
    setEscolhidas([])
    setMotivo('')
    setErrors([])
  }

  if (!fazendaId || !cadernetaVisivel('protocolo-iatf', fazendaId, acessoIatf)) {
    return (
      <CadernetaLayout title="DESCARTAR FÊMEA" cadernetaId="protocolo-iatf" showRegistrosButton={false}>
        <InfoStrip tone="warning" icon="⚠️">
          {!fazendaId ? 'Configure a fazenda antes de usar esta caderneta.' : 'Esta caderneta não está liberada para esta fazenda. Peça ao administrador para ativar o Acesso ao IATF.'}
        </InfoStrip>
      </CadernetaLayout>
    )
  }

  return (
    <>
      <CadernetaLayout title="DESCARTAR FÊMEA" cadernetaId="protocolo-iatf">
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        <InfoStrip tone="neutral" icon="ℹ️">
          Tira do protocolo a fêmea que não vai seguir (perdeu o implante, adoeceu...). Ela deixa de receber a inseminação deste lote. Só o painel de gestão pode reativá-la.
        </InfoStrip>

        <CadernetaSection numero={1} titulo="Lote de protocolo">
          {lotes === null && <InfoStrip tone="neutral">Carregando lotes...</InfoStrip>}
          {lotes !== null && lotes.length === 0 && (
            <InfoStrip tone="warning" icon="⚠️">
              Nenhum lote de protocolo em andamento neste aparelho. Abra o app com internet para baixar.
            </InfoStrip>
          )}
          {(lotes ?? []).map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setLoteId(l.id)
                setEscolhidas([])
              }}
              className={`flex flex-col gap-0.5 rounded-xl border p-3 text-left ${l.id === loteId ? 'border-brand-900 bg-brand-50' : 'border-gray-200 bg-white'}`}
            >
              <span className="text-sm font-extrabold text-gray-900">{l.nome}</span>
              <span className="text-xs text-gray-600">
                D0 {l.data_d0.split('-').reverse().join('/')} · {l.femeasAtivas} {l.femeasAtivas === 1 ? 'fêmea ativa' : 'fêmeas ativas'}
              </span>
            </button>
          ))}
        </CadernetaSection>

        {lote && (
          <CadernetaSection numero={2} titulo="Fêmea a descartar">
            {femeas.length === 0 && <InfoStrip tone="neutral">Este lote não tem fêmeas ativas para descartar neste aparelho.</InfoStrip>}
            <div className="flex flex-col divide-y divide-gray-200 rounded-xl border border-gray-200 bg-white">
              {femeas.map((f) => (
                <label key={f.individuoId} className="flex items-center gap-3 p-3 text-sm font-bold text-gray-900">
                  <input type="checkbox" className="h-5 w-5" checked={escolhidas.includes(f.individuoId)} onChange={() => alternar(f.individuoId)} />
                  {f.rotulo}
                </label>
              ))}
            </div>
          </CadernetaSection>
        )}

        {lote && escolhidas.length > 0 && (
          <CadernetaSection numero={3} titulo="Motivo (opcional)">
            <div className="flex flex-wrap gap-2">
              {MOTIVOS_DESCARTE_IATF.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMotivo(motivo === m ? '' : m)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold ${motivo === m ? 'border-brand-900 bg-brand-50 text-brand-900' : 'border-gray-300 bg-white text-gray-700'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </CadernetaSection>
        )}

        <FormFooter
          onSalvar={handleSalvar}
          onLimpar={handleLimpar}
          salvando={salvando}
          disabled={!isValid}
          formValido={isValid}
          pendenciaTexto={isValid ? undefined : pendencia}
        />
      </CadernetaLayout>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={() => setShowSuccessModal(false)}
        onExit={() => {
          setShowSuccessModal(false)
          navigate('/caderneta/protocolo-iatf')
        }}
        cadernetaName="Descarte de fêmea do protocolo"
        registro={registroSalvo}
        caderneta="protocolo-iatf"
      />
    </>
  )
}

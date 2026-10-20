import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRefreshTick } from '../../hooks/useRefreshCadastros'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Plus, Trash2 } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import FormFooter from '../../components/cadernetas/FormFooter'
import BannerRascunho from '../../components/BannerRascunho'
import SuccessModal from '../../components/SuccessModal'
import AnimalIdentifier from '../../components/AnimalIdentifier'
import { DatePicker, Input, SearchableModal, ValidationMessage } from '../../components/ui'
import { salvarRegistro } from '../../services/api'
import { getLotes } from '../../services/supabaseService'
import { getCachedCadastroData, getLoteByNomeCached, getLotesProtocoloIatfCached, getProtocolosIatfCached } from '../../services/cadastroCache'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { dataBRparaIso } from '../../utils/manejoCurral'
import { todayBR } from '../../utils/formatDate'
import { cadernetaVisivel } from '../../utils/constants'
import { RootState } from '../../store/store'
import type { LoteIatfCache } from '../../utils/protocoloIatf'
import {
  errosLoteProtocolo,
  formVazioLoteProtocolo,
  novaLinhaLoteProtocolo,
  pendenciaLoteProtocolo,
  previaDatasProtocolo,
  type FormLoteProtocolo,
  type ProtocoloIatfCache,
} from '../../utils/loteProtocoloIatf'

interface LoteItem {
  id: string
  nome: string
}

interface FemeaCache {
  id: string
  rotulo: string
  lote_atual: string | null
}

const makeInitial = (): FormLoteProtocolo => formVazioLoteProtocolo(todayBR())

const rotuloDoAnimal = (a: { id_brinco?: string | null; id_chip?: string | null; id_manejo?: string | null; id_provisorio_cria?: string | null }) =>
  a.id_brinco || a.id_chip || a.id_manejo || a.id_provisorio_cria || 'Sem identificação'

export default function ProtocoloIatfNovoLotePage() {
  const navigate = useNavigate()
  const { fazendaId, usuario, acessoIatf } = useSelector((state: RootState) => state.config)

  const initial = useCallback(makeInitial, [])
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } = useRascunhoForm<FormLoteProtocolo>({
    rascunhoKey: `protocolo-iatf-lote-${fazendaId}`,
    makeInitial: initial,
  })

  const [protocolos, setProtocolos] = useState<ProtocoloIatfCache[] | null>(null)
  const [lotes, setLotes] = useState<LoteItem[]>([])
  const [femeas, setFemeas] = useState<FemeaCache[]>([])
  const [loteFiltroNome, setLoteFiltroNome] = useState('')
  const [candidata, setCandidata] = useState<{ id: string; rotulo: string; sexo: string } | null>(null)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(undefined)
  const [identificadorKey, setIdentificadorKey] = useState(0)

  const refreshTick = useRefreshTick()

  // Protocolos ativos (online primeiro; offline usa a última cópia)
  useEffect(() => {
    if (!fazendaId) return
    let cancelado = false
    ;(async () => {
      const dados = ((await getProtocolosIatfCached(fazendaId).catch(() => null)) || []) as ProtocoloIatfCache[]
      if (!cancelado) setProtocolos(dados)
    })()
    return () => {
      cancelado = true
    }
  }, [fazendaId, refreshTick])

  // Fêmeas ativas em lotes de protocolo em andamento (cópia do aparelho): não podem entrar em outro lote ao mesmo tempo.
  // Lote criado neste aparelho e ainda não enviado não está aqui; nesse caso o servidor recusa e o erro volta pela fila.
  const [emOutroLote, setEmOutroLote] = useState<ReadonlyMap<string, string>>(new Map())
  useEffect(() => {
    if (!fazendaId) return
    let cancelado = false
    ;(async () => {
      const lotesAtivos = ((await getLotesProtocoloIatfCached(fazendaId).catch(() => null)) || []) as LoteIatfCache[]
      const mapa = new Map<string, string>()
      for (const l of lotesAtivos) for (const f of l.femeas ?? []) if (!mapa.has(f.individuoId)) mapa.set(f.individuoId, l.nome)
      if (!cancelado) setEmOutroLote(mapa)
    })()
    return () => {
      cancelado = true
    }
  }, [fazendaId, refreshTick])

  // Lotes da fazenda e fêmeas vivas do cadastro local (mesmo caminho da caderneta de Reprodução)
  useEffect(() => {
    if (!fazendaId) return
    let cancelado = false
    const carregar = async () => {
      let dados: any[] = []
      if (navigator.onLine) {
        try {
          dados = (await getLotes(fazendaId)) || []
        } catch {
          dados = []
        }
      }
      const cache = await getCachedCadastroData()
      if (dados.length === 0) {
        const detalhes = await Promise.all((cache?.lotes || []).map((n: string) => getLoteByNomeCached(fazendaId, n)))
        dados = detalhes.filter((l: any) => l && l.ativo !== false && !l.deleted_at)
      }
      if (cancelado) return
      setLotes(
        dados
          .filter((l: any) => l.id && l.nome)
          .map((l: any) => ({ id: l.id as string, nome: l.nome as string }))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      )
      setFemeas(
        ((cache?.individuos || []) as any[])
          .filter((i) => i.sexo === 'Fêmea' && i.status === 'Vivo')
          .map((i) => ({ id: i.id as string, rotulo: rotuloDoAnimal(i), lote_atual: (i.lote_atual as string | null) ?? null }))
      )
    }
    carregar()
    return () => {
      cancelado = true
    }
  }, [fazendaId, refreshTick])

  const protocolo = useMemo(() => (protocolos ?? []).find((p) => p.id === form.protocoloId), [protocolos, form.protocoloId])
  const previa = useMemo(() => previaDatasProtocolo(protocolo, dataBRparaIso(form.data)), [protocolo, form.data])
  const nomesLotes = useMemo(() => lotes.map((l) => l.nome), [lotes])
  const loteFiltro = lotes.find((l) => l.nome === loteFiltroNome) ?? null
  const femeasDoLote = useMemo(
    () => (loteFiltro ? femeas.filter((f) => f.lote_atual === loteFiltro.id && !form.linhas.some((l) => l.individuoId === f.id)) : []),
    [femeas, loteFiltro, form.linhas]
  )

  const set = (patch: Partial<FormLoteProtocolo>) => setForm((f) => ({ ...f, ...patch }))
  const pendenciaTexto = pendenciaLoteProtocolo(form, emOutroLote)
  const isValid = pendenciaTexto === ''

  const adicionarFemeas = (novas: { id: string; rotulo: string }[]) => {
    setForm((f) => {
      const jaTem = new Set(f.linhas.map((l) => l.individuoId))
      const incluir = novas.filter((n) => !jaTem.has(n.id)).map((n) => novaLinhaLoteProtocolo(uuidv4(), n.id, n.rotulo))
      return incluir.length === 0 ? f : { ...f, linhas: [...f.linhas, ...incluir] }
    })
  }

  const adicionarCandidata = () => {
    if (!candidata || candidata.sexo !== 'Fêmea') return
    adicionarFemeas([{ id: candidata.id, rotulo: candidata.rotulo }])
    setCandidata(null)
    setIdentificadorKey((k) => k + 1)
  }

  const removerLinha = (uid: string) => setForm((f) => ({ ...f, linhas: f.linhas.filter((l) => l.uid !== uid) }))

  const handleSalvar = async () => {
    const lista = errosLoteProtocolo(form, emOutroLote)
    if (lista.length > 0) {
      setErrors(lista)
      return
    }
    setSalvando(true)
    setErrors([])
    const resultado = await salvarRegistro('protocolo-iatf-lote', { ...form, usuario })
    setSalvando(false)
    if (!resultado.success) {
      setErrors(resultado.errors || [])
      return
    }
    setRegistroSalvo(resultado.registro)
    setShowSuccessModal(true)
    limparRascunho()
    setCandidata(null)
    setLoteFiltroNome('')
    setIdentificadorKey((k) => k + 1)
  }

  const handleLimpar = () => {
    limparRascunho()
    setErrors([])
    setCandidata(null)
    setLoteFiltroNome('')
    setIdentificadorKey((k) => k + 1)
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
      <CadernetaLayout title="NOVO LOTE DE PROTOCOLO" cadernetaId="protocolo-iatf" showRegistrosButton={false}>
        <InfoStrip tone="warning" icon="⚠️">
          {!fazendaId ? 'Configure a fazenda antes de usar esta caderneta.' : 'Esta caderneta não está liberada para esta fazenda. Peça ao administrador para ativar o Acesso ao IATF.'}
        </InfoStrip>
      </CadernetaLayout>
    )
  }

  return (
    <>
      <CadernetaLayout
        title="NOVO LOTE DE PROTOCOLO"
        cadernetaId="protocolo-iatf"
        showRegistrosButton={false}
        dateContent={<DatePicker value={form.data} onChange={(v) => set({ data: v })} variant="header" compact inline />}
      >
        <BannerRascunho visible={rascunhoRestaurado} onConfirmar={confirmarRascunho} onDescartar={descartarRascunho} />
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        <InfoStrip tone="neutral" icon="ℹ️">
          Monta um lote de protocolo de IATF: protocolo, D0 (data no topo) e fêmeas. As tarefas com as datas nascem no servidor quando o registro sincronizar; só depois o lote aparece na caderneta Protocolo IATF.
        </InfoStrip>

        <CadernetaSection numero={1} titulo="Protocolo">
          {protocolos === null && <InfoStrip tone="neutral">Carregando protocolos...</InfoStrip>}
          {protocolos !== null && protocolos.length === 0 && (
            <InfoStrip tone="warning" icon="⚠️">
              Nenhum protocolo ativo neste aparelho. Cadastre o protocolo no painel e abra o app com internet para baixar.
            </InfoStrip>
          )}
          {(protocolos ?? []).map((p) => {
            const ativo = p.id === form.protocoloId
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => set({ protocoloId: p.id, protocoloNome: p.nome })}
                className={`flex flex-col gap-0.5 rounded-xl border p-3 text-left ${ativo ? 'border-brand-900 bg-brand-50' : 'border-gray-200 bg-white'}`}
              >
                <span className="text-sm font-extrabold text-gray-900">{p.nome}</span>
                <span className="text-xs text-gray-600">{p.passos.map((s) => `D${s.dia} ${s.rotulo}`).join(' · ')}</span>
              </button>
            )
          })}
          {previa && (
            <InfoStrip tone="neutral" icon="📅">
              Datas a partir do D0: {previa}
            </InfoStrip>
          )}
          <Input
            label="NOME DO LOTE DE PROTOCOLO"
            placeholder="Ex: IATF novilhas outubro"
            value={form.nome}
            onChange={(e) => set({ nome: e.target.value })}
          />
          <Input label="RESPONSÁVEL (OPCIONAL)" placeholder="Veterinário ou técnico" value={form.responsavel} onChange={(e) => set({ responsavel: e.target.value })} />
        </CadernetaSection>

        <CadernetaSection numero={2} titulo="Adicionar fêmeas">
          <AnimalIdentifier
            key={identificadorKey}
            fazendaId={fazendaId}
            label="Provisório, brinco, chip ou manejo"
            valueManejo=""
            valueBrinco=""
            valueChip=""
            showAnimalCard
            mensagemNovoAnimal="Animal fora do cadastro: cadastre a fêmea antes de montar o protocolo."
            onChange={({ idManejo, idBrinco, idChip, individuoId, animalData }) => {
              if (!individuoId || !animalData) {
                setCandidata(null)
                return
              }
              setCandidata({
                id: individuoId,
                rotulo: idBrinco || idChip || idManejo || rotuloDoAnimal(animalData),
                sexo: animalData.sexo,
              })
            }}
          />
          {candidata && candidata.sexo !== 'Fêmea' && (
            <InfoStrip tone="danger" icon="⛔">
              Este animal não é fêmea. O protocolo de IATF só vale para fêmeas.
            </InfoStrip>
          )}
          {candidata && candidata.sexo === 'Fêmea' && (
            <button
              type="button"
              onClick={adicionarCandidata}
              className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-brand-900 px-3 py-2.5 text-white transition-colors hover:bg-brand-800 active:scale-[0.99]"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
              <span className="text-sm font-extrabold uppercase tracking-wide">Adicionar {candidata.rotulo}</span>
            </button>
          )}

          {nomesLotes.length > 0 && (
            <SearchableModal
              label=""
              value={loteFiltroNome}
              onChange={(nome: string) => setLoteFiltroNome(nome)}
              options={nomesLotes}
              placeholder="Ou escolha um lote para ver as fêmeas..."
              id="loteProtocoloIatf"
              name="loteProtocoloIatf"
            />
          )}
          {loteFiltro && femeasDoLote.length === 0 && (
            <InfoStrip tone="neutral">
              {femeas.some((f) => f.lote_atual === loteFiltro.id)
                ? 'Todas as fêmeas cadastradas deste lote já estão na lista.'
                : 'Nenhuma fêmea cadastrada neste lote neste aparelho.'}
            </InfoStrip>
          )}
          {loteFiltro && femeasDoLote.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => adicionarFemeas(femeasDoLote)}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-brand-900 px-3 py-2 text-white active:scale-[0.99]"
              >
                <Plus className="h-5 w-5" strokeWidth={2.5} />
                <span className="text-sm font-extrabold uppercase tracking-wide">Adicionar todas ({femeasDoLote.length})</span>
              </button>
              {femeasDoLote.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => adicionarFemeas([f])}
                  className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white p-3 text-left"
                >
                  <span className="text-sm font-semibold text-gray-800">{f.rotulo}</span>
                </button>
              ))}
            </>
          )}
        </CadernetaSection>

        <CadernetaSection numero={3} titulo={`Fêmeas do lote (${form.linhas.length})`}>
          {form.linhas.length === 0 && <InfoStrip tone="neutral">Nenhuma fêmea adicionada ainda.</InfoStrip>}
          {form.linhas.map((l, i) => (
            <div key={l.uid} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3">
              <span className="w-6 text-sm font-extrabold text-gray-400">{i + 1}</span>
              <span className="min-w-0 flex-1 text-sm font-semibold text-gray-800">{l.rotulo}</span>
              <button type="button" aria-label="Remover" className="!min-h-0 p-2 text-red-700" onClick={() => removerLinha(l.uid)}>
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </CadernetaSection>

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
        cadernetaName="Novo lote de protocolo"
        registro={registroSalvo}
        caderneta="protocolo-iatf-lote"
      />
    </>
  )
}

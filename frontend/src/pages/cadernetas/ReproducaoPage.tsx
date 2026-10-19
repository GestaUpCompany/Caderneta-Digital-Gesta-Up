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
import ChoiceGrid from '../../components/cadernetas/ChoiceGrid'
import BannerRascunho from '../../components/BannerRascunho'
import SuccessModal from '../../components/SuccessModal'
import AnimalIdentifier from '../../components/AnimalIdentifier'
import { DatePicker, Input, SearchableModal, Select, ValidationMessage } from '../../components/ui'
import { salvarRegistro } from '../../services/api'
import { getLotes } from '../../services/supabaseService'
import {
  getCachedCadastroData,
  getEstacoesMontaCached,
  getLoteByNomeCached,
  getStatusReprodutivoCached,
} from '../../services/cadastroCache'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { dataBRparaIso } from '../../utils/manejoCurral'
import { todayBR } from '../../utils/formatDate'
import { cadernetaVisivelNaFazenda } from '../../utils/constants'
import { RootState } from '../../store/store'
import {
  METODOS_DIAGNOSTICO,
  RESULTADOS_DIAGNOSTICO,
  TIPOS_EVENTO,
  avisoDeStatus,
  errosReproducao,
  estacaoDaData,
  formVazioReproducao,
  novaLinhaReproducao,
  pendenciaReproducao,
  type EstacaoMonta,
  type FormReproducao,
  type ResultadoDiagnostico,
  type StatusReprodutivoLinha,
  type TipoEvento,
} from '../../utils/reproducao'

interface LoteItem {
  id: string
  nome: string
}

interface FemeaCache {
  id: string
  rotulo: string
  lote_atual: string | null
}

const makeInitial = (): FormReproducao => formVazioReproducao(todayBR())

const rotuloDoAnimal = (a: { id_brinco?: string | null; id_chip?: string | null; id_manejo?: string | null; id_provisorio_cria?: string | null }) =>
  a.id_brinco || a.id_chip || a.id_manejo || a.id_provisorio_cria || 'Sem identificação'

export default function ReproducaoPage() {
  const navigate = useNavigate()
  const { fazendaId, usuario } = useSelector((state: RootState) => state.config)

  const initial = useCallback(makeInitial, [])
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } = useRascunhoForm<FormReproducao>({
    rascunhoKey: `reproducao-${fazendaId}`,
    makeInitial: initial,
  })

  const [lotes, setLotes] = useState<LoteItem[]>([])
  const [femeas, setFemeas] = useState<FemeaCache[]>([])
  const [status, setStatus] = useState<Record<string, StatusReprodutivoLinha>>({})
  const [estacoes, setEstacoes] = useState<EstacaoMonta[]>([])
  const [loteFiltroNome, setLoteFiltroNome] = useState('')
  const [candidata, setCandidata] = useState<{ id: string; rotulo: string; sexo: string } | null>(null)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(undefined)
  const [identificadorKey, setIdentificadorKey] = useState(0)

  const refreshTick = useRefreshTick()
  const hojeBR = todayBR()

  // Lotes (online primeiro, cache offline) e fêmeas vivas do cadastro local
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

  // Status reprodutivo e estações de monta (servidor; offline usa a última cópia)
  useEffect(() => {
    if (!fazendaId) return
    let cancelado = false
    ;(async () => {
      const linhas = (await getStatusReprodutivoCached(fazendaId).catch(() => null)) || []
      const mapa: Record<string, StatusReprodutivoLinha> = {}
      for (const l of linhas as StatusReprodutivoLinha[]) mapa[l.individuo_id] = l
      const est = ((await getEstacoesMontaCached(fazendaId).catch(() => null)) || []) as EstacaoMonta[]
      if (cancelado) return
      setStatus(mapa)
      setEstacoes(est)
    })()
    return () => {
      cancelado = true
    }
  }, [fazendaId, refreshTick])

  const dataIso = dataBRparaIso(form.data) ?? ''
  const estacaoSugerida = useMemo(() => (dataIso ? estacaoDaData(estacoes, dataIso) : null), [estacoes, dataIso])
  const usaEstacao = form.tipo === 'Cobertura' || form.tipo === 'Inseminação'

  // Sugere a estação que cobre a data enquanto o peão não escolheu outra
  useEffect(() => {
    if (!usaEstacao || form.estacaoId) return
    if (estacaoSugerida) setForm((f) => (f.estacaoId ? f : { ...f, estacaoId: estacaoSugerida.id, estacaoNome: estacaoSugerida.nome }))
  }, [usaEstacao, form.estacaoId, estacaoSugerida, setForm])

  const nomesLotes = useMemo(() => lotes.map((l) => l.nome), [lotes])
  const loteFiltro = lotes.find((l) => l.nome === loteFiltroNome) ?? null
  const femeasDoLote = useMemo(
    () => (loteFiltro ? femeas.filter((f) => f.lote_atual === loteFiltro.id && !form.linhas.some((l) => l.individuoId === f.id)) : []),
    [femeas, loteFiltro, form.linhas]
  )

  const set = (patch: Partial<FormReproducao>) => setForm((f) => ({ ...f, ...patch }))
  const pendenciaTexto = pendenciaReproducao(form, hojeBR)
  const isValid = pendenciaTexto === ''

  const adicionarFemeas = (novas: { id: string; rotulo: string }[]) => {
    setForm((f) => {
      const jaTem = new Set(f.linhas.map((l) => l.individuoId))
      const incluir = novas.filter((n) => !jaTem.has(n.id)).map((n) => novaLinhaReproducao(uuidv4(), n.id, n.rotulo))
      return incluir.length === 0 ? f : { ...f, linhas: [...f.linhas, ...incluir] }
    })
  }

  const adicionarCandidata = () => {
    if (!candidata || candidata.sexo !== 'Fêmea') return
    adicionarFemeas([{ id: candidata.id, rotulo: candidata.rotulo }])
    setCandidata(null)
    setIdentificadorKey((k) => k + 1)
  }

  const setLinha = (uid: string, patch: Partial<FormReproducao['linhas'][number]>) =>
    setForm((f) => ({ ...f, linhas: f.linhas.map((l) => (l.uid === uid ? { ...l, ...patch } : l)) }))
  const removerLinha = (uid: string) => setForm((f) => ({ ...f, linhas: f.linhas.filter((l) => l.uid !== uid) }))

  const marcarTodasSemResultado = (resultado: ResultadoDiagnostico) =>
    setForm((f) => ({ ...f, linhas: f.linhas.map((l) => (l.resultado ? l : { ...l, resultado })) }))

  const handleSalvar = async () => {
    const lista = errosReproducao(form, hojeBR)
    if (lista.length > 0) {
      setErrors(lista)
      return
    }
    setSalvando(true)
    setErrors([])
    const resultado = await salvarRegistro('reproducao', { ...form, responsavel: usuario, usuario })
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

  if (!fazendaId || !cadernetaVisivelNaFazenda('reproducao', fazendaId)) {
    return (
      <CadernetaLayout title="REPRODUÇÃO" cadernetaId="reproducao" showRegistrosButton={false}>
        <InfoStrip tone="warning" icon="⚠️">
          {!fazendaId ? 'Configure a fazenda antes de usar esta caderneta.' : 'Esta caderneta ainda está em teste e não está liberada para esta fazenda.'}
        </InfoStrip>
      </CadernetaLayout>
    )
  }

  const ehDiagnostico = form.tipo === 'Diagnóstico de gestação'

  return (
    <>
      <CadernetaLayout
        title="REPRODUÇÃO"
        cadernetaId="reproducao"
        dateContent={<DatePicker value={form.data} onChange={(v) => set({ data: v })} variant="header" compact inline maxDate={todayBR()} />}
      >
        <BannerRascunho visible={rascunhoRestaurado} onConfirmar={confirmarRascunho} onDescartar={descartarRascunho} />
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        <InfoStrip tone="neutral" icon="ℹ️">
          Registra cobertura, inseminação, diagnóstico de gestação ou aborto de fêmeas cadastradas, várias de uma vez. Não altera contagem, peso nem categoria.
        </InfoStrip>

        <CadernetaSection numero={1} titulo="Evento">
          <ChoiceGrid
            options={TIPOS_EVENTO.map((t) => ({ value: t, label: t === 'Diagnóstico de gestação' ? 'DIAGNÓSTICO' : t.toUpperCase() }))}
            value={form.tipo}
            onChange={(v) => set({ tipo: v as TipoEvento, estacaoId: '', estacaoNome: '', metodo: '', linhas: form.linhas.map((l) => ({ ...l, resultado: '', idadeGestacaoDias: '' })) })}
            cols={2}
            size="sm"
            labelSize="xs"
          />
          {usaEstacao && (
            <>
              <Input label="TOURO (OPCIONAL)" placeholder="Nome ou número do touro" value={form.touroNome} onChange={(e) => set({ touroNome: e.target.value })} />
              {form.tipo === 'Inseminação' && (
                <Input label="PARTIDA DO SÊMEN (OPCIONAL)" placeholder="Número da partida" value={form.semenPartida} onChange={(e) => set({ semenPartida: e.target.value })} />
              )}
              <Input label="TÉCNICO / INSEMINADOR (OPCIONAL)" placeholder="Quem realizou" value={form.tecnico} onChange={(e) => set({ tecnico: e.target.value })} />
              {estacoes.length > 0 && (
                <Select
                  label="Estação de monta"
                  value={form.estacaoId}
                  onChange={(e) => {
                    const est = estacoes.find((x) => x.id === e.target.value)
                    set({ estacaoId: est?.id || '', estacaoNome: est?.nome || '' })
                  }}
                  options={[{ value: '', label: 'Sem estação' }, ...estacoes.map((x) => ({ value: x.id, label: x.nome }))]}
                />
              )}
            </>
          )}
          {ehDiagnostico && (
            <Select
              label="Método"
              value={form.metodo}
              onChange={(e) => set({ metodo: e.target.value as FormReproducao['metodo'] })}
              options={[{ value: '', label: 'Não informado' }, ...METODOS_DIAGNOSTICO.map((m) => ({ value: m, label: m }))]}
            />
          )}
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
            mensagemNovoAnimal="Animal fora do cadastro: cadastre a fêmea antes de registrar a reprodução."
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
              Este animal não é fêmea. A reprodução só vale para fêmeas.
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
              id="loteReproducao"
              name="loteReproducao"
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
                  <span className="text-xs text-gray-500">{status[f.id]?.status_reprodutivo ?? 'Sem registro'}</span>
                </button>
              ))}
            </>
          )}
        </CadernetaSection>

        <CadernetaSection numero={3} titulo={`Fêmeas do registro (${form.linhas.length})`}>
          {form.linhas.length === 0 && <InfoStrip tone="neutral">Nenhuma fêmea adicionada ainda.</InfoStrip>}
          {ehDiagnostico && form.linhas.some((l) => !l.resultado) && (
            <>
              <p className="text-xs font-bold uppercase text-gray-500">Marcar as sem resultado como</p>
              <ChoiceGrid
                options={RESULTADOS_DIAGNOSTICO.map((r) => ({ value: r, label: r.toUpperCase() }))}
                value=""
                onChange={(v) => marcarTodasSemResultado(v as ResultadoDiagnostico)}
                cols={3}
                size="sm"
                labelSize="xs"
              />
            </>
          )}
          {form.linhas.map((l, i) => {
            const st = status[l.individuoId]
            const aviso = avisoDeStatus(form.tipo, st?.status_reprodutivo)
            return (
              <div key={l.uid} className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 text-sm font-extrabold text-gray-400">{i + 1}</span>
                  <span className="min-w-0 flex-1 text-sm font-semibold text-gray-800">{l.rotulo}</span>
                  <span className="text-xs text-gray-500">{st?.status_reprodutivo ?? 'Sem registro'}</span>
                  <button type="button" aria-label="Remover" className="!min-h-0 p-2 text-red-700" onClick={() => removerLinha(l.uid)}>
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
                {aviso && (
                  <InfoStrip tone="warning" icon="⚠️">
                    {aviso}
                  </InfoStrip>
                )}
                {ehDiagnostico && (
                  <>
                    <ChoiceGrid
                      options={RESULTADOS_DIAGNOSTICO.map((r) => ({ value: r, label: r.toUpperCase() }))}
                      value={l.resultado}
                      onChange={(v) => setLinha(l.uid, { resultado: v as ResultadoDiagnostico, idadeGestacaoDias: v === 'Prenha' ? l.idadeGestacaoDias : '' })}
                      cols={3}
                      size="sm"
                      labelSize="xs"
                    />
                    {l.resultado === 'Prenha' && (
                      <Input
                        label="DIAS DE GESTAÇÃO (OPCIONAL)"
                        inputMode="numeric"
                        placeholder="Ex: 60"
                        value={l.idadeGestacaoDias}
                        onChange={(e) => setLinha(l.uid, { idadeGestacaoDias: e.target.value.replace(/\D/g, '') })}
                      />
                    )}
                  </>
                )}
              </div>
            )
          })}
          <Input placeholder="Observação (opcional)" value={form.observacao} onChange={(e) => set({ observacao: e.target.value })} />
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
        cadernetaName="Reprodução"
        registro={registroSalvo}
        caderneta="reproducao"
      />
    </>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRefreshTick } from '../../hooks/useRefreshCadastros'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
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
import { getAllRegistros } from '../../services/indexedDB'
import {
  getCachedCadastroData,
  getCarenciasCached,
  getLoteByNomeCached,
  getLoteDetalhesComCategoriasCached,
  getMedicamentosCached,
} from '../../services/cadastroCache'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { dataBRparaIso } from '../../utils/manejoCurral'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import {
  TIPOS_APLICACAO,
  aplicarMedicamentoNoForm,
  carenciaDeRegistroLocal,
  carenciaDoAlvo,
  errosSanidade,
  formVazioSanidade,
  pendenciaSanidade,
  textoCarencia,
  type AlvoAplicacao,
  type CarenciaLinha,
  type FormSanidade,
  type MedicamentoCatalogo,
  type TipoAplicacao,
} from '../../utils/sanidade'

interface LoteItem {
  id: string
  nome: string
}

/** Máscara DD/MM/AAAA enquanto digita (campo opcional: vazio continua vazio). */
function mascaraData(texto: string): string {
  const d = texto.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

// Estado inicial determinístico: o hook de rascunho compara com ele para saber se a tela está vazia
const makeInitial = (): FormSanidade => formVazioSanidade(todayBR())

export default function SanidadePage() {
  const navigate = useNavigate()
  const { fazendaId, usuario } = useSelector((state: RootState) => state.config)

  const initial = useCallback(makeInitial, [])
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } = useRascunhoForm<FormSanidade>({
    rascunhoKey: `sanidade-${fazendaId}`,
    makeInitial: initial,
  })

  const [lotes, setLotes] = useState<LoteItem[]>([])
  const [categoriasDoLote, setCategoriasDoLote] = useState<string[]>([])
  const [catalogo, setCatalogo] = useState<MedicamentoCatalogo[]>([])
  const [carencias, setCarencias] = useState<CarenciaLinha[]>([])
  const [loteDoAnimal, setLoteDoAnimal] = useState<{ id: string; categoria: string } | null>(null)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(undefined)
  const [identificadorKey, setIdentificadorKey] = useState(0)

  const refreshTick = useRefreshTick()
  const hojeBR = todayBR()
  const hojeIso = dataBRparaIso(hojeBR) ?? ''

  // Lotes (online primeiro, cache offline)
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
      if (dados.length === 0) {
        const cache = await getCachedCadastroData()
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
    }
    carregar()
    return () => {
      cancelado = true
    }
  }, [fazendaId, refreshTick])

  // Catálogo de medicamentos e carências em vigor (servidor + as ainda não enviadas deste aparelho)
  useEffect(() => {
    if (!fazendaId) return
    let cancelado = false
    const carregar = async () => {
      try {
        const meds = (await getMedicamentosCached(fazendaId)) || []
        if (!cancelado) setCatalogo(meds as MedicamentoCatalogo[])
      } catch {
        /* sem catálogo: o produto é digitado */
      }
      const doServidor = ((await getCarenciasCached(fazendaId, hojeIso).catch(() => null)) || []) as CarenciaLinha[]
      const locais = ((await getAllRegistros('sanidade').catch(() => [])) || [])
        .map((r) => carenciaDeRegistroLocal(r as unknown as Record<string, unknown>))
        .filter((l): l is CarenciaLinha => !!l)
      if (!cancelado) setCarencias([...doServidor, ...locais])
    }
    carregar()
    return () => {
      cancelado = true
    }
  }, [fazendaId, hojeIso, refreshTick, showSuccessModal])

  // Categorias do lote escolhido (alvo lote)
  useEffect(() => {
    if (form.alvo !== 'lote' || !form.loteId) {
      setCategoriasDoLote([])
      return
    }
    let cancelado = false
    getLoteDetalhesComCategoriasCached(form.loteId)
      .then((d) => {
        if (cancelado) return
        const cats = ((d?.categorias_raw || []) as { categoria?: string }[]).map((c) => c.categoria).filter(Boolean) as string[]
        setCategoriasDoLote(cats)
      })
      .catch(() => {
        if (!cancelado) setCategoriasDoLote([])
      })
    return () => {
      cancelado = true
    }
  }, [form.alvo, form.loteId])

  const nomesLotes = useMemo(() => lotes.map((l) => l.nome), [lotes])
  const opcoesProduto = useMemo(
    () => [
      { value: '', label: 'Outro produto (digitar)' },
      ...catalogo.map((m) => ({ value: m.id, label: m.nome_comercial })),
    ],
    [catalogo]
  )

  const carencia = useMemo(
    () =>
      carenciaDoAlvo(
        carencias,
        form.alvo === 'animal'
          ? { individuoId: form.individuoId || undefined, loteId: loteDoAnimal?.id, categoria: loteDoAnimal?.categoria }
          : { loteId: form.loteId || undefined, categoria: form.categoria || undefined },
        hojeIso
      ),
    [carencias, form.alvo, form.individuoId, form.loteId, form.categoria, loteDoAnimal, hojeIso]
  )

  const set = (patch: Partial<FormSanidade>) => setForm((f) => ({ ...f, ...patch }))
  const pendenciaTexto = pendenciaSanidade(form, hojeBR)
  const isValid = pendenciaTexto === ''

  const handleSalvar = async () => {
    const lista = errosSanidade(form, hojeBR)
    if (lista.length > 0) {
      setErrors(lista)
      return
    }
    setSalvando(true)
    setErrors([])
    const resultado = await salvarRegistro('sanidade', {
      ...form,
      responsavel: usuario,
      usuario,
    })
    setSalvando(false)
    if (!resultado.success) {
      setErrors(resultado.errors || [])
      return
    }
    setRegistroSalvo(resultado.registro)
    setShowSuccessModal(true)
    limparRascunho()
    setLoteDoAnimal(null)
    setIdentificadorKey((k) => k + 1)
  }

  const handleLimpar = () => {
    limparRascunho()
    setErrors([])
    setLoteDoAnimal(null)
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

  if (!fazendaId) {
    return (
      <CadernetaLayout title="SANIDADE" cadernetaId="sanidade" showRegistrosButton={false}>
        <InfoStrip tone="warning" icon="⚠️">
          Configure a fazenda antes de usar esta caderneta.
        </InfoStrip>
      </CadernetaLayout>
    )
  }

  return (
    <>
      <CadernetaLayout
        title="SANIDADE"
        cadernetaId="sanidade"
        showRegistrosButton={false}
        dateContent={<DatePicker value={form.data} onChange={(v) => set({ data: v })} variant="header" compact inline maxDate={todayBR()} />}
      >
        <BannerRascunho visible={rascunhoRestaurado} onConfirmar={confirmarRascunho} onDescartar={descartarRascunho} />
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        <InfoStrip tone="neutral" icon="ℹ️">
          Registra vacina, vermífugo ou tratamento. Não altera a contagem nem o peso do lote. A carência só avisa, nunca bloqueia.
        </InfoStrip>

        <CadernetaSection numero={1} titulo="Tipo e alvo">
          <ChoiceGrid
            options={TIPOS_APLICACAO.map((t) => ({ value: t, label: t.toUpperCase() }))}
            value={form.tipo}
            onChange={(v) => set({ tipo: v as TipoAplicacao })}
            cols={3}
            size="sm"
            labelSize="xs"
          />
          <ChoiceGrid
            options={[
              { value: 'animal', label: 'UM ANIMAL', icon: '🐄' },
              { value: 'lote', label: 'UM LOTE', icon: '📍' },
            ]}
            value={form.alvo}
            onChange={(v) => {
              setLoteDoAnimal(null)
              setIdentificadorKey((k) => k + 1)
              set({ alvo: v as AlvoAplicacao, individuoId: '', idManejo: '', brinco: '', chip: '', loteId: '', loteNome: '', categoria: '', numeroCabecas: '' })
            }}
            cols={2}
          />

          {form.alvo === 'animal' ? (
            <>
              <AnimalIdentifier
                key={identificadorKey}
                fazendaId={fazendaId}
                label="Provisório, brinco, chip ou manejo"
                valueManejo={form.idManejo}
                valueBrinco={form.brinco}
                valueChip={form.chip}
                showAnimalCard
                mensagemNovoAnimal="Animal fora do cadastro: aplique no lote, ou cadastre o animal antes."
                onChange={({ idManejo, idBrinco, idChip, individuoId, animalData }) => {
                  setLoteDoAnimal(animalData?.lote_atual ? { id: animalData.lote_atual, categoria: animalData.categoria || '' } : null)
                  set({ idManejo, brinco: idBrinco, chip: idChip, individuoId: individuoId || '' })
                }}
              />
            </>
          ) : (
            <>
              {nomesLotes.length > 0 ? (
                <SearchableModal
                  label=""
                  value={form.loteNome}
                  onChange={(nome: string) => {
                    const l = lotes.find((x) => x.nome === nome)
                    set({ loteId: l?.id || '', loteNome: l?.nome || '', categoria: '' })
                  }}
                  options={nomesLotes}
                  placeholder="Escolha o lote..."
                  id="loteSanidade"
                  name="loteSanidade"
                />
              ) : (
                <Input label="LOTE" placeholder="Nenhum lote neste aparelho. Conecte à internet e atualize os dados" value="" onChange={() => {}} disabled />
              )}
              {categoriasDoLote.length > 0 && (
                <Select
                  label="Categoria (opcional)"
                  value={form.categoria}
                  onChange={(e) => set({ categoria: e.target.value })}
                  options={[{ value: '', label: 'Todas as categorias do lote' }, ...categoriasDoLote.map((c) => ({ value: c, label: c }))]}
                />
              )}
              <Input
                label="CABEÇAS QUE RECEBERAM"
                inputMode="numeric"
                placeholder="Quantas cabeças"
                value={form.numeroCabecas}
                onChange={(e) => set({ numeroCabecas: e.target.value.replace(/\D/g, '') })}
              />
            </>
          )}

          {carencia && (
            <InfoStrip tone="warning" icon="⛔">
              {textoCarencia(carencia)}
            </InfoStrip>
          )}
        </CadernetaSection>

        <CadernetaSection numero={2} titulo="Produto">
          <Select
            label="Produto do catálogo"
            value={form.medicamentoId}
            onChange={(e) => setForm((f) => aplicarMedicamentoNoForm(f, catalogo.find((m) => m.id === e.target.value) ?? null))}
            options={opcoesProduto}
          />
          <Input label="PRODUTO APLICADO" placeholder="Nome do produto" value={form.medicamentoNome} onChange={(e) => set({ medicamentoNome: e.target.value })} />
          <Input label="DOSE (OPCIONAL)" placeholder="Ex: 2 ml" value={form.dose} onChange={(e) => set({ dose: e.target.value })} />
          <Input label="VIA (OPCIONAL)" placeholder="Ex: subcutânea" value={form.via} onChange={(e) => set({ via: e.target.value })} />
        </CadernetaSection>

        <CadernetaSection numero={3} titulo="Carência e próxima dose">
          <Input
            label="CARÊNCIA PARA ABATE (DIAS)"
            inputMode="numeric"
            placeholder="Sem carência"
            value={form.carenciaDias}
            onChange={(e) => set({ carenciaDias: e.target.value.replace(/\D/g, '') })}
          />
          <Input
            label="REAPLICAR EM (DIAS)"
            inputMode="numeric"
            placeholder="Sem próxima dose"
            value={form.intervaloDias}
            onChange={(e) => set({ intervaloDias: e.target.value.replace(/\D/g, '') })}
          />
        </CadernetaSection>

        <CadernetaSection numero={4} titulo="Detalhes (opcional)">
          <Input label="PARTIDA DO PRODUTO" placeholder="Número da partida" value={form.loteProduto} onChange={(e) => set({ loteProduto: e.target.value })} />
          <Input
            label="VALIDADE DO PRODUTO"
            inputMode="numeric"
            placeholder="DD/MM/AAAA"
            maxLength={10}
            value={form.validadeProduto}
            onChange={(e) => set({ validadeProduto: mascaraData(e.target.value) })}
          />
          {form.tipo === 'Tratamento' && (
            <Input label="DIAGNÓSTICO" placeholder="O que foi tratado" value={form.diagnostico} onChange={(e) => set({ diagnostico: e.target.value })} />
          )}
          <Input label="OBSERVAÇÃO" placeholder="Opcional" value={form.observacao} onChange={(e) => set({ observacao: e.target.value })} />
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
        cadernetaName="Sanidade"
        registro={registroSalvo}
        caderneta="sanidade"
      />
    </>
  )
}

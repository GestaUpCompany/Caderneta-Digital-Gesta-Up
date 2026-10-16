import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { v4 as uuidv4 } from 'uuid'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import FormFooter from '../../components/cadernetas/FormFooter'
import BannerRascunho from '../../components/BannerRascunho'
import SuccessModal from '../../components/SuccessModal'
import AnimalIdentifier from '../../components/AnimalIdentifier'
import { DatePicker, Input, Select, SearchableModal, ValidationMessage } from '../../components/ui'
import { salvarRegistro } from '../../services/api'
import { getLotes } from '../../services/supabaseService'
import { getCachedCadastroData, getLoteByNomeCached, getRacasCached } from '../../services/cadastroCache'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import {
  faltaParaAnimalNovo,
  linhaVazia,
  novaLinha,
  resumirLinha,
  type LinhaManejo,
  type MotivoTroca,
} from '../../utils/manejoCurral'

interface FormState {
  data: string
  sessaoId: string
  iniciadaEm: string
  observacao: string
  linhas: LinhaManejo[]
  linha: LinhaManejo
}

interface LoteItem {
  id: string
  nome: string
}

const CATEGORIAS = [
  'Bezerro ao Pé', 'Bezerra ao Pé', 'Garrote', 'Garrota', 'Novilho', 'Novilha',
  'Boi Magro', 'Boi Gordo', 'Vaca Parida', 'Vaca Vazia', 'Touro',
]

const MOTIVOS: { value: string; label: string }[] = [
  { value: '', label: 'Não informar' },
  { value: 'definitivo', label: 'Brinco definitivo (era provisório)' },
  { value: 'perdido', label: 'Brinco perdido' },
  { value: 'trocado', label: 'Brinco trocado' },
]

const makeInitial = (): FormState => ({
  data: todayBR(),
  sessaoId: uuidv4(),
  iniciadaEm: new Date().toISOString(),
  observacao: '',
  linhas: [],
  linha: novaLinha(uuidv4()),
})

export default function ManejoCurralPage() {
  const navigate = useNavigate()
  const { fazendaId, usuario } = useSelector((state: RootState) => state.config)

  const initial = useCallback(makeInitial, [])
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } = useRascunhoForm<FormState>({
    rascunhoKey: `manejo-curral-${fazendaId}`,
    makeInitial: initial,
  })

  const [editandoUid, setEditandoUid] = useState<string | null>(null)
  const [lotes, setLotes] = useState<LoteItem[]>([])
  const [racas, setRacas] = useState<string[]>([])
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [avisoLinha, setAvisoLinha] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(undefined)

  // Lotes e raças (online primeiro, cache offline)
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
      try {
        const r = await getRacasCached(fazendaId)
        if (!cancelado) setRacas((r || []).map((x: any) => x.nome).filter(Boolean))
      } catch {
        /* sem cache de raças */
      }
    }
    carregar()
    return () => {
      cancelado = true
    }
  }, [fazendaId])

  const nomesLotes = useMemo(() => lotes.map((l) => l.nome), [lotes])
  const opcoesRaca = useMemo(() => [{ value: '', label: 'Selecione...' }, ...racas.map((r) => ({ value: r, label: r }))], [racas])

  const linha = form.linha
  const setLinha = (patch: Partial<LinhaManejo>) => setForm((f) => ({ ...f, linha: { ...f.linha, ...patch } }))

  const adicionarLinha = () => {
    if (linhaVazia(linha)) {
      setAvisoLinha('Informe o animal, uma identificação nova, o lote ou o peso')
      return
    }
    setAvisoLinha(null)
    setForm((f) => {
      const existe = f.linhas.some((l) => l.uid === f.linha.uid)
      return {
        ...f,
        linhas: existe ? f.linhas.map((l) => (l.uid === f.linha.uid ? f.linha : l)) : [...f.linhas, f.linha],
        linha: novaLinha(uuidv4()),
      }
    })
    setEditandoUid(null)
  }

  const editarLinha = (uid: string) => {
    const alvo = form.linhas.find((l) => l.uid === uid)
    if (!alvo) return
    setForm((f) => ({ ...f, linha: alvo }))
    setEditandoUid(uid)
    setAvisoLinha(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const removerLinha = (uid: string) => {
    setForm((f) => ({
      ...f,
      linhas: f.linhas.filter((l) => l.uid !== uid),
      linha: editandoUid === uid ? novaLinha(uuidv4()) : f.linha,
    }))
    if (editandoUid === uid) setEditandoUid(null)
  }

  // Linha em edição e ainda não adicionada: entra na sessão ao salvar, para ninguém perder o último animal
  const linhasParaSalvar = useMemo(() => {
    const jaNaLista = form.linhas.some((l) => l.uid === form.linha.uid)
    return !linhaVazia(form.linha) && !jaNaLista ? [...form.linhas, form.linha] : form.linhas
  }, [form.linhas, form.linha])

  const animalNovoIncompleto = useMemo(
    () =>
      linhasParaSalvar.some(
        (l) => !l.individuoId && l.identificadorLido.trim() === '' && !linhaVazia(l) && faltaParaAnimalNovo(l).length > 0
      ),
    [linhasParaSalvar]
  )

  const isValid = linhasParaSalvar.length > 0
  const pendenciaTexto = isValid ? undefined : 'Falta registrar ao menos um animal'

  const handleSalvar = async () => {
    if (!isValid) {
      setErrors([{ field: 'linhas', message: 'Registre ao menos um animal' }])
      return
    }
    setSalvando(true)
    setErrors([])
    const resultado = await salvarRegistro('manejo-curral', {
      id: form.sessaoId,
      data: form.data,
      responsavel: usuario,
      usuario,
      observacao: form.observacao,
      iniciadaEm: form.iniciadaEm,
      finalizadaEm: new Date().toISOString(),
      linhas: linhasParaSalvar,
    })
    setSalvando(false)
    if (!resultado.success) {
      setErrors(resultado.errors || [])
      return
    }
    setRegistroSalvo(resultado.registro)
    setShowSuccessModal(true)
    limparRascunho()
    setEditandoUid(null)
  }

  const handleLimpar = () => {
    limparRascunho()
    setErrors([])
    setAvisoLinha(null)
    setEditandoUid(null)
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
      <CadernetaLayout title="MANEJO DE CURRAL" cadernetaId="manejo-curral" showRegistrosButton={false}>
        <InfoStrip tone="warning" icon="⚠️">
          Configure a fazenda antes de usar esta caderneta.
        </InfoStrip>
      </CadernetaLayout>
    )
  }

  return (
    <>
      <CadernetaLayout
        title="MANEJO DE CURRAL"
        cadernetaId="manejo-curral"
        showRegistrosButton={false}
        dateContent={<DatePicker value={form.data} onChange={(v) => setForm((f) => ({ ...f, data: v }))} variant="header" compact inline maxDate={todayBR()} />}
      >
        <BannerRascunho visible={rascunhoRestaurado} onConfirmar={confirmarRascunho} onDescartar={descartarRascunho} />
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        <InfoStrip tone="neutral" icon="ℹ️">
          Nada é obrigatório. O lote de destino só muda depois que o gestor confirmar, e o peso fica só no animal.
        </InfoStrip>

        <CadernetaSection numero={1} titulo={editandoUid ? 'Animal (editando)' : `Animal ${form.linhas.length + 1}`}>
          <AnimalIdentifier
            key={linha.uid}
            fazendaId={fazendaId}
            label="Provisório, brinco, chip ou manejo"
            valueManejo={linha.lidoManejo}
            valueBrinco={linha.lidoBrinco}
            valueChip={linha.lidoChip}
            showAnimalCard
            mensagemNovoAnimal="ID não encontrado: preencha os dados do animal novo abaixo."
            onChange={({ idManejo, idBrinco, idChip, individuoId, animalData }) => {
              const lido = idManejo || idBrinco || idChip || animalData?.id_provisorio_cria || ''
              setForm((f) => ({
                ...f,
                linha: {
                  ...f.linha,
                  individuoId,
                  identificadorLido: lido,
                  lidoManejo: idManejo,
                  lidoBrinco: idBrinco,
                  lidoChip: idChip,
                  idProvisorioAnterior: animalData?.id_provisorio_cria || '',
                  sexo: animalData ? '' : f.linha.sexo,
                  categoria: animalData ? '' : f.linha.categoria,
                  raca: animalData ? '' : f.linha.raca,
                },
              }))
            }}
          />
          {!linha.individuoId && linha.identificadorLido.trim() !== '' && (
            <>
              <InfoStrip tone="warning" icon="⚠️">
                Animal não encontrado. Para cadastrá-lo como novo, preencha os dados; se deixar em branco, a linha é guardada e o
                gestor resolve.
              </InfoStrip>
              <Select
                label="Sexo"
                value={linha.sexo}
                onChange={(e) => setLinha({ sexo: e.target.value as LinhaManejo['sexo'] })}
                options={[{ value: '', label: 'Selecione...' }, { value: 'Macho', label: 'Macho' }, { value: 'Fêmea', label: 'Fêmea' }]}
              />
              <Select
                label="Categoria"
                value={linha.categoria}
                onChange={(e) => setLinha({ categoria: e.target.value })}
                options={[{ value: '', label: 'Selecione...' }, ...CATEGORIAS.map((c) => ({ value: c, label: c }))]}
              />
              <Select label="Raça" value={linha.raca} onChange={(e) => setLinha({ raca: e.target.value })} options={opcoesRaca} />
            </>
          )}
        </CadernetaSection>

        <CadernetaSection numero={2} titulo="Identificação nova">
          <Input label="Brinco novo" value={linha.idBrincoNovo} onChange={(e) => setLinha({ idBrincoNovo: e.target.value })} />
          <Input label="Chip novo" value={linha.idChipNovo} onChange={(e) => setLinha({ idChipNovo: e.target.value })} />
          <Input label="ID de manejo novo" value={linha.idManejoNovo} onChange={(e) => setLinha({ idManejoNovo: e.target.value })} />
          <Select
            label="Motivo"
            value={linha.motivoTroca}
            onChange={(e) => setLinha({ motivoTroca: e.target.value as MotivoTroca })}
            options={MOTIVOS}
          />
        </CadernetaSection>

        <CadernetaSection numero={3} titulo="Lote de destino e peso">
          {nomesLotes.length > 0 ? (
            <SearchableModal
              label=""
              value={linha.loteDestinoNome}
              onChange={(nome: string) => {
                const l = lotes.find((x) => x.nome === nome)
                setLinha({ loteDestinoId: l?.id || '', loteDestinoNome: l?.nome || '' })
              }}
              options={nomesLotes}
              placeholder="Lote de destino (opcional)..."
              id="loteDestino"
              name="loteDestino"
            />
          ) : (
            <Input label="LOTE DE DESTINO" placeholder="Nenhum lote neste aparelho. Conecte à internet e atualize os dados" value="" onChange={() => {}} disabled />
          )}
          <Input
            label="Peso (kg, opcional)"
            inputMode="decimal"
            value={linha.pesoKg}
            onChange={(e) => setLinha({ pesoKg: e.target.value })}
            helper="O peso fica só neste animal; não altera o peso do lote."
          />
          <Input label="Observação (opcional)" value={linha.observacao} onChange={(e) => setLinha({ observacao: e.target.value })} />
          {avisoLinha && <InfoStrip tone="danger">{avisoLinha}</InfoStrip>}
          <button
            type="button"
            onClick={adicionarLinha}
            className="flex min-h-[56px] items-center justify-center gap-2 rounded-xl bg-brand-900 px-3 py-2.5 text-white transition-colors hover:bg-brand-800 active:scale-[0.99]"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
            <span className="text-sm font-extrabold uppercase tracking-wide">{editandoUid ? 'Salvar alteração' : 'Adicionar animal'}</span>
          </button>
        </CadernetaSection>

        <CadernetaSection numero={4} titulo={`Animais da sessão (${form.linhas.length})`}>
          {form.linhas.length === 0 && <InfoStrip tone="neutral">Nenhum animal adicionado ainda.</InfoStrip>}
          {form.linhas.map((l, i) => (
            <div key={l.uid} className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-3">
              <span className="w-6 text-sm font-extrabold text-gray-400">{i + 1}</span>
              <span className="min-w-0 flex-1 text-sm font-semibold text-gray-800">{resumirLinha(l)}</span>
              <button type="button" aria-label="Editar" className="!min-h-0 p-2 text-gray-700" onClick={() => editarLinha(l.uid)}>
                <Pencil className="h-5 w-5" />
              </button>
              <button type="button" aria-label="Excluir" className="!min-h-0 p-2 text-red-700" onClick={() => removerLinha(l.uid)}>
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
          {animalNovoIncompleto && (
            <InfoStrip tone="warning" icon="⚠️">
              Há animal novo sem todos os dados (identificação, lote, categoria, sexo e raça). Ele será guardado e o gestor resolve.
            </InfoStrip>
          )}
          <Input
            placeholder="Observação da sessão (opcional)"
            value={form.observacao}
            onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
          />
        </CadernetaSection>

        <FormFooter
          onSalvar={handleSalvar}
          onLimpar={handleLimpar}
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
        cadernetaName="Manejo de Curral"
        registro={registroSalvo}
        caderneta="manejo-curral"
      />
    </>
  )
}

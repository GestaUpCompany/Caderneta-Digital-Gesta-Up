import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Input, Select, DatePicker, Radio, ValidationMessage } from '../../components/ui'
import { Brush, Save, Plus, Trash2, Video } from 'lucide-react'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import BannerRascunho from '../../components/BannerRascunho'
import { salvarRegistro, listarRegistros } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { normalizarNumero } from '../../utils/formatNumber'
import { RootState } from '../../store/store'
import { scrollToFirstError } from '../../utils/scrollToError'
import { useFormValidation } from '../../hooks/useFormValidation'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { getOrdensServicoAbertasCached, getLotesAtivosCached, getLoteByNomeCached } from '../../services/cadastroCache'

// Itens do checklist diagnóstico do laudo de recebimento
const CHECKLIST_ITENS = [
  'Animais estressados',
  'Animais rastreados/machucados',
  'Animal debilitado',
  'Pneumonia (tosse/secreção)',
  'Animal mancando',
  'Problema de pele',
  'Miíase (bicheira)',
  'Sem orelha',
  'Animal quebrado/fratura',
  'Problema de casco',
  'Animal deitado/pisoteado',
  'Má formação',
  'Papilomatose',
  'Carrapatos',
  'Intoxicação',
  'Umbigueira/hérnia',
  'Fraturas recuperadas',
  'Animal morto no transporte',
]

const CATEGORIAS_RECEBIMENTO = [
  'Bezerro ao Pé', 'Bezerra ao Pé', 'Bezerro Desmama', 'Bezerra Desmama',
  'Bezerro', 'Bezerra', 'Garrote', 'Novilha', 'Boi Magro', 'Boi Gordo',
  'Tourinho', 'Touro', 'Vaca', 'Tropa',
]

interface ContagemRow {
  categoria: string
  femeas: string
  machos: string
}

interface ChecklistRow {
  item: string
  resposta: 'S' | 'N' | ''
  observacao: string
}

interface FormState {
  data: string
  osId: string
  // Documental / transporte
  numeroGta: string
  numeroNf: string
  docOrigem: string
  transportadora: string
  placaVeiculo: string
  placaReboque: string
  motorista: string
  dataChegada: string
  horaChegada: string
  // Pesagem coletiva
  pesoMedioBalancao: string
  pesoOrigem: string
  horaPesagem: string
  // Destino
  loteId: string
  loteNome: string
  destino: string
  // Checklist e achados
  scoreCorporal: string
  mortes: string
  // Assinaturas
  responsavel: string
  auxiliar: string
  observacao: string
  contagens: ContagemRow[]
  checklist: ChecklistRow[]
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  osId: '',
  numeroGta: '',
  numeroNf: '',
  docOrigem: '',
  transportadora: '',
  placaVeiculo: '',
  placaReboque: '',
  motorista: '',
  dataChegada: todayBR(),
  horaChegada: '',
  pesoMedioBalancao: '',
  pesoOrigem: '',
  horaPesagem: '',
  loteId: '',
  loteNome: '',
  destino: '',
  scoreCorporal: '',
  mortes: '0',
  responsavel: '',
  auxiliar: '',
  observacao: '',
  contagens: [{ categoria: '', femeas: '', machos: '' }],
  checklist: CHECKLIST_ITENS.map((item) => ({ item, resposta: '', observacao: '' })),
})

export default function RecebimentoCompraPage() {
  const navigate = useNavigate()
  const { usuario, fazendaId } = useSelector((state: RootState) => state.config)
  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'recebimento-compra', makeInitial })

  const contagens = form.contagens
  const checklist = form.checklist
  const setContagens = (fn: (prev: ContagemRow[]) => ContagemRow[]) =>
    setForm((prev) => ({ ...prev, contagens: fn(prev.contagens) }))
  const setChecklist = (fn: (prev: ChecklistRow[]) => ChecklistRow[]) =>
    setForm((prev) => ({ ...prev, checklist: fn(prev.checklist) }))
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoErro, setVideoErro] = useState<string | null>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const [osAbertas, setOsAbertas] = useState<any[]>([])
  const [lotes, setLotes] = useState<{ id: string; nome: string }[]>([])
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)

  // OS de compra elegíveis (aberta ou já parcialmente recebida) + comunicados
  // de compra locais ainda não sincronizados (recebimento pode ser offline).
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!fazendaId) return
      try {
        const [remotas, locais] = await Promise.all([
          getOrdensServicoAbertasCached(fazendaId, 'compra'),
          listarRegistros('ordens-servico'),
        ])
        const mapa = new Map<string, any>()
        ;(remotas || []).forEach((o: any) => mapa.set(o.id, o))
        locais
          .filter((r) => r.tipo === 'compra' && !['fechada', 'cancelada'].includes((r.statusOs as string) || 'aberta'))
          .forEach((r) => {
            const id = (r.supabaseId as string) || r.id
            mapa.set(id, {
              id,
              numero_os: (r.numeroOs as string) || null,
              quantidade_prevista: r.quantidadePrevista ? Number(r.quantidadePrevista) : null,
              fornecedor: (r.fornecedor as string) || null,
              origem_fazenda: (r.origemFazenda as string) || null,
              created_at: (r.lastModified as string) || null,
              pendenteSync: r.syncStatus !== 'synced',
            })
          })
        if (!cancelled) {
          setOsAbertas([...mapa.values()].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')))
        }
      } catch {
        /* offline sem cache: lista vazia */
      }
      try {
        const { lotes: nomes } = await getLotesAtivosCached(fazendaId)
        const comId = await Promise.all(
          nomes.map(async (nome) => {
            const lote = await getLoteByNomeCached(fazendaId, nome)
            return lote ? { id: lote.id as string, nome } : null
          })
        )
        if (!cancelled) setLotes(comId.filter((l): l is { id: string; nome: string } => l !== null))
      } catch {
        /* sem lotes disponíveis */
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [fazendaId])

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const totalRecebido = useMemo(
    () => contagens.reduce((s, c) => s + (Number(c.femeas) || 0) + (Number(c.machos) || 0), 0),
    [contagens]
  )

  const osSelecionada = osAbertas.find((o) => o.id === form.osId) || null

  const validationRules: any = {
    data: { required: true },
    osId: { required: true },
    numeroGta: { required: true },
    dataChegada: { required: true },
    loteId: { required: true },
    responsavel: { required: true },
    contagensCheck: {
      custom: () => (totalRecebido <= 0 ? 'Informe a quantidade recebida por categoria/sexo' : null),
    },
  }

  const { isValid } = useFormValidation({ ...form, contagensCheck: totalRecebido > 0 ? 'ok' : '' }, validationRules)

  const setContagem = (idx: number, field: keyof ContagemRow, value: string) => {
    setContagens((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)))
  }

  const addContagem = () => setContagens((prev) => [...prev, { categoria: '', femeas: '', machos: '' }])
  const removeContagem = (idx: number) => setContagens((prev) => prev.filter((_, i) => i !== idx))

  const setChecklistItem = (idx: number, field: keyof ChecklistRow, value: string) => {
    setChecklist((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)))
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setVideoErro(null)
    if (file && file.size > 450 * 1024 * 1024) {
      setVideoErro('Vídeo muito grande (máx. ~450 MB). Grave um trecho mais curto.')
      e.target.value = ''
      return
    }
    if (file && file.size > 100 * 1024 * 1024) {
      setVideoErro(`Vídeo de ${(file.size / 1024 / 1024).toFixed(0)} MB. O envio pode demorar quando houver conexão.`)
    }
    setVideoFile(file)
  }

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const recebimentoId = crypto.randomUUID()
    const sessaoId = `receb-${recebimentoId}`

    const contagensPayload = contagens
      .filter((c) => c.categoria && (Number(c.femeas) > 0 || Number(c.machos) > 0))
      .map((c) => ({
        categoria: c.categoria,
        femeas: Number(c.femeas) || 0,
        machos: Number(c.machos) || 0,
      }))

    const result = await salvarRegistro('os-recebimentos', {
      id: recebimentoId,
      data: form.data,
      usuario,
      responsavel: form.responsavel.trim() || usuario,
      osId: form.osId,
      numeroGta: form.numeroGta.trim(),
      numeroNf: form.numeroNf.trim() || null,
      docOrigem: form.docOrigem.trim() || null,
      transportadora: form.transportadora.trim() || null,
      placaVeiculo: form.placaVeiculo.trim() || null,
      placaReboque: form.placaReboque.trim() || null,
      motorista: form.motorista.trim() || null,
      dataChegada: form.dataChegada,
      horaChegada: form.horaChegada || null,
      pesoMedioBalancao: normalizarNumero(form.pesoMedioBalancao),
      pesoOrigem: normalizarNumero(form.pesoOrigem),
      horaPesagem: form.horaPesagem || null,
      contagens: contagensPayload,
      checklist: checklist
        .filter((c) => c.resposta !== '')
        .map((c) => ({ item: c.item, resposta: c.resposta, observacao: c.observacao.trim() || null })),
      scoreCorporal: form.scoreCorporal ? Number(form.scoreCorporal) : null,
      mortes: Number(form.mortes) || 0,
      destino: form.destino || null,
      loteId: form.loteId,
      loteNome: form.loteNome,
      auxiliar: form.auxiliar.trim() || null,
      observacao: form.observacao.trim() || null,
      sessaoId,
      // Blob do vídeo fica no IndexedDB até o upload no sync
      videoBlob: videoFile || null,
      videoNome: videoFile?.name || null,
      videoEnviado: false,
    } as any)

    if (!result.success && result.errors) {
      setSalvando(false)
      setErrors(result.errors)
      scrollToFirstError(result.errors)
      return
    }

    // Movimentações de Entrada/Compras por categoria+sexo. Convenção do schema:
    // para Entrada, lote_origem_id é o lote que RECEBE os animais.
    const falhas: string[] = []
    const pesoMedio = normalizarNumero(form.pesoMedioBalancao)
    for (const c of contagensPayload) {
      const linhas: { sexo: string; cabecas: number }[] = []
      if (c.femeas > 0) linhas.push({ sexo: 'Fêmea', cabecas: c.femeas })
      if (c.machos > 0) linhas.push({ sexo: 'Macho', cabecas: c.machos })
      for (const l of linhas) {
        const mov = await salvarRegistro('movimentacao', {
          data: form.dataChegada || form.data,
          horarioManejo: form.horaChegada || undefined,
          responsavel: form.responsavel.trim() || usuario,
          usuario,
          loteOrigem: form.loteNome,
          loteOrigemId: form.loteId,
          loteDestino: '',
          loteDestinoId: '',
          numeroCabecas: l.cabecas,
          categoria: c.categoria,
          sexo: l.sexo,
          motivoMovimentacao: 'Entrada',
          subtipo: 'Compras',
          pesoVivoAtualKg: pesoMedio,
          observacao: `Recebimento ${osSelecionada?.numero_os || 'OS'} (GTA ${form.numeroGta})`,
          osId: form.osId,
          osRecebimentoId: recebimentoId,
          sessaoId,
        })
        if (!mov.success) {
          const msgs = (mov.errors || []).map((e) => e.message).join('; ')
          falhas.push(`${c.categoria} ${l.sexo}: ${msgs || 'erro ao salvar movimentação'}`)
        }
      }
    }

    setSalvando(false)
    if (falhas.length > 0) {
      setErrors(falhas.map((m) => ({ field: 'movimentacao', message: m })))
      scrollToFirstError(falhas.map((m) => ({ field: 'movimentacao', message: m })))
      return
    }

    setRegistroSalvo(result.registro)
    setShowSuccessModal(true)
    limparRascunho()
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    setForm(makeInitial())
    setVideoFile(null)
    setVideoErro(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/')
  }

  return (
    <>
      <CadernetaLayout
        title="RECEBIMENTO DE COMPRA"
        cadernetaId="recebimento-compra"
        dateContent={<DatePicker value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} variant="header" compact inline />}
      >
        <BannerRascunho
          visible={rascunhoRestaurado}
          onConfirmar={confirmarRascunho}
          onDescartar={descartarRascunho}
        />
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: OS */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. ORDEM DE SERVIÇO</h2>
          <Select
            label="OS DE COMPRA *"
            value={form.osId}
            onChange={(e) => setForm((prev) => ({ ...prev, osId: e.target.value }))}
            error={getError('osId')}
            options={[
              { value: '', label: 'Selecione...' },
              ...osAbertas.map((o) => ({
                value: o.id,
                label: `${o.numero_os || 'COM-?????'} — ${o.fornecedor || o.origem_fazenda || ''} (${o.quantidade_prevista ?? '?'} cab)${o.pendenteSync ? ' ⏳' : ''}`,
              })),
            ]}
          />
          {osAbertas.length === 0 && (
            <p className="text-sm text-gray-500">
              Nenhuma OS de compra disponível. Crie um Comunicado de Compra primeiro.
            </p>
          )}
          {osSelecionada?.quantidade_prevista != null && (
            <p className="text-sm text-gray-600">
              Previsto: {osSelecionada.quantidade_prevista} cabeças
              {osSelecionada.quantidade_embarcada != null && ` • Já recebido: ${osSelecionada.quantidade_embarcada}`}
            </p>
          )}
        </div>

        {/* Seção 2: Documental e transporte */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. DOCUMENTOS E TRANSPORTE</h2>
          <Input
            label={<span>Nº GTA <span className="text-red-500">*</span></span>}
            placeholder="Número da GTA desta carga"
            value={form.numeroGta}
            onChange={setInput('numeroGta')}
            error={getError('numeroGta')}
          />
          <Input
            label="Nº NF"
            placeholder="Número da nota fiscal"
            value={form.numeroNf}
            onChange={setInput('numeroNf')}
          />
          <Input
            label="DOC. ORIGEM"
            placeholder="Documento de origem"
            value={form.docOrigem}
            onChange={setInput('docOrigem')}
          />
          <Input
            label="TRANSPORTADORA"
            value={form.transportadora}
            onChange={setInput('transportadora')}
          />
          <Input
            label="PLACA DO VEÍCULO"
            placeholder="Ex: ABC-1234"
            value={form.placaVeiculo}
            onChange={setInput('placaVeiculo')}
          />
          <Input
            label="PLACA DO REBOQUE"
            value={form.placaReboque}
            onChange={setInput('placaReboque')}
          />
          <Input
            label="MOTORISTA"
            value={form.motorista}
            onChange={setInput('motorista')}
          />
          <DatePicker
            label={<span>DATA DE CHEGADA <span className="text-red-500">*</span></span>}
            value={form.dataChegada}
            onChange={(val) => setForm((prev) => ({ ...prev, dataChegada: val }))}
            error={getError('dataChegada')}
          />
          <Input
            label="HORA DE CHEGADA"
            placeholder="Ex: 14:30"
            value={form.horaChegada}
            onChange={setInput('horaChegada')}
          />
        </div>

        {/* Seção 3: Pesagem coletiva */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. PESAGEM (BALANÇO)</h2>
          <Input
            label="PESO MÉDIO BALANÇO (KG/CAB)"
            placeholder="Média do caminhão cheio menos vazio"
            value={form.pesoMedioBalancao}
            onChange={setInput('pesoMedioBalancao')}
            inputMode="decimal"
          />
          <Input
            label="PESO ORIGEM (KG TOTAL)"
            placeholder="Peso informado na origem (base da quebra)"
            value={form.pesoOrigem}
            onChange={setInput('pesoOrigem')}
            inputMode="decimal"
          />
          <Input
            label="HORA DA PESAGEM"
            placeholder="Ex: 14:45"
            value={form.horaPesagem}
            onChange={setInput('horaPesagem')}
          />
        </div>

        {/* Seção 4: Contagens por categoria/sexo */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. QUANTIDADES RECEBIDAS</h2>
          {contagens.map((c, idx) => (
            <div key={idx} className="border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">CATEGORIA {idx + 1}</span>
                {contagens.length > 1 && (
                  <button type="button" onClick={() => removeContagem(idx)} className="text-red-500 p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Select
                label="CATEGORIA"
                value={c.categoria}
                onChange={(e) => setContagem(idx, 'categoria', e.target.value)}
                options={[
                  { value: '', label: 'Selecione...' },
                  ...CATEGORIAS_RECEBIMENTO.map((cat) => ({ value: cat, label: cat })),
                ]}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="FÊMEAS"
                  type="number"
                  inputMode="numeric"
                  value={c.femeas}
                  onChange={(e) => setContagem(idx, 'femeas', e.target.value)}
                />
                <Input
                  label="MACHOS"
                  type="number"
                  inputMode="numeric"
                  value={c.machos}
                  onChange={(e) => setContagem(idx, 'machos', e.target.value)}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addContagem}
            className="w-full rounded-2xl border-2 border-dashed border-gray-300 px-3 py-3 text-sm font-bold text-gray-600 hover:border-gray-400"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Plus className="h-4 w-4" /> ADICIONAR CATEGORIA
            </span>
          </button>
          <p className="text-sm font-bold text-gray-700">TOTAL RECEBIDO: {totalRecebido} cabeças</p>
          {getError('contagens') && <p className="text-sm text-red-500">{getError('contagens')}</p>}
        </div>

        {/* Seção 5: Destino */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">5. DESTINO</h2>
          <Select
            label="LOTE DE DESTINO *"
            value={form.loteId}
            onChange={(e) => {
              const lote = lotes.find((l) => l.id === e.target.value)
              setForm((prev) => ({ ...prev, loteId: e.target.value, loteNome: lote?.nome || '' }))
            }}
            error={getError('loteId')}
            options={[
              { value: '', label: 'Selecione...' },
              ...lotes.map((l) => ({ value: l.id, label: l.nome })),
            ]}
          />
          <Radio
            name="destino"
            label="DESTINO FÍSICO"
            value={form.destino}
            onChange={(v) => setForm((prev) => ({ ...prev, destino: v }))}
            options={[
              { value: 'baia', label: 'BAIA' },
              { value: 'pasto', label: 'PASTO' },
            ]}
            gridCols={2}
          />
        </div>

        {/* Seção 6: Checklist diagnóstico */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-4">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">6. CHECKLIST DE RECEPÇÃO</h2>
          {checklist.map((c, idx) => (
            <div key={c.item} className="border-b border-gray-100 pb-3">
              <Radio
                name={`chk-${idx}`}
                label={c.item.toUpperCase()}
                value={c.resposta}
                onChange={(v) => setChecklistItem(idx, 'resposta', v)}
                options={[
                  { value: 'S', label: 'SIM' },
                  { value: 'N', label: 'NÃO' },
                ]}
                gridCols={2}
              />
              {c.resposta === 'S' && (
                <Input
                  label="OBSERVAÇÃO"
                  placeholder="Detalhe o achado"
                  value={c.observacao}
                  onChange={(e) => setChecklistItem(idx, 'observacao', e.target.value)}
                />
              )}
            </div>
          ))}
          <Select
            label="ESCORE CORPORAL (1-5)"
            value={form.scoreCorporal}
            onChange={(e) => setForm((prev) => ({ ...prev, scoreCorporal: e.target.value }))}
            options={[
              { value: '', label: 'Selecione...' },
              { value: '1', label: '1 — Muito magro' },
              { value: '2', label: '2 — Magro' },
              { value: '3', label: '3 — Regular' },
              { value: '4', label: '4 — Bom' },
              { value: '5', label: '5 — Gordo' },
            ]}
          />
          <Input
            label="MORTES NO TRANSPORTE"
            type="number"
            inputMode="numeric"
            value={form.mortes}
            onChange={setInput('mortes')}
          />
        </div>

        {/* Seção 7: Vídeo do descarregamento */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-4">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">7. VÍDEO DO DESCARREGAMENTO</h2>
          <p className="text-sm text-gray-500">
            Grave ou anexe o vídeo dos animais sendo descarregados. Serve como prova de chegada desta carga (GTA).
          </p>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            onChange={handleVideoChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="w-full rounded-2xl border-2 border-dashed border-gray-300 px-3 py-4 text-sm font-bold text-gray-600 hover:border-gray-400"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Video className="h-5 w-5" />
              {videoFile ? 'TROCAR VÍDEO' : 'GRAVAR/ANEXAR VÍDEO'}
            </span>
          </button>
          {videoFile && (
            <p className="text-sm text-green-700">
              {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB) — será enviado ao sincronizar.
            </p>
          )}
          {videoErro && <p className="text-sm text-amber-600">{videoErro}</p>}
        </div>

        {/* Seção 8: Responsáveis */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">8. RESPONSÁVEIS</h2>
          <Input
            label={<span>RESPONSÁVEL <span className="text-red-500">*</span></span>}
            placeholder="Quem conferiu o recebimento"
            value={form.responsavel}
            onChange={setInput('responsavel')}
            error={getError('responsavel')}
          />
          <Input
            label="AUXILIAR"
            placeholder="Assinatura do auxiliar (opcional)"
            value={form.auxiliar}
            onChange={setInput('auxiliar')}
          />
          <Input
            label="OBSERVAÇÃO"
            placeholder="Observações gerais do laudo"
            value={form.observacao}
            onChange={setInput('observacao')}
          />
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvando || !isValid}
            className={`w-full !min-h-0 rounded-2xl border-2 px-3 py-4 text-base font-bold transition-colors active:scale-[0.99] ${
              salvando || !isValid
                ? 'cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400'
                : 'border-green-600 bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Save className="h-5 w-5" strokeWidth={2.5} />
              {salvando ? 'SALVANDO...' : 'SALVAR RECEBIMENTO'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => limparRascunho()}
            className="w-full !min-h-0 rounded-2xl border-2 border-gray-300 bg-gray-200 px-3 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-300 active:scale-95"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <Brush className="h-4 w-4" strokeWidth={2.5} />
              LIMPAR
            </span>
          </button>
        </div>
        {!isValid && (
          <p className="text-base text-gray-600 text-center">
            <span className="text-red-500">*</span> Preencha todos os campos obrigatórios para salvar
          </p>
        )}
      </CadernetaLayout>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Recebimento de Compra"
        registro={registroSalvo}
        caderneta="os-recebimentos"
      />
    </>
  )
}

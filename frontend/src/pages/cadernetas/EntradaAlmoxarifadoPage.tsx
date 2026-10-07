import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Minus, Plus } from 'lucide-react'
import { Input, DatePicker, ValidationMessage } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import BannerRascunho from '../../components/BannerRascunho'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import ChoiceGrid from '../../components/cadernetas/ChoiceGrid'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import FormFooter from '../../components/cadernetas/FormFooter'
import { salvarRegistro } from '../../services/api'
import { todayBR, getCurrentTimeInTimezone, DEFAULT_FARM_TIMEZONE } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import { getItensAlmoxarifadoCached, updateItemAlmoxarifadoSaldoCache } from '../../services/cadastroCache'
import { CLASSIFICACOES_ALMOXARIFADO, UNIDADES_ALMOXARIFADO, UNIDADE_DESCRICOES } from '../../utils/constants'
import { scrollToFirstError } from '../../utils/scrollToError'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { usePhotoGps } from '../../hooks/usePhotoGps'
import { base64ToDataUrl } from '../../utils/photoCompress'
import { iconePorNome } from '../../utils/iconeClassificacao'

interface ItemEntrada {
  itemId: string
  classificacao: string
  nome: string
  unidade: string
  saldoAtual?: number
  quantidade: string
  /** Validade MM/AAAA (só Medicamentos, opcional) */
  validade?: string
  novoItem?: boolean
}

interface FormState {
  data: string
  itens: ItemEntrada[]
  observacao: string
  /** true = chegou sem nota fiscal; senão a foto da nota é exigida */
  semNota: boolean
  chegouTudo: boolean | null
  itemDanificado: boolean | null
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  itens: [],
  observacao: '',
  semNota: false,
  chegouTudo: null,
  itemDanificado: null,
})

// Classes com caderneta própria de entrada (Entrada Insumos / Entrada Combustível)
const CLASSIFICACOES_OUTRA_CADERNETA = [
  'Insumos', 'Fertilizantes', 'Corretivos', 'Defensivos', 'Herbicidas', 'Fungicidas',
  'Inseticidas', 'Adjuvantes', 'Sementes', 'Combustíveis',
]
const CLASSIFICACOES_ENTRADA: string[] = CLASSIFICACOES_ALMOXARIFADO.filter(
  (c) => !CLASSIFICACOES_OUTRA_CADERNETA.includes(c)
)
const rotuloClassificacao = (c: string) => (c === 'Materiais de Construção' ? 'Construção' : c)

const CLASSIFICACAO_MEDICAMENTOS = 'Medicamentos'

// Unidades que aceitam fração; as demais (un, cx, pct, sc, rl) só inteiros
const UNIDADES_DECIMAIS = ['kg', 'g', 'L', 'mL', 'm']
const unidadeInteira = (unidade?: string) => !UNIDADES_DECIMAIS.includes(unidade || 'un')
const numeroDe = (s: string | undefined) => {
  const n = parseFloat(String(s ?? '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}
const formatarQtd = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })

const limparQuantidade = (valor: string, unidade?: string) => {
  const bruto = valor.replace(/[^0-9.,]/g, '').replace(',', '.')
  return unidadeInteira(unidade) ? bruto.split('.')[0] : bruto
}

// "032028" -> "03/2028"
const mascaraValidade = (valor: string) => {
  const d = valor.replace(/\D/g, '').slice(0, 6)
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}
const validadeValida = (v?: string) => !v || /^(0[1-9]|1[0-2])\/\d{4}$/.test(v)

const chaveItem = (i: Pick<ItemEntrada, 'itemId'>) => i.itemId

const SIM_NAO_CHEGOU = [
  { value: 'sim', label: 'Sim', icon: '✅', tone: 'success' as const },
  { value: 'nao', label: 'Não', icon: '❌', tone: 'danger' as const },
]
// "Sim" aqui é o resultado ruim; o tom segue o significado
const SIM_NAO_DANIFICADO = [
  { value: 'sim', label: 'Sim', icon: '✅', tone: 'danger' as const },
  { value: 'nao', label: 'Não', icon: '❌', tone: 'success' as const },
]
const simNaoValor = (v: boolean | null) => (v === null ? '' : v ? 'sim' : 'nao')

export default function EntradaAlmoxarifadoPage() {
  const navigate = useNavigate()
  const { fazendaId, usuario } = useSelector((state: RootState) => state.config)

  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'entrada-almoxarifado', makeInitial })
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)

  const [classificacaoAtiva, setClassificacaoAtiva] = useState<string>(CLASSIFICACOES_ENTRADA[0])
  const [itensDaClassificacao, setItensDaClassificacao] = useState<any[]>([])
  const [recarregar, setRecarregar] = useState(0)

  const [mostrarNovo, setMostrarNovo] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novaUnidade, setNovaUnidade] = useState('')
  const [novaQuantidade, setNovaQuantidade] = useState('')
  const [novoErro, setNovoErro] = useState<string | null>(null)

  // Foto da nota fiscal (sem GPS); sobe como foto_url no sync
  const {
    fotoBase64: fotoNota,
    capturandoFoto,
    fotoErro,
    capturarFoto,
    limpar: limparFoto,
    fotoInputRef,
    handleFileInputChange,
  } = usePhotoGps({ comGps: false })

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  useEffect(() => {
    // Esvazia antes de buscar: a lista da classificação anterior não pode ficar
    // visível (nem receber "+") sob o tipo novo enquanto a busca não volta
    setItensDaClassificacao([])
    if (!fazendaId) return
    let cancelado = false
    getItensAlmoxarifadoCached(fazendaId, classificacaoAtiva)
      .then((lista) => {
        if (cancelado) return
        setItensDaClassificacao((lista || []).filter((item: any) => item.controla_estoque))
      })
      .catch((error) => {
        console.error('Erro ao carregar itens:', error)
        if (!cancelado) setItensDaClassificacao([])
      })
    return () => {
      cancelado = true
    }
  }, [classificacaoAtiva, fazendaId, recarregar])

  const itemDoCarrinho = (id: string) => form.itens.find((i) => chaveItem(i) === id)

  // Define a quantidade de um item; vazio remove do carrinho
  const setQuantidade = (item: any, valor: string) => {
    const unidade = item.unidade || 'un'
    const limpo = limparQuantidade(valor, unidade)
    setForm((prev) => {
      const semItem = prev.itens.filter((i) => chaveItem(i) !== item.id)
      if (limpo === '') return { ...prev, itens: semItem }
      const atual = prev.itens.find((i) => chaveItem(i) === item.id)
      const novo: ItemEntrada = atual
        ? { ...atual, quantidade: limpo }
        : {
            itemId: item.id,
            classificacao: classificacaoAtiva,
            nome: item.nome,
            unidade,
            saldoAtual: Number(item.estoque_atual ?? 0),
            quantidade: limpo,
          }
      return { ...prev, itens: atual ? prev.itens.map((i) => (chaveItem(i) === item.id ? novo : i)) : [...prev.itens, novo] }
    })
  }

  const bump = (item: any, delta: number) => {
    const atual = numeroDe(itemDoCarrinho(item.id)?.quantidade)
    const proximo = Math.round((atual + delta) * 1000) / 1000
    setQuantidade(item, proximo <= 0 ? '' : String(proximo))
  }

  const atualizarItem = (id: string, parcial: Partial<ItemEntrada>) =>
    setForm((prev) => ({
      ...prev,
      itens: prev.itens.map((i) => (chaveItem(i) === id ? { ...i, ...parcial } : i)),
    }))

  const handleAdicionarNovo = () => {
    if (!novoNome.trim()) return setNovoErro('Informe o nome do item')
    if (!novaUnidade) return setNovoErro('Escolha a unidade de medida')
    if (numeroDe(novaQuantidade) <= 0) return setNovoErro('Informe a quantidade que chegou')
    setForm((prev) => ({
      ...prev,
      // Item criado no PWA: uuid local; o sync cria o item via RPC antes de postar o registro
      itens: [
        ...prev.itens,
        {
          itemId: crypto.randomUUID(),
          classificacao: classificacaoAtiva,
          nome: novoNome.trim(),
          unidade: novaUnidade,
          saldoAtual: 0,
          quantidade: novaQuantidade,
          novoItem: true,
        },
      ],
    }))
    setNovoNome('')
    setNovaUnidade('')
    setNovaQuantidade('')
    setNovoErro(null)
    setMostrarNovo(false)
  }

  const itensDoRegistro = useMemo(() => form.itens.filter((i) => numeroDe(i.quantidade) > 0), [form.itens])
  const novosDaClassificacao = form.itens.filter((i) => i.novoItem && i.classificacao === classificacaoAtiva)
  const medicamentosNoRegistro = itensDoRegistro.filter((i) => i.classificacao === CLASSIFICACAO_MEDICAMENTOS)
  const validadesInvalidas = medicamentosNoRegistro.some((i) => !validadeValida(i.validade))

  const horaRecebimento = useMemo(() => getCurrentTimeInTimezone(DEFAULT_FARM_TIMEZONE).slice(0, 5), [])

  const notaOk = form.semNota || !!fotoNota
  const conferenciaOk = form.chegouTudo !== null && form.itemDanificado !== null
  const formValido = !!form.data && itensDoRegistro.length > 0 && notaOk && conferenciaOk && !validadesInvalidas

  const pendenciaTexto = useMemo(() => {
    if (!notaOk) return 'Tire a foto da nota ou marque "Chegou sem nota"'
    if (itensDoRegistro.length === 0) return 'Informe a quantidade de pelo menos um item'
    if (validadesInvalidas) return 'Validade deve estar no formato MM/AAAA'
    if (!conferenciaOk) return 'Responda a conferência do recebimento'
    return undefined
  }, [notaOk, itensDoRegistro.length, validadesInvalidas, conferenciaOk])

  const handleSalvar = async () => {
    if (!formValido) {
      const faltando: { field: string; message: string }[] = []
      if (!notaOk) faltando.push({ field: 'notaFiscal', message: 'Tire a foto da nota ou marque "Chegou sem nota"' })
      if (itensDoRegistro.length === 0) faltando.push({ field: 'itens', message: 'Adicione pelo menos um item' })
      if (form.chegouTudo === null) faltando.push({ field: 'chegouTudo', message: 'Informe se chegou tudo que está na nota' })
      if (form.itemDanificado === null) faltando.push({ field: 'itemDanificado', message: 'Informe se tem item danificado ou vencido' })
      if (faltando.length > 0) {
        setErrors(faltando)
        scrollToFirstError(faltando)
      }
      return
    }
    setSalvando(true)
    setErrors([])

    const itensFinais = itensDoRegistro.map((i) => ({
      ...i,
      validade: i.classificacao === CLASSIFICACAO_MEDICAMENTOS && i.validade ? i.validade : undefined,
    }))

    const result = await salvarRegistro('entrada-almoxarifado', {
      data: form.data,
      itens: itensFinais,
      quemRecebeu: usuario || '',
      semNota: form.semNota,
      chegouTudo: form.chegouTudo,
      itemDanificado: form.itemDanificado,
      fotoBase64: form.semNota ? null : fotoNota,
      observacao: form.observacao || '',
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      if (fazendaId) {
        await Promise.all(itensFinais.map((item) =>
          updateItemAlmoxarifadoSaldoCache(fazendaId, item.itemId, numeroDe(item.quantidade))
        ))
      }
      limparRascunho()
    }
  }

  const limparForm = () => {
    limparRascunho()
    limparFoto()
    setMostrarNovo(false)
    setNovoNome('')
    setNovaUnidade('')
    setNovaQuantidade('')
    setNovoErro(null)
    setErrors([])
    setRecarregar((n) => n + 1)
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    limparForm()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/')
  }

  const escolherFotoNota = async () => {
    setForm((prev) => ({ ...prev, semNota: false }))
    if (!fotoNota) await capturarFoto()
  }

  return (
    <CadernetaLayout
      title="ENTRADA ALMOXARIFADO"
      cadernetaId="entrada-almoxarifado"
      dateContent={<DatePicker value={form.data} onChange={(v) => setForm((prev) => ({ ...prev, data: v }))} variant="header" compact inline />}
    >
      <BannerRascunho
        visible={rascunhoRestaurado}
        onConfirmar={confirmarRascunho}
        onDescartar={descartarRascunho}
      />
      {errors.length > 0 && <ValidationMessage errors={errors} />}

      <CadernetaSection numero={1} titulo="Nota fiscal" required>
        <div data-field="notaFiscal" id="notaFiscal">
          <ChoiceGrid
            options={[
              { value: 'foto', label: capturandoFoto ? 'Capturando...' : fotoNota ? 'Foto da nota ✓' : 'Foto da nota', icon: '📷' },
              { value: 'sem', label: 'Chegou sem nota' },
            ]}
            value={form.semNota ? 'sem' : 'foto'}
            onChange={(v) => (v === 'sem' ? setForm((prev) => ({ ...prev, semNota: true })) : escolherFotoNota())}
            cols={2}
            labelSize="xs"
          />
        </div>
        {getError('notaFiscal') && <p className="text-base font-semibold text-red-700">{getError('notaFiscal')}</p>}
        {fotoErro && <InfoStrip tone="danger">{fotoErro}</InfoStrip>}

        {!form.semNota && fotoNota && (
          <div className="flex items-start gap-3">
            <img
              src={base64ToDataUrl(fotoNota)}
              alt="Foto da nota fiscal"
              className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
            />
            <div className="flex flex-1 flex-col gap-2">
              <InfoStrip tone="success" icon={<span>🧾</span>}>
                Nota recebida. Fornecedor, número e preço o escritório lança pela foto.
              </InfoStrip>
              <button
                type="button"
                onClick={limparFoto}
                className="rounded-xl bg-gray-200 px-3 py-2 text-sm font-bold text-gray-600 active:scale-[0.99]"
              >
                🗑️ REMOVER FOTO
              </button>
            </div>
          </div>
        )}
        {form.semNota && (
          <InfoStrip tone="warning">Sem nota: o escritório vai conferir a compra depois.</InfoStrip>
        )}
      </CadernetaSection>

      <CadernetaSection numero={2} titulo="O que chegou?" required>
        <div>
          <label className="mb-2 block text-[15px] font-bold uppercase text-gray-900">
            Tipo <span className="text-red-500">*</span>
          </label>
          <ChoiceGrid
            options={CLASSIFICACOES_ENTRADA.map((c) => ({ value: c, label: rotuloClassificacao(c), icon: iconePorNome(c) }))}
            value={classificacaoAtiva}
            onChange={(v) => {
              setClassificacaoAtiva(v)
              setMostrarNovo(false)
            }}
            cols={3}
            labelSize="xs"
          />
        </div>

        <InfoStrip tone="warning" icon={<span>🌽</span>}>
          Ração, adubo e sementes → caderneta Entrada Insumos · ⛽ Diesel → Entrada Combustível
        </InfoStrip>

        <div className="flex flex-col" data-field="itens" id="itens">
          {itensDaClassificacao.length === 0 && novosDaClassificacao.length === 0 ? (
            <p className="py-2 text-sm text-gray-500">Nenhum item com controle de estoque nesta classificação</p>
          ) : (
            <>
              {itensDaClassificacao.map((item) => {
                const unidade = item.unidade || 'un'
                const qtd = itemDoCarrinho(item.id)?.quantidade ?? ''
                return (
                  <div key={item.id} className="flex items-center gap-3 border-b border-gray-100 py-3 last:border-b-0">
                    <span className="text-2xl leading-none">{iconePorNome(classificacaoAtiva)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-base font-bold leading-tight text-gray-900">{item.nome}</p>
                      <p className="text-sm text-gray-500">
                        tem {Number(item.estoque_atual ?? 0).toLocaleString('pt-BR')} · {unidade}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-stretch gap-1">
                      <button
                        type="button"
                        onClick={() => bump(item, -1)}
                        aria-label={`Diminuir ${item.nome}`}
                        className="flex !min-h-0 h-10 w-10 items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-gray-700 active:scale-95"
                      >
                        <Minus className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                      <input
                        type="text"
                        inputMode={unidadeInteira(unidade) ? 'numeric' : 'decimal'}
                        value={qtd}
                        placeholder="0"
                        onChange={(e) => setQuantidade(item, e.target.value)}
                        aria-label={`Quantidade de ${item.nome}`}
                        className="!min-h-0 h-10 w-11 min-w-0 rounded-xl border-2 border-transparent bg-transparent text-center text-xl font-extrabold text-gray-900 focus:border-gray-300 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => bump(item, 1)}
                        aria-label={`Aumentar ${item.nome}`}
                        className="flex !min-h-0 h-10 w-10 items-center justify-center rounded-xl bg-brand-900 text-white active:scale-95"
                      >
                        <Plus className="h-5 w-5" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                )
              })}
              {novosDaClassificacao.map((item) => (
                <div key={item.itemId} className="flex items-center gap-3 border-b border-gray-100 py-3 last:border-b-0">
                  <span className="text-2xl leading-none">{iconePorNome(item.classificacao)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-base font-bold leading-tight text-gray-900">{item.nome}</p>
                    <p className="text-sm text-gray-500">item novo · {item.unidade}</p>
                  </div>
                  <span className="shrink-0 text-xl font-extrabold text-gray-900">{formatarQtd(numeroDe(item.quantidade))}</span>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, itens: prev.itens.filter((i) => i.itemId !== item.itemId) }))}
                    aria-label={`Remover ${item.nome}`}
                    className="flex !min-h-0 h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-lg text-gray-600 active:scale-95"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
        {getError('itens') && <p className="text-base font-semibold text-red-700">{getError('itens')}</p>}

        {!mostrarNovo ? (
          <button
            type="button"
            onClick={() => setMostrarNovo(true)}
            className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-3 py-3 text-sm font-extrabold uppercase tracking-wide text-gray-800 transition-colors hover:bg-gray-100 active:scale-[0.99]"
          >
            <span className="text-lg leading-none">➕</span>
            Item novo (digitar)
          </button>
        ) : (
          <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-base font-bold uppercase text-gray-900">Item novo · {rotuloClassificacao(classificacaoAtiva)}</h3>
            {novoErro && <InfoStrip tone="danger">{novoErro}</InfoStrip>}
            <div>
              <label className="mb-2 block text-sm font-bold uppercase text-gray-700">Nome</label>
              <Input placeholder="Ex.: Bomba d'água" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold uppercase text-gray-700">Unidade de medida</label>
              <ChoiceGrid
                options={UNIDADES_ALMOXARIFADO.map((u) => ({ value: u, label: u }))}
                value={novaUnidade}
                onChange={(u) => {
                  setNovaUnidade(u)
                  setNovaQuantidade((q) => limparQuantidade(q, u))
                }}
                cols={5}
                size="sm"
                labelSize="xs"
              />
              {novaUnidade && <p className="mt-1 text-xs text-gray-500">{UNIDADE_DESCRICOES[novaUnidade] ?? ''}</p>}
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold uppercase text-gray-700">
                Quantidade{novaUnidade ? ` (${novaUnidade})` : ''}
              </label>
              <input
                type="text"
                inputMode={unidadeInteira(novaUnidade) ? 'numeric' : 'decimal'}
                value={novaQuantidade}
                placeholder="0"
                onChange={(e) => setNovaQuantidade(limparQuantidade(e.target.value, novaUnidade))}
                className="w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-3 text-xl font-extrabold text-gray-900 focus:border-brand-900 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMostrarNovo(false)
                  setNovoErro(null)
                }}
                className="flex-1 !min-h-0 rounded-xl bg-gray-200 px-3 py-3 text-sm font-bold text-gray-700 active:scale-95"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={handleAdicionarNovo}
                className="flex-1 !min-h-0 rounded-xl bg-brand-900 px-3 py-3 text-sm font-bold text-white active:scale-95"
              >
                ADICIONAR
              </button>
            </div>
          </div>
        )}

        {itensDoRegistro.length > 0 && (
          <div className="flex flex-col gap-1 rounded-xl bg-gray-100 p-3">
            <p className="text-sm font-bold text-gray-600">Chegando agora</p>
            <p className="text-sm font-semibold text-gray-800">
              {itensDoRegistro
                .map((i) => `${formatarQtd(numeroDe(i.quantidade))} ${i.unidade === 'un' ? '' : i.unidade + ' '}${i.nome}`.replace(/\s+/g, ' '))
                .join(' · ')}
            </p>
          </div>
        )}
      </CadernetaSection>

      <CadernetaSection numero={3} titulo="Conferência" required>
        <div data-field="chegouTudo" id="chegouTudo">
          <label className="mb-2 block text-[15px] font-bold uppercase text-gray-900">Chegou tudo que está na nota?</label>
          <ChoiceGrid
            options={SIM_NAO_CHEGOU}
            value={simNaoValor(form.chegouTudo)}
            onChange={(v) => setForm((prev) => ({ ...prev, chegouTudo: v === 'sim' }))}
            cols={2}
            size="sm"
          />
          {getError('chegouTudo') && <p className="mt-2 text-base font-semibold text-red-700">{getError('chegouTudo')}</p>}
        </div>

        <div data-field="itemDanificado" id="itemDanificado">
          <label className="mb-2 block text-[15px] font-bold uppercase text-gray-900">Tem item danificado ou vencido?</label>
          <ChoiceGrid
            options={SIM_NAO_DANIFICADO}
            value={simNaoValor(form.itemDanificado)}
            onChange={(v) => setForm((prev) => ({ ...prev, itemDanificado: v === 'sim' }))}
            cols={2}
            size="sm"
          />
          {getError('itemDanificado') && <p className="mt-2 text-base font-semibold text-red-700">{getError('itemDanificado')}</p>}
        </div>

        {medicamentosNoRegistro.length > 0 && (
          <div className="flex flex-col gap-3">
            <label className="block text-[15px] font-bold uppercase text-gray-900">Validade (remédios)</label>
            {medicamentosNoRegistro.map((item) => (
              <div key={item.itemId} className="flex items-center gap-3">
                <p className="min-w-0 flex-1 break-words text-base font-bold leading-tight text-gray-900">{item.nome}</p>
                <div className="relative w-36 shrink-0">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={item.validade ?? ''}
                    placeholder="MM/AAAA"
                    onChange={(e) => atualizarItem(item.itemId, { validade: mascaraValidade(e.target.value) })}
                    aria-label={`Validade de ${item.nome}`}
                    className={`w-full rounded-xl border-2 bg-white px-3 py-2.5 text-lg font-extrabold text-gray-900 focus:outline-none ${
                      validadeValida(item.validade) ? 'border-gray-300 focus:border-brand-900' : 'border-red-500'
                    }`}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500">Opcional. Formato mês/ano, por item.</p>
          </div>
        )}

        <Input
          placeholder="Observações (opcional)"
          value={form.observacao}
          onChange={(e) => setForm((prev) => ({ ...prev, observacao: e.target.value }))}
          error={getError('observacao')}
        />
        <InfoStrip icon={<span>🕒</span>}>
          Recebido por {usuario || '—'} às {horaRecebimento} (automático)
        </InfoStrip>
      </CadernetaSection>

      <FormFooter
        onSalvar={handleSalvar}
        onLimpar={limparForm}
        salvando={salvando}
        disabled={!formValido}
        formValido={formValido}
        pendenciaTexto={pendenciaTexto}
      />

      <input
        ref={fotoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Almoxarifado"
        registro={registroSalvo}
        caderneta="entrada-almoxarifado"
      />
    </CadernetaLayout>
  )
}

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input, DatePicker, ValidationMessage, NumericInput } from '../../components/ui'
import { Minus, Plus } from 'lucide-react'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import ChoiceGrid from '../../components/cadernetas/ChoiceGrid'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import FormFooter from '../../components/cadernetas/FormFooter'
import { salvarRegistro, listarRegistros } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { scrollToFirstError } from '../../utils/scrollToError'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { getFuncionarios } from '../../services/supabaseService'
import { getCachedCadastroData,getClassificacoesCantinaCached, getItensCantinaCached } from '../../services/cadastroCache'
import { iconeDoItem } from '../../utils/iconeItem'
import { iniciais, corAvatar } from '../../utils/avatar'

interface ItemCantina {
  itemId: string
  nome: string
  classificacao: string
  unidade_medida: string
  quantidade: string
}

interface ItemCatalogo {
  id: string
  nome: string
  unidade_medida: string
  classificacao: string
}

type CampoRefeicao = 'numeroCafeManha' | 'numeroLanches' | 'numeroRefeicoesAlmoco' | 'numeroRefeicoesJantar'

const REFEICOES: { campo: CampoRefeicao; label: string; icone: string }[] = [
  { campo: 'numeroCafeManha', label: 'Café da manhã', icone: '☕' },
  { campo: 'numeroLanches', label: 'Lanche', icone: '🥪' },
  { campo: 'numeroRefeicoesAlmoco', label: 'Almoço', icone: '🍛' },
  { campo: 'numeroRefeicoesJantar', label: 'Jantar', icone: '🍲' },
]

interface FormState {
  modo: 'cantina' | 'marmita'
  data: string
  // Cantina: a 1ª pessoa marcada é quem cozinhou, as demais ajudaram
  cozinheiras: string[]
  numeroCafeManha: string
  numeroLanches: string
  numeroRefeicoesAlmoco: string
  numeroRefeicoesJantar: string
  // Marmita
  fornecedor: string
  quantidadeMarmitas: string
  precoUnitario: string
  destinatario: string
  // Comum
  observacao: string
}

const makeInitial = (): FormState => ({
  modo: 'cantina',
  data: todayBR(),
  cozinheiras: [],
  numeroCafeManha: '',
  numeroLanches: '',
  numeroRefeicoesAlmoco: '',
  numeroRefeicoesJantar: '',
  fornecedor: '',
  quantidadeMarmitas: '',
  precoUnitario: '',
  destinatario: '',
  observacao: '',
})

const UNIDADES_DECIMAIS = ['kg', 'g', 'L', 'mL']
const unidadeInteira = (unidade?: string) => !UNIDADES_DECIMAIS.includes(unidade || '')
const numeroDe = (valor: string | undefined) => {
  const n = Number(String(valor ?? '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

const ICONES_CLASSIFICACAO: Record<string, string> = {
  'Perecíveis': '🧊',
  'Não Perecíveis': '🍚',
  'Bebidas': '🥤',
  'Limpeza/Higiene': '🧼',
  'Hortifruti': '🥬',
  'Carnes': '🥩',
}

// Emoji pelo nome do item; sem correspondência, avatar de iniciais
function IconeItem({ nome }: { nome: string }) {
  const emoji = iconeDoItem(nome)
  if (emoji) return <span className="flex h-9 w-9 shrink-0 items-center justify-center text-2xl leading-none">{emoji}</span>
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${corAvatar(nome)}`}>
      {iniciais(nome)}
    </span>
  )
}

// "27/09/2026 08:10" -> "27/09/2026"
const soData = (d: unknown) => String(d ?? '').split(' ')[0]

const diaAnteriorBR = (dataBR: string): string | null => {
  const [dia, mes, ano] = dataBR.split('/').map(Number)
  if (!dia || !mes || !ano) return null
  const d = new Date(ano, mes - 1, dia - 1)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

const totalRefeicoes = (r: Record<string, any>) =>
  REFEICOES.reduce((soma, { campo }) => soma + numeroDe(r[campo]), 0)

interface StepperProps {
  valor: string
  onChange: (v: string) => void
  nome: string
  decimal?: boolean
}

// Botões −/+ com número editável no meio (mesmo padrão da Entrada Cantina)
function Stepper({ valor, onChange, nome, decimal = false }: StepperProps) {
  const bump = (delta: number) => {
    const prox = Math.max(0, Math.round((numeroDe(valor) + delta) * 1000) / 1000)
    onChange(prox === 0 ? '' : String(prox))
  }
  return (
    <div className="flex shrink-0 items-stretch gap-1">
      <button
        type="button"
        onClick={() => bump(-1)}
        aria-label={`Diminuir ${nome}`}
        className="flex !min-h-0 h-10 w-9 items-center justify-center rounded-xl border-2 border-gray-300 bg-white text-gray-700 active:scale-95"
      >
        <Minus className="h-4 w-4" strokeWidth={2.5} />
      </button>
      <input
        type="text"
        inputMode={decimal ? 'decimal' : 'numeric'}
        value={valor}
        placeholder="0"
        onChange={(e) =>
          onChange(
            decimal
              ? e.target.value.replace(/[^0-9,.]/g, '').replace(',', '.')
              : e.target.value.replace(/[^0-9]/g, '')
          )
        }
        aria-label={`Quantidade de ${nome}`}
        className="!min-h-0 h-10 w-10 min-w-0 rounded-xl border-2 border-transparent bg-transparent text-center text-xl font-extrabold text-gray-900 focus:border-gray-300 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => bump(1)}
        aria-label={`Aumentar ${nome}`}
        className="flex !min-h-0 h-10 w-9 items-center justify-center rounded-xl bg-brand-900 text-white active:scale-95"
      >
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </button>
    </div>
  )
}

export default function CantinaPage() {
  const navigate = useNavigate()
  const { fazendaId } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [funcionariosDisponiveis, setFuncionariosDisponiveis] = useState<string[]>([])
  const [classificacoesDisponiveis, setClassificacoesDisponiveis] = useState<string[]>([])
  const [classificacaoAtiva, setClassificacaoAtiva] = useState('')
  const [itensDaClassificacao, setItensDaClassificacao] = useState<any[]>([])
  // Itens já vistos (de qualquer classificação), para montar o registro
  const [catalogo, setCatalogo] = useState<Record<string, ItemCatalogo>>({})
  const [quantidades, setQuantidades] = useState<Record<string, string>>({})
  const [totalOntem, setTotalOntem] = useState<number | null>(null)

  const getError = (field: string) => errors.find((e) => e.field === field)?.message
  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // Funcionários do cache (com fallback offline)
  useEffect(() => {
    async function carregarFuncionarios() {
      if (!fazendaId) return
      try {
        const cache = await getCachedCadastroData()
        if (cache?.funcionarios && cache.funcionarios.length > 0) {
          setFuncionariosDisponiveis(cache.funcionarios)
        } else {
          // Cache ainda vazio (primeiro acesso): busca direto quando online
          const funcionariosData = await getFuncionarios(fazendaId)
          setFuncionariosDisponiveis(funcionariosData?.map((f: any) => f.nome) || [])
        }
      } catch (error) {
        console.error('Erro ao carregar funcionários:', error)
      }
    }
    carregarFuncionarios()
  }, [fazendaId])

  // Classificações de cantina (cache lazy para offline)
  useEffect(() => {
    async function carregarClassificacoes() {
      if (!fazendaId) return
      try {
        const data = await getClassificacoesCantinaCached(fazendaId)
        if (data) {
          setClassificacoesDisponiveis(data)
          setClassificacaoAtiva((atual) => (atual && data.includes(atual) ? atual : data[0] || ''))
        }
      } catch (error) {
        console.error('Erro ao carregar classificações da cantina:', error)
      }
    }
    carregarClassificacoes()
  }, [fazendaId])

  // Itens da classificação ativa
  useEffect(() => {
    if (!fazendaId || !classificacaoAtiva) {
      setItensDaClassificacao([])
      return
    }
    let cancelado = false
    getItensCantinaCached(fazendaId, classificacaoAtiva)
      .then((lista) => {
        if (cancelado) return
        const itens = lista || []
        setItensDaClassificacao(itens)
        setCatalogo((prev) => {
          const novo = { ...prev }
          itens.forEach((item: any) => {
            novo[item.id] = {
              id: item.id,
              nome: item.nome,
              unidade_medida: item.unidade_medida,
              classificacao: classificacaoAtiva,
            }
          })
          return novo
        })
      })
      .catch((error) => console.error('Erro ao carregar itens da cantina:', error))
    return () => {
      cancelado = true
    }
  }, [classificacaoAtiva, fazendaId])

  // Total de refeições de ontem (referência para o peão), relativo à data do formulário
  useEffect(() => {
    let cancelado = false
    const ontem = diaAnteriorBR(form.data)
    if (!ontem) {
      setTotalOntem(null)
      return
    }
    listarRegistros('cantina')
      .then((lista) => {
        if (cancelado) return
        const doDia = lista.filter((r: any) => (r.modo ?? 'cantina') === 'cantina' && soData(r.data) === ontem)
        setTotalOntem(doDia.length > 0 ? doDia.reduce((s: number, r: any) => s + totalRefeicoes(r), 0) : null)
      })
      .catch(() => setTotalOntem(null))
    return () => {
      cancelado = true
    }
  }, [form.data])

  const alternarCozinheira = (nome: string) =>
    setForm((prev) => ({
      ...prev,
      cozinheiras: prev.cozinheiras.includes(nome)
        ? prev.cozinheiras.filter((n) => n !== nome)
        : [...prev.cozinheiras, nome],
    }))

  const setQuantidade = (id: string, valor: string) => setQuantidades((prev) => ({ ...prev, [id]: valor }))

  // Itens do registro: itens com quantidade > 0 (de qualquer classificação)
  const itensDoRegistro: ItemCantina[] = useMemo(
    () =>
      Object.entries(quantidades)
        .filter(([, q]) => numeroDe(q) > 0)
        .map(([id, q]) => {
          const c = catalogo[id]
          return c
            ? { itemId: id, nome: c.nome, classificacao: c.classificacao, unidade_medida: c.unidade_medida, quantidade: q }
            : null
        })
        .filter((i): i is ItemCantina => i !== null),
    [quantidades, catalogo]
  )

  const totalHoje = REFEICOES.reduce((soma, { campo }) => soma + numeroDe(form[campo]), 0)

  const formValido = useMemo(() => {
    if (!form.data) return false
    if (form.modo === 'cantina') {
      return form.cozinheiras.length > 0 && totalHoje > 0 && itensDoRegistro.length > 0
    }
    return !!form.fornecedor && !!form.quantidadeMarmitas && !!form.precoUnitario && !!form.destinatario
  }, [form, totalHoje, itensDoRegistro.length])

  const pendenciaTexto = useMemo(() => {
    if (form.modo === 'marmita') return 'Preencha fornecedor, quantidade, preço e destinatário'
    if (form.cozinheiras.length === 0) return 'Marque quem cozinhou'
    if (totalHoje <= 0) return 'Informe pelo menos uma refeição'
    if (itensDoRegistro.length === 0) return 'Informe a quantidade de pelo menos um item'
    return undefined
  }, [form.modo, form.cozinheiras.length, totalHoje, itensDoRegistro.length])

  const handleSalvar = async () => {
    if (!formValido) {
      const faltando: { field: string; message: string }[] = []
      if (form.modo === 'cantina') {
        if (form.cozinheiras.length === 0) faltando.push({ field: 'quemCozinhou', message: 'Marque quem cozinhou' })
        if (totalHoje <= 0) faltando.push({ field: 'refeicoes', message: 'Pelo menos uma refeição deve ser informada' })
        if (itensDoRegistro.length === 0) faltando.push({ field: 'itens', message: 'Adicione pelo menos um item' })
      }
      if (faltando.length > 0) {
        setErrors(faltando)
        scrollToFirstError(faltando)
      }
      return
    }
    setSalvando(true)
    setErrors([])

    // Itens no formato de armazenamento ("nome (unidade)" -> quantidade)
    const itensStorage: Record<string, string> = {}
    itensDoRegistro.forEach((item) => {
      itensStorage[`${item.nome} (${item.unidade_medida})`] = item.quantidade
    })

    const cantina = form.modo === 'cantina'
    const result = await salvarRegistro('cantina', {
      data: form.data,
      modo: form.modo,
      // Cantina: 1ª marcada cozinhou, as demais ajudaram
      numeroCozinheiras: cantina ? String(form.cozinheiras.length) : null,
      quemCozinhou: cantina ? form.cozinheiras[0] : null,
      quemAjudou: cantina ? form.cozinheiras.slice(1).join(', ') : null,
      numeroCafeManha: cantina ? form.numeroCafeManha : null,
      numeroLanches: cantina ? form.numeroLanches : null,
      numeroRefeicoesAlmoco: cantina ? form.numeroRefeicoesAlmoco : null,
      numeroRefeicoesJantar: cantina ? form.numeroRefeicoesJantar : null,
      itens: cantina ? itensStorage : null,
      itensDetalhe: cantina ? itensDoRegistro : null,
      // Marmita
      fornecedor: !cantina ? form.fornecedor : null,
      quantidadeMarmitas: !cantina ? form.quantidadeMarmitas : null,
      precoUnitario: !cantina ? form.precoUnitario : null,
      destinatario: !cantina ? form.destinatario : null,
      // Comum
      observacao: form.observacao,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
    }
  }

  const limparForm = () => {
    setForm(makeInitial())
    setQuantidades({})
    setErrors([])
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

  const precoTotalMarmita =
    form.quantidadeMarmitas && form.precoUnitario && !isNaN(Number(form.quantidadeMarmitas)) && !isNaN(Number(form.precoUnitario))
      ? Number(form.quantidadeMarmitas) * Number(form.precoUnitario)
      : null

  return (
    <CadernetaLayout
      title={form.modo === 'marmita' ? 'MARMITA' : 'CANTINA'}
      cadernetaId="cantina"
      dateContent={<DatePicker value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} variant="header" compact inline />}
    >
      {errors.length > 0 && <ValidationMessage errors={errors} />}

      <CadernetaSection titulo="Modo de alimentação" required>
        <ChoiceGrid
          options={[
            { value: 'cantina', label: 'Cantina', icon: '🍲' },
            { value: 'marmita', label: 'Marmita', icon: '🍱' },
          ]}
          value={form.modo}
          onChange={(v) => setForm((p) => ({ ...p, modo: v as 'cantina' | 'marmita' }))}
          cols={2}
        />
      </CadernetaSection>

      {form.modo === 'cantina' ? (
        <>
          <CadernetaSection numero={1} titulo="Dados da cantina">
            <div data-field="quemCozinhou" id="quemCozinhou">
              <label className="mb-2 block text-[15px] font-bold uppercase text-gray-900">
                Quem cozinhou? (marque todas) <span className="text-red-500">*</span>
              </label>
              {funcionariosDisponiveis.length > 0 ? (
                <>
                  <div className="grid grid-cols-4 gap-2">
                    {funcionariosDisponiveis.map((nome) => {
                      const posicao = form.cozinheiras.indexOf(nome)
                      const selecionado = posicao >= 0
                      return (
                        <button
                          key={nome}
                          type="button"
                          onClick={() => alternarCozinheira(nome)}
                          aria-pressed={selecionado}
                          className={`relative flex !min-h-0 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-1 py-2.5 transition-all active:scale-95 ${
                            selecionado
                              ? 'border-brand-900 bg-brand-900 text-white'
                              : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'
                          }`}
                        >
                          <span
                            className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-extrabold ${
                              selecionado ? 'border-2 border-white/80 bg-white/20 text-white' : corAvatar(nome)
                            }`}
                          >
                            {iniciais(nome)}
                          </span>
                          <span className="w-full truncate text-center text-xs font-bold leading-tight">
                            {nome.split(' ')[0]}
                          </span>
                          {selecionado && (
                            <span
                              className={`absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase leading-none ${
                                posicao === 0 ? 'bg-amber-400 text-amber-950' : 'bg-white text-brand-900 ring-1 ring-brand-900'
                              }`}
                            >
                              {posicao === 0 ? '👩‍🍳 Cozinhou' : 'Ajudou'}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </>
              ) : (
                <Input placeholder="Carregando..." value="" onChange={() => {}} disabled />
              )}
              {getError('quemCozinhou') && (
                <p className="mt-2 text-base font-semibold text-red-700">{getError('quemCozinhou')}</p>
              )}
            </div>
            {form.cozinheiras.length > 0 && (
              <InfoStrip icon={<span>👩‍🍳</span>}>
                {form.cozinheiras.length} {form.cozinheiras.length === 1 ? 'cozinheira' : 'cozinheiras'} (conta sozinho)
                {form.cozinheiras.length > 1 && ` · cozinhou: ${form.cozinheiras[0].split(' ')[0]}`}
              </InfoStrip>
            )}
          </CadernetaSection>

          <CadernetaSection numero={2} titulo="Refeições" required>
            <div className="flex flex-col" data-field="refeicoes" id="refeicoes">
              {REFEICOES.map(({ campo, label, icone }) => (
                <div key={campo} className="flex items-center gap-2 border-b border-gray-100 py-3 last:border-b-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center text-2xl leading-none">{icone}</span>
                  <p className="min-w-0 flex-1 text-base font-bold leading-tight text-gray-900">{label}</p>
                  <Stepper
                    valor={form[campo]}
                    onChange={(v) => setForm((prev) => ({ ...prev, [campo]: v }))}
                    nome={label}
                  />
                </div>
              ))}
            </div>
            {getError('refeicoes') && <p className="text-base font-semibold text-red-700">{getError('refeicoes')}</p>}
            {totalHoje > 0 && (
              <InfoStrip tone="success">
                Total: {totalHoje} {totalHoje === 1 ? 'refeição' : 'refeições'}
                {totalOntem !== null && ` · ontem: ${totalOntem}`}
              </InfoStrip>
            )}
          </CadernetaSection>

          <CadernetaSection numero={3} titulo="Itens usados" required>
            {classificacoesDisponiveis.length > 0 ? (
              <ChoiceGrid
                options={classificacoesDisponiveis.map((c) => ({
                  value: c,
                  label: c === 'Limpeza/Higiene' ? 'Limpeza / higiene' : c,
                  icon: ICONES_CLASSIFICACAO[c],
                }))}
                value={classificacaoAtiva}
                onChange={setClassificacaoAtiva}
                cols={3}
                labelSize="xs"
              />
            ) : (
              <p className="text-sm text-gray-500">Nenhuma classificação cadastrada. Cadastre itens da cantina no painel web.</p>
            )}

            <div className="flex flex-col" data-field="itens" id="itens">
              {classificacaoAtiva && itensDaClassificacao.length === 0 ? (
                <p className="py-2 text-sm text-gray-500">Nenhum item encontrado para esta classificação</p>
              ) : (
                itensDaClassificacao.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 border-b border-gray-100 py-3 last:border-b-0">
                    <IconeItem nome={item.nome} />
                    <p className="min-w-0 flex-1 break-words text-base font-bold leading-tight text-gray-900">
                      {item.nome} <span className="font-semibold text-gray-500">({item.unidade_medida})</span>
                    </p>
                    <Stepper
                      valor={quantidades[item.id] ?? ''}
                      onChange={(v) => setQuantidade(item.id, v)}
                      nome={item.nome}
                      decimal={!unidadeInteira(item.unidade_medida)}
                    />
                  </div>
                ))
              )}
            </div>
            {getError('itens') && <p className="text-base font-semibold text-red-700">{getError('itens')}</p>}

            {itensDoRegistro.length > 0 && (
              <div className="flex flex-col gap-1 rounded-xl bg-gray-100 p-3">
                <p className="text-sm font-bold text-gray-600">Usado hoje</p>
                <p className="text-sm font-semibold text-gray-800">
                  {itensDoRegistro
                    .map((i) => `${numeroDe(i.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} ${i.unidade_medida} ${i.nome.toLowerCase()}`)
                    .join(' · ')}
                </p>
              </div>
            )}
          </CadernetaSection>

          <CadernetaSection numero={4} titulo="Observações">
            <Input placeholder="Observações (opcional)" value={form.observacao} onChange={setInput('observacao')} error={getError('observacao')} />
          </CadernetaSection>
        </>
      ) : (
        <>
          <CadernetaSection numero={1} titulo="Dados da marmita">
            <Input label={<span>FORNECEDOR <span className="text-red-500">*</span></span>} placeholder="Nome do fornecedor" value={form.fornecedor} onChange={setInput('fornecedor')} error={getError('fornecedor')} />
            <NumericInput label={<span>QUANTIDADE DE MARMITAS <span className="text-red-500">*</span></span>} decimalPlaces={0} placeholder="Quantidade" value={form.quantidadeMarmitas} onChange={(v) => setForm((prev) => ({ ...prev, quantidadeMarmitas: v }))} error={getError('quantidadeMarmitas')} />
            <NumericInput label={<span>PREÇO UNITÁRIO (R$) <span className="text-red-500">*</span></span>} decimalPlaces={2} placeholder="0,00" value={form.precoUnitario} onChange={(v) => setForm((prev) => ({ ...prev, precoUnitario: v }))} error={getError('precoUnitario')} />
            {precoTotalMarmita !== null && (
              <InfoStrip tone="success" icon={<span>💰</span>}>
                Preço total: R$ {precoTotalMarmita.toFixed(2).replace('.', ',')}
              </InfoStrip>
            )}
            <Input label={<span>DESTINATÁRIO <span className="text-red-500">*</span></span>} placeholder="Para quem são as marmitas?" value={form.destinatario} onChange={setInput('destinatario')} error={getError('destinatario')} />
          </CadernetaSection>

          <CadernetaSection numero={2} titulo="Observações">
            <Input placeholder="Observações (opcional)" value={form.observacao} onChange={setInput('observacao')} error={getError('observacao')} />
          </CadernetaSection>
        </>
      )}

      <FormFooter
        onSalvar={handleSalvar}
        onLimpar={limparForm}
        salvando={salvando}
        disabled={!formValido}
        formValido={formValido}
        pendenciaTexto={pendenciaTexto}
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName={form.modo === 'marmita' ? 'Marmita' : 'Alimentação'}
        registro={registroSalvo}
        caderneta="cantina"
      />
    </CadernetaLayout>
  )
}

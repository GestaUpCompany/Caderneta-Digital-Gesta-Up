import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Minus, Plus } from 'lucide-react'
import { Input, DatePicker, ValidationMessage } from '../../components/ui'
import SearchableModal from '../../components/ui/SearchableModal'
import SuccessModal from '../../components/SuccessModal'
import BannerRascunho from '../../components/BannerRascunho'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import ChoiceGrid from '../../components/cadernetas/ChoiceGrid'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import FormFooter from '../../components/cadernetas/FormFooter'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import { getCachedCadastroData, getClassificacoesAlmoxarifadoCached, getSetoresCached, getItensAlmoxarifadoCached, getItensPendentesDevolucaoCached, updateItemAlmoxarifadoSaldoCache } from '../../services/cadastroCache'
import { getFuncionarios } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import { useFormValidation } from '../../hooks/useFormValidation'
import { atualizarNomeUsuarioConfig } from '../../utils/nomeUsuario'
import { useRascunhoForm } from '../../hooks/useRascunhoForm'
import { iniciais, corAvatar } from '../../utils/avatar'

interface ItemAlmoxarifado {
  itemId?: string
  classificacao: string
  nome: string
  unidade?: string
  saldoAtual?: number
  retiradaId?: string
  retiradaItemIndex?: number
  quantidadePendente?: number
  quantidade: string
  necessitaDevolucao: string
  prazoDevolucao: string
  setor: string
  observacao: string
}

interface FormState {
  tipo: 'retirada' | 'devolucao'
  data: string
  quemEntregou: string
  quemPegou: string
  // Carrinho: so entram itens com quantidade > 0
  itens: ItemAlmoxarifado[]
  // Um setor por registro, gravado em todos os itens ao salvar
  setor: string
  observacao: string
}

const makeInitial = (): FormState => ({
  tipo: 'retirada',
  data: todayBR(),
  quemEntregou: '',
  quemPegou: '',
  itens: [],
  setor: '',
  observacao: '',
})

const TIPO_OPTIONS = [
  { value: 'retirada', label: 'RETIRADA', icon: '📤' },
  { value: 'devolucao', label: 'DEVOLUÇÃO', icon: '📥' },
]

const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Icone por palavra-chave (o cadastro e livre; fallback generico)
const iconePorNome = (nome: string): string => {
  const n = normalizar(nome)
  if (n.includes('pendente')) return '↩️'
  if (n.includes('ferrament')) return '🔧'
  if (n.includes('peca')) return '⚙️'
  if (n.includes('epi') || n.includes('seguranca')) return '🦺'
  if (n.includes('remed') || n.includes('medic') || n.includes('farmac')) return '💊'
  if (n.includes('cerca') || n.includes('arame') || n.includes('madeira')) return '🪵'
  if (n.includes('limpez') || n.includes('higien')) return '🧹'
  if (n.includes('gado') || n.includes('pecuar') || n.includes('rebanho')) return '🐄'
  if (n.includes('maquina') || n.includes('trator')) return '🚜'
  if (n.includes('fabrica') || n.includes('industri')) return '🏭'
  if (n.includes('eletric')) return '💡'
  if (n.includes('hidraul') || n.includes('agua')) return '💧'
  if (n.includes('combust') || n.includes('lubrif') || n.includes('oleo')) return '🛢️'
  if (n.includes('outro')) return '➕'
  return '📦'
}

const MAX_SETORES_TILES = 9

// Unidades que aceitam fracao; as demais (un, par, cx, pct, kit) so inteiros
const UNIDADES_DECIMAIS = ['kg', 'g', 'L', 'mL', 'm']
const unidadeInteira = (unidade?: string) => !UNIDADES_DECIMAIS.includes(unidade || 'un')

const chaveItem = (i: Pick<ItemAlmoxarifado, 'classificacao' | 'itemId' | 'nome' | 'retiradaId' | 'retiradaItemIndex'>) =>
  `${i.classificacao}|${i.retiradaId ?? ''}|${i.retiradaItemIndex ?? ''}|${i.itemId || i.nome}`

const numeroDe = (s: string | undefined) => {
  const n = parseFloat(String(s ?? '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}

export default function AlmoxarifadoPage() {
  const navigate = useNavigate()
  const { fazendaId, usuario } = useSelector((state: RootState) => state.config)

  const { form, setForm, limparRascunho, rascunhoRestaurado, confirmarRascunho, descartarRascunho } =
    useRascunhoForm<FormState>({ rascunhoKey: 'almoxarifado', makeInitial })
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [funcionariosDisponiveis, setFuncionariosDisponiveis] = useState<string[]>([])
  const [classificacoesDisponiveis, setClassificacoesDisponiveis] = useState<string[]>([])
  const [itensDisponiveis, setItensDisponiveis] = useState<any[]>([])
  const [setoresDisponiveis, setSetoresDisponiveis] = useState<string[]>([])
  const [classificacaoAtiva, setClassificacaoAtiva] = useState('')
  const [devolucaoSemPendencias, setDevolucaoSemPendencias] = useState(false)
  const [trocandoEntregou, setTrocandoEntregou] = useState(false)

  const set = (key: keyof FormState) => (value: string) => setForm(prev => ({ ...prev, [key]: value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const devolucao = form.tipo === 'devolucao'

  const abasClassificacao = [
    ...(devolucao ? ['Pendentes'] : []),
    ...classificacoesDisponiveis.filter((c) => c !== 'Pendentes'),
  ]

  // Validation rules
  const validationRules: any = {
    data: { required: true },
    quemEntregou: { required: true },
    quemPegou: { required: true },
    setor: { required: true },
    itens: {
      custom: (_value: any, f: any) => {
        const validos = (f.itens || []).filter((i: ItemAlmoxarifado) => numeroDe(i.quantidade) > 0)
        if (validos.length === 0) return 'Adicione pelo menos um item'
        const semPrazo = validos.some((i: ItemAlmoxarifado) => f.tipo !== 'devolucao' && i.necessitaDevolucao === 'S' && !i.prazoDevolucao)
        return semPrazo ? 'Informe a data de devolução dos itens que voltam' : null
      },
    },
  }

  const { isValid } = useFormValidation(form, validationRules)

  // Quem entregou/recebeu vem do login; so preenche quando vazio
  useEffect(() => {
    if (!form.quemEntregou && usuario) {
      setForm(prev => prev.quemEntregou ? prev : { ...prev, quemEntregou: usuario })
    }
  }, [form.quemEntregou, usuario])

  // Devolução: quem devolve é sempre o usuário logado (cada um só vê e devolve o que pegou)
  useEffect(() => {
    if (devolucao && form.quemPegou !== (usuario || '')) {
      setForm(prev => ({ ...prev, quemPegou: usuario || '', itens: prev.quemPegou ? [] : prev.itens }))
    }
  }, [devolucao, usuario, form.quemPegou])

  // Carregar funcionários, classificações e setores (com cache lazy para offline)
  useEffect(() => {
    const loadData = async () => {
      const cache = await getCachedCadastroData()
      if (cache && cache.funcionarios && cache.funcionarios.length > 0) {
        setFuncionariosDisponiveis(cache.funcionarios)
      } else if (fazendaId) {
        try {
          const funcionariosData = await getFuncionarios(fazendaId)
          setFuncionariosDisponiveis(funcionariosData?.map((f: any) => f.nome) || [])
        } catch (error) {
          console.error('Erro ao carregar funcionários:', error)
        }
      }

      if (fazendaId) {
        try {
          const classificacoesData = await getClassificacoesAlmoxarifadoCached(fazendaId)
          setClassificacoesDisponiveis(classificacoesData || [])
        } catch (error) {
          console.error('Erro ao carregar classificações:', error)
        }

        try {
          const setoresData = await getSetoresCached(fazendaId)
          setSetoresDisponiveis(setoresData?.map((s: any) => s.nome) || [])
        } catch (error) {
          console.error('Erro ao carregar setores:', error)
        }
      }
    }
    loadData()
  }, [fazendaId])

  // Aba ativa: Pendentes em devolução; primeira classificação em retirada
  useEffect(() => {
    if (abasClassificacao.length === 0) return
    if (!abasClassificacao.includes(classificacaoAtiva)) setClassificacaoAtiva(abasClassificacao[0])
  }, [form.tipo, classificacoesDisponiveis.join('|')])

  // Em devolução, a fonte principal é a lista de pendências do servidor/cache.
  useEffect(() => {
    // Respostas fora de ordem (troca rápida de aba) não podem sobrescrever a aba atual
    let cancelado = false
    const loadItens = async () => {
      if (!fazendaId || !classificacaoAtiva) {
        setItensDisponiveis([])
        return
      }
      try {
        if (devolucao && classificacaoAtiva === 'Pendentes') {
          // Sem usuário identificado não há como filtrar: nunca listar pendências de terceiros
          const pendentes = usuario ? await getItensPendentesDevolucaoCached(fazendaId, usuario) : []
          if (cancelado) return
          setDevolucaoSemPendencias(!pendentes || pendentes.length === 0)
          setItensDisponiveis((pendentes || []).map((item: any) => ({
            id: item.item_id,
            nome: item.item_nome,
            unidade: item.unidade,
            classificacao: 'Pendentes',
            controla_estoque: true,
            estoque_atual: item.quantidade_pendente,
            retiradaId: item.retirada_id,
            retiradaItemIndex: item.retirada_item_index,
            quantidadePendente: Number(item.quantidade_pendente),
          })))
        } else {
          const itensData = await getItensAlmoxarifadoCached(fazendaId, classificacaoAtiva)
          if (cancelado) return
          setItensDisponiveis(itensData || [])
        }
      } catch (error) {
        console.error('Erro ao carregar itens:', error)
        if (!cancelado) setItensDisponiveis([])
      }
    }
    loadItens()
    return () => { cancelado = true }
  }, [classificacaoAtiva, fazendaId, form.tipo, usuario])

  const itemDoCarrinho = (item: any): ItemAlmoxarifado | undefined => {
    const chave = chaveItem({
      classificacao: classificacaoAtiva,
      itemId: item.id,
      nome: item.nome,
      retiradaId: item.retiradaId,
      retiradaItemIndex: item.retiradaItemIndex,
    })
    return form.itens.find((i) => chaveItem(i) === chave)
  }

  // Define a quantidade de um item; vazio/zero remove do carrinho
  const setQuantidade = (item: any, valor: string) => {
    const bruto = valor.replace(/[^0-9.,]/g, '').replace(',', '.')
    // Unidade inteira descarta o que vem depois do separador ("1,5" vira "1")
    const limpo = unidadeInteira(item.unidade) ? bruto.split('.')[0] : bruto
    const chave = chaveItem({
      classificacao: classificacaoAtiva,
      itemId: item.id,
      nome: item.nome,
      retiradaId: item.retiradaId,
      retiradaItemIndex: item.retiradaItemIndex,
    })
    setForm((prev) => {
      const semItem = prev.itens.filter((i) => chaveItem(i) !== chave)
      // Vazio remove; "0" ou "0," ficam no carrinho so durante a digitacao (nao valem como item)
      if (limpo === '') return { ...prev, itens: semItem }
      const atual = prev.itens.find((i) => chaveItem(i) === chave)
      const novo: ItemAlmoxarifado = atual
        ? { ...atual, quantidade: limpo }
        : {
            itemId: item.id,
            classificacao: classificacaoAtiva,
            nome: item.nome,
            unidade: item.unidade || 'un',
            saldoAtual: Number(item.estoque_atual ?? 0),
            retiradaId: item.retiradaId,
            retiradaItemIndex: item.retiradaItemIndex,
            quantidadePendente: item.quantidadePendente,
            quantidade: limpo,
            necessitaDevolucao: 'N',
            prazoDevolucao: '',
            setor: '',
            observacao: '',
          }
      return { ...prev, itens: atual ? prev.itens.map((i) => chaveItem(i) === chave ? novo : i) : [...semItem, novo] }
    })
  }

  const bump = (item: any, delta: number) => {
    const atual = numeroDe(itemDoCarrinho(item)?.quantidade)
    const proximo = Math.round((atual + delta) * 1000) / 1000
    setQuantidade(item, proximo <= 0 ? '' : String(proximo))
  }

  const atualizarItemCarrinho = (chave: string, parcial: Partial<ItemAlmoxarifado>) =>
    setForm((prev) => ({
      ...prev,
      itens: prev.itens.map((i) => chaveItem(i) === chave ? { ...i, ...parcial } : i),
    }))

  const trocarTipo = (tipo: string) => {
    if (tipo === form.tipo) return
    setForm((prev) => ({
      ...prev,
      tipo: tipo as FormState['tipo'],
      itens: [],
      quemPegou: tipo === 'devolucao' ? (usuario || '') : '',
    }))
    setDevolucaoSemPendencias(false)
    // Devolução abre em Pendentes; retirada na primeira classificação
    setClassificacaoAtiva(tipo === 'devolucao' ? 'Pendentes' : classificacoesDisponiveis.find((c) => c !== 'Pendentes') || '')
  }

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const itensValidos = form.itens.filter((item) => numeroDe(item.quantidade) > 0)
    if (itensValidos.length === 0) {
      setErrors([{ field: 'itens', message: 'Adicione pelo menos um item' }])
      scrollToFirstError([{ field: 'itens', message: 'Adicione pelo menos um item' }])
      setSalvando(false)
      return
    }

    // Setor unico do registro gravado em todos os itens; em devolucao nao ha prazo
    const itens = itensValidos.map((item) => ({
      ...item,
      quantidade: String(numeroDe(item.quantidade)),
      setor: form.setor,
      ...(devolucao ? { necessitaDevolucao: 'N', prazoDevolucao: '' } : {}),
    }))

    const result = await salvarRegistro('almoxarifado', {
      tipo: form.tipo,
      data: form.data,
      quemEntregou: form.quemEntregou,
      quemPegou: form.quemPegou,
      setor: form.setor,
      itens,
      observacao: form.observacao || '',
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      if (form.tipo === 'retirada' && fazendaId) {
        await Promise.all(itens.filter((item) => item.itemId).map((item) =>
          updateItemAlmoxarifadoSaldoCache(fazendaId, item.itemId!, -Number(item.quantidade))
        ))
      }
      // Devolução devolve ao estoque local ate o limite pendente (excedente fica retido para revisão)
      if (devolucao && fazendaId) {
        await Promise.all(itens.filter((item) => item.itemId).map((item) => {
          const q = Number(item.quantidade)
          const aprovado = item.quantidadePendente != null ? Math.min(q, item.quantidadePendente) : q
          return updateItemAlmoxarifadoSaldoCache(fazendaId, item.itemId!, aprovado)
        }))
      }
      limparRascunho()
      setTrocandoEntregou(false)
    }
  }

  const handleLimpar = () => {
    limparRascunho()
    setTrocandoEntregou(false)
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

  const labelEntregou = devolucao ? 'Quem recebeu' : 'Quem entregou'
  const labelPegou = devolucao ? 'QUEM DEVOLVEU?' : 'QUEM PEGOU?'

  return (
    <>
      <CadernetaLayout
        title="ALMOXARIFADO"
        cadernetaId="almoxarifado"
        dateContent={<DatePicker value={form.data} onChange={set('data')} variant="header" compact inline />}
      >
        <BannerRascunho
          visible={rascunhoRestaurado}
          onConfirmar={confirmarRascunho}
          onDescartar={descartarRascunho}
        />
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        <ChoiceGrid
          options={TIPO_OPTIONS}
          value={form.tipo}
          onChange={trocarTipo}
          cols={2}
          size="sm"
          dataField="tipo"
        />

        {/* Seção 1: Dados principais */}
        <CadernetaSection numero={1} titulo="Dados principais">
          <div className="flex flex-col gap-2.5" data-field="quemPegou" id="quemPegou">
            <p className="text-[15px] font-bold text-gray-900">
              {labelPegou} <span className="text-red-500">*</span>
            </p>
            {devolucao ? (
              <InfoStrip tone="neutral" icon="👤">
                {usuario ? `${usuario}: você só vê os itens que você mesmo pegou` : 'Usuário não identificado. Faça login novamente para devolver itens.'}
              </InfoStrip>
            ) : funcionariosDisponiveis.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {funcionariosDisponiveis.map((nome) => {
                  const selecionado = form.quemPegou === nome
                  return (
                    <button
                      key={nome}
                      type="button"
                      onClick={() => set('quemPegou')(selecionado ? '' : nome)}
                      aria-pressed={selecionado}
                      className={`flex !min-h-0 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-1 py-2.5 transition-all active:scale-95 ${
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
                    </button>
                  )
                })}
              </div>
            ) : (
              <Input
                placeholder="Nome de quem pegou"
                value={form.quemPegou}
                onChange={(e) => set('quemPegou')(e.target.value)}
              />
            )}
            {getError('quemPegou') && (
              <p className="text-base font-semibold text-red-700">{getError('quemPegou')}</p>
            )}
          </div>

          {form.quemEntregou && !trocandoEntregou ? (
            <div data-field="quemEntregou" className="flex items-center gap-2">
              <InfoStrip tone="neutral" icon="👤" className="flex-1">
                {labelEntregou}: {form.quemEntregou}{form.quemEntregou === usuario ? ' (pega do login)' : ''}
              </InfoStrip>
              {funcionariosDisponiveis.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTrocandoEntregou(true)}
                  className="!min-h-0 shrink-0 rounded-lg bg-gray-200 px-3 py-2 text-xs font-bold uppercase text-gray-700 active:scale-95"
                >
                  Trocar
                </button>
              )}
            </div>
          ) : funcionariosDisponiveis.length > 0 ? (
            <SearchableModal
              label={<span>{devolucao ? 'QUEM RECEBEU?' : 'QUEM ENTREGOU?'} <span className="text-red-500">*</span></span>}
              value={form.quemEntregou}
              onChange={(val) => { set('quemEntregou')(val); atualizarNomeUsuarioConfig(val); setTrocandoEntregou(false) }}
              error={getError('quemEntregou')}
              options={funcionariosDisponiveis}
              placeholder="Buscar funcionário..."
              id="quemEntregou"
              name="quemEntregou"
            />
          ) : (
            <Input
              label={<span>{devolucao ? 'QUEM RECEBEU?' : 'QUEM ENTREGOU?'} <span className="text-red-500">*</span></span>}
              placeholder="Nome de quem entregou"
              value={form.quemEntregou}
              onChange={(e) => { set('quemEntregou')(e.target.value); atualizarNomeUsuarioConfig(e.target.value) }}
              error={getError('quemEntregou')}
              id="quemEntregou"
            />
          )}
        </CadernetaSection>

        {/* Seção 2: Itens */}
        <CadernetaSection numero={2} titulo={devolucao ? 'Itens devolvidos' : 'Itens retirados'} required>
          {abasClassificacao.length > 0 && (
            <ChoiceGrid
              options={abasClassificacao.map((c) => ({ value: c, label: c, icon: iconePorNome(c) }))}
              value={classificacaoAtiva}
              onChange={setClassificacaoAtiva}
              cols={3}
              labelSize="xs"
              dataField="classificacao"
            />
          )}

          {devolucao && classificacaoAtiva === 'Pendentes' && devolucaoSemPendencias && (
            <InfoStrip tone="warning">
              Nenhum item pendente foi encontrado para esta pessoa. Se a devolução ocorreu offline, escolha um item pelo catálogo; o banco validará a quantidade quando sincronizar.
            </InfoStrip>
          )}

          <div className="flex flex-col" data-field="itens">
            {itensDisponiveis.length === 0 ? (
              <p className="py-2 text-sm text-gray-500">Nenhum item encontrado para esta classificação</p>
            ) : (
              itensDisponiveis.map((item) => {
                const noCarrinho = itemDoCarrinho(item)
                const qtd = noCarrinho?.quantidade ?? ''
                const unidade = item.unidade || 'un'
                const mostraSaldo = item.quantidadePendente != null || (!devolucao && item.controla_estoque)
                const saldo = Number(item.estoque_atual ?? 0)
                const acimaSaldo = !devolucao && item.controla_estoque && numeroDe(qtd) > saldo
                return (
                  <div
                    key={`${item.retiradaId ?? ''}-${item.retiradaItemIndex ?? ''}-${item.id || item.nome}`}
                    className="flex items-center gap-3 border-b border-gray-100 py-3 last:border-b-0"
                  >
                    <span className="text-2xl leading-none">{iconePorNome(classificacaoAtiva)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-base font-bold leading-tight text-gray-900">{item.nome}</p>
                      <p className={`text-sm ${acimaSaldo ? 'font-semibold text-amber-700' : 'text-gray-500'}`}>
                        {mostraSaldo
                          ? `${item.quantidadePendente != null ? 'pendente' : 'tem'} ${saldo.toLocaleString('pt-BR')} ${unidade}`
                          : unidade}
                        {acimaSaldo ? ' · acima do saldo' : ''}
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
                        inputMode={unidadeInteira(item.unidade) ? 'numeric' : 'decimal'}
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
              })
            )}
          </div>
          {getError('itens') && (
            <p className="text-base font-semibold text-red-700">{getError('itens')}</p>
          )}

          {form.itens.some((i) => numeroDe(i.quantidade) > 0) && (
            <div className="flex flex-col gap-1 rounded-xl bg-gray-100 p-3">
              <p className="text-sm font-bold text-gray-600">
                {devolucao ? 'Devolvendo agora' : 'Levando agora'}
              </p>
              {form.itens.filter((i) => numeroDe(i.quantidade) > 0).map((item) => {
                const chave = chaveItem(item)
                const volta = item.necessitaDevolucao === 'S'
                const acimaPendente = devolucao && item.quantidadePendente != null && numeroDe(item.quantidade) > item.quantidadePendente
                return (
                  <div key={chave} className="flex flex-col gap-2 border-b border-gray-200 py-2 last:border-b-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-base font-bold text-gray-700">
                        {numeroDe(item.quantidade).toLocaleString('pt-BR')} {item.nome}
                      </p>
                      {!devolucao && (
                        <div className="grid shrink-0 grid-cols-2 overflow-hidden rounded-xl border border-gray-300 bg-white">
                          {[{ v: 'S', l: 'VOLTA' }, { v: 'N', l: 'FICA' }].map((o) => (
                            <button
                              key={o.v}
                              type="button"
                              onClick={() => atualizarItemCarrinho(chave, { necessitaDevolucao: o.v, prazoDevolucao: o.v === 'N' ? '' : item.prazoDevolucao })}
                              className={`!min-h-0 px-3.5 py-2 text-xs font-extrabold ${
                                item.necessitaDevolucao === o.v ? 'bg-brand-900 text-white' : 'text-gray-500'
                              }`}
                            >
                              {o.l}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {volta && (
                      <DatePicker
                        label="DATA DEVOLUÇÃO"
                        value={item.prazoDevolucao || ''}
                        onChange={(val) => atualizarItemCarrinho(chave, { prazoDevolucao: val })}
                        error={getError(`itens[${form.itens.indexOf(item)}].prazoDevolucao`)}
                      />
                    )}
                    {acimaPendente && (
                      <InfoStrip tone="warning">
                        Quantidade acima do pendente ({item.quantidadePendente!.toLocaleString('pt-BR')} {item.unidade || 'un'}). O excedente ficará retido para revisão no painel.
                      </InfoStrip>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CadernetaSection>

        {/* Seção 3: Setor */}
        <CadernetaSection numero={3} titulo="Para qual setor?" required>
          <div data-field="setor" id="setor">
            {setoresDisponiveis.length === 0 ? (
              <Input
                placeholder="Informe o setor"
                value={form.setor}
                onChange={(e) => set('setor')(e.target.value)}
                error={getError('setor')}
              />
            ) : setoresDisponiveis.length > MAX_SETORES_TILES ? (
              <SearchableModal
                label=""
                value={form.setor}
                onChange={set('setor')}
                error={getError('setor')}
                options={setoresDisponiveis}
                placeholder="Buscar setor..."
                id="setorBusca"
                name="setor"
              />
            ) : (
              <ChoiceGrid
                options={setoresDisponiveis.map((s) => ({ value: s, label: s, icon: iconePorNome(s) }))}
                value={form.setor}
                onChange={set('setor')}
                cols={3}
                labelSize="xs"
              />
            )}
            {getError('setor') && setoresDisponiveis.length > 0 && setoresDisponiveis.length <= MAX_SETORES_TILES && (
              <p className="mt-2 text-base font-semibold text-red-700">{getError('setor')}</p>
            )}
          </div>
        </CadernetaSection>

        {/* Seção 4: Observação geral */}
        <CadernetaSection numero={4} titulo="Observação">
          <Input
            placeholder="Observações adicionais (opcional)"
            value={form.observacao}
            onChange={(e) => set('observacao')(e.target.value)}
            error={getError('observacao')}
          />
        </CadernetaSection>

        <FormFooter
          onSalvar={handleSalvar}
          onLimpar={handleLimpar}
          salvando={salvando}
          disabled={salvando || !isValid}
          formValido={isValid}
        />
      </CadernetaLayout>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleNewRecord}
        onNewRecord={handleNewRecord}
        onExit={() => navigate(-1)}
        cadernetaName="Almoxarifado"
        registro={registroSalvo}
        caderneta="almoxarifado"
      />
    </>
  )
}

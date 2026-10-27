import { useEffect, useRef, useState } from 'react'
import { useRefreshTick } from '../../hooks/useRefreshCadastros'
import { saveRegistro } from '../../services/indexedDB'
import { enqueueRegistro } from '../../services/syncService'
import { v4 as uuidv4 } from 'uuid'
import { generateVersion, getCurrentTimestamp } from '../../utils/generateId'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import { store } from '../../store/store'
import CadernetaHeader from '../../components/CadernetaHeader'
import { Input, DatePicker, ValidationMessage, SearchableModal, TimeInput, NumericInput } from '../../components/ui'
import { formatarMoedaBR } from '../../utils/formatNumber'
import SuccessModal from '../../components/SuccessModal'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { getInsumos, createInsumo, getFormulacoes, createFormulacao } from '../../services/supabaseService'
import {
  getFormulacoesListaCached,
  getFormulacoesListaFromCacheOnly,
  getInsumosListaCached,
  getInsumosListaFromCacheOnly,
} from '../../services/cadastroCache'
import { useCadastroOptions } from '../../hooks/useCadastroOptions'
import {
  chaveNomeProduto,
  encontrarProdutoPorNome,
  limparNomeProduto,
  montarNovoProduto,
  nomesParaSeletor,
  validarItensEntrada,
  type ProdutoNovo,
  type TipoProduto,
} from '../../utils/entradaInsumos'
import { Brush, Save, Plus, Trash2, Package, FileText, Truck } from 'lucide-react'

interface ItemEntrada {
  id: string // ID temporário para controle no frontend
  tipoItem: TipoProduto
  insumoId: string
  formulacaoId: string
  /** Produto digitado no campo (sem rede) que ainda não existe no servidor; é criado ao sincronizar. */
  produtoNovo: boolean
  produto: string
  quantidade: string
  valorUnitario: string
  valorTotal: string
  lote: string
  validade: string
}

interface FormState {
  dataEntrada: string
  horario: string
  notaFiscal: string
  fornecedor: string
  placa: string
  motorista: string
  responsavelRecebimento: string
  itens: ItemEntrada[]
}

const generateLocalId = () => Math.random().toString(36).substring(2, 9)

const makeInitialItem = (): ItemEntrada => ({
  id: generateLocalId(),
  tipoItem: 'insumo',
  insumoId: '',
  formulacaoId: '',
  produtoNovo: false,
  produto: '',
  quantidade: '',
  valorUnitario: '',
  valorTotal: '',
  lote: '',
  validade: '',
})

const horaAtual = () => new Date().toTimeString().slice(0, 5) // HH:MM

const makeInitial = (): FormState => ({
  dataEntrada: todayBR(),
  // Já nasce com a hora atual: depois de salvar ou limpar o efeito do horário não roda de novo, e o campo ficava vazio
  horario: horaAtual(),
  notaFiscal: '',
  fornecedor: '',
  placa: '',
  motorista: '',
  responsavelRecebimento: '',
  itens: [makeInitialItem()],
})

export default function EntradaInsumosPage() {
  const navigate = useNavigate()
  const { fazendaId, usuario } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const { options: fornecedoresOptions, loading: loadingFornecedores } = useCadastroOptions('fornecedores', fazendaId)
  const { options: funcionariosOptions, loading: loadingFuncionarios } = useCadastroOptions('funcionarios', fazendaId)
  const [insumosSupabase, setInsumosSupabase] = useState<any[]>([])
  const [formulacoesSupabase, setFormulacoesSupabase] = useState<any[]>([])
  const [loadingInsumos, setLoadingInsumos] = useState(false)
  const [isHorarioManual, setIsHorarioManual] = useState(false)
  const [novoInsumoModal, setNovoInsumoModal] = useState<{ open: boolean; nomeInicial: string; itemId: string; tipo: 'insumo' | 'formulacao' }>({ open: false, nomeInicial: '', itemId: '', tipo: 'insumo' })
  const [novoInsumoNome, setNovoInsumoNome] = useState('')
  const [criandoInsumo, setCriandoInsumo] = useState(false)
  const [erroCriacao, setErroCriacao] = useState('')
  // Erro por campo (item_<índice>_<campo>), mostrado junto do campo; `errors` guarda só as mensagens gerais do topo
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  // Insumos/produtos finais criados no campo que ainda não foram enviados ao servidor (criados ao sincronizar)
  const [produtosNovos, setProdutosNovos] = useState<ProdutoNovo[]>([])
  const [online, setOnline] = useState(() => navigator.onLine)
  const alertaRef = useRef<HTMLDivElement>(null)

  const limparErros = () => {
    setErrors(prev => (prev.length > 0 ? [] : prev))
    setFieldErrors(prev => (Object.keys(prev).length > 0 ? {} : prev))
  }

  const set = (field: keyof Omit<FormState, 'itens'>) => (val: string) => {
    limparErros()
    setForm((prev) => ({ ...prev, [field]: val }))
  }

  const setInput = (field: keyof Omit<FormState, 'itens'>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    limparErros()
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const getError = (field: string) => fieldErrors[field]

  // Funções para gerenciar itens
  const addItem = () => {
    limparErros()
    setForm(prev => ({
      ...prev,
      itens: [...prev.itens, makeInitialItem()]
    }))
  }

  const removeItem = (itemId: string) => {
    limparErros()
    setForm(prev => ({
      ...prev,
      itens: prev.itens.filter(item => item.id !== itemId)
    }))
  }

  // Aplica várias mudanças a um item de uma vez
  const patchItem = (itemId: string, patch: Partial<ItemEntrada>) => {
    limparErros()
    setForm(prev => ({
      ...prev,
      itens: prev.itens.map(item => (item.id === itemId ? { ...item, ...patch } : item)),
    }))
  }

  const updateItem = (itemId: string, field: keyof ItemEntrada, value: string) => {
    limparErros()
    setForm(prev => ({
      ...prev,
      itens: prev.itens.map(item => {
        if (item.id !== itemId) return item
        const updated = { ...item, [field]: value }
        // Recalcular valor total se quantidade ou valor unitário mudou
        if (field === 'quantidade' || field === 'valorUnitario') {
          const qtd = parseFloat(field === 'quantidade' ? value : item.quantidade) || 0
          const unit = parseFloat(field === 'valorUnitario' ? value : item.valorUnitario) || 0
          updated.valorTotal = (qtd * unit).toFixed(2)
        }
        return updated
      })
    }))
  }

  const trocarTipoItem = (itemId: string, tipo: TipoProduto) => {
    patchItem(itemId, { tipoItem: tipo, produto: '', insumoId: '', formulacaoId: '', produtoNovo: false })
  }

  const updateItemProduto = (itemId: string, produtoNome: string) => {
    // O seletor do item só lista produtos do tipo dele; procurar só nessa lista evita que um nome que existe nos
    // dois cadastros (ex.: "Premix") vire insumo quando o item é produto final.
    const tipo = form.itens.find(i => i.id === itemId)?.tipoItem ?? 'insumo'
    const encontrado = encontrarProdutoPorNome(tipo === 'formulacao' ? formulacoesSupabase : insumosSupabase, produtoNome)
    if (encontrado) {
      patchItem(
        itemId,
        tipo === 'formulacao'
          ? { produto: encontrado.nome, formulacaoId: encontrado.id || '', insumoId: '', produtoNovo: false }
          : { produto: encontrado.nome, insumoId: encontrado.id || '', formulacaoId: '', produtoNovo: false }
      )
      return
    }
    // Produto criado no campo e ainda não enviado: segue sem id e é criado ao sincronizar
    const novo = produtosNovos.find(p => p.tipo === tipo && limparNomeProduto(p.nome) === limparNomeProduto(produtoNome))
    patchItem(itemId, { produto: produtoNome, insumoId: '', formulacaoId: '', produtoNovo: Boolean(novo) })
  }

  const getValorTotalEntrada = () => {
    return form.itens.reduce((total, item) => {
      return total + (parseFloat(item.valorTotal) || 0)
    }, 0).toFixed(2)
  }

  const abrirModalNovoInsumo = (itemId: string, nomeInicial: string) => {
    const item = form.itens.find(i => i.id === itemId)
    const tipo = item?.tipoItem === 'formulacao' ? 'formulacao' : 'insumo'
    setNovoInsumoNome(nomeInicial)
    setErroCriacao('')
    setNovoInsumoModal({ open: true, nomeInicial, itemId, tipo })
  }

  const fecharModalNovoInsumo = () => {
    setNovoInsumoModal({ open: false, nomeInicial: '', itemId: '', tipo: 'insumo' })
    setNovoInsumoNome('')
    setErroCriacao('')
  }

  // Sem rede: o produto fica só neste aparelho e o item guarda o nome; o servidor cria o cadastro ao sincronizar
  const usarProdutoNovoLocal = (itemId: string, tipo: TipoProduto, nome: string) => {
    setProdutosNovos(prev =>
      prev.some(p => p.tipo === tipo && limparNomeProduto(p.nome) === nome) ? prev : [...prev, { tipo, nome }]
    )
    patchItem(itemId, { tipoItem: tipo, produto: nome, insumoId: '', formulacaoId: '', produtoNovo: true })
    fecharModalNovoInsumo()
  }

  const handleCriarItem = async () => {
    const nome = limparNomeProduto(novoInsumoNome)
    if (!nome || !fazendaId) return
    const { itemId, tipo } = novoInsumoModal
    setErroCriacao('')

    // Já existe um produto com esse nome (mesmo com outra grafia): só seleciona, sem duplicar o cadastro
    const existente = encontrarProdutoPorNome(tipo === 'formulacao' ? formulacoesSupabase : insumosSupabase, nome)
    if (existente) {
      patchItem(
        itemId,
        tipo === 'formulacao'
          ? { produto: existente.nome, formulacaoId: existente.id || '', insumoId: '', produtoNovo: false }
          : { produto: existente.nome, insumoId: existente.id || '', formulacaoId: '', produtoNovo: false }
      )
      fecharModalNovoInsumo()
      return
    }

    // Já foi cadastrado neste aparelho e ainda não subiu (ex.: em outro item): reaproveita, mantendo a grafia
    const pendente = produtosNovos.find(p => p.tipo === tipo && chaveNomeProduto(p.nome) === chaveNomeProduto(nome))
    if (pendente) {
      patchItem(itemId, { produto: pendente.nome, insumoId: '', formulacaoId: '', produtoNovo: true })
      fecharModalNovoInsumo()
      return
    }

    // Modo teste e sem rede não escrevem no servidor: o produto fica local e é criado ao sincronizar
    if (store.getState().config.testModeAtivo || !navigator.onLine) {
      usarProdutoNovoLocal(itemId, tipo, nome)
      return
    }

    setCriandoInsumo(true)
    try {
      if (tipo === 'formulacao') {
        const novaFormulacao = await createFormulacao({
          nome,
          fazenda_id: fazendaId,
          ativo: true,
          e_premix: false,
        })
        const formulacoes = await getFormulacoes(fazendaId)
        setFormulacoesSupabase(formulacoes || [])
        patchItem(itemId, { produto: novaFormulacao.nome, formulacaoId: novaFormulacao.id, insumoId: '', produtoNovo: false })
      } else {
        const novoInsumo = await createInsumo({
          nome,
          fazenda_id: fazendaId,
          ativo: true,
        })
        const insumos = await getInsumos(fazendaId)
        setInsumosSupabase(insumos || [])
        patchItem(itemId, { produto: novoInsumo.nome, insumoId: novoInsumo.id, formulacaoId: '', produtoNovo: false })
      }
      fecharModalNovoInsumo()
    } catch (error) {
      console.error('Erro ao criar item:', error)
      const mensagem = error instanceof Error ? error.message : String(error)
      if (!navigator.onLine || /fetch|network|timeout|failed to load/i.test(mensagem)) {
        // A conexão caiu no meio: segue como sem rede
        usarProdutoNovoLocal(itemId, tipo, nome)
      } else {
        setErroCriacao('Não foi possível criar agora. Confira o nome e tente de novo.')
      }
    } finally {
      setCriandoInsumo(false)
    }
  }

  const refreshTick = useRefreshTick()
  // Carregar insumos e formulações do Supabase com fallback para cache offline
  useEffect(() => {
    async function carregarInsumos() {
      if (!fazendaId) {
        setInsumosSupabase([])
        setFormulacoesSupabase([])
        setLoadingInsumos(false)
        return
      }
      setLoadingInsumos(true)
      try {
        // Online busca no servidor; sem rede (ou com rede lenta) cai na lista com ids guardada no aparelho
        const [insumos, formulacoes] = await Promise.all([
          getInsumosListaCached(fazendaId).then(lista => lista ?? getInsumosListaFromCacheOnly(fazendaId)),
          getFormulacoesListaCached(fazendaId).then(lista => lista ?? getFormulacoesListaFromCacheOnly(fazendaId)),
        ])
        setInsumosSupabase(insumos ?? [])
        setFormulacoesSupabase(formulacoes ?? [])
      } catch (error) {
        console.error('Erro ao carregar insumos:', error)
        setInsumosSupabase([])
        setFormulacoesSupabase([])
      } finally {
        setLoadingInsumos(false)
      }
    }
    carregarInsumos()
  }, [fazendaId, refreshTick])

  // Atualiza horário automaticamente a cada minuto se não foi editado pelo usuário
  useEffect(() => {
    if (isHorarioManual) return

    // Inicializa com hora atual
    const agora = new Date()
    const horaAtual = agora.toTimeString().slice(0, 5) // HH:MM
    setForm(prev => ({ ...prev, horario: horaAtual }))

    // Atualiza a cada minuto
    const interval = setInterval(() => {
      const novoAgora = new Date()
      const novaHora = novoAgora.toTimeString().slice(0, 5)
      setForm(prev => ({ ...prev, horario: novaHora }))
    }, 60000) // 1 minuto

    return () => clearInterval(interval)
  }, [isHorarioManual])

  // Acompanha a conexão para avisar, no cadastro de produto novo, que ele será criado ao sincronizar
  useEffect(() => {
    const aoMudar = () => setOnline(navigator.onLine)
    window.addEventListener('online', aoMudar)
    window.addEventListener('offline', aoMudar)
    return () => {
      window.removeEventListener('online', aoMudar)
      window.removeEventListener('offline', aoMudar)
    }
  }, [])

  // A barra fixa de baixo não pode cobrir o campo que ganha foco: reserva espaço ao rolar a página
  useEffect(() => {
    const raiz = document.documentElement
    const anterior = raiz.style.scrollPaddingBottom
    raiz.style.scrollPaddingBottom = '9rem'
    return () => {
      raiz.style.scrollPaddingBottom = anterior
    }
  }, [])

  // Marca horário como manual quando usuário altera
  const handleHorarioChange = (value: string) => {
    limparErros()
    setIsHorarioManual(true)
    setForm({ ...form, horario: value })
  }

  // Leva o erro para dentro da tela: o aviso fica no topo, longe do botão SALVAR que fica embaixo
  const mostrarErros = (geral: string[], campos: Record<string, string>, primeiroCampoComErro?: string) => {
    setErrors(geral.map(message => ({ field: 'geral', message })))
    setFieldErrors(campos)
    const indice = primeiroCampoComErro ? Number(primeiroCampoComErro.split('_')[1]) : -1
    const itemComErro = indice >= 0 ? form.itens[indice] : undefined
    requestAnimationFrame(() => {
      const alvo = (itemComErro && document.getElementById(`item-${itemComErro.id}`)) || alertaRef.current
      alvo?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const handleSalvar = async () => {
    setSalvando(true)
    limparErros()

    // Validar itens: item em branco é ignorado; item pela metade bloqueia; produto final exige lote
    const validacao = validarItensEntrada(form.itens)
    if (validacao.geral.length > 0) {
      mostrarErros(validacao.geral, validacao.campos, validacao.primeiroCampoComErro)
      setSalvando(false)
      return
    }
    const itensValidos = validacao.validos.map(i => form.itens[i])

    try {
      // 1. Salvar cabeçalho da entrada
      const agora = new Date()
      const hora = agora.getHours().toString().padStart(2, '0')
      const minuto = agora.getMinutes().toString().padStart(2, '0')
      const dataComHora = `${form.dataEntrada} ${hora}:${minuto}`

      const entradaId = uuidv4()
      const testModeAtivo = store.getState().config.testModeAtivo
      const registroEntrada = {
        dataEntrada: form.dataEntrada,
        horario: form.horario,
        notaFiscal: form.notaFiscal,
        fornecedor: form.fornecedor,
        placa: form.placa,
        motorista: form.motorista,
        responsavelRecebimento: form.responsavelRecebimento,
        usuario: form.responsavelRecebimento || usuario || '',
        data: dataComHora,
        id: entradaId,
        version: generateVersion(),
        lastModified: getCurrentTimestamp(),
        syncStatus: 'pending' as const,
        isTestRecord: testModeAtivo ? true : undefined,
      }

      await saveRegistro('entrada-insumos', registroEntrada)
      if (!testModeAtivo) {
        await enqueueRegistro('entrada-insumos', entradaId, 'create')
      }

      // 2. Salvar cada item
      for (const item of itensValidos) {
        const itemId = uuidv4()
        // Produto criado no campo (sem rede): o item leva o nome e o servidor cria o cadastro ao sincronizar
        const novoProduto = montarNovoProduto(item)
        const registroItem = {
          entradaId: entradaId,
          insumoId: item.tipoItem === 'insumo' ? item.insumoId : null,
          formulacaoId: item.tipoItem === 'formulacao' ? item.formulacaoId : null,
          ...(novoProduto ? { novoProduto } : {}),
          produto: item.produto,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
          valorTotal: item.valorTotal,
          lote: item.tipoItem === 'formulacao' ? item.lote : null,
          validade: item.tipoItem === 'formulacao' ? item.validade : null,
          data: dataComHora,
          id: itemId,
          version: generateVersion(),
          lastModified: getCurrentTimestamp(),
          syncStatus: 'pending' as const,
          isTestRecord: testModeAtivo ? true : undefined,
        }

        await saveRegistro('entrada-insumos-itens', registroItem)
        if (!testModeAtivo) {
          await enqueueRegistro('entrada-insumos-itens', itemId, 'create')
        }
      }

      // 3. Delay para persistência
      await new Promise(resolve => setTimeout(resolve, 100))

      // Adicionar itens ao registro para compartilhamento
      const registroComItens = {
        ...registroEntrada,
        itens: itensValidos.map(item => ({
          produto: item.produto,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
          valorTotal: item.valorTotal,
        }))
      }

      setRegistroSalvo(registroComItens)
      setShowSuccessModal(true)
      setForm(makeInitial())
      setIsHorarioManual(false)
    } catch (error) {
      console.error('Erro ao salvar:', error)
      setErrors([{ field: 'geral', message: 'Erro ao salvar registro. Tente novamente.' }])
    } finally {
      setSalvando(false)
    }
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/modulos/cadernetas')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <CadernetaHeader
        title="ENTRADA INSUMOS"
        cadernetaId="entrada-insumos"
        dateContent={<DatePicker value={form.dataEntrada} onChange={set('dataEntrada')} variant="header" compact inline />}
      />

      <main className="flex-1 p-4 flex flex-col gap-4 pb-28 desktop-form-container">
        {errors.length > 0 && (
          <div ref={alertaRef} role="alert" aria-live="assertive" className="scroll-mt-24">
            <ValidationMessage errors={errors} />
          </div>
        )}

        {/* Seção 1: Itens recebidos (o mais importante vem primeiro) */}
        <section aria-labelledby="sec-itens" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-black text-white" aria-hidden="true">1</span>
            <div className="flex-1">
              <h2 id="sec-itens" className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <Package className="h-5 w-5 text-green-700" aria-hidden="true" />
                O que chegou
              </h2>
              <p className="text-sm text-gray-600">Informe cada produto recebido e a quantidade.</p>
            </div>
          </div>

          {form.itens.map((item, index) => {
            const ehFormulacao = item.tipoItem === 'formulacao'
            const trocarTipo = (tipo: TipoProduto) => {
              if (item.tipoItem === tipo) return
              trocarTipoItem(item.id, tipo)
            }
            const tipoBtn = (tipo: TipoProduto, texto: string) => {
              const ativo = item.tipoItem === tipo
              return (
                <button
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  onClick={() => trocarTipo(tipo)}
                  className={`flex-1 !min-h-[48px] rounded-lg px-3 text-base font-bold transition-colors ${
                    ativo ? 'bg-green-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {texto}
                </button>
              )
            }
            return (
              <div key={item.id} id={`item-${item.id}`} className="rounded-xl border-2 border-gray-200 bg-gray-50/60 p-3 flex flex-col gap-3 scroll-mt-24">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-gray-800 uppercase tracking-wide">
                    Item {index + 1} de {form.itens.length}
                  </span>
                  {form.itens.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remover item ${index + 1}`}
                      className="inline-flex !min-h-[44px] items-center gap-1 rounded-lg px-3 text-sm font-bold text-red-700 hover:bg-red-50 active:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Remover
                    </button>
                  )}
                </div>

                <div role="radiogroup" aria-label="Tipo do item" className="flex gap-1 rounded-xl bg-gray-100 p-1">
                  {tipoBtn('insumo', 'Insumo')}
                  {tipoBtn('formulacao', 'Produto final')}
                </div>

                <SearchableModal
                  label={ehFormulacao ? 'PRODUTO FINAL *' : 'INSUMO *'}
                  value={item.produto}
                  onChange={(value) => updateItemProduto(item.id, value)}
                  error={getError(`item_${index}_produto`)}
                  options={nomesParaSeletor(ehFormulacao ? formulacoesSupabase : insumosSupabase, produtosNovos, item.tipoItem)}
                  placeholder={ehFormulacao ? 'Toque para buscar produto final...' : 'Toque para buscar insumo...'}
                  disabled={loadingInsumos}
                  id={`produto_${item.id}`}
                  name={`produto_${item.id}`}
                  onCreateNew={(termo) => abrirModalNovoInsumo(item.id, termo)}
                  createNewLabel={ehFormulacao ? 'Novo Produto' : 'Novo Insumo'}
                />
                {loadingInsumos && <p className="-mt-2 text-sm text-gray-600" role="status">Carregando lista de produtos...</p>}
                {item.produtoNovo && (
                  <p className="-mt-2 text-sm font-bold text-amber-800" role="status">
                    Produto novo: será cadastrado quando os dados forem sincronizados.
                  </p>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <NumericInput
                    label="QUANTIDADE (kg) *"
                    decimalPlaces={3}
                    value={item.quantidade}
                    onChange={(v) => updateItem(item.id, 'quantidade', v)}
                    error={getError(`item_${index}_quantidade`)}
                  />
                  <NumericInput
                    label="VALOR POR KG (R$)"
                    decimalPlaces={4}
                    value={item.valorUnitario}
                    onChange={(v) => updateItem(item.id, 'valorUnitario', v)}
                    error={getError(`item_${index}_valorUnitario`)}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg bg-white border border-gray-200 px-3 py-2" aria-live="polite">
                  <span className="text-sm font-bold text-gray-700">Total do item</span>
                  <span className="text-lg font-black text-gray-900">R$ {formatarMoedaBR(item.valorTotal || '0') ?? '0,00'}</span>
                </div>

                {ehFormulacao && (
                  <div className="flex flex-col gap-3 rounded-xl border border-purple-200 bg-purple-50 p-3">
                    <p className="text-sm font-extrabold text-purple-800">Rastreabilidade do produto final</p>
                    <Input
                      label="LOTE *"
                      value={item.lote}
                      onChange={(e) => updateItem(item.id, 'lote', e.target.value)}
                      error={getError(`item_${index}_lote`)}
                      placeholder="Ex: Lote 123"
                    />
                    <Input
                      label="VALIDADE"
                      type="date"
                      value={item.validade}
                      onChange={(e) => updateItem(item.id, 'validade', e.target.value)}
                      error={getError(`item_${index}_validade`)}
                    />
                  </div>
                )}
              </div>
            )
          })}

          <button
            type="button"
            onClick={addItem}
            className="inline-flex w-full !min-h-[52px] items-center justify-center gap-2 rounded-xl border-2 border-dashed border-green-600 bg-green-50 px-3 text-base font-bold text-green-800 hover:bg-green-100 active:scale-[0.99]"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            Adicionar outro item
          </button>
        </section>

        {/* Seção 2: Nota fiscal e fornecedor */}
        <section aria-labelledby="sec-doc" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-black text-white" aria-hidden="true">2</span>
            <h2 id="sec-doc" className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-700" aria-hidden="true" />
              Nota fiscal e fornecedor
            </h2>
          </div>
          <SearchableModal
            label="FORNECEDOR"
            value={form.fornecedor}
            onChange={set('fornecedor')}
            error={getError('fornecedor')}
            options={fornecedoresOptions}
            placeholder="Toque para buscar fornecedor..."
            disabled={loadingFornecedores}
            id="fornecedor"
            name="fornecedor"
          />
          <Input
            label="N° NOTA FISCAL"
            value={form.notaFiscal}
            onChange={setInput('notaFiscal')}
            error={getError('notaFiscal')}
            inputMode="numeric"
          />
        </section>

        {/* Seção 3: Recebimento e transporte */}
        <section aria-labelledby="sec-receb" className="bg-white rounded-2xl p-4 shadow-sm border border-gray-200 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-black text-white" aria-hidden="true">3</span>
            <h2 id="sec-receb" className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-700" aria-hidden="true" />
              Recebimento e transporte
            </h2>
          </div>
          <SearchableModal
            label="RESPONSÁVEL PELO RECEBIMENTO"
            value={form.responsavelRecebimento}
            onChange={set('responsavelRecebimento')}
            error={getError('responsavelRecebimento')}
            options={funcionariosOptions}
            placeholder="Toque para buscar funcionário..."
            disabled={loadingFuncionarios}
            id="responsavelRecebimento"
            name="responsavelRecebimento"
          />
          <div>
            <TimeInput
              label="HORÁRIO *"
              value={form.horario}
              onChange={handleHorarioChange}
            />
            {!isHorarioManual && (
              <p className="mt-1 text-sm text-gray-600">Preenchido com a hora atual. Toque para alterar.</p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="PLACA DO VEÍCULO"
              value={form.placa}
              onChange={setInput('placa')}
              error={getError('placa')}
              autoCapitalize="characters"
            />
            <Input
              label="MOTORISTA"
              value={form.motorista}
              onChange={setInput('motorista')}
              error={getError('motorista')}
              placeholder="Nome do motorista"
            />
          </div>
        </section>

        <button
          type="button"
          onClick={() => {
            if (!window.confirm('Limpar todos os campos do formulário?')) return
            setForm(makeInitial()); setErrors([]); setFieldErrors({}); setProdutosNovos([]); setIsHorarioManual(false)
          }}
          className="inline-flex w-full !min-h-[48px] items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-3 text-sm font-bold text-gray-700 hover:bg-gray-100 active:scale-[0.99]"
        >
          <Brush className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
          LIMPAR FORMULÁRIO
        </button>
      </main>

      {/* Barra fixa: total sempre visível + ação principal ao alcance do polegar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1" aria-live="polite">
            <p className="text-xs font-bold uppercase text-gray-600">
              Total · {form.itens.length} {form.itens.length === 1 ? 'item' : 'itens'}
            </p>
            <p className="truncate text-xl font-black text-gray-900">
              R$ {formatarMoedaBR(getValorTotalEntrada()) ?? getValorTotalEntrada()}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSalvar}
            disabled={salvando}
            className={`inline-flex !min-h-[56px] min-w-[150px] items-center justify-center gap-2 rounded-xl px-6 text-base font-extrabold transition-colors active:scale-[0.98] ${
              salvando
                ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <Save className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            {salvando ? 'SALVANDO...' : 'SALVAR'}
          </button>
        </div>
      </div>

      {/* Modal criação de novo insumo */}
      {novoInsumoModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4 p-6">
            <h3 className="text-lg font-bold text-gray-900">
              {novoInsumoModal.tipo === 'formulacao' ? 'Novo Produto' : 'Novo Insumo'}
            </h3>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                {novoInsumoModal.tipo === 'formulacao' ? 'NOME DO PRODUTO' : 'NOME DO INSUMO'}
              </label>
              <input
                type="text"
                value={novoInsumoNome}
                onChange={(e) => setNovoInsumoNome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCriarItem()}
                placeholder="Ex: Milho, Ração, Sal mineral..."
                autoFocus
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none"
              />
            </div>
            {!online && (
              <p className="text-sm font-bold text-amber-800" role="status">
                Sem internet: o {novoInsumoModal.tipo === 'formulacao' ? 'produto' : 'insumo'} será cadastrado quando os dados forem sincronizados.
              </p>
            )}
            {erroCriacao && (
              <p className="text-sm font-bold text-red-700" role="alert">{erroCriacao}</p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={fecharModalNovoInsumo}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={handleCriarItem}
                disabled={criandoInsumo || !novoInsumoNome.trim()}
                className="flex-1 px-4 py-3 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {criandoInsumo ? 'CRIANDO...' : 'CRIAR'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Entrada de Insumos"
        registro={registroSalvo}
        caderneta="entrada-insumos"
      />
    </div>
  )
}

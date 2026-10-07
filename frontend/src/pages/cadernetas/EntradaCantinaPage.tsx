import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input, DatePicker, ValidationMessage } from '../../components/ui'
import { Minus, Plus, Mic } from 'lucide-react'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import CadernetaSection from '../../components/cadernetas/CadernetaSection'
import ChoiceGrid from '../../components/cadernetas/ChoiceGrid'
import InfoStrip from '../../components/cadernetas/InfoStrip'
import FormFooter from '../../components/cadernetas/FormFooter'
import { salvarRegistro } from '../../services/api'
import { todayBR, getCurrentTimeInTimezone, DEFAULT_FARM_TIMEZONE } from '../../utils/formatDate'
import { scrollToFirstError } from '../../utils/scrollToError'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { getItensCantinaCached, updateItemCantinaSaldoCache } from '../../services/cadastroCache'
import { CLASSIFICACOES_CANTINA, UNIDADES_CANTINA, UNIDADE_DESCRICOES } from '../../utils/constants'
import { useVoiceInput } from '../../hooks/useVoiceInput'

interface ItemEntrada {
  itemId: string
  nome: string
  classificacao: string
  unidade_medida: string
  quantidade: string
  novoItem?: boolean
}

interface ItemCatalogo {
  id: string
  nome: string
  unidade_medida: string
  estoque_atual?: number
  classificacao: string
}

const ICONES_CLASSIFICACAO: Record<string, string> = {
  'Perecíveis': '🧊',
  'Não Perecíveis': '🍚',
  'Bebidas': '🥤',
  'Limpeza/Higiene': '🧼',
  'Hortifruti': '🥬',
  'Carnes': '🥩',
}

const UNIDADES_DECIMAIS = ['kg', 'g', 'L', 'mL']
const unidadeInteira = (unidade?: string) => !UNIDADES_DECIMAIS.includes(unidade || '')
const numeroDe = (valor: string | undefined) => {
  const n = Number(String(valor ?? '').replace(',', '.'))
  return isNaN(n) ? 0 : n
}
const formatarQtd = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
const rotuloUnidade = (un: string) => (un === 'Unidade' ? '' : ` ${un}`)

export default function EntradaCantinaPage() {
  const navigate = useNavigate()
  const { fazendaId, usuario } = useSelector((state: RootState) => state.config)
  const [data, setData] = useState(todayBR())
  const [observacao, setObservacao] = useState('')
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)

  const [classificacaoAtiva, setClassificacaoAtiva] = useState<string>(CLASSIFICACOES_CANTINA[0])
  const [itensDaClassificacao, setItensDaClassificacao] = useState<any[]>([])
  // Itens cadastrados já vistos (de qualquer classificação), para montar o registro
  const [catalogo, setCatalogo] = useState<Record<string, ItemCatalogo>>({})
  const [quantidades, setQuantidades] = useState<Record<string, string>>({})
  // Itens criados no PWA (uuid local); o sync cria no servidor antes de postar o registro
  const [itensNovos, setItensNovos] = useState<ItemEntrada[]>([])
  const [recarregar, setRecarregar] = useState(0)

  const [mostrarNovo, setMostrarNovo] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novaUnidade, setNovaUnidade] = useState('')
  const [novaQuantidade, setNovaQuantidade] = useState('')
  const [novoErro, setNovoErro] = useState<string | null>(null)
  const { ouvindo, toggle: toggleVoz, erro: erroVoz } = useVoiceInput()

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  useEffect(() => {
    if (!fazendaId) return
    let cancelado = false
    getItensCantinaCached(fazendaId, classificacaoAtiva)
      .then((lista) => {
        if (cancelado) return
        const controlados = (lista || []).filter((item: any) => item.controla_estoque)
        setItensDaClassificacao(controlados)
        setCatalogo((prev) => {
          const novo = { ...prev }
          controlados.forEach((item: any) => {
            novo[item.id] = {
              id: item.id,
              nome: item.nome,
              unidade_medida: item.unidade_medida,
              estoque_atual: item.estoque_atual,
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
  }, [classificacaoAtiva, fazendaId, recarregar])

  const setQuantidade = (item: { id: string; unidade_medida: string }, bruto: string) => {
    const limpo = unidadeInteira(item.unidade_medida)
      ? bruto.replace(/[^0-9]/g, '')
      : bruto.replace(/[^0-9,.]/g, '').replace(',', '.')
    setQuantidades((prev) => ({ ...prev, [item.id]: limpo }))
  }

  const bump = (item: { id: string; unidade_medida: string }, delta: number) => {
    const atual = numeroDe(quantidades[item.id])
    const prox = Math.max(0, Math.round((atual + delta) * 1000) / 1000)
    setQuantidades((prev) => ({ ...prev, [item.id]: prox === 0 ? '' : String(prox) }))
  }

  // Itens do registro: cadastrados com quantidade > 0 + itens novos
  const itensDoRegistro: ItemEntrada[] = useMemo(() => {
    const cadastrados = Object.entries(quantidades)
      .filter(([, q]) => numeroDe(q) > 0)
      .map(([id, q]) => {
        const c = catalogo[id]
        return c
          ? { itemId: id, nome: c.nome, classificacao: c.classificacao, unidade_medida: c.unidade_medida, quantidade: q }
          : null
      })
      .filter((i): i is ItemEntrada => i !== null)
    return [...cadastrados, ...itensNovos.filter((i) => numeroDe(i.quantidade) > 0)]
  }, [quantidades, catalogo, itensNovos])

  const horaRecebimento = useMemo(() => getCurrentTimeInTimezone(DEFAULT_FARM_TIMEZONE).slice(0, 5), [])
  const formValido = !!data && itensDoRegistro.length > 0

  const handleAdicionarNovo = () => {
    if (!novoNome.trim()) return setNovoErro('Informe o nome do item')
    if (!novaUnidade) return setNovoErro('Escolha a unidade de medida')
    if (numeroDe(novaQuantidade) <= 0) return setNovoErro('Informe a quantidade que chegou')
    setItensNovos((prev) => [
      ...prev,
      {
        itemId: crypto.randomUUID(),
        nome: novoNome.trim(),
        classificacao: classificacaoAtiva,
        unidade_medida: novaUnidade,
        quantidade: novaQuantidade.replace(',', '.'),
        novoItem: true,
      },
    ])
    setNovoNome('')
    setNovaUnidade('')
    setNovaQuantidade('')
    setNovoErro(null)
    setMostrarNovo(false)
  }

  const handleVoz = async () => {
    await toggleVoz((texto) => setNovoNome(texto))
  }

  const handleSalvar = async () => {
    if (!formValido) {
      setErrors([{ field: 'itens', message: 'Adicione pelo menos um item' }])
      return
    }
    setSalvando(true)
    setErrors([])

    const itensStorage: Record<string, string> = {}
    itensDoRegistro.forEach((item) => {
      itensStorage[`${item.nome} (${item.unidade_medida})`] = item.quantidade
    })

    const result = await salvarRegistro('entrada-cantina', {
      data,
      itens: itensStorage,
      itensDetalhe: itensDoRegistro,
      quemRecebeu: usuario || '',
      observacao,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      if (fazendaId) {
        await Promise.all(itensDoRegistro.map((item) =>
          updateItemCantinaSaldoCache(fazendaId, item.itemId, numeroDe(item.quantidade))
        ))
      }
    }
  }

  const limparForm = () => {
    setData(todayBR())
    setObservacao('')
    setQuantidades({})
    setItensNovos([])
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

  const novosDaClassificacao = itensNovos.filter((i) => i.classificacao === classificacaoAtiva)

  return (
    <CadernetaLayout
      title="CANTINA · ENTRADA"
      cadernetaId="entrada-cantina"
      dateContent={<DatePicker value={data} onChange={setData} variant="header" compact inline />}
    >
      {errors.length > 0 && <ValidationMessage errors={errors} />}

      <CadernetaSection numero={1} titulo="O que chegou?" required>
        <div>
          <label className="mb-2 block text-[15px] font-bold uppercase text-gray-900">
            Tipo <span className="text-red-500">*</span>
          </label>
          <ChoiceGrid
            options={CLASSIFICACOES_CANTINA.map((c) => ({
              value: c,
              label: c === 'Limpeza/Higiene' ? 'Limpeza / higiene' : c,
              icon: ICONES_CLASSIFICACAO[c],
            }))}
            value={classificacaoAtiva}
            onChange={(v) => {
              setClassificacaoAtiva(v)
              setMostrarNovo(false)
            }}
            cols={3}
            labelSize="xs"
          />
        </div>

        <div className="flex flex-col" data-field="itens">
          {itensDaClassificacao.length === 0 && novosDaClassificacao.length === 0 ? (
            <p className="py-2 text-sm text-gray-500">Nenhum item com controle de estoque nesta classificação</p>
          ) : (
            <>
              {itensDaClassificacao.map((item) => {
                const qtd = quantidades[item.id] ?? ''
                const unidade = item.unidade_medida
                return (
                  <div key={item.id} className="flex items-center gap-3 border-b border-gray-100 py-3 last:border-b-0">
                    <span className="text-2xl leading-none">{ICONES_CLASSIFICACAO[classificacaoAtiva]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-base font-bold leading-tight text-gray-900">{item.nome}</p>
                      <p className="text-sm text-gray-500">
                        tem {Number(item.estoque_atual ?? 0).toLocaleString('pt-BR')} {unidade}
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
                        onChange={(e) => setQuantidade({ id: item.id, unidade_medida: unidade }, e.target.value)}
                        aria-label={`Quantidade de ${item.nome}`}
                        className="!min-h-0 h-10 w-12 min-w-0 rounded-xl border-2 border-transparent bg-transparent text-center text-xl font-extrabold text-gray-900 focus:border-gray-300 focus:outline-none"
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
                  <span className="text-2xl leading-none">{ICONES_CLASSIFICACAO[classificacaoAtiva]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-base font-bold leading-tight text-gray-900">{item.nome}</p>
                    <p className="text-sm text-gray-500">item novo · {item.unidade_medida}</p>
                  </div>
                  <span className="shrink-0 text-xl font-extrabold text-gray-900">{formatarQtd(numeroDe(item.quantidade))}</span>
                  <button
                    type="button"
                    onClick={() => setItensNovos((prev) => prev.filter((i) => i.itemId !== item.itemId))}
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
            Item novo (falar ou digitar)
          </button>
        ) : (
          <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-base font-bold uppercase text-gray-900">Item novo · {classificacaoAtiva}</h3>
            {novoErro && <InfoStrip tone="danger">{novoErro}</InfoStrip>}
            <div>
              <label className="mb-2 block text-sm font-bold uppercase text-gray-700">Nome</label>
              <div className="flex items-stretch gap-2">
                <div className="min-w-0 flex-1">
                  <Input placeholder="Ex.: Café torrado" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
                </div>
                <button
                  type="button"
                  onClick={handleVoz}
                  aria-label="Falar o nome do item"
                  className={`flex !min-h-0 w-14 shrink-0 items-center justify-center rounded-xl text-white active:scale-95 ${
                    ouvindo ? 'animate-pulse bg-red-600' : 'bg-gray-600'
                  }`}
                >
                  <Mic className="h-5 w-5" strokeWidth={2.5} />
                </button>
              </div>
              {erroVoz && <p className="mt-1 text-sm font-semibold text-red-700">{erroVoz}</p>}
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold uppercase text-gray-700">Unidade de medida</label>
              <ChoiceGrid
                options={UNIDADES_CANTINA.map((u) => ({ value: u, label: u === 'Unidade' ? 'Unidade' : u }))}
                value={novaUnidade}
                onChange={setNovaUnidade}
                cols={3}
                size="sm"
                labelSize="xs"
              />
              {novaUnidade && (
                <p className="mt-1 text-xs text-gray-500">{UNIDADE_DESCRICOES[novaUnidade] ?? ''}</p>
              )}
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
                onChange={(e) =>
                  setNovaQuantidade(
                    unidadeInteira(novaUnidade)
                      ? e.target.value.replace(/[^0-9]/g, '')
                      : e.target.value.replace(/[^0-9,.]/g, '').replace(',', '.')
                  )
                }
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
                .map((i) => `${formatarQtd(numeroDe(i.quantidade))}${rotuloUnidade(i.unidade_medida)} ${i.nome.toLowerCase()}`)
                .join(' · ')}
            </p>
          </div>
        )}
      </CadernetaSection>

      <CadernetaSection numero={2} titulo="Observações">
        <Input
          placeholder="Observações (opcional)"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
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
        pendenciaTexto="Informe a quantidade de pelo menos um item"
      />

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Cantina"
        registro={registroSalvo}
        caderneta="entrada-cantina"
      />
    </CadernetaLayout>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input, DatePicker, ValidationMessage, Button } from '../../components/ui'
import { Brush, Save } from 'lucide-react'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { scrollToFirstError } from '../../utils/scrollToError'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { getItensCantinaCached, updateItemCantinaSaldoCache } from '../../services/cadastroCache'
import { CLASSIFICACOES_CANTINA, UNIDADES_CANTINA, UNIDADE_DESCRICOES } from '../../utils/constants'
import { useFormValidation } from '../../hooks/useFormValidation'

interface ItemEntrada {
  itemId: string
  nome: string
  classificacao: string
  unidade_medida: string
  quantidade: string
  novoItem?: boolean
}

interface FormState {
  data: string
  itens: ItemEntrada[]
  observacao: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  itens: [],
  observacao: '',
})

const makeInitialItem = (): ItemEntrada => ({
  itemId: '',
  nome: '',
  classificacao: '',
  unidade_medida: '',
  quantidade: '',
})

export default function EntradaCantinaPage() {
  const navigate = useNavigate()
  const { fazendaId } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [itensDisponiveis, setItensDisponiveis] = useState<any[]>([])
  const [mostrarFormularioItem, setMostrarFormularioItem] = useState(false)
  const [itemEditando, setItemEditando] = useState<ItemEntrada | null>(null)
  const [itemEditandoIndex, setItemEditandoIndex] = useState<number | null>(null)
  const [itemErrors, setItemErrors] = useState<Set<string>>(new Set())
  const [criandoNovoItem, setCriandoNovoItem] = useState(false)
  const classificacoesDisponiveis: string[] = [...CLASSIFICACOES_CANTINA]

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const handleAdicionarItem = () => {
    setItemEditando(makeInitialItem())
    setItemEditandoIndex(null)
    setItemErrors(new Set())
    setCriandoNovoItem(false)
    setMostrarFormularioItem(true)
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  const handleEditarItem = (index: number) => {
    setItemEditando({ ...form.itens[index] })
    setItemEditandoIndex(index)
    setItemErrors(new Set())
    setCriandoNovoItem(!!form.itens[index].novoItem)
    setMostrarFormularioItem(true)
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  const handleSalvarItem = () => {
    if (!itemEditando) return

    const errors = new Set<string>()
    if (!itemEditando.classificacao) errors.add('classificacao')
    if (criandoNovoItem) {
      if (!itemEditando.nome?.trim()) errors.add('itemId')
      if (!itemEditando.unidade_medida) errors.add('unidade_medida')
    } else if (!itemEditando.itemId) {
      errors.add('itemId')
    }
    if (!itemEditando.quantidade || Number(itemEditando.quantidade) <= 0) errors.add('quantidade')

    if (errors.size > 0) {
      setItemErrors(errors)
      return
    }

    const itemFinal = { ...itemEditando }
    if (criandoNovoItem && !itemFinal.itemId) {
      // Item criado no PWA: uuid local; o sync chama a RPC criar_item_* antes
      // de postar o registro e reescreve o itemId com o id definitivo.
      itemFinal.itemId = crypto.randomUUID()
      itemFinal.nome = itemFinal.nome.trim()
      itemFinal.novoItem = true
      setItensDisponiveis(prev => [
        ...prev,
        { id: itemFinal.itemId, nome: itemFinal.nome, unidade_medida: itemFinal.unidade_medida, controla_estoque: true, estoque_atual: 0 }
      ])
    }

    if (itemEditandoIndex !== null) {
      setForm(prev => ({
        ...prev,
        itens: prev.itens.map((item, i) => i === itemEditandoIndex ? { ...itemFinal } : item)
      }))
    } else {
      setForm(prev => ({
        ...prev,
        itens: [...prev.itens, { ...itemFinal }]
      }))
    }
    setItemEditando(null)
    setItemEditandoIndex(null)
    setMostrarFormularioItem(false)
    setCriandoNovoItem(false)
    setItemErrors(new Set())
  }

  const handleRemoverItem = (index: number) => {
    setForm(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }))
  }

  const itensJaAdicionados = new Set(
    form.itens
      .filter((_, i) => i !== itemEditandoIndex)
      .map(item => item.itemId)
  )

  const validationRules: any = {
    data: { required: true },
    itens: {
      custom: (_value: any, form: any) => {
        return form.itens && form.itens.length > 0 ? null : 'Adicione pelo menos um item'
      }
    },
  }

  const { isValid } = useFormValidation(form, validationRules)

  useEffect(() => {
    async function carregarItens() {
      if (itemEditando?.classificacao && fazendaId) {
        try {
          const data = await getItensCantinaCached(fazendaId, itemEditando.classificacao)
          if (data) {
            setItensDisponiveis(data.filter((item: any) => item.controla_estoque))
          }
        } catch (error) {
          console.error('Erro ao carregar itens da cantina:', error)
        }
      } else {
        setItensDisponiveis([])
      }
    }
    carregarItens()
  }, [itemEditando?.classificacao, fazendaId])

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const itensStorage: Record<string, string> = {}
    form.itens.forEach((item) => {
      if (item.quantidade) {
        itensStorage[`${item.nome} (${item.unidade_medida})`] = item.quantidade
      }
    })

    const result = await salvarRegistro('entrada-cantina', {
      data: form.data,
      itens: itensStorage,
      itensDetalhe: form.itens,
      observacao: form.observacao,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      if (fazendaId) {
        await Promise.all(form.itens.map((item) =>
          updateItemCantinaSaldoCache(fazendaId, item.itemId, Number(String(item.quantidade).replace(',', '.')))
        ))
      }
    }
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    setForm(makeInitial())
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/')
  }

  const handleLimpar = () => {
    setForm(makeInitial())
    setErrors([])
  }

  return (
    <CadernetaLayout
      title="CANTINA"
      cadernetaId="entrada-cantina"
      dateContent={<DatePicker value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} variant="header" compact inline />}
    >
      {errors.length > 0 && <ValidationMessage errors={errors} />}

      {/* Seção 1: Itens */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">1. ITENS DA ENTRADA <span className="text-red-500">*</span></h2>

        {form.itens.length > 0 && (
          <div className="flex flex-col gap-3">
            {form.itens.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-lg font-bold text-gray-800 uppercase">{item.nome}</p>
                    <p className="text-base text-gray-600">Classificação: {item.classificacao}</p>
                    <p className="text-lg text-gray-900">Quantidade: {item.quantidade} {item.unidade_medida}</p>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={() => handleEditarItem(index)}
                      className="text-blue-500 text-2xl"
                      title="Editar item"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleRemoverItem(index)}
                      className="text-red-500 text-2xl"
                      title="Remover item"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!mostrarFormularioItem ? (
          <Button
            onClick={handleAdicionarItem}
            variant="secondary"
            icon="➕"
            fullWidth
          >
            ADICIONAR ITEM
          </Button>
        ) : (
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 flex flex-col gap-4">
            <h3 className="text-base font-bold text-gray-900">
              {itemEditandoIndex !== null ? 'EDITAR ITEM' : 'NOVO ITEM'}
            </h3>

            {itemErrors.size > 0 && (
              <ValidationMessage
                errors={Array.from(itemErrors).map(field => ({
                  field,
                  message: 'Preencha todos os campos obrigatórios'
                }))}
              />
            )}

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">CLASSIFICAÇÃO</label>
              <div className="grid grid-cols-2 gap-2">
                {classificacoesDisponiveis.map((classificacao) => (
                  <button
                    key={classificacao}
                    type="button"
                    onClick={() => {
                      setItemEditando(prev => prev ? { ...prev, classificacao, itemId: '', nome: '', unidade_medida: '', novoItem: false } : null)
                      setCriandoNovoItem(false)
                      setItemErrors(prev => {
                        const newErrors = new Set(prev)
                        newErrors.delete('classificacao')
                        newErrors.delete('itemId')
                        return newErrors
                      })
                    }}
                    className={`min-h-[50px] px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                      itemEditando?.classificacao === classificacao
                        ? 'border-[#1a3b2c] bg-[#1a3b2c] text-white'
                        : itemErrors.has('classificacao')
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {classificacao}
                  </button>
                ))}
              </div>
            </div>

            {itemEditando?.classificacao && !criandoNovoItem && (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">ITEM</label>
                  <div className="grid grid-cols-2 gap-2">
                    {itensDisponiveis.length > 0 ? (
                      itensDisponiveis.map((item) => {
                        const jaAdicionado = itensJaAdicionados.has(item.id)
                        return (
                          <button
                            key={item.id}
                            type="button"
                            disabled={jaAdicionado}
                            onClick={() => {
                              setItemEditando(prev => prev ? {
                                ...prev,
                                itemId: item.id,
                                nome: item.nome,
                                unidade_medida: item.unidade_medida,
                                novoItem: false,
                              } : null)
                              setItemErrors(prev => {
                                const newErrors = new Set(prev)
                                newErrors.delete('itemId')
                                return newErrors
                              })
                            }}
                            className={`min-h-[50px] px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                              itemEditando?.itemId === item.id
                                ? 'border-[#1a3b2c] bg-[#1a3b2c] text-white'
                                : jaAdicionado
                                ? 'border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed'
                                : itemErrors.has('itemId')
                                ? 'border-red-500 bg-red-50 text-red-700'
                                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                            }`}
                          >
                            {item.nome} ({item.unidade_medida}){` · saldo ${Number(item.estoque_atual ?? 0).toLocaleString('pt-BR')}`}
                          </button>
                        )
                      })
                    ) : (
                      <p className="text-sm text-gray-500 col-span-2">Nenhum item com controle de estoque nesta classificação</p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCriandoNovoItem(true)
                    setItemEditando(prev => prev ? { ...prev, itemId: '', nome: '', unidade_medida: '', novoItem: false } : null)
                    setItemErrors(prev => {
                      const newErrors = new Set(prev)
                      newErrors.delete('itemId')
                      return newErrors
                    })
                  }}
                  className="w-full min-h-[44px] px-3 py-2 rounded-xl text-sm font-bold border-2 border-dashed border-[#1a3b2c] text-[#1a3b2c] bg-white hover:bg-green-50 transition-all"
                >
                  ＋ CADASTRAR NOVO ITEM
                </button>
              </div>
            )}

            {itemEditando?.classificacao && criandoNovoItem && (
              <div className="flex flex-col gap-4">
                <Input
                  label="NOME DO NOVO ITEM"
                  placeholder="Ex.: Café torrado"
                  value={itemEditando.nome}
                  onChange={(e) => {
                    setItemEditando(prev => prev ? { ...prev, nome: e.target.value } : null)
                    setItemErrors(prev => {
                      const newErrors = new Set(prev)
                      newErrors.delete('itemId')
                      return newErrors
                    })
                  }}
                  error={itemErrors.has('itemId') ? 'Campo obrigatório' : undefined}
                />
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">UNIDADE DE MEDIDA</label>
                  <div className="grid grid-cols-3 gap-2">
                    {UNIDADES_CANTINA.map((un) => (
                      <button
                        key={un}
                        type="button"
                        onClick={() => {
                          setItemEditando(prev => prev ? { ...prev, unidade_medida: un } : null)
                          setItemErrors(prev => {
                            const newErrors = new Set(prev)
                            newErrors.delete('unidade_medida')
                            return newErrors
                          })
                        }}
                        className={`min-h-[44px] px-1 py-1 rounded-xl border-2 transition-all flex flex-col items-center justify-center ${
                          itemEditando?.unidade_medida === un
                            ? 'border-[#1a3b2c] bg-[#1a3b2c] text-white'
                            : itemErrors.has('unidade_medida')
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <span className="text-sm font-bold leading-tight">{un}</span>
                        <span className={`text-[9px] leading-tight ${itemEditando?.unidade_medida === un ? 'text-white/80' : itemErrors.has('unidade_medida') ? 'text-red-500' : 'text-gray-400'}`}>
                          {UNIDADE_DESCRICOES[un] ?? ''}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCriandoNovoItem(false)}
                  className="text-sm font-bold text-gray-600 underline self-start"
                >
                  Voltar para itens cadastrados
                </button>
              </div>
            )}

            <Input
              label={itemEditando?.unidade_medida ? `QUANTIDADE (${itemEditando.unidade_medida})` : 'QUANTIDADE'}
              type="number"
              placeholder="Informe a quantidade"
              value={itemEditando?.quantidade || ''}
              onChange={(e) => {
                const unidade = itemEditando?.unidade_medida || ''
                const permiteDecimal = ['kg', 'g', 'L', 'mL'].includes(unidade)
                const value = permiteDecimal
                  ? e.target.value.replace(/[^0-9.,]/g, '').replace(/,/g, '.')
                  : e.target.value.replace(/[^0-9]/g, '')
                setItemEditando(prev => prev ? { ...prev, quantidade: value } : null)
                setItemErrors(prev => {
                  const newErrors = new Set(prev)
                  newErrors.delete('quantidade')
                  return newErrors
                })
              }}
              error={itemErrors.has('quantidade') ? 'Campo obrigatório' : undefined}
            />

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setMostrarFormularioItem(false)
                  setItemEditando(null)
                  setItemEditandoIndex(null)
                  setCriandoNovoItem(false)
                }}
                variant="secondary"
                icon="✕"
                fullWidth
                size="sm"
              >
                CANCELAR
              </Button>
              <Button
                onClick={handleSalvarItem}
                variant="success"
                icon="✓"
                fullWidth
                size="sm"
              >
                CONFIRMAR
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Seção 2: Observações */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">2. OBSERVAÇÕES</h2>
        <Input placeholder="Observações adicionais" value={form.observacao} onChange={setInput('observacao')} error={getError('observacao')} />
      </div>

      {/* Ações */}
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
            {salvando ? 'SALVANDO...' : 'SALVAR'}
          </span>
        </button>
        <button
          type="button"
          onClick={handleLimpar}
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

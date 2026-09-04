import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input, DatePicker, ValidationMessage, Radio, SearchableModal, Button } from '../../components/ui'
import { Brush, Save } from 'lucide-react'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { scrollToFirstError } from '../../utils/scrollToError'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { getCachedCadastroData, getItensSupermercadoCached } from '../../services/cadastroCache'
import { useFormValidation } from '../../hooks/useFormValidation'
import { atualizarNomeUsuarioConfig } from '../../utils/nomeUsuario'

interface ItemSupermercado {
  id: string
  nome: string
  unidade_medida: string
}

interface ItemCantina {
  itemId: string
  nome: string
  unidade_medida: string
  quantidade: string
}

const COZINHEIRAS_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
]

interface FormState {
  modo: 'cantina' | 'marmita'
  data: string
  // Cantina
  numeroCozinheiras: string
  quemCozinhou: string
  quemAjudou: string[]
  numeroCafeManha: string
  numeroLanches: string
  numeroRefeicoesAlmoco: string
  numeroRefeicoesJantar: string
  itens: ItemCantina[]
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
  numeroCozinheiras: '1',
  quemCozinhou: '',
  quemAjudou: [],
  numeroCafeManha: '',
  numeroLanches: '',
  numeroRefeicoesAlmoco: '',
  numeroRefeicoesJantar: '',
  itens: [],
  fornecedor: '',
  quantidadeMarmitas: '',
  precoUnitario: '',
  destinatario: '',
  observacao: '',
})

const makeInitialItem = (): ItemCantina => ({
  itemId: '',
  nome: '',
  unidade_medida: '',
  quantidade: '',
})

export default function CantinaPage() {
  const navigate = useNavigate()
  const { fazendaId } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [funcionariosDisponiveis, setFuncionariosDisponiveis] = useState<string[]>([])
  const [itensSupermercadoDisponiveis, setItensSupermercadoDisponiveis] = useState<ItemSupermercado[]>([])
  const [mostrarFormularioItem, setMostrarFormularioItem] = useState(false)
  const [itemEditando, setItemEditando] = useState<ItemCantina | null>(null)
  const [itemEditandoIndex, setItemEditandoIndex] = useState<number | null>(null)
  const [itemErrors, setItemErrors] = useState<Set<string>>(new Set())

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const setQuemAjudou = (index: number, value: string) =>
    setForm((prev) => {
      const newQuemAjudou = [...prev.quemAjudou]
      newQuemAjudou[index] = value
      return { ...prev, quemAjudou: newQuemAjudou }
    })

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const handleAdicionarItem = () => {
    setItemEditando(makeInitialItem())
    setItemEditandoIndex(null)
    setItemErrors(new Set())
    setMostrarFormularioItem(true)
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  const handleEditarItem = (index: number) => {
    setItemEditando({ ...form.itens[index] })
    setItemEditandoIndex(index)
    setItemErrors(new Set())
    setMostrarFormularioItem(true)
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }

  const handleSalvarItem = () => {
    if (!itemEditando) return

    const errors = new Set<string>()
    if (!itemEditando.itemId) errors.add('itemId')
    if (!itemEditando.quantidade) errors.add('quantidade')

    if (errors.size > 0) {
      setItemErrors(errors)
      return
    }

    if (itemEditandoIndex !== null) {
      setForm(prev => ({
        ...prev,
        itens: prev.itens.map((item, i) => i === itemEditandoIndex ? { ...itemEditando } : item)
      }))
    } else {
      setForm(prev => ({
        ...prev,
        itens: [...prev.itens, { ...itemEditando }]
      }))
    }
    setItemEditando(null)
    setItemEditandoIndex(null)
    setMostrarFormularioItem(false)
    setItemErrors(new Set())
  }

  const handleRemoverItem = (index: number) => {
    setForm(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }))
  }

  // Itens já adicionados (para desabilitar no seletor)
  const itensJaAdicionados = new Set(
    form.itens
      .filter((_, i) => i !== itemEditandoIndex)
      .map(item => item.itemId)
  )

  // Validation rules (dinâmico por modo)
  const validationRules: any = useMemo(() => {
    const base: any = { data: { required: true } }
    if (form.modo === 'cantina') {
      base.numeroCozinheiras = { required: true }
      base.quemCozinhou = { required: true }
      // At least 1 refeicao field must be filled
      base.refeicoes = {
        custom: (_value: any, form: any) => {
          const hasAnyRefeicao = form.numeroCafeManha || form.numeroLanches || form.numeroRefeicoesAlmoco || form.numeroRefeicoesJantar
          return hasAnyRefeicao ? null : 'Pelo menos uma refeição deve ser informada'
        }
      }
      // At least 1 item must be added
      base.itens = {
        custom: (_value: any, form: any) => {
          return form.itens && form.itens.length > 0 ? null : 'Adicione pelo menos um item'
        }
      }
      // Add validation for quemAjudou fields
      form.quemAjudou.forEach((_, index) => {
        base[`quemAjudou.${index}`] = { required: true }
      })
    } else {
      // Modo marmita
      base.fornecedor = { required: true }
      base.quantidadeMarmitas = { required: true }
      base.precoUnitario = { required: true }
      base.destinatario = { required: true }
    }
    return base
  }, [form.modo, form.quemAjudou])

  const { isValid } = useFormValidation(form, validationRules)

  // Buscar funcionários do cache (com fallback para offline)
  useEffect(() => {
    async function carregarFuncionarios() {
      if (!fazendaId) return
      try {
        const cache = await getCachedCadastroData()
        if (cache?.funcionarios && cache.funcionarios.length > 0) {
          setFuncionariosDisponiveis(cache.funcionarios)
        }
      } catch (error) {
        console.error('Erro ao carregar funcionários:', error)
      }
    }
    carregarFuncionarios()
  }, [fazendaId])

  // Buscar itens de supermercado (com cache lazy para offline)
  useEffect(() => {
    async function carregarItensSupermercado() {
      if (!fazendaId) return
      try {
        const data = await getItensSupermercadoCached(fazendaId)
        if (data) {
          setItensSupermercadoDisponiveis(data as ItemSupermercado[])
        }
      } catch (error) {
        console.error('Erro ao carregar itens de supermercado:', error)
      }
    }
    carregarItensSupermercado()
  }, [fazendaId])

  // Atualizar array de quem ajudou quando numeroCozinheiras muda
  useEffect(() => {
    const numCozinheiras = parseInt(form.numeroCozinheiras) || 0
    const numAjudou = Math.max(0, numCozinheiras - 1)
    
    setForm(prev => {
      const currentLength = prev.quemAjudou.length
      if (currentLength < numAjudou) {
        // Adicionar novos campos vazios
        return {
          ...prev,
          quemAjudou: [...prev.quemAjudou, ...Array(numAjudou - currentLength).fill('')]
        }
      } else if (currentLength > numAjudou) {
        // Remover campos extras
        return {
          ...prev,
          quemAjudou: prev.quemAjudou.slice(0, numAjudou)
        }
      }
      return prev
    })
  }, [form.numeroCozinheiras])

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    // Converter itens do array para formato de armazenamento (nome (unidade) -> quantidade)
    const itensStorage: Record<string, string> = {}
    form.itens.forEach((item) => {
      if (item.quantidade) {
        itensStorage[`${item.nome} (${item.unidade_medida})`] = item.quantidade
      }
    })

    const result = await salvarRegistro('cantina', {
      data: form.data,
      modo: form.modo,
      // Cantina
      numeroCozinheiras: form.modo === 'cantina' ? form.numeroCozinheiras : null,
      quemCozinhou: form.modo === 'cantina' ? form.quemCozinhou : null,
      quemAjudou: form.modo === 'cantina' ? form.quemAjudou.join(', ') : null,
      numeroCafeManha: form.modo === 'cantina' ? form.numeroCafeManha : null,
      numeroLanches: form.modo === 'cantina' ? form.numeroLanches : null,
      numeroRefeicoesAlmoco: form.modo === 'cantina' ? form.numeroRefeicoesAlmoco : null,
      numeroRefeicoesJantar: form.modo === 'cantina' ? form.numeroRefeicoesJantar : null,
      itens: form.modo === 'cantina' ? itensStorage : null,
      // Marmita
      fornecedor: form.modo === 'marmita' ? form.fornecedor : null,
      quantidadeMarmitas: form.modo === 'marmita' ? form.quantidadeMarmitas : null,
      precoUnitario: form.modo === 'marmita' ? form.precoUnitario : null,
      destinatario: form.modo === 'marmita' ? form.destinatario : null,
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
      title={form.modo === 'marmita' ? 'MARMITA' : 'CANTINA'}
      cadernetaId="cantina"
      dateContent={<DatePicker value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} variant="header" compact inline />}
    >
      {errors.length > 0 && <ValidationMessage errors={errors} />}

      {/* Seletor de modo */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">MODO DE ALIMENTAÇÃO</h2>
        <Radio
          name="modo"
          label={<span>SELECIONE O MODO <span className="text-red-500">*</span></span>}
          options={[
            { value: 'cantina', label: 'CANTINA' },
            { value: 'marmita', label: 'MARMITA' },
          ]}
          value={form.modo}
          onChange={(val) => setForm((p) => ({ ...p, modo: val as 'cantina' | 'marmita' }))}
          gridCols={2}
        />
      </div>

      {form.modo === 'cantina' ? (
        <>
      {/* Seção 1: Dados Principais */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS DA CANTINA</h2>

        </div>
        <Radio
          name="numeroCozinheiras"
          label={<span>N° COZINHEIRAS <span className="text-red-500">*</span></span>}
          options={COZINHEIRAS_OPTIONS}
          value={form.numeroCozinheiras}
          onChange={(val) => setForm((p) => ({ ...p, numeroCozinheiras: val }))}
          error={getError('numeroCozinheiras')}
          gridCols={5}
        />
        <SearchableModal
          label={<span>QUEM COZINHOU? <span className="text-red-500">*</span></span>}
          value={form.quemCozinhou}
          onChange={(val) => { setForm((p) => ({ ...p, quemCozinhou: val })); atualizarNomeUsuarioConfig(val) }}
          error={getError('quemCozinhou')}
          options={funcionariosDisponiveis}
          placeholder="Buscar funcionário..."
          id="quemCozinhou"
        />
        {form.quemAjudou.map((ajudou, index) => (
          <SearchableModal
            key={index}
            label={<span>{index + 1}ª AJUDANTE <span className="text-red-500">*</span></span>}
            value={ajudou}
            onChange={(val) => setQuemAjudou(index, val)}
            error={getError(`quemAjudou.${index}`)}
            options={funcionariosDisponiveis}
            placeholder="Buscar funcionário..."
            id={`quemAjudou-${index}`}
          />
        ))}
      </div>

      {/* Seção 2: Refeições */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">2. REFEIÇÕES <span className="text-red-500">*</span></h2>
        <Input label="N° CAFÉ DA MANHÃ?" type="number" placeholder="Quantidade" value={form.numeroCafeManha} onChange={setInput('numeroCafeManha')} error={getError('numeroCafeManha')} />
        <Input label="N° LANCHES?" type="number" placeholder="Quantidade" value={form.numeroLanches} onChange={setInput('numeroLanches')} error={getError('numeroLanches')} />
        <Input label="N° REFEIÇÕES ALMOÇO?" type="number" placeholder="Quantidade" value={form.numeroRefeicoesAlmoco} onChange={setInput('numeroRefeicoesAlmoco')} error={getError('numeroRefeicoesAlmoco')} />
        <Input label="N° REFEIÇÕES JANTAR?" type="number" placeholder="Quantidade" value={form.numeroRefeicoesJantar} onChange={setInput('numeroRefeicoesJantar')} error={getError('numeroRefeicoesJantar')} />
      </div>

      {/* Seção 3: Itens */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">3. QUANTIFICAÇÃO DE ITENS <span className="text-red-500">*</span></h2>

        {/* Lista de itens adicionados */}
        {form.itens.length > 0 && (
          <div className="flex flex-col gap-3">
            {form.itens.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-lg font-bold text-gray-800 uppercase">{item.nome}</p>
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

        {/* Botão para adicionar item ou formulário inline */}
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

            {/* Seleção de item */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">ITEM</label>
              <div className="grid grid-cols-2 gap-2">
                {itensSupermercadoDisponiveis.length > 0 ? (
                  itensSupermercadoDisponiveis.map((item) => {
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
                        {item.nome} ({item.unidade_medida})
                      </button>
                    )
                  })
                ) : (
                  <p className="text-sm text-gray-500 col-span-2">Nenhum item cadastrado no sistema</p>
                )}
              </div>
            </div>

            <Input
              label="QUANTIDADE"
              type="number"
              placeholder="Informe a quantidade"
              value={itemEditando?.quantidade || ''}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '')
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

      {/* Seção 4: Observações */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">4. OBSERVAÇÕES</h2>
        <Input placeholder="Observações adicionais" value={form.observacao} onChange={setInput('observacao')} error={getError('observacao')} />
      </div>
        </>
      ) : (
        <>
          {/* Modo Marmita */}
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS DA MARMITA</h2>
            </div>
            <Input label={<span>FORNECEDOR <span className="text-red-500">*</span></span>} placeholder="Nome do fornecedor" value={form.fornecedor} onChange={setInput('fornecedor')} error={getError('fornecedor')} />
            <Input label={<span>QUANTIDADE DE MARMITAS <span className="text-red-500">*</span></span>} type="number" placeholder="Quantidade" value={form.quantidadeMarmitas} onChange={setInput('quantidadeMarmitas')} error={getError('quantidadeMarmitas')} />
            <Input label={<span>PREÇO UNITÁRIO (R$) <span className="text-red-500">*</span></span>} type="number" step="0.01" placeholder="0,00" value={form.precoUnitario} onChange={setInput('precoUnitario')} error={getError('precoUnitario')} />
            {form.quantidadeMarmitas && form.precoUnitario && !isNaN(Number(form.quantidadeMarmitas)) && !isNaN(Number(form.precoUnitario)) && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-sm text-gray-600 font-semibold">PREÇO TOTAL</p>
                <p className="text-2xl font-black text-gray-900">
                  R$ {(Number(form.quantidadeMarmitas) * Number(form.precoUnitario)).toFixed(2).replace('.', ',')}
                </p>
              </div>
            )}
            <Input label={<span>DESTINATÁRIO <span className="text-red-500">*</span></span>} placeholder="Para quem são as marmitas?" value={form.destinatario} onChange={setInput('destinatario')} error={getError('destinatario')} />
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
            <h2 className="text-lg font-black text-gray-900 tracking-tight">2. OBSERVAÇÕES</h2>
            <Input placeholder="Observações adicionais" value={form.observacao} onChange={setInput('observacao')} error={getError('observacao')} />
          </div>
        </>
      )}

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
        cadernetaName={form.modo === 'marmita' ? 'Marmita' : 'Alimentação'}
        registro={registroSalvo}
        caderneta="cantina"
      />
    </CadernetaLayout>
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, ValidationMessage } from '../../components/ui'
import SearchableModal from '../../components/ui/SearchableModal'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { getCachedCadastroData, getClassificacoesAlmoxarifadoCached, getSetoresCached, getItensAlmoxarifadoCached } from '../../services/cadastroCache'
import { getFuncionarios } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import { useFormValidation } from '../../hooks/useFormValidation'

const SN_OPTIONS = [
  { value: 'S', label: 'SIM', icon: '✅' },
  { value: 'N', label: 'NÃO', icon: '❌' },
]

interface ItemAlmoxarifado {
  classificacao: string
  nome: string
  quantidade: string
  necessitaDevolucao: string
  prazoDevolucao: string
  setor: string
  observacao: string
}

interface FormState {
  data: string
  quemEntregou: string
  quemPegou: string
  itens: ItemAlmoxarifado[]
  observacao: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  quemEntregou: '',
  quemPegou: '',
  itens: [],
  observacao: '',
})

const makeInitialItem = (): ItemAlmoxarifado => ({
  classificacao: '',
  nome: '',
  quantidade: '',
  necessitaDevolucao: 'N',
  prazoDevolucao: '',
  setor: '',
  observacao: '',
})

export default function AlmoxarifadoPage() {
  const navigate = useNavigate()
  const usuario = useSelector((state: RootState) => state.config.usuario)
  const fazenda = useSelector((state: RootState) => state.config.fazenda)
  const fazendaId = useSelector((state: RootState) => state.config.fazendaId)
  const logoUrl = useSelector((state: RootState) => state.config.logoUrl)
  const configurado = useSelector((state: RootState) => state.config.configurado)

  const [form, setForm] = useState<FormState>(makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [funcionariosDisponiveis, setFuncionariosDisponiveis] = useState<string[]>([])
  const [mostrarFormularioItem, setMostrarFormularioItem] = useState(false)
  const [itemEditando, setItemEditando] = useState<ItemAlmoxarifado | null>(null)
  const [itemEditandoIndex, setItemEditandoIndex] = useState<number | null>(null)
  const [itemErrors, setItemErrors] = useState<Set<string>>(new Set())
  const [classificacoesDisponiveis, setClassificacoesDisponiveis] = useState<string[]>([])
  const [itensDisponiveis, setItensDisponiveis] = useState<string[]>([])
  const [setoresDisponiveis, setSetoresDisponiveis] = useState<string[]>([])

  const set = (key: keyof FormState) => (value: string) => setForm(prev => ({ ...prev, [key]: value }))
  const setInput = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Validation rules
  const validationRules: any = {
    data: { required: true },
    quemEntregou: { required: true },
    quemPegou: { required: true },
    // At least 1 item must be added
    itens: {
      custom: (_value: any, form: any) => {
        return form.itens && form.itens.length > 0 ? null : 'Adicione pelo menos um item'
      }
    },
  }

  const { isValid } = useFormValidation(form, validationRules)

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

    // Validação básica do item
    const errors = new Set<string>()

    if (!itemEditando.classificacao) {
      errors.add('classificacao')
    }
    if (!itemEditando.nome) {
      errors.add('nome')
    }
    if (!itemEditando.quantidade) {
      errors.add('quantidade')
    }
    if (!itemEditando.setor) {
      errors.add('setor')
    }
    if (itemEditando.necessitaDevolucao === 'S' && !itemEditando.prazoDevolucao) {
      errors.add('prazoDevolucao')
    }

    if (errors.size > 0) {
      setItemErrors(errors)
      alert('Preencha todos os campos obrigatórios')
      return
    }

    // Se está editando, atualiza o item existente
    if (itemEditandoIndex !== null) {
      setForm(prev => ({
        ...prev,
        itens: prev.itens.map((item, i) => i === itemEditandoIndex ? { ...itemEditando } : item)
      }))
    } else {
      // Se é novo, adiciona ao array
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

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    if (form.itens.length === 0) {
      setErrors([{ field: 'itens', message: 'Adicione pelo menos um item' }])
      scrollToFirstError([{ field: 'itens', message: 'Adicione pelo menos um item' }])
      setSalvando(false)
      return
    }

    const result = await salvarRegistro('almoxarifado', {
      data: form.data,
      quemEntregou: form.quemEntregou,
      quemPegou: form.quemPegou,
      itens: form.itens,
      observacao: form.observacao || '',
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      setForm(makeInitial())
    }
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 100)
  }

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

  // Carregar itens quando classificação é selecionada (com cache lazy para offline)
  useEffect(() => {
    const loadItens = async () => {
      if (itemEditando?.classificacao && fazendaId) {
        try {
          const itensData = await getItensAlmoxarifadoCached(fazendaId, itemEditando.classificacao)
          setItensDisponiveis(itensData?.map((item: any) => item.nome) || [])
        } catch (error) {
          console.error('Erro ao carregar itens:', error)
        }
      } else {
        setItensDisponiveis([])
      }
    }
    loadItens()
  }, [itemEditando?.classificacao, fazendaId])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header sticky com botões e título */}
      <div className="sticky top-0 z-10 bg-[#1a3a2a] text-white px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-yellow-400 font-bold text-sm min-h-[40px] px-3"
          >
            VOLTAR
          </button>
          <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2">ALMOXARIFADO</h1>
          <button
            onClick={() => navigate('/caderneta/almoxarifado/lista')}
            className="text-yellow-400 font-bold text-sm min-h-[40px] px-3 -mr-2"
          >
            REGISTROS
          </button>
        </div>
      </div>

      {/* Logos não sticky */}
      <div className="bg-[#1a3a2a] text-white px-4 py-5">
        <FarmLogo
          farmName={configurado ? fazenda : undefined}
          logoUrl={logoUrl}
          type="both"
          size="medium"
          className="justify-center"
        />
      </div>

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8">
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: Dados Principais */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          {usuario && (
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <span className="text-xl">👤</span>
              <p className="text-gray-700 font-semibold">{usuario}</p>
            </div>
          )}
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS PRINCIPAIS</h2>
          <DatePicker label={<span>DATA <span className="text-red-500">*</span></span>} value={form.data} onChange={set('data')} error={getError('data')} />
          <div className="flex flex-col gap-3">
            {funcionariosDisponiveis.length > 0 ? (
              <SearchableModal
                label={<span>QUEM ENTREGOU? <span className="text-red-500">*</span></span>}
                value={form.quemEntregou}
                onChange={set('quemEntregou')}
                error={getError('quemEntregou')}
                options={funcionariosDisponiveis}
                placeholder="Buscar funcionário..."
                id="quemEntregou"
                name="quemEntregou"
              />
            ) : (
              <Input
                label={<span>QUEM ENTREGOU? <span className="text-red-500">*</span></span>}
                placeholder="Nome de quem entregou"
                value={form.quemEntregou}
                onChange={setInput('quemEntregou')}
                error={getError('quemEntregou')}
                id="quemEntregou"
              />
            )}
            {funcionariosDisponiveis.length > 0 ? (
              <SearchableModal
                label={<span>QUEM PEGOU? <span className="text-red-500">*</span></span>}
                value={form.quemPegou}
                onChange={set('quemPegou')}
                error={getError('quemPegou')}
                options={funcionariosDisponiveis}
                placeholder="Buscar funcionário..."
                id="quemPegou"
                name="quemPegou"
              />
            ) : (
              <Input
                label={<span>QUEM PEGOU? <span className="text-red-500">*</span></span>}
                placeholder="Nome de quem pegou"
                value={form.quemPegou}
                onChange={setInput('quemPegou')}
                error={getError('quemPegou')}
                id="quemPegou"
              />
            )}
          </div>
        </div>

        {/* Seção 2: Itens */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. ITENS RETIRADOS <span className="text-red-500">*</span></h2>
          
          {/* Lista de itens adicionados */}
          {form.itens.length > 0 && (
            <div className="flex flex-col gap-3">
              {form.itens.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <p className="text-lg font-bold text-gray-800 uppercase">{item.nome}</p>
                      <p className="text-lg text-gray-900">Quantidade: {item.quantidade}</p>
                      <p className="text-base text-gray-600">Classificação: {item.classificacao || '-'}</p>
                      <p className="text-base text-gray-600">Setor: {item.setor}</p>
                      {item.necessitaDevolucao === 'S' ? (
                        <p className="text-base text-gray-600">Data Devolução: {item.prazoDevolucao}</p>
                      ) : (
                        <p className="text-base text-gray-600">Devolução: Não</p>
                      )}
                      {item.observacao && (
                        <p className="text-base text-gray-600">Obs: {item.observacao}</p>
                      )}
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

          {/* Botão para adicionar item */}
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
            /* Formulário para adicionar/editar item */
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 flex flex-col gap-4">
              <h3 className="text-base font-bold text-gray-900">
                {itemEditandoIndex !== null ? 'EDITAR ITEM' : 'NOVO ITEM'}
              </h3>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">CLASSIFICAÇÃO</label>
                <div className="grid grid-cols-2 gap-2">
                  {classificacoesDisponiveis.map((classificacao) => (
                    <button
                      key={classificacao}
                      type="button"
                      onClick={() => {
                        setItemEditando(prev => prev ? { ...prev, classificacao, nome: '' } : null)
                        setItemErrors(prev => {
                          const newErrors = new Set(prev)
                          newErrors.delete('classificacao')
                          newErrors.delete('nome')
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

              {itemEditando?.classificacao && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">ITEM</label>
                  <div className="grid grid-cols-2 gap-2">
                    {itensDisponiveis.length > 0 ? (
                      itensDisponiveis.map((nome) => (
                        <button
                          key={nome}
                          type="button"
                          onClick={() => {
                            setItemEditando(prev => prev ? { ...prev, nome } : null)
                            setItemErrors(prev => {
                              const newErrors = new Set(prev)
                              newErrors.delete('nome')
                              return newErrors
                            })
                          }}
                          className={`min-h-[50px] px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                            itemEditando?.nome === nome
                              ? 'border-[#1a3b2c] bg-[#1a3b2c] text-white'
                              : itemErrors.has('nome')
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          {nome}
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 col-span-2">Nenhum item encontrado para esta classificação</p>
                    )}
                  </div>
                </div>
              )}

              <Input
                label="QUANTIDADE RETIRADA?"
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

              <Radio
                name="necessitaDevolucao"
                label="NECESSÁRIA DEVOLUÇÃO?"
                options={SN_OPTIONS}
                value={itemEditando?.necessitaDevolucao || 'N'}
                onChange={(val) => setItemEditando(prev => prev ? { ...prev, necessitaDevolucao: val, prazoDevolucao: val === 'N' ? '' : prev.prazoDevolucao } : null)}
                gridCols={2}
              />

              {itemEditando?.necessitaDevolucao === 'S' && (
                <DatePicker
                  label="DATA DEVOLUÇÃO"
                  value={itemEditando?.prazoDevolucao || ''}
                  onChange={(val) => {
                    setItemEditando(prev => prev ? { ...prev, prazoDevolucao: val } : null)
                    setItemErrors(prev => {
                      const newErrors = new Set(prev)
                      newErrors.delete('prazoDevolucao')
                      return newErrors
                    })
                  }}
                  error={itemErrors.has('prazoDevolucao') ? 'Campo obrigatório' : undefined}
                />
              )}

              {setoresDisponiveis.length > 0 ? (
                <SearchableModal
                  label="QUAL SETOR?"
                  value={itemEditando?.setor || ''}
                  onChange={(value) => {
                    setItemEditando(prev => prev ? { ...prev, setor: value } : null)
                    setItemErrors(prev => {
                      const newErrors = new Set(prev)
                      newErrors.delete('setor')
                      return newErrors
                    })
                  }}
                  error={itemErrors.has('setor') ? 'Campo obrigatório' : undefined}
                  options={setoresDisponiveis}
                  placeholder="Buscar setor..."
                  id="setor"
                  name="setor"
                />
              ) : (
                <Input
                  label="QUAL SETOR?"
                  placeholder="Informe o setor"
                  value={itemEditando?.setor || ''}
                  onChange={(e) => {
                    setItemEditando(prev => prev ? { ...prev, setor: e.target.value } : null)
                    setItemErrors(prev => {
                      const newErrors = new Set(prev)
                      newErrors.delete('setor')
                      return newErrors
                    })
                  }}
                  error={itemErrors.has('setor') ? 'Campo obrigatório' : undefined}
                />
              )}

              <Input
                label="OBSERVAÇÃO (OPCIONAL)"
                placeholder="Observações sobre o item"
                value={itemEditando?.observacao || ''}
                onChange={(e) => setItemEditando(prev => prev ? { ...prev, observacao: e.target.value } : null)}
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

        {/* Seção 3: Observação Geral */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. OBSERVAÇÃO GERAL</h2>
          <Input
            label=""
            placeholder="Observações adicionais (opcional)"
            value={form.observacao}
            onChange={setInput('observacao')}
            error={getError('observacao')}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾" disabled={!isValid}>
            SALVAR
          </Button>
          <Button onClick={() => setForm(makeInitial())} variant="secondary" icon="🧹">
            LIMPAR
          </Button>
        </div>
        {!isValid && (
          <p className="text-base text-gray-600 text-center">
            <span className="text-red-500">*</span> Preencha todos os campos obrigatórios para salvar
          </p>
        )}
      </main>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleNewRecord}
        onNewRecord={handleNewRecord}
        onExit={() => navigate(-1)}
        cadernetaName="Almoxarifado"
        registro={registroSalvo}
        caderneta="almoxarifado"
      />
    </div>
  )
}

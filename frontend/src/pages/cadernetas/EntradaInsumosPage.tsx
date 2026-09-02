import { useEffect, useState } from 'react'
import { saveRegistro } from '../../services/indexedDB'
import { enqueueRegistro } from '../../services/syncService'
import { v4 as uuidv4 } from 'uuid'
import { generateVersion, getCurrentTimestamp } from '../../utils/generateId'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import { store } from '../../store/store'
import CadernetaHeader from '../../components/CadernetaHeader'
import { Input, DatePicker, Button, ValidationMessage, SearchableModal } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { getInsumos, createInsumo } from '../../services/supabaseService'
import { getCachedCadastroData } from '../../services/cadastroCache'
import { useCadastroOptions } from '../../hooks/useCadastroOptions'
import FeatureLock from '../../components/FeatureLock'
import { atualizarNomeUsuarioConfig } from '../../utils/nomeUsuario'
import { Brush, Save } from 'lucide-react'

interface ItemEntrada {
  id: string // ID temporário para controle no frontend
  insumoId: string
  produto: string
  quantidade: string
  valorUnitario: string
  valorTotal: string
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
  insumoId: '',
  produto: '',
  quantidade: '',
  valorUnitario: '',
  valorTotal: '',
})

const makeInitial = (): FormState => ({
  dataEntrada: todayBR(),
  horario: '',
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
  const [loadingInsumos, setLoadingInsumos] = useState(false)
  const [isHorarioManual, setIsHorarioManual] = useState(false)
  const [novoInsumoModal, setNovoInsumoModal] = useState<{ open: boolean; nomeInicial: string; itemId: string }>({ open: false, nomeInicial: '', itemId: '' })
  const [novoInsumoNome, setNovoInsumoNome] = useState('')
  const [criandoInsumo, setCriandoInsumo] = useState(false)

  const set = (field: keyof Omit<FormState, 'itens'>) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof Omit<FormState, 'itens'>) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Funções para gerenciar itens
  const addItem = () => {
    setForm(prev => ({
      ...prev,
      itens: [...prev.itens, makeInitialItem()]
    }))
  }

  const removeItem = (itemId: string) => {
    setForm(prev => ({
      ...prev,
      itens: prev.itens.filter(item => item.id !== itemId)
    }))
  }

  const updateItem = (itemId: string, field: keyof ItemEntrada, value: string) => {
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

  const updateItemProduto = (itemId: string, produtoNome: string) => {
    const insumo = insumosSupabase.find(i => i.nome === produtoNome)
    updateItem(itemId, 'produto', produtoNome)
    updateItem(itemId, 'insumoId', insumo?.id || '')
  }

  const getValorTotalEntrada = () => {
    return form.itens.reduce((total, item) => {
      return total + (parseFloat(item.valorTotal) || 0)
    }, 0).toFixed(2)
  }

  const abrirModalNovoInsumo = (itemId: string, nomeInicial: string) => {
    setNovoInsumoNome(nomeInicial)
    setNovoInsumoModal({ open: true, nomeInicial, itemId })
  }

  const handleCriarInsumo = async () => {
    if (!novoInsumoNome.trim() || !fazendaId) return
    if (store.getState().config.testModeAtivo) {
      console.log('[EntradaInsumosPage] Modo teste ativo: criação de insumo no Supabase bloqueada')
      return
    }
    setCriandoInsumo(true)
    try {
      const novoInsumo = await createInsumo({
        nome: novoInsumoNome.trim(),
        fazenda_id: fazendaId,
        ativo: true,
      })
      // Recarregar lista de insumos
      const insumos = await getInsumos(fazendaId)
      setInsumosSupabase(insumos || [])
      // Selecionar automaticamente o insumo criado
      updateItem(novoInsumoModal.itemId, 'produto', novoInsumo.nome)
      updateItem(novoInsumoModal.itemId, 'insumoId', novoInsumo.id)
      setNovoInsumoModal({ open: false, nomeInicial: '', itemId: '' })
      setNovoInsumoNome('')
    } catch (error) {
      console.error('Erro ao criar insumo:', error)
    } finally {
      setCriandoInsumo(false)
    }
  }

  // Carregar insumos do Supabase com fallback para cache offline
  useEffect(() => {
    async function carregarInsumos() {
      if (!fazendaId) {
        setInsumosSupabase([])
        setLoadingInsumos(false)
        return
      }
      setLoadingInsumos(true)
      try {
        if (navigator.onLine) {
          const insumos = await getInsumos(fazendaId)
          setInsumosSupabase(insumos || [])
        } else {
          const cache = await getCachedCadastroData()
          setInsumosSupabase((cache?.insumos || []).map((nome: string) => ({ nome, id: '' })))
        }
      } catch {
        const cache = await getCachedCadastroData()
        setInsumosSupabase((cache?.insumos || []).map((nome: string) => ({ nome, id: '' })))
      } finally {
        setLoadingInsumos(false)
      }
    }
    carregarInsumos()
  }, [fazendaId])

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

  // Marca horário como manual quando usuário altera
  const handleHorarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsHorarioManual(true)
    setForm({ ...form, horario: e.target.value })
  }

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    // Validar itens
    const itensValidos = form.itens.filter(item => item.insumoId && item.quantidade)
    if (itensValidos.length === 0) {
      setErrors([{ field: 'geral', message: 'Adicione pelo menos um item com produto e quantidade' }])
      setSalvando(false)
      return
    }

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
        const registroItem = {
          entradaId: entradaId,
          insumoId: item.insumoId,
          produto: item.produto,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
          valorTotal: item.valorTotal,
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
    <FeatureLock feature="entrada-insumos" fazendaId={fazendaId}>
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <CadernetaHeader
        title="ENTRADA INSUMOS"
        cadernetaId="entrada-insumos"
        dateContent={<DatePicker value={form.dataEntrada} onChange={set('dataEntrada')} variant="header" compact inline />}
      />

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8 desktop-form-container">
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        <>
            {/* Seção 1: Dados da Entrada */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS DA ENTRADA</h2>

              </div>
              
              {/* Horário */}
              <div>
                <label className="block text-lg font-bold text-gray-900 mb-2">
                  HORÁRIO *
                </label>
                <input
                  type="time"
                  value={form.horario}
                  onChange={handleHorarioChange}
                  required
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
                {!isHorarioManual && (
                  <p className="mt-1 text-sm text-gray-500">Atualiza automaticamente</p>
                )}
              </div>
            </div>

            {/* Seção 2: Itens da Entrada */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">2. ITENS DA ENTRADA</h2>
              
              {form.itens.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-700">Item {index + 1}</span>
                    {form.itens.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 text-sm font-medium hover:text-red-700"
                      >
                        ✕ Remover
                      </button>
                    )}
                  </div>
                  
                  <SearchableModal
                    label="PRODUTO"
                    value={item.produto}
                    onChange={(value) => updateItemProduto(item.id, value)}
                    error={getError(`item_${index}_produto`)}
                    options={insumosSupabase.map(i => i.nome)}
                    placeholder="Buscar produto..."
                    disabled={loadingInsumos}
                    id={`produto_${item.id}`}
                    name={`produto_${item.id}`}
                    onCreateNew={(termo) => abrirModalNovoInsumo(item.id, termo)}
                    createNewLabel="Novo Insumo"
                  />
                  
                  <div className="flex flex-col gap-3">
                    <Input
                      label="QUANTIDADE (kg)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantidade}
                      onChange={(e) => updateItem(item.id, 'quantidade', e.target.value)}
                      error={getError(`item_${index}_quantidade`)}
                      inputMode="decimal"
                    />
                    <Input
                      label="VALOR UNITÁRIO (R$)"
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.valorUnitario}
                      onChange={(e) => updateItem(item.id, 'valorUnitario', e.target.value)}
                      error={getError(`item_${index}_valorUnitario`)}
                      inputMode="decimal"
                    />
                    <Input
                      label="TOTAL (R$)"
                      value={item.valorTotal}
                      readOnly
                    />
                  </div>
                </div>
              ))}
              
              <span className="text-base text-gray-600">
                Total: R$ {getValorTotalEntrada()}
              </span>
              
              <Button 
                onClick={addItem} 
                variant="secondary" 
                icon="➕"
                className="mt-2"
              >
                ADICIONAR ITEM
              </Button>
            </div>

            {/* Seção 3: Documentação */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">3. DOCUMENTAÇÃO</h2>
              <Input
                label="N° NOTA FISCAL"
                value={form.notaFiscal}
                onChange={setInput('notaFiscal')}
                error={getError('notaFiscal')}
              />
              <SearchableModal
                label="FORNECEDOR"
                value={form.fornecedor}
                onChange={set('fornecedor')}
                error={getError('fornecedor')}
                options={fornecedoresOptions}
                placeholder="Buscar fornecedor..."
                disabled={loadingFornecedores}
                id="fornecedor"
                name="fornecedor"
              />
            </div>

            {/* Seção 4: Transporte */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">4. TRANSPORTE</h2>
              <Input
                label="PLACA"
                value={form.placa}
                onChange={setInput('placa')}
                error={getError('placa')}
              />
              <SearchableModal
                label="MOTORISTA"
                value={form.motorista}
                onChange={set('motorista')}
                error={getError('motorista')}
                options={funcionariosOptions}
                placeholder="Buscar funcionário..."
                disabled={loadingFuncionarios}
                id="motorista"
                name="motorista"
              />
              <SearchableModal
                label="RESPONSÁVEL RECEBIMENTO"
                value={form.responsavelRecebimento}
                onChange={(val) => { set('responsavelRecebimento')(val); atualizarNomeUsuarioConfig(val) }}
                error={getError('responsavelRecebimento')}
                options={funcionariosOptions}
                placeholder="Buscar funcionário..."
                disabled={loadingFuncionarios}
                id="responsavelRecebimento"
                name="responsavelRecebimento"
              />
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleSalvar}
                disabled={salvando}
                className={`w-full !min-h-0 rounded-2xl border-2 px-3 py-4 text-base font-bold transition-colors active:scale-[0.99] ${
                  salvando
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
                onClick={() => { setForm(makeInitial()); setErrors([]); setIsHorarioManual(false) }}
                className="w-full !min-h-0 rounded-2xl border-2 border-gray-300 bg-gray-200 px-3 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-300 active:scale-95"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Brush className="h-4 w-4" strokeWidth={2.5} />
                  LIMPAR
                </span>
              </button>
            </div>
        </>
      </main>

      {/* Modal criação de novo insumo */}
      {novoInsumoModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4 p-6">
            <h3 className="text-lg font-bold text-gray-900">Novo Insumo</h3>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">NOME DO INSUMO</label>
              <input
                type="text"
                value={novoInsumoNome}
                onChange={(e) => setNovoInsumoNome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCriarInsumo()}
                placeholder="Ex: Milho, Ração, Sal mineral..."
                autoFocus
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setNovoInsumoModal({ open: false, nomeInicial: '', itemId: '' }); setNovoInsumoNome('') }}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 transition-colors"
              >
                CANCELAR
              </button>
              <button
                type="button"
                onClick={handleCriarInsumo}
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
    </FeatureLock>
  )
}

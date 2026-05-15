import { useEffect, useState } from 'react'
import { saveRegistro } from '../../services/indexedDB'
import { enqueueRegistro } from '../../services/syncService'
import { v4 as uuidv4 } from 'uuid'
import { generateVersion, getCurrentTimestamp } from '../../utils/generateId'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { Input, DatePicker, Button, ValidationMessage, SearchableModal } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { getFornecedores, getFuncionarios, getInsumos, createInsumo } from '../../services/supabaseService'

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
  const { fazenda, fazendaId, logoUrl } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [fornecedoresSupabase, setFornecedoresSupabase] = useState<any[]>([])
  const [funcionariosSupabase, setFuncionariosSupabase] = useState<any[]>([])
  const [insumosSupabase, setInsumosSupabase] = useState<any[]>([])
  const [loadingFornecedores, setLoadingFornecedores] = useState(false)
  const [loadingFuncionarios, setLoadingFuncionarios] = useState(false)
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

  // Carregar fornecedores do Supabase
  useEffect(() => {
    async function carregarFornecedores() {
      if (!fazendaId) {
        setFornecedoresSupabase([])
        setLoadingFornecedores(false)
        return
      }

      setLoadingFornecedores(true)
      try {
        const fornecedores = await getFornecedores(fazendaId)
        setFornecedoresSupabase(fornecedores || [])
      } catch (error) {
        console.error('Erro ao carregar fornecedores:', error)
        setFornecedoresSupabase([])
      } finally {
        setLoadingFornecedores(false)
      }
    }

    carregarFornecedores()
  }, [fazendaId])

  // Carregar funcionários do Supabase
  useEffect(() => {
    async function carregarFuncionarios() {
      if (!fazendaId) {
        setFuncionariosSupabase([])
        setLoadingFuncionarios(false)
        return
      }

      setLoadingFuncionarios(true)
      try {
        const funcionarios = await getFuncionarios(fazendaId)
        setFuncionariosSupabase(funcionarios || [])
      } catch (error) {
        console.error('Erro ao carregar funcionários:', error)
        setFuncionariosSupabase([])
      } finally {
        setLoadingFuncionarios(false)
      }
    }

    carregarFuncionarios()
  }, [fazendaId])

  // Carregar insumos do Supabase
  useEffect(() => {
    async function carregarInsumos() {
      if (!fazendaId) {
        setInsumosSupabase([])
        setLoadingInsumos(false)
        return
      }

      setLoadingInsumos(true)
      try {
        const insumos = await getInsumos(fazendaId)
        setInsumosSupabase(insumos || [])
      } catch (error) {
        console.error('Erro ao carregar insumos:', error)
        setInsumosSupabase([])
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
      const registroEntrada = {
        dataEntrada: form.dataEntrada,
        horario: form.horario,
        notaFiscal: form.notaFiscal,
        fornecedor: form.fornecedor,
        placa: form.placa,
        motorista: form.motorista,
        responsavelRecebimento: form.responsavelRecebimento,
        data: dataComHora,
        id: entradaId,
        version: generateVersion(),
        lastModified: getCurrentTimestamp(),
        syncStatus: 'pending' as const,
      }

      await saveRegistro('entrada-insumos', registroEntrada)
      await enqueueRegistro('entrada-insumos', entradaId, 'create')

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
        }

        await saveRegistro('entrada-insumos-itens', registroItem)
        await enqueueRegistro('entrada-insumos-itens', itemId, 'create')
      }

      // 3. Delay para persistência
      await new Promise(resolve => setTimeout(resolve, 100))

      setRegistroSalvo(registroEntrada)
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
      {/* Header sticky com botões e título */}
      <div className="sticky top-0 z-10 bg-[#1a3a2a] text-white px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-yellow-400 font-bold text-sm min-h-[40px] px-3"
          >
            VOLTAR
          </button>
          <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2 text-center">ENTRADA INSUMOS</h1>
          <button
            onClick={() => navigate('/caderneta/entrada-insumos/lista')}
            className="text-yellow-400 font-bold text-sm min-h-[40px] px-3 -mr-2"
          >
            REGISTROS
          </button>
        </div>
      </div>

      {/* Logos não sticky */}
      <div className="bg-[#1a3a2a] text-white px-4 py-5">
        <div className="flex items-center justify-center gap-8">
          <FarmLogo
            farmName={fazenda}
            logoUrl={logoUrl}
            type="both"
            size="medium"
          />
        </div>
      </div>

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8">
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        <>
            {/* Seção 1: Dados da Entrada */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS DA ENTRADA</h2>
              <DatePicker label="DATA DE ENTRADA" value={form.dataEntrada} onChange={set('dataEntrada')} error={getError('dataEntrada')} />
              
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
              {fornecedoresSupabase.length > 0 ? (
                <SearchableModal
                  label="FORNECEDOR"
                  value={form.fornecedor}
                  onChange={set('fornecedor')}
                  error={getError('fornecedor')}
                  options={fornecedoresSupabase.map(f => f.nome)}
                  placeholder="Buscar fornecedor..."
                  disabled={loadingFornecedores}
                  id="fornecedor"
                  name="fornecedor"
                />
              ) : (
                <Input
                  label="FORNECEDOR"
                  placeholder={loadingFornecedores ? 'Carregando...' : 'Digite o fornecedor'}
                  value={form.fornecedor}
                  onChange={setInput('fornecedor')}
                  error={getError('fornecedor')}
                  disabled={loadingFornecedores}
                  id="fornecedor"
                />
              )}
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
              {funcionariosSupabase.length > 0 ? (
                <SearchableModal
                  label="MOTORISTA"
                  value={form.motorista}
                  onChange={set('motorista')}
                  error={getError('motorista')}
                  options={funcionariosSupabase.map(f => f.nome)}
                  placeholder="Buscar funcionário..."
                  disabled={loadingFuncionarios}
                  id="motorista"
                  name="motorista"
                />
              ) : (
                <Input
                  label="MOTORISTA *"
                  placeholder={loadingFuncionarios ? 'Carregando...' : 'Digite o motorista'}
                  value={form.motorista}
                  onChange={setInput('motorista')}
                  error={getError('motorista')}
                  disabled={loadingFuncionarios}
                  id="motorista"
                />
              )}
              {funcionariosSupabase.length > 0 ? (
                <SearchableModal
                  label="RESPONSÁVEL RECEBIMENTO"
                  value={form.responsavelRecebimento}
                  onChange={set('responsavelRecebimento')}
                  error={getError('responsavelRecebimento')}
                  options={funcionariosSupabase.map(f => f.nome)}
                  placeholder="Buscar funcionário..."
                  disabled={loadingFuncionarios}
                  id="responsavelRecebimento"
                  name="responsavelRecebimento"
                />
              ) : (
                <Input
                  label="RESPONSÁVEL RECEBIMENTO *"
                  placeholder={loadingFuncionarios ? 'Carregando...' : 'Digite o funcionário'}
                  value={form.responsavelRecebimento}
                  onChange={setInput('responsavelRecebimento')}
                  error={getError('responsavelRecebimento')}
                  disabled={loadingFuncionarios}
                  id="responsavelRecebimento"
                />
              )}
            </div>

            <div className="flex flex-col gap-3">
              <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾">
                SALVAR
              </Button>
              <Button onClick={() => { setForm(makeInitial()); setErrors([]); setIsHorarioManual(false) }} variant="secondary" icon="🧹">
                LIMPAR
              </Button>
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
  )
}

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, CheckboxGroup, ValidationMessage, Select } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { loadCadastroData } from '../../services/cadastroData'

const MOTIVOS = [
  { value: 'Morte', label: 'MORTE', icon: '⚰️' },
  { value: 'Consumo', label: 'CONSUMO', icon: '🍖' },
  { value: 'Transferência', label: 'TRANSFERÊNCIA', icon: '🚚' },
  { value: 'Abate', label: 'ABATE', icon: '🏭' },
  { value: 'Entrada', label: 'ENTRADA', icon: '📥' },
  { value: 'Entreverado', label: 'ENTREVERADO', icon: '🔀' },
]

const CATEGORIAS = [
  { value: 'Vaca', label: 'VACA' },
  { value: 'Touro', label: 'TOURO' },
  { value: 'Boi Gordo', label: 'BOI GORDO' },
  { value: 'Boi Magro', label: 'BOI MAGRO' },
  { value: 'Garrote', label: 'GARROTE' },
  { value: 'Bezerro', label: 'BEZERRO' },
  { value: 'Novilha', label: 'NOVILHA' },
  { value: 'Tropa', label: 'TROPA' },
  { value: 'Outros', label: 'OUTROS' },
]

interface FormState {
  data: string
  loteOrigem: string
  loteDestino: string
  destinoCustomizado: string
  numeroCabecas: string
  pesoMedio: string
  motivoMovimentacao: string
  brincoChip: string
  causaObservacao: string
  categorias: string[]
  outrosTexto: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  loteOrigem: '',
  loteDestino: '',
  destinoCustomizado: '',
  numeroCabecas: '',
  pesoMedio: '',
  motivoMovimentacao: '',
  brincoChip: '',
  causaObservacao: '',
  categorias: [],
  outrosTexto: '',
})

export default function MovimentacaoPage() {
  const navigate = useNavigate()
  const { usuario, fazenda, cadastroSheetUrl } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [frigorificosDisponiveis, setFrigorificosDisponiveis] = useState<string[]>([])
  const [destinosDisponiveis, setDestinosDisponiveis] = useState<string[]>([])
  const [carregandoLotes, setCarregandoLotes] = useState(false)

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [field]: val } as FormState))
  }

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const handleCategoriasChange = (newCategorias: string[]) => {
    setForm((p) => ({ ...p, categorias: newCategorias }))
  }

  // Lógica para definir destino automaticamente baseado no motivo
  useEffect(() => {
    if (!form.motivoMovimentacao) {
      setForm((p) => ({ ...p, loteDestino: '' }))
      return
    }

    switch (form.motivoMovimentacao) {
      case 'Morte':
        setForm((p) => ({ ...p, loteDestino: 'Cemitério' }))
        break
      case 'Consumo':
        setForm((p) => ({ ...p, loteDestino: 'Cantina' }))
        break
      case 'Transferência':
      case 'Abate':
      case 'Entrada':
      case 'Entreverado':
        // Para esses casos, o usuário precisa selecionar o destino
        // Não setar valor automático
        break
      default:
        break
    }
  }, [form.motivoMovimentacao])

  // Carregar lotes quando fazenda mudar
  useEffect(() => {
    async function carregarLotes() {
      if (!cadastroSheetUrl) {
        setCarregandoLotes(false)
        return
      }

      setCarregandoLotes(true)
      try {
        const data = await loadCadastroData(cadastroSheetUrl)
        setLotesDisponiveis(data.lotes || [])
        setFrigorificosDisponiveis(data.frigorificos || [])
        setDestinosDisponiveis(data.destinos || [])
      } catch (error) {
        console.error('Erro ao carregar lotes:', error)
      } finally {
        setCarregandoLotes(false)
      }
    }

    carregarLotes()

    // Polling a cada 3 minutos
    const interval = setInterval(carregarLotes, 180000) // 3 minutos

    return () => clearInterval(interval)
  }, [cadastroSheetUrl])

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    // Montar categorias selecionadas em string separada por vírgula
    const categoriasSelecionadas = [...form.categorias]

    // Adicionar categoria "Outros" se selecionada, no final da string
    if (form.categorias.includes('Outros') && form.outrosTexto.trim()) {
      const outrosIndex = categoriasSelecionadas.indexOf('Outros')
      categoriasSelecionadas.splice(outrosIndex, 1) // Remove "Outros" da posição original
      categoriasSelecionadas.push(`Outros: ${form.outrosTexto.trim()}`) // Adiciona no final
    }

    const categoriasString = categoriasSelecionadas.join(', ')

    // Se destino customizado for preenchido, usar em vez de loteDestino
    const destinoFinal = form.destinoCustomizado.trim() ? form.destinoCustomizado.trim() : form.loteDestino

    const result = await salvarRegistro('movimentacao', {
      data: form.data,
      loteOrigem: form.loteOrigem,
      loteDestino: destinoFinal,
      numeroCabecas: form.numeroCabecas ? Number(form.numeroCabecas) : 0,
      pesoMedio: form.pesoMedio ? Number(form.pesoMedio) : null,
      categorias: form.categorias,
      categoria: categoriasString,
      motivoMovimentacao: form.motivoMovimentacao,
      brincoChip: form.brincoChip,
      causaObservacao: form.causaObservacao,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
    } else {
      // Armazenar o registro salvo para compartilhamento
      const dadosRegistro = {
        data: form.data,
        loteOrigem: form.loteOrigem,
        loteDestino: destinoFinal,
        numeroCabecas: form.numeroCabecas ? Number(form.numeroCabecas) : 0,
        pesoMedio: form.pesoMedio ? Number(form.pesoMedio) : null,
        categoria: categoriasString,
        motivoMovimentacao: form.motivoMovimentacao,
        brincoChip: form.brincoChip,
        causaObservacao: form.causaObservacao,
      }
      setRegistroSalvo(dadosRegistro)
      setShowSuccessModal(true)
      setForm(makeInitial())
    }
  }

  const handleNewRecord = () => {
    setShowSuccessModal(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleExit = () => {
    setShowSuccessModal(false)
    navigate('/')
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
          <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2">MOVIMENTAÇÃO</h1>
          <button
            onClick={() => navigate('/caderneta/movimentacao/lista')}
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
            type="both"
            size="medium"
          />
        </div>
      </div>

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8">
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: Dados Principais */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS PRINCIPAIS</h2>
          {usuario && (
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <span className="text-xl">👤</span>
              <p className="text-gray-700 font-semibold">{usuario}</p>
            </div>
          )}
          <DatePicker label="DATA" value={form.data} onChange={(val) => setForm((p) => ({ ...p, data: val }))} error={getError('data')} />
          {lotesDisponiveis.length > 0 ? (
            <Select
              label="LOTE ORIGEM"
              value={form.loteOrigem}
              onChange={(e) => setForm((p) => ({ ...p, loteOrigem: e.target.value }))}
              error={getError('loteOrigem')}
              options={[{ value: '', label: 'Selecione...' }, ...lotesDisponiveis.map(l => ({ value: l, label: l }))]}
            />
          ) : (
            <Input
              label="LOTE ORIGEM"
              placeholder="Carregando..."
              value={form.loteOrigem}
              onChange={setInput('loteOrigem')}
              error={getError('loteOrigem')}
              inputMode="numeric"
            />
          )}
          {carregandoLotes && (
            <div className="text-sm text-gray-500">Carregando lotes...</div>
          )}
        </div>

        {/* Seção 2: Identificação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. IDENTIFICAÇÃO</h2>
          <Input
            label="BRINCO / CHIP"
            placeholder="Ex: 2023-145"
            value={form.brincoChip}
            onChange={setInput('brincoChip')}
          />
        </div>

        {/* Seção 3: Quantificação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. QUANTIFICAÇÃO</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="N° CABEÇAS"
              placeholder="Ex: 25"
              value={form.numeroCabecas}
              onChange={setInput('numeroCabecas')}
              error={getError('numeroCabecas')}
              inputMode="numeric"
              type="number"
              min="0"
            />
            <Input
              label="PESO MÉDIO"
              placeholder="Ex: 450"
              value={form.pesoMedio}
              onChange={setInput('pesoMedio')}
              inputMode="decimal"
              type="number"
              min="0"
            />
          </div>
        </div>

        {/* Seção 4: Categorias */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. CATEGORIA DOS ANIMAIS</h2>
          {getError('categorias') && (
            <p className="text-base font-semibold text-red-700">⚠️ {getError('categorias')}</p>
          )}
          <CheckboxGroup
            label=""
            options={CATEGORIAS}
            selectedValues={form.categorias}
            onChange={handleCategoriasChange}
            error={getError('categorias')}
            gridCols={2}
            hideCheckbox={true}
          />
          {form.categorias.includes('Outros') && (
            <Input
              label="DIGITE A CATEGORIA:"
              placeholder="Ex: Reprodutor, Matriz, etc."
              value={form.outrosTexto}
              onChange={(e) => setForm((p) => ({ ...p, outrosTexto: e.target.value }))}
              error={getError('outrosTexto')}
            />
          )}
        </div>

        {/* Seção 5: Motivo */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">5. MOTIVO DA MOVIMENTAÇÃO</h2>
          <Radio
            name="motivoMovimentacao"
            options={MOTIVOS}
            value={form.motivoMovimentacao}
            onChange={(val) => setForm((p) => ({ ...p, motivoMovimentacao: val }))}
            error={getError('motivoMovimentacao')}
            gridCols={2}
          />
          {form.motivoMovimentacao ? (
            <>
              {form.motivoMovimentacao === 'Morte' ? (
                <>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-lg font-bold text-gray-900">DESTINO: CEMITÉRIO</p>
                  </div>
                  <Input
                    label="CAUSA / OBSERVAÇÃO:"
                    placeholder="Descreva detalhes da movimentação"
                    value={form.causaObservacao}
                    onChange={setInput('causaObservacao')}
                  />
                </>
              ) : form.motivoMovimentacao === 'Consumo' ? (
                <>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-lg font-bold text-gray-900">DESTINO: CANTINA</p>
                  </div>
                  <Input
                    label="CAUSA / OBSERVAÇÃO:"
                    placeholder="Descreva detalhes da movimentação"
                    value={form.causaObservacao}
                    onChange={setInput('causaObservacao')}
                  />
                </>
              ) : form.motivoMovimentacao === 'Abate' ? (
                <>
                  {frigorificosDisponiveis.length > 0 ? (
                    <Select
                      label="SELECIONE O FRIGORÍFICO:"
                      value={form.loteDestino}
                      onChange={(e) => setForm((p) => ({ ...p, loteDestino: e.target.value }))}
                      error={getError('loteDestino')}
                      options={[{ value: '', label: 'Selecione...' }, ...frigorificosDisponiveis.map(f => ({ value: f, label: f }))]}
                    />
                  ) : (
                    <Input
                      label="SELECIONE O FRIGORÍFICO:"
                      placeholder="Carregando..."
                      value={form.loteDestino}
                      onChange={setInput('loteDestino')}
                      error={getError('loteDestino')}
                    />
                  )}
                  <Input
                    label="CAUSA / OBSERVAÇÃO:"
                    placeholder="Descreva detalhes da movimentação"
                    value={form.causaObservacao}
                    onChange={setInput('causaObservacao')}
                  />
                </>
              ) : form.motivoMovimentacao === 'Transferência' || form.motivoMovimentacao === 'Entrada' ? (
                <>
                  {lotesDisponiveis.length > 0 ? (
                    <Select
                      label="SELECIONE O LOTE:"
                      value={form.loteDestino}
                      onChange={(e) => setForm((p) => ({ ...p, loteDestino: e.target.value }))}
                      error={getError('loteDestino')}
                      options={[
                        { value: '', label: 'Selecione...' },
                        ...lotesDisponiveis
                          .filter(l => l !== form.loteOrigem) // Filtrar lote de origem
                          .map(l => ({ value: l, label: l }))
                      ]}
                    />
                  ) : (
                    <Input
                      label="SELECIONE O LOTE:"
                      placeholder="Carregando..."
                      value={form.loteDestino}
                      onChange={setInput('loteDestino')}
                      error={getError('loteDestino')}
                    />
                  )}
                  <Input
                    label="CAUSA / OBSERVAÇÃO:"
                    placeholder="Descreva detalhes da movimentação"
                    value={form.causaObservacao}
                    onChange={setInput('causaObservacao')}
                  />
                </>
              ) : form.motivoMovimentacao === 'Entreverado' ? (
                <>
                  {lotesDisponiveis.length > 0 ? (
                    <Select
                      label="SELECIONE UM DESTINO:"
                      value={form.loteDestino}
                      onChange={(e) => setForm((p) => ({ ...p, loteDestino: e.target.value }))}
                      error={getError('loteDestino')}
                      options={[{ value: '', label: 'Selecione...' }, ...lotesDisponiveis.map(l => ({ value: l, label: l }))]}
                    />
                  ) : (
                    <Input
                      label="SELECIONE UM DESTINO:"
                      placeholder="Carregando..."
                      value={form.loteDestino}
                      onChange={setInput('loteDestino')}
                      error={getError('loteDestino')}
                    />
                  )}
                  <Input
                    label="NÃO É UM LOTE?"
                    placeholder="Descreva o destino"
                    value={form.destinoCustomizado}
                    onChange={(e) => setForm((p) => ({ ...p, destinoCustomizado: e.target.value }))}
                  />
                  <Input
                    label="CAUSA / OBSERVAÇÃO:"
                    placeholder="Descreva detalhes da movimentação"
                    value={form.causaObservacao}
                    onChange={setInput('causaObservacao')}
                  />
                </>
              ) : null}
            </>
          ) : (
            <div>
              <p className="text-lg font-bold text-gray-900 mb-2">SELECIONE UM DESTINO:</p>
              <p className="text-sm text-gray-500 italic">Escolha uma das opções acima primeiro...</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾">
            SALVAR
          </Button>
          <Button onClick={() => setForm(makeInitial())} variant="secondary" icon="🧹">
            LIMPAR
          </Button>
        </div>
      </main>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Movimentação"
        registro={registroSalvo}
        caderneta="movimentacao"
      />
    </div>
  )
}

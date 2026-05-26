import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, CheckboxGroup, ValidationMessage, SearchableModal } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { getCachedCadastroData } from '../../services/cadastroCache'
import { getLoteByNome, getLoteDetalhesComCategorias } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import LoteDetalhesCard from '../../components/LoteDetalhesCard'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'

const MOTIVOS = [
  { value: 'Consumo', label: 'CONSUMO', icon: '🍖' },
  { value: 'Abate', label: 'ABATE', icon: '🥩' },
  { value: 'Saída', label: 'SAÍDA', icon: '📤' },
  { value: 'Entrada', label: 'ENTRADA', icon: '📥' },
  { value: 'Entrevero', label: 'ENTREVERO', icon: '🔀' },
  { value: 'Doação', label: 'DOAÇÃO', icon: '🎁' },
]

const TIPO_SAIDA = [
  { value: 'Venda', label: 'VENDA', icon: '' },
  { value: 'Apartação', label: 'APART.', icon: '' },
  { value: 'Transferência', label: 'TRANSF.', icon: '' },
]

const TIPO_ENTRADA = [
  { value: 'Compras', label: 'COMPRAS', icon: '' },
  { value: 'Apartação', label: 'APART.', icon: '' },
  { value: 'Transferência', label: 'TRANSF.', icon: '' },
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

// Função para processar categorias com diferentes delimitadores
function processarCategorias(categorias: string): string[] {
  if (!categorias) return []
  // Separar por: vírgula+espaço, vírgula, ponto+espaço, ponto, ponto e vírgula+espaço, ponto e vírgula
  const regex = /[,.;]+\s*/
  return categorias
    .split(regex)
    .map(c => c.trim())
    .filter(c => c.length > 0)
}

interface FormState {
  data: string
  loteOrigem: string
  loteDestino: string
  destinoCustomizado: string
  numeroCabecas: string
  pesoMedio: string
  motivoMovimentacao: string
  tipoSaida: string // Venda, Apartação, Transferência
  tipoEntrada: string // Compras, Apartação, Transferência
  brinco: string
  chip: string
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
  tipoSaida: '',
  tipoEntrada: '',
  brinco: '',
  chip: '',
  causaObservacao: '',
  categorias: [],
  outrosTexto: '',
})

export default function MovimentacaoPage() {
  const navigate = useNavigate()
  const { usuario, fazenda, fazendaId, logoUrl } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [frigorificosDisponiveis, setFrigorificosDisponiveis] = useState<string[]>([])
  const [fornecedoresDisponiveis, setFornecedoresDisponiveis] = useState<string[]>([])
  const [detalhesLoteOrigem, setDetalhesLoteOrigem] = useState<any>(null)

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
      setForm((p) => ({ ...p, loteDestino: '', tipoSaida: '', tipoEntrada: '' }))
      return
    }

    switch (form.motivoMovimentacao) {
      case 'Consumo':
        setForm((p) => ({ ...p, loteDestino: 'Cantina', tipoSaida: '', tipoEntrada: '' }))
        break
      case 'Saída':
        // Limpar destino e tipo de saída para que o usuário selecione
        setForm((p) => ({ ...p, loteDestino: '', tipoSaida: '', tipoEntrada: '' }))
        break
      case 'Entrada':
        // Limpar destino e tipo de entrada para que o usuário selecione
        setForm((p) => ({ ...p, loteDestino: '', tipoSaida: '', tipoEntrada: '' }))
        break
      case 'Abate':
      case 'Entrevero':
      case 'Doação':
        // Para esses casos, limpar o destino para que o usuário selecione
        setForm((p) => ({ ...p, loteDestino: '', tipoSaida: '', tipoEntrada: '' }))
        break
      default:
        break
    }
  }, [form.motivoMovimentacao])

  // Carregar pastos e lotes do cache global
  useEffect(() => {
    const cache = getCachedCadastroData()
    if (cache) {
      setLotesDisponiveis(cache.lotes || [])
      setFrigorificosDisponiveis(cache.frigorificos || [])
      setFornecedoresDisponiveis(cache.fornecedores || [])
    }
  }, [])


  // Escutar atualizações do cache de cadastro
  useEffect(() => {
    const unsubscribe = eventBus.on(CADASTRO_CACHE_UPDATED, (data: any) => {
      console.log('[MovimentacaoPage] Cache atualizado, recarregando dados')
      if (data) {
        setLotesDisponiveis(data.lotes || [])
        setFrigorificosDisponiveis(data.frigorificos || [])
        setFornecedoresDisponiveis(data.fornecedores || [])
      }
    })

    return unsubscribe
  }, [])

  // Buscar detalhes do lote origem quando selecionado
  useEffect(() => {
    async function carregarDetalhesLoteOrigem() {
      if (!form.loteOrigem || !fazendaId) {
        setDetalhesLoteOrigem(null)
        return
      }

      try {
        const lote = await getLoteByNome(fazendaId, form.loteOrigem)
        if (lote) {
          // Buscar detalhes de categorias do lote
          const categoriasDetalhes = await getLoteDetalhesComCategorias(lote.id)
          
          // Combinar dados do lote com dados de categorias
          setDetalhesLoteOrigem({
            ...lote,
            categorias: categoriasDetalhes.categorias,
            n_cabecas: categoriasDetalhes.quant_atual,
            peso_vivo_kg: categoriasDetalhes.peso_vivo_kg,
            qtd_bezerros: categoriasDetalhes.qtd_bezerros
          })
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do lote origem:', error)
        setDetalhesLoteOrigem(null)
      }
    }

    carregarDetalhesLoteOrigem()
  }, [form.loteOrigem, fazendaId])

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
    let destinoFinal = form.destinoCustomizado.trim() ? form.destinoCustomizado.trim() : form.loteDestino

    // Determinar tipo_destino baseado no motivo
    let tipoDestino = null
    if (form.motivoMovimentacao === 'Consumo') {
      tipoDestino = 'cantina'
      // Garantir que loteDestino seja 'Cantina' quando for consumo
      if (!destinoFinal || destinoFinal === '') {
        destinoFinal = 'Cantina'
      }
    } else if (form.motivoMovimentacao === 'Abate') {
      tipoDestino = 'frigorifico'
    } else if (form.motivoMovimentacao === 'Saída') {
      if (form.tipoSaida === 'Apartação') {
        tipoDestino = 'lote'
      } else if (form.tipoSaida === 'Venda' || form.tipoSaida === 'Transferência') {
        tipoDestino = 'fornecedor'
      }
    } else if (form.motivoMovimentacao === 'Entrada') {
      if (form.tipoEntrada === 'Compras') {
        tipoDestino = 'fornecedor'
      } else if (form.tipoEntrada === 'Apartação' || form.tipoEntrada === 'Transferência') {
        tipoDestino = 'lote'
      }
    } else if (form.motivoMovimentacao === 'Entrevero') {
      tipoDestino = form.destinoCustomizado.trim() ? 'customizado' : 'lote'
    } else if (form.motivoMovimentacao === 'Doação') {
      tipoDestino = 'customizado'
    }

    const result = await salvarRegistro('movimentacao', {
      data: form.data,
      loteOrigem: form.loteOrigem,
      loteDestino: destinoFinal,
      numeroCabecas: form.numeroCabecas ? Number(form.numeroCabecas) : 0,
      pesoMedio: form.pesoMedio ? Number(form.pesoMedio) : null,
      categorias: form.categorias,
      categoria: categoriasString,
      motivoMovimentacao: form.motivoMovimentacao,
      tipoSaida: form.tipoSaida || null,
      tipoEntrada: form.tipoEntrada || null,
      tipoDestino: tipoDestino,
      brinco: form.brinco,
      chip: form.chip,
      causaObservacao: form.causaObservacao,
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
            logoUrl={logoUrl}
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
            <SearchableModal
              label="LOTE ORIGEM"
              value={form.loteOrigem}
              onChange={(val) => setForm((p) => ({ ...p, loteOrigem: val }))}
              error={getError('loteOrigem')}
              options={lotesDisponiveis}
              placeholder="Buscar lote..."
              id="loteOrigem"
              name="loteOrigem"
            />
          ) : (
            <Input
              label="LOTE ORIGEM"
              placeholder="Carregando..."
              value={form.loteOrigem}
              onChange={setInput('loteOrigem')}
              error={getError('loteOrigem')}
              inputMode="numeric"
              disabled
              id="loteOrigem"
            />
          )}
          {detalhesLoteOrigem && (
            <LoteDetalhesCard detalhes={detalhesLoteOrigem} processarCategorias={processarCategorias} />
          )}
        </div>

        {/* Seção 2: Quantificação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. QUANTIFICAÇÃO</h2>
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
              label="PESO MÉDIO (kg)"
              placeholder="Ex: 450"
              value={form.pesoMedio}
              onChange={setInput('pesoMedio')}
              inputMode="decimal"
              type="number"
              min="0"
            />
          </div>
          {/* Identificação - apenas se for 1 cabeça */}
          {form.numeroCabecas === '1' && (
            <>
              <Input
                label="BRINCO"
                placeholder="Ex: 2023-145"
                value={form.brinco}
                onChange={setInput('brinco')}
              />
              <Input
                label="CHIP"
                placeholder="Ex: 123456789"
                value={form.chip}
                onChange={setInput('chip')}
              />
            </>
          )}
        </div>

        {/* Seção 3: Motivo da Movimentação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. MOTIVO DA MOVIMENTAÇÃO</h2>
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
              {form.motivoMovimentacao === 'Consumo' ? (
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
                    <SearchableModal
                      label="SELECIONE O FRIGORÍFICO:"
                      value={form.loteDestino}
                      onChange={(val) => setForm((p) => ({ ...p, loteDestino: val }))}
                      error={getError('loteDestino')}
                      options={frigorificosDisponiveis}
                      placeholder="Buscar frigorífico..."
                      id="loteDestino"
                      name="loteDestino"
                    />
                  ) : (
                    <Input
                      label="SELECIONE O FRIGORÍFICO:"
                      placeholder="Carregando..."
                      value={form.loteDestino}
                      onChange={setInput('loteDestino')}
                      error={getError('loteDestino')}
                      disabled
                      id="loteDestino"
                    />
                  )}
                  <Input
                    label="CAUSA / OBSERVAÇÃO:"
                    placeholder="Descreva detalhes da movimentação"
                    value={form.causaObservacao}
                    onChange={setInput('causaObservacao')}
                  />
                </>
              ) : form.motivoMovimentacao === 'Saída' ? (
                <>
                  <Radio
                    name="tipoSaida"
                    options={TIPO_SAIDA}
                    value={form.tipoSaida}
                    onChange={(val) => setForm((p) => ({ ...p, tipoSaida: val, loteDestino: '' }))}
                    error={getError('tipoSaida')}
                    gridCols={3}
                  />
                  {form.tipoSaida === 'Venda' || form.tipoSaida === 'Transferência' ? (
                    <>
                      {fornecedoresDisponiveis.length > 0 ? (
                        <SearchableModal
                          label="SELECIONE O DESTINO:"
                          value={form.loteDestino}
                          onChange={(val) => setForm((p) => ({ ...p, loteDestino: val }))}
                          error={getError('loteDestino')}
                          options={fornecedoresDisponiveis}
                          placeholder="Buscar destino..."
                          id="loteDestino"
                          name="loteDestino"
                        />
                      ) : (
                        <Input
                          label="SELECIONE O DESTINO:"
                          placeholder="Carregando..."
                          value={form.loteDestino}
                          onChange={setInput('loteDestino')}
                          error={getError('loteDestino')}
                          disabled
                          id="loteDestino"
                        />
                      )}
                      <Input
                        label="CAUSA / OBSERVAÇÃO:"
                        placeholder="Descreva detalhes da movimentação"
                        value={form.causaObservacao}
                        onChange={setInput('causaObservacao')}
                      />
                    </>
                  ) : form.tipoSaida === 'Apartação' ? (
                    <>
                      {lotesDisponiveis.length > 0 ? (
                        <SearchableModal
                          label="SELECIONE O LOTE:"
                          value={form.loteDestino}
                          onChange={(val) => setForm((p) => ({ ...p, loteDestino: val }))}
                          error={getError('loteDestino')}
                          options={lotesDisponiveis.filter(l => l !== form.loteOrigem)}
                          placeholder="Buscar lote..."
                          id="loteDestino"
                          name="loteDestino"
                        />
                      ) : (
                        <Input
                          label="SELECIONE O LOTE:"
                          placeholder="Carregando..."
                          value={form.loteDestino}
                          onChange={setInput('loteDestino')}
                          error={getError('loteDestino')}
                          disabled
                          id="loteDestino"
                        />
                      )}
                      <Input
                        label="CAUSA / OBSERVAÇÃO:"
                        placeholder="Descreva detalhes da movimentação"
                        value={form.causaObservacao}
                        onChange={setInput('causaObservacao')}
                      />
                    </>
                  ) : null}
                </>
              ) : form.motivoMovimentacao === 'Entrada' ? (
                <>
                  <Radio
                    name="tipoEntrada"
                    options={TIPO_ENTRADA}
                    value={form.tipoEntrada}
                    onChange={(val) => setForm((p) => ({ ...p, tipoEntrada: val, loteDestino: '' }))}
                    error={getError('tipoEntrada')}
                    gridCols={3}
                  />
                  {form.tipoEntrada === 'Compras' ? (
                    <>
                      {fornecedoresDisponiveis.length > 0 ? (
                        <SearchableModal
                          label="SELECIONE O FORNECEDOR:"
                          value={form.loteDestino}
                          onChange={(val) => setForm((p) => ({ ...p, loteDestino: val }))}
                          error={getError('loteDestino')}
                          options={fornecedoresDisponiveis}
                          placeholder="Buscar fornecedor..."
                          id="loteDestino"
                          name="loteDestino"
                        />
                      ) : (
                        <Input
                          label="SELECIONE O FORNECEDOR:"
                          placeholder="Carregando..."
                          value={form.loteDestino}
                          onChange={setInput('loteDestino')}
                          error={getError('loteDestino')}
                          disabled
                          id="loteDestino"
                        />
                      )}
                      <Input
                        label="CAUSA / OBSERVAÇÃO:"
                        placeholder="Descreva detalhes da movimentação"
                        value={form.causaObservacao}
                        onChange={setInput('causaObservacao')}
                      />
                    </>
                  ) : form.tipoEntrada === 'Apartação' || form.tipoEntrada === 'Transferência' ? (
                    <>
                      {lotesDisponiveis.length > 0 ? (
                        <SearchableModal
                          label="SELECIONE O LOTE:"
                          value={form.loteDestino}
                          onChange={(val) => setForm((p) => ({ ...p, loteDestino: val }))}
                          error={getError('loteDestino')}
                          options={lotesDisponiveis.filter(l => l !== form.loteOrigem)}
                          placeholder="Buscar lote..."
                          id="loteDestino"
                          name="loteDestino"
                        />
                      ) : (
                        <Input
                          label="SELECIONE O LOTE:"
                          placeholder="Carregando..."
                          value={form.loteDestino}
                          onChange={setInput('loteDestino')}
                          error={getError('loteDestino')}
                          disabled
                          id="loteDestino"
                        />
                      )}
                      <Input
                        label="CAUSA / OBSERVAÇÃO:"
                        placeholder="Descreva detalhes da movimentação"
                        value={form.causaObservacao}
                        onChange={setInput('causaObservacao')}
                      />
                    </>
                  ) : null}
                </>
              ) : form.motivoMovimentacao === 'Entrevero' ? (
                <>
                  {lotesDisponiveis.length > 0 ? (
                    <SearchableModal
                      label="SELECIONE UM DESTINO:"
                      value={form.loteDestino}
                      onChange={(val) => setForm((p) => ({ ...p, loteDestino: val }))}
                      error={getError('loteDestino')}
                      options={lotesDisponiveis}
                      placeholder="Buscar destino..."
                    />
                  ) : (
                    <Input
                      label="SELECIONE UM DESTINO:"
                      placeholder="Carregando..."
                      value={form.loteDestino}
                      onChange={setInput('loteDestino')}
                      error={getError('loteDestino')}
                      disabled
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
              ) : form.motivoMovimentacao === 'Doação' ? (
                <>
                  <Input
                    label="OBSERVAÇÃO:"
                    placeholder="Descreva detalhes da doação (opcional)"
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
            id="categorias"
            dataField="categorias"
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

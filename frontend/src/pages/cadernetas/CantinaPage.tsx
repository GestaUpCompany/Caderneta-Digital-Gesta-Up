import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, DatePicker, ValidationMessage, Radio, SearchableModal } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { scrollToFirstError } from '../../utils/scrollToError'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { getCachedCadastroData, getItensSupermercadoCached } from '../../services/cadastroCache'
import { useFormValidation } from '../../hooks/useFormValidation'

interface ItemSupermercado {
  id: string
  nome: string
  unidade_medida: string
}

const COZINHEIRAS_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
]

interface FormState {
  data: string
  numeroCozinheiras: string
  quemCozinhou: string
  quemAjudou: string[]
  numeroCafeManha: string
  numeroLanches: string
  numeroRefeicoesAlmoco: string
  numeroRefeicoesJantar: string
  itens: Record<string, string>
  observacao: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  numeroCozinheiras: '1',
  quemCozinhou: '',
  quemAjudou: [],
  numeroCafeManha: '',
  numeroLanches: '',
  numeroRefeicoesAlmoco: '',
  numeroRefeicoesJantar: '',
  itens: {},
  observacao: '',
})

export default function CantinaPage() {
  const navigate = useNavigate()
  const { fazendaId } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(() => makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [funcionariosDisponiveis, setFuncionariosDisponiveis] = useState<string[]>([])
  const [itensSupermercadoDisponiveis, setItensSupermercadoDisponiveis] = useState<ItemSupermercado[]>([])

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const setItem = (item: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, itens: { ...prev.itens, [item]: e.target.value } }))

  const setQuemAjudou = (index: number, value: string) =>
    setForm((prev) => {
      const newQuemAjudou = [...prev.quemAjudou]
      newQuemAjudou[index] = value
      return { ...prev, quemAjudou: newQuemAjudou }
    })

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Validation rules
  const validationRules: any = {
    data: { required: true },
    numeroCozinheiras: { required: true },
    quemCozinhou: { required: true },
    // At least 1 refeicao field must be filled
    refeicoes: {
      custom: (_value: any, form: any) => {
        const hasAnyRefeicao = form.numeroCafeManha || form.numeroLanches || form.numeroRefeicoesAlmoco || form.numeroRefeicoesJantar
        return hasAnyRefeicao ? null : 'Pelo menos uma refeição deve ser informada'
      }
    },
    // At least 1 item must be filled
    itens: {
      custom: (_value: any, form: any) => {
        const hasAnyItem = Object.values(form.itens).some(val => val && val !== '')
        return hasAnyItem ? null : 'Pelo menos um item deve ser informado'
      }
    },
  }

  // Add validation for quemAjudou fields
  form.quemAjudou.forEach((_, index) => {
    validationRules[`quemAjudou.${index}`] = { required: true }
  })

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
          setForm(prev => ({
            ...prev,
            itens: (data as ItemSupermercado[]).reduce((acc, item) => ({ ...acc, [item.id]: '' }), {} as Record<string, string>)
          }))
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

    // Converter IDs de itens para nomes com unidade para armazenamento
    const itensStorage: Record<string, string> = {}
    Object.entries(form.itens).forEach(([itemId, value]) => {
      const item = itensSupermercadoDisponiveis.find(i => i.id === itemId)
      if (item && value) {
        itensStorage[`${item.nome} (${item.unidade_medida})`] = value
      }
    })

    const result = await salvarRegistro('cantina', {
      data: form.data,
      numeroCozinheiras: form.numeroCozinheiras,
      quemCozinhou: form.quemCozinhou,
      quemAjudou: form.quemAjudou.join(', '),
      numeroCafeManha: form.numeroCafeManha,
      numeroLanches: form.numeroLanches,
      numeroRefeicoesAlmoco: form.numeroRefeicoesAlmoco,
      numeroRefeicoesJantar: form.numeroRefeicoesJantar,
      itens: itensStorage,
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
    <CadernetaLayout title="CANTINA" cadernetaId="cantina">
      {errors.length > 0 && <ValidationMessage errors={errors} />}

      {/* Seção 1: Dados Principais */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS DA CANTINA</h2>
        <DatePicker label={<span>DATA <span className="text-red-500">*</span></span>} value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} error={getError('data')} />
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
          onChange={(val) => setForm((p) => ({ ...p, quemCozinhou: val }))}
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
        {itensSupermercadoDisponiveis.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Nenhum item cadastrado no sistema</p>
        ) : (
          <div className="flex flex-col gap-4 items-stretch">
            {itensSupermercadoDisponiveis.map((item) => (
              <Input 
                key={item.id} 
                label={`${item.nome.toUpperCase()} (${item.unidade_medida})`}
                type="number" 
                placeholder="Quantidade"
                value={form.itens[item.id] || ''} 
                onChange={setItem(item.id)} 
                error={getError(`itens.${item.id}`)} 
              />
            ))}
          </div>
        )}
      </div>

      {/* Seção 4: Observações */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">4. OBSERVAÇÕES</h2>
        <Input placeholder="Observações adicionais" value={form.observacao} onChange={setInput('observacao')} error={getError('observacao')} />
      </div>

      {/* Ações */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾" fullWidth disabled={!isValid}>
          SALVAR
        </Button>
        <Button onClick={handleLimpar} variant="secondary" icon="🧹" fullWidth>
          LIMPAR
        </Button>
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
        caderneta="cantina"
      />
    </CadernetaLayout>
  )
}

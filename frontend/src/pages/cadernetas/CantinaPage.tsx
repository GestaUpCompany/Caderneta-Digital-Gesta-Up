import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, DatePicker, ValidationMessage, Radio, SearchableModal } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { scrollToFirstError } from '../../utils/scrollToError'
import { getSupabaseClient } from '../../services/supabaseClient'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'

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
  numeroCozinheiras: '',
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

  // Buscar funcionários do Supabase
  useEffect(() => {
    async function carregarFuncionarios() {
      if (!fazendaId) return

      try {
        const client = getSupabaseClient()
        const { data, error } = await client
          .from('funcionarios')
          .select('nome')
          .eq('fazenda_id', fazendaId)
          .eq('ativo', true)
          .order('nome')

        if (error) {
          console.error('Erro ao buscar funcionários:', error)
          return
        }

        if (data) {
          const funcionariosList = data.map(f => f.nome)
          setFuncionariosDisponiveis(funcionariosList)
        }
      } catch (error) {
        console.error('Erro ao carregar funcionários:', error)
      }
    }

    carregarFuncionarios()
  }, [fazendaId])

  // Buscar itens de supermercado do Supabase
  useEffect(() => {
    async function carregarItensSupermercado() {
      if (!fazendaId) return

      try {
        const client = getSupabaseClient()
        const { data, error } = await (client as any)
          .from('itens_supermercado')
          .select('*')
          .eq('fazenda_id', fazendaId)
          .eq('ativo', true)
          .order('nome')

        if (error) {
          console.error('Erro ao buscar itens de supermercado:', error)
          return
        }

        if (data) {
          setItensSupermercadoDisponiveis(data as ItemSupermercado[])
          // Inicializar itens no form
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
        <DatePicker label="DATA" value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} error={getError('data')} />
        <Radio
          name="numeroCozinheiras"
          label="N° COZINHEIRAS"
          options={COZINHEIRAS_OPTIONS}
          value={form.numeroCozinheiras}
          onChange={(val) => setForm((p) => ({ ...p, numeroCozinheiras: val }))}
          error={getError('numeroCozinheiras')}
          gridCols={5}
        />
        <SearchableModal
          label="QUEM COZINHOU?"
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
            label={`${index + 1}ª AJUDANTE`}
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
        <h2 className="text-lg font-black text-gray-900 tracking-tight">2. REFEIÇÕES</h2>
        <Input label="N° CAFÉ DA MANHÃ?" type="number" placeholder="Quantidade" value={form.numeroCafeManha} onChange={setInput('numeroCafeManha')} error={getError('numeroCafeManha')} />
        <Input label="N° LANCHES?" type="number" placeholder="Quantidade" value={form.numeroLanches} onChange={setInput('numeroLanches')} error={getError('numeroLanches')} />
        <Input label="N° REFEIÇÕES ALMOÇO?" type="number" placeholder="Quantidade" value={form.numeroRefeicoesAlmoco} onChange={setInput('numeroRefeicoesAlmoco')} error={getError('numeroRefeicoesAlmoco')} />
        <Input label="N° REFEIÇÕES JANTAR?" type="number" placeholder="Quantidade" value={form.numeroRefeicoesJantar} onChange={setInput('numeroRefeicoesJantar')} error={getError('numeroRefeicoesJantar')} />
      </div>

      {/* Seção 3: Itens */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">3. QUANTIFICAÇÃO DE ITENS</h2>
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
        <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾" fullWidth>
          SALVAR
        </Button>
        <Button onClick={handleLimpar} variant="secondary" icon="🧹" fullWidth>
          LIMPAR
        </Button>
      </div>

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

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, DatePicker, ValidationMessage, Radio, Checkbox } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { scrollToFirstError } from '../../utils/scrollToError'

// Mapeamento: label exibido -> valor armazenado no Supabase
const ITEM_LABELS: Record<string, string> = {
  'Arroz': 'Arroz',
  'Feijão': 'Feijão',
  'Macarrão': 'Macarrão',
  'Traseiro': 'Traseiro',
  'Dianteiro': 'Dianteiro',
  'Ponta Ag.': 'Ponta Agulha',
  'Suíno': 'Suíno',
  'Frango': 'Frango',
  'Ovo': 'Ovo',
  'Carneiro': 'Carneiro',
  'Peixe': 'Peixe',
  'Gás Cozinha': 'Gás Cozinha',
  'Outros': 'Outros',
}

// Mapeamento de unidades de medida para cada item
const ITEM_UNITS: Record<string, string> = {
  'Arroz': 'kg',
  'Feijão': 'kg',
  'Macarrão': 'pacote',
  'Traseiro': 'kg',
  'Dianteiro': 'kg',
  'Ponta Ag.': 'kg',
  'Suíno': 'kg',
  'Frango': 'kg',
  'Ovo': 'unid.',
  'Carneiro': 'kg',
  'Peixe': 'kg',
  'Gás Cozinha': 'unid.',
  'Outros': '',
}

const UNIDADES_OPTIONS = [
  { value: 'kg', label: 'KG' },
  { value: 'unid.', label: 'UNID.' },
  { value: 'pct', label: 'PCT' },
]

const ITENS_OPTIONS = Object.keys(ITEM_LABELS).filter(item => item !== 'Outros')

interface FormState {
  data: string
  numeroCozinheiras: string
  quemCozinhou: string
  quemAjudou: string
  numeroCafeManha: string
  numeroLanches: string
  numeroRefeicoesAlmoco: string
  numeroRefeicoesJantar: string
  itens: Record<string, string>
  outrosHabilitado: boolean
  nomeOutros: string
  quantidadeOutros: string
  unidadeOutros: string
  observacao: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  numeroCozinheiras: '',
  quemCozinhou: '',
  quemAjudou: '',
  numeroCafeManha: '',
  numeroLanches: '',
  numeroRefeicoesAlmoco: '',
  numeroRefeicoesJantar: '',
  itens: ITENS_OPTIONS.reduce((acc, item) => ({ ...acc, [item]: '' }), {} as Record<string, string>),
  outrosHabilitado: false,
  nomeOutros: '',
  quantidadeOutros: '',
  unidadeOutros: '',
  observacao: '',
})

export default function CantinaPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(() => makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const setItem = (item: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, itens: { ...prev.itens, [item]: e.target.value } }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    // Converter labels de exibição para valores de armazenamento
    const itensStorage: Record<string, string> = {}
    Object.entries(form.itens).forEach(([displayLabel, value]) => {
      const storageKey = ITEM_LABELS[displayLabel] || displayLabel
      itensStorage[storageKey] = value
    })

    const result = await salvarRegistro('cantina', {
      data: form.data,
      numeroCozinheiras: form.numeroCozinheiras,
      quemCozinhou: form.quemCozinhou,
      quemAjudou: form.quemAjudou,
      numeroCafeManha: form.numeroCafeManha,
      numeroLanches: form.numeroLanches,
      numeroRefeicoesAlmoco: form.numeroRefeicoesAlmoco,
      numeroRefeicoesJantar: form.numeroRefeicoesJantar,
      itens: itensStorage,
      nomeOutros: form.nomeOutros,
      quantidadeOutros: form.quantidadeOutros,
      unidadeOutros: form.unidadeOutros,
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
        <Input label="N° COZINHEIRAS" type="number" placeholder="Número de cozinheiras" value={form.numeroCozinheiras} onChange={setInput('numeroCozinheiras')} error={getError('numeroCozinheiras')} />
        <Input label="QUEM COZINHOU?" placeholder="Nome de quem cozinhou" value={form.quemCozinhou} onChange={setInput('quemCozinhou')} error={getError('quemCozinhou')} />
        <Input label="QUEM AJUDOU?" placeholder="Nome de quem ajudou" value={form.quemAjudou} onChange={setInput('quemAjudou')} error={getError('quemAjudou')} />
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
        <div className="grid grid-cols-2 gap-4 items-stretch">
          {ITENS_OPTIONS.map((item) => (
            <Input 
              key={item} 
              label={item.toUpperCase()} 
              type="number" 
              placeholder={ITEM_UNITS[item] || 'Quantidade'} 
              value={form.itens[item] || ''} 
              onChange={setItem(item)} 
              error={getError(`itens.${item}`)} 
            />
          ))}
        </div>
        <Checkbox
          label="Adicionar item não listado"
          checked={form.outrosHabilitado}
          onChange={(e) => {
            setForm((p) => ({ ...p, outrosHabilitado: e.target.checked }))
            if (!e.target.checked) {
              setForm((p) => ({ ...p, nomeOutros: '', quantidadeOutros: '', unidadeOutros: '' }))
            }
          }}
          className="[&_div]:w-8 [&_div]:h-8 [&_div]:min-w-[32px] [&_div]:min-h-[32px] [&_svg]:w-5 [&_svg]:h-5"
        />
        {form.outrosHabilitado && (
          <div className="grid grid-cols-1 gap-4 items-stretch mt-2">
            <Input 
              label="NOME DO ITEM" 
              placeholder="Especifique o item" 
              value={form.nomeOutros} 
              onChange={setInput('nomeOutros')} 
              error={getError('nomeOutros')} 
            />
            <div className="grid grid-cols-2 gap-4 items-stretch">
              <Input 
                label="QUANTIDADE" 
                type="number"
                placeholder="Quantidade" 
                value={form.quantidadeOutros} 
                onChange={setInput('quantidadeOutros')} 
                error={getError('quantidadeOutros')} 
              />
              <Radio
                name="unidadeOutros"
                label="UNIDADE"
                options={UNIDADES_OPTIONS}
                value={form.unidadeOutros}
                onChange={(val) => setForm((p) => ({ ...p, unidadeOutros: val }))}
                error={getError('unidadeOutros')}
                gridCols={3}
              />
            </div>
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

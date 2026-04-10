import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, DatePicker, Checkbox, Radio, ValidationMessage } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'

const AVALIACOES_SN = [
  { campo: 'escoreGadoIdeal', label: 'ESCORE DO GADO IDEAL?' },
  { campo: 'aguaBoaBebedouro', label: 'ÁGUA BOA / BEBEDOURO?' },
  { campo: 'pastagemAdequada', label: 'PASTAGEM ADEQUADA?' },
  { campo: 'animaisDoentes', label: 'ANIMAIS DOENTES?' },
  { campo: 'cercasCochos', label: 'CERCAS / COCHOS OK?' },
  { campo: 'carrapatosMoscas', label: 'CARRAPATOS / MOSCAS?' },
  { campo: 'animaisEntrevados', label: 'ANIMAIS ENTREVADOS?' },
  { campo: 'animalMorto', label: 'ANIMAL MORTO?' },
]

const ESCALA_5 = [
  { value: '1', label: '1', icon: '⛔' },
  { value: '2', label: '2', icon: '🔴' },
  { value: '3', label: '3', icon: '🟡' },
  { value: '4', label: '4', icon: '🟢' },
  { value: '5', label: '5', icon: '🏆' },
]

const PROCEDIMENTOS_OPCOES = [
  'Mata Bicheira', 'Antibiótico', 'Tiguvon', 'Vermífugo',
  'Anti-tóxico', 'Anti-inflamatório', 'Soro Antiofídico', 'Outros',
]

const CATEGORIAS_ANIMAIS: { campo: string; label: string }[] = [
  { campo: 'vaca', label: 'VACA' },
  { campo: 'touro', label: 'TOURO' },
  { campo: 'bezerro', label: 'BEZERRO' },
  { campo: 'boi', label: 'BOI' },
  { campo: 'garrote', label: 'GARROTE' },
  { campo: 'novilha', label: 'NOVILHA' },
]

type SnFields = {
  escoreGadoIdeal: string
  aguaBoaBebedouro: string
  pastagemAdequada: string
  animaisDoentes: string
  cercasCochos: string
  carrapatosMoscas: string
  animaisEntrevados: string
  animalMorto: string
}

interface FormState extends SnFields {
  data: string
  pasto: string
  numeroLote: string
  vaca: string
  touro: string
  bezerro: string
  boi: string
  garrote: string
  novilha: string
  animaisTratados: string
  escoreFezes: string
  equipe: string
  procedimentos: string[]
  procedimentosOutros: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  pasto: '',
  numeroLote: '',
  vaca: '', touro: '', bezerro: '', boi: '', garrote: '', novilha: '',
  escoreGadoIdeal: '', aguaBoaBebedouro: '', pastagemAdequada: '',
  animaisDoentes: '', cercasCochos: '', carrapatosMoscas: '',
  animaisEntrevados: '', animalMorto: '',
  animaisTratados: '',
  escoreFezes: '',
  equipe: '',
  procedimentos: [],
  procedimentosOutros: '',
})

const SN_OPTIONS = [
  { value: 'S', label: 'SIM', icon: '✅' },
  { value: 'N', label: 'NÃO', icon: '❌' },
]

export default function RodeioPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(makeInitial)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const toggleProcedimento = (proc: string) => {
    setForm((prev) => ({
      ...prev,
      procedimentos: prev.procedimentos.includes(proc)
        ? prev.procedimentos.filter((p) => p !== proc)
        : [...prev.procedimentos, proc],
    }))
  }

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const total = ['vaca', 'touro', 'bezerro', 'boi', 'garrote', 'novilha'].reduce(
    (acc, c) => acc + (Number(form[c as keyof FormState]) || 0), 0
  )

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const procedimentosTexto = form.procedimentos.length > 0
      ? form.procedimentos.includes('Outros')
        ? [...form.procedimentos.filter(p => p !== 'Outros'), form.procedimentosOutros].filter(Boolean).join(', ')
        : form.procedimentos.join(', ')
      : ''
    
    const result = await salvarRegistro('rodeio', {
      data: form.data,
      pasto: form.pasto,
      numeroLote: form.numeroLote,
      vaca: form.vaca ? Number(form.vaca) : 0,
      touro: form.touro ? Number(form.touro) : 0,
      bezerro: form.bezerro ? Number(form.bezerro) : 0,
      boi: form.boi ? Number(form.boi) : 0,
      garrote: form.garrote ? Number(form.garrote) : 0,
      novilha: form.novilha ? Number(form.novilha) : 0,
      totalCabecas: total,
      escoreGadoIdeal: form.escoreGadoIdeal,
      aguaBoaBebedouro: form.aguaBoaBebedouro,
      pastagemAdequada: form.pastagemAdequada,
      animaisDoentes: form.animaisDoentes,
      cercasCochos: form.cercasCochos,
      carrapatosMoscas: form.carrapatosMoscas,
      animaisEntrevados: form.animaisEntrevados,
      animalMorto: form.animalMorto,
      animaisTratados: form.animaisTratados ? Number(form.animaisTratados) : 0,
      escoreFezes: form.escoreFezes ? Number(form.escoreFezes) : null,
      equipe: form.equipe ? Number(form.equipe) : null,
      procedimentos: procedimentosTexto,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
    } else {
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
      <header className="bg-black text-white flex items-center px-4 py-4">
        <button
          onClick={() => navigate(-1)}
          className="text-yellow-400 font-bold text-sm min-h-[40px] px-3"
        >
          ← VOLTAR
        </button>
        <h1 className="text-base font-bold flex-1 text-center">
          RODEIO GADO
        </h1>
        <button
          onClick={() => navigate('/caderneta/rodeio/lista')}
          className="text-yellow-400 font-bold text-sm min-h-[40px] px-3"
        >
          LISTA
        </button>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8">
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Seção 1: Dados Principais */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">1. DADOS PRINCIPAIS</h2>
          <DatePicker label="DATA" value={form.data} onChange={set('data')} error={getError('data')} />
          <Input
            label="PASTO"
            placeholder="Ex: Pasto 12"
            value={form.pasto}
            onChange={setInput('pasto')}
            error={getError('pasto')}
          />
          <Input
            label="NÚMERO DO LOTE"
            placeholder="Ex: 02"
            value={form.numeroLote}
            onChange={setInput('numeroLote')}
            error={getError('numeroLote')}
            inputMode="numeric"
          />
        </div>

        {/* Seção 2: Quantidade por Categoria */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">2. QUANTIDADE DE ANIMAIS</h2>
          {getError('categorias') && (
            <p className="text-base font-semibold text-red-700">⚠️ {getError('categorias')}</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIAS_ANIMAIS.map(({ campo, label }) => (
              <Input
                key={campo}
                label={label}
                placeholder="0"
                value={form[campo as keyof FormState] as string}
                onChange={setInput(campo as keyof FormState)}
                inputMode="numeric"
                type="number"
                min="0"
              />
            ))}
          </div>
          {total > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-3 flex items-center justify-between">
              <span className="text-lg font-bold text-gray-700">TOTAL</span>
              <span className="text-2xl font-bold text-black">{total} cabeças</span>
            </div>
          )}
        </div>

        {/* Seção 3: Avaliação Geral S/N */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-5">
          <h2 className="section-title">3. AVALIAÇÃO GERAL</h2>
          {AVALIACOES_SN.map(({ campo, label }) => (
            <Radio
              key={campo}
              name={campo}
              label={label}
              options={SN_OPTIONS}
              value={form[campo as keyof SnFields]}
              onChange={set(campo as keyof FormState)}
              error={getError(campo)}
            />
          ))}
        </div>

        {/* Seção 4: Tratamento e Avaliação */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">4. TRATAMENTO E AVALIAÇÃO</h2>
          <Input
            label="ANIMAIS TRATADOS"
            placeholder="0"
            value={form.animaisTratados}
            onChange={setInput('animaisTratados')}
            inputMode="numeric"
            type="number"
            min="0"
          />
          <Radio
            name="escoreFezes"
            label="ESCORE DE FEZES (1 a 5)"
            options={ESCALA_5}
            value={form.escoreFezes}
            onChange={set('escoreFezes')}
            error={getError('escoreFezes')}
          />
          <Radio
            name="equipe"
            label="AVALIAÇÃO DA EQUIPE (1 a 5)"
            options={ESCALA_5}
            value={form.equipe}
            onChange={set('equipe')}
            error={getError('equipe')}
          />
        </div>

        {/* Seção 5: Procedimentos */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">5. PROCEDIMENTOS REALIZADOS</h2>
          <div className="flex flex-col gap-3">
            {PROCEDIMENTOS_OPCOES.map((proc) => (
              <Checkbox
                key={proc}
                label={proc}
                checked={form.procedimentos.includes(proc)}
                onChange={() => toggleProcedimento(proc)}
              />
            ))}
          </div>
          {form.procedimentos.includes('Outros') && (
            <Input
              label="DESCREVA OUTROS PROCEDIMENTOS"
              placeholder="Ex: Aplicação de vitaminas, limpeza de feridas..."
              value={form.procedimentosOutros}
              onChange={setInput('procedimentosOutros')}
              error={getError('procedimentosOutros')}
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
        cadernetaName="Rodeio Gado"
      />
    </div>
  )
}

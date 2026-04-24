import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, ValidationMessage, Select } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import PdfModal from '../../components/PdfModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { LOGO_URL, getFarmLogo, BACKEND_URL } from '../../utils/constants'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'

const AVALIACOES_SN = [
  { campo: 'escoreGadoIdeal', label: 'ESCORE DO GADO IDEAL?' },
  { campo: 'aguaBoaBebedouro', label: 'ÁGUA BOA / BEBEDOURO?' },
  { campo: 'pastagemAdequada', label: 'PASTAGEM ADEQUADA?' },
  { campo: 'animaisDoentes', label: 'ANIMAIS DOENTES?' },
  { campo: 'cercasCochos', label: 'CERCAS / COCHOS OK?' },
  { campo: 'carrapatosMoscas', label: 'CARRAPATOS / MOSCAS?' },
  { campo: 'animaisEntreverados', label: 'ANIMAIS ENTREVERADOS?' },
  { campo: 'animalMorto', label: 'ANIMAL MORTO?' },
]

const ESCALA_5 = [
  { value: '1', label: '1', icon: '🔴' },
  { value: '2', label: '2', icon: '🟡' },
  { value: '3', label: '3', icon: '🟢' },
  { value: '4', label: '4', icon: '🟡' },
  { value: '5', label: '5', icon: '🔴' },
]

const ESCALA_EQUIPE = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
]

const PROCEDIMENTOS_OPCOES = [
  'Mata Bicheira', 'Antibiótico', 'Tiguvon', 'Vermífugo',
  'Anti-tóxico', 'Anti-inflamatório', 'Soro Antiofídico', 'Outros',
]

const CATEGORIAS_ANIMAIS: { campo: string; label: string }[] = [
  { campo: 'vaca', label: 'VACAS' },
  { campo: 'touro', label: 'TOUROS' },
  { campo: 'bezerro', label: 'BEZERROS(AS)' },
  { campo: 'boi', label: 'BOIS' },
  { campo: 'garrote', label: 'GARROTES' },
  { campo: 'novilha', label: 'NOVILHAS' },
]

type SnFields = {
  escoreGadoIdeal: string
  escoreGadoIdealObs: string
  aguaBoaBebedouro: string
  aguaBoaBebedouroObs: string
  pastagemAdequada: string
  pastagemAdequadaObs: string
  animaisDoentes: string
  animaisDoentesObs: string
  cercasCochos: string
  cercasCochosObs: string
  carrapatosMoscas: string
  carrapatosMoscasObs: string
  animaisEntreverados: string
  animaisEntreveradosObs: string
  animalMorto: string
  animalMortoObs: string
}

interface AnimalTratado {
  id: string
  tratamentos: string[]
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
  animaisTratadosDetalhes: AnimalTratado[]
  escoreFezes: string
  equipe: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  pasto: '',
  numeroLote: '',
  vaca: '', touro: '', bezerro: '', boi: '', garrote: '', novilha: '',
  escoreGadoIdeal: '', escoreGadoIdealObs: '',
  aguaBoaBebedouro: '', aguaBoaBebedouroObs: '',
  pastagemAdequada: '', pastagemAdequadaObs: '',
  animaisDoentes: '', animaisDoentesObs: '',
  cercasCochos: '', cercasCochosObs: '',
  carrapatosMoscas: '', carrapatosMoscasObs: '',
  animaisEntreverados: '', animaisEntreveradosObs: '',
  animalMorto: '', animalMortoObs: '',
  animaisTratados: '',
  animaisTratadosDetalhes: [],
  escoreFezes: '',
  equipe: '',
})

const SN_OPTIONS = [
  { value: 'S', label: 'SIM', icon: '✅' },
  { value: 'N', label: 'NÃO', icon: '❌' },
]

export default function RodeioPage() {
  const navigate = useNavigate()
  const { usuario, fazenda } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [pastosDisponiveis, setPastosDisponiveis] = useState<string[]>([])
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [carregandoPastosLotes, setCarregandoPastosLotes] = useState(false)

  // Gerar cards de animais tratados quando número muda
  useEffect(() => {
    const numAnimais = Number(form.animaisTratados) || 0
    const detalhesAtuais = form.animaisTratadosDetalhes
    
    if (numAnimais > detalhesAtuais.length) {
      // Adicionar novos cards
      const novosAnimais = Array.from({ length: numAnimais - detalhesAtuais.length }, () => ({
        id: '',
        tratamentos: [],
      }))
      setForm((prev) => ({
        ...prev,
        animaisTratadosDetalhes: [...detalhesAtuais, ...novosAnimais],
      }))
    } else if (numAnimais < detalhesAtuais.length) {
      // Remover cards excedentes
      setForm((prev) => ({
        ...prev,
        animaisTratadosDetalhes: detalhesAtuais.slice(0, numAnimais),
      }))
    }
  }, [form.animaisTratados])

  // Carregar pastos e lotes quando fazenda mudar
  useEffect(() => {
    async function carregarPastosELotes() {
      if (!fazenda) return

      setCarregandoPastosLotes(true)
      try {
        const response = await fetch(`${BACKEND_URL}/api/suplementacao/pastos-lotes?fazenda=${encodeURIComponent(fazenda)}`)
        const data = await response.json()

        if (data.success) {
          setPastosDisponiveis(data.pastos || [])
          setLotesDisponiveis(data.lotes || [])
        }
      } catch (error) {
        console.error('Erro ao carregar pastos e lotes:', error)
      } finally {
        setCarregandoPastosLotes(false)
      }
    }

    carregarPastosELotes()

    // Polling a cada 3 minutos
    const interval = setInterval(carregarPastosELotes, 180000) // 3 minutos

    return () => clearInterval(interval)
  }, [fazenda])

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const updateAnimalId = (index: number, value: string) => {
    setForm((prev) => {
      const detalhes = [...prev.animaisTratadosDetalhes]
      detalhes[index] = { ...detalhes[index], id: value }
      return { ...prev, animaisTratadosDetalhes: detalhes }
    })
  }

  const toggleAnimalTratamento = (animalIndex: number, tratamento: string) => {
    setForm((prev) => {
      const detalhes = [...prev.animaisTratadosDetalhes]
      const tratamentos = detalhes[animalIndex].tratamentos.includes(tratamento)
        ? detalhes[animalIndex].tratamentos.filter((t) => t !== tratamento)
        : [...detalhes[animalIndex].tratamentos, tratamento]
      detalhes[animalIndex] = { ...detalhes[animalIndex], tratamentos }
      return { ...prev, animaisTratadosDetalhes: detalhes }
    })
  }

  const isAnimalCompleto = (index: number) => {
    const animal = form.animaisTratadosDetalhes[index]
    return animal.id.trim() !== '' && animal.tratamentos.length > 0
  }

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const total = ['vaca', 'touro', 'bezerro', 'boi', 'garrote', 'novilha'].reduce(
    (acc, c) => acc + (Number(form[c as keyof FormState]) || 0), 0
  )

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    // Gerar 20 pares de colunas para animais tratados
    const animaisTratadosData: Record<string, string> = {}
    for (let i = 0; i < 20; i++) {
      const animal = form.animaisTratadosDetalhes[i]
      animaisTratadosData[`animal${i + 1}Id`] = animal?.id || ''
      // Concatenar tratamentos, removendo "Outros: " prefixo se existir
      const tratamentosLimpos = animal?.tratamentos
        .map(t => t.replace('Outros: ', ''))
        .filter(Boolean) || []
      animaisTratadosData[`animal${i + 1}Tratamentos`] = tratamentosLimpos.join(', ')
    }
    
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
      escoreGadoIdealObs: form.escoreGadoIdealObs || '',
      aguaBoaBebedouro: form.aguaBoaBebedouro,
      aguaBoaBebedouroObs: form.aguaBoaBebedouroObs || '',
      pastagemAdequada: form.pastagemAdequada,
      pastagemAdequadaObs: form.pastagemAdequadaObs || '',
      animaisDoentes: form.animaisDoentes,
      animaisDoentesObs: form.animaisDoentesObs || '',
      cercasCochos: form.cercasCochos,
      cercasCochosObs: form.cercasCochosObs || '',
      carrapatosMoscas: form.carrapatosMoscas,
      carrapatosMoscasObs: form.carrapatosMoscasObs || '',
      animaisEntreverados: form.animaisEntreverados,
      animaisEntreveradosObs: form.animaisEntreveradosObs || '',
      animalMorto: form.animalMorto,
      animalMortoObs: form.animalMortoObs || '',
      animaisTratados: form.animaisTratados ? Number(form.animaisTratados) : 0,
      escoreFezes: form.escoreFezes ? Number(form.escoreFezes) : null,
      equipe: form.equipe ? Number(form.equipe) : null,
      ...animaisTratadosData,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
    } else {
      // Armazenar o registro salvo para compartilhamento
      const dadosRegistro = {
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
        escoreGadoIdealObs: form.escoreGadoIdealObs || '',
        aguaBoaBebedouro: form.aguaBoaBebedouro,
        aguaBoaBebedouroObs: form.aguaBoaBebedouroObs || '',
        pastagemAdequada: form.pastagemAdequada,
        pastagemAdequadaObs: form.pastagemAdequadaObs || '',
        animaisDoentes: form.animaisDoentes,
        animaisDoentesObs: form.animaisDoentesObs || '',
        cercasCochos: form.cercasCochos,
        cercasCochosObs: form.cercasCochosObs || '',
        carrapatosMoscas: form.carrapatosMoscas,
        carrapatosMoscasObs: form.carrapatosMoscasObs || '',
        animaisEntreverados: form.animaisEntreverados,
        animaisEntreveradosObs: form.animaisEntreveradosObs || '',
        animalMorto: form.animalMorto,
        animalMortoObs: form.animalMortoObs || '',
        animaisTratados: form.animaisTratados ? Number(form.animaisTratados) : 0,
        escoreFezes: form.escoreFezes ? Number(form.escoreFezes) : null,
        equipe: form.equipe ? Number(form.equipe) : null,
        ...animaisTratadosData,
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
          <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2">RODEIO GADO</h1>
          <button
            onClick={() => navigate('/caderneta/rodeio/lista')}
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
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          {usuario && (
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <span className="text-xl">👤</span>
              <p className="text-gray-700 font-semibold">{usuario}</p>
            </div>
          )}
          <h2 className="section-title">1. DADOS PRINCIPAIS</h2>
          <DatePicker label="DATA" value={form.data} onChange={set('data')} error={getError('data')} />
          <div className="grid grid-cols-2 gap-3">
            {pastosDisponiveis.length > 0 ? (
              <Select
                label="PASTO"
                value={form.pasto}
                onChange={(e) => set('pasto')(e.target.value)}
                error={getError('pasto')}
                options={pastosDisponiveis.map(p => ({ value: p, label: p }))}
              />
            ) : (
              <Input
                label="PASTO"
                placeholder="Carregando..."
                value={form.pasto}
                onChange={setInput('pasto')}
                error={getError('pasto')}
              />
            )}
            {lotesDisponiveis.length > 0 ? (
              <Select
                label="NÚMERO LOTE"
                value={form.numeroLote}
                onChange={(e) => set('numeroLote')(e.target.value)}
                error={getError('numeroLote')}
                options={lotesDisponiveis.map(l => ({ value: l, label: l }))}
              />
            ) : (
              <Input
                label="NÚMERO LOTE"
                placeholder="Carregando..."
                value={form.numeroLote}
                onChange={setInput('numeroLote')}
                error={getError('numeroLote')}
                inputMode="numeric"
              />
            )}
          </div>
          {carregandoPastosLotes && (
            <div className="text-sm text-gray-500">Carregando pastos e lotes...</div>
          )}
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
            <div key={campo}>
              <Radio
                name={campo}
                label={label}
                options={SN_OPTIONS}
                value={form[campo as keyof SnFields]}
                onChange={set(campo as keyof FormState)}
                error={getError(campo)}
                gridCols={2}
              />
              <Input
                placeholder="Adicionar observação (opcional)"
                value={(form as any)[`${campo}Obs`]}
                onChange={(e) => setForm((prev) => ({ ...prev, [`${campo}Obs`]: e.target.value }))}
                className="mt-2"
              />
            </div>
          ))}
        </div>

        {/* Seção 4: Tratamento e Avaliação */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">4. TRATAMENTO E AVALIAÇÃO</h2>
          <Radio
            name="escoreFezes"
            label="ESCORE DE FEZES (1 a 5)"
            options={ESCALA_5}
            value={form.escoreFezes}
            onChange={set('escoreFezes')}
            error={getError('escoreFezes')}
            gridCols={5}
          />
          <Radio
            name="equipe"
            label="EQUIPE (1 a 5)"
            options={ESCALA_EQUIPE}
            value={form.equipe}
            onChange={set('equipe')}
            error={getError('equipe')}
            gridCols={5}
          />
        </div>

        {/* Seção 5: Procedimentos */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
          <h2 className="section-title">5. PROCEDIMENTOS REALIZADOS</h2>
          <Input
            label="ANIMAIS TRATADOS"
            placeholder="0"
            value={form.animaisTratados}
            onChange={setInput('animaisTratados')}
            inputMode="numeric"
            type="number"
            min="0"
            max="20"
          />
          {form.animaisTratados && Number(form.animaisTratados) > 0 && (
            <p className="text-base text-gray-600">
              Registre o ID e os tratamentos para cada animal. Os quadrados vermelhos significam que faltam dados. Quando o quadrado ficar verde, significa que dados suficientes foram preenchidos.
            </p>
          )}
          
          {/* Cards de animais tratados */}
          {form.animaisTratadosDetalhes.map((animal, index) => (
            <div
              key={index}
              className={`rounded-xl p-4 border-2 ${
                isAnimalCompleto(index)
                  ? 'bg-green-100 border-green-300'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-lg font-bold text-gray-900">
                  ANIMAL {index + 1}
                </h3>
              </div>
              
              <Input
                label="Identificação"
                placeholder="Ex: Vaca 1, B123, Touro 1..."
                value={animal.id}
                onChange={(e) => updateAnimalId(index, e.target.value)}
                className="mb-3"
              />
              
              <p className="text-sm font-bold text-gray-900 mb-2">Tratamentos:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PROCEDIMENTOS_OPCOES.map((proc) => (
                  <Checkbox
                    key={proc}
                    label={proc}
                    checked={animal.tratamentos.includes(proc)}
                    onChange={() => toggleAnimalTratamento(index, proc)}
                  />
                ))}
              </div>
              
              {animal.tratamentos.includes('Outros') && (
                <Input
                  label="Descreva outros tratamentos"
                  placeholder="Ex: Aplicação de vitaminas, limpeza de feridas..."
                  value={animal.tratamentos.find(t => t.startsWith('Outros:'))?.replace('Outros: ', '') || ''}
                  onChange={(e) => {
                    setForm((prev) => {
                      const detalhes = [...prev.animaisTratadosDetalhes]
                      const outrosTratamentos = detalhes[index].tratamentos.filter(t => !t.startsWith('Outros:'))
                      if (e.target.value) {
                        outrosTratamentos.push(`Outros: ${e.target.value}`)
                      }
                      detalhes[index] = { ...detalhes[index], tratamentos: outrosTratamentos }
                      return { ...prev, animaisTratadosDetalhes: detalhes }
                    })
                  }}
                  className="mt-2"
                />
              )}
            </div>
          ))}
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
        registro={registroSalvo}
        caderneta="rodeio"
      />
    </div>
  )
}

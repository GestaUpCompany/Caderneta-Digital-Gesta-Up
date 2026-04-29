import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, Radio, ValidationMessage } from '../../components/ui'
import SearchableModal from '../../components/ui/SearchableModal'
import SuccessModal from '../../components/SuccessModal'
import PdfModal from '../../components/PdfModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { getCachedCadastroData } from '../../services/cadastroCache'
import LoteDetalhesCard from '../../components/LoteDetalhesCard'

const BASE = import.meta.env.BASE_URL

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

const CATEGORIAS_ANIMAIS: { campo: string; label: string }[] = [
  { campo: 'vaca', label: 'VACAS' },
  { campo: 'touro', label: 'TOUROS' },
  { campo: 'boiGordo', label: 'BOIS GORDOS' },
  { campo: 'boiMagro', label: 'BOIS MAGROS' },
  { campo: 'garrote', label: 'GARROTES' },
  { campo: 'bezerro', label: 'BEZERROS(AS)' },
  { campo: 'novilha', label: 'NOVILHAS' },
  { campo: 'tropa', label: 'TROPAS' },
  { campo: 'outros', label: 'OUTROS' },
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

interface FormState extends SnFields {
  data: string
  pasto: string
  numeroLote: string
  vaca: string
  touro: string
  boiGordo: string
  boiMagro: string
  garrote: string
  bezerro: string
  novilha: string
  tropa: string
  outros: string
  escoreFezes: string
  equipe: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  pasto: '',
  numeroLote: '',
  vaca: '', touro: '', boiGordo: '', boiMagro: '', garrote: '', bezerro: '', novilha: '', tropa: '', outros: '',
  escoreGadoIdeal: '', escoreGadoIdealObs: '',
  aguaBoaBebedouro: '', aguaBoaBebedouroObs: '',
  pastagemAdequada: '', pastagemAdequadaObs: '',
  animaisDoentes: '', animaisDoentesObs: '',
  cercasCochos: '', cercasCochosObs: '',
  carrapatosMoscas: '', carrapatosMoscasObs: '',
  animaisEntreverados: '', animaisEntreveradosObs: '',
  animalMorto: '', animalMortoObs: '',
  escoreFezes: '',
  equipe: '',
})

const SN_OPTIONS = [
  { value: 'S', label: 'SIM', icon: '✅' },
  { value: 'N', label: 'NÃO', icon: '❌' },
]

export default function RodeioPage() {
  const navigate = useNavigate()
  const { usuario, fazenda, cadastroSheetUrl } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pastosDisponiveis, setPastosDisponiveis] = useState<string[]>([])
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [detalhesLote, setDetalhesLote] = useState<any>(null)

  // Carregar pastos e lotes do cache global
  useEffect(() => {
    const cache = getCachedCadastroData()
    if (cache) {
      setPastosDisponiveis(cache.pastos || [])
      setLotesDisponiveis(cache.lotes || [])
    }
  }, [])

  // Buscar detalhes do lote quando selecionado
  useEffect(() => {
    async function carregarDetalhesLote() {
      if (!form.numeroLote || !cadastroSheetUrl) {
        setDetalhesLote(null)
        return
      }

      try {
        const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'}/api/insumos/lote-detalhes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ insumosSheetUrl: cadastroSheetUrl, lote: form.numeroLote }),
        })
        const data = await res.json()
        if (data.success) {
          setDetalhesLote(data.detalhes)
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do lote:', error)
      }
    }

    carregarDetalhesLote()
  }, [form.numeroLote, cadastroSheetUrl])

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const total = ['vaca', 'touro', 'boiGordo', 'boiMagro', 'garrote', 'bezerro', 'novilha', 'tropa', 'outros'].reduce(
    (acc, c) => acc + (Number(form[c as keyof FormState]) || 0), 0
  )

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const result = await salvarRegistro('rodeio', {
      data: form.data,
      pasto: form.pasto,
      numeroLote: form.numeroLote,
      vaca: form.vaca ? Number(form.vaca) : 0,
      touro: form.touro ? Number(form.touro) : 0,
      boiGordo: form.boiGordo ? Number(form.boiGordo) : 0,
      boiMagro: form.boiMagro ? Number(form.boiMagro) : 0,
      garrote: form.garrote ? Number(form.garrote) : 0,
      bezerro: form.bezerro ? Number(form.bezerro) : 0,
      novilha: form.novilha ? Number(form.novilha) : 0,
      tropa: form.tropa ? Number(form.tropa) : 0,
      outros: form.outros ? Number(form.outros) : 0,
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
      escoreFezes: form.escoreFezes ? Number(form.escoreFezes) : null,
      equipe: form.equipe ? Number(form.equipe) : null,
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
        boiGordo: form.boiGordo ? Number(form.boiGordo) : 0,
        boiMagro: form.boiMagro ? Number(form.boiMagro) : 0,
        garrote: form.garrote ? Number(form.garrote) : 0,
        bezerro: form.bezerro ? Number(form.bezerro) : 0,
        novilha: form.novilha ? Number(form.novilha) : 0,
        tropa: form.tropa ? Number(form.tropa) : 0,
        outros: form.outros ? Number(form.outros) : 0,
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
        escoreFezes: form.escoreFezes ? Number(form.escoreFezes) : null,
        equipe: form.equipe ? Number(form.equipe) : null,
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
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          {usuario && (
            <div className="flex items-center gap-2 pb-4 border-b border-gray-100">
              <span className="text-xl">👤</span>
              <p className="text-gray-700 font-semibold">{usuario}</p>
            </div>
          )}
          <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS PRINCIPAIS</h2>
          <DatePicker label="DATA" value={form.data} onChange={set('data')} error={getError('data')} />
          <div className="grid grid-cols-2 gap-3">
            {pastosDisponiveis.length > 0 ? (
              <SearchableModal
                label="PASTO"
                value={form.pasto}
                onChange={set('pasto')}
                error={getError('pasto')}
                options={pastosDisponiveis}
                placeholder="Buscar pasto..."
              />
            ) : (
              <Input
                label="PASTO"
                placeholder="Carregando..."
                value={form.pasto}
                onChange={setInput('pasto')}
                error={getError('pasto')}
                disabled
              />
            )}
            {lotesDisponiveis.length > 0 ? (
              <SearchableModal
                label="NÚMERO LOTE"
                value={form.numeroLote}
                onChange={set('numeroLote')}
                error={getError('numeroLote')}
                options={lotesDisponiveis}
                placeholder="Buscar lote..."
              />
            ) : (
              <Input
                label="NÚMERO LOTE"
                placeholder="Carregando..."
                value={form.numeroLote}
                onChange={setInput('numeroLote')}
                error={getError('numeroLote')}
                inputMode="numeric"
                disabled
              />
            )}
          </div>
          {detalhesLote && (
            <LoteDetalhesCard detalhes={detalhesLote} processarCategorias={processarCategorias} />
          )}
        </div>

        {/* Seção 2: Quantidade por Categoria */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. QUANTIDADE DE ANIMAIS</h2>
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
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. AVALIAÇÃO GERAL</h2>
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
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. TRATAMENTO E AVALIAÇÃO</h2>
          <button
            onClick={() => setShowPdfModal(true)}
            className="w-full bg-yellow-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors"
          >
            <span className="text-xl">📄</span>
            <span>VER POP ESCORE DE FEZES</span>
          </button>
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

        {/* Seção 5: Procedimentos - OCULTO (PODERÁ SER REUTILIZADO NA ENFERMARIA) */}
        {/*<div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200 flex flex-col gap-4">
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
          
          {/* Cards de animais tratados *\/}
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
        </div>*/}

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

      <PdfModal
        isOpen={showPdfModal}
        onClose={() => setShowPdfModal(false)}
        images={[
          `${BASE}docs/fezes/POP_Fezes_01.jpg`
        ]}
      />
    </div>
  )
}

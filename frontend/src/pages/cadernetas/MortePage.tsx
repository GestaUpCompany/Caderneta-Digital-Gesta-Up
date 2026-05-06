import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, ValidationMessage, SearchableModal, Radio } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { getCachedCadastroData } from '../../services/cadastroCache'
import { getLoteByNome } from '../../services/supabaseService'
import { scrollToFirstError } from '../../utils/scrollToError'
import LoteDetalhesCard from '../../components/LoteDetalhesCard'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../../utils/eventBus'
import { supabase } from '../../services/supabaseClient'

const SEXO = [
  { value: 'Macho', label: 'MACHO', icon: '♂️' },
  { value: 'Fêmea', label: 'FÊMEA', icon: '♀️' },
]

const RACAS = [
  { value: 'Nelore', label: 'NELORE' },
  { value: 'Angus', label: 'ANGUS' },
  { value: 'Leiteiro', label: 'LEITEIRO' },
  { value: 'Anelorado', label: 'ANELORADO' },
  { value: 'SRD', label: 'SRD' },
  { value: 'Outros', label: 'OUTROS' },
]

const IDADES = [
  { value: '0 a 4 meses', label: '0 A 4 MESES' },
  { value: '5 a 12 meses', label: '5 A 12 MESES' },
  { value: '13 a 24 meses', label: '13 A 24 MESES' },
  { value: '25 a 36 meses', label: '25 A 36 MESES' },
  { value: 'Acima de 36 meses', label: 'ACIMA DE 36 MESES' },
]

const SN_OPTIONS = [
  { value: 'S', label: 'SIM', icon: '✅' },
  { value: 'N', label: 'NÃO', icon: '❌' },
]

const DIAGNOSTICOS = [
  { campo: 'secrecaoOrificios', label: 'SECREÇÃO NOS ORIFÍCIOS?' },
  { campo: 'sintomasPneumonia', label: 'SINTOMAS PNEUMONIA?' },
  { campo: 'inchaco', label: 'INCHAÇO?' },
  { campo: 'incoordenacaoTremores', label: 'INCOORDENAÇÃO E TREMORES MUSCULARES?' },
  { campo: 'apatiaFraqueza', label: 'APATIA OU FRAQUEZA?' },
  { campo: 'presencaSangue', label: 'PRESENÇA DE SANGUE?' },
  { campo: 'desordensDigestivas', label: 'DESORDENS DIGESTIVAS?' },
]

interface FormState {
  data: string
  pasto: string
  lote: string
  brincoChip: string
  vaca: string
  touro: string
  boiGordo: string
  boiMagro: string
  garrote: string
  bezerro: string
  novilha: string
  tropa: string
  outros: string
  sexo: string
  raca: string
  racaOutros: string
  idade: string
  pesoVivo: string
  causaMorte: string
  causaMorteOutros: string
  secrecaoOrificios: string
  secrecaoOrificiosObs: string
  sintomasPneumonia: string
  sintomasPneumoniaObs: string
  inchaco: string
  inchacoObs: string
  incoordenacaoTremores: string
  incoordenacaoTremoresObs: string
  apatiaFraqueza: string
  apatiaFraquezaObs: string
  presencaSangue: string
  presencaSangueObs: string
  desordensDigestivas: string
  desordensDigestivasObs: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  pasto: '',
  lote: '',
  brincoChip: '',
  vaca: '',
  touro: '',
  boiGordo: '',
  boiMagro: '',
  garrote: '',
  bezerro: '',
  novilha: '',
  tropa: '',
  outros: '',
  sexo: '',
  raca: '',
  racaOutros: '',
  idade: '',
  pesoVivo: '',
  causaMorte: '',
  causaMorteOutros: '',
  secrecaoOrificios: '',
  secrecaoOrificiosObs: '',
  sintomasPneumonia: '',
  sintomasPneumoniaObs: '',
  inchaco: '',
  inchacoObs: '',
  incoordenacaoTremores: '',
  incoordenacaoTremoresObs: '',
  apatiaFraqueza: '',
  apatiaFraquezaObs: '',
  presencaSangue: '',
  presencaSangueObs: '',
  desordensDigestivas: '',
  desordensDigestivasObs: '',
})

export default function MortePage() {
  const navigate = useNavigate()
  const { usuario, fazenda, fazendaId } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(makeInitial)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [pastosDisponiveis, setPastosDisponiveis] = useState<string[]>([])
  const [lotesDisponiveis, setLotesDisponiveis] = useState<string[]>([])
  const [detalhesLote, setDetalhesLote] = useState<any>(null)
  const [causasMorte, setCausasMorte] = useState<{ value: string; label: string }[]>([])

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Carregar pastos e lotes do cache global
  useEffect(() => {
    const cache = getCachedCadastroData()
    if (cache) {
      setPastosDisponiveis(cache.pastos || [])
      setLotesDisponiveis(cache.lotes || [])
    }
  }, [])

  // Escutar atualizações do cache de cadastro
  useEffect(() => {
    const unsubscribe = eventBus.on(CADASTRO_CACHE_UPDATED, (data: any) => {
      console.log('[MortePage] Cache atualizado, recarregando dados')
      if (data) {
        setPastosDisponiveis(data.pastos || [])
        setLotesDisponiveis(data.lotes || [])
      }
    })

    return unsubscribe
  }, [])

  // Buscar detalhes do lote quando selecionado
  useEffect(() => {
    async function carregarDetalhesLote() {
      if (!form.lote || !fazendaId) {
        setDetalhesLote(null)
        return
      }

      try {
        const lote = await getLoteByNome(fazendaId, form.lote)
        if (lote) {
          setDetalhesLote(lote)
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes do lote:', error)
        setDetalhesLote(null)
      }
    }

    carregarDetalhesLote()
  }, [form.lote, fazendaId])

  // Buscar causas de morte do Supabase
  useEffect(() => {
    async function carregarCausasMorte() {
      if (!fazendaId) return

      try {
        const { data, error } = await supabase
          .from('causas_morte')
          .select('nome')
          .eq('fazenda_id', fazendaId)
          .eq('ativo', true)
          .order('nome')

        if (error) {
          console.error('Erro ao buscar causas de morte:', error)
          return
        }

        if (data) {
          const causas = data.map(c => ({
            value: c.nome,
            label: c.nome.toUpperCase()
          }))
          setCausasMorte(causas)
        }
      } catch (error) {
        console.error('Erro ao carregar causas de morte:', error)
      }
    }

    carregarCausasMorte()
  }, [fazendaId])

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const racaFinal = form.raca === 'Outros' ? form.racaOutros : form.raca
    const causaMorteFinal = form.causaMorte === 'Outros' ? form.causaMorteOutros : form.causaMorte

    const result = await salvarRegistro('morte', {
      data: form.data,
      pasto: form.pasto,
      lote: form.lote,
      brincoChip: form.brincoChip,
      vaca: form.vaca ? Number(form.vaca) : 0,
      touro: form.touro ? Number(form.touro) : 0,
      boiGordo: form.boiGordo ? Number(form.boiGordo) : 0,
      boiMagro: form.boiMagro ? Number(form.boiMagro) : 0,
      garrote: form.garrote ? Number(form.garrote) : 0,
      bezerro: form.bezerro ? Number(form.bezerro) : 0,
      novilha: form.novilha ? Number(form.novilha) : 0,
      tropa: form.tropa ? Number(form.tropa) : 0,
      outros: form.outros ? Number(form.outros) : 0,
      sexo: form.sexo,
      raca: racaFinal,
      idade: form.idade,
      pesoVivo: form.pesoVivo ? Number(form.pesoVivo) : null,
      causaMorte: causaMorteFinal,
      secrecaoOrificios: form.secrecaoOrificios,
      secrecaoOrificiosObs: form.secrecaoOrificiosObs,
      sintomasPneumonia: form.sintomasPneumonia,
      sintomasPneumoniaObs: form.sintomasPneumoniaObs,
      inchaco: form.inchaco,
      inchacoObs: form.inchacoObs,
      incoordenacaoTremores: form.incoordenacaoTremores,
      incoordenacaoTremoresObs: form.incoordenacaoTremoresObs,
      apatiaFraqueza: form.apatiaFraqueza,
      apatiaFraquezaObs: form.apatiaFraquezaObs,
      presencaSangue: form.presencaSangue,
      presencaSangueObs: form.presencaSangueObs,
      desordensDigestivas: form.desordensDigestivas,
      desordensDigestivasObs: form.desordensDigestivasObs,
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
          <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2">MORTE</h1>
          <button
            onClick={() => navigate('/caderneta/morte/lista')}
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
          <DatePicker label="DATA" value={form.data} onChange={(val) => setForm((p) => ({ ...p, data: val }))} error={getError('data')} />
          <div className="grid grid-cols-2 gap-3">
            {pastosDisponiveis.length > 0 ? (
              <SearchableModal
                label="PASTO"
                value={form.pasto}
                onChange={(val) => setForm((p) => ({ ...p, pasto: val }))}
                error={getError('pasto')}
                options={pastosDisponiveis}
                placeholder="Buscar pasto..."
                id="pasto"
                name="pasto"
              />
            ) : (
              <Input
                label="PASTO"
                placeholder="Carregando..."
                value={form.pasto}
                onChange={setInput('pasto')}
                error={getError('pasto')}
                disabled
                id="pasto"
              />
            )}
            {lotesDisponiveis.length > 0 ? (
              <SearchableModal
                label="LOTE"
                value={form.lote}
                onChange={(val) => setForm((p) => ({ ...p, lote: val }))}
                error={getError('lote')}
                options={lotesDisponiveis}
                placeholder="Buscar lote..."
                id="lote"
                name="lote"
              />
            ) : (
              <Input
                label="LOTE"
                placeholder="Carregando..."
                value={form.lote}
                onChange={setInput('lote')}
                error={getError('lote')}
                disabled
                id="lote"
              />
            )}
          </div>
          {detalhesLote && (
            <LoteDetalhesCard detalhes={detalhesLote} processarCategorias={() => []} />
          )}
        </div>

        {/* Seção 2: Identificação */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. IDENTIFICAÇÃO</h2>
          <Input
            label="BRINCO / CHIP"
            placeholder="Número do brinco ou chip"
            value={form.brincoChip}
            onChange={setInput('brincoChip')}
            error={getError('brincoChip')}
          />
        </div>

        {/* Seção 3: Quantificação de Animais */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">3. QUANTIFICAÇÃO DE ANIMAIS</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input label="VACA" placeholder="0" value={form.vaca} onChange={setInput('vaca')} inputMode="numeric" type="number" />
            <Input label="TOURO" placeholder="0" value={form.touro} onChange={setInput('touro')} inputMode="numeric" type="number" />
            <Input label="BOI GORDO" placeholder="0" value={form.boiGordo} onChange={setInput('boiGordo')} inputMode="numeric" type="number" />
            <Input label="BOI MAGRO" placeholder="0" value={form.boiMagro} onChange={setInput('boiMagro')} inputMode="numeric" type="number" />
            <Input label="GARROTE" placeholder="0" value={form.garrote} onChange={setInput('garrote')} inputMode="numeric" type="number" />
            <Input label="BEZERRO" placeholder="0" value={form.bezerro} onChange={setInput('bezerro')} inputMode="numeric" type="number" />
            <Input label="NOVILHA" placeholder="0" value={form.novilha} onChange={setInput('novilha')} inputMode="numeric" type="number" />
            <Input label="TROPA" placeholder="0" value={form.tropa} onChange={setInput('tropa')} inputMode="numeric" type="number" />
            <Input label="OUTROS" placeholder="0" value={form.outros} onChange={setInput('outros')} inputMode="numeric" type="number" />
          </div>
        </div>

        {/* Seção 4: Sexo e Raça */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. SEXO E RAÇA</h2>
          <Radio
            name="sexo"
            label="SEXO"
            options={SEXO}
            value={form.sexo}
            onChange={(val) => setForm((p) => ({ ...p, sexo: val }))}
            error={getError('sexo')}
            gridCols={2}
          />
          <Radio
            name="raca"
            label="RAÇA"
            options={RACAS}
            value={form.raca}
            onChange={(val) => setForm((p) => ({ ...p, raca: val }))}
            error={getError('raca')}
            gridCols={2}
          />
          {form.raca === 'Outros' && (
            <Input
              label="QUAL RAÇA?"
              placeholder="Especifique a raça"
              value={form.racaOutros}
              onChange={setInput('racaOutros')}
              error={getError('racaOutros')}
            />
          )}
        </div>

        {/* Seção 5: Idade e Peso */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">5. IDADE E PESO</h2>
          <Radio
            name="idade"
            label="IDADE"
            options={IDADES}
            value={form.idade}
            onChange={(val) => setForm((p) => ({ ...p, idade: val }))}
            error={getError('idade')}
            gridCols={2}
          />
          <Input
            label="PESO VIVO (kg)"
            placeholder="Ex: 450"
            value={form.pesoVivo}
            onChange={setInput('pesoVivo')}
            inputMode="decimal"
            type="number"
            error={getError('pesoVivo')}
          />
        </div>

        {/* Seção 6: Causa da Morte */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">6. CAUSA DA MORTE</h2>
          {causasMorte.length > 0 ? (
            <SearchableModal
              label="CAUSA DA MORTE"
              value={form.causaMorte}
              onChange={(val) => setForm((p) => ({ ...p, causaMorte: val }))}
              error={getError('causaMorte')}
              options={causasMorte.map(c => c.value)}
              placeholder="Buscar causa da morte..."
              id="causaMorte"
              name="causaMorte"
            />
          ) : (
            <Input
              label="CAUSA DA MORTE"
              placeholder="Carregando..."
              value={form.causaMorte}
              onChange={setInput('causaMorte')}
              error={getError('causaMorte')}
              disabled
              id="causaMorte"
            />
          )}
          {form.causaMorte === 'Outros' && (
            <Input
              label="ESPECIFIQUE A CAUSA"
              placeholder="Descreva a causa da morte"
              value={form.causaMorteOutros}
              onChange={setInput('causaMorteOutros')}
              error={getError('causaMorteOutros')}
            />
          )}
        </div>

        {/* Seção 7: Diagnóstico */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">7. DIAGNÓSTICO</h2>
          {DIAGNOSTICOS.map(({ campo, label }) => (
            <div key={campo}>
              <Radio
                name={campo}
                label={label}
                options={SN_OPTIONS}
                value={form[campo as keyof FormState] as string}
                onChange={(val) => setForm((p) => ({ ...p, [campo]: val }))}
                error={getError(campo)}
                gridCols={2}
              />
              <Input
                placeholder="Adicionar observação (opcional)"
                value={(form as any)[`${campo}Obs`]}
                onChange={(e) => setForm((p) => ({ ...p, [`${campo}Obs`]: e.target.value }))}
                className="mt-2"
              />
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
        cadernetaName="Morte"
        registro={registroSalvo}
        caderneta="morte"
      />
    </div>
  )
}

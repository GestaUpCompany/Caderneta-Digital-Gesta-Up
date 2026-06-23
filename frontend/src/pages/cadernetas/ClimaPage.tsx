import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, ValidationMessage } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { RootState } from '../../store/store'
import { supabase } from '../../services/supabaseClient'
import { scrollToFirstError } from '../../utils/scrollToError'
import { useFormValidation } from '../../hooks/useFormValidation'

interface Pluviometro {
  id: string
  nome: string
  localizacao: string
  ativo: boolean | null
}

interface MedicaoPluviometro {
  pluviometroId: string
  pluviometroNome: string
  pluviometroLocalizacao: string
  medicao: string
  temperatura: string
}

interface FormState {
  data: string
  responsavel: string
  temperaturaMediaCalculada: string
  umidadeRelativa: string
  observacao: string
  medicoes: MedicaoPluviometro[]
}

const makeInitial = (usuario?: string): FormState => ({
  data: todayBR(),
  responsavel: usuario || '',
  temperaturaMediaCalculada: '',
  umidadeRelativa: '',
  observacao: '',
  medicoes: [],
})

export default function ClimaPage() {
  const navigate = useNavigate()
  const { usuario, fazendaId } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(() => makeInitial(usuario))
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [pluviometrosDisponiveis, setPluviometrosDisponiveis] = useState<Pluviometro[]>([])

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  // Validation rules
  const validationRules: any = {
    data: { required: true },
    responsavel: { required: true },
  }

  // Add validation for pluviometer measurements
  form.medicoes.forEach((medicao) => {
    validationRules[`medicao_${medicao.pluviometroId}`] = { required: true }
  })

  const { isValid } = useFormValidation(form, validationRules)

  // Buscar pluviômetros do Supabase
  useEffect(() => {
    async function carregarPluviometros() {
      if (!fazendaId) return

      try {
        const { data, error } = await supabase
          .from('pluviometros')
          .select('*')
          .eq('fazenda_id', fazendaId)
          .eq('ativo', true)
          .order('nome')

        if (error) {
          console.error('Erro ao buscar pluviômetros:', error)
          return
        }

        if (data) {
          setPluviometrosDisponiveis(data as Pluviometro[])
        }
      } catch (error) {
        console.error('Erro ao carregar pluviômetros:', error)
      }
    }

    carregarPluviometros()
  }, [fazendaId])

  // Inicializar medições quando pluviômetros são carregados
  useEffect(() => {
    if (pluviometrosDisponiveis.length > 0 && form.medicoes.length === 0) {
      const medicoesIniciais = pluviometrosDisponiveis.map(p => ({
        pluviometroId: p.id,
        pluviometroNome: p.nome,
        pluviometroLocalizacao: p.localizacao,
        medicao: '',
        temperatura: ''
      }))
      setForm(prev => ({ ...prev, medicoes: medicoesIniciais }))
    }
  }, [pluviometrosDisponiveis])

  const handleMedicaoChange = (pluviometroId: string, value: string) => {
    setForm(prev => ({
      ...prev,
      medicoes: prev.medicoes.map(m =>
        m.pluviometroId === pluviometroId ? { ...m, medicao: value } : m
      )
    }))
  }

  const handleTemperaturaChange = (pluviometroId: string, value: string) => {
    setForm(prev => ({
      ...prev,
      medicoes: prev.medicoes.map(m =>
        m.pluviometroId === pluviometroId ? { ...m, temperatura: value } : m
      )
    }))
  }

  // Calcular temperatura média automaticamente a partir das temperaturas dos pluviômetros
  useEffect(() => {
    const temperaturasPreenchidas = form.medicoes
      .map(m => m.temperatura)
      .filter(t => t !== '')
      .map(t => Number(t))
      .filter(t => !isNaN(t))

    if (temperaturasPreenchidas.length > 0) {
      const media = temperaturasPreenchidas.reduce((a, b) => a + b, 0) / temperaturasPreenchidas.length
      setForm(prev => ({ ...prev, temperaturaMediaCalculada: media.toFixed(1) }))
    } else {
      setForm(prev => ({ ...prev, temperaturaMediaCalculada: '' }))
    }
  }, [form.medicoes])

  const handleSalvar = async () => {
    setSalvando(true)
    setErrors([])

    const medicoesParaSalvar = form.medicoes
      .filter(m => m.medicao !== '')
      .map(m => ({
        pluviometro_id: m.pluviometroId,
        pluviometro_nome: m.pluviometroNome,
        pluviometro_localizacao: m.pluviometroLocalizacao,
        medicao: Number(m.medicao),
        temperatura: m.temperatura ? Number(m.temperatura) : null
      }))

    const temperaturasPreenchidas = form.medicoes
      .map(m => m.temperatura)
      .filter(t => t !== '')
      .map(t => Number(t))
      .filter(t => !isNaN(t))

    const temperaturaMedia = temperaturasPreenchidas.length > 0
      ? temperaturasPreenchidas.reduce((a, b) => a + b, 0) / temperaturasPreenchidas.length
      : null

    const result = await salvarRegistro('clima', {
      data: form.data,
      responsavel: form.responsavel,
      temperaturaMedia: temperaturaMedia,
      umidadeRelativa: form.umidadeRelativa ? Number(form.umidadeRelativa) : null,
      observacao: form.observacao,
      medicoes: medicoesParaSalvar,
    })

    setSalvando(false)
    if (!result.success && result.errors) {
      setErrors(result.errors)
      scrollToFirstError(result.errors)
    } else {
      setRegistroSalvo(result.registro)
      setShowSuccessModal(true)
      setForm(makeInitial(usuario))
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
    <>
      <CadernetaLayout title="CLIMA" cadernetaId="clima">
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
          <DatePicker label={<span>DATA <span className="text-red-500">*</span></span>} value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} error={getError('data')} />
          <Input
            label={<span>RESPONSÁVEL <span className="text-red-500">*</span></span>}
            placeholder="Nome do responsável"
            value={form.responsavel}
            onChange={setInput('responsavel')}
            error={getError('responsavel')}
            readOnly
          />
          <Input
            label="UMIDADE RELATIVA DO AR (%)"
            placeholder="Ex: 75"
            value={form.umidadeRelativa}
            onChange={setInput('umidadeRelativa')}
            error={getError('umidadeRelativa')}
            type="number"
            step="0.1"
          />
        </div>

        {/* Seção 2: Pluviômetros */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">2. PLUVIÔMETROS</h2>
          {pluviometrosDisponiveis.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Nenhum pluviômetro cadastrado para esta fazenda.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {form.medicoes.map((medicao) => (
                <div key={medicao.pluviometroId} className="flex flex-col gap-2">
                  <p className="font-semibold text-gray-700">{medicao.pluviometroNome} {medicao.pluviometroLocalizacao && `(${medicao.pluviometroLocalizacao})`}</p>
                  <Input
                    label={<span>Medição de chuva (mm) <span className="text-red-500">*</span></span>}
                    placeholder="Ex: 12.5"
                    value={medicao.medicao}
                    onChange={(e) => handleMedicaoChange(medicao.pluviometroId, e.target.value)}
                    error={getError(`medicao_${medicao.pluviometroId}`)}
                    type="number"
                    step="0.1"
                  />
                  <Input
                    label="TEMPERATURA (°C)"
                    placeholder="Ex: 25.5"
                    value={medicao.temperatura}
                    onChange={(e) => handleTemperaturaChange(medicao.pluviometroId, e.target.value)}
                    type="number"
                    step="0.1"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Seção 3: Temperatura Média */}
        {form.temperaturaMediaCalculada !== '' && (
          <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
            <h2 className="text-lg font-black text-gray-900 tracking-tight">3. TEMPERATURA MÉDIA</h2>
            <Input
              label="TEMPERATURA MÉDIA (°C)"
              value={form.temperaturaMediaCalculada}
              readOnly
              disabled
            />
          </div>
        )}

        {/* Seção 4: Observações */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
          <h2 className="text-lg font-black text-gray-900 tracking-tight">4. OBSERVAÇÕES</h2>
          <Input
            label=""
            placeholder="Adicione observações (opcional)"
            value={form.observacao}
            onChange={setInput('observacao')}
            error={getError('observacao')}
          />
        </div>

        <div className="flex flex-col gap-3">
          <Button onClick={handleSalvar} variant="success" loading={salvando} icon="💾" disabled={!isValid}>
            SALVAR REGISTRO
          </Button>
          <Button onClick={() => setForm(makeInitial(usuario))} variant="secondary" icon="🧹">
            LIMPAR
          </Button>
        </div>
        {!isValid && (
          <p className="text-base text-gray-600 text-center">
            <span className="text-red-500">*</span> Preencha todos os campos obrigatórios para salvar
          </p>
        )}
      </CadernetaLayout>

      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onNewRecord={handleNewRecord}
        onExit={handleExit}
        cadernetaName="Clima"
        registro={registroSalvo}
        caderneta="clima"
      />
    </>
  )
}

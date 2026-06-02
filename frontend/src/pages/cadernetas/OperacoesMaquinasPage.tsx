import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button, Input, DatePicker, ValidationMessage, Radio, SearchableModal } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { scrollToFirstError } from '../../utils/scrollToError'
import { getMaquinasVeiculos, getMaquinaVeiculoByNome, getImplementos } from '../../services/supabaseService'
import { RootState } from '../../store/store'

const TIPO_OPERACAO_OPTIONS = [
  { value: 'nutricao', label: 'Nutrição' },
  { value: 'pulverizacao', label: 'Pulverização' },
  { value: 'gradagem', label: 'Gradagem' },
  { value: 'fertilizacao_correcao', label: 'Fert./Corret.' },
  { value: 'limpeza', label: 'Limpeza' },
  { value: 'niveladora', label: 'Niveladora' },
  { value: 'rodagem', label: 'Rodagem' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'plantio', label: 'Plantio' },
  { value: 'esterco', label: 'Esterco' },
  { value: 'colheita', label: 'Colheita' },
  { value: 'compactacao', label: 'Compactação' },
  { value: 'rocada', label: 'Roçada' },
  { value: 'servicos_gerais', label: 'Serviços Gerais' },
  { value: 'terraplanagem', label: 'Terraplanagem' },
]

const SN_OPTIONS = [
  { value: 'S', label: 'SIM', icon: '✅' },
  { value: 'N', label: 'NÃO', icon: '❌' },
]

interface FormState {
  data: string
  maquinaVeiculo: string
  maquinaVeiculoId: string
  implementoUtilizado: string
  horaInicial: string
  horaFinal: string
  totalHorasTrabalhadas: string
  odometroHorimetroInicial: string
  odometroHorimetroFinal: string
  totalOdometroHorimetro: string
  tipoOperacao: string
  insumoAplicado: string
  quantidadeTotalAplicada: string
  areaTrabalhada: string
  doseAplicada: string
  metaDiariaBatida: string
  metaDiariaBatidaObs: string
  algumImprevisto: string
  algumImprevistoObs: string
  observacao: string
}

const makeInitial = (): FormState => ({
  data: todayBR(),
  maquinaVeiculo: '',
  maquinaVeiculoId: '',
  implementoUtilizado: '',
  horaInicial: '',
  horaFinal: '',
  totalHorasTrabalhadas: '',
  odometroHorimetroInicial: '',
  odometroHorimetroFinal: '',
  totalOdometroHorimetro: '',
  tipoOperacao: '',
  insumoAplicado: '',
  quantidadeTotalAplicada: '',
  areaTrabalhada: '',
  doseAplicada: '',
  metaDiariaBatida: '',
  metaDiariaBatidaObs: '',
  algumImprevisto: '',
  algumImprevistoObs: '',
  observacao: '',
})

export default function OperacoesMaquinasPage() {
  const navigate = useNavigate()
  const { fazendaId } = useSelector((state: RootState) => state.config)
  const [form, setForm] = useState<FormState>(() => makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)
  const [maquinasVeiculosDisponiveis, setMaquinasVeiculosDisponiveis] = useState<any[]>([])
  const [implementosDisponiveis, setImplementosDisponiveis] = useState<string[]>([])

  // Calcular total odometro automaticamente
  useEffect(() => {
    if (form.odometroHorimetroInicial && form.odometroHorimetroFinal) {
      const inicial = parseFloat(form.odometroHorimetroInicial)
      const final = parseFloat(form.odometroHorimetroFinal)
      if (!isNaN(inicial) && !isNaN(final) && final >= inicial) {
        setForm((prev) => ({ ...prev, totalOdometroHorimetro: String(final - inicial) }))
      }
    }
  }, [form.odometroHorimetroInicial, form.odometroHorimetroFinal])

  // Calcular total de horas trabalhadas automaticamente
  useEffect(() => {
    if (form.horaInicial && form.horaFinal) {
      const [horaInicial, minInicial] = form.horaInicial.split(':').map(Number)
      const [horaFinal, minFinal] = form.horaFinal.split(':').map(Number)
      
      if (!isNaN(horaInicial) && !isNaN(minInicial) && !isNaN(horaFinal) && !isNaN(minFinal)) {
        const dataInicial = new Date(2000, 0, 1, horaInicial, minInicial)
        const dataFinal = new Date(2000, 0, 1, horaFinal, minFinal)
        
        let diffMs = dataFinal.getTime() - dataInicial.getTime()
        
        // Se a diferença for negativa, assume que passou para o dia seguinte
        if (diffMs < 0) {
          diffMs += 24 * 60 * 60 * 1000 // Adiciona 24 horas
        }
        
        const diffMinutos = Math.floor(diffMs / (1000 * 60))
        const horas = Math.floor(diffMinutos / 60)
        const minutos = diffMinutos % 60
        
        setForm((prev) => ({ ...prev, totalHorasTrabalhadas: `${horas}h ${minutos}min` }))
      }
    } else {
      setForm((prev) => ({ ...prev, totalHorasTrabalhadas: '' }))
    }
  }, [form.horaInicial, form.horaFinal])

  // Calcular dose aplicada automaticamente
  useEffect(() => {
    if (form.quantidadeTotalAplicada && form.areaTrabalhada) {
      const quantidade = parseFloat(form.quantidadeTotalAplicada)
      const area = parseFloat(form.areaTrabalhada)
      
      if (!isNaN(quantidade) && !isNaN(area) && area > 0) {
        const dose = quantidade / area
        setForm((prev) => ({ ...prev, doseAplicada: dose.toFixed(2) }))
      }
    } else {
      setForm((prev) => ({ ...prev, doseAplicada: '' }))
    }
  }, [form.quantidadeTotalAplicada, form.areaTrabalhada])

  // Carregar máquinas/veículos
  useEffect(() => {
    async function carregarMaquinasVeiculos() {
      if (!fazendaId) return
      try {
        const maquinas = await getMaquinasVeiculos(fazendaId)
        setMaquinasVeiculosDisponiveis(maquinas || [])
      } catch (error) {
        console.error('Erro ao carregar máquinas/veículos:', error)
      }
    }
    carregarMaquinasVeiculos()
  }, [fazendaId])

  // Carregar implementos
  useEffect(() => {
    async function carregarImplementos() {
      if (!fazendaId) return
      try {
        const implementos = await getImplementos(fazendaId)
        setImplementosDisponiveis(implementos?.map((i: any) => i.nome) || [])
      } catch (error) {
        console.error('Erro ao carregar implementos:', error)
      }
    }
    carregarImplementos()
  }, [fazendaId])

  // Buscar detalhes da máquina/veículo quando selecionada
  useEffect(() => {
    async function carregarDetalhesMaquinaVeiculo() {
      if (!form.maquinaVeiculo || !fazendaId) {
        setForm(prev => ({ ...prev, maquinaVeiculoId: '' }))
        return
      }
      try {
        const maquina = await getMaquinaVeiculoByNome(fazendaId, form.maquinaVeiculo)
        if (maquina) {
          setForm(prev => ({ ...prev, maquinaVeiculoId: maquina.id }))
        }
      } catch (error) {
        console.error('Erro ao carregar detalhes da máquina/veículo:', error)
        setForm(prev => ({ ...prev, maquinaVeiculoId: '' }))
      }
    }
    carregarDetalhesMaquinaVeiculo()
  }, [form.maquinaVeiculo, fazendaId])

  const setInput = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const set = (field: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [field]: val }))

  const getError = (field: string) => errors.find((e) => e.field === field)?.message

  const handleSalvar = async () => {
    if (salvando) return // Prevenir clique duplo
    
    setSalvando(true)
    setErrors([])

    const result = await salvarRegistro('operacoes-maquinas', {
      data: form.data,
      maquinaVeiculo: form.maquinaVeiculo,
      maquinaVeiculoId: form.maquinaVeiculoId,
      implementoUtilizado: form.implementoUtilizado,
      horaInicial: form.horaInicial,
      horaFinal: form.horaFinal,
      odometroHorimetroInicial: form.odometroHorimetroInicial,
      odometroHorimetroFinal: form.odometroHorimetroFinal,
      totalOdometroHorimetro: form.totalOdometroHorimetro,
      tipoOperacao: form.tipoOperacao,
      insumoAplicado: form.insumoAplicado,
      quantidadeTotalAplicada: form.quantidadeTotalAplicada,
      areaTrabalhada: form.areaTrabalhada,
      doseAplicada: form.doseAplicada,
      metaDiariaBatida: form.metaDiariaBatida,
      metaDiariaBatidaObs: form.metaDiariaBatidaObs,
      algumImprevisto: form.algumImprevisto,
      algumImprevistoObs: form.algumImprevistoObs,
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
    <CadernetaLayout title="OP. MÁQUINAS" cadernetaId="operacoes-maquinas">
      {errors.length > 0 && <ValidationMessage errors={errors} />}

      {/* Seção 1: Dados da Operação */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS DA OPERAÇÃO</h2>
        <DatePicker label="DATA" value={form.data} onChange={(val) => setForm((prev) => ({ ...prev, data: val }))} error={getError('data')} />
        {maquinasVeiculosDisponiveis.length > 0 ? (
          <SearchableModal
            label="MÁQUINA/VEÍCULO?"
            value={form.maquinaVeiculo}
            onChange={set('maquinaVeiculo')}
            error={getError('maquinaVeiculo')}
            options={maquinasVeiculosDisponiveis.map(m => m.nome)}
            placeholder="Buscar máquina/veículo..."
            id="maquinaVeiculo"
            name="maquinaVeiculo"
          />
        ) : (
          <Input label="MÁQUINA/VEÍCULO?" placeholder="Máquina/Veículo" value={form.maquinaVeiculo} onChange={setInput('maquinaVeiculo')} error={getError('maquinaVeiculo')} />
        )}
        {implementosDisponiveis.length > 0 ? (
          <SearchableModal
            label="IMPLEMENTO UTILIZADO?"
            value={form.implementoUtilizado}
            onChange={set('implementoUtilizado')}
            error={getError('implementoUtilizado')}
            options={implementosDisponiveis}
            placeholder="Buscar implemento..."
            id="implementoUtilizado"
            name="implementoUtilizado"
          />
        ) : (
          <Input label="IMPLEMENTO UTILIZADO?" placeholder="Implemento utilizado" value={form.implementoUtilizado} onChange={setInput('implementoUtilizado')} error={getError('implementoUtilizado')} />
        )}
        <Input label="HORA INICIAL?" type="time" value={form.horaInicial} onChange={setInput('horaInicial')} error={getError('horaInicial')} />
        <Input label="HORA FINAL?" type="time" value={form.horaFinal} onChange={setInput('horaFinal')} error={getError('horaFinal')} />
        <Input 
          label="TOTAL HORAS TRABALHADAS" 
          placeholder="" 
          value={form.totalHorasTrabalhadas} 
          readOnly 
          helper="Calculado automaticamente a partir das horas inicial e final"
        />
        <Input label="ODÔMETRO/HORÍMETRO INICIAL" type="number" placeholder="Odômetro/horímetro inicial" value={form.odometroHorimetroInicial} onChange={setInput('odometroHorimetroInicial')} error={getError('odometroHorimetroInicial')} />
        <Input label="ODÔMETRO/HORÍMETRO FINAL" type="number" placeholder="Odômetro/horímetro final" value={form.odometroHorimetroFinal} onChange={setInput('odometroHorimetroFinal')} error={getError('odometroHorimetroFinal')} />
        <Input 
          label="TOTAL ODÔMETRO/HORÍMETRO" 
          type="number" 
          placeholder="" 
          value={form.totalOdometroHorimetro} 
          readOnly 
          helper="Calculado automaticamente a partir dos odômetros/horímetros inicial e final"
        />
      </div>

      {/* Seção 2: Tipo de Operação */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">2. TIPO DE OPERAÇÃO</h2>
        <Radio
          name="tipoOperacao"
          label="Tipo de Operação?"
          options={TIPO_OPERACAO_OPTIONS}
          value={form.tipoOperacao}
          onChange={set('tipoOperacao')}
          error={getError('tipoOperacao')}
          gridCols={2}
        />
      </div>

      {/* Seção 3: Detalhes da Aplicação */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">3. DETALHES DA APLICAÇÃO</h2>
        <Input label="INSUMO APLICADO?" placeholder="Insumo aplicado" value={form.insumoAplicado} onChange={setInput('insumoAplicado')} error={getError('insumoAplicado')} />
        <Input label="QUANTIDADE TOTAL APLICADA?" type="number" placeholder="Quantidade total aplicada" value={form.quantidadeTotalAplicada} onChange={setInput('quantidadeTotalAplicada')} error={getError('quantidadeTotalAplicada')} />
        <Input label="ÁREA TRABALHADA?" placeholder="Área trabalhada" value={form.areaTrabalhada} onChange={setInput('areaTrabalhada')} error={getError('areaTrabalhada')} />
        <Input label="DOSE APLICADA/ha?" placeholder="Dose aplicada" value={form.doseAplicada} readOnly helper="Calculado automaticamente: quantidade total / área trabalhada" />
      </div>

      {/* Seção 4: Avaliação */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">4. AVALIAÇÃO</h2>
        <div>
            <Radio
              name="metaDiariaBatida"
              label="Meta diária batida?"
              options={SN_OPTIONS}
              value={form.metaDiariaBatida}
              onChange={set('metaDiariaBatida')}
              error={getError('metaDiariaBatida')}
              gridCols={2}
            />
            {form.metaDiariaBatida === 'N' && (
              <Input
                placeholder="Adicionar observação (opcional)"
                value={form.metaDiariaBatidaObs}
                onChange={setInput('metaDiariaBatidaObs')}
                className="mt-2"
              />
            )}
        </div>
        <div>
          <Radio
            name="algumImprevisto"
            label="Algum imprevisto?"
            options={SN_OPTIONS}
            value={form.algumImprevisto}
            onChange={set('algumImprevisto')}
            error={getError('algumImprevisto')}
            gridCols={2}
          />
          {form.algumImprevisto === 'N' && (
            <Input
              placeholder="Adicionar observação (opcional)"
              value={form.algumImprevistoObs}
              onChange={setInput('algumImprevistoObs')}
              className="mt-2"
            />
          )}
        </div>
      </div>

      {/* Seção 5: Observações */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
        <h2 className="text-lg font-black text-gray-900 tracking-tight">5. OBSERVAÇÕES</h2>
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
        cadernetaName="Operações de Máquinas"
        registro={registroSalvo}
        caderneta="operacoes-maquinas"
      />
    </CadernetaLayout>
  )
}

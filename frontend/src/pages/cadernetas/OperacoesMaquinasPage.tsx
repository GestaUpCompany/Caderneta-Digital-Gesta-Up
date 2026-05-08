import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, DatePicker, ValidationMessage, Radio } from '../../components/ui'
import SuccessModal from '../../components/SuccessModal'
import CadernetaLayout from '../../components/CadernetaLayout'
import { salvarRegistro } from '../../services/api'
import { todayBR } from '../../utils/formatDate'
import { scrollToFirstError } from '../../utils/scrollToError'

const TIPO_OPERACAO_OPTIONS = [
  { value: 'nutricao', label: 'Nutrição' },
  { value: 'pulverizacao', label: 'Pulverização' },
  { value: 'gradagem', label: 'Gradagem' },
  { value: 'fertilizacao_correcao', label: 'Fertilização/Correção' },
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
  veiculoTrator: string
  implementoUtilizado: string
  horaInicial: string
  horaFinal: string
  odometroInicial: string
  odometroFinal: string
  totalOdometro: string
  tipoOperacao: string
  produtoAplicado: string
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
  veiculoTrator: '',
  implementoUtilizado: '',
  horaInicial: '',
  horaFinal: '',
  odometroInicial: '',
  odometroFinal: '',
  totalOdometro: '',
  tipoOperacao: '',
  produtoAplicado: '',
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
  const [form, setForm] = useState<FormState>(() => makeInitial())
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [salvando, setSalvando] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registroSalvo, setRegistroSalvo] = useState<any>(null)

  // Calcular total odometro automaticamente
  useEffect(() => {
    if (form.odometroInicial && form.odometroFinal) {
      const inicial = parseFloat(form.odometroInicial)
      const final = parseFloat(form.odometroFinal)
      if (!isNaN(inicial) && !isNaN(final) && final >= inicial) {
        setForm((prev) => ({ ...prev, totalOdometro: String(final - inicial) }))
      }
    }
  }, [form.odometroInicial, form.odometroFinal])

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
      veiculoTrator: form.veiculoTrator,
      implementoUtilizado: form.implementoUtilizado,
      horaInicial: form.horaInicial,
      horaFinal: form.horaFinal,
      odometroInicial: form.odometroInicial,
      odometroFinal: form.odometroFinal,
      totalOdometro: form.totalOdometro,
      tipoOperacao: form.tipoOperacao,
      produtoAplicado: form.produtoAplicado,
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
        <Input label="VEÍCULO TRATOR?" placeholder="Veículo/Trator" value={form.veiculoTrator} onChange={setInput('veiculoTrator')} error={getError('veiculoTrator')} />
        <Input label="IMPLEMENTO UTILIZADO?" placeholder="Implemento utilizado" value={form.implementoUtilizado} onChange={setInput('implementoUtilizado')} error={getError('implementoUtilizado')} />
        <Input label="HORA INICIAL?" type="time" value={form.horaInicial} onChange={setInput('horaInicial')} error={getError('horaInicial')} />
        <Input label="HORA FINAL?" type="time" value={form.horaFinal} onChange={setInput('horaFinal')} error={getError('horaFinal')} />
        <Input label="ODÔMETRO INICIAL (km)" type="number" placeholder="Odômetro inicial" value={form.odometroInicial} onChange={setInput('odometroInicial')} error={getError('odometroInicial')} />
        <Input label="ODÔMETRO FINAL (km)" type="number" placeholder="Odômetro final" value={form.odometroFinal} onChange={setInput('odometroFinal')} error={getError('odometroFinal')} />
        <Input 
          label="TOTAL ODÔMETRO (km)" 
          type="number" 
          placeholder="" 
          value={form.totalOdometro} 
          readOnly 
          helper="Calculado automaticamente a partir dos odômetros inicial e final"
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
        <Input label="PRODUTO APLICADO?" placeholder="Produto aplicado" value={form.produtoAplicado} onChange={setInput('produtoAplicado')} error={getError('produtoAplicado')} />
        <Input label="QUANTIDADE TOTAL APLICADA?" type="number" placeholder="Quantidade total aplicada" value={form.quantidadeTotalAplicada} onChange={setInput('quantidadeTotalAplicada')} error={getError('quantidadeTotalAplicada')} />
        <Input label="ÁREA TRABALHADA?" placeholder="Área trabalhada" value={form.areaTrabalhada} onChange={setInput('areaTrabalhada')} error={getError('areaTrabalhada')} />
        <Input label="DOSE APLICADA?" placeholder="Dose aplicada" value={form.doseAplicada} onChange={setInput('doseAplicada')} error={getError('doseAplicada')} />
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
          <Input
            placeholder="Adicionar observação (opcional)"
            value={form.metaDiariaBatidaObs}
            onChange={setInput('metaDiariaBatidaObs')}
            className="mt-2"
          />
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
          <Input
            placeholder="Adicionar observação (opcional)"
            value={form.algumImprevistoObs}
            onChange={setInput('algumImprevistoObs')}
            className="mt-2"
          />
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

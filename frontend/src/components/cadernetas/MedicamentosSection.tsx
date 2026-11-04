import { useState } from 'react'
import { SearchableModal } from '../ui'
import ChoiceGrid from './ChoiceGrid'
import StepperInput from './StepperInput'
import InfoStrip from './InfoStrip'
import { Plus } from 'lucide-react'
import { avisoFrascoNoFim, dosesDesdeUltimaBaixa, escolherMedicamentoPorNome, frascosValidos, parseDose, type HistoricoDoses, type UnidadeDose } from '../../utils/doseMedicamento'
import { formatarQuantidade, saldoApos, unidadeConcordada } from '../../utils/farmaciaEstoque'

export interface MedicamentoItem {
  medicamentoId: string
  tipo: string
  nomeComercial: string
  principioAtivo: string
  doseRecomendada: string
  doseAplicada: string
  // Enfermaria: frascos inteiros usados; é o que baixa o estoque da farmácia (a dose acima é só informativa)
  frascosUsados?: number
}

interface MedicamentosSectionProps {
  items: MedicamentoItem[]
  onChange: (items: MedicamentoItem[]) => void
  medicamentosDisponiveis: any[]
  // Enfermaria: pergunta quantos frascos foram usados quando o medicamento tem controle de estoque
  baixaEstoque?: boolean
  // Enfermaria: doses desde a última baixa, para avisar que o frasco pode ter acabado
  historicoDoses?: HistoricoDoses | null
}

const normalizar = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

const formatarDose = (num: string, un: UnidadeDose): string => {
  const n = Number(num)
  return num !== '' && !isNaN(n) && n > 0 ? `${num.replace('.', ',')} ${un}` : ''
}

const tipoIcon = (tipo: string): string => {
  const n = normalizar(tipo)
  if (n.includes('antibiot')) return '💉'
  if (n.includes('inflamat')) return '💊'
  if (n.includes('vermif')) return '🐛'
  if (n.includes('bicheira')) return '🪰'
  if (n.includes('vacina')) return '💉'
  if (n.includes('vitamin')) return '💊'
  if (n.includes('hormon')) return '💉'
  return '💊'
}

export default function MedicamentosSection({
  items,
  onChange,
  medicamentosDisponiveis,
  baixaEstoque = false,
  historicoDoses = null,
}: MedicamentosSectionProps) {
  const [mostrarFormularioMedicamento, setMostrarFormularioMedicamento] = useState(false)
  const [medicamentoEditando, setMedicamentoEditando] = useState<MedicamentoItem | null>(null)
  const [medicamentoEditandoIndex, setMedicamentoEditandoIndex] = useState<number | null>(null)
  const [tipoFiltro, setTipoFiltro] = useState<string>('')
  const [doseNum, setDoseNum] = useState('')
  const [doseUn, setDoseUn] = useState<UnidadeDose>('ml')
  const [doseLegada, setDoseLegada] = useState('')

  const tiposDisponiveis = [...new Set(medicamentosDisponiveis.map(m => m.tipo))] as string[]

  const handleAdicionarMedicamento = () => {
    setMostrarFormularioMedicamento(true)
    setMedicamentoEditando(null)
    setMedicamentoEditandoIndex(null)
    setDoseNum('')
    setDoseUn('ml')
    setDoseLegada('')
    setTipoFiltro(tiposDisponiveis.length === 1 ? tiposDisponiveis[0] : '')
  }

  const medicamentoPorId = (id: string) => medicamentosDisponiveis.find((m) => m.id === id)

  const handleEditarMedicamento = (index: number) => {
    const item = items[index]
    setMostrarFormularioMedicamento(true)
    setMedicamentoEditandoIndex(index)
    setTipoFiltro(item.tipo)
    const dose = parseDose(item.doseAplicada)
    setMedicamentoEditando(item)
    setDoseNum(dose?.num || '')
    setDoseUn(dose?.un ?? 'ml')
    setDoseLegada(dose ? '' : item.doseAplicada)
  }

  const handleRemoverMedicamento = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  const handleSalvarMedicamento = () => {
    if (!medicamentoEditando?.medicamentoId || !medicamentoEditando?.doseAplicada) {
      return
    }

    if (medicamentoEditandoIndex !== null) {
      onChange(items.map((item, index) =>
        index === medicamentoEditandoIndex ? medicamentoEditando : item
      ))
    } else {
      onChange([...items, medicamentoEditando])
    }

    setMostrarFormularioMedicamento(false)
    setMedicamentoEditando(null)
    setMedicamentoEditandoIndex(null)
    setTipoFiltro('')
  }

  const handleCancelarMedicamento = () => {
    setMostrarFormularioMedicamento(false)
    setMedicamentoEditando(null)
    setMedicamentoEditandoIndex(null)
    setTipoFiltro('')
  }

  const atualizarDose = (num: string, un: UnidadeDose) => {
    setDoseNum(num)
    setDoseUn(un)
    if (num !== '') setDoseLegada('')
    setMedicamentoEditando((prev) =>
      prev ? { ...prev, doseAplicada: num === '' && doseLegada ? prev.doseAplicada : formatarDose(num, un) } : prev
    )
  }

  const handleSelecionarMedicamento = (medicamento: any) => {
    setDoseLegada('')
    setMedicamentoEditando({
      medicamentoId: medicamento.id,
      tipo: medicamento.tipo,
      nomeComercial: medicamento.nome_comercial,
      principioAtivo: medicamento.principio_ativo || '',
      doseRecomendada: medicamento.dose_recomendada || '',
      doseAplicada: medicamentoEditando?.doseAplicada || '',
      // Outro medicamento: os frascos do anterior não valem para este
      frascosUsados: medicamentoEditando?.medicamentoId === medicamento.id ? medicamentoEditando?.frascosUsados ?? 0 : 0,
    })
  }

  const atualizarFrascos = (texto: string) => {
    setMedicamentoEditando((prev) => (prev ? { ...prev, frascosUsados: frascosValidos(texto) } : prev))
  }

  const medicamentoSelecionado = medicamentoEditando ? medicamentoPorId(medicamentoEditando.medicamentoId) : undefined
  const pedeFrascos = baixaEstoque && !!medicamentoSelecionado?.controla_estoque

  // Outros itens deste registro com o mesmo medicamento entram no saldo e na soma das doses
  const outrosItens = items.filter((m, i) => i !== medicamentoEditandoIndex && m.medicamentoId === medicamentoEditando?.medicamentoId)
  const frascosInformados = frascosValidos(medicamentoEditando?.frascosUsados)
  const saldoDepois = pedeFrascos
    ? saldoApos(medicamentoSelecionado?.estoque_atual, outrosItens.reduce((s, m) => s + frascosValidos(m.frascosUsados), 0) + frascosInformados, true)
    : 0
  const unidadeConteudo = medicamentoSelecionado?.conteudo_unidade?.toLowerCase()
  const somaDoses = (doses: string[]) =>
    doses.reduce((s, d) => {
      const dose = parseDose(d)
      return dose && dose.un === unidadeConteudo ? s + Number(dose.num) : s
    }, 0)
  const avisoFrasco =
    pedeFrascos && historicoDoses && frascosInformados === 0 && !outrosItens.some((m) => frascosValidos(m.frascosUsados) > 0)
      ? avisoFrascoNoFim(
          dosesDesdeUltimaBaixa(historicoDoses, medicamentoSelecionado) +
            somaDoses([...outrosItens.map((m) => m.doseAplicada), medicamentoEditando?.doseAplicada ?? '']),
          medicamentoSelecionado,
        )
      : null

  return (
    <>
      {/* Lista de medicamentos adicionados */}
      {items.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {items.map((med, index) => (
            <div key={index} className="bg-gray-50 rounded-xl p-3.5 border border-gray-200">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <p className="text-[15px] font-bold text-gray-900">{med.nomeComercial}</p>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{med.tipo}</p>
                  {med.doseRecomendada && (
                    <p className="text-sm text-gray-600 mt-1">Dose recomendada: {med.doseRecomendada}</p>
                  )}
                  <p className="text-sm text-gray-900 font-semibold">Dose aplicada: {med.doseAplicada}</p>
                  {frascosValidos(med.frascosUsados) > 0 && (
                    <p className="text-sm text-gray-900 font-semibold">
                      Estoque: {frascosValidos(med.frascosUsados)} {unidadeConcordada('frasco', frascosValidos(med.frascosUsados))}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => handleEditarMedicamento(index)}
                    className="!min-h-0 !min-w-0 w-9 h-9 rounded-lg text-base text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                    title="Editar medicamento"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoverMedicamento(index)}
                    className="!min-h-0 !min-w-0 w-9 h-9 rounded-lg text-base text-red-500 hover:bg-red-50 flex items-center justify-center"
                    title="Remover medicamento"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botão para adicionar medicamento */}
      {!mostrarFormularioMedicamento ? (
        <button
          type="button"
          onClick={handleAdicionarMedicamento}
          className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 px-4 py-4 flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-500 transition-colors hover:border-brand-600 hover:text-brand-700 active:scale-[0.99]"
        >
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          {items.length > 0 ? 'ADICIONAR OUTRO MEDICAMENTO' : 'ADICIONAR MEDICAMENTO'}
        </button>
      ) : (
        /* Formulário para adicionar/editar medicamento */
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col gap-4">
          <h3 className="text-[15px] font-extrabold uppercase tracking-tight text-gray-900">
            {medicamentoEditandoIndex !== null ? 'EDITAR MEDICAMENTO' : 'NOVO MEDICAMENTO'}
          </h3>

          {/* Tipo do medicamento em tiles */}
          {tiposDisponiveis.length > 1 && (
            <div className="flex flex-col gap-2">
              <p className="text-[15px] font-bold text-gray-900">TIPO</p>
              <ChoiceGrid
                options={tiposDisponiveis.map((t) => ({ value: t, label: t.toUpperCase(), icon: tipoIcon(t) }))}
                value={tipoFiltro}
                onChange={setTipoFiltro}
                cols={2}
                labelSize="xs"
                showCheck={false}
              />
            </div>
          )}

          {/* Seleção de medicamento */}
          {tipoFiltro && (
            <SearchableModal
              label={<span>MEDICAMENTO <span className="text-red-500">*</span></span>}
              value={medicamentoEditando?.nomeComercial || ''}
              onChange={(val) => {
                const medicamento = escolherMedicamentoPorNome(medicamentosDisponiveis, val, tipoFiltro)
                if (medicamento) {
                  handleSelecionarMedicamento(medicamento)
                }
              }}
              options={medicamentosDisponiveis
                .filter(m => m.tipo === tipoFiltro)
                .map(m => m.nome_comercial)}
              placeholder="Selecione um medicamento..."
              id="medicamento"
              name="medicamento"
            />
          )}
          {(medicamentoEditando?.principioAtivo || medicamentoEditando?.doseRecomendada) && (
            <InfoStrip tone="neutral">
              {[medicamentoEditando?.principioAtivo && `Princípio ativo: ${medicamentoEditando.principioAtivo}`,
                medicamentoEditando?.doseRecomendada && `Dose recomendada: ${medicamentoEditando.doseRecomendada}`]
                .filter(Boolean).join(' · ')}
            </InfoStrip>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[15px] font-bold text-gray-900">
                DOSE APLICADA <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-1.5">
                {(['ml', 'mg'] as UnidadeDose[]).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => atualizarDose(doseNum, u)}
                    className={`!min-h-0 rounded-lg border-2 px-3 py-1 text-xs font-extrabold uppercase transition-colors ${
                      doseUn === u ? 'border-brand-900 bg-brand-900 text-white' : 'border-gray-300 bg-white text-gray-700'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <StepperInput
              value={doseNum}
              onChange={(v) => atualizarDose(v, doseUn)}
              min={0}
              step={0.5}
              suffix={doseUn}
            />
            {doseLegada && (
              <InfoStrip tone="warning">Dose registrada antes: "{doseLegada}". Informe novamente para alterar.</InfoStrip>
            )}
          </div>

          {pedeFrascos && (
            <div className="flex flex-col gap-2">
              <label className="text-[15px] font-bold text-gray-900">FRASCOS USADOS NO ESTOQUE</label>
              <InfoStrip tone={saldoDepois < 0 ? 'danger' : 'neutral'}>
                {saldoDepois < 0
                  ? `Maior que o saldo: ficará em ${formatarQuantidade(saldoDepois, 'frasco')}. Confira a quantidade.`
                  : `Saldo no aparelho: ${formatarQuantidade(Number(medicamentoSelecionado?.estoque_atual || 0), 'frasco')}`}
              </InfoStrip>
              {avisoFrasco && <InfoStrip tone="warning">{avisoFrasco}</InfoStrip>}
              <StepperInput
                value={medicamentoEditando?.frascosUsados ? String(medicamentoEditando.frascosUsados) : ''}
                onChange={atualizarFrascos}
                min={0}
                step={1}
                allowDecimals={false}
                suffix={unidadeConcordada('frasco', medicamentoEditando?.frascosUsados ?? 0)}
              />
              <p className="text-xs text-gray-500">
                Só baixa o estoque se você informar frascos inteiros. Deixe em 0 se o frasco ainda não acabou ou vai ser baixado depois.
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSalvarMedicamento}
              disabled={!medicamentoEditando?.medicamentoId || !medicamentoEditando?.doseAplicada}
              className="flex-1 rounded-xl bg-green-600 px-3 py-3 text-sm font-bold text-white transition-colors hover:bg-green-700 active:scale-[0.99] disabled:bg-gray-200 disabled:text-gray-400"
            >
              SALVAR MEDICAMENTO
            </button>
            <button
              type="button"
              onClick={handleCancelarMedicamento}
              className="rounded-xl bg-gray-200 px-4 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-300 active:scale-[0.99]"
            >
              CANCELAR
            </button>
          </div>
        </div>
      )}
    </>
  )
}

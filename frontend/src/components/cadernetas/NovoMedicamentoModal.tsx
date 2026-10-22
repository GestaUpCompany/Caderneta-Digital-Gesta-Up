import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Input } from '../ui'
import ChoiceGrid from './ChoiceGrid'
import InfoStrip from './InfoStrip'

// Valores do enum medicamento_tipo no banco
export const TIPOS_MEDICAMENTO = [
  { value: 'Antibiotico', label: 'ANTIBIÓTICO' },
  { value: 'Vermifugo', label: 'VERMÍFUGO' },
  { value: 'Carrapaticida', label: 'CARRAPATICIDA' },
  { value: 'Vacina', label: 'VACINA' },
  { value: 'Anti_inflamatorio', label: 'ANTI-INFLAMATÓRIO' },
  { value: 'Analgesico', label: 'ANALGÉSICO' },
  { value: 'Hormonio', label: 'HORMÔNIO' },
  { value: 'Vitamina_Mineral', label: 'VITAMINA / MINERAL' },
  { value: 'Probiotico', label: 'PROBIÓTICO' },
  { value: 'Anti_stress', label: 'ANTI-STRESS' },
  { value: 'Coccidiostatico', label: 'COCCIDIOSTÁTICO' },
  { value: 'Fluido_oral', label: 'FLUIDO ORAL' },
  { value: 'Outro', label: 'OUTRO' },
]

const UNIDADES = ['un', 'dose', 'frasco', 'caixa', 'mL', 'L', 'g', 'kg']
const UNIDADES_DIRETAS = ['mL', 'L', 'g', 'kg']

export interface NovoMedicamentoDados {
  nome_comercial: string
  sku: string | null
  tipo: string
  unidade: string
  conteudo_por_unidade: number | null
  conteudo_unidade: string | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
  /** Devolve os dados validados; a página decide se já existe um igual na lista. */
  onConfirmar: (dados: NovoMedicamentoDados) => void
}

// Permite apenas dígitos e uma vírgula decimal
const sanitizarDecimal = (texto: string) => {
  let value = texto.replace(/[^\d,]/g, '')
  const firstComma = value.indexOf(',')
  if (firstComma !== -1) value = value.slice(0, firstComma + 1) + value.slice(firstComma + 1).replace(/,/g, '')
  return value
}

/** Cadastro de medicamento/vacina que ainda não existe, em folha sobreposta (não empurra o formulário). */
export default function NovoMedicamentoModal({ isOpen, onClose, onConfirmar }: Props) {
  const [nome, setNome] = useState('')
  const [sku, setSku] = useState('')
  const [tipo, setTipo] = useState('')
  const [unidade, setUnidade] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [conteudoUn, setConteudoUn] = useState('mL')
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setNome('')
    setSku('')
    setTipo('')
    setUnidade('')
    setConteudo('')
    setConteudoUn('mL')
    setErro(null)
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const confirmar = () => {
    if (!nome.trim()) return setErro('Informe o nome do medicamento')
    if (!tipo) return setErro('Escolha o tipo')
    if (!unidade) return setErro('Escolha a unidade de medida')
    const valor = parseFloat(conteudo.replace(',', '.'))
    const temConteudo = !UNIDADES_DIRETAS.includes(unidade) && !isNaN(valor) && valor > 0
    // Unidade de embalagem precisa do conteúdo: sem ele a Enfermaria não consegue dar baixa
    if (!UNIDADES_DIRETAS.includes(unidade) && !temConteudo)
      return setErro(`Informe o conteúdo por ${unidade} (ex.: 500 mL por frasco) para a Enfermaria dar baixa automática`)
    onConfirmar({
      nome_comercial: nome.trim(),
      sku: sku.trim() || null,
      tipo,
      unidade,
      conteudo_por_unidade: temConteudo ? valor : null,
      conteudo_unidade: temConteudo ? conteudoUn : null,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Novo medicamento ou vacina"
        className="flex max-h-[92vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-extrabold uppercase tracking-tight text-gray-900">Novo medicamento / vacina</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex !min-h-0 h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600"
          >
            <X className="h-4 w-4" strokeWidth={3} />
          </button>
        </div>

        <Input
          label={<span>NOME COMERCIAL <span className="text-red-500">*</span></span>}
          placeholder="Ex: Draxxin 100 mL"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <Input
          label={<span>SKU (CÓDIGO INTERNO)</span>}
          placeholder="Ex: MED-001 (opcional)"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
        />

        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-bold uppercase text-gray-900">Tipo <span className="text-red-500">*</span></p>
          <ChoiceGrid options={TIPOS_MEDICAMENTO} value={tipo} onChange={setTipo} cols={2} labelSize="xs" showCheck={false} />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[13px] font-bold uppercase text-gray-900">Unidade de medida <span className="text-red-500">*</span></p>
          <ChoiceGrid
            options={UNIDADES.map((u) => ({ value: u, label: u.toUpperCase() }))}
            value={unidade}
            onChange={setUnidade}
            cols={4}
            labelSize="xs"
            showCheck={false}
          />
          <InfoStrip tone="warning" icon="⚠️">Depois do primeiro lançamento a unidade não pode ser alterada</InfoStrip>
        </div>

        {unidade && !UNIDADES_DIRETAS.includes(unidade) && (
          <div className="flex flex-col gap-2">
            <Input
              label={<span>CONTEÚDO POR {unidade.toUpperCase()} <span className="text-red-500">*</span></span>}
              placeholder="Ex: 100"
              value={conteudo}
              onChange={(e) => setConteudo(sanitizarDecimal(e.target.value))}
              inputMode="decimal"
            />
            <ChoiceGrid
              options={[{ value: 'mL', label: 'ML' }, { value: 'mg', label: 'MG' }]}
              value={conteudoUn}
              onChange={setConteudoUn}
              cols={2}
              labelSize="xs"
              showCheck={false}
            />
            <p className="text-xs text-gray-500">
              Permite a baixa automática pela Enfermaria (ex.: 20 mL aplicados ÷ 100 mL = 0,2 {unidade}).
            </p>
          </div>
        )}

        {erro && <InfoStrip tone="danger">{erro}</InfoStrip>}

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button
            type="button"
            onClick={confirmar}
            className="!min-h-0 rounded-2xl bg-green-600 px-3 py-4 text-sm font-bold text-white transition-colors hover:bg-green-700 active:scale-[0.99]"
          >
            USAR ESTE MEDICAMENTO
          </button>
          <button
            type="button"
            onClick={onClose}
            className="!min-h-0 rounded-2xl bg-gray-200 px-5 py-4 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-300 active:scale-[0.99]"
          >
            CANCELAR
          </button>
        </div>
      </div>
    </div>
  )
}

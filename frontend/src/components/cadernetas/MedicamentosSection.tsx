import { useState } from 'react'
import { Button, Input, SearchableModal } from '../ui'

export interface MedicamentoItem {
  medicamentoId: string
  tipo: string
  nomeComercial: string
  principioAtivo: string
  doseRecomendada: string
  doseAplicada: string
}

interface MedicamentosSectionProps {
  items: MedicamentoItem[]
  onChange: (items: MedicamentoItem[]) => void
  medicamentosDisponiveis: any[]
}

export default function MedicamentosSection({
  items,
  onChange,
  medicamentosDisponiveis,
}: MedicamentosSectionProps) {
  const [mostrarFormularioMedicamento, setMostrarFormularioMedicamento] = useState(false)
  const [medicamentoEditando, setMedicamentoEditando] = useState<MedicamentoItem | null>(null)
  const [medicamentoEditandoIndex, setMedicamentoEditandoIndex] = useState<number | null>(null)
  const [tipoFiltro, setTipoFiltro] = useState<string>('')

  const handleAdicionarMedicamento = () => {
    setMostrarFormularioMedicamento(true)
    setMedicamentoEditando(null)
    setMedicamentoEditandoIndex(null)
    setTipoFiltro('')
  }

  const handleEditarMedicamento = (index: number) => {
    setMostrarFormularioMedicamento(true)
    setMedicamentoEditando(items[index])
    setMedicamentoEditandoIndex(index)
    setTipoFiltro(items[index].tipo)
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

  const handleSelecionarMedicamento = (medicamento: any) => {
    setMedicamentoEditando({
      medicamentoId: medicamento.id,
      tipo: medicamento.tipo,
      nomeComercial: medicamento.nome_comercial,
      principioAtivo: medicamento.principio_ativo || '',
      doseRecomendada: medicamento.dose_recomendada || '',
      doseAplicada: medicamentoEditando?.doseAplicada || '',
    })
  }

  return (
    <>
      {/* Lista de medicamentos adicionados */}
      {items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map((med, index) => (
            <div key={index} className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <p className="text-lg font-bold text-gray-800 uppercase">{med.tipo}</p>
                  <p className="text-base text-gray-900">{med.nomeComercial}</p>
                  {med.doseRecomendada && (
                    <p className="text-sm text-gray-600">Dose recomendada: {med.doseRecomendada}</p>
                  )}
                  <p className="text-base text-gray-900 font-semibold">Dose aplicada: {med.doseAplicada}</p>
                </div>
                <div className="flex gap-2 ml-2">
                  <button
                    onClick={() => handleEditarMedicamento(index)}
                    className="text-blue-500 text-2xl"
                    title="Editar medicamento"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => handleRemoverMedicamento(index)}
                    className="text-red-500 text-2xl"
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
        <Button
          onClick={handleAdicionarMedicamento}
          variant="secondary"
          icon="➕"
          fullWidth
        >
          ADICIONAR MEDICAMENTO
        </Button>
      ) : (
        /* Formulário para adicionar/editar medicamento */
        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 flex flex-col gap-4">
          <h3 className="text-base font-bold text-gray-900">
            {medicamentoEditandoIndex !== null ? 'EDITAR MEDICAMENTO' : 'NOVO MEDICAMENTO'}
          </h3>

          {/* Filtro por tipo */}
          <SearchableModal
            label="FILTRAR POR TIPO"
            value={tipoFiltro}
            onChange={setTipoFiltro}
            options={[...new Set(medicamentosDisponiveis.map(m => m.tipo))]}
            placeholder="Todos"
            id="tipoFiltro"
            name="tipoFiltro"
          />

          {/* Seleção de medicamento */}
          {tipoFiltro && (
            <SearchableModal
              label="MEDICAMENTO"
              value={medicamentoEditando?.nomeComercial || ''}
              onChange={(val) => {
                const medicamento = medicamentosDisponiveis.find(m => m.nome_comercial === val)
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
          {medicamentoEditando?.principioAtivo && (
            <p className="text-base text-gray-600">Princípio ativo: {medicamentoEditando.principioAtivo}</p>
          )}
          {medicamentoEditando?.doseRecomendada && (
            <p className="text-base text-gray-600">Dose recomendada: {medicamentoEditando.doseRecomendada}</p>
          )}

          <Input
            label="DOSE APLICADA"
            placeholder="Informe a dose aplicada"
            value={medicamentoEditando?.doseAplicada || ''}
            onChange={(e) => setMedicamentoEditando(prev => prev ? { ...prev, doseAplicada: e.target.value } : null)}
          />

          <div className="flex gap-2">
            <Button onClick={handleSalvarMedicamento} variant="success" icon="✓" className="text-sm">
              SALVAR
            </Button>
            <Button onClick={handleCancelarMedicamento} variant="secondary" icon="✕" className="text-sm">
              CANCELAR
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

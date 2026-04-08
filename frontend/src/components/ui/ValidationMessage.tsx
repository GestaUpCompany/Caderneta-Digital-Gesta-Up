interface ValidationMessageProps {
  errors: { field: string; message: string }[]
  showSummary?: boolean
}

const FIELD_NAMES: Record<string, string> = {
  data: 'Data',
  pasto: 'Pasto',
  pastoSaida: 'Pasto de Saída',
  pastoEntrada: 'Pasto de Entrada',
  avaliacaoSaida: 'Avaliação Saída',
  avaliacaoEntrada: 'Avaliação Entrada',
  numeroLote: 'Nº Lote',
  manejador: 'Manejador',
  responsavel: 'Responsável',
  tratador: 'Tratador',
  numeroCria: 'Nº Cria',
  numeroMae: 'Nº Mãe',
  categoriaMae: 'Categoria da Mãe',
  loteOrigem: 'Lote Origem',
  loteDestino: 'Lote Destino',
  numeroCabecas: 'Nº Cabeças',
  motivoMovimentacao: 'Motivo',
  vaca: 'Vaca',
  touro: 'Touro',
  bezerro: 'Bezerro',
  boi: 'Boi',
  boiMagro: 'Boi Magro',
  boiGordo: 'Boi Gordo',
  garrote: 'Garrote',
  novilha: 'Novilha',
  leituraBebedouro: 'Leitura Bebedouro',
  leitura: 'Leitura',
  kg: 'KG',
  produto: 'Produto',
  gado: 'Tipo de Gado',
  categorias: 'Categorias',
  escoreGadoIdeal: 'Escore do Gado',
  aguaBoaBebedouro: 'Água / Bebedouro',
  pastagemAdequada: 'Pastagem Adequada',
  animaisDoentes: 'Animais Doentes',
  cercasCochos: 'Cercas / Cochos',
  carrapatosMoscas: 'Carrapatos / Moscas',
  animaisEntrevados: 'Animais Entrevados',
  animalMorto: 'Animal Morto',
  escoreFezes: 'Escore de Fezes',
  equipe: 'Avaliação Equipe',
  codigo: 'Código de Alteração',
  planilhaUrl: 'Link da Planilha',
  usuario: 'Seu Nome',
  fazenda: 'Nome da Fazenda',
  sacos: 'Sacos',
  creep: 'Creep',
  numeroBebedouro: 'Nº Bebedouro',
  observacao: 'Observação',
  pesoMedio: 'Peso Médio',
  brincoChip: 'Brinco/Chip',
  causaObservacao: 'Causa/Observação',
}

export default function ValidationMessage({ errors, showSummary = true }: ValidationMessageProps) {
  if (errors.length === 0) return null

  return (
    <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4">
      {showSummary && (
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-red-200">
          <span className="text-3xl">⚠️</span>
          <div>
            <p className="text-lg font-bold text-red-800">
              CORRIJA {errors.length} {errors.length === 1 ? 'ERRO' : 'ERROS'}
            </p>
            <p className="text-base text-red-600">
              Preencha os campos destacados abaixo
            </p>
          </div>
        </div>
      )}
      <ul className="space-y-2">
        {errors.map((error, index) => (
          <li 
            key={`${error.field}-${index}`}
            className="flex items-start gap-2 text-base font-semibold text-red-700"
          >
            <span className="text-red-500 mt-0.5">•</span>
            <span>
              <strong>{FIELD_NAMES[error.field] || error.field}:</strong> {error.message}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

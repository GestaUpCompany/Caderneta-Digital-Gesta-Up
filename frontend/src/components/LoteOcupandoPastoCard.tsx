interface LoteOcupandoPastoCardProps {
  detalhes: {
    nome?: string
    categorias?: string
    n_cabecas?: number
    peso_vivo_kg?: number
  }
  processarCategorias?: (categorias: string) => string[]
}

export default function LoteOcupandoPastoCard({ detalhes, processarCategorias }: LoteOcupandoPastoCardProps) {
  let categoriasTexto = detalhes.categorias || '-'

  try {
    if (detalhes.categorias && typeof detalhes.categorias === 'string' && detalhes.categorias.startsWith('[')) {
      const categoriasArray = JSON.parse(detalhes.categorias)
      if (Array.isArray(categoriasArray)) {
        categoriasTexto = categoriasArray
          .map((cat: string) => cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase())
          .join(', ')
      }
    }
  } catch {
    categoriasTexto = detalhes.categorias || '-'
  }

  const categoriasProcessadas = processarCategorias && categoriasTexto !== '-'
    ? processarCategorias(categoriasTexto).join(', ')
    : categoriasTexto

  const totalCabecas = detalhes.n_cabecas || 0

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="grid grid-cols-2 gap-2 text-base">
        {detalhes.nome && (
          <div className="col-span-2">
            <p className="text-gray-500 font-semibold">LOTE</p>
            <p className="text-gray-900 font-bold">{detalhes.nome}</p>
          </div>
        )}
        <div className="col-span-2">
          <p className="text-gray-500 font-semibold">CATEGORIAS</p>
          <p className="text-gray-900 font-bold break-words">{categoriasProcessadas}</p>
        </div>
        <div>
          <p className="text-gray-500 font-semibold">N° CABEÇAS</p>
          <p className="text-gray-900 font-bold">{detalhes.n_cabecas !== undefined ? detalhes.n_cabecas : '-'}</p>
        </div>
        <div>
          <p className="text-gray-500 font-semibold">PESO VIVO ATUAL(kg)</p>
          <p className="text-gray-900 font-bold">{detalhes.peso_vivo_kg !== undefined ? detalhes.peso_vivo_kg.toFixed(2) : '-'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-gray-500 font-semibold">TOTAL CABEÇAS</p>
          <p className="text-[#3b82f6] font-bold text-lg">{totalCabecas} animais</p>
        </div>
      </div>
    </div>
  )
}

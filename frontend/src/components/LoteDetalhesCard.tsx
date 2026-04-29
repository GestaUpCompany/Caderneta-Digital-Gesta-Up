interface LoteDetalhesCardProps {
  detalhes: {
    categorias: string
    nCabecas: number
    pesoVivo: number
    qtdBezerros: number
  }
  processarCategorias?: (categorias: string) => string[]
}

export default function LoteDetalhesCard({ detalhes, processarCategorias }: LoteDetalhesCardProps) {
  const categoriasProcessadas = processarCategorias 
    ? processarCategorias(detalhes.categorias).join(', ')
    : detalhes.categorias

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="grid grid-cols-2 gap-2 text-base">
        <div className="col-span-2">
          <p className="text-gray-500 font-semibold">CATEGORIAS</p>
          <p className="text-gray-900 font-bold break-words">{categoriasProcessadas}</p>
        </div>
        <div>
          <p className="text-gray-500 font-semibold">N° CABEÇAS</p>
          <p className="text-gray-900 font-bold">{detalhes.nCabecas}</p>
        </div>
        <div>
          <p className="text-gray-500 font-semibold">PESO VIVO</p>
          <p className="text-gray-900 font-bold">{detalhes.pesoVivo} kg</p>
        </div>
        <div>
          <p className="text-gray-500 font-semibold">QTD. BEZERROS</p>
          <p className="text-gray-900 font-bold">{detalhes.qtdBezerros}</p>
        </div>
      </div>
    </div>
  )
}

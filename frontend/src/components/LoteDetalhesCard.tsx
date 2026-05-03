interface LoteDetalhesCardProps {
  detalhes: {
    categorias?: string
    n_cabecas?: number
    peso_vivo_kg?: number
    qtd_bezerros?: number
  }
  processarCategorias?: (categorias: string) => string[]
}

export default function LoteDetalhesCard({ detalhes, processarCategorias }: LoteDetalhesCardProps) {
  // Fazer parsing de JSON para texto puro se necessário
  let categoriasTexto = detalhes.categorias || '-'
  
  try {
    // Se categorias for uma string JSON, fazer o parsing
    if (detalhes.categorias && typeof detalhes.categorias === 'string' && detalhes.categorias.startsWith('[')) {
      const categoriasArray = JSON.parse(detalhes.categorias)
      if (Array.isArray(categoriasArray)) {
        // Formatar com iniciais maiúsculas
        categoriasTexto = categoriasArray
          .map((cat: string) => cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase())
          .join(', ')
      }
    }
  } catch (error) {
    // Se falhar o parsing, usar o valor original
    categoriasTexto = detalhes.categorias || '-'
  }

  const categoriasProcessadas = processarCategorias && categoriasTexto !== '-'
    ? processarCategorias(categoriasTexto).join(', ')
    : categoriasTexto

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="grid grid-cols-2 gap-2 text-base">
        <div className="col-span-2">
          <p className="text-gray-500 font-semibold">CATEGORIAS</p>
          <p className="text-gray-900 font-bold break-words">{categoriasProcessadas}</p>
        </div>
        <div>
          <p className="text-gray-500 font-semibold">N° CABEÇAS</p>
          <p className="text-gray-900 font-bold">{detalhes.n_cabecas || '-'}</p>
        </div>
        <div>
          <p className="text-gray-500 font-semibold">PESO VIVO</p>
          <p className="text-gray-900 font-bold">{detalhes.peso_vivo_kg ? `${detalhes.peso_vivo_kg} kg` : '-'}</p>
        </div>
        <div>
          <p className="text-gray-500 font-semibold">QTD. BEZERROS</p>
          <p className="text-gray-900 font-bold">{detalhes.qtd_bezerros || '-'}</p>
        </div>
      </div>
    </div>
  )
}

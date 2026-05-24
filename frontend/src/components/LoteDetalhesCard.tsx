interface LoteDetalhesCardProps {
  detalhes: {
    categorias?: string
    n_cabecas?: number
    peso_vivo_kg?: number
    qtd_bezerros?: number
    pastos?: {
      nome?: string
    }
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

  // Calcular total de cabeças (n° cabeças + qtd bezerros)
  const totalCabecas = (detalhes.n_cabecas || 0) + (detalhes.qtd_bezerros || 0)

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="grid grid-cols-2 gap-2 text-base">
        {detalhes.pastos?.nome && (
          <div className="col-span-2">
            <p className="text-gray-500 font-semibold">PASTO</p>
            <p className="text-gray-900 font-bold">{detalhes.pastos.nome}</p>
          </div>
        )}
        <div className="col-span-2">
          <p className="text-gray-500 font-semibold">CATEGORIAS</p>
          <p className="text-gray-900 font-bold break-words">{categoriasProcessadas}</p>
        </div>
        <div>
          <p className="text-gray-500 font-semibold">N° CABEÇAS</p>
          <p className="text-gray-900 font-bold">{detalhes.n_cabecas || '-'}</p>
        </div>
        <div>
          <p className="text-gray-500 font-semibold">PESO VIVO ATUAL(kg)</p>
          <p className="text-gray-900 font-bold">{detalhes.peso_vivo_kg || '-'}</p>
        </div>
        <div>
          <p className="text-gray-500 font-semibold">QTD. BEZERROS(AS)</p>
          <p className="text-gray-900 font-bold">{detalhes.qtd_bezerros || '-'}</p>
        </div>
        <div>
          <p className="text-gray-500 font-semibold">TOTAL CABEÇAS</p>
          <p className="text-[#3b82f6] font-bold text-lg">{totalCabecas} animais</p>
        </div>
      </div>
    </div>
  )
}

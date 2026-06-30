interface MetaRodeioInfo {
  metaDias: number
  diasDesdeUltimo: number
  diasAteProximo: number
  isDentroMeta: boolean
  hasRecord: boolean
}

interface LoteDetalhesCardProps {
  detalhes: {
    nome?: string
    categorias?: string
    n_cabecas?: number
    peso_vivo_kg?: number
    pastos?: {
      nome?: string
    }
    data_proximo_rodeio?: string | null
  }
  processarCategorias?: (categorias: string) => string[]
  metaRodeio?: MetaRodeioInfo | null
}

export default function LoteDetalhesCard({ detalhes, processarCategorias, metaRodeio }: LoteDetalhesCardProps) {
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

  const totalCabecas = detalhes.n_cabecas || 0

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      <div className="grid grid-cols-2 gap-2 text-base">
        {detalhes.pastos?.nome && (
          <div className="col-span-2">
            <p className="text-gray-500 font-semibold">PASTO</p>
            <p className="text-gray-900 font-bold">{detalhes.pastos.nome}</p>
          </div>
        )}
        {detalhes.nome && (
          <div className="col-span-2">
            <p className="text-gray-500 font-semibold">LOTE</p>
            <p className="text-gray-900 font-bold">{detalhes.nome}</p>
          </div>
        )}
        <div className="col-span-2">
          <p className="text-gray-500 font-semibold">CATEGORIAS</p>
          <p className="text-gray-900 font-bold break-words capitalize">{categoriasProcessadas}</p>
        </div>
        <div>
          <p className="text-gray-500 font-semibold">PESO VIVO ATUAL(kg)</p>
          <p className="text-gray-900 font-bold">{detalhes.peso_vivo_kg !== undefined ? detalhes.peso_vivo_kg.toFixed(2) : '-'}</p>
        </div>
        <div>
          <p className="text-gray-500 font-semibold">TOTAL CABEÇAS</p>
          <p className="text-[#3b82f6] font-bold text-lg">{totalCabecas} animais</p>
        </div>
        {metaRodeio && metaRodeio.metaDias > 0 && (
          <div className="col-span-2">
            <p className="text-gray-500 font-semibold">META RODEIO</p>
            {(() => {
              const { hasRecord, isDentroMeta, diasAteProximo, diasDesdeUltimo, metaDias } = metaRodeio
              const plural = (n: number) => n > 1 ? 's' : ''
              // Calculate next date dynamically from diasAteProximo to avoid stale DB values
              const calcularDataProxima = (dias: number): string => {
                const hoje = new Date()
                hoje.setHours(0, 0, 0, 0)
                const proxima = new Date(hoje)
                proxima.setDate(hoje.getDate() + dias)
                return proxima.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
              }
              const dataProx = diasAteProximo >= 0 ? calcularDataProxima(diasAteProximo) : null
              if (!hasRecord) {
                return (
                  <p className="font-bold text-blue-600">
                    ℹ️ Primeiro rodeio · Meta: {metaDias} dia{plural(metaDias)}
                  </p>
                )
              }
              if (isDentroMeta) {
                if (diasAteProximo === 0) {
                  return (
                    <p className="font-bold text-green-600">
                      ✅ Em dia · Próximo rodeio: HOJE{dataProx ? ` (${dataProx})` : ''}
                    </p>
                  )
                }
                return (
                  <p className="font-bold text-green-600">
                    ✅ Em dia · Próximo rodeio em {diasAteProximo} dia{plural(diasAteProximo)}{dataProx ? ` (${dataProx})` : ''}
                  </p>
                )
              }
              return (
                <p className="font-bold text-red-600">
                  ⚠️ Atrasado há {Math.abs(diasAteProximo)} dia{plural(Math.abs(diasAteProximo))} · Último há {diasDesdeUltimo} dia{plural(diasDesdeUltimo)}
                </p>
              )
            })()}
          </div>
        )}
      </div>
    </div>
  )
}

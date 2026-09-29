interface FotoSectionProps {
  /** Titulo numerado da secao, ex: "4. FOTO" */
  titulo: string
  descricao?: string
  textoBotao?: string
  fotoBase64: string | null
  capturando: boolean
  erro: string | null
  onTirar: () => void
  onRemover: () => void
  fotoInputRef: React.RefObject<HTMLInputElement>
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function FotoSection({
  titulo,
  descricao,
  textoBotao = 'TIRAR FOTO',
  fotoBase64,
  capturando,
  erro,
  onTirar,
  onRemover,
  fotoInputRef,
  onFileChange,
}: FotoSectionProps) {
  return (
    <div className="app-card flex flex-col gap-4 p-5">
      <h2 className="text-[15px] font-extrabold uppercase tracking-tight text-gray-900">{titulo}</h2>

      {fotoBase64 ? (
        <div className="flex flex-col gap-3">
          <img
            src={`data:image/jpeg;base64,${fotoBase64}`}
            alt="Foto capturada"
            className="w-full max-w-sm rounded-xl border border-gray-200 mx-auto"
          />
          <button
            type="button"
            onClick={onRemover}
            className="w-full rounded-xl bg-gray-200 px-3 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-300 active:scale-[0.99]"
          >
            🗑️ REMOVER FOTO
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {descricao && (
            <p className="text-sm text-gray-600">{descricao}</p>
          )}
          <button
            type="button"
            onClick={onTirar}
            disabled={capturando}
            className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/50 px-4 py-8 flex flex-col items-center justify-center gap-2 text-gray-500 transition-colors hover:border-brand-600 hover:text-brand-700 active:scale-[0.99] disabled:opacity-60"
          >
            <span className="text-2xl">📷</span>
            <span className="text-sm font-bold uppercase tracking-wide">
              {capturando ? 'CAPTURANDO...' : textoBotao}
            </span>
          </button>
          {erro && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
              {erro}
            </div>
          )}
          <input
            ref={fotoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileChange}
            className="hidden"
          />
        </div>
      )}
    </div>
  )
}

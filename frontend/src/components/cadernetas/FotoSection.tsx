import { Button } from '../ui'

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
    <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-4">
      <h2 className="text-lg font-black text-gray-900 tracking-tight">{titulo}</h2>

      {fotoBase64 ? (
        <div className="flex flex-col gap-3">
          <img
            src={`data:image/jpeg;base64,${fotoBase64}`}
            alt="Foto capturada"
            className="w-full max-w-sm rounded-2xl border-2 border-gray-200 mx-auto"
          />
          <Button onClick={onRemover} variant="secondary" icon="🗑️">
            REMOVER FOTO
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {descricao && (
            <p className="text-sm text-gray-600">{descricao}</p>
          )}
          <Button
            onClick={onTirar}
            variant="success"
            loading={capturando}
            icon="📷"
            className="!bg-green-900 !border-green-900 !active:bg-green-950"
          >
            {capturando ? 'CAPTURANDO...' : textoBotao}
          </Button>
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

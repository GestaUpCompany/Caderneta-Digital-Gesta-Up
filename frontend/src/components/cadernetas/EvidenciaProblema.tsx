import { Input } from '../ui'
import InfoStrip from './InfoStrip'
import { base64ToDataUrl } from '../../utils/photoCompress'

interface EvidenciaProblemaProps {
  observacao: string
  onObservacao: (texto: string) => void
  /** Observação obrigatória (marca com * e mostra o erro); sem isso o campo é opcional. */
  obrigatoria?: boolean
  erroObservacao?: string
  /** Foto em base64 (vazia = sem foto). */
  foto: string
  onTirarFoto: () => void
  onRemoverFoto: () => void
  capturandoFoto: boolean
  fotoErro?: string | null
  ouvindo: boolean
  onFalar: () => void
  vozErro?: string | null
  /** Campo da observação, usado por scrollToFirstError. */
  dataField?: string
  aviso?: string
}

/** Bloco de evidência de um item com problema: observação (digitada ou falada) e foto opcional. */
export default function EvidenciaProblema({
  observacao,
  onObservacao,
  obrigatoria,
  erroObservacao,
  foto,
  onTirarFoto,
  onRemoverFoto,
  capturandoFoto,
  fotoErro,
  ouvindo,
  onFalar,
  vozErro,
  dataField,
  aviso,
}: EvidenciaProblemaProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50/60 p-3">
      {aviso && <InfoStrip tone="danger" icon="⚠️">{aviso}</InfoStrip>}

      <div data-field={dataField}>
        <Input
          label={obrigatoria ? <span>Descreva o problema <span className="text-red-500">*</span></span> : undefined}
          placeholder={obrigatoria ? 'Digite ou use o botão Falar' : 'Adicionar observação (opcional)'}
          value={observacao}
          onChange={(e) => onObservacao(e.target.value)}
          error={erroObservacao}
        />
      </div>

      {foto && (
        <div className="flex items-start gap-3">
          <img src={base64ToDataUrl(foto)} alt="Foto da não conformidade" className="h-20 w-20 rounded-lg border border-gray-200 object-cover" />
          <button
            type="button"
            onClick={onRemoverFoto}
            className="flex-1 rounded-xl bg-gray-200 px-3 py-2.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-300 active:scale-[0.99]"
          >
            🗑️ REMOVER FOTO
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {!foto && (
          <button
            type="button"
            onClick={onTirarFoto}
            disabled={capturandoFoto}
            className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl bg-brand-900 px-3 py-2.5 text-white transition-colors hover:bg-brand-800 active:scale-[0.99] disabled:opacity-60"
          >
            <span className="text-lg leading-none">📷</span>
            <span className="text-xs font-extrabold uppercase tracking-wide">{capturandoFoto ? 'Capturando...' : 'Foto (opcional)'}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onFalar}
          className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-white transition-colors active:scale-[0.99] ${
            foto ? 'col-span-2' : ''
          } ${ouvindo ? 'animate-pulse bg-red-600' : 'bg-gray-600 hover:bg-gray-700'}`}
        >
          <span className="text-lg leading-none">🎤</span>
          <span className="text-xs font-extrabold uppercase tracking-wide">{ouvindo ? 'Ouvindo...' : 'Falar'}</span>
        </button>
      </div>

      {fotoErro && <InfoStrip tone="danger">{fotoErro}</InfoStrip>}
      {vozErro && <InfoStrip tone="danger">{vozErro}</InfoStrip>}
    </div>
  )
}

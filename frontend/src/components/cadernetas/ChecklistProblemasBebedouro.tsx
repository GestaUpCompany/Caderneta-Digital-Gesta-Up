import { Input } from '../ui'
import InfoStrip from './InfoStrip'
import { base64ToDataUrl } from '../../utils/photoCompress'

interface Props {
  label: string
  aviso: string
  /** Problema marcado na tela */
  marcado: boolean
  /** Item vindo de uma pendência anterior: a resposta é dada na pergunta de pendência, não neste botão */
  pendencia?: boolean
  foto: string
  observacao: string
  capturandoFoto: boolean
  /** A captura de foto em andamento é deste item */
  fotoAtiva: boolean
  ouvindoVoz: boolean
  /** A gravação de voz em andamento é deste item */
  vozAtiva: boolean
  fotoErro?: string | null
  vozErro?: string | null
  dataField?: string
  onToggle: () => void
  onTirarFoto: () => void
  onRemoverFoto: () => void
  onFalar: () => void
  onChangeObservacao: (texto: string) => void
}

/** Item do checklist de problemas do bebedouro: botão do problema e, quando marcado, aviso, foto, voz e observação. */
export default function ChecklistProblemasBebedouro({
  label,
  aviso,
  marcado,
  pendencia,
  foto,
  observacao,
  capturandoFoto,
  fotoAtiva,
  ouvindoVoz,
  vozAtiva,
  fotoErro,
  vozErro,
  dataField,
  onToggle,
  onTirarFoto,
  onRemoverFoto,
  onFalar,
  onChangeObservacao,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={pendencia ? undefined : onToggle}
        data-field={dataField}
        className={`flex min-h-[52px] w-full ${pendencia ? 'cursor-default' : 'cursor-pointer'} items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all active:scale-[0.99] ${
          marcado
            ? 'border-red-500 bg-red-50 text-red-800'
            : 'border-gray-300 bg-white text-gray-900 hover:border-gray-400'
        }`}
      >
        <span className="text-sm font-bold leading-tight">
          {label}
          {pendencia && <span className="ml-2 text-xs font-semibold text-red-700">(pendência anterior)</span>}
        </span>
        {marcado && <span className="text-lg leading-none">⚠️</span>}
      </button>

      {marcado && (
        <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50/60 p-3">
          <InfoStrip tone="danger" icon="⚠️">{aviso}</InfoStrip>

          {foto && (
            <div className="flex items-start gap-3">
              <img
                src={base64ToDataUrl(foto)}
                alt={`Foto de ${label}`}
                className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
              />
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
                <span className="text-xs font-extrabold uppercase tracking-wide">
                  {capturandoFoto && fotoAtiva ? 'Capturando...' : 'Foto'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={onFalar}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-white transition-colors active:scale-[0.99] ${
                foto ? 'col-span-2' : ''
              } ${
                ouvindoVoz && vozAtiva ? 'animate-pulse bg-red-600' : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              <span className="text-lg leading-none">🎤</span>
              <span className="text-xs font-extrabold uppercase tracking-wide">
                {ouvindoVoz && vozAtiva ? 'Ouvindo...' : 'Falar'}
              </span>
            </button>
          </div>
          {fotoErro && fotoAtiva && <InfoStrip tone="danger">{fotoErro}</InfoStrip>}
          {vozErro && vozAtiva && <InfoStrip tone="danger">{vozErro}</InfoStrip>}

          <Input
            placeholder="Adicionar observação (opcional)"
            value={observacao}
            onChange={(e) => onChangeObservacao(e.target.value)}
          />
        </div>
      )}
    </div>
  )
}

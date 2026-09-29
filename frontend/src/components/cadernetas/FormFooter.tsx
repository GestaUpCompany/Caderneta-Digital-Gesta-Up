import { Brush, Save } from 'lucide-react'

interface FormFooterProps {
  onSalvar: () => void
  onLimpar?: () => void
  salvando?: boolean
  disabled?: boolean
  salvarLabel?: string
  /** true: mostra "Tudo preenchido". false: mostra mensagem de pendencia */
  formValido?: boolean
  /** Texto de pendencia customizado, ex: "Falta responder: curral limpo" */
  pendenciaTexto?: string
}

/**
 * Rodape padrao das cadernetas: SALVAR verde grande, LIMPAR cinza
 * e linha de status centrada.
 */
export default function FormFooter({
  onSalvar,
  onLimpar,
  salvando = false,
  disabled = false,
  salvarLabel = 'SALVAR',
  formValido = true,
  pendenciaTexto,
}: FormFooterProps) {
  const bloqueado = salvando || disabled
  return (
    <div className="flex flex-col gap-2.5">
      <button
        type="button"
        onClick={onSalvar}
        disabled={bloqueado}
        className={`w-full !min-h-0 rounded-2xl px-3 py-4 text-base font-bold transition-colors active:scale-[0.99] ${
          bloqueado
            ? 'cursor-not-allowed bg-gray-100 text-gray-400'
            : 'bg-green-600 text-white hover:bg-green-700'
        }`}
      >
        <span className="inline-flex items-center justify-center gap-2">
          <Save className="h-5 w-5" strokeWidth={2.5} />
          {salvando ? 'SALVANDO...' : salvarLabel}
        </span>
      </button>
      {onLimpar && (
        <button
          type="button"
          onClick={onLimpar}
          className="w-full !min-h-0 rounded-2xl bg-gray-200 px-3 py-3 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-300 active:scale-[0.99]"
        >
          <span className="inline-flex items-center justify-center gap-2">
            <Brush className="h-4 w-4" strokeWidth={2.5} />
            LIMPAR
          </span>
        </button>
      )}
      <p className={`text-center text-sm font-medium ${formValido ? 'text-gray-500' : 'text-gray-600'}`}>
        {formValido ? (
          'Tudo preenchido ✓'
        ) : (
          <>
            <span className="text-red-500">* </span>
            {pendenciaTexto ?? 'Preencha todos os campos obrigatórios para salvar'}
          </>
        )}
      </p>
    </div>
  )
}

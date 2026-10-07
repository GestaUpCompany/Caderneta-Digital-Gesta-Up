import { useNavigate } from 'react-router-dom'

interface ValidationMessageProps {
  errors: { field: string; message: string }[]
}

export default function ValidationMessage({ errors }: ValidationMessageProps) {
  const navigate = useNavigate()
  if (errors.length === 0) return null

  const nomeUsuarioError = errors.find(e => e.field === 'nome_usuario')

  if (nomeUsuarioError) {
    return (
      <div data-validation-banner className="bg-red-50 border border-red-300 rounded-lg p-4 shadow-sm">
        <div className="flex items-start gap-2">
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">{nomeUsuarioError.message}</p>
            <button
              onClick={() => navigate('/configuracoes')}
              className="mt-2 text-sm font-bold text-red-700 underline hover:text-red-900"
            >
              Ir para Configurações
            </button>
          </div>
        </div>
      </div>
    )
  }

  const genericCount = errors.filter(e => !e.message || e.message === 'Campo obrigatório').length
  const detalhes = [...new Set(errors.map(e => e.message).filter(m => m && m !== 'Campo obrigatório'))]

  return (
    <div data-validation-banner className="bg-red-50 border border-red-300 rounded-lg p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <span className="text-xl">⚠️</span>
        <div className="flex-1">
          {genericCount > 0 && (
            <p className="text-sm font-semibold text-red-800">
              {genericCount} {genericCount === 1 ? 'campo obrigatório' : 'campos obrigatórios'}
            </p>
          )}
          {detalhes.length > 0 && (
            <ul className={genericCount > 0 ? 'mt-1 space-y-0.5' : 'space-y-0.5'}>
              {detalhes.map(m => (
                <li key={m} className="text-sm font-semibold text-red-800">{m}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

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
      <div className="bg-red-50 border border-red-300 rounded-lg p-4 shadow-sm">
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

  return (
    <div className="bg-red-50 border border-red-300 rounded-lg p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-xl">⚠️</span>
        <p className="text-sm font-semibold text-red-800">
          {errors.length} {errors.length === 1 ? 'campo obrigatório' : 'campos obrigatórios'}
        </p>
      </div>
    </div>
  )
}

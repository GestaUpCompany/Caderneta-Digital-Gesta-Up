import { FEATURE_ACCESS, type FeatureKey } from '../config/features'

interface FeatureLockProps {
  feature: FeatureKey
  fazendaId: string
  children: React.ReactNode
}

export default function FeatureLock({ feature, fazendaId, children }: FeatureLockProps) {
  const allowedFazendas = FEATURE_ACCESS[feature] || []
  const hasAccess = allowedFazendas.includes(fazendaId)

  if (hasAccess) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 shadow-lg border border-gray-100 max-w-md w-full text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h2 className="text-2xl font-black text-gray-900 mb-3">EM BREVE</h2>
        <p className="text-gray-600 mb-6">
          Esta funcionalidade ainda não está disponível para esta fazenda.
          Entre em contato com o suporte para mais informações.
        </p>
        <button
          onClick={() => window.history.back()}
          className="w-full bg-[#3b82f6] text-white font-bold py-3 rounded-xl hover:bg-[#2563eb] transition-colors"
        >
          VOLTAR
        </button>
      </div>
    </div>
  )
}

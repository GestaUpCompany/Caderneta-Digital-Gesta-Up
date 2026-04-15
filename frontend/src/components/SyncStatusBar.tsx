import { useSelector } from 'react-redux'
import { RootState } from '../store/store'

const STATUS_CONFIG = {
  online: { bg: 'bg-green-700', icon: '✅', label: 'SINCRONIZADO' },
  offline: { bg: 'bg-gray-700', icon: '📵', label: 'SEM INTERNET' },
  syncing: { bg: 'bg-blue-700', icon: '🔄', label: 'SINCRONIZANDO...' },
  conflict: { bg: 'bg-yellow-500', icon: '⚠️', label: 'CONFLITO' },
  error: { bg: 'bg-red-700', icon: '❌', label: 'ERRO' },
} as const

export default function SyncStatusBar() {
  const { status, pendingCount, errorMessage } = useSelector(
    (state: RootState) => state.sync
  )

  const config = STATUS_CONFIG[status]

  // Só mostrar quando houver erro ou offline
  if (status !== 'error' && status !== 'offline') {
    return null
  }

  return (
    <div className={`${config.bg} text-white px-4 py-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{config.icon}</span>
          <span className="text-sm font-bold">{config.label}</span>
          {pendingCount > 0 && (
            <span className="bg-white text-gray-900 text-xs font-bold px-2 py-0.5 rounded-full">
              {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {status === 'error' && errorMessage && (
        <p className="text-xs mt-1 opacity-90">{errorMessage}</p>
      )}

      {status === 'offline' && (
        <p className="text-[12px] mt-1 opacity-90">
          Não se preocupe, use o aplicativo à vontade. Nenhum registro será perdido.
        </p>
      )}
    </div>
  )
}

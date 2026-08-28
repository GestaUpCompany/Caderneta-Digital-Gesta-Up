import { useCadastroSyncState } from '../hooks/useCadastroSyncState'

/**
 * Overlay global que bloqueia toda interação com o app enquanto o sync de
 * cadastro (warm cache) está em andamento. Impede que o usuário navegue para
 * telas que dependem do cache antes que ele esteja totalmente reconstruído.
 */
export default function CadastroSyncOverlay() {
  const { active, current, total, item } = useCadastroSyncState()

  if (!active) return null

  const pct = total > 0 ? Math.min((current / total) * 100, 100) : 0

  return (
    <div className="fixed inset-0 z-[9998] bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-6 mx-6 max-w-sm w-full">
        <div className="flex flex-col items-center gap-4">
          <span className="text-4xl animate-spin">⏳</span>
          <p className="text-base font-semibold text-gray-900 text-center">
            Preparando dados para uso offline...
          </p>
          {total > 0 && (
            <>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {item && (
                <p className="text-xs text-gray-500 text-center truncate w-full">
                  {item}
                </p>
              )}
            </>
          )}
          <p className="text-xs text-gray-400 text-center">
            Aguarde, não feche o app.
          </p>
        </div>
      </div>
    </div>
  )
}

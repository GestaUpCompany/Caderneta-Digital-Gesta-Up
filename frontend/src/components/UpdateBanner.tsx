import { useEffect, useState } from 'react'

export const UpdateBanner = () => {
  const [showUpdate, setShowUpdate] = useState(false)
  const [newWorker, setNewWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload()
      })

      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'UPDATE_AVAILABLE') {
          setShowUpdate(true)
          setNewWorker(event.data.sw)
        }
      })
    }
  }, [])

  const handleUpdate = () => {
    if (newWorker) {
      newWorker.postMessage({ type: 'SKIP_WAITING' })
    }
  }

  if (!showUpdate) return null

  return (
    <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-4 z-50">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div>
          <p className="font-bold">Nova versão disponível!</p>
          <p className="text-sm">Atualize para obter as melhorias mais recentes.</p>
        </div>
        <button
          onClick={handleUpdate}
          className="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-gray-100"
        >
          Atualizar Agora
        </button>
      </div>
    </div>
  )
}

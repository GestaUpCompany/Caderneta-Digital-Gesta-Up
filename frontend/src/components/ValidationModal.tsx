interface ValidationModalProps {
  isOpen: boolean
  status: 'validating' | 'success'
  onClose?: () => void
}

export default function ValidationModal({ isOpen, status, onClose }: ValidationModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-4">
        {status === 'validating' ? (
          <>
            <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-lg font-bold text-gray-900 text-center">Validando configurações...</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-bold text-green-800 text-center">Validado!</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function PageLoader() {
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 shadow-lg text-center">
        <span className="text-6xl block mb-4">📚</span>
        <p className="text-xl font-bold text-gray-800 mb-2">Carregando caderneta...</p>
        <div className="flex items-center justify-center gap-2">
          <span 
            className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce"
            style={{ 
              animationDelay: '0ms',
              opacity: 0,
              animation: 'bounce 0.5s infinite 0.3s, fadeIn 0.3s forwards 0.1s'
            }} 
          />
          <span 
            className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce"
            style={{ 
              animationDelay: '150ms',
              opacity: 0,
              animation: 'bounce 0.5s infinite 0.45s, fadeIn 0.3s forwards 0.25s'
            }} 
          />
          <span 
            className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce"
            style={{ 
              animationDelay: '300ms',
              opacity: 0,
              animation: 'bounce 0.5s infinite 0.6s, fadeIn 0.3s forwards 0.4s'
            }} 
          />
        </div>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
      </div>
    </div>
  )
}

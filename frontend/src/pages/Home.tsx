import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-black flex flex-col">
      <header className="bg-black text-white text-center py-6 border-b-2 border-yellow-400">
        <h1 className="text-2xl font-bold">CADERNETAS DIGITAIS</h1>
      </header>

      <main className="flex-1 p-4 grid grid-cols-2 gap-4">
        <button className="caderneta-card flex flex-col items-center justify-center gap-2 min-h-[120px]">
          <span className="text-4xl">🐄</span>
          <span className="text-lg font-bold text-center">MATERNIDADE</span>
        </button>

        <button className="caderneta-card flex flex-col items-center justify-center gap-2 min-h-[120px]">
          <span className="text-4xl">🌾</span>
          <span className="text-lg font-bold text-center">TROCA DE PASTOS</span>
        </button>

        <button className="caderneta-card flex flex-col items-center justify-center gap-2 min-h-[120px]">
          <span className="text-4xl">🤠</span>
          <span className="text-lg font-bold text-center">RODEIO GADO</span>
        </button>

        <button className="caderneta-card flex flex-col items-center justify-center gap-2 min-h-[120px]">
          <span className="text-4xl">🥄</span>
          <span className="text-lg font-bold text-center">SUPLEMENTAÇÃO</span>
        </button>

        <button className="caderneta-card flex flex-col items-center justify-center gap-2 min-h-[120px]">
          <span className="text-4xl">💧</span>
          <span className="text-lg font-bold text-center">BEBEDOUROS</span>
        </button>

        <button className="caderneta-card flex flex-col items-center justify-center gap-2 min-h-[120px]">
          <span className="text-4xl">🚚</span>
          <span className="text-lg font-bold text-center">MOVIMENTAÇÃO</span>
        </button>
      </main>

      <footer className="p-4 bg-gray-900">
        <button
          onClick={() => navigate('/configuracoes')}
          className="w-full bg-gray-700 text-white font-bold py-4 rounded-xl text-lg"
        >
          ⚙️ CONFIGURAÇÕES
        </button>
      </footer>
    </div>
  )
}

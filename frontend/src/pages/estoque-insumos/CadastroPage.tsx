import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'

export default function CadastroPage() {
  const navigate = useNavigate()
  const { fazenda, logoUrl } = useSelector((state: RootState) => state.config)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      // TODO: Load data from Supabase instead of Google Sheets
      setError('Funcionalidade em migração para Supabase')
      setLoading(false)
    }

    loadData()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-[#1a3a2a] text-white py-6 border-b-4 border-yellow-400 relative">
        <div className="flex flex-col items-center gap-3 px-4 desktop-form-container">
          <div className="flex items-center justify-between w-full">
            <FarmLogo
              farmName={fazenda}
              logoUrl={logoUrl}
              type="both"
              size="medium"
              className="justify-between w-full"
            />
          </div>
          {fazenda && (
            <h1 className="text-2xl font-bold text-white">{fazenda.toUpperCase()}</h1>
          )}
          <div className="flex items-center gap-3 w-full relative">
            <button
              onClick={() => navigate('/modulos/insumos')}
              className="text-yellow-400 font-bold text-sm min-h-[40px] px-3 absolute left-0"
            >
              VOLTAR
            </button>
            <p className="text-white text-base font-semibold flex-1 text-center">VISUALIZAR CADASTROS</p>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1 p-4 desktop-form-container">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-4xl animate-spin">⏳</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-6 text-center">
            <p className="text-xl font-bold text-red-800 mb-4">
              ERRO
            </p>
            <p className="text-lg text-gray-700">{error}</p>
          </div>
        ) : null}
      </main>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Button } from '../components/ui'
import FarmLogo from '../components/FarmLogo'
import { RootState } from '../store/store'

export default function RelatoriosPage() {
  const navigate = useNavigate()
  const { fazenda } = useSelector((state: RootState) => state.config)

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1a3a2a] text-white px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-yellow-400 font-bold text-sm min-h-[40px] px-3"
          >
            VOLTAR
          </button>
          <h1 className="text-base font-bold absolute left-1/2 -translate-x-1/2">RELATÓRIOS</h1>
          <div className="w-16" />
        </div>
      </div>

      {/* Logos */}
      <div className="bg-[#1a3a2a] text-white px-4 py-5">
        <div className="flex items-center justify-center gap-8">
          <FarmLogo
            farmName={fazenda}
            type="both"
            size="medium"
          />
        </div>
      </div>

      <main className="flex-1 p-4 flex flex-col gap-5 pb-8">
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
          <h2 className="text-lg font-black text-gray-900 tracking-tight mb-4">
            RELATÓRIOS DISPONÍVEIS
          </h2>
          <p className="text-gray-600 mb-6">
            Selecione um relatório para visualizar ou exportar.
          </p>
          
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => navigate('/modulos/cadernetas')}
              variant="primary"
              icon="📊"
            >
              RELATÓRIO DE CADERNETAS
            </Button>
            
            <Button 
              onClick={() => navigate('/modulos/insumos')}
              variant="secondary"
              icon="📋"
            >
              RELATÓRIO DE CHECKLISTS
            </Button>
          </div>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-6 text-center">
          <p className="text-base font-semibold text-yellow-800">
            🚧 Mais relatórios em breve
          </p>
        </div>
      </main>
    </div>
  )
}

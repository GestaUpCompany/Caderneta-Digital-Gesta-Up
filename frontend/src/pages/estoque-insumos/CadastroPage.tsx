import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import FarmLogo from '../../components/FarmLogo'
import { loadCadastroData, CadastroData } from '../../services/cadastroData'

export default function CadastroPage() {
  const navigate = useNavigate()
  const { fazenda, cadastroSheetUrl } = useSelector((state: RootState) => state.config)
  const [data, setData] = useState<CadastroData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      if (!cadastroSheetUrl) {
        setError('URL da planilha de cadastro não configurada')
        setLoading(false)
        return
      }

      try {
        const cadastroData = await loadCadastroData(cadastroSheetUrl)
        setData(cadastroData)
        setLoading(false)
      } catch (err) {
        setError('Erro ao carregar dados de cadastro')
        setLoading(false)
      }
    }

    loadData()
  }, [cadastroSheetUrl])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-[#1a3a2a] text-white py-6 border-b-4 border-yellow-400 relative">
        <div className="flex flex-col items-center gap-3 px-4">
          <div className="flex items-center justify-between w-full">
            <FarmLogo
              farmName={fazenda}
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
      <main className="flex-1 p-4">
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
        ) : data ? (
          <div className="space-y-6">
            {/* Pastos */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                PASTOS
              </h2>
              {data.pastos.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {data.pastos.map((pasto, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 text-gray-900">
                      {pasto}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">Nenhum pasto cadastrado</p>
              )}
            </div>

            {/* Lotes */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                LOTES
              </h2>
              {data.lotes.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {data.lotes.map((lote, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 text-gray-900">
                      {lote}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">Nenhum lote cadastrado</p>
              )}
            </div>

            {/* Minerais */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                MINERAIS
              </h2>
              {data.minerais.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {data.minerais.map((mineral, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 text-gray-900">
                      {mineral}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">Nenhum mineral cadastrado</p>
              )}
            </div>

            {/* Proteinados */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                PROTEINADOS
              </h2>
              {data.proteinados.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {data.proteinados.map((proteinado, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 text-gray-900">
                      {proteinado}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">Nenhum proteinado cadastrado</p>
              )}
            </div>

            {/* Rações */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                RAÇÕES
              </h2>
              {data.racoes.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {data.racoes.map((racao, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 text-gray-900">
                      {racao}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">Nenhuma ração cadastrada</p>
              )}
            </div>

            {/* Insumos */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                INSUMOS
              </h2>
              {data.insumos.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {data.insumos.map((insumo, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 text-gray-900">
                      {insumo}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">Nenhum insumo cadastrado</p>
              )}
            </div>

            {/* Dietas */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                DIETAS
              </h2>
              {data.dietas.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {data.dietas.map((dieta, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 text-gray-900">
                      {dieta}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">Nenhuma dieta cadastrada</p>
              )}
            </div>

            {/* Fornecedores */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                FORNECEDORES
              </h2>
              {data.fornecedores.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {data.fornecedores.map((fornecedor, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 text-gray-900">
                      {fornecedor}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">Nenhum fornecedor cadastrado</p>
              )}
            </div>

            {/* Funcionários */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                FUNCIONÁRIOS
              </h2>
              {data.funcionarios.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {data.funcionarios.map((funcionario, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-3 text-gray-900">
                      {funcionario}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 italic">Nenhum funcionário cadastrado</p>
              )}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LOGO_URL, DATABASE_URL } from '../../utils/constants'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { BACKEND_URL } from '../../utils/constants'
import FarmLogo from '../../components/FarmLogo'

interface CadastroData {
  insumos: string[]
  dietas: string[]
  fornecedores: string[]
  funcionarios: string[]
}

export default function CadastroPage() {
  const navigate = useNavigate()
  const { fazenda, fazendaId, planilhaUrl } = useSelector((state: RootState) => state.config)
  const [data, setData] = useState<CadastroData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadCadastroData = async () => {
      if (!planilhaUrl) {
        setError('URL da planilha não configurada')
        setLoading(false)
        return
      }

      try {
        // Validar fazenda na planilha base para obter URL da planilha de insumos com prefixo 'Insumo'
        const validateRes = await fetch(`${BACKEND_URL}/api/sheets/validate-farm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planilhaUrl: DATABASE_URL, farmId: fazendaId || fazenda, prefix: 'Insumo' }),
        })

        const validateData = await validateRes.json()
        if (!validateData.success || !validateData.farmSheetUrl) {
          setError('Não foi possível obter a URL da planilha de insumos')
          setLoading(false)
          return
        }

        // Ler dados da página "Cadastro"
        const readRes = await fetch(`${BACKEND_URL}/api/insumos/cadastro`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ insumosSheetUrl: validateData.farmSheetUrl }),
        })

        const readData = await readRes.json()
        if (!readData.success || !readData.rows) {
          setError('Não foi possível ler os dados de cadastro')
          setLoading(false)
          return
        }

        // Processar dados (assumindo que cada linha representa uma categoria)
        const rows = readData.rows as (string | number | null)[][]
        const cadastroData: CadastroData = {
          insumos: [],
          dietas: [],
          fornecedores: [],
          funcionarios: [],
        }

        // Assumindo estrutura: coluna 0 = Insumos, coluna 1 = Dietas, coluna 2 = Fornecedores, coluna 3 = Funcionários
        for (const row of rows) {
          if (row[0]) cadastroData.insumos.push(String(row[0]))
          if (row[1]) cadastroData.dietas.push(String(row[1]))
          if (row[2]) cadastroData.fornecedores.push(String(row[2]))
          if (row[3]) cadastroData.funcionarios.push(String(row[3]))
        }

        setData(cadastroData)
        setLoading(false)
      } catch (err) {
        setError('Erro ao carregar dados de cadastro')
        setLoading(false)
      }
    }

    loadCadastroData()
  }, [planilhaUrl, fazenda])

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
            {/* Insumos */}
            <div className="bg-white rounded-2xl p-6 shadow-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-3xl">📦</span>
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
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-3xl">🥗</span>
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
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-3xl">🏢</span>
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
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="text-3xl">👷</span>
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

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LOGO_URL, DATABASE_URL } from '../../utils/constants'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { BACKEND_URL } from '../../utils/constants'
import FarmLogo from '../../components/FarmLogo'

interface CadastroData {
  insumos: string[]
  fornecedores: string[]
  funcionarios: string[]
}

interface FormData {
  dataEntrada: string
  horario: string
  produto: string
  quantidade: string
  valorUnitario: string
  valorTotal: string
  notaFiscal: string
  fornecedor: string
  placa: string
  motorista: string
  responsavelRecebimento: string
}

export default function EntradaPage() {
  const navigate = useNavigate()
  const { fazenda, fazendaId, planilhaUrl } = useSelector((state: RootState) => state.config)
  const [cadastroData, setCadastroData] = useState<CadastroData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [form, setForm] = useState<FormData>({
    dataEntrada: '',
    horario: '',
    produto: '',
    quantidade: '',
    valorUnitario: '',
    valorTotal: '',
    notaFiscal: '',
    fornecedor: '',
    placa: '',
    motorista: '',
    responsavelRecebimento: '',
  })

  useEffect(() => {
    const loadCadastroData = async () => {
      if (!planilhaUrl) {
        setError('URL da planilha não configurada')
        setLoading(false)
        return
      }

      try {
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

        const rows = readData.rows as (string | number | null)[][]
        const data: CadastroData = {
          insumos: [],
          fornecedores: [],
          funcionarios: [],
        }

        for (const row of rows) {
          if (row[0]) data.insumos.push(String(row[0]))
          if (row[2]) data.fornecedores.push(String(row[2]))
          if (row[3]) data.funcionarios.push(String(row[3]))
        }

        setCadastroData(data)
        setLoading(false)
      } catch (err) {
        setError('Erro ao carregar dados de cadastro')
        setLoading(false)
      }
    }

    loadCadastroData()
  }, [planilhaUrl, fazenda])

  useEffect(() => {
    const quantidade = parseFloat(form.quantidade) || 0
    const valorUnitario = parseFloat(form.valorUnitario) || 0
    const total = quantidade * valorUnitario
    setForm(prev => ({ ...prev, valorTotal: total.toFixed(2) }))
  }, [form.quantidade, form.valorUnitario])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const validateRes = await fetch(`${BACKEND_URL}/api/sheets/validate-farm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planilhaUrl: DATABASE_URL, farmId: fazendaId || fazenda, prefix: 'Insumo' }),
      })

      const validateData = await validateRes.json()
      if (!validateData.success || !validateData.farmSheetUrl) {
        setError('Não foi possível obter a URL da planilha de insumos')
        setSaving(false)
        return
      }

      const values = [
        form.dataEntrada,
        form.horario,
        form.produto,
        form.quantidade,
        form.valorUnitario,
        form.valorTotal,
        form.notaFiscal,
        form.fornecedor,
        form.placa,
        form.motorista,
        form.responsavelRecebimento,
      ]

      const saveRes = await fetch(`${BACKEND_URL}/api/insumos/entrada`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insumosSheetUrl: validateData.farmSheetUrl,
          values,
        }),
      })

      const saveData = await saveRes.json()
      if (!saveData.success) {
        setError('Erro ao salvar entrada de insumos')
        setSaving(false)
        return
      }

      setSuccess(true)
      setSaving(false)
      setTimeout(() => {
        navigate('/modulos/insumos')
      }, 2000)
    } catch (err) {
      setError('Erro ao salvar entrada de insumos')
      setSaving(false)
    }
  }

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
            <p className="text-white text-base font-semibold flex-1 text-center">ENTRADA DE INSUMOS</p>
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
            <p className="text-xl font-bold text-red-800 mb-4">ERRO</p>
            <p className="text-lg text-gray-700">{error}</p>
          </div>
        ) : success ? (
          <div className="bg-green-50 border-2 border-green-400 rounded-2xl p-6 text-center">
            <p className="text-xl font-bold text-green-800 mb-4">SUCESSO</p>
            <p className="text-lg text-gray-700">Entrada de insumos salva com sucesso!</p>
            <p className="text-sm text-gray-600 mt-2">Redirecionando...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Data Entrada */}
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Data Entrada *
              </label>
              <input
                type="date"
                value={form.dataEntrada}
                onChange={(e) => setForm({ ...form, dataEntrada: e.target.value })}
                required
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Horário */}
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Horário *
              </label>
              <input
                type="time"
                value={form.horario}
                onChange={(e) => setForm({ ...form, horario: e.target.value })}
                required
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Produto */}
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Produto *
              </label>
              <select
                value={form.produto}
                onChange={(e) => setForm({ ...form, produto: e.target.value })}
                required
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="">Selecione um insumo</option>
                {cadastroData?.insumos.map((insumo, index) => (
                  <option key={index} value={insumo}>{insumo}</option>
                ))}
              </select>
            </div>

            {/* Quantidade */}
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Quantidade (kg) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.quantidade}
                onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                required
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Valor Unitário */}
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Valor Unitário (kg) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.valorUnitario}
                onChange={(e) => setForm({ ...form, valorUnitario: e.target.value })}
                required
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Valor Total */}
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Valor Total
              </label>
              <input
                type="text"
                value={form.valorTotal}
                readOnly
                className="w-full p-3 border-2 border-gray-300 rounded-lg bg-gray-50 text-gray-900"
              />
            </div>

            {/* N° Nota Fiscal */}
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                N° Nota Fiscal *
              </label>
              <input
                type="text"
                value={form.notaFiscal}
                onChange={(e) => setForm({ ...form, notaFiscal: e.target.value })}
                required
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Fornecedor */}
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Fornecedor *
              </label>
              <select
                value={form.fornecedor}
                onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
                required
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="">Selecione um fornecedor</option>
                {cadastroData?.fornecedores.map((fornecedor, index) => (
                  <option key={index} value={fornecedor}>{fornecedor}</option>
                ))}
              </select>
            </div>

            {/* Placa */}
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Placa *
              </label>
              <input
                type="text"
                value={form.placa}
                onChange={(e) => setForm({ ...form, placa: e.target.value })}
                required
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Motorista */}
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Motorista *
              </label>
              <input
                type="text"
                value={form.motorista}
                onChange={(e) => setForm({ ...form, motorista: e.target.value })}
                required
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Responsável Recebimento */}
            <div className="bg-white rounded-2xl p-4 shadow-md">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Responsável Recebimento *
              </label>
              <select
                value={form.responsavelRecebimento}
                onChange={(e) => setForm({ ...form, responsavelRecebimento: e.target.value })}
                required
                className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                <option value="">Selecione um funcionário</option>
                {cadastroData?.funcionarios.map((funcionario, index) => (
                  <option key={index} value={funcionario}>{funcionario}</option>
                ))}
              </select>
            </div>

            {/* Botões */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate('/modulos/insumos')}
                className="flex-1 bg-gray-500 text-white py-3 rounded-xl font-bold hover:bg-gray-600 transition-colors"
              >
                CANCELAR
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-[#3b82f6] text-white py-3 rounded-xl font-bold hover:bg-[#2563eb] transition-colors disabled:opacity-50"
              >
                {saving ? 'SALVANDO...' : 'SALVAR'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}

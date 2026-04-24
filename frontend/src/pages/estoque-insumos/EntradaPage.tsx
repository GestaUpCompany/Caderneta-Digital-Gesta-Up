import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DATABASE_URL } from '../../utils/constants'
import { useSelector } from 'react-redux'
import { RootState } from '../../store/store'
import { BACKEND_URL } from '../../utils/constants'
import FarmLogo from '../../components/FarmLogo'
import { Input, Select, DatePicker, Button } from '../../components/ui'

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
  const [isHorarioManual, setIsHorarioManual] = useState(false)

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

  // Atualiza horário automaticamente a cada minuto se não foi editado pelo usuário
  useEffect(() => {
    if (isHorarioManual) return

    // Inicializa com hora atual
    const agora = new Date()
    const horaAtual = agora.toTimeString().slice(0, 5) // HH:MM
    setForm(prev => ({ ...prev, horario: horaAtual }))

    // Atualiza a cada minuto
    const interval = setInterval(() => {
      const novoAgora = new Date()
      const novaHora = novoAgora.toTimeString().slice(0, 5)
      setForm(prev => ({ ...prev, horario: novaHora }))
    }, 60000) // 1 minuto

    return () => clearInterval(interval)
  }, [isHorarioManual])

  // Marca horário como manual quando usuário altera
  const handleHorarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsHorarioManual(true)
    setForm({ ...form, horario: e.target.value })
  }

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
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-8">
            {/* Seção 1: Dados da Entrada */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">1. DADOS DA ENTRADA</h2>
              <DatePicker
                label="DATA DE ENTRADA"
                value={form.dataEntrada}
                onChange={(val) => setForm({ ...form, dataEntrada: val })}
              />
              
              {/* Horário - mantido como input nativo */}
              <div>
                <label className="block text-lg font-bold text-gray-900 mb-2">
                  HORÁRIO *
                </label>
                <input
                  type="time"
                  value={form.horario}
                  onChange={handleHorarioChange}
                  required
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                />
                {!isHorarioManual && (
                  <p className="mt-1 text-sm text-gray-500">Atualiza automaticamente</p>
                )}
              </div>
            </div>

            {/* Seção 2: Produto e Quantidade */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">2. PRODUTO E QUANTIDADE</h2>
              <Select
                label="PRODUTO *"
                value={form.produto}
                onChange={(e) => setForm({ ...form, produto: e.target.value })}
                options={[{ value: '', label: 'Selecione um insumo' }, ...(cadastroData?.insumos.map(i => ({ value: i, label: i })) || [])]}
              />
              <Input
                label="QUANTIDADE (kg) *"
                type="number"
                step="0.01"
                min="0"
                value={form.quantidade}
                onChange={(e) => setForm({ ...form, quantidade: e.target.value })}
                inputMode="decimal"
              />
              <Input
                label="VALOR UNITÁRIO (R$/kg) *"
                type="number"
                step="0.01"
                min="0"
                value={form.valorUnitario}
                onChange={(e) => setForm({ ...form, valorUnitario: e.target.value })}
                inputMode="decimal"
              />
              <Input
                label="VALOR TOTAL (R$)"
                value={form.valorTotal}
                readOnly
              />
            </div>

            {/* Seção 3: Documentação */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">3. DOCUMENTAÇÃO</h2>
              <Input
                label="N° NOTA FISCAL *"
                value={form.notaFiscal}
                onChange={(e) => setForm({ ...form, notaFiscal: e.target.value })}
              />
              <Select
                label="FORNECEDOR *"
                value={form.fornecedor}
                onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
                options={[{ value: '', label: 'Selecione um fornecedor' }, ...(cadastroData?.fornecedores.map(f => ({ value: f, label: f })) || [])]}
              />
            </div>

            {/* Seção 4: Transporte */}
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 flex flex-col gap-5">
              <h2 className="text-lg font-black text-gray-900 tracking-tight">4. TRANSPORTE</h2>
              <Input
                label="PLACA *"
                value={form.placa}
                onChange={(e) => setForm({ ...form, placa: e.target.value })}
              />
              <Input
                label="MOTORISTA *"
                value={form.motorista}
                onChange={(e) => setForm({ ...form, motorista: e.target.value })}
              />
              <Select
                label="RESPONSÁVEL RECEBIMENTO *"
                value={form.responsavelRecebimento}
                onChange={(e) => setForm({ ...form, responsavelRecebimento: e.target.value })}
                options={[{ value: '', label: 'Selecione um funcionário' }, ...(cadastroData?.funcionarios.map(f => ({ value: f, label: f })) || [])]}
              />
            </div>

            {/* Botões */}
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <Button onClick={() => navigate('/modulos/insumos')} variant="secondary" icon="🚫">
                CANCELAR
              </Button>
              <Button type="submit" variant="success" loading={saving} icon="💾">
                SALVAR
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}

import { useState, useMemo } from 'react'
import type { FuncionarioRBAC } from '../services/funcionarioAuthService'

interface FuncionarioLoginModalProps {
  funcionarios: FuncionarioRBAC[]
  fazendaId: string
  onLogin: (funcionario: FuncionarioRBAC) => void
  lastFuncionario?: FuncionarioRBAC | null
  onSwitchUser?: () => void
  pinOnly?: boolean
}

function getInitials(nome: string): string {
  const parts = nome.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function stringToColor(str: string): string {
  const colors = [
    'bg-red-500', 'bg-green-600', 'bg-blue-500', 'bg-yellow-500',
    'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
    'bg-orange-500', 'bg-cyan-600', 'bg-lime-600', 'bg-rose-500',
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export default function FuncionarioLoginModal({
  funcionarios,
  fazendaId,
  onLogin,
  lastFuncionario,
  onSwitchUser,
  pinOnly = false,
}: FuncionarioLoginModalProps) {
  const [selected, setSelected] = useState<FuncionarioRBAC | null>(lastFuncionario || null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { validarPinFuncionario } = useMemo(() => {
    return {
      validarPinFuncionario: async (pin: string, funcionario: FuncionarioRBAC) => {
        const { validarPinFuncionario } = await import('../services/funcionarioAuthService')
        return validarPinFuncionario(funcionario, pin, fazendaId)
      },
    }
  }, [fazendaId])

  const handleSelect = (f: FuncionarioRBAC) => {
    setSelected(f)
    setPin('')
    setError('')
  }

  const handlePinDigit = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit)
      setError('')
    }
  }

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1))
    setError('')
  }

  const handleClear = () => {
    setPin('')
    setError('')
  }

  const handleConfirm = async () => {
    if (!selected || pin.length < 4) {
      setError('Digite o PIN completo')
      return
    }
    setLoading(true)
    try {
      const ok = await validarPinFuncionario(pin, selected)
      if (ok) {
        onLogin(selected)
      } else {
        setError('PIN incorreto')
        setPin('')
      }
    } catch (err) {
      console.error('Erro ao validar PIN:', err)
      setError('Erro ao validar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleVoltar = () => {
    setSelected(null)
    setPin('')
    setError('')
    if (pinOnly && onSwitchUser) {
      onSwitchUser()
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#1a3a2a] overflow-hidden">
      <div className="flex-1 flex flex-col items-center p-6 overflow-y-auto overscroll-contain">
        {!selected ? (
          <div className="w-full max-w-md my-auto">
            <h2 className="text-2xl font-black text-white text-center mb-2">QUEM ESTÁ USANDO?</h2>
            <p className="text-center text-yellow-400 mb-8 text-sm font-semibold">
              Toque no seu nome
            </p>
            <div className="grid grid-cols-2 gap-4">
              {funcionarios.map((f) => {
                const colorClass = stringToColor(f.id)
                return (
                  <button
                    key={f.id}
                    onClick={() => handleSelect(f)}
                    className="flex flex-col items-center gap-3 bg-white rounded-2xl p-5 active:scale-95 transition-transform"
                  >
                    <div className={`w-20 h-20 rounded-full ${colorClass} flex items-center justify-center text-white text-2xl font-black shadow-lg`}>
                      {getInitials(f.nome)}
                    </div>
                    <span className="text-gray-900 font-bold text-center text-base leading-tight">
                      {f.nome}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            <div className="flex flex-col items-center mb-8">
              <div className={`w-24 h-24 rounded-full ${stringToColor(selected.id)} flex items-center justify-center text-white text-3xl font-black shadow-lg mb-4`}>
                {getInitials(selected.nome)}
              </div>
              <h2 className="text-2xl font-black text-white text-center">{selected.nome}</h2>
              <p className="text-yellow-400 text-sm font-semibold mt-1">Digite seu PIN</p>
            </div>

            <div className="flex justify-center gap-3 mb-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 ${i < pin.length ? 'bg-yellow-400 border-yellow-400' : 'border-white'}`}
                />
              ))}
            </div>

            {error && (
              <p className="text-center text-red-400 font-bold mb-4">{error}</p>
            )}

            <div className="grid grid-cols-3 gap-3 mb-6">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handlePinDigit(digit)}
                  disabled={loading}
                  className="bg-white text-[#1a3a2a] text-3xl font-black py-5 rounded-2xl active:bg-yellow-400 active:scale-95 transition-all disabled:opacity-50"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={handleVoltar}
                disabled={loading}
                className="bg-gray-600 text-white text-lg font-bold py-5 rounded-2xl active:bg-gray-500 transition-all disabled:opacity-50"
              >
                {pinOnly ? 'TROCAR USUÁRIO' : 'VOLTAR'}
              </button>
              <button
                onClick={() => handlePinDigit('0')}
                disabled={loading}
                className="bg-white text-[#1a3a2a] text-3xl font-black py-5 rounded-2xl active:bg-yellow-400 active:scale-95 transition-all disabled:opacity-50"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                disabled={loading}
                className="bg-gray-600 text-white text-lg font-bold py-5 rounded-2xl active:bg-gray-500 transition-all disabled:opacity-50"
              >
                APAGAR
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClear}
                disabled={loading || pin.length === 0}
                className="flex-1 bg-gray-600 text-white font-bold py-4 rounded-2xl active:bg-gray-500 transition-all disabled:opacity-50"
              >
                LIMPAR
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || pin.length < 4}
                className="flex-1 bg-yellow-400 text-[#1a3a2a] font-black py-4 rounded-2xl active:bg-yellow-300 transition-all disabled:opacity-50"
              >
                {loading ? '...' : 'ENTRAR'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { desativarModoTeste } from '../services/api'
import { countTestRecords } from '../services/indexedDB'

export default function TestModeBanner() {
  const testModeAtivo = useSelector((state: RootState) => state.config.testModeAtivo)
  const [confirmarDesativar, setConfirmarDesativar] = useState(false)
  const [limpando, setLimpando] = useState(false)
  const [totalTestes, setTotalTestes] = useState(0)

  useEffect(() => {
    if (testModeAtivo) {
      countTestRecords().then(setTotalTestes)
      const interval = setInterval(() => {
        countTestRecords().then(setTotalTestes)
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [testModeAtivo])

  if (!testModeAtivo) return null

  const handleDesativar = async () => {
    setLimpando(true)
    try {
      await desativarModoTeste()
      setConfirmarDesativar(false)
    } catch (err) {
      console.error('[testMode] Erro ao desativar modo teste:', err)
    } finally {
      setLimpando(false)
    }
  }

  if (confirmarDesativar) {
    return (
      <div className="sticky top-0 z-[60] bg-red-600 text-white px-4 py-3 shadow-lg">
        <div className="desktop-form-container flex flex-col gap-2">
          <p className="text-sm font-bold">
            Desativar modo teste e remover {totalTestes} registro(s) de teste?
          </p>
          <p className="text-xs text-red-100">
            Esta ação não pode ser desfeita. Registros reais não serão afetados.
          </p>
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleDesativar}
              disabled={limpando}
              className="bg-white text-red-700 font-bold text-xs rounded-full px-4 py-2 disabled:opacity-50"
            >
              {limpando ? 'LIMPANDO...' : 'SIM, DESATIVAR E LIMPAR'}
            </button>
            <button
              onClick={() => setConfirmarDesativar(false)}
              disabled={limpando}
              className="bg-red-700 border border-white/40 text-white font-semibold text-xs rounded-full px-4 py-2"
            >
              CANCELAR
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sticky top-0 z-[60] bg-amber-500 text-white px-4 py-2 shadow-lg">
      <div className="desktop-form-container flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">🧪</span>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">MODO TESTE ATIVO</p>
            <p className="text-[11px] text-amber-100 leading-tight truncate">
              {totalTestes} registro(s) · não saem do dispositivo · serão descartados ao desativar
            </p>
          </div>
        </div>
        <button
          onClick={() => setConfirmarDesativar(true)}
          className="bg-white/20 hover:bg-white/30 active:bg-white/40 transition-colors text-white font-semibold text-xs rounded-full px-3 py-2 whitespace-nowrap shrink-0"
        >
          DESATIVAR
        </button>
      </div>
    </div>
  )
}

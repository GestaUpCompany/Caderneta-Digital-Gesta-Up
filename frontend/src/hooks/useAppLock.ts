import { useState, useEffect, useCallback, useRef } from 'react'
import type { FuncionarioRBAC } from '../services/funcionarioAuthService'
import { validarPinFuncionario } from '../services/funcionarioAuthService'

const LAST_USER_ID_KEY = 'appLock_lastFuncionarioId'
const LAST_USER_NAME_KEY = 'appLock_lastFuncionarioName'
const LAST_USER_CADERNETAS_KEY = 'appLock_lastFuncionarioCadernetas'
const LAST_ACCESS_AT_KEY = 'appLock_lastAccessAt'

export const APP_LOCK_TRUST_MINUTES = 10
const APP_LOCK_TRUST_MS = APP_LOCK_TRUST_MINUTES * 60 * 1000

export interface AppLockState {
  locked: boolean
  lastFuncionario: FuncionarioRBAC | null
  loading: boolean
  unlock: (pin: string) => Promise<boolean>
  switchUser: () => void
}

function readLastFuncionario(fazendaId: string): FuncionarioRBAC | null {
  try {
    const id = localStorage.getItem(LAST_USER_ID_KEY)
    const name = localStorage.getItem(LAST_USER_NAME_KEY)
    const cadernetasRaw = localStorage.getItem(LAST_USER_CADERNETAS_KEY)
    if (!id || !name) return null

    const cadernetas = cadernetasRaw ? (JSON.parse(cadernetasRaw) as string[]) : []
    return {
      id,
      fazenda_id: fazendaId,
      nome: name,
      cadernetas_permitidas: cadernetas,
      acessa_app: true,
      pin_hash: null,
      ativo: true,
      cargo: null,
    }
  } catch {
    return null
  }
}

function writeLastFuncionario(funcionario: FuncionarioRBAC | null) {
  if (!funcionario) {
    localStorage.removeItem(LAST_USER_ID_KEY)
    localStorage.removeItem(LAST_USER_NAME_KEY)
    localStorage.removeItem(LAST_USER_CADERNETAS_KEY)
    localStorage.removeItem(LAST_ACCESS_AT_KEY)
    return
  }
  localStorage.setItem(LAST_USER_ID_KEY, funcionario.id)
  localStorage.setItem(LAST_USER_NAME_KEY, funcionario.nome)
  localStorage.setItem(LAST_USER_CADERNETAS_KEY, JSON.stringify(funcionario.cadernetas_permitidas || []))
  localStorage.setItem(LAST_ACCESS_AT_KEY, String(Date.now()))
}

function updateLastAccessAt() {
  localStorage.setItem(LAST_ACCESS_AT_KEY, String(Date.now()))
}

function getLastAccessAt(): number {
  try {
    const raw = localStorage.getItem(LAST_ACCESS_AT_KEY)
    return raw ? Number(raw) : 0
  } catch {
    return 0
  }
}

function isWithinTrustInterval(): boolean {
  const lastAccess = getLastAccessAt()
  if (!lastAccess) return false
  return Date.now() - lastAccess < APP_LOCK_TRUST_MS
}

interface UseAppLockParams {
  fazendaId: string
  funcionarioLogado: FuncionarioRBAC | null
  funcionariosDisponiveis: FuncionarioRBAC[]
  onLogin: (funcionario: FuncionarioRBAC) => void
  onLogout: () => void
}

export function useAppLock({
  fazendaId,
  funcionarioLogado,
  funcionariosDisponiveis,
  onLogin,
  onLogout,
}: UseAppLockParams): AppLockState {
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastFuncionario, setLastFuncionario] = useState<FuncionarioRBAC | null>(null)
  const hasCheckedInitialLock = useRef(false)
  const lastLoggedIdRef = useRef<string | null>(null)

  // Rastreia mudanças no funcionarioLogado sem depender do objeto instável
  useEffect(() => {
    const currentId = funcionarioLogado?.id || null
    if (currentId === lastLoggedIdRef.current) return

    lastLoggedIdRef.current = currentId

    if (funcionarioLogado) {
      writeLastFuncionario(funcionarioLogado)
      updateLastAccessAt()
      setLastFuncionario(funcionarioLogado)
      setLocked(false)
    }
  }, [funcionarioLogado])

  // Verifica o bloqueio inicial quando a lista de funcionarios carrega
  useEffect(() => {
    if (hasCheckedInitialLock.current) return
    if (!fazendaId) return

    const alreadyLogged = !!funcionarioLogado?.id
    if (alreadyLogged) {
      hasCheckedInitialLock.current = true
      setLoading(false)
      return
    }

    const last = readLastFuncionario(fazendaId)
    setLastFuncionario(last)

    if (!last) {
      setLocked(false)
      setLoading(false)
      hasCheckedInitialLock.current = true
      return
    }

    if (isWithinTrustInterval()) {
      const fullFuncionario = funcionariosDisponiveis.find(f => f.id === last.id)
      onLogin(fullFuncionario || last)
      setLocked(false)
    } else {
      setLocked(true)
    }

    setLoading(false)
    hasCheckedInitialLock.current = true
  }, [fazendaId, funcionariosDisponiveis, funcionarioLogado?.id, onLogin])

  // Detecta retorno do background e atualiza/bloqueia conforme o intervalo de confiança
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) return
      if (!fazendaId) return

      const currentId = funcionarioLogado?.id || null
      const last = readLastFuncionario(fazendaId)

      if (currentId) {
        // App está logado: verifica se ainda dentro do intervalo de confiança
        if (!isWithinTrustInterval()) {
          setLastFuncionario(last || readLastFuncionario(fazendaId) || null)
          setLocked(true)
          onLogout()
        } else {
          updateLastAccessAt()
        }
        return
      }

      // App não está logado: tenta auto-login se ainda dentro do intervalo
      if (last && isWithinTrustInterval()) {
        const fullFuncionario = funcionariosDisponiveis.find(f => f.id === last.id)
        onLogin(fullFuncionario || last)
      } else if (last) {
        setLastFuncionario(last)
        setLocked(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fazendaId, funcionariosDisponiveis, funcionarioLogado?.id, onLogin, onLogout])

  const unlock = useCallback(
    async (pin: string): Promise<boolean> => {
      const target = lastFuncionario || funcionarioLogado
      if (!target || !fazendaId) return false

      const fullFuncionario = funcionariosDisponiveis.find(f => f.id === target.id)
      const toValidate = fullFuncionario || target

      if (!toValidate.pin_hash) {
        return false
      }

      const ok = await validarPinFuncionario(toValidate, pin, fazendaId)
      if (ok) {
        onLogin(toValidate)
        writeLastFuncionario(toValidate)
        setLocked(false)
      }
      return ok
    },
    [fazendaId, funcionarioLogado, funcionariosDisponiveis, lastFuncionario, onLogin]
  )

  const switchUser = useCallback(() => {
    writeLastFuncionario(null)
    setLastFuncionario(null)
    setLocked(false)
    onLogout()
  }, [onLogout])

  return {
    locked,
    lastFuncionario: lastFuncionario || funcionarioLogado,
    loading,
    unlock,
    switchUser,
  }
}

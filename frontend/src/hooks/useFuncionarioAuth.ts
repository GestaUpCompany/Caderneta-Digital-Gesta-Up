import { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { setConfig } from '../store/slices/configSlice'
import {
  FuncionarioRBAC,
  getFuncionariosComAcessoOnlineFirst,
  clearFuncionariosCache,
} from '../services/funcionarioAuthService'

export interface UseFuncionarioAuthReturn {
  rbacAtivo: boolean
  funcionarioLogado: FuncionarioRBAC | null
  funcionariosDisponiveis: FuncionarioRBAC[]
  loading: boolean
  showLogin: boolean
  login: (funcionario: FuncionarioRBAC) => void
  logout: () => void
  refreshFuncionarios: () => Promise<void>
}

export function useFuncionarioAuth(): UseFuncionarioAuthReturn {
  const dispatch = useDispatch()
  const {
    fazendaId,
    controleAcessoHabilitado,
    funcionarioId,
    funcionarioNome,
    funcionarioCadernetas,
  } = useSelector((state: RootState) => state.config)

  const [funcionarios, setFuncionarios] = useState<FuncionarioRBAC[]>([])
  const [loading, setLoading] = useState(true)

  const rbacAtivo = controleAcessoHabilitado && funcionarios.length > 0

  const funcionarioLogado = funcionarioId
    ? {
        id: funcionarioId,
        fazenda_id: fazendaId,
        nome: funcionarioNome,
        cadernetas_permitidas: funcionarioCadernetas,
        acessa_app: true,
        pin_hash: null,
        ativo: true,
        cargo: null,
      }
    : null

  const loadFuncionarios = useCallback(async () => {
    if (!fazendaId || !controleAcessoHabilitado) {
      setFuncionarios([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await getFuncionariosComAcessoOnlineFirst(fazendaId)
      setFuncionarios(data || [])
    } catch (err) {
      console.error('[useFuncionarioAuth] Erro ao carregar funcionários:', err)
      setFuncionarios([])
    } finally {
      setLoading(false)
    }
  }, [fazendaId, controleAcessoHabilitado])

  useEffect(() => {
    loadFuncionarios()
  }, [loadFuncionarios])

  const login = useCallback((funcionario: FuncionarioRBAC) => {
    dispatch(
      setConfig({
        usuario: funcionario.nome,
        funcionarioId: funcionario.id,
        funcionarioNome: funcionario.nome,
        funcionarioCadernetas: funcionario.cadernetas_permitidas || [],
      })
    )
  }, [dispatch])

  const logout = useCallback(async () => {
    dispatch(
      setConfig({
        usuario: '',
        funcionarioId: '',
        funcionarioNome: '',
        funcionarioCadernetas: [],
      })
    )
    await clearFuncionariosCache()
  }, [dispatch])

  const showLogin = rbacAtivo && !funcionarioLogado && !loading

  return {
    rbacAtivo,
    funcionarioLogado,
    funcionariosDisponiveis: funcionarios,
    loading,
    showLogin,
    login,
    logout,
    refreshFuncionarios: loadFuncionarios,
  }
}

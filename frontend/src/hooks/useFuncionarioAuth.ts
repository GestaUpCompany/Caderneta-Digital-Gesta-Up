import { useState, useEffect, useCallback, useRef } from 'react'
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
  rbacMisconfigured: boolean
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
  const [loadFailed, setLoadFailed] = useState(false)

  const rbacAtivo = controleAcessoHabilitado && funcionarios.length > 0
  // Só considerar misconfigured se o carregamento sucedeu (não falhou) e
  // retornou 0 funcionários. Se falhou (rede, timeout, cache vazio),
  // não bloquear o app com a tela de "nenhum funcionário cadastrado".
  const rbacMisconfigured = controleAcessoHabilitado && !loading && !loadFailed && funcionarios.length === 0

  // funcionarioLogado e reconstruido do Redux (sem pin_hash, que e sensivel).
  // NUNCA usar este objeto para validar PIN. Para validacao de PIN, buscar
  // sempre o funcionario completo em funcionariosDisponiveis (que tem pin_hash).
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

  const loadFuncionarios = useCallback(async (isRetry = false) => {
    if (!fazendaId || !controleAcessoHabilitado) {
      setFuncionarios([])
      setLoading(false)
      setLoadFailed(false)
      return
    }
    if (!isRetry) setLoading(true)
    setLoadFailed(false)
    try {
      const data = await getFuncionariosComAcessoOnlineFirst(fazendaId)
      const funcionariosData = data || []
      setFuncionarios(funcionariosData)
      setLoadFailed(false)
      // Se retornou vazio sem erro, pode ser que a sessão ainda não estava
      // pronta no mount (token expirado, RLS bloqueou sem erro).
      // Tentar uma vez mais após 2 segundos antes de considerar misconfigured.
      if (funcionariosData.length === 0 && !isRetry) {
        setTimeout(() => loadFuncionarios(true), 2000)
      } else {
        setLoading(false)
      }
    } catch (err) {
      console.error('[useFuncionarioAuth] Erro ao carregar funcionários:', err)
      if (!isRetry) {
        // Primeira tentativa falhou: tentar retry antes de desistir
        setTimeout(() => loadFuncionarios(true), 2000)
      } else {
        setFuncionarios([])
        setLoadFailed(true)
        setLoading(false)
      }
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

  // Sincroniza funcionarioLogado com a lista fresca do banco.
  // Se o funcionario foi desativado/removido, forca logout.
  // Se as cadernetas_permitidas mudaram, atualiza o Redux.
  const lastSyncRef = useRef<string>('')
  useEffect(() => {
    if (!funcionarioId || !controleAcessoHabilitado || loading) return
    if (funcionarios.length === 0) return

    const fresh = funcionarios.find(f => f.id === funcionarioId)
    const syncKey = `${funcionarioId}:${fresh ? JSON.stringify(fresh.cadernetas_permitidas) : 'NOT_FOUND'}`
    if (syncKey === lastSyncRef.current) return
    lastSyncRef.current = syncKey

    if (!fresh) {
      console.warn('[useFuncionarioAuth] Funcionário não encontrado na lista fresca, forçando logout:', funcionarioId)
      logout()
      return
    }

    const freshCadernetas = fresh.cadernetas_permitidas || []
    const currentCadernetasJson = JSON.stringify(funcionarioCadernetas)
    const freshCadernetasJson = JSON.stringify(freshCadernetas)
    if (currentCadernetasJson !== freshCadernetasJson) {
      dispatch(setConfig({
        funcionarioNome: fresh.nome,
        funcionarioCadernetas: freshCadernetas,
      }))
    }
  }, [funcionarios, funcionarioId, controleAcessoHabilitado, loading, funcionarioCadernetas, dispatch, logout])

  const showLogin = rbacAtivo && !funcionarioLogado && !loading

  return {
    rbacAtivo,
    rbacMisconfigured,
    funcionarioLogado,
    funcionariosDisponiveis: funcionarios,
    loading,
    showLogin,
    login,
    logout,
    refreshFuncionarios: loadFuncionarios,
  }
}

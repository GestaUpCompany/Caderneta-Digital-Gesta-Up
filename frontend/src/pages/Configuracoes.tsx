import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { setConfig, setConfigurado, setTestMode } from '../store/slices/configSlice'
import { RootState } from '../store/store'
import { Button, Input } from '../components/ui'
import { ChevronLeft } from 'lucide-react'
import ValidationModal from '../components/ValidationModal'
import { getFazendaByAcessoId } from '../services/supabaseService'
import { clearCadastroCache } from '../services/cadastroCache'
import { desativarModoTeste } from '../services/api'
import PushNotificationCard from '../components/PushNotificationCard'
import AtualizacaoAutomaticaCard from '../components/AtualizacaoAutomaticaCard'
import { getVersaoCompleta } from '../utils/version'

// Cabeçalho de ficha: número em mono + título + filete
const Ficha = ({ n, titulo, children, tom = 'padrao' }: { n: string; titulo: string; children: ReactNode; tom?: 'padrao' | 'alerta' }) => (
  <section className={`rounded-2xl border p-5 shadow-[0_1px_0_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(29,64,48,0.25)] ${tom === 'alerta' ? 'bg-amber-50 border-amber-300' : 'bg-white border-[#e4dfd3]'}`}>
    <div className="flex items-center gap-3 mb-4">
      <span className={`font-mono text-[11px] font-bold tracking-widest px-1.5 py-0.5 rounded ${tom === 'alerta' ? 'bg-amber-200 text-amber-900' : 'bg-[#1d4030] text-[#e8d9a8]'}`}>{n}</span>
      <h3 className="text-[13px] font-extrabold tracking-[0.14em] text-[#1d4030] uppercase">{titulo}</h3>
      <span className="flex-1 h-px bg-gradient-to-r from-[#d8d1bf] to-transparent" aria-hidden />
    </div>
    {children}
  </section>
)

export default function Configuracoes() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const config = useSelector((state: RootState) => state.config)

  const [fazenda, setFazenda] = useState(config.acessoId || config.fazendaId || config.fazenda)
  const [usuario, setUsuario] = useState(config.usuario)
  const [fazendaNome, setFazendaNome] = useState(config.fazenda || '')
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [successMsg, setSuccessMsg] = useState('')
  const [validandoFazenda, setValidandoFazenda] = useState(false)
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [validationStatus, setValidationStatus] = useState<'validating' | 'success'>('validating')
  const [confirmarAtivarTeste, setConfirmarAtivarTeste] = useState(false)
  const [msgAtualizacao, setMsgAtualizacao] = useState('')

  // O aviso/aplicação da atualização é do banner global (useServiceWorkerUpdate); aqui só força a busca
  const verificarAtualizacao = async () => {
    if (!('serviceWorker' in navigator)) {
      setMsgAtualizacao('Este navegador não suporta atualização automática.')
      return
    }
    setMsgAtualizacao('Verificando...')
    try {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.update()))
      setMsgAtualizacao(regs.some((r) => r.waiting || r.installing)
        ? 'Nova versão encontrada. Use o aviso de atualização no topo do app.'
        : 'Você está na versão mais recente.')
    } catch {
      setMsgAtualizacao('Não foi possível verificar agora. Confira a conexão com a internet.')
    }
  }
  const [desativandoTeste, setDesativandoTeste] = useState(false)

  const validate = (): boolean => {
    const newErrors: { field: string; message: string }[] = []
    if (!fazenda.trim()) {
      newErrors.push({ field: 'fazenda', message: 'ID da fazenda é obrigatório' })
    }
    if (!usuario.trim()) {
      newErrors.push({ field: 'usuario', message: 'Seu nome é obrigatório' })
    }
    setErrors(newErrors)
    return newErrors.length === 0
  }

  const validarFazendaNoSupabase = async (acessoIdRaw: string): Promise<{ sucesso: boolean; fazendaId?: string; nome?: string; token?: string; acessoId?: string; logoUrl?: string; controleAcessoHabilitado?: boolean; acessoConfinamento?: boolean; acessoComercial?: boolean; acessoIatf?: boolean; travaSuplementacao?: boolean; emGrupo?: boolean }> => {
    const acessoId = acessoIdRaw.toLowerCase()
    try {
      console.log('Validando fazenda no Supabase com acessoId:', acessoId)
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      // Buscar dados do peão via RPC (SECURITY DEFINER) para um acesso_id específico.
      // A tabela peoes não tem mais RLS pública; a RPC é o único caminho.
      const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/autenticar_peao_app`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({ p_acesso_id: acessoId }),
      })

      if (!rpcResponse.ok) {
        console.error('Erro ao chamar RPC autenticar_peao_app:', await rpcResponse.text())
        return { sucesso: false }
      }

      const rpcData = await rpcResponse.json()
      if (!rpcData || rpcData.success !== true || !rpcData.email || !rpcData.password) {
        console.error('Peão não encontrado para esta fazenda')
        return { sucesso: false }
      }

      console.log('Peão encontrado:', rpcData.email)

      // Fazer login no Supabase Auth com email/senha do peão
      const loginResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          email: rpcData.email,
          password: rpcData.password,
        }),
      })

      if (!loginResponse.ok) {
        console.error('Erro ao fazer login:', await loginResponse.text())
        return { sucesso: false }
      }

      const loginData = await loginResponse.json()
      console.log('Login do peão bem-sucedido, token recebido')

      // Obter dados da fazenda
      const fazenda = await getFazendaByAcessoId(acessoId)
      console.log('Fazenda encontrada:', fazenda)

      if (fazenda) {
        // Salvar token JWT e refresh token no localStorage
        localStorage.setItem('supabase_token', loginData.access_token)
        localStorage.setItem('supabase_refresh_token', loginData.refresh_token || '')
        return {
          sucesso: true,
          fazendaId: fazenda.id,
          nome: fazenda.nome,
          token: loginData.access_token,
          acessoId: fazenda.acesso_id,
          logoUrl: fazenda.logo_url || undefined,
          controleAcessoHabilitado: fazenda.controle_acesso_habilitado || false,
          acessoConfinamento: fazenda.acesso_confinamento || false,
          acessoComercial: fazenda.acesso_comercial || false,
          acessoIatf: fazenda.acesso_iatf || false,
          travaSuplementacao: fazenda.trava_suplementacao || false,
          emGrupo: !!fazenda.grupo_id,
        }
      }
    } catch (error) {
      console.error('Erro ao validar fazenda no Supabase:', error)
    }
    return { sucesso: false }
  }

  const handleSalvar = async () => {
    setSuccessMsg('')
    if (!validate()) return

    setValidandoFazenda(true)
    setShowValidationModal(true)
    setValidationStatus('validating')

    // Validar no Supabase para obter fazendaId (UUID)
    const resultSupabase = await validarFazendaNoSupabase(fazenda.trim())
    const validacaoSupabase = {
      sucesso: resultSupabase.sucesso,
      fazendaId: resultSupabase.fazendaId || '',
      nome: resultSupabase.nome || '',
      acessoId: resultSupabase.acessoId || '',
      logoUrl: resultSupabase.logoUrl,
      controleAcessoHabilitado: resultSupabase.controleAcessoHabilitado,
      acessoConfinamento: resultSupabase.acessoConfinamento,
      acessoComercial: resultSupabase.acessoComercial,
      acessoIatf: resultSupabase.acessoIatf,
      travaSuplementacao: resultSupabase.travaSuplementacao,
      emGrupo: resultSupabase.emGrupo || false,
    }

    setValidandoFazenda(false)

    if (!validacaoSupabase.sucesso) {
      setShowValidationModal(false)
      setErrors([{ field: 'fazenda', message: 'ID inválido. Contate o administrador.' }])
      return
    }

    const supabaseFazendaId = validacaoSupabase.fazendaId || ''
    const supabaseAcessoId = validacaoSupabase.acessoId || ''

    // Troca de fazenda: invalidar tudo que carrega dados da fazenda anterior.
    // O clearCadastroCache zera memória + IndexedDB (cadastro, queryCache,
    // RBAC, rotinas, mapa, execuções) de forma síncrona com a troca, sem
    // depender do efeito do App; o Cache API segue com a limpeza antiga do
    // bg-cache e do logo, e aquece o logo da nova fazenda para offline.
    const trocouFazenda = !!(supabaseFazendaId && supabaseFazendaId !== config.fazendaId)
    if (trocouFazenda) {
      await clearCadastroCache()
    }
    if ('caches' in window && trocouFazenda) {
      if (config.fazendaId) {
        caches.open('cadastro-bg-cache')
          .then((c) => c.delete(`${window.location.origin}/cadastro-bg/${config.fazendaId}`))
          .catch(() => {})
        if (config.logoUrl) {
          caches.open('images-cache')
            .then((c) => c.delete(config.logoUrl))
            .catch(() => {})
        }
      }
      if (validacaoSupabase.logoUrl) {
        caches.open('images-cache')
          .then((c) => c.add(validacaoSupabase.logoUrl!))
          .catch(() => {})
      }
    }

    setValidationStatus('success')

    const nomeFazenda = validacaoSupabase.nome || fazenda.trim()
    setFazendaNome(nomeFazenda)
    
    // Atualizar o campo do ID da fazenda para mostrar o acesso_id
    if (supabaseAcessoId) {
      setFazenda(supabaseAcessoId)
    }
    
    const configData = {
      fazenda: nomeFazenda,
      fazendaId: supabaseFazendaId,
      acessoId: supabaseAcessoId,
      // O nome digitado aqui é obrigatório (validate) e vira o tratador dos registros;
      // zerá-lo na troca de fazenda deixava o app sem nome e quebrava o salvamento.
      // O funcionário logado da fazenda anterior é limpo abaixo.
      usuario: usuario.trim(),
      logoUrl: validacaoSupabase.logoUrl,
      controleAcessoHabilitado: validacaoSupabase.controleAcessoHabilitado || false,
      acessoConfinamento: validacaoSupabase.acessoConfinamento || false,
      acessoComercial: validacaoSupabase.acessoComercial || false,
      acessoIatf: validacaoSupabase.acessoIatf || false,
      travaSuplementacao: validacaoSupabase.travaSuplementacao || false,
      fazendaEmGrupo: validacaoSupabase.emGrupo,
      ...(trocouFazenda ? {
        funcionarioId: '',
        funcionarioNome: '',
        funcionarioCadernetas: [],
        expedienteHabilitado: false,
        expedienteDias: null,
        expedienteTimezone: 'America/Cuiaba',
      } : {}),
    }
    if (trocouFazenda) setUsuario('')

    dispatch(setConfig(configData))
    dispatch(setConfigurado(true))
    
    setTimeout(() => {
      setShowValidationModal(false)
      setSuccessMsg('Configurações salvas! Redirecionando...')
      setTimeout(() => navigate('/'), 500)
    }, 1500)
  }

  const getFieldError = (field: string) => errors.find(e => e.field === field)?.message

  const bloqueado = validandoFazenda || !fazenda.trim() || !usuario.trim()
  const inicial = (fazendaNome || config.fazenda || '?').trim().charAt(0).toUpperCase()

  return (
    <div className="min-h-screen bg-[#f3efe4] flex flex-col">
      {/* Header */}
      <header className="relative z-20 bg-gradient-to-b from-[#23503a] via-[#1d4030] to-[#1a3a2a] text-white">
        <div className="px-3 pt-3 pb-16 desktop-form-container">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/20 active:bg-white/25 transition-colors text-white text-xs font-semibold pl-2 pr-3 py-2 min-h-[40px]"
              aria-label="Voltar"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
              <span>Voltar</span>
            </button>
            <span className="font-mono text-[10px] tracking-[0.25em] text-[#e8d9a8]/80">AJUSTES</span>
          </div>
          <h1 className="mt-4 px-1 text-2xl font-extrabold leading-none tracking-tight">Cadastros</h1>
          <p className="mt-1 px-1 text-xs text-white/60">Fazenda, usuário e preferências do aparelho</p>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 -mt-12 relative z-30 flex flex-col gap-4 desktop-form-container">
        {successMsg && (
          <div role="status" className="bg-green-50 border border-green-400 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-base font-bold text-green-800">{successMsg}</p>
          </div>
        )}

        {/* Cartão de identidade (sobrepõe o cabeçalho) */}
        <div className="rounded-2xl bg-white border border-[#e4dfd3] p-4 shadow-[0_12px_32px_-12px_rgba(29,64,48,0.45)] flex items-center gap-4">
          <div className="relative shrink-0">
            {config.logoUrl ? (
              <img src={config.logoUrl} alt="" className="w-14 h-14 rounded-2xl object-contain bg-[#f3efe4] border border-[#e4dfd3]" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-[#1d4030] text-[#e8d9a8] flex items-center justify-center text-2xl font-extrabold">{inicial}</div>
            )}
            <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${config.configurado ? 'bg-green-500' : 'bg-gray-300'}`} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] tracking-[0.2em] text-gray-500">STATUS</p>
            <p className="text-lg font-extrabold text-[#1d4030] leading-tight truncate">
              {config.configurado ? (fazendaNome || config.fazenda) : 'Não configurado'}
            </p>
            <p className={`text-xs font-semibold ${config.configurado ? 'text-green-700' : 'text-gray-500'}`}>
              {config.configurado ? 'Pronto para registrar' : 'Informe o ID da fazenda abaixo'}
            </p>
          </div>
        </div>

        {!config.configurado && (
          <div className="rounded-2xl border border-dashed border-[#c9c1a8] bg-[#faf7ee] p-4">
            <p className="text-sm text-[#4a4636] leading-relaxed">
              Configure sua fazenda para começar. O código é fornecido pelo administrador; sem ele, fale com o suporte.
            </p>
          </div>
        )}

        <Ficha n="01" titulo="Usuário">
          <Input
            label="SEU NOME"
            placeholder="Ex: João Silva"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            error={getFieldError('usuario')}
            fullWidth
          />
        </Ficha>

        <Ficha n="02" titulo="Fazenda">
          {fazendaNome && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-green-50 border-l-4 border-green-600 rounded-r-xl">
              <p className="text-base font-bold text-green-900">{fazendaNome}</p>
            </div>
          )}
          <Input
            label="ID DA FAZENDA"
            value={fazenda}
            onChange={(e) => setFazenda(e.target.value)}
            error={getFieldError('fazenda')}
            fullWidth
            disabled={validandoFazenda}
          />
          {validandoFazenda && (
            <p className="text-sm text-gray-500 mt-2">Validando ID na base de dados...</p>
          )}
        </Ficha>

        {config.configurado && (
          <Ficha n="03" titulo="Modo teste" tom={config.testModeAtivo ? 'alerta' : 'padrao'}>
            {config.testModeAtivo && (
              <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500 text-white text-[11px] font-bold tracking-wider px-2.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white" aria-hidden /> ATIVO
              </p>
            )}
            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              Quando ativado, todos os registros criados ficam apenas neste dispositivo e não são enviados ao banco de dados. Útil para testar o compartilhamento de texto sem gerar dados reais. Ao desativar, todos os registros de teste são permanentemente removidos.
            </p>

            {confirmarAtivarTeste ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-bold text-amber-800">Ativar modo teste agora?</p>
                <p className="text-xs text-amber-700">Registros existentes não serão afetados. Apenas novos registros ficarão marcados como teste.</p>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => {
                      dispatch(setTestMode(true))
                      setConfirmarAtivarTeste(false)
                    }}
                    className="bg-amber-500 hover:bg-amber-600 active:scale-[0.98] transition text-white font-bold text-xs rounded-full px-4 py-2.5"
                  >
                    SIM, ATIVAR
                  </button>
                  <button
                    onClick={() => setConfirmarAtivarTeste(false)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold text-xs rounded-full px-4 py-2.5"
                  >
                    CANCELAR
                  </button>
                </div>
              </div>
            ) : config.testModeAtivo ? (
              <button
                onClick={async () => {
                  setDesativandoTeste(true)
                  try {
                    await desativarModoTeste()
                  } catch (err) {
                    console.error('Erro ao desativar modo teste:', err)
                  } finally {
                    setDesativandoTeste(false)
                  }
                }}
                disabled={desativandoTeste}
                className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.99] transition text-white font-bold text-sm rounded-xl px-4 py-3 disabled:opacity-50"
              >
                {desativandoTeste ? 'DESATIVANDO E LIMPANDO...' : 'DESATIVAR E REMOVER REGISTROS DE TESTE'}
              </button>
            ) : (
              <button
                onClick={() => setConfirmarAtivarTeste(true)}
                className="w-full bg-[#faf7ee] hover:bg-amber-50 active:scale-[0.99] transition text-amber-900 font-bold text-sm rounded-xl px-4 py-3 border border-dashed border-amber-400"
              >
                ATIVAR MODO TESTE
              </button>
            )}
          </Ficha>
        )}

        {config.configurado && config.fazendaId && <AtualizacaoAutomaticaCard />}

        {config.configurado && config.fazendaId && (
          <PushNotificationCard fazendaId={config.fazendaId} />
        )}

        <Button
          onClick={handleSalvar}
          variant="success"
          icon="💾"
          disabled={bloqueado}
          className={bloqueado ? 'opacity-50 cursor-not-allowed' : ''}
        >
          {validandoFazenda ? 'VALIDANDO...' : 'SALVAR CONFIGURAÇÕES'}
        </Button>

        {/* Sobre o app: rodapé discreto estilo etiqueta */}
        <footer className="mt-2 rounded-2xl border border-dashed border-[#c9c1a8] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[10px] tracking-[0.2em] text-gray-500">VERSÃO</p>
              <p className="text-sm font-mono text-[#1d4030] break-all">{getVersaoCompleta()}</p>
            </div>
            <button
              onClick={verificarAtualizacao}
              className="shrink-0 bg-[#1d4030] hover:bg-[#23503a] active:scale-[0.98] transition text-[#e8d9a8] font-semibold text-xs rounded-full px-4 py-2.5"
            >
              VERIFICAR ATUALIZAÇÃO
            </button>
          </div>
          {msgAtualizacao && <p className="text-xs text-gray-600 mt-2">{msgAtualizacao}</p>}
        </footer>
      </main>

      <ValidationModal
        isOpen={showValidationModal}
        status={validationStatus}
      />
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { setConfig, setConfigurado } from '../store/slices/configSlice'
import { RootState } from '../store/store'
import { Button, Input } from '../components/ui'
import ValidationModal from '../components/ValidationModal'
import { getFazendaByAcessoId } from '../services/supabaseService'

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

  const validarFazendaNoSupabase = async (acessoId: string): Promise<{ sucesso: boolean; fazendaId?: string; nome?: string; token?: string; acessoId?: string; logoUrl?: string }> => {
    try {
      console.log('Validando fazenda no Supabase com acessoId:', acessoId)
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      // Buscar peão na tabela peoes usando anon key (case-insensitive)
      const peaoResponse = await fetch(`${supabaseUrl}/rest/v1/peoes?fazenda_id=ilike.${acessoId}&ativo=eq.true`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
      })

      if (!peaoResponse.ok) {
        console.error('Erro ao buscar peão:', await peaoResponse.text())
        return { sucesso: false }
      }

      const peaoData = await peaoResponse.json()
      if (!peaoData || peaoData.length === 0) {
        console.error('Peão não encontrado para esta fazenda')
        return { sucesso: false }
      }

      const peao = peaoData[0]
      console.log('Peão encontrado:', peao.email)

      // Fazer login no Supabase Auth com email/senha do peão
      const loginResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          email: peao.email,
          password: peao.password,
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
        return { sucesso: true, fazendaId: fazenda.id, nome: fazenda.nome, token: loginData.access_token, acessoId: fazenda.acesso_id, logoUrl: fazenda.logo_url || undefined }
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
    const validacaoSupabase = { sucesso: resultSupabase.sucesso, fazendaId: resultSupabase.fazendaId || '', nome: resultSupabase.nome || '', acessoId: resultSupabase.acessoId || '', logoUrl: resultSupabase.logoUrl }

    setValidandoFazenda(false)

    if (!validacaoSupabase.sucesso) {
      setShowValidationModal(false)
      setErrors([{ field: 'fazenda', message: 'ID não encontrado no Supabase. Contate o administrador.' }])
      return
    }

    const supabaseFazendaId = validacaoSupabase.fazendaId || ''
    const supabaseAcessoId = validacaoSupabase.acessoId || ''

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
      usuario: usuario.trim(),
      logoUrl: validacaoSupabase.logoUrl
    }

    dispatch(setConfig(configData))
    dispatch(setConfigurado(true))
    
    setTimeout(() => {
      setShowValidationModal(false)
      setSuccessMsg('Configurações salvas! Redirecionando...')
      setTimeout(() => navigate('/'), 500)
    }, 1500)
  }

  const getFieldError = (field: string) => errors.find(e => e.field === field)?.message

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-[#1a3a2a] text-white flex items-center px-4 py-4">
        <button
          onClick={() => navigate(-1)}
          className="text-yellow-400 font-bold text-sm min-h-[40px] px-3"
        >
          VOLTAR
        </button>
        <h1 className="text-base font-bold flex-1 text-center">
          CADASTROS
        </h1>
        <div className="w-[60px]"></div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-4">
        {/* Alerta de sucesso */}
        {successMsg && (
          <div className="bg-green-100 border-2 border-green-500 rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-green-800">{successMsg}</p>
          </div>
        )}

        {/* Card de instruções - só mostra se não configurado */}
        {!config.configurado && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800 leading-relaxed">
              Configure sua fazenda para começar a usar o sistema. Você precisará do código da fazenda fornecido pelo administrador.
            </p>
          </div>
        )}

        {/* Status da configuração */}
        <div className="bg-white rounded-2xl p-4 shadow border-2 border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600">STATUS DA CONFIGURAÇÃO</p>
              <p className={`text-lg font-bold ${config.configurado ? 'text-green-600' : 'text-gray-400'}`}>
                {config.configurado ? 'Configurado' : 'Não configurado'}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${config.configurado ? 'bg-green-100' : 'bg-gray-100'}`}>
              <div className={`w-4 h-4 rounded-full ${config.configurado ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            </div>
          </div>
        </div>

        {/* Card de dados do usuário */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200">
          <h3 className="text-sm font-semibold text-gray-600 mb-4">DADOS DO USUÁRIO</h3>
          <Input
            label="SEU NOME"
            placeholder="Ex: João Silva"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            error={getFieldError('usuario')}
            fullWidth
          />
        </div>

        {/* Card de dados da fazenda */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200">

          {/* Nome da Fazenda (autopreenchido) */}
          {fazendaNome && (
            <div className="mb-4 p-3 bg-green-50 border-2 border-green-200 rounded-xl">
              <p className="text-base font-bold text-green-800">{fazendaNome}</p>
            </div>
          )}

          {/* ID da Fazenda */}
          <Input
            label="ID DA FAZENDA"
            value={fazenda}
            onChange={(e) => setFazenda(e.target.value)}
            error={getFieldError('fazenda')}
            fullWidth
            disabled={validandoFazenda}
          />
          {validandoFazenda && (
            <p className="text-sm text-gray-500 mt-1">Validando ID na base de dados...</p>
          )}
        </div>

        {/* Card de instruções para encontrar ID - só mostra se não configurado */}
        {!config.configurado && (
          <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">ONDE ENCONTRAR O ID DA FAZENDA?</p>
            <p className="text-sm text-gray-600 leading-relaxed">
              O ID da fazenda é fornecido pelo administrador do sistema. Entre em contato com o suporte caso não tenha essa informação.
            </p>
          </div>
        )}

        {/* Botão Salvar */}
        <Button 
          onClick={handleSalvar} 
          variant="success" 
          icon="💾"
          disabled={validandoFazenda || !fazenda.trim() || !usuario.trim()}
          className={validandoFazenda || !fazenda.trim() || !usuario.trim() ? 'opacity-50 cursor-not-allowed' : ''}
        >
          {validandoFazenda ? 'VALIDANDO...' : 'SALVAR CONFIGURAÇÕES'}
        </Button>
      </main>

      <ValidationModal
        isOpen={showValidationModal}
        status={validationStatus}
      />
    </div>
  )
}

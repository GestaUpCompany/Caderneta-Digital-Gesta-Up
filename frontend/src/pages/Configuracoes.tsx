import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { setConfig, setConfigurado } from '../store/slices/configSlice'
import { RootState } from '../store/store'
import { Button, Input } from '../components/ui'
import ValidationModal from '../components/ValidationModal'
import { BACKEND_URL, DATABASE_URL, DEVICE_SHEET_URL } from '../utils/constants'
import { getDeviceId } from '../utils/deviceId'
import { validateFarmAccess } from '../services/supabaseClient'
import { getFazendaByAcessoId } from '../services/supabaseService'

export default function Configuracoes() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const config = useSelector((state: RootState) => state.config)

  const [fazenda, setFazenda] = useState(config.fazendaId || config.fazenda)
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

  const validarFazendaNaBase = async (id: string, linkPosition: number = 1): Promise<{ sucesso: boolean; nome?: string; link?: string }> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/sheets/validate-farm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planilhaUrl: DATABASE_URL, farmId: id, linkPosition }),
      })
      if (res.ok) {
        const json = await res.json() as { success: boolean; farmName?: string; farmSheetUrl?: string }
        return { sucesso: json.success, nome: json.farmName, link: json.farmSheetUrl }
      }
    } catch (error) {
      console.error('Erro ao validar fazenda:', error)
    }
    return { sucesso: false }
  }

  const validarFazendaNoSupabase = async (acessoId: string): Promise<{ sucesso: boolean; fazendaId?: string; nome?: string }> => {
    try {
      // Validar acesso usando Edge Function
      const valid = await validateFarmAccess('', acessoId)
      if (!valid) {
        return { sucesso: false }
      }

      // Obter dados da fazenda do Supabase
      const fazenda = await getFazendaByAcessoId(acessoId)
      if (fazenda) {
        return { sucesso: true, fazendaId: fazenda.id, nome: fazenda.nome }
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

    // Validar com posição 1 para obter URL da planilha da caderneta
    const validacaoCaderneta = await validarFazendaNaBase(fazenda.trim(), 1)

    // Validar com posição 3 para obter URL da planilha de cadastro
    const validacaoCadastro = await validarFazendaNaBase(fazenda.trim(), 3)

    // Validar no Supabase para obter fazendaId (UUID)
    const validacaoSupabase = await validarFazendaNoSupabase(fazenda.trim())

    setValidandoFazenda(false)

    if (!validacaoCaderneta.sucesso) {
      setShowValidationModal(false)
      setErrors([{ field: 'fazenda', message: 'Verifique o ID digitado ou contate o administrador' }])
      return
    }

    // Se Supabase estiver habilitado, validar também no Supabase
    const useSupabase = import.meta.env.VITE_USE_SUPABASE === 'true'
    let supabaseFazendaId = ''
    if (useSupabase) {
      if (!validacaoSupabase.sucesso) {
        setShowValidationModal(false)
        setErrors([{ field: 'fazenda', message: 'ID não encontrado no Supabase. Contate o administrador.' }])
        return
      }
      supabaseFazendaId = validacaoSupabase.fazendaId || ''
    }

    setValidationStatus('success')

    // Se validou com sucesso, usa o nome e link retornados da base de dados
    const nomeFazenda = validacaoCaderneta.nome || fazenda.trim()
    const linkPlanilha = validacaoCaderneta.link
    const linkCadastro = validacaoCadastro.link

    if (!linkPlanilha) {
      setShowValidationModal(false)
      setErrors([{ field: 'fazenda', message: 'Link da planilha não encontrado na base de dados. Contate o administrador.' }])
      return
    }

    // Aviso se link de cadastro não for encontrado (não é obrigatório)
    if (!linkCadastro) {
      console.warn('Link de cadastro não encontrado na base de dados. Funcionalidades de cadastro podem não funcionar corretamente.')
    }

    setFazendaNome(nomeFazenda)
    const configData = {
      fazenda: nomeFazenda,
      fazendaId: useSupabase ? supabaseFazendaId : fazenda.trim(),
      usuario: usuario.trim(),
      planilhaUrl: linkPlanilha,
      cadastroSheetUrl: linkCadastro || ''
    }

    dispatch(setConfig(configData))
    dispatch(setConfigurado(true))
    
    // Salvar data de configuração da fazenda no analytics
    const farmConfigDate = new Date().toLocaleDateString('pt-BR')
    try {
      const deviceId = getDeviceId()
      await fetch(`${BACKEND_URL}/api/devices/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceSheetUrl: DEVICE_SHEET_URL,
          uuid: deviceId,
          fazenda: fazenda || '',
          farmConfigDate,
        }),
      })
    } catch (error) {
      console.error('Erro ao salvar data de configuração:', error)
    }
    
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
          ← VOLTAR
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

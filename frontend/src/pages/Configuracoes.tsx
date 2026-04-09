import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { setConfig, setConfigurado } from '../store/slices/configSlice'
import { RootState } from '../store/store'
import { Button, Input, ValidationMessage } from '../components/ui'

export default function Configuracoes() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const config = useSelector((state: RootState) => state.config)

  const [fazenda, setFazenda] = useState(config.fazenda)
  const [usuario, setUsuario] = useState(config.usuario)
  const [planilhaUrl, setPlanilhaUrl] = useState(config.planilhaUrl)
  const [codigoAlterar, setCodigoAlterar] = useState('')
  const [urlBloqueada, setUrlBloqueada] = useState(!!config.planilhaUrl)
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [successMsg, setSuccessMsg] = useState('')

  const validate = (): boolean => {
    const newErrors: { field: string; message: string }[] = []
    if (!fazenda.trim()) {
      newErrors.push({ field: 'fazenda', message: 'Nome da fazenda é obrigatório' })
    }
    if (!usuario.trim()) {
      newErrors.push({ field: 'usuario', message: 'Seu nome é obrigatório' })
    }
    if (!planilhaUrl.trim()) {
      newErrors.push({ field: 'planilhaUrl', message: 'Link da planilha é obrigatório' })
    } else if (!planilhaUrl.includes('docs.google.com/spreadsheets')) {
      newErrors.push({ field: 'planilhaUrl', message: 'Link inválido. Use o link do Google Sheets' })
    }
    setErrors(newErrors)
    return newErrors.length === 0
  }

  // Converter URL de compartilhamento para URL de API
  const converterUrlParaAPI = (url: string): string => {
    // Remove parâmetros como /edit?usp=sharing e adiciona /edit
    const baseUrl = url.split('?')[0]
    if (baseUrl.endsWith('/edit')) {
      return baseUrl
    }
    return baseUrl.replace(/\/$/, '') + '/edit'
  }

  const handleDesbloquearUrl = () => {
    if (codigoAlterar.toUpperCase() === 'ALTERAR') {
      setUrlBloqueada(false)
      setCodigoAlterar('')
      setErrors([])
    } else {
      setErrors([{ field: 'codigo', message: 'Digite ALTERAR para desbloquear' }])
    }
  }

  const handleSalvar = () => {
    setSuccessMsg('')
    if (!validate()) return

    // Converter URL para formato API automaticamente
    const urlConvertida = converterUrlParaAPI(planilhaUrl.trim())
    const configData = { fazenda: fazenda.trim(), usuario: usuario.trim(), planilhaUrl: urlConvertida }
    console.log('Configuracoes: Salvando configurações', configData)
    console.log('Configuracoes: URL convertida de', planilhaUrl.trim(), 'para', urlConvertida)
    
    dispatch(setConfig(configData))
    dispatch(setConfigurado(true))
    setUrlBloqueada(true)
    setSuccessMsg('Configurações salvas! Redirecionando...')
    setTimeout(() => navigate('/'), 1500)
  }

  const getFieldError = (field: string) => errors.find(e => e.field === field)?.message

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-black text-white flex items-center px-4 py-5">
        <Button 
          onClick={() => navigate('/')} 
          variant="ghost" 
          size="sm"
          fullWidth={false}
          className="mr-3"
        >
          ← VOLTAR
        </Button>
        <h1 className="text-xl font-bold">CONFIGURAÇÕES</h1>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-5">
        {/* Alerta de sucesso */}
        {successMsg && (
          <div className="bg-green-100 border-2 border-green-500 rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-green-800">{successMsg}</p>
          </div>
        )}

        {/* ValidationMessage para erros */}
        {errors.length > 0 && <ValidationMessage errors={errors} />}

        {/* Nome da Fazenda */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200">
          <Input
            label="NOME DA FAZENDA"
            placeholder="Ex: Fazenda Boa Vista"
            value={fazenda}
            onChange={(e) => setFazenda(e.target.value)}
            error={getFieldError('fazenda')}
            fullWidth
          />
        </div>

        {/* Seu Nome */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200">
          <Input
            label="SEU NOME"
            placeholder="Ex: João Silva"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            error={getFieldError('usuario')}
            fullWidth
          />
        </div>

        {/* Link da Planilha com proteção ALTERAR */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200">
          <label className="section-title block">LINK DA PLANILHA GOOGLE SHEETS</label>

          {urlBloqueada && planilhaUrl ? (
            <div className="flex flex-col gap-4">
              <div className="bg-gray-100 rounded-xl p-4 text-gray-700 text-base break-all font-mono">
                {planilhaUrl.substring(0, 60)}...
              </div>
              <p className="text-sm text-gray-500">
                🔒 Para alterar, digite "ALTERAR" abaixo:
              </p>
              <Input
                placeholder='Digite "ALTERAR" para desbloquear'
                value={codigoAlterar}
                onChange={(e) => setCodigoAlterar(e.target.value.toUpperCase())}
                error={getFieldError('codigo')}
                fullWidth
              />
              <Button onClick={handleDesbloquearUrl} variant="secondary">
                🔓 DESBLOQUEAR LINK
              </Button>
            </div>
          ) : (
            <Input
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={planilhaUrl}
              onChange={(e) => setPlanilhaUrl(e.target.value)}
              error={getFieldError('planilhaUrl')}
              helper="Cole o link completo da planilha Google Sheets"
              fullWidth
            />
          )}
        </div>

        {/* Botão Salvar */}
        <Button onClick={handleSalvar} variant="success" icon="💾">
          SALVAR CONFIGURAÇÕES
        </Button>
      </main>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { setConfig, setConfigurado } from '../store/slices/configSlice'
import { RootState } from '../store/store'
import { Button, Input } from '../components/ui'
import { BACKEND_URL, DATABASE_URL } from '../utils/constants'

export default function Configuracoes() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const config = useSelector((state: RootState) => state.config)

  const [fazenda, setFazenda] = useState(config.fazendaId || config.fazenda)
  const [usuario, setUsuario] = useState(config.usuario)
  const [fazendaNome, setFazendaNome] = useState('')
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([])
  const [successMsg, setSuccessMsg] = useState('')
  const [validandoFazenda, setValidandoFazenda] = useState(false)

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

  const validarFazendaNaBase = async (id: string): Promise<{ sucesso: boolean; nome?: string; link?: string }> => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/sheets/validate-farm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planilhaUrl: DATABASE_URL, farmId: id }),
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

  const handleSalvar = async () => {
    setSuccessMsg('')
    if (!validate()) return

    setValidandoFazenda(true)
    const validacao = await validarFazendaNaBase(fazenda.trim())
    setValidandoFazenda(false)

    if (!validacao.sucesso) {
      setErrors([{ field: 'fazenda', message: 'Verifique o ID digitado ou contate o administrador' }])
      return
    }

    // Se validou com sucesso, usa o nome e link retornados da base de dados
    const nomeFazenda = validacao.nome || fazenda.trim()
    const linkPlanilha = validacao.link

    if (!linkPlanilha) {
      setErrors([{ field: 'fazenda', message: 'Link da planilha não encontrado na base de dados. Contate o administrador.' }])
      return
    }

    setFazendaNome(nomeFazenda)
    const configData = { fazenda: nomeFazenda, fazendaId: fazenda.trim(), usuario: usuario.trim(), planilhaUrl: linkPlanilha }
    console.log('Configuracoes: Salvando configurações', configData)

    dispatch(setConfig(configData))
    dispatch(setConfigurado(true))
    setSuccessMsg('Configurações salvas! Redirecionando...')
    setTimeout(() => navigate('/'), 1500)
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
          CONFIGURAÇÕES
        </h1>
        <div className="w-[60px]"></div>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-5">
        {/* Alerta de sucesso */}
        {successMsg && (
          <div className="bg-green-100 border-2 border-green-500 rounded-xl p-4 text-center">
            <p className="text-lg font-bold text-green-800">{successMsg}</p>
          </div>
        )}

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

        {/* ID da Fazenda */}
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200">
          <Input
            label="ID DA FAZENDA"
            value={fazenda}
            onChange={(e) => setFazenda(e.target.value)}
            error={getFieldError('fazenda')}
            helper="Digite o código da fazenda fornecido pelo administrador"
            fullWidth
            disabled={validandoFazenda}
          />
          {validandoFazenda && (
            <p className="text-sm text-gray-500 mt-1">Validando ID na base de dados...</p>
          )}
        </div>

        {/* Nome da Fazenda (autopreenchido) */}
        {fazendaNome && (
          <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200">
            <Input
              label="NOME DA FAZENDA"
              value={fazendaNome}
              error={getFieldError('fazenda')}
              fullWidth
              disabled
              helper="Nome da fazenda recuperado da base de dados"
            />
          </div>
        )}

        {/* Botão Salvar */}
        <Button onClick={handleSalvar} variant="success" icon="💾">
          SALVAR CONFIGURAÇÕES
        </Button>
      </main>
    </div>
  )
}

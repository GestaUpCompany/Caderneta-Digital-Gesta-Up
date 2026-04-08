import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { setConfig, setConfigurado } from '../store/slices/configSlice'
import { RootState } from '../store/store'

export default function Configuracoes() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const config = useSelector((state: RootState) => state.config)

  const [fazenda, setFazenda] = useState(config.fazenda)
  const [usuario, setUsuario] = useState(config.usuario)
  const [planilhaUrl, setPlanilhaUrl] = useState(config.planilhaUrl)
  const [codigoAlterar, setCodigoAlterar] = useState('')
  const [urlBloqueada, setUrlBloqueada] = useState(!!config.planilhaUrl)
  const [mensagem, setMensagem] = useState('')

  const handleDesbloquearUrl = () => {
    if (codigoAlterar.toUpperCase() === 'ALTERAR') {
      setUrlBloqueada(false)
      setCodigoAlterar('')
      setMensagem('')
    } else {
      setMensagem('Digite ALTERAR para desbloquear')
    }
  }

  const handleSalvar = () => {
    if (!fazenda.trim() || !usuario.trim() || !planilhaUrl.trim()) {
      setMensagem('Preencha todos os campos')
      return
    }
    if (!planilhaUrl.includes('docs.google.com/spreadsheets')) {
      setMensagem('Link inválido. Use o link do Google Sheets')
      return
    }
    dispatch(setConfig({ fazenda, usuario, planilhaUrl }))
    dispatch(setConfigurado(true))
    setUrlBloqueada(true)
    setMensagem('Configurações salvas com sucesso!')
    setTimeout(() => navigate('/'), 1500)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-black text-white flex items-center px-4 py-5">
        <button onClick={() => navigate('/')} className="text-yellow-400 font-bold text-xl mr-4">
          ← VOLTAR
        </button>
        <h1 className="text-xl font-bold">CONFIGURAÇÕES</h1>
      </header>

      <main className="flex-1 p-4 flex flex-col gap-5">
        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200">
          <label className="section-title block">NOME DA FAZENDA</label>
          <input
            className="input-field"
            placeholder="Ex: Fazenda Boa Vista"
            value={fazenda}
            onChange={(e) => setFazenda(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200">
          <label className="section-title block">SEU NOME</label>
          <input
            className="input-field"
            placeholder="Ex: João Silva"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200">
          <label className="section-title block">LINK DA PLANILHA</label>

          {urlBloqueada ? (
            <div className="flex flex-col gap-3">
              <div className="bg-gray-100 rounded-xl p-3 text-gray-600 text-base break-all">
                {planilhaUrl ? planilhaUrl.substring(0, 50) + '...' : 'Não configurado'}
              </div>
              <input
                className="input-field"
                placeholder='Digite "ALTERAR" para desbloquear'
                value={codigoAlterar}
                onChange={(e) => setCodigoAlterar(e.target.value)}
              />
              <button onClick={handleDesbloquearUrl} className="btn-secondary">
                🔓 DESBLOQUEAR
              </button>
            </div>
          ) : (
            <input
              className="input-field"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={planilhaUrl}
              onChange={(e) => setPlanilhaUrl(e.target.value)}
            />
          )}
        </div>

        {mensagem ? (
          <div className={`rounded-xl p-4 text-center font-bold text-lg ${
            mensagem.includes('sucesso') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {mensagem}
          </div>
        ) : null}

        <button onClick={handleSalvar} className="btn-primary mt-2">
          💾 SALVAR CONFIGURAÇÕES
        </button>
      </main>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import Button from '../components/ui/Button'

export default function WelcomePage() {
  const navigate = useNavigate()

  // Marcar que o usuário já viu a tela de boas-vindas
  useEffect(() => {
    localStorage.setItem('welcome-seen', 'true')
  }, [])

  const handleStart = () => {
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <div className="w-32 h-32 bg-yellow-400 rounded-3xl flex items-center justify-center mb-8 shadow-2xl">
          <img 
            src="/Caderneta-Digital-Gesta-Up/logo-gestaup-app-cadernetadigital.png" 
            alt="Logo Gesta'Up" 
            className="w-24 h-24 rounded-2xl"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              const fallback = document.createElement('div')
              fallback.className = 'text-6xl'
              fallback.textContent = 'AG'
              e.currentTarget.parentElement?.appendChild(fallback)
            }}
          />
        </div>

        {/* Título */}
        <h1 className="text-4xl font-bold text-center mb-4">
          Gesta'Up Cadernetas Digitais
        </h1>

        {/* Subtítulo */}
        <p className="text-xl text-gray-300 text-center mb-12">
          Gestão rural na palma da mão
        </p>

        {/* Descrição */}
        <div className="space-y-4 mb-12 max-w-md">
          <div className="flex items-start gap-3">
            <span className="text-yellow-400 text-xl mt-1">AG</span>
            <p className="text-gray-300">
              Cadernetas digitais para controle completo do seu rebanho
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-yellow-400 text-xl mt-1">AG</span>
            <p className="text-gray-300">
              Sincronização automática com Google Sheets
            </p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-yellow-400 text-xl mt-1">AG</span>
            <p className="text-gray-300">
              Funciona offline, sincroniza quando voltar à internet
            </p>
          </div>
        </div>

        {/* Botão */}
        <Button 
          onClick={handleStart}
          variant="primary"
          fullWidth
          icon=""
          className="max-w-md bg-yellow-400 text-black hover:bg-yellow-300 font-bold text-lg py-4"
        >
          COMEÇAR A USAR
        </Button>
      </div>

      {/* Footer */}
      <div className="p-6 text-center">
        <p className="text-gray-500 text-sm">
          Versão 1.0.0
        </p>
      </div>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Settings, Mail } from 'lucide-react'
import { Button } from './ui'

interface FarmInactiveBlockProps {
  nome?: string
}

export default function FarmInactiveBlock({ nome }: FarmInactiveBlockProps) {
  const navigate = useNavigate()

  const handleOpenSettings = () => {
    navigate('/configuracoes')
  }

  const handleContactSupport = () => {
    window.location.href = 'mailto:suporte@gestaup.com?subject=Fazenda%20desativada%20-%20suporte'
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border-2 border-red-200 p-6 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Fazenda desativada
        </h1>

        <p className="text-gray-700 mb-4">
          {nome
            ? `A fazenda "${nome}" foi desativada e não está mais disponível para acesso.`
            : 'Esta fazenda foi desativada e não está mais disponível para acesso.'}
        </p>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm text-yellow-900">
            Você não terá acesso às cadernetas até que a fazenda seja reativada.
          </p>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Se você acredita que isso foi um erro, entre em contato com o suporte:
        </p>

        <div className="flex flex-col gap-3">
          <Button
            onClick={handleContactSupport}
            variant="secondary"
            className="w-full flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" />
            suporte@gestaup.com
          </Button>

          <Button
            onClick={handleOpenSettings}
            className="w-full flex items-center justify-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Ir para configurações
          </Button>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useVersionCheck } from '../hooks/useVersionCheck'
import Button from './ui/Button'

export function UpdateDialog() {
  const { updateAvailable, updateInfo, isLoading, dismissUpdate } = useVersionCheck()
  const [showDialog, setShowDialog] = useState(false)

  useEffect(() => {
    if (updateAvailable && updateInfo) {
      // Mostrar automaticamente se for obrigatório
      if (updateInfo.mandatory) {
        setShowDialog(true)
      } else {
        // Para atualizações opcionais, mostrar após um pequeno delay
        const timer = setTimeout(() => {
          setShowDialog(true)
        }, 2000)
        
        return () => clearTimeout(timer)
      }
    } else {
      setShowDialog(false)
    }
  }, [updateAvailable, updateInfo])

  const handleDownload = () => {
    if (updateInfo?.downloadUrl) {
      // Abrir URL em nova aba
      window.open(updateInfo.downloadUrl, '_blank')
      
      // Se não for obrigatório, permitir fechar o dialog
      if (!updateInfo.mandatory) {
        setShowDialog(false)
      }
    }
  }

  const handleDismiss = () => {
    if (!updateInfo?.mandatory) {
      dismissUpdate()
      setShowDialog(false)
    }
  }

  const formatVersion = (version: string) => {
    return `v${version}`
  }

  if (!showDialog || !updateInfo) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl"> update</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Nova Versão Disponível!</h2>
              <p className="text-sm text-gray-600">
                {formatVersion(updateInfo.version)} está disponível
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {updateInfo.mandatory && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800 font-medium">
                Esta atualização é obrigatória para continuar usando o aplicativo.
              </p>
            </div>
          )}

          {updateInfo.changelog && updateInfo.changelog.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Novidades:</h3>
              <ul className="space-y-2">
                {updateInfo.changelog.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-green-500 mt-0.5">check</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-xs text-gray-500">
            Data de lançamento: {new Date(updateInfo.releaseDate).toLocaleDateString('pt-BR')}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <Button
            onClick={handleDownload}
            variant="primary"
            fullWidth
            icon="download"
            disabled={isLoading}
          >
            {isLoading ? 'Carregando...' : 'Baixar Atualização'}
          </Button>

          {!updateInfo.mandatory && (
            <Button
              onClick={handleDismiss}
              variant="ghost"
              fullWidth
            >
              Agora Não
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Versão atual: {formatVersion('1.0.0')}
          </p>
        </div>
      </div>
    </div>
  )
}

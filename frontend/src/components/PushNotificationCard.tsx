import { useState, useEffect, useCallback } from 'react'
import { Bell, BellOff, BellRing, AlertCircle, Loader2 } from 'lucide-react'
import {
  isPushSupported,
  isPushPermissionGranted,
  registerPushSubscription,
  unregisterPushSubscription,
} from '../services/pushNotificationService'

interface PushNotificationCardProps {
  fazendaId: string
}

type PushStatus = 'loading' | 'unsupported' | 'granted' | 'denied' | 'default'

export default function PushNotificationCard({ fazendaId }: PushNotificationCardProps) {
  const [status, setStatus] = useState<PushStatus>('loading')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null)

  const refreshStatus = useCallback(() => {
    if (!isPushSupported()) {
      setStatus('unsupported')
      return
    }
    const granted = isPushPermissionGranted()
    setStatus(granted ? 'granted' : Notification.permission === 'denied' ? 'denied' : 'default')
  }, [])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  const handleAtivar = async () => {
    setBusy(true)
    setFeedback(null)
    try {
      const ok = await registerPushSubscription(fazendaId)
      if (ok) {
        setStatus('granted')
        setFeedback({ type: 'success', msg: 'Notificações ativadas! Você receberá lembretes de tratos.' })
      } else {
        // registerPushSubscription retorna false se permissão foi negada ou sem VAPID key
        refreshStatus()
        if (Notification.permission === 'denied') {
          setFeedback({
            type: 'error',
            msg: 'Permissão negada. Para ativar, vá nas configurações do navegador e permita notificações para este site.',
          })
        } else {
          setFeedback({
            type: 'error',
            msg: 'Não foi possível ativar. Verifique se o navegador suporta notificações e tente novamente.',
          })
        }
      }
    } catch (err) {
      console.error('[PushCard] Erro ao ativar:', err)
      setFeedback({ type: 'error', msg: 'Erro inesperado ao ativar notificações.' })
    } finally {
      setBusy(false)
    }
  }

  const handleDesativar = async () => {
    setBusy(true)
    setFeedback(null)
    try {
      await unregisterPushSubscription()
      // Notification.permission não pode ser revogado via JS; o usuário precisa
      // fazer manualmente nas configurações do navegador. Mas o unsubscribe
      // impede o dispositivo de receber pushes.
      setStatus('default')
      setFeedback({
        type: 'info',
        msg: 'Notificações desativadas neste dispositivo. Para revogar a permissão completamente, ajuste nas configurações do navegador.',
      })
    } catch (err) {
      console.error('[PushCard] Erro ao desativar:', err)
      setFeedback({ type: 'error', msg: 'Erro ao desativar notificações.' })
    } finally {
      setBusy(false)
    }
  }

  // Não suportado
  if (status === 'unsupported') {
    return (
      <div className="bg-gray-50 rounded-2xl p-5 shadow border-2 border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <BellOff className="w-5 h-5 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-600">NOTIFICAÇÕES</h3>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Este dispositivo ou navegador não suporta notificações push. Para receber lembretes, instale o app como PWA (Adicionar à Tela Inicial) em um navegador compatível como Chrome ou Safari.
        </p>
      </div>
    )
  }

  const statusConfig = {
    granted: {
      icon: <BellRing className="w-5 h-5 text-green-600" />,
      label: 'Ativadas',
      labelColor: 'text-green-600',
      dotColor: 'bg-green-500',
    },
    denied: {
      icon: <BellOff className="w-5 h-5 text-red-500" />,
      label: 'Bloqueadas',
      labelColor: 'text-red-600',
      dotColor: 'bg-red-500',
    },
    default: {
      icon: <Bell className="w-5 h-5 text-gray-400" />,
      label: 'Desativadas',
      labelColor: 'text-gray-500',
      dotColor: 'bg-gray-300',
    },
    loading: {
      icon: <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />,
      label: 'Verificando...',
      labelColor: 'text-gray-400',
      dotColor: 'bg-gray-300',
    },
  }

  const cfg = statusConfig[status]

  return (
    <div className="bg-white rounded-2xl p-5 shadow border-2 border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {cfg.icon}
          <h3 className="text-sm font-semibold text-gray-600">NOTIFICAÇÕES</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${cfg.dotColor}`} />
          <span className={`text-sm font-bold ${cfg.labelColor}`}>{cfg.label}</span>
        </div>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed mb-4">
        Receba lembretes diários com os horários sugeridos dos tratos de amanhã, enviados às 17h.
      </p>

      {/* Feedback */}
      {feedback && (
        <div
          className={`mb-3 p-3 rounded-xl text-xs leading-relaxed flex items-start gap-2 ${
            feedback.type === 'success'
              ? 'bg-green-50 border border-green-300 text-green-800'
              : feedback.type === 'error'
                ? 'bg-red-50 border border-red-300 text-red-800'
                : 'bg-blue-50 border border-blue-300 text-blue-800'
          }`}
        >
          {feedback.type === 'error' && <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Botões de ação */}
      {status === 'denied' ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-xs text-red-700 leading-relaxed">
            Você bloqueou as notificações. Para desbloquear:
          </p>
          <ol className="text-xs text-red-600 mt-1 ml-4 list-decimal space-y-0.5">
            <li>Toque no ícone de cadeado ou "i" na barra de endereço</li>
            <li>Encontre "Notificações" e mude para "Permitir"</li>
            <li>Recarregue a página e volte aqui</li>
          </ol>
        </div>
      ) : status === 'granted' ? (
        <button
          onClick={handleDesativar}
          disabled={busy}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl px-4 py-3 border-2 border-gray-300 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellOff className="w-4 h-4" />}
          {busy ? 'DESATIVANDO...' : 'DESATIVAR NOTIFICAÇÕES'}
        </button>
      ) : (
        <button
          onClick={handleAtivar}
          disabled={busy}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl px-4 py-3 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
          {busy ? 'ATIVANDO...' : 'ATIVAR NOTIFICAÇÕES'}
        </button>
      )}
    </div>
  )
}

import { useState, useRef, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'

export interface UseVoiceInputReturn {
  /** true enquanto o microfone esta ouvindo */
  ouvindo: boolean
  erro: string | null
  /**
   * Inicia a escuta em pt-BR ou para se ja estiver ouvindo.
   * onTexto e chamada a cada resultado parcial com o texto atual reconhecido.
   */
  toggle: (onTexto: (texto: string) => void) => Promise<void>
  parar: () => Promise<void>
}

/**
 * Ditado de voz para campos de texto. No app nativo usa
 * @capacitor-community/speech-recognition (SpeechRecognizer/SFSpeechRecognizer);
 * no navegador cai para a Web Speech API (Chrome).
 */
export function useVoiceInput(): UseVoiceInputReturn {
  const [ouvindo, setOuvindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const recognitionRef = useRef<any>(null)
  const listenerRef = useRef<PluginListenerHandle | null>(null)
  const onTextoRef = useRef<(texto: string) => void>(() => {})

  const parar = useCallback(async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')
        await SpeechRecognition.stop().catch(() => {})
        await SpeechRecognition.removeAllListeners()
        listenerRef.current = null
      } else {
        recognitionRef.current?.stop()
        recognitionRef.current = null
      }
    } finally {
      setOuvindo(false)
    }
  }, [])

  const iniciarNativo = useCallback(async (): Promise<boolean> => {
    const { SpeechRecognition } = await import('@capacitor-community/speech-recognition')

    const { available } = await SpeechRecognition.available()
    if (!available) {
      setErro('Reconhecimento de voz não disponível neste aparelho.')
      return false
    }

    const perm = await SpeechRecognition.requestPermissions()
    if (perm.speechRecognition !== 'granted') {
      setErro('Permissão de microfone negada. Habilite nas configurações do app.')
      return false
    }

    listenerRef.current = await SpeechRecognition.addListener('partialResults', (data) => {
      const texto = data.matches?.[0]
      if (texto) onTextoRef.current(texto)
    })
    await SpeechRecognition.addListener('listeningState', (data) => {
      if (data.status === 'stopped') setOuvindo(false)
    })

    await SpeechRecognition.start({
      language: 'pt-BR',
      partialResults: true,
      popup: false,
      maxResults: 1,
    })
    return true
  }, [])

  const iniciarWeb = useCallback((): boolean => {
    const Rec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!Rec) {
      setErro('Reconhecimento de voz não suportado neste navegador.')
      return false
    }

    const rec = new Rec()
    rec.lang = 'pt-BR'
    rec.interimResults = true
    rec.continuous = false
    rec.maxAlternatives = 1

    rec.onresult = (e: any) => {
      const texto = e.results[e.results.length - 1]?.[0]?.transcript
      if (texto) onTextoRef.current(texto)
    }
    rec.onend = () => setOuvindo(false)
    rec.onerror = (e: any) => {
      setOuvindo(false)
      setErro(e.error === 'not-allowed'
        ? 'Permissão de microfone negada.'
        : 'Erro no reconhecimento de voz. Tente novamente.')
    }

    rec.start()
    recognitionRef.current = rec
    return true
  }, [])

  const toggle = useCallback(async (onTexto: (texto: string) => void) => {
    if (ouvindo) {
      await parar()
      return
    }

    setErro(null)
    onTextoRef.current = onTexto

    try {
      const ok = Capacitor.isNativePlatform() ? await iniciarNativo() : iniciarWeb()
      if (ok) setOuvindo(true)
    } catch (e) {
      console.error('[useVoiceInput] Erro ao iniciar:', e)
      setErro('Erro ao iniciar o reconhecimento de voz.')
      await parar()
    }
  }, [ouvindo, parar, iniciarNativo, iniciarWeb])

  return { ouvindo, erro, toggle, parar }
}

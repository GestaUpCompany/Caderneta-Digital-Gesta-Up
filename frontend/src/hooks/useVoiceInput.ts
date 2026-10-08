import { useState, useRef, useCallback, useEffect } from 'react'
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
  const [ouvindo, setOuvindoState] = useState(false)
  // Espelho síncrono do estado: quem chama parar() e logo depois toggle() no mesmo render (troca de campo
  // durante o ditado) enxergaria o valor antigo de `ouvindo` e só pararia, sem iniciar o novo ditado.
  const ouvindoRef = useRef(false)
  const setOuvindo = useCallback((valor: boolean) => {
    ouvindoRef.current = valor
    setOuvindoState(valor)
  }, [])
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
  }, [setOuvindo])

  // Sair da tela com o microfone ligado não pode deixar o reconhecimento rodando em segundo plano
  useEffect(() => {
    return () => {
      if (ouvindoRef.current) void parar()
    }
  }, [parar])

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
  }, [setOuvindo])

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

    // Ao trocar de campo, a sessão antiga ainda dispara onend/onresult depois de parada: ignorar,
    // senão ela apagaria o indicador da sessão nova ou jogaria texto no campo errado.
    const sessaoAtual = () => recognitionRef.current === rec || recognitionRef.current === null

    rec.onresult = (e: any) => {
      if (recognitionRef.current !== rec) return
      const texto = e.results[e.results.length - 1]?.[0]?.transcript
      if (texto) onTextoRef.current(texto)
    }
    rec.onend = () => {
      if (sessaoAtual()) setOuvindo(false)
    }
    rec.onerror = (e: any) => {
      if (!sessaoAtual()) return
      setOuvindo(false)
      setErro(
        e.error === 'not-allowed'
          ? 'Permissão de microfone negada.'
          : e.error === 'network'
            ? 'Sem internet: o ditado por voz precisa de conexão neste navegador. Digite a observação.'
            : 'Erro no reconhecimento de voz. Tente novamente.'
      )
    }

    recognitionRef.current = rec
    rec.start()
    return true
  }, [setOuvindo])

  const toggle = useCallback(async (onTexto: (texto: string) => void) => {
    if (ouvindoRef.current) {
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
  }, [parar, iniciarNativo, iniciarWeb, setOuvindo])

  return { ouvindo, erro, toggle, parar }
}

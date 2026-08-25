import { useState, useRef, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { Geolocation } from '@capacitor/geolocation'
import { comprimirFoto } from '../utils/photoCompress'

export interface PhotoGpsData {
  fotoBase64: string | null
  latitude: number | null
  longitude: number | null
  gpsAccuracy: number | null
}

export interface UsePhotoGpsOptions {
  /** Se true, GPS e obrigatorio para a foto (modo MortePage). Se false, GPS e independente da foto. */
  gpsObrigatorio?: boolean
  /** Timeout do GPS em ms (default 15000) */
  gpsTimeout?: number
}

export interface UsePhotoGpsReturn {
  fotoBase64: string | null
  latitude: number | null
  longitude: number | null
  gpsAccuracy: number | null
  capturandoFoto: boolean
  capturandoGps: boolean
  fotoErro: string | null
  gpsErro: string | null
  /** Tira foto e captura GPS em paralelo. Se gpsObrigatorio e GPS falhar, retorna erro. */
  capturarFotoComGps: () => Promise<PhotoGpsData | null>
  /** Tira apenas a foto (GPS deve ser capturado separadamente se necessario) */
  capturarFoto: () => Promise<string | null>
  /** Captura apenas a coordenada GPS */
  capturarGps: () => Promise<{ latitude: number; longitude: number; accuracy: number | null } | null>
  /** Remove foto e coordenadas */
  limpar: () => void
  /** Setter manual para coordenadas (quando GPS vem de outra fonte) */
  setCoordenadas: (lat: number | null, lng: number | null, accuracy: number | null) => void
  /** Ref para o input file hidden (fallback web) */
  fotoInputRef: React.RefObject<HTMLInputElement>
  /** Handler para o input file change (fallback web) */
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => Promise<PhotoGpsData | null>
}

export function usePhotoGps(options: UsePhotoGpsOptions = {}): UsePhotoGpsReturn {
  const { gpsObrigatorio = false, gpsTimeout = 15000 } = options

  const [fotoBase64, setFotoBase64] = useState<string | null>(null)
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null)
  const [capturandoFoto, setCapturandoFoto] = useState(false)
  const [capturandoGps, setCapturandoGps] = useState(false)
  const [fotoErro, setFotoErro] = useState<string | null>(null)
  const [gpsErro, setGpsErro] = useState<string | null>(null)
  const fotoInputRef = useRef<HTMLInputElement>(null)

  const limpar = useCallback(() => {
    setFotoBase64(null)
    setLatitude(null)
    setLongitude(null)
    setGpsAccuracy(null)
    setFotoErro(null)
    setGpsErro(null)
  }, [])

  const setCoordenadas = useCallback((lat: number | null, lng: number | null, accuracy: number | null) => {
    setLatitude(lat)
    setLongitude(lng)
    setGpsAccuracy(accuracy)
  }, [])

  /**
   * Captura coordenada GPS. Funciona em nativo (Capacitor Geolocation) e web (navigator.geolocation).
   * Retorna null se falhar.
   */
  const capturarGps = useCallback(async (): Promise<{ latitude: number; longitude: number; accuracy: number | null } | null> => {
    setGpsErro(null)
    setCapturandoGps(true)

    try {
      if (Capacitor.isNativePlatform()) {
        // Em nativo, pedir permissao explicitamente (iOS e Android)
        try {
          const perm = await Geolocation.requestPermissions()
          if (perm.location === 'denied') {
            setGpsErro('Permissão de localização negada.')
            return null
          }
        } catch {
          // iOS as vezes lanca excecao se a permissao ja foi decidida; ignorar
        }

        try {
          const pos = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: gpsTimeout,
          })
          setLatitude(pos.coords.latitude)
          setLongitude(pos.coords.longitude)
          setGpsAccuracy(pos.coords.accuracy ?? null)
          return {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? null,
          }
        } catch {
          setGpsErro('Não foi possível obter a localização. Verifique o GPS do dispositivo.')
          return null
        }
      } else {
        // Web: navigator.geolocation
        if (!navigator.geolocation) {
          setGpsErro('Geolocalização não suportada neste navegador.')
          return null
        }

        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: gpsTimeout,
            })
          })
          setLatitude(pos.coords.latitude)
          setLongitude(pos.coords.longitude)
          setGpsAccuracy(pos.coords.accuracy ?? null)
          return {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? null,
          }
        } catch {
          setGpsErro('Não foi possível obter a localização.')
          return null
        }
      }
    } finally {
      setCapturandoGps(false)
    }
  }, [gpsTimeout])

  /**
   * Tira foto usando Capacitor Camera (nativo) ou input file (web).
   * CORRECAO iOS: pede Camera.requestPermissions() explicitamente antes de getPhoto.
   * Retorna base64 comprimido ou null se falhar/usuario cancelar.
   */
  const capturarFoto = useCallback(async (): Promise<string | null> => {
    setFotoErro(null)
    setCapturandoFoto(true)

    try {
      if (Capacitor.isNativePlatform()) {
        // CORRECAO iOS: pedir permissao de camera explicitamente antes de abrir
        try {
          const perm = await Camera.checkPermissions()
          if (perm.camera === 'prompt' || perm.camera === 'prompt-with-rationale') {
            const reqPerm = await Camera.requestPermissions()
            if (reqPerm.camera === 'denied') {
              setFotoErro('Permissão de câmera negada. Habilite nas configurações do app.')
              return null
            }
          } else if (perm.camera === 'denied') {
            setFotoErro('Permissão de câmera negada. Habilite nas configurações do app.')
            return null
          }
        } catch {
          // Se checkPermissions falhar (versao antiga do plugin), tentar getPhoto direto
        }

        let photo
        try {
          photo = await Camera.getPhoto({
            quality: 60,
            allowEditing: false,
            resultType: CameraResultType.Base64,
            source: CameraSource.Camera,
            correctOrientation: true,
          })
        } catch (err: any) {
          // Usuario cancelou ou erro na camera
          if (err?.message?.includes('cancelled') || err?.message?.includes('User denied')) {
            return null
          }
          setFotoErro('Erro ao abrir a câmera. Tente novamente.')
          return null
        }

        if (!photo.base64String) {
          setFotoErro('Falha ao capturar foto.')
          return null
        }

        const compressed = await comprimirFoto(photo.base64String)
        setFotoBase64(compressed)
        return compressed
      } else {
        // Web: disparar input file com capture
        fotoInputRef.current?.click()
        return null // O resultado vem via handleFileInputChange
      }
    } catch (err: any) {
      console.error('[usePhotoGps] Erro ao capturar foto:', err)
      setFotoErro('Erro ao capturar foto. Tente novamente.')
      return null
    } finally {
      setCapturandoFoto(false)
    }
  }, [])

  /**
   * Tira foto E captura GPS em paralelo (nao bloqueia camera no GPS).
   * Se gpsObrigatorio=true e GPS falhar, retorna null mesmo com foto.
   */
  const capturarFotoComGps = useCallback(async (): Promise<PhotoGpsData | null> => {
    setFotoErro(null)
    setGpsErro(null)
    setCapturandoFoto(true)
    setCapturandoGps(true)

    try {
      // Disparar GPS e camera em paralelo (nao bloqueia camera no GPS)
      const [fotoResult, gpsResult] = await Promise.all([
        capturarFoto(),
        capturarGps(),
      ])

      // Se gpsObrigatorio e GPS falhou, abortar
      if (gpsObrigatorio && !gpsResult) {
        setFotoErro('Não foi possível obter a localização. A foto só pode ser tirada com coordenadas capturadas.')
        setFotoBase64(null)
        return null
      }

      // Se foto falhou (usuario cancelou ou erro), retornar null
      if (!fotoResult && !fotoBase64) {
        return null
      }

      const result: PhotoGpsData = {
        fotoBase64: fotoResult ?? fotoBase64,
        latitude: gpsResult?.latitude ?? null,
        longitude: gpsResult?.longitude ?? null,
        gpsAccuracy: gpsResult?.accuracy ?? null,
      }

      setFotoBase64(result.fotoBase64)
      setLatitude(result.latitude)
      setLongitude(result.longitude)
      setGpsAccuracy(result.gpsAccuracy)

      return result
    } catch (err: any) {
      console.error('[usePhotoGps] Erro ao capturar foto+GPS:', err)
      setFotoErro('Erro ao capturar foto. Tente novamente.')
      return null
    } finally {
      setCapturandoFoto(false)
      setCapturandoGps(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gpsObrigatorio, capturarFoto, capturarGps])

  /**
   * Handler para input file change (fallback web).
   * Le o arquivo como base64, comprime, e captura GPS em paralelo.
   */
  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>): Promise<PhotoGpsData | null> => {
    const file = e.target.files?.[0]
    if (!file) return null

    setCapturandoFoto(true)
    setFotoErro(null)

    try {
      // Ler arquivo como base64
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string
          const b64 = result.split(',')[1]
          resolve(b64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const compressed = await comprimirFoto(base64)
      setFotoBase64(compressed)

      // GPS em paralelo (nao bloqueia)
      const gpsResult = await capturarGps()

      if (gpsObrigatorio && !gpsResult) {
        setFotoErro('Não foi possível obter a localização. A foto só pode ser tirada com coordenadas capturadas.')
        setFotoBase64(null)
        return null
      }

      const result: PhotoGpsData = {
        fotoBase64: compressed,
        latitude: gpsResult?.latitude ?? null,
        longitude: gpsResult?.longitude ?? null,
        gpsAccuracy: gpsResult?.accuracy ?? null,
      }

      setLatitude(result.latitude)
      setLongitude(result.longitude)
      setGpsAccuracy(result.gpsAccuracy)

      return result
    } catch (err: any) {
      console.error('[usePhotoGps] Erro ao processar foto web:', err)
      setFotoErro('Erro ao processar foto. Tente novamente.')
      return null
    } finally {
      setCapturandoFoto(false)
      if (fotoInputRef.current) fotoInputRef.current.value = ''
    }
  }, [gpsObrigatorio, capturarGps])

  return {
    fotoBase64,
    latitude,
    longitude,
    gpsAccuracy,
    capturandoFoto,
    capturandoGps,
    fotoErro,
    gpsErro,
    capturarFotoComGps,
    capturarFoto,
    capturarGps,
    limpar,
    setCoordenadas,
    fotoInputRef,
    handleFileInputChange,
  }
}

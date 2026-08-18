import { useState, useCallback, useRef, useEffect } from 'react'
import { salvarRascunho, lerRascunho, limparRascunho as limparRascunhoDB } from '../services/indexedDB'

interface UseRascunhoFormOptions<T> {
  /** Chave unica da caderneta para persistir o rascunho (ex: 'clima', 'limpeza') */
  rascunhoKey: string
  /** Funcao que retorna o estado inicial do formulario */
  makeInitial: () => T
}

interface UseRascunhoFormReturn<T> {
  form: T
  setForm: React.Dispatch<React.SetStateAction<T>>
  /** Limpa o rascunho e reseta o formulario para o estado inicial */
  limparRascunho: () => void
  /** Indica que um rascunho foi restaurado do cache e aguarda decisao do usuario */
  rascunhoRestaurado: boolean
  /** Confirma o uso do rascunho restaurado (descarta o banner) */
  confirmarRascunho: () => void
  /** Descarta o rascunho restaurado e volta ao estado inicial */
  descartarRascunho: () => void
}

/**
 * Hook que substitui o useState de formulario, adicionando persistencia
 * automatica de rascunho no IndexedDB. A cada mutacao do form, grava o
 * estado com debounce de 500ms. No mount, verifica se existe rascunho
 * valido e o carrega, sinalizando via rascunhoRestaurado para a UI
 * mostrar um banner de confirmacao.
 */
export function useRascunhoForm<T>({
  rascunhoKey,
  makeInitial,
}: UseRascunhoFormOptions<T>): UseRascunhoFormReturn<T> {
  const [form, setFormState] = useState<T>(makeInitial)
  const [rascunhoRestaurado, setRascunhoRestaurado] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadedRef = useRef(false)
  const formRef = useRef(form)

  formRef.current = form

  // Carregar rascunho no mount
  useEffect(() => {
    let cancelled = false
    async function carregar() {
      try {
        const salvo = await lerRascunho<T>(rascunhoKey)
        if (cancelled || !salvo) return

        // Verificar se o rascunho nao e o estado inicial vazio
        const inicial = makeInitial()
        const salvoStr = JSON.stringify(salvo)
        const inicialStr = JSON.stringify(inicial)

        if (salvoStr === inicialStr) return

        // Rascunho valido encontrado
        setFormState(salvo)
        setRascunhoRestaurado(true)
      } catch (error) {
        console.error('[useRascunhoForm] Erro ao carregar rascunho:', error)
      } finally {
        loadedRef.current = true
      }
    }
    carregar()
    return () => { cancelled = true }
  }, [rascunhoKey, makeInitial])

  // Persistir com debounce a cada mudanca
  const setForm = useCallback<React.Dispatch<React.SetStateAction<T>>>((updater) => {
    setFormState(updater)
  }, [])

  useEffect(() => {
    if (!loadedRef.current) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      const current = formRef.current
      // Nao persistir se o form esta no estado inicial vazio
      const inicial = makeInitial()
      if (JSON.stringify(current) === JSON.stringify(inicial)) {
        limparRascunhoDB(rascunhoKey).catch(() => {})
        return
      }

      salvarRascunho(rascunhoKey, current).catch((err) => {
        console.error('[useRascunhoForm] Erro ao salvar rascunho:', err)
      })
    }, 500)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [form, rascunhoKey, makeInitial])

  const limparRascunho = useCallback(() => {
    setFormState(makeInitial())
    limparRascunhoDB(rascunhoKey).catch(() => {})
    setRascunhoRestaurado(false)
  }, [rascunhoKey, makeInitial])

  const confirmarRascunho = useCallback(() => {
    setRascunhoRestaurado(false)
  }, [])

  const descartarRascunho = useCallback(() => {
    setFormState(makeInitial())
    limparRascunhoDB(rascunhoKey).catch(() => {})
    setRascunhoRestaurado(false)
  }, [rascunhoKey, makeInitial])

  return {
    form,
    setForm,
    limparRascunho,
    rascunhoRestaurado,
    confirmarRascunho,
    descartarRascunho,
  }
}

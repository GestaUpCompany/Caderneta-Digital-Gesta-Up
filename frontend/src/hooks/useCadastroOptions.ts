import { useState, useEffect, useCallback } from 'react'
import { getCachedCadastroData, needsCacheUpdate } from '../services/cadastroCache'
import { eventBus, CADASTRO_CACHE_UPDATED } from '../utils/eventBus'
import * as supabaseService from '../services/supabaseService'

export type CadastroOptionType =
  | 'pastos'
  | 'lotes'
  | 'frigorificos'
  | 'causasMorte'
  | 'bebedouros'
  | 'fornecedores'
  | 'funcionarios'
  | 'formulacoes'
  | 'mineral'
  | 'proteinado'
  | 'racao'
  | 'insumos'

interface UseCadastroOptionsResult {
  options: string[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

const SUPABASE_FETCHERS: Record<string, (fazendaId: string) => Promise<any[]>> = {
  pastos: supabaseService.getPastos,
  lotes: supabaseService.getLotes,
  frigorificos: supabaseService.getFrigorificos,
  causasMorte: supabaseService.getCausasMorte,
  bebedouros: supabaseService.getBebedouros,
  fornecedores: supabaseService.getFornecedores,
  funcionarios: supabaseService.getFuncionarios,
  formulacoes: supabaseService.getFormulacoes,
  mineral: supabaseService.getMineral,
  proteinado: supabaseService.getProteinado,
  racao: supabaseService.getRacao,
  insumos: supabaseService.getInsumos,
}

/**
 * Hook que retorna dados de cadastro do cache imediatamente.
 * Se online e cache expirado, atualiza em background do Supabase.
 * Sempre funciona offline retornando o último cache disponível.
 */
export function useCadastroOptions(
  type: CadastroOptionType,
  fazendaId?: string
): UseCadastroOptionsResult {
  const [options, setOptions] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. Sempre retornar do cache imediatamente (funciona offline)
      const cache = await getCachedCadastroData()
      const cachedOptions = cache?.[type] || []
      setOptions(cachedOptions)

      // 2. Se online e cache expirado/vazio, buscar do Supabase em background
      if (navigator.onLine && fazendaId && (cachedOptions.length === 0 || needsCacheUpdate())) {
        const fetcher = SUPABASE_FETCHERS[type]
        if (fetcher) {
          try {
            const data = await fetcher(fazendaId)
            const freshOptions = data?.map((item: any) => item.nome) || []
            if (freshOptions.length > 0) {
              setOptions(freshOptions)
            }
          } catch (apiError) {
            console.warn(`[useCadastroOptions] Falha ao buscar ${type} do Supabase:`, apiError)
            // Não sobrescreve o cache com erro — mantém dados em cache
          }
        }
      }
    } catch (err) {
      console.error(`[useCadastroOptions] Erro ao carregar ${type}:`, err)
      setError(`Erro ao carregar ${type}`)
    } finally {
      setLoading(false)
    }
  }, [type, fazendaId])

  useEffect(() => {
    load()
  }, [load])

  // Escutar evento de atualização do cache para re-renderizar automaticamente
  useEffect(() => {
    const handleCacheUpdate = (data: any) => {
      const updated = data?.[type]
      if (updated && Array.isArray(updated)) {
        setOptions(updated)
      }
    }

    eventBus.on(CADASTRO_CACHE_UPDATED, handleCacheUpdate)
    return () => {
      eventBus.off(CADASTRO_CACHE_UPDATED, handleCacheUpdate)
    }
  }, [type])

  return { options, loading, error, refresh: load }
}

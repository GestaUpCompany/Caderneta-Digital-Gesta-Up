import { useState, useCallback, useEffect, useRef } from 'react'
import { getRelatorioLoteCicloVida } from '../services/supabaseService'
import { getLotesParaRelatorioCached, getRelatorioLoteFromCacheOnly } from '../services/cadastroCache'
import {
  SECOES_INICIAIS,
  SECOES_RELATORIO_LOTE,
  type RelatorioLotePayload,
} from '../types/relatorioLote'

// Os relatórios consultam o Supabase direto (RPC) e não existem offline.
// "Load failed"/"Failed to fetch" é só o fetch sem rede; traduz para algo útil.
function mensagemErroRelatorio(e: any, padrao: string): string {
  const msg: string = e?.message || ''
  const semRede =
    (typeof navigator !== 'undefined' && !navigator.onLine) ||
    /load failed|failed to fetch|networkerror|network request failed/i.test(msg)
  if (semRede) {
    return 'Os relatórios precisam de internet. Conecte-se e toque em "Tentar de novo".'
  }
  return msg || padrao
}

interface UseRelatorioLoteReturn {
  dados: RelatorioLotePayload | null
  loading: boolean
  erro: string | null
  secaoCarregando: string | null
  secoesCarregadas: Set<string>
  carregarSecao: (nomeSecao: string) => Promise<void>
  recarregar: () => void
}

export function useRelatorioLote(
  fazendaId: string | null,
  loteId: string | null
): UseRelatorioLoteReturn {
  const [dados, setDados] = useState<RelatorioLotePayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [secaoCarregando, setSecaoCarregando] = useState<string | null>(null)
  const [secoesCarregadas, setSecoesCarregadas] = useState<Set<string>>(new Set())
  const recarregarFlag = useRef(0)

  const carregarInicial = useCallback(async () => {
    if (!fazendaId || !loteId) return
    setLoading(true)
    setErro(null)
    try {
      // Sem rede: usa o payload completo guardado no "Atualizar dados" (todas as seções já vêm nele)
      if (!navigator.onLine) {
        const cache = await getRelatorioLoteFromCacheOnly(fazendaId, loteId)
        if (cache) {
          setDados(cache)
          setSecoesCarregadas(new Set(Object.values(SECOES_RELATORIO_LOTE)))
          return
        }
      }
      const secoesIniciais = [...SECOES_INICIAIS]
      const resultado = await getRelatorioLoteCicloVida(fazendaId, loteId, secoesIniciais)
      if (resultado.success === false) {
        setErro(resultado.error || 'Lote não encontrado')
        setDados(null)
      } else {
        setDados(resultado)
        setSecoesCarregadas(new Set(secoesIniciais))
      }
    } catch (e: any) {
      // Rede caiu no meio (sinal fraco): tenta o cache antes de mostrar erro
      const cache = await getRelatorioLoteFromCacheOnly(fazendaId, loteId).catch(() => null)
      if (cache) {
        setDados(cache)
        setSecoesCarregadas(new Set(Object.values(SECOES_RELATORIO_LOTE)))
        return
      }
      setErro(
        !navigator.onLine || /load failed|failed to fetch|network/i.test(e?.message || '')
          ? 'Este relatório ainda não foi baixado. Conecte-se e use "Atualizar dados" para ter os relatórios offline.'
          : mensagemErroRelatorio(e, 'Erro ao carregar relatório')
      )
      setDados(null)
    } finally {
      setLoading(false)
    }
  }, [fazendaId, loteId])

  const carregarSecao = useCallback(
    async (nomeSecao: string) => {
      if (!fazendaId || !loteId) return
      if (secoesCarregadas.has(nomeSecao)) return
      if (secaoCarregando === nomeSecao) return

      setSecaoCarregando(nomeSecao)
      try {
        const resultado = await getRelatorioLoteCicloVida(fazendaId, loteId, [nomeSecao])
        if (resultado.success !== false) {
          setDados((prev) => ({ ...prev, ...resultado } as RelatorioLotePayload))
          setSecoesCarregadas((prev) => {
            const nova = new Set(prev)
            nova.add(nomeSecao)
            return nova
          })
        }
      } catch {
        // Silencioso: a seção fica sem dados, UI mostra mensagem de vazio
      } finally {
        setSecaoCarregando(null)
      }
    },
    [fazendaId, loteId, secoesCarregadas, secaoCarregando]
  )

  const recarregar = useCallback(() => {
    setSecoesCarregadas(new Set())
    recarregarFlag.current++
  }, [])

  useEffect(() => {
    carregarInicial()
  }, [carregarInicial, recarregarFlag])

  return {
    dados,
    loading,
    erro,
    secaoCarregando,
    secoesCarregadas,
    carregarSecao,
    recarregar,
  }
}

// Hook auxiliar para listar lotes do seletor
export function useLotesParaRelatorio(fazendaId: string | null) {
  const [lotes, setLotes] = useState<
    { lote_id: string; nome: string; ativo: boolean; n_cabecas: number; categorias: string | null; pasto_nome: string | null; data_criacao: string; tem_movimentacao: boolean; tem_morte: boolean; tem_consumo: boolean }[]
  >([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!fazendaId) return
    setLoading(true)
    setErro(null)
    try {
      const lista = await getLotesParaRelatorioCached(fazendaId)
      setLotes(lista)
    } catch (e: any) {
      setErro(mensagemErroRelatorio(e, 'Erro ao carregar lotes'))
      setLotes([])
    } finally {
      setLoading(false)
    }
  }, [fazendaId])

  useEffect(() => {
    carregar()
  }, [carregar])

  return { lotes, loading, erro, recarregar: carregar }
}

export { SECOES_RELATORIO_LOTE }

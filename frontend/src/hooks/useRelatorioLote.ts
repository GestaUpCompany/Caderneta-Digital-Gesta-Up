import { useState, useCallback, useEffect, useRef } from 'react'
import { getRelatorioLoteCicloVida } from '../services/supabaseService'
import {
  SECOES_INICIAIS,
  SECOES_RELATORIO_LOTE,
  type RelatorioLotePayload,
} from '../types/relatorioLote'

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
      setErro(e?.message || 'Erro ao carregar relatório')
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
      const { getLotesParaRelatorio } = await import('../services/supabaseService')
      const lista = await getLotesParaRelatorio(fazendaId)
      setLotes(lista)
    } catch (e: any) {
      setErro(e?.message || 'Erro ao carregar lotes')
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

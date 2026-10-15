import { useEffect, useMemo, useState } from 'react'
import { Boxes } from 'lucide-react'
import ChoiceGrid from './ChoiceGrid'
import { getTodosItensAlmoxarifadoFromCacheOnly, revalidarEstoqueAlmoxarifado } from '../../services/cadastroCache'
import { iconePorNome } from '../../utils/iconeClassificacao'

interface EstoqueAlmoxarifadoModalProps {
  aberto: boolean
  onFechar: () => void
  fazendaId?: string | null
}

const TODOS = 'Todos'

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * Consulta do estoque atual do almoxarifado (somente leitura), lida do cache offline.
 * Abas por classificacao e busca por nome.
 */
export default function EstoqueAlmoxarifadoModal({ aberto, onFechar, fazendaId }: EstoqueAlmoxarifadoModalProps) {
  const [itens, setItens] = useState<any[]>([])
  const [carregando, setCarregando] = useState(false)
  const [aba, setAba] = useState(TODOS)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    if (!aberto || !fazendaId) return
    let cancelado = false
    setCarregando(true)
    setAba(TODOS)
    setBusca('')
    // Mostra o cache na hora e revalida online em segundo plano (so troca a lista se a revalidacao der certo)
    const carregar = async () => {
      let temCache = false
      try {
        const cache = await getTodosItensAlmoxarifadoFromCacheOnly(fazendaId)
        if (cache && !cancelado) { setItens(cache); temCache = true }
      } catch { /* sem cache */ }
      if (!cancelado && temCache) setCarregando(false)
      const atual = await revalidarEstoqueAlmoxarifado(fazendaId)
      if (cancelado) return
      if (atual) setItens(atual)
      setCarregando(false)
    }
    carregar()
    return () => { cancelado = true }
  }, [aberto, fazendaId])

  const classificacoes = useMemo(
    () => Array.from(new Set(itens.map((i) => i.classificacao).filter(Boolean))) as string[],
    [itens]
  )

  const visiveis = useMemo(() => {
    const termo = semAcento(busca.trim())
    return itens
      .filter((i) => aba === TODOS || i.classificacao === aba)
      .filter((i) => !termo || semAcento(String(i.nome || '')).includes(termo))
  }, [itens, aba, busca])

  if (!aberto) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={onFechar}>
      <div
        className="bg-white rounded-t-3xl p-5 w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <Boxes className="h-9 w-9 text-brand-700 mx-auto shrink-0" />
        <h3 className="text-lg font-black text-gray-900 mt-2 text-center">Estoque atual</h3>

        <div className="mt-3 flex flex-col gap-3 shrink-0">
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar item..."
            aria-label="Buscar item no estoque"
            className="w-full rounded-xl border-2 border-gray-300 px-3 py-2.5 text-base"
          />
          {classificacoes.length > 0 && (
            <ChoiceGrid
              options={[TODOS, ...classificacoes].map((c) => ({
                value: c,
                label: c,
                icon: c === TODOS ? '📦' : iconePorNome(c),
              }))}
              value={aba}
              onChange={setAba}
              cols={3}
              size="sm"
              labelSize="xs"
            />
          )}
        </div>

        <div className="mt-3 flex-1 overflow-y-auto min-h-0">
          {carregando ? (
            <p className="py-6 text-center text-sm text-gray-500">Carregando...</p>
          ) : visiveis.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">Nenhum item encontrado</p>
          ) : (
            visiveis.map((item) => {
              const unidade = item.unidade || 'un'
              const saldo = Number(item.estoque_atual ?? 0)
              const zerado = item.controla_estoque && saldo <= 0
              return (
                <div
                  key={item.id || `${item.classificacao}-${item.nome}`}
                  className="flex items-center gap-3 border-b border-gray-100 py-3 last:border-b-0"
                >
                  <span className="text-2xl leading-none">{iconePorNome(item.classificacao)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-base font-bold leading-tight text-gray-900">{item.nome}</p>
                    {aba === TODOS && item.classificacao && (
                      <p className="text-xs text-gray-500">{item.classificacao}</p>
                    )}
                  </div>
                  {item.controla_estoque ? (
                    <span className={`shrink-0 text-base font-extrabold ${zerado ? 'text-red-600' : 'text-brand-700'}`}>
                      {saldo.toLocaleString('pt-BR')} {unidade}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs font-semibold text-gray-500">sem controle</span>
                  )}
                </div>
              )
            })
          )}
        </div>

        <button
          onClick={onFechar}
          className="mt-4 w-full shrink-0 font-bold px-4 py-3 rounded-2xl border-2 border-gray-300 text-gray-700 bg-gray-100 active:bg-gray-200"
        >
          FECHAR
        </button>
      </div>
    </div>
  )
}

import { store } from '../store/store'
import { requestSyncNow } from '../store/slices/syncSlice'
import { updateCadastroCache, getCachedCadastroData, syncAllCadastroData, setCadastroCacheTimestamp } from './cadastroCache'
import { syncMapaSePreciso } from './mapaCache'
import { countPending } from './indexedDB'
import { eventBus, CADASTRO_CACHE_UPDATED, REFRESH_CONCLUIDO } from '../utils/eventBus'
import { motivoBloqueioRefresh, type MotivoRefresh } from '../utils/pullToRefreshLogic'
import type { FaseSync } from './atualizacaoAutomaticaStatus'

export interface ResultadoRefresh {
  ok: boolean
  motivo?: MotivoRefresh
  pendentes: number
}

const ESPERA_MAX_SYNC_MS = 20_000

const aguardar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Espera o ciclo de envio (disparado por requestSyncNow) terminar, com teto de tempo. */
async function aguardarFimDoEnvio() {
  // Dá tempo do useSync reagir ao requestSyncNow e marcar 'syncing'
  await aguardar(600)
  const inicio = Date.now()
  while (store.getState().sync.status === 'syncing' && Date.now() - inicio < ESPERA_MAX_SYNC_MS) {
    await aguardar(300)
  }
}

/**
 * navigator.onLine é otimista (sinal fraco, Wi-Fi sem internet, emulação de offline).
 * Antes de prometer "Atualizado", confirma que o Supabase responde.
 */
async function servidorAcessivel(): Promise<boolean> {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!url) return true
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 4000)
  try {
    await fetch(`${url}/auth/v1/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: ctrl.signal,
      headers: { apikey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '' },
    })
    return true // qualquer resposta HTTP prova que há rede
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

let emAndamento: Promise<ResultadoRefresh> | null = null

/**
 * "Puxar para atualizar": envia a fila (push), atualiza cadastros e mapa (pull leve)
 * e avisa as telas para recarregarem. Versão leve: não usa o overlay bloqueante da Home.
 */
export function executarRefresh(): Promise<ResultadoRefresh> {
  if (emAndamento) return emAndamento

  emAndamento = (async (): Promise<ResultadoRefresh> => {
    const { fazendaId, testModeAtivo } = store.getState().config
    const motivo = motivoBloqueioRefresh({ online: navigator.onLine, testModeAtivo, fazendaId })
    if (motivo) return { ok: false, motivo, pendentes: await countPending().catch(() => 0) }

    if (!(await servidorAcessivel())) {
      return { ok: false, motivo: 'offline', pendentes: await countPending().catch(() => 0) }
    }

    store.dispatch(requestSyncNow())
    await aguardarFimDoEnvio()

    // updateCadastroCache aborta sozinho se ainda houver pendências
    await Promise.allSettled([
      updateCadastroCache(fazendaId!, fazendaId!),
      syncMapaSePreciso(fazendaId!),
    ])

    const pendentes = await countPending().catch(() => 0)
    // updateCadastroCache não notifica as telas: as que escutam o cache (lotes, pastos...) recebem o payload novo aqui
    const cache = await getCachedCadastroData().catch(() => null)
    if (cache) eventBus.emit(CADASTRO_CACHE_UPDATED, cache)
    eventBus.emit(REFRESH_CONCLUIDO)
    return { ok: true, pendentes }
  })().finally(() => {
    emAndamento = null
  })

  return emAndamento
}

const CHAVE_ULTIMO_AQUECIMENTO = 'ultimo-aquecimento-cache'

let completaEmAndamento: Promise<{ success: boolean; errors: string[] }> | null = null

/** Quem quiser acompanhar a execução em andamento (botão manual, atualização automática) */
type OuvinteProgresso = (current: number, total: number, item: string, fase: FaseSync) => void
const ouvintesAtuais = new Set<OuvinteProgresso>()

/**
 * Atualização completa dos dados: o mesmo efeito do botão "Atualizar Dados" da Home
 * (drena a fila, baixa cadastros e aquece o cache). Só marca o horário quando termina sem erro.
 * Se já houver uma execução em andamento, não inicia outra: o `onProgress` de quem chegou
 * depois passa a receber o progresso da execução que está rodando.
 */
export function executarAtualizacaoCompleta(
  fazendaId: string,
  onProgress?: OuvinteProgresso
): Promise<{ success: boolean; errors: string[] }> {
  if (onProgress) ouvintesAtuais.add(onProgress)
  if (completaEmAndamento) return completaEmAndamento

  completaEmAndamento = (async () => {
    const result = await syncAllCadastroData(fazendaId, (current, total, item, fase) => {
      ouvintesAtuais.forEach((ouvinte) => ouvinte(current, total, item, fase))
    })
    if (result.errors.length === 0) {
      const timestamp = new Date().toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit',
        hour: '2-digit', minute: '2-digit',
      })
      localStorage.setItem(CHAVE_ULTIMO_AQUECIMENTO, timestamp)
      setCadastroCacheTimestamp()
    }
    return result
  })().finally(() => {
    completaEmAndamento = null
    ouvintesAtuais.clear()
  })

  return completaEmAndamento
}

/** True enquanto uma atualização completa (manual ou automática) está rodando. */
export function atualizacaoCompletaEmAndamento(): boolean {
  return completaEmAndamento !== null
}

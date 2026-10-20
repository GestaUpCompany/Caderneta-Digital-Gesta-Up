/**
 * Caderneta de Protocolo IATF: o peão marca no curral o passo de um lote de protocolo criado no painel
 * (implante, retirada, inseminação...). Cada registro local é UMA marcação de passo. O servidor recebe uma chamada de RPC:
 * - passo de Inseminação: registrar_ia_lote_protocolo grava a Inseminação das fêmeas escolhidas (touro/sêmen do grupo); sem
 *   escolha, de todas as ativas que ainda não têm IA. O passo só conclui quando todas as ativas do lote têm IA;
 * - demais passos: marcar_tarefa_protocolo_iatf.
 * As duas usam o id do registro local como chave (reenviar não duplica). Só registra: não altera contagem nem peso.
 */
import { dataBRparaIso } from './manejoCurral'

export type TipoPassoIatf = 'Aplicacao' | 'Retirada' | 'Inseminacao' | 'Outro'

export interface TarefaIatfCache {
  id: string
  dia: number
  ordem: number
  rotulo: string
  tipo: TipoPassoIatf
  medicamento_nome: string | null
  dose: string | null
  data_prevista: string
  feita_em: string | null
}

export interface FemeaIatfCache {
  individuoId: string
  rotulo: string
}

export interface LoteIatfCache {
  id: string
  nome: string
  data_d0: string
  responsavel: string | null
  femeasAtivas: number
  tarefas: TarefaIatfCache[]
  /** Fêmeas ativas do lote (cache novo). Cópia antiga do aparelho não traz: a IA vale para todas, como antes. */
  femeas?: FemeaIatfCache[]
  /** Ids das fêmeas que já têm Inseminação ativa no lote (no servidor). */
  inseminadas?: string[]
}

export interface FormProtocoloIatf {
  data: string
  loteProtocoloId: string
  loteNome: string
  /** D0 do lote (AAAA-MM-DD): a data de execução não pode ser anterior a ele. Vazio em rascunho antigo = não confere. */
  loteD0?: string
  tarefaId: string
  tarefaRotulo: string
  tarefaTipo: '' | TipoPassoIatf
  tarefaDia: number | null
  femeasAtivas: number
  /** Fêmeas desta inseminação (ids). Vazio = todas as ativas que ainda não têm IA (formato antigo). */
  femeasSelecionadas: string[]
  /** Quantas fêmeas podiam ser escolhidas ao abrir o passo de IA (0 = sem lista no cache). */
  femeasDisponiveis: number
  touroNome: string
  semenPartida: string
  tecnico: string
  observacao: string
}

export function formVazioProtocoloIatf(hoje: string): FormProtocoloIatf {
  return {
    data: hoje,
    loteProtocoloId: '',
    loteNome: '',
    tarefaId: '',
    tarefaRotulo: '',
    tarefaTipo: '',
    tarefaDia: null,
    femeasAtivas: 0,
    femeasSelecionadas: [],
    femeasDisponiveis: 0,
    touroNome: '',
    semenPartida: '',
    tecnico: '',
    observacao: '',
  }
}

const vazioParaNulo = (t: string | null | undefined): string | null => (String(t ?? '').trim() === '' ? null : String(t).trim())

export type SituacaoTarefaIatf = 'atrasada' | 'hoje' | 'futura'

/** Situação de uma tarefa pendente, comparando a data prevista (AAAA-MM-DD) com hoje (AAAA-MM-DD). */
export function situacaoTarefaIatf(dataPrevista: string, hojeIso: string): SituacaoTarefaIatf {
  if (dataPrevista < hojeIso) return 'atrasada'
  if (dataPrevista === hojeIso) return 'hoje'
  return 'futura'
}

/** União de dois conjuntos de ids (qualquer um pode faltar). */
export function unirIds(a?: ReadonlySet<string>, b?: ReadonlySet<string>): ReadonlySet<string> {
  return new Set([...(a ?? []), ...(b ?? [])])
}

/** Fêmeas ativas do lote que ainda não têm IA, nem no servidor nem em registro local deste aparelho (`jaCobertas`). */
export function femeasSemIa(lote: LoteIatfCache, jaCobertas?: ReadonlySet<string>): FemeaIatfCache[] {
  const inseminadas = new Set(lote.inseminadas ?? [])
  return (lote.femeas ?? []).filter((f) => !inseminadas.has(f.individuoId) && !jaCobertas?.has(f.individuoId))
}

/**
 * Tarefas ainda por fazer de um lote: sem `feita_em` no servidor e sem marcação local aguardando envio
 * (`tarefasMarcadasLocalmente`), para o peão não marcar o mesmo passo duas vezes offline.
 * O passo de IA é por grupos de fêmeas: continua pendente enquanto sobrar fêmea sem IA, descontadas as que este aparelho
 * já registrou (`femeasComIaLocal`, por passo). Registro local de IA sem lista de fêmeas vale para todas (formato antigo).
 */
export function tarefasPendentes(
  lote: LoteIatfCache,
  tarefasMarcadasLocalmente: ReadonlySet<string>,
  femeasComIaLocal?: ReadonlyMap<string, ReadonlySet<string>>,
  /** fêmeas que este aparelho já descartou do lote e ainda aguardam envio: não contam como "sem IA" */
  femeasDescartadasLocal?: ReadonlySet<string>
): TarefaIatfCache[] {
  return lote.tarefas
    .filter((t) => {
      if (t.feita_em) return false
      if (t.tipo === 'Inseminacao' && (lote.femeas?.length ?? 0) > 0) {
        return femeasSemIa(lote, unirIds(femeasComIaLocal?.get(t.id), femeasDescartadasLocal)).length > 0
      }
      return !tarefasMarcadasLocalmente.has(t.id)
    })
    .sort((a, b) => a.data_prevista.localeCompare(b.data_prevista) || a.ordem - b.ordem)
}

/** Passos de dia anterior ao informado ainda pendentes (aviso ao registrar a IA com o protocolo atrasado). */
export function passosAnterioresPendentes(pendentes: TarefaIatfCache[], dia: number): TarefaIatfCache[] {
  return pendentes.filter((t) => t.dia < dia).sort((a, b) => a.dia - b.dia)
}

/** Erros em texto, na ordem em que o peão preenche. Lista vazia = pode salvar. */
export function errosProtocoloIatf(form: FormProtocoloIatf, hojeBR: string): { field: string; message: string }[] {
  const erros: { field: string; message: string }[] = []
  const iso = dataBRparaIso(form.data)
  const hojeIso = dataBRparaIso(hojeBR)
  if (!iso) erros.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  else if (hojeIso && iso > hojeIso) erros.push({ field: 'data', message: 'A data de execução não pode ser futura' })
  else if (form.loteD0 && iso < form.loteD0) {
    erros.push({ field: 'data', message: `A data não pode ser anterior ao D0 do lote (${form.loteD0.split('-').reverse().join('/')})` })
  }
  if (!form.loteProtocoloId) erros.push({ field: 'lote', message: 'Escolha o lote de protocolo' })
  else if (!form.tarefaId) erros.push({ field: 'tarefa', message: 'Escolha o passo que foi feito' })
  else if (form.tarefaTipo === 'Inseminacao' && form.femeasDisponiveis > 0 && form.femeasSelecionadas.length === 0) {
    erros.push({ field: 'femeas', message: 'Escolha ao menos uma fêmea' })
  }
  return erros
}

export function pendenciaProtocoloIatf(form: FormProtocoloIatf, hojeBR: string): string {
  const e = errosProtocoloIatf(form, hojeBR)
  return e.length > 0 ? e[0].message : ''
}

/** Motivos de descarte da fêmea do protocolo oferecidos no PWA. */
export const MOTIVOS_DESCARTE_IATF = ['Perdeu o implante', 'Doente ou lesionada', 'Fora do protocolo', 'Outro'] as const

/** Registro de "descartar fêmea do lote": vai na mesma caderneta (store `protocolo-iatf`) com `acao: 'descartar'`. */
export interface FormDescarteIatf {
  acao: 'descartar'
  data: string
  loteProtocoloId: string
  loteNome: string
  individuoId: string
  femeaRotulo: string
  motivoDescarte: string
  /** texto fixo para a lista de registros */
  tarefaRotulo?: string
}

export function formVazioDescarteIatf(hoje: string): FormDescarteIatf {
  return { acao: 'descartar', data: hoje, loteProtocoloId: '', loteNome: '', individuoId: '', femeaRotulo: '', motivoDescarte: '', tarefaRotulo: 'Descartar fêmea' }
}

export const ehDescarteIatf = (r: unknown): r is FormDescarteIatf => (r as { acao?: string } | null)?.acao === 'descartar'

export function errosDescarteIatf(form: FormDescarteIatf): { field: string; message: string }[] {
  const erros: { field: string; message: string }[] = []
  if (!form.loteProtocoloId) erros.push({ field: 'lote', message: 'Escolha o lote de protocolo' })
  else if (!form.individuoId) erros.push({ field: 'femea', message: 'Escolha a fêmea a descartar' })
  return erros
}

export interface ChamadaIatf {
  rpc: 'registrar_ia_lote_protocolo' | 'marcar_tarefa_protocolo_iatf' | 'descartar_femea_lote_protocolo'
  params: Record<string, unknown>
}

/** Chamada de RPC do servidor para uma marcação de passo (o id do registro local é a chave de idempotência). */
export function protocoloIatfParaServidor(registro: Record<string, unknown>, fazendaId: string): ChamadaIatf {
  if (ehDescarteIatf(registro)) {
    // Idempotente no servidor: fêmea já descartada não faz nada (reenvio da fila)
    return {
      rpc: 'descartar_femea_lote_protocolo',
      params: {
        p_fazenda_id: fazendaId,
        p_lote_id: registro.loteProtocoloId,
        p_individuo_id: registro.individuoId,
        p_motivo: vazioParaNulo(registro.motivoDescarte),
      },
    }
  }
  const r = registro as Partial<FormProtocoloIatf> & { id?: string; responsavel?: string; usuario?: string }
  const data = dataBRparaIso(r.data ?? '') ?? undefined
  const responsavel = vazioParaNulo(r.usuario ?? r.responsavel)
  if (r.tarefaTipo === 'Inseminacao') {
    return {
      rpc: 'registrar_ia_lote_protocolo',
      params: {
        p_fazenda_id: fazendaId,
        p_tarefa_id: r.tarefaId,
        p_data: data,
        p_touro_nome: vazioParaNulo(r.touroNome),
        p_semen_partida: vazioParaNulo(r.semenPartida),
        p_tecnico: vazioParaNulo(r.tecnico) ?? responsavel,
        p_individuos: r.femeasSelecionadas && r.femeasSelecionadas.length > 0 ? r.femeasSelecionadas : null,
        p_observacao: vazioParaNulo(r.observacao),
        p_local_id: r.id,
        p_origem: 'pwa',
      },
    }
  }
  return {
    rpc: 'marcar_tarefa_protocolo_iatf',
    params: {
      p_fazenda_id: fazendaId,
      p_tarefa_id: r.tarefaId,
      p_feita_em: data,
      p_observacao: vazioParaNulo(r.observacao),
      p_responsavel: responsavel,
      p_local_id: r.id,
    },
  }
}

/** Resumo do registro para lista e compartilhamento. */
export function resumirProtocoloIatf(r: Record<string, unknown>): string {
  if (ehDescarteIatf(r)) return `Descartar ${r.femeaRotulo || 'fêmea'}${r.loteNome ? ` · ${r.loteNome}` : ''}`
  const f = r as Partial<FormProtocoloIatf>
  const dia = f.tarefaDia != null ? `D${f.tarefaDia} ` : ''
  const femeas = f.tarefaTipo === 'Inseminacao' && f.femeasSelecionadas?.length ? ` · ${f.femeasSelecionadas.length} ${f.femeasSelecionadas.length === 1 ? 'fêmea' : 'fêmeas'}` : ''
  return `${dia}${f.tarefaRotulo ?? 'Protocolo IATF'}${f.loteNome ? ` · ${f.loteNome}` : ''}${femeas}`
}

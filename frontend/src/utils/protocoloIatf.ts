/**
 * Caderneta de Protocolo IATF: o peão marca no curral o passo de um lote de protocolo criado no painel
 * (implante, retirada, inseminação...). Cada registro local é UMA marcação de passo. O servidor recebe uma chamada de RPC:
 * - passo de Inseminação: registrar_ia_lote_protocolo grava a Inseminação de todas as fêmeas ativas do lote;
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

export interface LoteIatfCache {
  id: string
  nome: string
  data_d0: string
  responsavel: string | null
  femeasAtivas: number
  tarefas: TarefaIatfCache[]
}

export interface FormProtocoloIatf {
  data: string
  loteProtocoloId: string
  loteNome: string
  tarefaId: string
  tarefaRotulo: string
  tarefaTipo: '' | TipoPassoIatf
  tarefaDia: number | null
  femeasAtivas: number
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

/**
 * Tarefas ainda por fazer de um lote: sem `feita_em` no servidor e sem marcação local aguardando envio
 * (`tarefasMarcadasLocalmente`), para o peão não marcar o mesmo passo duas vezes offline.
 */
export function tarefasPendentes(lote: LoteIatfCache, tarefasMarcadasLocalmente: ReadonlySet<string>): TarefaIatfCache[] {
  return lote.tarefas
    .filter((t) => !t.feita_em && !tarefasMarcadasLocalmente.has(t.id))
    .sort((a, b) => a.data_prevista.localeCompare(b.data_prevista) || a.ordem - b.ordem)
}

/** Erros em texto, na ordem em que o peão preenche. Lista vazia = pode salvar. */
export function errosProtocoloIatf(form: FormProtocoloIatf, hojeBR: string): { field: string; message: string }[] {
  const erros: { field: string; message: string }[] = []
  const iso = dataBRparaIso(form.data)
  const hojeIso = dataBRparaIso(hojeBR)
  if (!iso) erros.push({ field: 'data', message: 'Data inválida. Use DD/MM/AAAA' })
  else if (hojeIso && iso > hojeIso) erros.push({ field: 'data', message: 'A data de execução não pode ser futura' })
  if (!form.loteProtocoloId) erros.push({ field: 'lote', message: 'Escolha o lote de protocolo' })
  else if (!form.tarefaId) erros.push({ field: 'tarefa', message: 'Escolha o passo que foi feito' })
  return erros
}

export function pendenciaProtocoloIatf(form: FormProtocoloIatf, hojeBR: string): string {
  const e = errosProtocoloIatf(form, hojeBR)
  return e.length > 0 ? e[0].message : ''
}

export interface ChamadaIatf {
  rpc: 'registrar_ia_lote_protocolo' | 'marcar_tarefa_protocolo_iatf'
  params: Record<string, unknown>
}

/** Chamada de RPC do servidor para uma marcação de passo (o id do registro local é a chave de idempotência). */
export function protocoloIatfParaServidor(registro: Record<string, unknown>, fazendaId: string): ChamadaIatf {
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
        p_individuos: null,
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
  const f = r as Partial<FormProtocoloIatf>
  const dia = f.tarefaDia != null ? `D${f.tarefaDia} ` : ''
  return `${dia}${f.tarefaRotulo ?? 'Protocolo IATF'}${f.loteNome ? ` · ${f.loteNome}` : ''}`
}

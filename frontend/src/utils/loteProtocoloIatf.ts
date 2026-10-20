/**
 * Caderneta "Novo lote de protocolo IATF": o peão monta no campo (offline) um lote de protocolo, escolhendo o protocolo,
 * o D0 e as fêmeas. Cada registro local é UM lote. O servidor recebe uma chamada de RPC (criar_lote_protocolo_iatf) com o
 * id do registro como local_id: reenviar devolve o lote já criado, sem duplicar. As tarefas (D0, D8, IA...) nascem no servidor
 * com a data calculada, e o lote só aparece na caderneta Protocolo IATF depois de sincronizar. Só registra: não altera contagem.
 */
import { dataBRparaIso } from './manejoCurral'

export interface PassoProtocoloCache {
  dia: number
  ordem: number
  rotulo: string
  tipo: string
}

export interface ProtocoloIatfCache {
  id: string
  nome: string
  passos: PassoProtocoloCache[]
}

export interface LinhaLoteProtocolo {
  uid: string
  individuoId: string
  /** brinco, chip, manejo ou provisório, para mostrar na lista */
  rotulo: string
}

export interface FormLoteProtocolo {
  /** D0 em DD/MM/AAAA */
  data: string
  protocoloId: string
  protocoloNome: string
  nome: string
  responsavel: string
  linhas: LinhaLoteProtocolo[]
}

export function formVazioLoteProtocolo(hoje: string): FormLoteProtocolo {
  return { data: hoje, protocoloId: '', protocoloNome: '', nome: '', responsavel: '', linhas: [] }
}

export function novaLinhaLoteProtocolo(uid: string, individuoId: string, rotulo: string): LinhaLoteProtocolo {
  return { uid, individuoId, rotulo }
}

/** Soma dias a uma data AAAA-MM-DD (UTC, sem efeito de fuso ou horário de verão). */
export function somarDiasIso(dataIso: string, dias: number): string {
  const [a, m, d] = dataIso.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10)
}

/** "D0 12/10 · D8 20/10 · D10 22/10" para o peão conferir as datas antes de salvar; vazio se faltar protocolo ou D0. */
export function previaDatasProtocolo(protocolo: ProtocoloIatfCache | undefined, d0Iso: string | null): string {
  if (!protocolo || !d0Iso) return ''
  return [...protocolo.passos]
    .sort((a, b) => a.dia - b.dia || a.ordem - b.ordem)
    .map((p) => {
      const [, mes, dia] = somarDiasIso(d0Iso, p.dia).split('-')
      return `D${p.dia} ${dia}/${mes}`
    })
    .join(' · ')
}

/** Erros em texto, na ordem em que o peão preenche. Lista vazia = pode salvar. */
export function errosLoteProtocolo(form: FormLoteProtocolo): { field: string; message: string }[] {
  const erros: { field: string; message: string }[] = []
  if (!dataBRparaIso(form.data)) erros.push({ field: 'data', message: 'D0 inválido. Use DD/MM/AAAA' })
  if (!form.protocoloId) erros.push({ field: 'protocolo', message: 'Escolha o protocolo' })
  if (form.nome.trim() === '') erros.push({ field: 'nome', message: 'Dê um nome ao lote de protocolo' })
  const linhas = form.linhas ?? []
  if (linhas.length === 0) {
    erros.push({ field: 'linhas', message: 'Adicione ao menos uma fêmea' })
    return erros
  }
  const vistos = new Set<string>()
  for (const l of linhas) {
    if (!l.individuoId) {
      erros.push({ field: 'linhas', message: 'Só fêmeas cadastradas entram no protocolo. Cadastre o animal antes' })
      break
    }
    if (vistos.has(l.individuoId)) {
      erros.push({ field: 'linhas', message: `A fêmea ${l.rotulo || ''} está repetida na lista`.replace('  ', ' ') })
      break
    }
    vistos.add(l.individuoId)
  }
  return erros
}

export function pendenciaLoteProtocolo(form: FormLoteProtocolo): string {
  const e = errosLoteProtocolo(form)
  return e.length > 0 ? e[0].message : ''
}

export interface ChamadaCriarLote {
  rpc: 'criar_lote_protocolo_iatf'
  params: Record<string, unknown>
}

/** Chamada de RPC do servidor para um lote de protocolo (o id do registro local é a chave de idempotência). */
export function loteProtocoloParaServidor(registro: Record<string, unknown>, fazendaId: string): ChamadaCriarLote {
  const r = registro as Partial<FormLoteProtocolo> & { id?: string; usuario?: string }
  // Vazio ou só espaços não vale: cai para o usuário que lançou
  const responsavel = String(r.responsavel ?? '').trim() || String(r.usuario ?? '').trim()
  return {
    rpc: 'criar_lote_protocolo_iatf',
    params: {
      p_fazenda_id: fazendaId,
      p_protocolo_id: r.protocoloId,
      p_nome: String(r.nome ?? '').trim(),
      p_data_d0: dataBRparaIso(r.data ?? '') ?? undefined,
      p_individuos: (r.linhas ?? []).map((l) => l.individuoId),
      p_estacao_id: null,
      p_responsavel: responsavel === '' ? null : responsavel,
      p_local_id: r.id,
      p_origem: 'pwa',
    },
  }
}

/** Resumo do registro para lista e compartilhamento. */
export function resumirLoteProtocolo(r: Record<string, unknown>): string {
  const f = r as Partial<FormLoteProtocolo>
  const n = (f.linhas ?? []).length
  return `${f.nome ?? 'Lote de protocolo'} · ${n} ${n === 1 ? 'fêmea' : 'fêmeas'}`
}

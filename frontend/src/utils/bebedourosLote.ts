import {
  CHECKLIST_PROBLEMAS_BEBEDOURO,
  CampoChecklistBebedouro,
  PendenciaBebedouro,
  SituacaoPendencia,
} from './pendenciasBebedouro'

type PorCampo<T> = Partial<Record<CampoChecklistBebedouro, T>>

export interface PastoBebedouro {
  id: string
  nome: string
}

export interface ParticipantesLimpezaPayload {
  funcionarios: string[]
  diaristas: string[]
}

export interface ParamsPayloadBebedouro {
  data: string
  usuario: string
  numeroBebedouro: string
  leituraBebedouro: string
  pastos: PastoBebedouro[] | null
  observacao: string
  participantesLimpeza: ParticipantesLimpezaPayload | null
  tempoDesdeLimpeza: string
  intervaloMedioLimpezas: string
  metaIntervaloLimpeza: string
  checklistAtivo: boolean
  limpouHoje: boolean
  fotoBebedouro: string
  /** true = o problema foi marcado na tela */
  problemas: PorCampo<boolean>
  observacoes: PorCampo<string>
  fotos: PorCampo<string>
  pendencias: Record<string, SituacaoPendencia | ''>
  pendenciasAbertas: PendenciaBebedouro[]
}

/**
 * Payload de um registro de bebedouro, igual para o lançamento individual e para cada item do lote.
 * valor = "a condição está adequada" (true) ou "problema marcado" (false): a afirmação negativa existe só
 * na UI; a chave é a proposição positiva. foto_bebedouro carrega a evidência do registro e independe do
 * checklist estar ativo para a fazenda.
 */
export function montarPayloadRegistroBebedouro(p: ParamsPayloadBebedouro): Record<string, unknown> {
  const pendenciasPorCampo = Object.fromEntries(p.pendenciasAbertas.map((x) => [x.campo, x])) as PorCampo<PendenciaBebedouro>

  const checklistItens = p.checklistAtivo
    ? {
        ...Object.fromEntries(
          CHECKLIST_PROBLEMAS_BEBEDOURO.map(({ campo, checklistKey }) => [
            checklistKey,
            {
              valor: !p.problemas[campo],
              observacao: p.observacoes[campo] || '',
              fotoBase64: p.fotos[campo] || undefined,
              // Auditoria da pergunta de pendência: resolvida (valor true) ou mantida (valor false, segue aberta)
              ...(pendenciasPorCampo[campo] && p.pendencias[campo]
                ? { pendencia: { situacao: p.pendencias[campo], desde: pendenciasPorCampo[campo]!.desde } }
                : {}),
            },
          ])
        ),
        limpou_hoje: { valor: p.limpouHoje, observacao: '' },
      }
    : {}

  const checklistFoto = p.fotoBebedouro
    ? { foto_bebedouro: { valor: true, observacao: '', fotoBase64: p.fotoBebedouro } }
    : {}

  return {
    data: p.data,
    responsavel: p.usuario,
    usuario: p.usuario,
    leituraBebedouro: p.leituraBebedouro ? Number(p.leituraBebedouro) : null,
    numeroBebedouro: p.numeroBebedouro,
    pasto: p.pastos && p.pastos.length > 0 ? p.pastos.map((x) => x.nome).join(', ') : null,
    pastoId: p.pastos && p.pastos.length === 1 ? p.pastos[0].id : null,
    observacao: p.observacao,
    participantesLimpeza: p.participantesLimpeza,
    tempoDesdeLimpeza: p.tempoDesdeLimpeza,
    intervaloMedioLimpezas: p.intervaloMedioLimpezas,
    metaIntervaloLimpeza: p.metaIntervaloLimpeza,
    checklist: p.checklistAtivo || p.fotoBebedouro ? { ...checklistItens, ...checklistFoto } : null,
  }
}

export type TomPrazo = 'danger' | 'warning' | 'success' | 'neutral'

export interface StatusPrazoLimpeza {
  /** Dias desde a última limpeza; null quando não há histórico. */
  dias: number | null
  /** Dias além da meta (positivo = atrasada); null sem histórico ou sem meta. */
  atraso: number | null
  tone: TomPrazo
  texto: string
}

const MS_DIA = 86_400_000

function diasEntreDatas(ultimaIso: string, hoje: Date): number {
  const ultima = new Date(ultimaIso)
  if (ultima.toDateString() === hoje.toDateString()) return 0
  return Math.max(1, Math.floor((hoje.getTime() - ultima.getTime()) / MS_DIA))
}

/** Status de prazo de limpeza de um bebedouro (mesmas faixas do cartão do lançamento individual). */
export function statusPrazoLimpeza(
  ultimaLimpeza: string | null,
  metaDias: number | null,
  hoje: Date = new Date()
): StatusPrazoLimpeza {
  if (!ultimaLimpeza) return { dias: null, atraso: null, tone: 'warning', texto: 'Sem histórico de limpeza' }
  const dias = diasEntreDatas(ultimaLimpeza, hoje)
  if (!metaDias || metaDias <= 0) return { dias, atraso: null, tone: 'neutral', texto: 'Meta de limpeza não definida' }
  const atraso = dias - metaDias
  if (atraso > 2) return { dias, atraso, tone: 'danger', texto: `Atrasada há ${atraso} dias` }
  if (atraso > 0) return { dias, atraso, tone: 'warning', texto: 'No limite do prazo' }
  const restam = metaDias - dias
  return { dias, atraso, tone: 'success', texto: restam === 0 ? 'Vence hoje' : `No prazo (${restam} ${restam === 1 ? 'dia' : 'dias'})` }
}

/** Mais urgentes primeiro: atrasados (maior atraso antes), depois sem histórico, depois o restante pelo nome. */
export function ordenarPorUrgencia<T extends { nome: string; status: StatusPrazoLimpeza }>(itens: T[]): T[] {
  const peso = (s: StatusPrazoLimpeza): number => {
    if (s.dias === null) return 1_000_000 // sem histórico: logo após os atrasados
    if (s.atraso === null) return s.dias // sem meta: mais antigos primeiro
    return s.atraso
  }
  return [...itens].sort((a, b) => peso(b.status) - peso(a.status) || a.nome.localeCompare(b.nome, 'pt-BR'))
}

/** Mensagem de erro de um item do lote, ou null se estiver pronto para salvar. */
export function erroItemLote(
  leituraBebedouro: string,
  pendenciasAbertas: PendenciaBebedouro[],
  respostas: Record<string, SituacaoPendencia | ''>,
  checklistAtivo: boolean
): string | null {
  if (!leituraBebedouro) return 'Falta a leitura da água'
  if (checklistAtivo && pendenciasAbertas.some((p) => !respostas[p.campo])) {
    return 'Responda se as pendências anteriores foram resolvidas'
  }
  return null
}

export const OPCOES_AGUA = [
  { value: '1', numero: '1', label: 'Limpa', dot: 'bg-green-500', selecionado: 'bg-green-50 border-green-500 text-green-800' },
  { value: '2', numero: '2', label: 'Meio suja', dot: 'bg-amber-400', selecionado: 'bg-amber-50 border-amber-400 text-amber-900' },
  { value: '3', numero: '3', label: 'Suja', dot: 'bg-red-500', selecionado: 'bg-red-50 border-red-500 text-red-800' },
]

/** Leitura de água padrão do lote: o lote assume a rodada de limpeza com água limpa. */
export const LEITURA_AGUA_PADRAO = '1'

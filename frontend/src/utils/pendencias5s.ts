// Pendências da Auditoria 5S: itens respondidos N em auditorias anteriores do MESMO setor que ainda não foram resolvidos.
//
// O estado é derivado do histórico, sem tabela própria: ao percorrer as auditorias do setor em ordem de `data`
// (o momento do evento, não o da chegada ao servidor, porque o PWA grava offline e os registros chegam fora de
// ordem), um `N` abre a pendência e o próximo `C` do mesmo item a resolve. `NA` (não se aplica) e item ausente
// significam "não verificado": não abrem nem resolvem nada.
//
// A observação e a foto da pendência vêm de `naoConformidades[chave]` do registro (auditorias antigas, sem esse
// campo, abrem pendência sem evidência).
//
// O Painel Web mantém uma cópia desta regra (apps/manejus/src/features/pendencias5s/calculo.ts) com os
// mesmos casos de teste: mudou uma, mude a outra.

import { SECOES_5S } from './auditoria5sItens'
import { diasEntre } from './pendenciasBebedouro'

export { diasEntre }

export type SituacaoPendencia5S = 'resolvida' | 'mantida'

/** Registro de auditoria reduzido ao que a regra precisa. `data` em ISO; `localId` identifica o mesmo registro no aparelho e no servidor. */
export interface RegistroAuditoria5SPendencia {
  data: string
  localId?: string | null
  itens: Record<string, any> | null
  naoConformidades?: Record<string, any> | null
}

/** Medida do plano de ação, gravada em naoConformidades[chave].plano_acao (nome do campo no banco). */
export interface MedidaPlano5S {
  id: string
  descricao: string
  responsavel: string | null
  /** YYYY-MM-DD */
  prazo: string | null
  concluida: boolean
  concluida_em: string | null
}

export interface PlanoAcao5S {
  medidas: MedidaPlano5S[]
  criado_em: string | null
  atualizado_em: string | null
}

/** sem_plano: nenhuma medida; atrasado: alguma medida aberta com prazo já vencido; concluido: todas feitas. */
export type SituacaoPlano5S = 'sem_plano' | 'em_dia' | 'atrasado' | 'concluido'

const texto = (valor: unknown): string | null => (typeof valor === 'string' && valor.trim() ? valor.trim() : null)

/** Lê o plano de uma não conformidade; formato inválido vira null (auditorias antigas não têm o campo). */
export function lerPlanoAcao5S(evidencia: any): PlanoAcao5S | null {
  const bruto = evidencia?.plano_acao
  if (!bruto || !Array.isArray(bruto.medidas)) return null
  const medidas: MedidaPlano5S[] = bruto.medidas
    .filter((m: any) => texto(m?.descricao))
    .map((m: any, i: number) => ({
      id: texto(m.id) ?? `m${i}`,
      descricao: texto(m.descricao)!,
      responsavel: texto(m.responsavel),
      prazo: texto(m.prazo),
      concluida: m.concluida === true,
      concluida_em: texto(m.concluida_em),
    }))
  return medidas.length > 0 ? { medidas, criado_em: texto(bruto.criado_em), atualizado_em: texto(bruto.atualizado_em) } : null
}

/** Situação do plano em `agoraIso` (compara o prazo como data local YYYY-MM-DD). */
export function situacaoPlano5S(plano: PlanoAcao5S | null, agoraIso: string): SituacaoPlano5S {
  if (!plano || plano.medidas.length === 0) return 'sem_plano'
  if (plano.medidas.every((m) => m.concluida)) return 'concluido'
  const hoje = agoraIso.slice(0, 10)
  const atrasada = plano.medidas.some((m) => !m.concluida && m.prazo !== null && m.prazo < hoje)
  return atrasada ? 'atrasado' : 'em_dia'
}

export interface Pendencia5S {
  chave: string
  /** Texto do item como não conformidade (ex.: "Há material em desuso no local."). */
  label: string
  secao: string
  /** Data do primeiro `N` da sequência atual. */
  desde: string
  /** Data do `N` mais recente (de onde vêm observação, foto e plano). */
  ultimaData: string
  observacao: string
  fotoUrl: string | null
  /** Plano de ação mais recente da sequência (null se nenhum N registrou plano). */
  planoAcao: PlanoAcao5S | null
  /** Quantas auditorias seguidas marcaram o item como N. */
  ocorrencias: number
}

export interface PendenciaResolvida5S {
  chave: string
  label: string
  secao: string
  abertaEm: string
  resolvidaEm: string
  /** Último plano de ação registrado antes da resolução. */
  planoAcao: PlanoAcao5S | null
}

export interface ResultadoPendencias5S {
  abertas: Pendencia5S[]
  resolvidas: PendenciaResolvida5S[]
}

const instante = (iso: string): number => {
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? 0 : t
}

/** Ordem do evento: `data` crescente, desempate estável por `localId`; o mesmo registro vindo do servidor e do aparelho conta uma vez. */
function ordenarSemDuplicatas(registros: RegistroAuditoria5SPendencia[]): RegistroAuditoria5SPendencia[] {
  const vistos = new Set<string>()
  const unicos = registros.filter((r) => {
    if (!r.localId) return true
    if (vistos.has(r.localId)) return false
    vistos.add(r.localId)
    return true
  })
  return [...unicos].sort((a, b) => instante(a.data) - instante(b.data) || String(a.localId ?? '').localeCompare(String(b.localId ?? '')))
}

export function calcularPendencias5S(registros: RegistroAuditoria5SPendencia[]): ResultadoPendencias5S {
  const ordenados = ordenarSemDuplicatas(registros)
  const abertas: Pendencia5S[] = []
  const resolvidas: PendenciaResolvida5S[] = []

  for (const secao of SECOES_5S) {
    for (const item of secao.itens) {
      let aberta = null as Pendencia5S | null
      for (const registro of ordenados) {
        const resposta = registro.itens?.[item.chave]
        if (resposta === 'N') {
          const evidencia = registro.naoConformidades?.[item.chave]
          // Um "ainda pendente" sem foto/observação nova não apaga a evidência da ocorrência original
          const observacaoNova = typeof evidencia?.observacao === 'string' ? evidencia.observacao.trim() : ''
          const fotoNova = typeof evidencia?.foto_url === 'string' && evidencia.foto_url ? evidencia.foto_url : null
          // O plano segue a mesma regra da observação: o mais recente presente vence; sem plano novo, herda o anterior
          const planoNovo = lerPlanoAcao5S(evidencia)
          const base = {
            ultimaData: registro.data,
            observacao: observacaoNova || aberta?.observacao || '',
            fotoUrl: fotoNova ?? aberta?.fotoUrl ?? null,
            planoAcao: planoNovo ?? aberta?.planoAcao ?? null,
          }
          aberta = aberta
            ? { ...aberta, ...base, ocorrencias: aberta.ocorrencias + 1 }
            : { chave: item.chave, label: item.negativa, secao: secao.titulo, desde: registro.data, ocorrencias: 1, ...base }
        } else if (resposta === 'C' && aberta) {
          resolvidas.push({
            chave: item.chave,
            label: item.negativa,
            secao: secao.titulo,
            abertaEm: aberta.desde,
            resolvidaEm: registro.data,
            planoAcao: aberta.planoAcao,
          })
          aberta = null
        }
      }
      if (aberta) abertas.push(aberta)
    }
  }

  // Mais antigas primeiro: são as que mais precisam de atenção
  abertas.sort((a, b) => instante(a.desde) - instante(b.desde))
  resolvidas.sort((a, b) => instante(b.resolvidaEm) - instante(a.resolvidaEm))
  return { abertas, resolvidas }
}

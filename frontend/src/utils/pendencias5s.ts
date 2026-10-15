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

export interface Pendencia5S {
  chave: string
  /** Texto do item como não conformidade (ex.: "Há material em desuso no local."). */
  label: string
  secao: string
  /** Data do primeiro `N` da sequência atual. */
  desde: string
  /** Data do `N` mais recente (de onde vêm observação e foto). */
  ultimaData: string
  observacao: string
  fotoUrl: string | null
  /** Quantas auditorias seguidas marcaram o item como N. */
  ocorrencias: number
}

export interface PendenciaResolvida5S {
  chave: string
  label: string
  secao: string
  abertaEm: string
  resolvidaEm: string
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
          const base = {
            ultimaData: registro.data,
            observacao: observacaoNova || aberta?.observacao || '',
            fotoUrl: fotoNova ?? aberta?.fotoUrl ?? null,
          }
          aberta = aberta
            ? { ...aberta, ...base, ocorrencias: aberta.ocorrencias + 1 }
            : { chave: item.chave, label: item.negativa, secao: secao.titulo, desde: registro.data, ocorrencias: 1, ...base }
        } else if (resposta === 'C' && aberta) {
          resolvidas.push({ chave: item.chave, label: item.negativa, secao: secao.titulo, abertaEm: aberta.desde, resolvidaEm: registro.data })
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

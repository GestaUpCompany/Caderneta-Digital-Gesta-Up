// Pendências do checklist do Rodeio: itens persistentes marcados como problema em rodeios anteriores
// do MESMO lote que ainda não foram resolvidos.
//
// Mesma regra de utils/pendenciasBebedouro.ts: o estado é derivado do histórico, sem tabela. Percorrendo
// os registros do lote em ordem de `data` (momento do evento, não o da chegada ao servidor, porque o PWA
// grava offline), um problema abre a pendência e o próximo "conforme" do mesmo item a resolve. Registro
// que não traz o item (checklist inativo no dia, valor vazio) é "não verificado": não abre nem resolve.
//
// Diferença para o bebedouro: o Rodeio grava `diagnosticos.<campo>.valor` como 'S'/'N' (texto), não
// booleano. Nos itens abaixo (todos não invertidos) 'N' = problema e 'S' = conforme. Booleano legado
// também é aceito (true = conforme).
//
// Só entram condições persistentes. Animal morto, doente, carrapato/mosca e entrevero são eventos
// pontuais, tratados em Enfermaria/Morte, e gerariam pendência falsa.

import type { SituacaoPendencia } from './pendenciasBebedouro'

export { diasEntre } from './pendenciasBebedouro'
export type { SituacaoPendencia }

// campo = chave em `diagnosticos` do registro (e no formulário).
export const CHECKLIST_PENDENCIAS_RODEIO = [
  { campo: 'bebedourosCochos', label: 'BEBEDOUROS / COCHOS COM PROBLEMA' },
  { campo: 'pastagensTaxaLotacao', label: 'PASTAGEM / LOTAÇÃO INADEQUADA' },
  { campo: 'cercasCochosPorteiras', label: 'CERCAS / PORTEIRAS COM PROBLEMA' },
] as const

export type CampoPendenciaRodeio = typeof CHECKLIST_PENDENCIAS_RODEIO[number]['campo']

/** Rodeio reduzido ao que a regra precisa. `data` em ISO; `localId` identifica o mesmo registro no aparelho e no servidor. */
export interface RegistroDiagnosticoRodeio {
  data: string
  localId?: string | null
  diagnosticos: Record<string, any> | null
}

export interface PendenciaRodeio {
  campo: CampoPendenciaRodeio
  label: string
  /** Data do primeiro problema da sequência atual. */
  desde: string
  /** Data do problema mais recente (de onde vêm observação e foto). */
  ultimaData: string
  observacao: string
  fotoUrl: string | null
  /** Quantos rodeios seguidos marcaram o item como problema. */
  ocorrencias: number
}

export interface PendenciaRodeioResolvida {
  campo: CampoPendenciaRodeio
  label: string
  abertaEm: string
  resolvidaEm: string
}

export interface ResultadoPendenciasRodeio {
  abertas: PendenciaRodeio[]
  resolvidas: PendenciaRodeioResolvida[]
}

const instante = (iso: string): number => {
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? 0 : t
}

/** true = problema, false = conforme, null = não verificado. */
function situacaoDoValor(valor: unknown): boolean | null {
  if (valor === 'N') return true
  if (valor === 'S') return false
  if (valor === true) return false
  if (valor === false) return true
  return null
}

function ordenarSemDuplicatas(registros: RegistroDiagnosticoRodeio[]): RegistroDiagnosticoRodeio[] {
  const vistos = new Set<string>()
  const unicos = registros.filter((r) => {
    if (!r.localId) return true
    if (vistos.has(r.localId)) return false
    vistos.add(r.localId)
    return true
  })
  return [...unicos].sort((a, b) => instante(a.data) - instante(b.data) || String(a.localId ?? '').localeCompare(String(b.localId ?? '')))
}

export function calcularPendenciasRodeio(registros: RegistroDiagnosticoRodeio[]): ResultadoPendenciasRodeio {
  const ordenados = ordenarSemDuplicatas(registros)
  const abertas: PendenciaRodeio[] = []
  const resolvidas: PendenciaRodeioResolvida[] = []

  for (const item of CHECKLIST_PENDENCIAS_RODEIO) {
    let aberta = null as PendenciaRodeio | null
    for (const registro of ordenados) {
      const entrada = registro.diagnosticos?.[item.campo]
      if (!entrada || typeof entrada !== 'object') continue
      const problema = situacaoDoValor(entrada.valor)
      if (problema === null) continue

      if (problema) {
        // Um "ainda pendente" sem foto/observação nova não apaga a evidência da ocorrência original
        const observacaoNova = typeof entrada.observacao === 'string' ? entrada.observacao : ''
        const fotoNova = typeof entrada.foto_url === 'string' && entrada.foto_url ? entrada.foto_url : null
        const base = {
          ultimaData: registro.data,
          observacao: observacaoNova || aberta?.observacao || '',
          fotoUrl: fotoNova ?? aberta?.fotoUrl ?? null,
        }
        aberta = aberta
          ? { ...aberta, ...base, ocorrencias: aberta.ocorrencias + 1 }
          : { campo: item.campo, label: item.label, desde: registro.data, ocorrencias: 1, ...base }
      } else if (aberta) {
        resolvidas.push({ campo: item.campo, label: item.label, abertaEm: aberta.desde, resolvidaEm: registro.data })
        aberta = null
      }
    }
    if (aberta) abertas.push(aberta)
  }

  // Mais antigas primeiro: são as que mais precisam de atenção
  abertas.sort((a, b) => instante(a.desde) - instante(b.desde))
  resolvidas.sort((a, b) => instante(b.resolvidaEm) - instante(a.resolvidaEm))
  return { abertas, resolvidas }
}

// Pendências do checklist de Bebedouros: itens marcados como problema (valor = false) em registros
// anteriores do MESMO bebedouro que ainda não foram resolvidos.
//
// O estado é derivado do histórico, sem tabela própria: ao percorrer os registros do bebedouro em ordem
// de `data` (o momento do evento, não o da chegada ao servidor, porque o PWA grava offline e os registros
// chegam fora de ordem), um `false` abre a pendência e o próximo `true` do mesmo item a resolve.
// Registros que não trazem o item (ex.: só a foto do bebedouro, ou checklist inativo no dia) são ignorados:
// "não verificado" não resolve nem abre nada.
//
// O Painel Web mantém uma cópia desta regra (apps/manejus/src/features/pendenciasBebedouros/calculo.ts)
// com os mesmos casos de teste: mudou uma, mude a outra.

// campo = nome no formulário; chave = nome no jsonb `checklist` do registro (formato histórico, proposição positiva).
export const CHECKLIST_PROBLEMAS_BEBEDOURO = [
  { campo: 'aguaSuficiente', checklistKey: 'agua_suficiente', label: 'ÁGUA INSUFICIENTE', aviso: 'Água insuficiente: mostre e conte' },
  { campo: 'vazaoBebedouroIdeal', checklistKey: 'vazao_bebedouro_ideal', label: 'VAZÃO DA BÓIA FORA DO IDEAL', aviso: 'Vazão fora do ideal: mostre e conte' },
  { campo: 'boiaProtecaoBoasCondicoes', checklistKey: 'boia_protecao_boas_condicoes', label: 'BÓIA/PROTEÇÃO EM MÁS CONDIÇÕES', aviso: 'Bóia com problema: mostre e conte' },
  { campo: 'aterroAcessoBebedouroIdeal', checklistKey: 'aterro_acesso_bebedouro_ideal', label: 'ATERRO/ACESSO INADEQUADO', aviso: 'Acesso inadequado: mostre e conte' },
  { campo: 'espacamentoBebedouroIdeal', checklistKey: 'espacamento_bebedouro_ideal', label: 'ESPAÇAMENTO INADEQUADO', aviso: 'Espaçamento inadequado: mostre e conte' },
] as const

export type CampoChecklistBebedouro = typeof CHECKLIST_PROBLEMAS_BEBEDOURO[number]['campo']

export type SituacaoPendencia = 'resolvida' | 'mantida'

/** Registro de bebedouro reduzido ao que a regra precisa. `data` em ISO; `localId` identifica o mesmo registro no aparelho e no servidor. */
export interface RegistroChecklistBebedouro {
  data: string
  localId?: string | null
  checklist: Record<string, any> | null
}

export interface PendenciaBebedouro {
  campo: CampoChecklistBebedouro
  chave: string
  label: string
  /** Data do primeiro `false` da sequência atual. */
  desde: string
  /** Data do `false` mais recente (de onde vêm observação e foto). */
  ultimaData: string
  observacao: string
  fotoUrl: string | null
  /** Quantos registros seguidos marcaram o item como problema. */
  ocorrencias: number
}

export interface PendenciaResolvida {
  campo: CampoChecklistBebedouro
  chave: string
  label: string
  abertaEm: string
  resolvidaEm: string
}

export interface ResultadoPendencias {
  abertas: PendenciaBebedouro[]
  resolvidas: PendenciaResolvida[]
}

const instante = (iso: string): number => {
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? 0 : t
}

/**
 * Ordem do evento: `data` crescente, desempate estável por `localId`. O mesmo registro aparece uma vez só,
 * mesmo vindo do servidor e do aparelho ao mesmo tempo (dedupe por `localId`).
 */
function ordenarSemDuplicatas(registros: RegistroChecklistBebedouro[]): RegistroChecklistBebedouro[] {
  const vistos = new Set<string>()
  const unicos = registros.filter((r) => {
    if (!r.localId) return true
    if (vistos.has(r.localId)) return false
    vistos.add(r.localId)
    return true
  })
  return [...unicos].sort((a, b) => instante(a.data) - instante(b.data) || String(a.localId ?? '').localeCompare(String(b.localId ?? '')))
}

export function calcularPendenciasBebedouro(registros: RegistroChecklistBebedouro[]): ResultadoPendencias {
  const ordenados = ordenarSemDuplicatas(registros)
  const abertas: PendenciaBebedouro[] = []
  const resolvidas: PendenciaResolvida[] = []

  for (const item of CHECKLIST_PROBLEMAS_BEBEDOURO) {
    let aberta = null as PendenciaBebedouro | null
    for (const registro of ordenados) {
      const entrada = registro.checklist?.[item.checklistKey]
      // Sem a chave (ou sem valor booleano) o item não foi verificado neste registro
      if (!entrada || typeof entrada.valor !== 'boolean') continue

      if (entrada.valor === false) {
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
          : { campo: item.campo, chave: item.checklistKey, label: item.label, desde: registro.data, ocorrencias: 1, ...base }
      } else if (aberta) {
        resolvidas.push({ campo: item.campo, chave: item.checklistKey, label: item.label, abertaEm: aberta.desde, resolvidaEm: registro.data })
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

/** Dias inteiros entre duas datas ISO (mínimo 0). */
export function diasEntre(deIso: string, ateIso: string): number {
  return Math.max(0, Math.floor((instante(ateIso) - instante(deIso)) / 86_400_000))
}

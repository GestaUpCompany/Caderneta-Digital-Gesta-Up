import { Registro } from '../types/cadernetas'
import { CadernetaStore, getRegistro, saveRegistro } from './indexedDB'
import { BACKEND_URL } from '../utils/constants'

export type ConflictResolution = 'local' | 'remote' | 'manual'

export interface Conflict {
  id: string
  caderneta: CadernetaStore
  registroId: string
  localVersion: Registro
  remoteVersion: Registro
  detectedAt: string
}

export interface ConflictResult {
  hasConflict: boolean
  conflict?: Conflict
}

function buildRegistroFromRow(
  row: (string | number | null)[],
  caderneta: CadernetaStore,
  existingId: string,
  googleRowId: number
): Registro {
  const base: Registro = {
    id: existingId,
    googleRowId,
    version: 0,
    lastModified: new Date().toISOString(),
    syncStatus: 'synced',
    data: String(row[0] ?? ''),
  }

  const fieldsByCaderneta: Record<CadernetaStore, string[]> = {
    maternidade: ['data', 'pasto', 'pesoCria', 'numeroCria', 'tratamento', 'tipoParto', 'sexo', 'raca', 'numeroMae', 'categoriaMae'],
    pastagens: ['data', 'manejador', 'numeroLote', 'pastoSaida', 'avaliacaoSaida', 'pastoEntrada', 'avaliacaoEntrada', 'vaca', 'touro', 'bezerro', 'boiMagro', 'garrote', 'novilha', 'totalAnimais'],
    rodeio: [
      'data', 'pasto', 'numeroLote', 'vaca', 'touro', 'bezerro', 'boi', 'garrote', 'novilha',
      'totalCabecas', 'escoreGadoIdeal', 'aguaBoaBebedouro', 'pastagemAdequada', 'animaisDoentes',
      'cercasCochos', 'carrapatosMoscas', 'animaisEntreverados', 'animalMorto', 'animaisTratados',
      'escoreFezes', 'equipe',
      // 20 pares de colunas para animais tratados
      ...Array.from({ length: 20 }, (_, i) => [
        `animal${i + 1}Id`,
        `animal${i + 1}Tratamentos`,
      ]).flat(),
    ],
    suplementacao: ['data', 'tratador', 'pasto', 'numeroLote', 'produto', 'gado', 'vaca', 'touro', 'bezerro', 'boi', 'garrote', 'novilha', 'leitura', 'sacos', 'kgCocho', 'kgDeposito', 'creep'],
    bebedouros: ['data', 'responsavel', 'pasto', 'numeroLote', 'gado', 'categoria', 'leituraBebedouro', 'numeroBebedouro', 'observacao'],
    movimentacao: ['data', 'loteOrigem', 'loteDestino', 'numeroCabecas', 'pesoMedio', 'vaca', 'touro', 'boiGordo', 'boiMagro', 'garrote', 'bezerro', 'novilha', 'tropa', 'outros', 'motivoMovimentacao', 'brincoChip', 'causaObservacao'],
    enfermaria: ['data', 'pasto', 'lote', 'brincoChip', 'categoria', 'problemaCasco', 'problemaCascoObs', 'sintomasPneumonia', 'sintomasPneumoniaObs', 'picadoCobra', 'picadoCobraObs', 'incoordenacaoTremores', 'incoordenacaoTremoresObs', 'febreAlta', 'febreAltaObs', 'presencaSangue', 'presencaSangueObs', 'fraturas', 'fraturasObs', 'desordensDigestivas', 'desordensDigestivasObs'],
  }

  const fields = fieldsByCaderneta[caderneta]
  fields.forEach((field, i) => {
    if (row[i] !== undefined) base[field] = row[i]
  })

  return base
}

export async function detectConflict(
  caderneta: CadernetaStore,
  registroId: string,
  planilhaUrl: string
): Promise<ConflictResult> {
  const local = await getRegistro(caderneta, registroId)
  if (!local || !local.googleRowId) return { hasConflict: false }

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/sheets/${caderneta}?planilhaUrl=${encodeURIComponent(planilhaUrl)}`
    )
    if (!res.ok) return { hasConflict: false }

    const json = await res.json() as { rows: (string | number | null)[][] }
    const rowIndex = local.googleRowId - 2
    const remoteRow = json.rows[rowIndex]

    if (!remoteRow) return { hasConflict: false }

    const remoteRegistro = buildRegistroFromRow(remoteRow, caderneta, registroId, local.googleRowId)

    const IGNORE_KEYS = new Set(['id', 'googleRowId', 'version', 'lastModified', 'syncStatus'])
    const dataKeys = Object.keys(local).filter((k) => !IGNORE_KEYS.has(k))
    const isDifferent = dataKeys.some(
      (k) => String(local[k] ?? '') !== String(remoteRegistro[k] ?? '')
    )

    if (!isDifferent) return { hasConflict: false }

    const conflict: Conflict = {
      id: `${registroId}-${Date.now()}`,
      caderneta,
      registroId,
      localVersion: local,
      remoteVersion: remoteRegistro,
      detectedAt: new Date().toISOString(),
    }

    return { hasConflict: true, conflict }
  } catch {
    return { hasConflict: false }
  }
}

export async function resolveConflict(
  conflict: Conflict,
  resolution: ConflictResolution,
  mergedData?: Registro
): Promise<void> {
  if (resolution === 'local') {
    const updated: Registro = {
      ...conflict.localVersion,
      syncStatus: 'pending',
      version: (conflict.localVersion.version ?? 0) + 1,
      lastModified: new Date().toISOString(),
    }
    await saveRegistro(conflict.caderneta, updated)

  } else if (resolution === 'remote') {
    const updated: Registro = {
      ...conflict.remoteVersion,
      id: conflict.registroId,
      syncStatus: 'synced',
    }
    await saveRegistro(conflict.caderneta, updated)

  } else if (resolution === 'manual' && mergedData) {
    const updated: Registro = {
      ...mergedData,
      id: conflict.registroId,
      syncStatus: 'pending',
      version: (conflict.localVersion.version ?? 0) + 1,
      lastModified: new Date().toISOString(),
    }
    await saveRegistro(conflict.caderneta, updated)
  }
}

const CONFLICT_STORAGE_KEY = 'cadernetas:conflicts'

export function saveConflictLocally(conflict: Conflict): void {
  const existing = loadLocalConflicts()
  const updated = [...existing.filter((c) => c.id !== conflict.id), conflict]
  localStorage.setItem(CONFLICT_STORAGE_KEY, JSON.stringify(updated))
}

export function loadLocalConflicts(): Conflict[] {
  try {
    const raw = localStorage.getItem(CONFLICT_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Conflict[]) : []
  } catch {
    return []
  }
}

export function removeLocalConflict(conflictId: string): void {
  const existing = loadLocalConflicts()
  const updated = existing.filter((c) => c.id !== conflictId)
  localStorage.setItem(CONFLICT_STORAGE_KEY, JSON.stringify(updated))
}

export function clearAllConflicts(): void {
  localStorage.removeItem(CONFLICT_STORAGE_KEY)
}

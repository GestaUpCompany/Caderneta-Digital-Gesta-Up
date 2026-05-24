export interface Registro {
  id: string
  data: string
  syncStatus?: string
  [key: string]: unknown
}

export interface FieldConfig {
  key: string
  label?: string
  section: string
  colSpan?: 1 | 2
  priority?: number
  format?: (value: unknown, registro: Registro) => string
  condition?: (registro: Registro) => boolean
}

export interface SectionConfig {
  title: string
  order: number
  icon?: string
}

export interface CadernetaDisplayConfig {
  sections: SectionConfig[]
  fieldConfig: Record<string, FieldConfig>
  hiddenFields?: string[]
}

export const GLOBAL_HIDDEN_FIELDS = [
  'id', 'googleRowId', 'version', 'lastModified', 'syncStatus',
  'categoriasMarcadas', 'usuario',
]

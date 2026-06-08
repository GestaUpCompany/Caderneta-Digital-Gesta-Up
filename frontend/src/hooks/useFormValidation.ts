import { useMemo } from 'react'

// Diagnosticos fields that use nested structure (form.diagnosticos[field].valor)
const DIAGNOSTICOS_FIELDS = [
  'bebedourosCochos',
  'pastagensTaxaLotacao',
  'animaisMachucadosDoentesBichados',
  'cercasCochosPorteiras',
  'carrapatosMoscas',
  'animaisEntreverados',
  'animalMorto',
]

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
}

export interface ValidationRules {
  [field: string]: ValidationRule
}

export interface ValidationResult {
  isValid: boolean
  errors: { [field: string]: string }
  hasErrors: boolean
}

export function useFormValidation<T extends Record<string, any>>(
  form: T,
  rules: ValidationRules
): ValidationResult {
  const result = useMemo(() => {
    const errors: { [field: string]: string } = {}

    Object.entries(rules).forEach(([field, rule]) => {
      // Handle nested field access (e.g., tarefa_grama -> form.tarefas.grama)
      let value: any
      if (field.startsWith('tarefa_')) {
        const limpezaKey = field.replace('tarefa_', '')
        value = (form as any).tarefas?.[limpezaKey]
      } else if (DIAGNOSTICOS_FIELDS.includes(field)) {
        // Handle diagnosticos nested structure (e.g., bebedourosCochos -> form.diagnosticos.bebedourosCochos.valor)
        value = (form as any).diagnosticos?.[field]?.valor
      } else {
        value = form[field]
      }

      // Required validation
      if (rule.required) {
        if (value === null || value === undefined || value === '' ||
            (Array.isArray(value) && value.length === 0)) {
          errors[field] = 'Campo obrigatório'
          return
        }
      }

      // Skip other validations if value is empty and not required
      if (!rule.required && (value === null || value === undefined || value === '')) {
        return
      }

      // Min length validation
      if (rule.minLength && typeof value === 'string' && value.length < rule.minLength) {
        errors[field] = `Mínimo de ${rule.minLength} caracteres`
        return
      }

      // Max length validation
      if (rule.maxLength && typeof value === 'string' && value.length > rule.maxLength) {
        errors[field] = `Máximo de ${rule.maxLength} caracteres`
        return
      }

      // Min value validation
      if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
        errors[field] = `Valor mínimo: ${rule.min}`
        return
      }

      // Max value validation
      if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
        errors[field] = `Valor máximo: ${rule.max}`
        return
      }

      // Pattern validation
      if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
        errors[field] = 'Formato inválido'
        return
      }

      // Custom validation
      if (rule.custom) {
        const customError = rule.custom(value)
        if (customError) {
          errors[field] = customError
          return
        }
      }
    })

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      hasErrors: Object.keys(errors).length > 0
    }
  }, [form, rules])

  return result
}

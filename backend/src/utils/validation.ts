import Joi from 'joi'

export function isValidDate(value: string): boolean {
  if (!value) return false
  const regex = /^\d{2}\/\d{2}\/\d{4}$/
  if (!regex.test(value)) return false
  const [day, month, year] = value.split('/').map(Number)
  const date = new Date(year, month - 1, day)
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date <= new Date()
  )
}

export function isPositiveNumber(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false
  const num = Number(value)
  return !isNaN(num) && num >= 0
}

export function isScaleValue(value: unknown, min: number, max: number, required = false): boolean {
  if (value === null || value === undefined || value === '') return !required
  const num = Number(value)
  return !isNaN(num) && num >= min && num <= max
}

export const sanitizeString = (value: string): string => {
  return value.replace(/[<>\"']/g, '')
}

/**
 * Normaliza uma string numérica em formato brasileiro ou ambíguo para um número.
 * Aceita: "4.770,3", "4770,3", "4.770.3", "4770.3", "1.500,30", "1500.30"
 * Regras:
 * - Vírgula + ponto: vírgula é decimal, pontos são separadores de milhar
 * - Só vírgula: é decimal
 * - Múltiplos pontos: último é decimal, anteriores são milhar
 * - Um ponto: decimal
 */
export function normalizarNumero(valor: string | number | null | undefined): number | null {
  if (valor === null || valor === undefined || valor === '') return null
  if (typeof valor === 'number') return isNaN(valor) ? null : valor

  const s = String(valor).trim()
  if (s === '') return null

  const temVirgula = s.includes(',')
  const temPonto = s.includes('.')
  const numPontos = s.split('.').length - 1

  if (temVirgula && temPonto) {
    // Vírgula é decimal, pontos são milhar: "4.770,3" -> "4770.3"
    return parseFloat(s.replace(/\./g, '').replace(',', '.'))
  }
  if (temVirgula) {
    // Só vírgula: é decimal: "4770,3" -> "4770.3"
    return parseFloat(s.replace(',', '.'))
  }
  if (numPontos > 1) {
    // Múltiplos pontos: último é decimal, anteriores são milhar: "4.770.3" -> "4770.3"
    const partes = s.split('.')
    const decimal = partes.pop()
    return parseFloat(partes.join('') + '.' + decimal)
  }
  // Um ponto ou nenhum: parseFloat direto
  return parseFloat(s)
}

/**
 * Formata um número (ou string numérica) em formato brasileiro para exibição.
 * "4770.3" -> "4.770,3"
 * Retorna fallback se o valor não for numérico.
 */
export function formatarNumeroBR(
  valor: any,
  fallback: string = '—',
  maxDecimais: number = 3
): string {
  const num = normalizarNumero(valor)
  if (num === null || isNaN(num)) return fallback
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimais,
  })
}

/**
 * Normaliza uma string numérica para o formato de string numérica canônico (ponto decimal, sem milhar).
 * "4.770,3" -> "4770.3"
 * "4.770.3" -> "4770.3"
 * "4770,3"  -> "4770.3"
 * Útil para salvar no banco de forma consistente.
 */
export function normalizarNumeroString(valor: string | null | undefined): string {
  const num = normalizarNumero(valor)
  if (num === null) return ''
  return String(num)
}

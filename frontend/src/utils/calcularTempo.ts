/**
 * Calcula a diferença entre um timestamp UTC e a data atual em dias e horas totais
 * @param utcTimestamp Timestamp UTC no formato ISO string
 * @returns String formatado como "X dias/Y horas" ou "Primeiro uso"
 */
export function calcularDiferencaTempo(utcTimestamp: string): string {
  if (!utcTimestamp) return 'Primeiro uso'
  
  try {
    // Converter timestamp UTC para objeto Date
    const dataPassada = new Date(utcTimestamp)
    
    // Verificar se a data é válida
    if (isNaN(dataPassada.getTime())) return 'Data inválida'
    
    // Data atual
    const agora = new Date()
    
    // Calcular diferença em milissegundos
    const diferencaMs = agora.getTime() - dataPassada.getTime()
    
    // Se a data for futura, retornar "Primeiro uso"
    if (diferencaMs < 0) return 'Primeiro uso'
    
    // Converter para dias e horas totais
    const msPorDia = 24 * 60 * 60 * 1000
    const msPorHora = 60 * 60 * 1000
    
    const dias = Math.floor(diferencaMs / msPorDia)
    const horasTotais = Math.floor(diferencaMs / msPorHora)
    
    // Se for menos de 1 hora, mostrar "Menos de 1 hora"
    if (horasTotais === 0) {
      return 'Menos de 1 hora'
    }
    
    // Formatar como "X dias/Y horas"
    if (dias === 0) {
      return `${horasTotais} horas`
    } else if (dias === 1) {
      return `1 dia/${horasTotais} horas`
    } else {
      return `${dias} dias/${horasTotais} horas`
    }
  } catch (error) {
    console.error('Erro ao calcular diferença de tempo:', error)
    return 'Erro no cálculo'
  }
}

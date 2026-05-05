/**
 * Calcula a diferença entre um timestamp UTC e a data atual em dias e horas
 * @param utcTimestamp Timestamp UTC no formato ISO string
 * @returns String formatado como "X dias Y horas" ou "Primeiro uso"
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
    
    // Converter para dias e horas
    const msPorDia = 24 * 60 * 60 * 1000
    const msPorHora = 60 * 60 * 1000
    
    const dias = Math.floor(diferencaMs / msPorDia)
    const horasRestantes = Math.floor((diferencaMs % msPorDia) / msPorHora)
    
    // Se for menos de 1 hora, mostrar "Recém-registrado"
    if (dias === 0 && horasRestantes === 0) {
      return 'Menos de 1 dia'
    } else if (dias === 0 && horasRestantes < 2) {
      return `${horasRestantes} ${horasRestantes === 1 ? 'hora' : 'horas'}`
    } else if (dias === 0) {
      return `${horasRestantes} horas`
    } else if (dias === 1 && horasRestantes === 0) {
      return '1 dia'
    } else if (dias === 1) {
      return `1 dia e ${horasRestantes} horas`
    } else if (horasRestantes === 0) {
      return `${dias} dias`
    } else {
      return `${dias} dias e ${horasRestantes} horas`
    }
  } catch (error) {
    console.error('Erro ao calcular diferença de tempo:', error)
    return 'Erro no cálculo'
  }
}

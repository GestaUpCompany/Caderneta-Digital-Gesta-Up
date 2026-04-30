import { Router, Request, Response } from 'express'
import { getRows } from '../services/googleSheetsService'
import { logger } from '../utils/logger'

export const pastagensRouter = Router()

// Função auxiliar para converter data DD/MM/YYYY ou DD/MM/YYYY HH:MM ou DD/MM/YYYY HH:MM:SS para Date
function parseDateBR(dateStr: string): Date | null {
  if (!dateStr) return null
  
  // Tentar parsear com hora (DD/MM/YYYY HH:MM ou DD/MM/YYYY HH:MM:SS)
  const partsWithTime = dateStr.split(' ')
  if (partsWithTime.length === 2) {
    const dateParts = partsWithTime[0].split('/')
    const timeParts = partsWithTime[1].split(':')
    if (dateParts.length === 3 && timeParts.length >= 2) {
      const [day, month, year] = dateParts.map(Number)
      const [hours, minutes] = timeParts.map(Number)
      const seconds = timeParts.length >= 3 ? Number(timeParts[2]) : 0
      if (!isNaN(day) && !isNaN(month) && !isNaN(year) && !isNaN(hours) && !isNaN(minutes)) {
        return new Date(year, month - 1, day, hours, minutes, seconds)
      }
    }
  }
  
  // Tentar parsear sem hora (DD/MM/YYYY)
  const parts = dateStr.split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts.map(Number)
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null
  return new Date(year, month - 1, day)
}

// Função para calcular diferença em dias e horas
function calcularDiferencaTempo(dataInicio: Date, dataFim: Date): string {
  const diffMs = dataFim.getTime() - dataInicio.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  if (diffDays === 0 && diffHours === 0) {
    return 'Menos de 1 hora'
  }
  
  const parts: string[] = []
  if (diffDays > 0) {
    parts.push(`${diffDays} dia${diffDays > 1 ? 's' : ''}`)
  }
  if (diffHours > 0) {
    parts.push(`${diffHours} hora${diffHours > 1 ? 's' : ''}`)
  }
  
  return parts.join(' e ')
}

pastagensRouter.post('/calcular-tempo', async (req: Request, res: Response) => {
  const { planilhaUrl, pasto, tipo, dataAtual } = req.body
  
  logger.info(`Calcular tempo - pasto: ${pasto}, tipo: ${tipo}, dataAtual: ${dataAtual}`)
  
  if (!planilhaUrl || !pasto || !tipo || !dataAtual) {
    return res.status(400).json({ error: 'planilhaUrl, pasto, tipo e dataAtual são obrigatórios' })
  }
  
  if (tipo !== 'saida' && tipo !== 'entrada') {
    return res.status(400).json({ error: 'tipo deve ser "saida" ou "entrada"' })
  }
  
  try {
    // Buscar todos os registros da aba Troca de Pastos
    const rows = await getRows(planilhaUrl, 'Troca de Pastos')
    logger.info(`Registros encontrados: ${rows.length}`)
    
    // Estrutura das colunas (baseado na planilha atual):
    // A: id, B: Data, C: Manejador, D: Lote, E: Pasto Saída, F: Avaliação Saída,
    // G: Tempo Ocupação, H: Pasto Entrada, I: Avaliação Entrada, J: Tempo Vedação,
    // K: Vacas, L: Touros, M: Bois Gordos, N: Bois Magros, O: Garrotes,
    // P: Bezerro(as), Q: Novilhas, R: Tropas, S: Outros, T: Escore Gado
    
    // Filtrar registros onde o pasto aparece
    // Para tipo "saida": buscar em coluna H (Pasto Entrada) - última vez que o gado entrou
    // Para tipo "entrada": buscar em coluna E (Pasto Saída) - última vez que o gado saiu
    const colunaIndex = tipo === 'saida' ? 7 : 4 // 7 = H (Pasto Entrada), 4 = E (Pasto Saída)
    
    const registrosFiltrados = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row[colunaIndex] === pasto)
    
    logger.info(`Registros filtrados para pasto ${pasto} (coluna ${colunaIndex}): ${registrosFiltrados.length}`)
    if (registrosFiltrados.length > 0) {
      logger.info(`Primeiro registro filtrado: ${JSON.stringify(registrosFiltrados[0].row)}`)
    }
    
    if (registrosFiltrados.length === 0) {
      // Primeira ocupação/desocupação
      return res.json({
        success: true,
        tempo: 'Primeira vez',
        dataReferencia: null
      })
    }
    
    // Ordenar por data (coluna B, índice 1) - mais recente primeiro
    const dataAtualDate = parseDateBR(dataAtual)
    logger.info(`Data atual parseada: ${dataAtualDate}`)
    if (!dataAtualDate) {
      return res.status(400).json({ error: 'dataAtual inválida' })
    }
    
    const registrosOrdenados = registrosFiltrados
      .filter(({ row }) => {
        const dataRegistro = parseDateBR(String(row[1]))
        logger.info(`Data registro: ${row[1]}, parseada: ${dataRegistro}`)
        return dataRegistro && dataRegistro <= dataAtualDate
      })
      .sort((a, b) => {
        const dateA = parseDateBR(String(a.row[1]))
        const dateB = parseDateBR(String(b.row[1]))
        if (!dateA || !dateB) return 0
        return dateB.getTime() - dateA.getTime() // Decrescente
      })
    
    logger.info(`Registros ordenados (data <= atual): ${registrosOrdenados.length}`)
    
    if (registrosOrdenados.length === 0) {
      return res.json({
        success: true,
        tempo: 'Sem dados anteriores',
        dataReferencia: null
      })
    }
    
    // Pegar o registro mais recente
    const registroMaisRecente = registrosOrdenados[0]
    const dataReferencia = parseDateBR(String(registroMaisRecente.row[1]))
    
    logger.info(`Registro mais recente: ${JSON.stringify(registroMaisRecente.row)}`)
    logger.info(`Data referência parseada: ${dataReferencia}`)
    
    if (!dataReferencia) {
      return res.json({
        success: true,
        tempo: 'Data inválida no registro',
        dataReferencia: null
      })
    }
    
    // Calcular diferença
    const tempo = calcularDiferencaTempo(dataReferencia, dataAtualDate)
    
    logger.info(`Tempo calculado para pasto ${pasto} (${tipo}): ${tempo}`)
    
    return res.json({
      success: true,
      tempo,
      dataReferencia: registroMaisRecente.row[1] // Data em formato BR
    })
  } catch (error) {
    logger.error(`Erro ao calcular tempo para pasto ${pasto}: ${error}`)
    return res.status(500).json({ error: 'Erro ao calcular tempo de ocupação/desocupação' })
  }
})

import { Router, Request, Response } from 'express'
import { getRows, appendRow } from '../services/googleSheetsService'
import { logger } from '../utils/logger'

export const devicesRouter = Router()

devicesRouter.post('/register', async (req: Request, res: Response) => {
  const { deviceSheetUrl, uuid, fazenda, os, osVersion, deviceModel, screenResolution, timezone } = req.body
  if (!deviceSheetUrl || !uuid) {
    return res.status(400).json({ error: 'deviceSheetUrl e uuid são obrigatórios' })
  }
  try {
    // Verificar se UUID já está registrado
    const rows = await getRows(deviceSheetUrl, 'Registros')
    const existingUuid = rows.find(row => row[0] === uuid)
    
    if (existingUuid) {
      logger.info(`Dispositivo ${uuid} já registrado`)
      return res.json({ success: true, registered: false, message: 'Dispositivo já registrado' })
    }

    // Registrar novo dispositivo com dados estáticos
    const date = new Date().toLocaleDateString('pt-BR')
    const time = new Date().toLocaleTimeString('pt-BR')
    const values = [uuid, date, time, fazenda || '', os, osVersion, deviceModel, screenResolution, timezone]
    await appendRow(deviceSheetUrl, 'Registros', values)
    logger.info(`Dispositivo ${uuid} registrado em ${date} às ${time}`)
    return res.json({ success: true, registered: true, message: 'Dispositivo registrado com sucesso' })
  } catch (error) {
    logger.error(`Erro ao registrar dispositivo: ${error}`)
    return res.status(500).json({ error: 'Erro ao registrar dispositivo' })
  }
})

devicesRouter.post('/update', async (req: Request, res: Response) => {
  const { deviceSheetUrl, uuid, fazenda, lastOpen, sessionCount, farmConfigDate, sessionTime, screens, offlineTime, onlineTime, peakHour, mostActiveDay, avgSessionInterval } = req.body
  if (!deviceSheetUrl || !uuid) {
    return res.status(400).json({ error: 'deviceSheetUrl e uuid são obrigatórios' })
  }
  try {
    // Encontrar linha pelo UUID
    const rows = await getRows(deviceSheetUrl, 'Registros')
    const rowIndex = rows.findIndex(row => row[0] === uuid)
    
    if (rowIndex === -1) {
      logger.info(`Dispositivo ${uuid} não encontrado`)
      return res.status(404).json({ error: 'Dispositivo não encontrado' })
    }

    // Atualizar colunas conforme dados fornecidos
    const sheetRowIndex = rowIndex + 2 // +1 para header, +1 para 1-based index
    const auth = await (await import('../services/googleSheetsService')).getAuth()
    const sheets = (await import('googleapis')).google.sheets({ version: 'v4', auth })
    const spreadsheetId = (await import('../services/googleSheetsService')).extractSpreadsheetId(deviceSheetUrl)

    // Atualizar Fazenda (D)
    if (fazenda !== undefined) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Registros!D${sheetRowIndex}:D${sheetRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[fazenda]],
        },
      })
    }

    // Atualizar Última abertura (J) e Número de sessões (K)
    if (lastOpen !== undefined || sessionCount !== undefined) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Registros!J${sheetRowIndex}:K${sheetRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[lastOpen || '', sessionCount || '']],
        },
      })
    }

    // Atualizar Tempo de uso por sessão (L)
    if (sessionTime !== undefined) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Registros!L${sheetRowIndex}:L${sheetRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[sessionTime]],
        },
      })
    }

    // Atualizar Telas mais acessadas (M)
    if (screens !== undefined) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Registros!M${sheetRowIndex}:M${sheetRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[screens]],
        },
      })
    }

    // Atualizar Uso offline vs Online (N) - formato "Xh offline, Yh online"
    if (offlineTime !== undefined || onlineTime !== undefined) {
      const usageString = `${offlineTime || 0}h offline, ${onlineTime || 0}h online`
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Registros!N${sheetRowIndex}:N${sheetRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[usageString]],
        },
      })
    }

    // Atualizar Data de Configuração da Fazenda (O)
    if (farmConfigDate !== undefined) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Registros!O${sheetRowIndex}:O${sheetRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[farmConfigDate]],
        },
      })
    }

    // Atualizar Horário de pico de uso (P), Dia da semana mais ativo (Q), Intervalo médio entre sessões (R)
    if (peakHour !== undefined || mostActiveDay !== undefined || avgSessionInterval !== undefined) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Registros!P${sheetRowIndex}:R${sheetRowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[peakHour || '', mostActiveDay || '', avgSessionInterval !== undefined ? `${avgSessionInterval}h` : '']],
        },
      })
    }

    logger.info(`Dispositivo ${uuid} atualizado: fazenda ${fazenda}, sessão ${sessionCount}, tempo ${sessionTime}, telas ${screens}, offline ${offlineTime}, online ${onlineTime}`)
    return res.json({ success: true, message: 'Dispositivo atualizado com sucesso' })
  } catch (error) {
    logger.error(`Erro ao atualizar dispositivo: ${error}`)
    return res.status(500).json({ error: 'Erro ao atualizar dispositivo' })
  }
})

devicesRouter.get('/analytics', async (req: Request, res: Response) => {
  const { deviceSheetUrl } = req.query
  if (!deviceSheetUrl) {
    return res.status(400).json({ error: 'deviceSheetUrl é obrigatório' })
  }
  try {
    // Ler todos os dados da planilha
    const rows = await getRows(deviceSheetUrl as string, 'Registros')
    
    // Pular header
    const data = rows.slice(1)
    
    if (data.length === 0) {
      return res.json({ peakHour: null, mostActiveDay: null, avgSessionInterval: null })
    }

    // Calcular horário de pico (coluna 2 = Hora)
    const hours = data
      .map(row => row[2]) // Hora
      .filter(h => h)
      .map(h => {
        const hStr = String(h)
        const match = hStr.match(/(\d{1,2}):/)
        return match ? parseInt(match[1]) : null
      })
      .filter(h => h !== null)

    let peakHourFormatted = null
    if (hours.length > 0) {
      const hourCounts = hours.reduce((acc: Record<number, number>, hour) => {
        acc[hour] = (acc[hour] || 0) + 1
        return acc
      }, {})
      
      const peakHour = Object.entries(hourCounts).sort(([, a], [, b]) => (b as number) - (a as number))[0]
      peakHourFormatted = `${peakHour[0]}:00`
    }

    // Calcular dia mais ativo (coluna 1 = Data)
    const dates = data
      .map(row => row[1]) // Data
      .filter(d => d)
    
    const dayCounts = dates.reduce((acc: Record<string, number>, date) => {
      const dateStr = String(date)
      const dateObj = new Date(dateStr.split('/').reverse().join('-'))
      const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' })
      acc[dayName] = (acc[dayName] || 0) + 1
      return acc
    }, {})
    
    const mostActiveDay = Object.entries(dayCounts).sort(([, a], [, b]) => (b as number) - (a as number))[0]?.[0]

    // Calcular intervalo médio entre sessões (coluna 9 = Última abertura)
    const sessionDates = data
      .map(row => row[9]) // Última abertura
      .filter(d => d)
      .map(d => new Date(String(d).split('/').reverse().join('-')).getTime())
      .sort((a, b) => a - b)

    let avgSessionInterval = null
    if (sessionDates.length > 1) {
      const intervals: number[] = []
      for (let i = 1; i < sessionDates.length; i++) {
        intervals.push((sessionDates[i] - sessionDates[i - 1]) / (1000 * 60 * 60)) // em horas
      }
      avgSessionInterval = Math.round(intervals.reduce((sum, val) => sum + val, 0) / intervals.length)
    }

    logger.info(`Analytics calculados: horário pico ${peakHourFormatted}, dia ativo ${mostActiveDay}, intervalo médio ${avgSessionInterval}h`)
    
    return res.json({
      peakHour: peakHourFormatted,
      mostActiveDay,
      avgSessionInterval,
    })
  } catch (error) {
    logger.error(`Erro ao calcular analytics: ${error}`)
    return res.status(500).json({ error: 'Erro ao calcular analytics' })
  }
})

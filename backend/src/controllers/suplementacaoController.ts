import { Router, Request, Response } from 'express'
import { getSubtiposDaFazenda, extractSpreadsheetId } from '../services/googleSheetsService'
import { logger } from '../utils/logger'

export const suplementacaoRouter = Router()

const DATABASE_URL = 'https://docs.google.com/spreadsheets/d/1HSq-3ihaSnVGIEPBCMdhYjCmFfwyWAQM7zFrkCuGxts/edit'

suplementacaoRouter.get('/subtipos', async (req: Request, res: Response) => {
  const { fazenda, tipo } = req.query as { fazenda?: string; tipo?: string }

  if (!fazenda || !tipo) {
    return res.status(400).json({ success: false, error: 'fazenda e tipo são obrigatórios' })
  }

  try {
    const subtipos = await getSubtiposDaFazenda(DATABASE_URL, fazenda, tipo)
    return res.json({ success: true, subtipos })
  } catch (error) {
    logger.error(`Erro ao buscar subtipos: ${error}`)
    return res.status(500).json({ success: false, error: 'Erro ao buscar subtipos' })
  }
})
